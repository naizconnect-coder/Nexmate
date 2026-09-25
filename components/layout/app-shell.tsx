"use client"

import * as React from "react"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { SidebarProvider, useSidebar } from "@/contexts/sidebar-context"
import { Sidebar } from "./sidebar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"

interface AppShellProps {
  children: React.ReactNode
  userName?: string | null
  userEmail?: string | null
  userImage?: string | null
  permissions?: string[]
}

function AppShellContent({
  children,
  userName,
  userEmail,
  userImage,
  permissions,
}: AppShellProps) {
  const { isOpen, close, open } = useSidebar()

  function handleSheetOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      open()
    } else {
      close()
    }
  }

  return (
    <div className="flex min-h-[100dvh] bg-background">
      <div className="hidden h-[100dvh] shrink-0 lg:sticky lg:top-0 lg:flex">
        <Sidebar
          userName={userName}
          userEmail={userEmail}
          userImage={userImage}
          permissions={permissions}
        />
      </div>

      <div
        className={cn(
          "relative z-0 flex min-w-0 flex-1 flex-col",
          isOpen && "max-lg:overflow-hidden"
        )}
        inert={isOpen ? true : undefined}
        aria-hidden={isOpen ? true : undefined}
      >
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-sm supports-[backdrop-filter]:bg-background/90 lg:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={open}
            className="shrink-0"
            aria-label="Open menu"
            aria-expanded={isOpen}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
          {children}
        </main>
      </div>

      <Sheet open={isOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent
          side="left"
          showCloseButton={false}
          aria-describedby={undefined}
          className="w-[272px] max-w-[88vw] gap-0 border-r border-border bg-sidebar p-0 text-sidebar-foreground sm:max-w-[272px]"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar
            isMobile
            userName={userName}
            userEmail={userEmail}
            userImage={userImage}
            permissions={permissions}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}

export function AppShell(props: AppShellProps) {
  return (
    <SidebarProvider>
      <AppShellContent {...props} />
    </SidebarProvider>
  )
}
