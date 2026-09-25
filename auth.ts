import NextAuth from "next-auth"
import type { JWT } from "next-auth/jwt"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import { getEntraAuthEnv } from "@/lib/auth/entra-env"
import { fetchGraphMe } from "@/lib/auth/graph-me"
import { formatMongoConnectionHint } from "@/lib/db/mongodb"
import { sanitizePhotoPath } from "@/lib/db/sanitize-photo-path"
import {
  resolvePermissionsForUser,
} from "@/lib/auth/permissions"
import { findUserIdByEntraOid, upsertUserFromSignIn } from "@/lib/db/users"

const DB_UPSERT_RETRY_MS = 60_000

const entra = getEntraAuthEnv()

function decodeJwtPayload(token: string | undefined): Record<string, unknown> | null {
  if (!token) return null
  const parts = token.split(".")
  if (parts.length < 2) return null
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4)
    const json = Buffer.from(padded, "base64").toString("utf8")
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

function resolveEntraOid(
  account: { id_token?: string; access_token?: string } | null | undefined,
  token: { userId?: string; sub?: string },
  user: { id?: string } | null | undefined
): string {
  const idTokenPayload = decodeJwtPayload(account?.id_token)
  const accessFromLogin = decodeJwtPayload(account?.access_token)
  const oid =
    (idTokenPayload?.oid as string | undefined) ??
    (accessFromLogin?.oid as string | undefined)

  return (
    oid ??
    user?.id ??
    (token.userId as string | undefined) ??
    (token.sub as string | undefined) ??
    ""
  ).trim()
}

async function buildSignInProfile(
  account: { access_token?: string },
  user: { name?: string | null; email?: string | null; image?: string | null },
  profile: unknown
): Promise<JWT["userProfile"]> {
  const graph = account.access_token
    ? await fetchGraphMe(account.access_token)
    : null

  const profileRecord =
    profile && typeof profile === "object"
      ? (profile as Record<string, unknown>)
      : null

  const fullName =
    user.name ??
    (typeof profileRecord?.name === "string" ? profileRecord.name : null) ??
    graph?.displayName ??
    "Unknown"

  const email =
    user.email ??
    (typeof profileRecord?.email === "string" ? profileRecord.email : null) ??
    graph?.mail ??
    graph?.userPrincipalName ??
    null

  return {
    fullName,
    email,
    photoPath: sanitizePhotoPath(user.image ?? null),
    staffId: graph?.employeeId ?? null,
    department: graph?.department ?? null,
    jobTitle: graph?.jobTitle ?? null,
  }
}

function asDbUserId(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const id = Number.parseInt(value, 10)
    return id > 0 ? id : undefined
  }
  return undefined
}

async function persistUserToDatabase(
  token: JWT,
  entraOid: string,
  options?: { force?: boolean }
): Promise<void> {
  if (asDbUserId(token.dbUserId) && !options?.force) return
  if (!token.userProfile && asDbUserId(token.dbUserId)) return

  const lastAttempt = token.dbUpsertAttemptAt
  if (
    !options?.force &&
    typeof lastAttempt === "number" &&
    Date.now() - lastAttempt < DB_UPSERT_RETRY_MS
  ) {
    return
  }

  token.dbUpsertAttemptAt = Date.now()

  try {
    if (token.userProfile) {
      const dbUser = await upsertUserFromSignIn({
        entraOid,
        email: token.userProfile.email,
        fullName: token.userProfile.fullName,
        photoPath: token.userProfile.photoPath,
        staffId: token.userProfile.staffId,
        department: token.userProfile.department,
        jobTitle: token.userProfile.jobTitle,
      })
      token.dbUserId = asDbUserId(dbUser.id)
      return
    }

    const existingId = await findUserIdByEntraOid(entraOid)
    if (existingId) token.dbUserId = existingId
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown database error"
    const hint = formatMongoConnectionHint(error)
    console.error("[nexmate] Failed to upsert user on sign-in:", error)
    if (message) {
      console.error("[nexmate] Upsert error message:", message)
    }
    if (hint) {
      console.error("[nexmate]", hint)
    }
    try {
      const existingId = await findUserIdByEntraOid(entraOid)
      if (existingId) token.dbUserId = existingId
    } catch {
      /* keep going without dbUserId */
    }
  }
}

async function refreshTokenPermissions(token: JWT): Promise<void> {
  const dbUserId = asDbUserId(token.dbUserId)
  token.dbUserId = dbUserId
  if (!dbUserId) {
    token.permissions = []
    return
  }

  token.permissions = await resolvePermissionsForUser(
    dbUserId,
    Array.isArray(token.permissions) ? token.permissions : []
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [
    MicrosoftEntraID({
      clientId: entra.clientId,
      clientSecret: entra.clientSecret,
      issuer: entra.issuer,
      authorization: {
        params: {
          scope: "openid profile email User.Read User.ReadBasic.All",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user, profile }) {
      // Never persist Entra access tokens in the JWT cookie — they overflow
      // nginx/Cloudflare response header buffers and cause 502s on callback.
      delete (token as { accessToken?: string }).accessToken
      if (typeof token.picture === "string") {
        token.picture = sanitizePhotoPath(token.picture)
      }

      const entraOid = resolveEntraOid(account, token, user)
      if (entraOid) {
        token.userId = entraOid
      }

      if (account && user && entraOid) {
        token.userProfile = await buildSignInProfile(account, user, profile)
        await persistUserToDatabase(token, entraOid, { force: true })
        await refreshTokenPermissions(token)
      } else {
        token.dbUserId = asDbUserId(token.dbUserId)
        const missingPermissions =
          !Array.isArray(token.permissions) || token.permissions.length === 0
        if (entraOid && (!token.dbUserId || missingPermissions)) {
          await persistUserToDatabase(token, entraOid)
          await refreshTokenPermissions(token)
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.userId === "string") {
          session.user.id = token.userId
        }
        const dbUserId = asDbUserId(token.dbUserId)
        if (dbUserId) {
          session.user.dbUserId = dbUserId
        }
        session.user.permissions = await resolvePermissionsForUser(
          dbUserId,
          Array.isArray(token.permissions) ? token.permissions : []
        )
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      const destination = url.startsWith("/") ? `${baseUrl}${url}` : url
      if (!destination.startsWith(baseUrl)) return baseUrl

      const path = new URL(destination).pathname
      if (path === "/unauthorized" || path === "/login") {
        return baseUrl
      }
      return destination
    },
  },
})
