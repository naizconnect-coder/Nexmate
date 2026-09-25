import { auth } from "@/auth"
import { hasPermission, PERM } from "@/lib/auth/permission-keys"
import { DepartmentsSettingsPanel } from "@/components/settings/departments-settings-panel"

export default async function SettingsDepartmentsPage() {
  const session = await auth()
  const permissions = session?.user?.permissions ?? []
  const canManageDepartments = hasPermission(
    permissions,
    PERM.settings.departments.write
  )

  return <DepartmentsSettingsPanel canManageDepartments={canManageDepartments} />
}
