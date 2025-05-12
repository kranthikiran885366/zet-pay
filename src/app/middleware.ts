import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authAdmin } from '@/lib/firebase/firebaseAdmin'; // Updated import path

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('__session')?.value;

  // Paths that don't require authentication
  const publicPaths = ['/splash', '/login', '/signup', '/forgot-password', '/about', '/documentation']; // Added /splash and /documentation
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // If trying to access a public path and is logged in (and it's splash, login, or signup), redirect to home.
  if (isPublicPath && sessionCookie) {
    try {
      await authAdmin.verifySessionCookie(sessionCookie, true); // Check if cookie is valid
      if (pathname.startsWith('/splash') || pathname.startsWith('/login') || pathname.startsWith('/signup')) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch (error) {
      // Invalid cookie, let them proceed to login/signup/splash
      console.log("Middleware: Invalid session cookie for public path access. Allowing access.");
    }
  }

  // If trying to access a protected path and not logged in, redirect to splash screen
  if (!isPublicPath && !sessionCookie) {
    console.log("Middleware: No session cookie, redirecting to splash for path:", pathname);
    return NextResponse.redirect(new URL('/splash', request.url)); // Redirect to splash
  }

  // If has session cookie, verify it for protected paths
  if (!isPublicPath && sessionCookie) {
    try {
      await authAdmin.verifySessionCookie(sessionCookie, true);
      // User is authenticated, allow access
      return NextResponse.next();
    } catch (error) {
      // Invalid or expired cookie, redirect to splash (which then redirects to login)
      console.log("Middleware: Invalid/expired session cookie, redirecting to splash for path:", pathname);
      const response = NextResponse.redirect(new URL('/splash', request.url));
      response.cookies.delete('__session'); // Clear the invalid cookie
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
