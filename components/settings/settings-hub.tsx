import Link from "next/link"
import { ArrowRight, Building2, Shield, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PERM } from "@/lib/auth/permission-keys"

interface SettingsHubProps {
  permissions: string[]
}

const sections = [
  {
    title: "Users",
    description: "Manage user accounts, assign roles, and control access across the organization.",
    href: "/settings/users",
    permission: PERM.settings.users.read,
    icon: Users,
    actionLabel: "Manage users",
  },
  {
    title: "Roles",
    description: "Configure roles and permissions to define what each team member can do.",
    href: "/settings/roles",
    permission: PERM.settings.roles.read,
    icon: Shield,
    actionLabel: "Manage roles",
  },
  {
    title: "Departments",
    description: "Create and maintain organization departments used for user profiles.",
    href: "/settings/departments",
    permission: PERM.settings.departments.read,
    icon: Building2,
    actionLabel: "Manage departments",
  },
] as const

export function SettingsHub({ permissions }: SettingsHubProps) {
  const visibleSections = sections.filter((section) =>
    permissions.includes(section.permission)
  )

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
      {visibleSections.map((section) => {
        const Icon = section.icon
        return (
          <Card
            key={section.href}
            className="rounded-2xl transition-shadow hover:shadow-md"
          >
            <CardHeader>
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary">
                <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <CardTitle className="text-xl">{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" className="w-full rounded-full" asChild>
                <Link href={section.href}>
                  {section.actionLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
