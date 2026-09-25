import { NextResponse } from "next/server"
import { jsonError, requireAnyPermission } from "@/lib/api/route-auth"
import { PERM } from "@/lib/auth/permissions"
import { listPermissions } from "@/lib/db/settings/permissions-repository"
import { listRolesForSelect } from "@/lib/db/settings/users-repository"

export const dynamic = "force-dynamic"

export async function GET() {
  const { error } = await requireAnyPermission([
    PERM.settings.users.read,
    PERM.settings.roles.read,
  ])
  if (error) return error

  try {
    const [permissions, roles] = await Promise.all([
      listPermissions(),
      listRolesForSelect(),
    ])
    return NextResponse.json({ permissions, roles })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load permissions"
    return jsonError(message, 500)
  }
}
