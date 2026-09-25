import { COLLECTIONS, col, uniquePositiveIds } from "@/lib/db/mongodb"
import { ensureDepartmentsPermissions } from "@/lib/db/settings/ensure-departments-permissions"

export {
  PERM,
  getFirstAccessiblePath,
  hasAnyPermission,
  hasPermission,
  type PermissionKey,
} from "@/lib/auth/permission-keys"

interface UserRoleDoc {
  user_id: number
  role_id: number
}

interface RolePermissionDoc {
  role_id: number
  permission_id: number
}

interface PermissionDoc {
  _id: number
  perm_key: string
}

export async function getUserPermissionKeys(dbUserId: number): Promise<string[]> {
  try {
    await ensureDepartmentsPermissions()
  } catch {
    /* permissions can still resolve from existing records */
  }

  const userRoles = await col<UserRoleDoc>(COLLECTIONS.userRoles)
  const roleLinks = await userRoles.find({ user_id: dbUserId }).toArray()
  const roleIds = uniquePositiveIds(roleLinks.map((row) => row.role_id))
  if (roleIds.length === 0) return []

  const rolePermissions = await col<RolePermissionDoc>(COLLECTIONS.rolePermissions)
  const permissionLinks = await rolePermissions
    .find({ role_id: { $in: roleIds } })
    .toArray()
  const permissionIds = uniquePositiveIds(
    permissionLinks.map((row) => row.permission_id)
  )
  if (permissionIds.length === 0) return []

  const permissions = await col<PermissionDoc>(COLLECTIONS.permissions)
  const rows = await permissions.find({ _id: { $in: permissionIds } }).toArray()
  return [...new Set(rows.map((row) => row.perm_key))]
}

export async function resolvePermissionsForUser(
  dbUserId: number | string | undefined,
  fallback: string[] | undefined = []
): Promise<string[]> {
  const id =
    typeof dbUserId === "number"
      ? dbUserId
      : typeof dbUserId === "string"
        ? Number.parseInt(dbUserId, 10)
        : Number.NaN
  if (!Number.isFinite(id) || id <= 0) return fallback ?? []
  try {
    return await getUserPermissionKeys(id)
  } catch {
    return fallback ?? []
  }
}
