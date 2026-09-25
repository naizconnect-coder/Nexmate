export const PERM = {
  dashboard: {
    read: "dashboard.read",
  },
  settings: {
    users: {
      read: "settings.users.read",
      write: "settings.users.write",
    },
    roles: {
      read: "settings.roles.read",
      write: "settings.roles.write",
    },
    departments: {
      read: "settings.departments.read",
      write: "settings.departments.write",
    },
  },
} as const

export type PermissionKey =
  | (typeof PERM.dashboard)[keyof typeof PERM.dashboard]
  | (typeof PERM.settings.users)[keyof typeof PERM.settings.users]
  | (typeof PERM.settings.roles)[keyof typeof PERM.settings.roles]
  | (typeof PERM.settings.departments)[keyof typeof PERM.settings.departments]

export function hasPermission(
  permissions: string[] | undefined,
  required: PermissionKey | PermissionKey[]
): boolean {
  if (!permissions?.length) return false
  const requiredList = Array.isArray(required) ? required : [required]
  return requiredList.every((perm) => permissions.includes(perm))
}

export function hasAnyPermission(
  permissions: string[] | undefined,
  required: PermissionKey[]
): boolean {
  if (!permissions?.length) return false
  return required.some((perm) => permissions.includes(perm))
}

export function getFirstAccessiblePath(permissions: string[] | undefined): string {
  if (hasPermission(permissions, PERM.dashboard.read)) return "/"
  if (
    hasAnyPermission(permissions, [
      PERM.settings.users.read,
      PERM.settings.roles.read,
      PERM.settings.departments.read,
    ])
  ) {
    return "/settings"
  }
  return "/unauthorized"
}
