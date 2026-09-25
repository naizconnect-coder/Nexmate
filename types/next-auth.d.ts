import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id?: string
      dbUserId?: number
      permissions?: string[]
    }
  }
}

interface JwtUserProfileSnapshot {
  fullName: string
  email: string | null
  photoPath: string | null
  staffId: string | null
  department: string | null
  jobTitle: string | null
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string
    dbUserId?: number
    userProfile?: JwtUserProfileSnapshot
    dbUpsertAttemptAt?: number
    permissions?: string[]
  }
}
