import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthRoute = req.nextUrl.pathname.startsWith('/api/auth') || req.nextUrl.pathname === '/login'

  if (isAuthRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/', req.nextUrl))
    }
    return null
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  return null
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
