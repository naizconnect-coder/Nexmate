import { auth } from "@/auth"
import { getFirstAccessiblePath } from "@/lib/auth/permission-keys"
import { resolvePermissionsForUser } from "@/lib/auth/permissions"
import { isPageAccessible } from "@/lib/auth/route-access"
import { NextResponse } from "next/server"

export default auth(async (req) => {
  const isLoggedIn = !!req.auth
  const pathname = req.nextUrl.pathname
  const isAuthRoute = pathname === "/login"
  const isApiRoute = pathname.startsWith("/api/")

  if (isApiRoute) return NextResponse.next()
  if (isAuthRoute) {
    if (isLoggedIn) {
      const permissions = await resolvePermissionsForUser(
        req.auth?.user?.dbUserId,
        req.auth?.user?.permissions
      )
      return NextResponse.redirect(
        new URL(getFirstAccessiblePath(permissions), req.url)
      )
    }
    return NextResponse.next()
  }
  if (!isLoggedIn) {
    const login = new URL("/login", req.url)
    login.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(login)
  }

  const permissions = await resolvePermissionsForUser(
    req.auth?.user?.dbUserId,
    req.auth?.user?.permissions
  )
  if (!isPageAccessible(permissions, pathname)) {
    return NextResponse.redirect(new URL("/unauthorized", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
