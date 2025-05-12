import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authAdmin } from '@/lib/firebase/firebaseAdmin'; 

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('__session')?.value;

  // Define public paths that do not require authentication
  const publicPaths = ['/splash', '/login', '/signup', '/forgot-password', '/onboarding', '/about', '/documentation'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  console.log(`[Middleware] Path: ${pathname}, Is Public: ${isPublicPath}, Session Cookie Present: ${!!sessionCookie}`);

  if (sessionCookie) {
    try {
      await authAdmin.verifySessionCookie(sessionCookie, true);
      console.log("[Middleware] Session cookie verified.");
      // User is authenticated
      if (pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/forgot-password') || pathname.startsWith('/onboarding')) {
        // Authenticated users trying to access auth/onboarding pages (except /splash) should be redirected to home
        console.log("[Middleware] Authenticated user on auth/onboarding path, redirecting to /");
        return NextResponse.redirect(new URL('/', request.url));
      }
      // If accessing /splash while authenticated, let it proceed. Splash page handles its own logic.
      if (pathname.startsWith('/splash')) {
        return NextResponse.next();
      }
      // For other protected paths, allow access
      return NextResponse.next();
    } catch (error) {
      // Invalid or expired cookie
      console.log("[Middleware] Invalid/expired session cookie. Deleting cookie.");
      const response = NextResponse.redirect(new URL('/splash', request.url)); // Redirect to splash on bad cookie
      response.cookies.delete('__session'); 
      return response;
    }
  } else {
    // No session cookie (user not authenticated)
    if (isPublicPath) {
      // Allow access to public paths even if not authenticated
      console.log(`[Middleware] No session cookie, accessing public path ${pathname}, allowing.`);
      return NextResponse.next();
    } else {
      // If trying to access a protected path and no session cookie, redirect to /splash
      console.log(`[Middleware] No session cookie, accessing protected path ${pathname}, redirecting to /splash.`);
      return NextResponse.redirect(new URL('/splash', request.url));
    }
  }
}

export const config = {
  matcher: [
    // Match all paths except for API routes, static files, and image optimization
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
