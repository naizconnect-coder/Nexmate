"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"

interface LoginButtonProps {
  callbackUrl?: string
}

export function LoginButton({ callbackUrl = "/" }: LoginButtonProps) {
  return (
    <Button
      type="button"
      size="lg"
      className="h-12 w-full min-w-[240px] gap-2"
      onClick={() => signIn("microsoft-entra-id", { callbackUrl })}
    >
      <MicrosoftIcon />
      Sign in with Microsoft
    </Button>
  )
}

function MicrosoftIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0"
      viewBox="0 0 21 21"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  )
}
