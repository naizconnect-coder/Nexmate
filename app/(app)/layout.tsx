import { auth } from "@/auth"
import { AppShell } from "@/components/layout/app-shell"
import { resolvePermissionsForUser } from "@/lib/auth/permissions"

export const dynamic = "force-dynamic"

interface AppLayoutProps {
  children: React.ReactNode
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await auth()
  const user = session?.user
  const permissions = await resolvePermissionsForUser(
    user?.dbUserId,
    user?.permissions
  )

  return (
    <AppShell
      userName={user?.name ?? null}
      userEmail={user?.email ?? null}
      userImage={user?.image ?? null}
      permissions={permissions}
    >
      <div className="flex w-full min-w-0 flex-col gap-6">{children}</div>
    </AppShell>
  )
}
