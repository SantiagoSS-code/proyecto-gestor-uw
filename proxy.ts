import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminAuth, adminDb } from "@/lib/firebase/admin"

const CLUBOS_ALLOWED_ROLES = new Set([
  "club",
  "center_admin",
  "padel_center_admin",
  "club_admin",
])

async function resolveClubRole(decodedToken: { uid: string; role?: unknown; legacyRole?: unknown }) {
  const claimRole = typeof decodedToken.role === "string" ? decodedToken.role : ""
  if (claimRole) return claimRole

  const claimLegacyRole = typeof decodedToken.legacyRole === "string" ? decodedToken.legacyRole : ""
  if (claimLegacyRole) return claimLegacyRole

  const userSnap = await adminDb.collection("users").doc(decodedToken.uid).get()
  if (userSnap.exists) {
    const data = userSnap.data() as { role?: unknown; legacyRole?: unknown }
    const role = typeof data.role === "string" ? data.role : ""
    if (role) return role

    const legacyRole = typeof data.legacyRole === "string" ? data.legacyRole : ""
    if (legacyRole) return legacyRole
  }

  const centerAdminSnap = await adminDb.collection("center_admins").doc(decodedToken.uid).get()
  if (centerAdminSnap.exists) {
    return "center_admin"
  }

  return ""
}

function isClubRole(role: string) {
  return CLUBOS_ALLOWED_ROLES.has(role)
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // In production this route will live on clubos.courtly.com
  if (pathname.startsWith('/dashboard-centros')) {
    const nextPath = pathname.replace('/dashboard-centros', '/clubos/dashboard')
    return NextResponse.redirect(new URL(nextPath + request.nextUrl.search, request.url))
  }

  // In production this route will live on clubos.courtly.com
  if (pathname === '/auth/login' || pathname === '/login-centros') {
    return NextResponse.redirect(new URL('/clubos/login', request.url))
  }

  // Protect ClubOS routes
  if (pathname.startsWith('/clubos')) {
    const token = request.cookies.get('__session')?.value

    // Allow login page when user is not authenticated.
    if (!token && pathname === '/clubos/login') {
      return NextResponse.next()
    }

    if (!token && pathname !== '/clubos/login') {
      return NextResponse.redirect(new URL('/clubos/login', request.url))
    }

    if (token) {
      try {
        const decodedToken = await adminAuth.verifyIdToken(token)
        const role = await resolveClubRole({
          uid: decodedToken.uid,
          role: decodedToken.role,
          legacyRole: (decodedToken as { legacyRole?: unknown }).legacyRole,
        })
        const hasClubAccess = isClubRole(role)

        // Keep ClubOS login page available for account switching.
        if (pathname === '/clubos/login') {
          if (hasClubAccess) {
            return NextResponse.redirect(new URL('/clubos/dashboard', request.url))
          }
          return NextResponse.next()
        }

        if (pathname.startsWith('/clubos/dashboard') && !hasClubAccess) {
          const loginUrl = new URL('/clubos/login', request.url)
          loginUrl.searchParams.set('error', 'club_account_required')
          return NextResponse.redirect(loginUrl)
        }
      } catch {
        if (pathname === '/clubos/login') {
          const response = NextResponse.next()
          response.cookies.delete('__session')
          return response
        }

        return NextResponse.redirect(new URL('/clubos/login', request.url))
      }
    }
  }

  // Protect /dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('__session')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/clubos/login', request.url));
    }

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      if (!decodedToken.email_verified) {
        return NextResponse.redirect(new URL('/auth/verify-email', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/clubos/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/dashboard-centros/:path*", "/clubos/:path*", "/auth/login", "/login-centros"],
}