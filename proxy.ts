import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminAuth } from "@/lib/firebase/admin"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('__session')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      if (!decodedToken.email_verified) {
        return NextResponse.redirect(new URL('/auth/verify-email', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
}