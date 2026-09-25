import {
  hasAnyPermission,
  hasPermission,
  PERM,
  type PermissionKey,
} from "@/lib/auth/permission-keys"

export function getPagePermission(pathname: string): PermissionKey | PermissionKey[] | null {
  if (pathname === "/unauthorized") return null

  if (pathname === "/") return PERM.dashboard.read

  if (pathname.startsWith("/settings/users")) {
    return PERM.settings.users.read
  }

  if (pathname.startsWith("/settings/roles")) {
    return PERM.settings.roles.read
  }

  if (pathname.startsWith("/settings/departments")) {
    return PERM.settings.departments.read
  }

  if (pathname === "/settings") {
    return null
  }

  return null
}

export function isPageAccessible(
  permissions: string[] | undefined,
  pathname: string
): boolean {
  if (pathname === "/settings") {
    return hasAnyPermission(permissions, [
      PERM.settings.users.read,
      PERM.settings.roles.read,
      PERM.settings.departments.read,
    ])
  }

  const required = getPagePermission(pathname)
  if (!required) return true
  return hasPermission(permissions, required)
}
