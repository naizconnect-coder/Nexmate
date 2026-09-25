import { auth } from "@/auth"
import { SettingsTabs } from "@/components/settings/settings-tabs"

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default async function SettingsLayout({ children }: SettingsLayoutProps) {
  const session = await auth()
  const permissions = session?.user?.permissions ?? []

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">
            Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage users, roles, departments, and permissions.
          </p>
        </div>
        <SettingsTabs permissions={permissions} />
      </div>
      {children}
    </div>
  )
}
