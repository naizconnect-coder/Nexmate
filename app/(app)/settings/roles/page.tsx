import { auth } from "@/auth"
import { hasPermission, PERM } from "@/lib/auth/permission-keys"
import { RolesSettingsPanel } from "@/components/settings/roles-settings-panel"

export default async function SettingsRolesPage() {
  const session = await auth()
  const permissions = session?.user?.permissions ?? []
  const canManageRoles = hasPermission(permissions, PERM.settings.roles.write)

  return <RolesSettingsPanel canManageRoles={canManageRoles} />
}
