"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { PERM } from "@/lib/auth/permission-keys"

const tabs = [
  {
    title: "Users",
    shortTitle: "Users",
    href: "/settings/users",
    permission: PERM.settings.users.read,
  },
  {
    title: "Roles",
    shortTitle: "Roles",
    href: "/settings/roles",
    permission: PERM.settings.roles.read,
  },
  {
    title: "Departments",
    shortTitle: "Departments",
    href: "/settings/departments",
    permission: PERM.settings.departments.read,
  },
] as const

interface SettingsTabsProps {
  permissions?: string[]
}

export function SettingsTabs({ permissions = [] }: SettingsTabsProps) {
  const pathname = usePathname() ?? ""
  const visibleTabs = tabs.filter((tab) => permissions.includes(tab.permission))

  if (visibleTabs.length === 0 || pathname === "/settings") {
    return null
  }

  return (
    <nav
      className="flex w-full min-w-0 gap-1 overflow-x-auto rounded-full border border-border bg-muted/40 p-1 lg:w-auto"
      aria-label="Settings sections"
    >
      {visibleTabs.map((tab) => {
        const isActive =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`)
        const useShortTitle = tab.shortTitle !== tab.title
        return (
          <Link
            key={tab.href}
            href={tab.href}
            title={tab.title}
            aria-label={tab.title}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full px-3 py-2 text-center text-sm font-medium whitespace-nowrap transition-colors sm:px-4",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {useShortTitle ? (
              <>
                <span className="xl:hidden">{tab.shortTitle}</span>
                <span className="hidden xl:inline">{tab.title}</span>
              </>
            ) : (
              tab.title
            )}
          </Link>
        )
      })}
    </nav>
  )
}
