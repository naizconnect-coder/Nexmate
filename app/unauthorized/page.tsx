import Link from "next/link"
import { auth } from "@/auth"
import {
  getFirstAccessiblePath,
  hasAnyPermission,
  PERM,
} from "@/lib/auth/permission-keys"
import { resolvePermissionsForUser } from "@/lib/auth/permissions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default async function UnauthorizedPage() {
  const session = await auth()
  const permissions = await resolvePermissionsForUser(
    session?.user?.dbUserId,
    session?.user?.permissions
  )
  const hasAccess = hasAnyPermission(permissions, [
    PERM.dashboard.read,
    PERM.settings.users.read,
    PERM.settings.roles.read,
    PERM.settings.departments.read,
  ])
  const homeHref = getFirstAccessiblePath(permissions)

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>
            You do not have permission to view this page. Contact an
            administrator if you need access.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {hasAccess ? (
            <Button asChild>
              <Link href={homeHref}>Go to your home page</Link>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              No modules are assigned to your account yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
