import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

let adminAuth: any = null;
let adminDb: any = null;
let adminInitialized = false;

// Try to initialize admin on first request
async function ensureAdminInitialized() {
  if (adminInitialized) return;
  adminInitialized = true;

  // Only try to initialize if we have credentials
  if (!process.env.FIREBASE_PRIVATE_KEY && !process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    return;
  }

  try {
    const { adminAuth: auth, adminDb: db } = await import("@/lib/firebase/admin");
    adminAuth = auth;
    adminDb = db;
  } catch (e) {
    // Silently fail - use basic session checking
  }
}

const CLUBOS_ALLOWED_ROLES = new Set([
  "club",
  "center_admin",
  "padel_center_admin",
  "club_admin",
])

async function resolveClubRole(decodedToken: { uid: string; role?: unknown; legacyRole?: unknown }) {
  if (!adminDb) return ""

  const claimRole = typeof decodedToken.role === "string" ? decodedToken.role : ""
  if (claimRole) return claimRole

  const claimLegacyRole = typeof decodedToken.legacyRole === "string" ? decodedToken.legacyRole : ""
  if (claimLegacyRole) return claimLegacyRole

  try {
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
  } catch (e) {
    // Ignore errors
  }

  return ""
}

function isClubRole(role: string) {
  return CLUBOS_ALLOWED_ROLES.has(role)
}

export async function proxy(request: NextRequest) {
  await ensureAdminInitialized();

  const { pathname } = request.nextUrl;


  if (pathname === '/auth/login' || pathname === '/login-centros') {
    return NextResponse.redirect(new URL('/clubos/login', request.url))
  }

  // Protect ClubOS routes
  if (pathname.startsWith('/clubos')) {
    const token = request.cookies.get('__session')?.value

    // Allow login page when user is not authenticated
    if (!token && pathname === '/clubos/login') {
      return NextResponse.next()
    }

    // Redirect to login if no token and not login page
    if (!token && pathname !== '/clubos/login') {
      return NextResponse.redirect(new URL('/clubos/login', request.url))
    }

    // If we have a token, try to verify it
    if (token && adminAuth) {
      try {
        const decodedToken = await adminAuth.verifyIdToken(token)
        const role = await resolveClubRole({
          uid: decodedToken.uid,
          role: decodedToken.role,
          legacyRole: (decodedToken as { legacyRole?: unknown }).legacyRole,
        })
        const hasClubAccess = isClubRole(role)

        // Allow login page for authenticated users
        if (pathname === '/clubos/login') {
          if (hasClubAccess) {
            return NextResponse.redirect(new URL('/clubos/dashboard', request.url))
          }
          return NextResponse.next()
        }

        // Check role for dashboard access
        if (pathname.startsWith('/clubos/dashboard') && !hasClubAccess) {
          const loginUrl = new URL('/clubos/login', request.url)
          loginUrl.searchParams.set('error', 'club_account_required')
          return NextResponse.redirect(loginUrl)
        }

        return NextResponse.next()
      } catch (e) {
        // Token verification failed
        if (pathname === '/clubos/login') {
          const response = NextResponse.next()
          response.cookies.delete('__session')
          return response
        }
        return NextResponse.redirect(new URL('/clubos/login', request.url))
      }
    }

    // In development, if we have a token but no adminAuth, allow access
    if (token && !adminAuth && process.env.NODE_ENV === "development") {
      return NextResponse.next()
    }
  }

  // Protect /dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('__session')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/clubos/login', request.url));
    }

    if (adminAuth) {
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        if (!decodedToken.email_verified) {
          return NextResponse.redirect(new URL('/auth/verify-email', request.url));
        }
      } catch (e) {
        return NextResponse.redirect(new URL('/clubos/login', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/clubos/:path*", "/auth/login", "/login-centros"],
}
