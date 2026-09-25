"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Settings, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { hasAnyPermission, PERM } from "@/lib/auth/permission-keys"
import { useSidebar } from "@/contexts/sidebar-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage, AvatarBadge } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "./theme-toggle"
import { SidebarSignOut } from "./sidebar-sign-out"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission: string
  settingsNav?: boolean
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    permission: PERM.dashboard.read,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    permission: PERM.settings.users.read,
    settingsNav: true,
  },
]

interface SidebarProps {
  isMobile?: boolean
  userName?: string | null
  userEmail?: string | null
  userImage?: string | null
  permissions?: string[]
}

function NexmateLogo() {
  return (
    <span className="flex items-center gap-3">
      <span className="relative h-8 w-8 shrink-0" aria-hidden="true">
        <span className="absolute left-1 top-0 h-2.5 w-2.5 rotate-45 rounded-[2px] bg-sidebar-foreground" />
        <span className="absolute bottom-0 left-0 h-2.5 w-2.5 rotate-45 rounded-[2px] bg-sidebar-foreground/70" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-sm font-bold tracking-wide text-sidebar-foreground">
          NEXMATE
        </span>
        <span className="block text-[11px] font-medium tracking-wide text-sidebar-muted">
          Admin portal
        </span>
      </span>
    </span>
  )
}

function UserProfileCard({
  displayName,
  displayEmail,
  userImage,
}: {
  displayName: string
  displayEmail: string
  userImage?: string | null
}) {
  return (
    <Card className="mx-4 border-border/80 bg-sidebar-elevated py-0 shadow-none">
      <CardContent className="flex items-center gap-3 p-3">
        <Avatar size="lg" className="size-11">
          {userImage ? <AvatarImage src={userImage} alt="" /> : null}
          <AvatarFallback className="bg-secondary text-sm font-semibold text-sidebar-foreground">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
          <AvatarBadge className="size-5 min-w-5 px-1 text-[10px] font-semibold">
            12
          </AvatarBadge>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">
            {displayName}
          </p>
          <p className="truncate text-xs text-sidebar-muted">{displayEmail}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function Sidebar({
  isMobile = false,
  userName,
  userEmail,
  userImage,
  permissions = [],
}: SidebarProps) {
  const pathname = usePathname() ?? ""
  const { close } = useSidebar()

  function handleNavClick() {
    if (isMobile) close()
  }

  const displayName = userName ?? "User"
  const displayEmail = userEmail ?? "Signed in"
  const settingsPermissions = [
    PERM.settings.users.read,
    PERM.settings.roles.read,
    PERM.settings.departments.read,
  ]
  const visibleNavItems = navItems.filter((item) => {
    if (item.settingsNav) {
      return hasAnyPermission(permissions, settingsPermissions)
    }
    return permissions.includes(item.permission)
  })

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full flex-col bg-sidebar",
        !isMobile && "w-[272px] shrink-0 border-r border-border"
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-3 px-4",
          isMobile ? "min-h-14 pt-[env(safe-area-inset-top,0px)]" : "h-[4.25rem]"
        )}
      >
        <Link href="/" onClick={handleNavClick} className="min-w-0">
          <NexmateLogo />
        </Link>
        {isMobile ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={close}
            className="shrink-0 text-sidebar-muted hover:bg-sidebar-elevated hover:text-sidebar-foreground"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      <Separator className="bg-border" />

      <div className="shrink-0 py-4">
        <UserProfileCard
          displayName={displayName}
          displayEmail={displayEmail}
          userImage={userImage}
        />
      </div>

      <nav className="flex shrink-0 flex-col gap-1 px-4">
        {visibleNavItems.map((item) => {
          const isActive =
            item.title === "Settings"
              ? pathname === "/settings" || pathname.startsWith("/settings/")
              : pathname === item.href ||
                (item.href !== "/" &&
                  item.href.length > 1 &&
                  pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Button
              key={item.title}
              asChild
              variant={isActive ? "default" : "ghost"}
              size="lg"
              className={cn(
                "h-10 w-full justify-start gap-3 rounded-full px-4 font-medium",
                !isActive &&
                  "text-sidebar-muted hover:bg-sidebar-elevated hover:text-sidebar-foreground"
              )}
            >
              <Link href={item.href} onClick={handleNavClick}>
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.title}</span>
              </Link>
            </Button>
          )
        })}
      </nav>

      <div className="min-h-0 flex-1" aria-hidden="true" />

      <div
        className={cn(
          "shrink-0 px-4 pb-4",
          isMobile && "pb-[max(1rem,env(safe-area-inset-bottom))]"
        )}
      >
        <Separator className="mb-4 bg-border" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="text-xs font-bold tracking-wider text-sidebar-foreground">
            THEME
          </span>
          <ThemeToggle />
        </div>
        <Separator className="mb-4 bg-border" />
        <SidebarSignOut />
      </div>
    </aside>
  )
}
