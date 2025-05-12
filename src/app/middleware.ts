import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/firebase/firebaseAdmin'; // Import server-side admin auth

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('__session')?.value; // Assuming you set a session cookie

  // Paths that don't require authentication
  const publicPaths = ['/login', '/signup', '/splash', '/forgot-password', '/about'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // If trying to access a public path and is logged in, redirect to home (optional, based on UX preference)
  if (isPublicPath && sessionCookie) {
    try {
      await auth.verifySessionCookie(sessionCookie, true); // Check if cookie is valid
      // User is logged in, trying to access login/signup. Redirect to home.
      if (pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/splash')) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch (error) {
      // Invalid cookie, let them proceed to login/signup
      console.log("Middleware: Invalid session cookie for public path access.");
    }
  }

  // If trying to access a protected path and not logged in, redirect to login
  if (!isPublicPath && !sessionCookie) {
    console.log("Middleware: No session cookie, redirecting to login for path:", pathname);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If has session cookie, verify it for protected paths
  if (!isPublicPath && sessionCookie) {
    try {
      await auth.verifySessionCookie(sessionCookie, true);
      // User is authenticated, allow access
      return NextResponse.next();
    } catch (error) {
      // Invalid or expired cookie, redirect to login
      console.log("Middleware: Invalid/expired session cookie, redirecting to login for path:", pathname);
      const response = NextResponse.redirect(new URL('/login', request.url));
      // Clear the invalid cookie
      response.cookies.delete('__session');
      return response;
    }
  }

  return NextResponse.next();
}

// Matcher configuration
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
