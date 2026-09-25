"use client"

import { signOut } from "next-auth/react"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SidebarSignOut() {
  function handleSignOut() {
    void signOut({ callbackUrl: "/login" })
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={handleSignOut}
      className="h-auto w-full justify-between rounded-lg px-0 py-0 text-sm font-bold text-sidebar-foreground hover:bg-transparent hover:text-primary"
    >
      <span>Sign Out</span>
      <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
    </Button>
  )
}
