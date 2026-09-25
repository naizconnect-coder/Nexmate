import { auth } from "@/auth"
import { SettingsHub } from "@/components/settings/settings-hub"

export default async function SettingsPage() {
  const session = await auth()
  const permissions = session?.user?.permissions ?? []

  return <SettingsHub permissions={permissions} />
}
