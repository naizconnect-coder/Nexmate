import { auth } from "@/auth"
import {
  hasAnyPermission,
  hasPermission,
  type PermissionKey,
} from "@/lib/auth/permission-keys"
import { resolvePermissionsForUser } from "@/lib/auth/permissions"
import type { Session } from "next-auth"
import { NextResponse } from "next/server"

async function getFreshPermissions(session: Session) {
  return resolvePermissionsForUser(
    session.user?.dbUserId,
    session.user?.permissions
  )
}

export async function requireSession() {
  const session = await auth()
  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  const permissions = await getFreshPermissions(session)
  session.user.permissions = permissions

  return { session, error: null }
}

export async function requirePermission(required: PermissionKey | PermissionKey[]) {
  const { session, error } = await requireSession()
  if (error) return { session: null, error }

  const permissions = session.user?.permissions
  if (!hasPermission(permissions, required)) {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    }
  }

  return { session, error: null }
}

export async function requireAnyPermission(required: PermissionKey[]) {
  const { session, error } = await requireSession()
  if (error) return { session: null, error }

  const permissions = session.user?.permissions
  if (!hasAnyPermission(permissions, required)) {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    }
  }

  return { session, error: null }
}

export function jsonError(message: string, status = 400, code?: string) {
  return NextResponse.json({ error: message, code }, { status })
}
