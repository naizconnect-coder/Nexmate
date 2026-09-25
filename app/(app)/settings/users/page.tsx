import { auth } from "@/auth"
import { hasPermission, PERM } from "@/lib/auth/permission-keys"
import { UsersSettingsPanel } from "@/components/settings/users-settings-panel"

export default async function SettingsUsersPage() {
  const session = await auth()
  const permissions = session?.user?.permissions ?? []
  const canManageUsers = hasPermission(permissions, PERM.settings.users.write)

  return <UsersSettingsPanel canManageUsers={canManageUsers} />
}
