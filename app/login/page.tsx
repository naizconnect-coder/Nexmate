import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { safeCallbackUrl } from "@/lib/auth/safe-callback-url"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoginButton } from "./login-button"

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sp = await searchParams
  const callbackUrl = safeCallbackUrl(sp.callbackUrl)
  const session = await auth()
  if (session) {
    redirect(callbackUrl)
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">NEXMATE</CardTitle>
          <CardDescription>
            Sign in with your organization account to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginButton callbackUrl={callbackUrl} />
        </CardContent>
      </Card>
    </div>
  )
}
