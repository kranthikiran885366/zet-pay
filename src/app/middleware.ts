import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authAdmin } from '@/lib/firebase/firebaseAdmin'; 

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('__session')?.value;

  const publicPaths = ['/splash', '/login', '/signup', '/forgot-password', '/about', '/documentation'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  if (sessionCookie) {
    try {
      await authAdmin.verifySessionCookie(sessionCookie, true); // Check if cookie is valid
      // User is authenticated
      if (pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/forgot-password')) {
        // Authenticated users should not access login/signup/forgot-password, redirect to home
        console.log("Middleware: Authenticated user on auth path, redirecting to /");
        return NextResponse.redirect(new URL('/', request.url));
      }
      // If authenticated user tries to access /splash, let them. 
      // The /splash page itself will handle redirecting to / after its timer.
      // This allows the splash screen to be shown even if the user is already logged in.
      if (pathname.startsWith('/splash')) {
        return NextResponse.next();
      }
      // For all other paths, if authenticated, allow access.
      return NextResponse.next();
    } catch (error) {
      // Invalid or expired cookie
      console.log("Middleware: Invalid/expired session cookie, deleting cookie and redirecting to /splash for path:", pathname);
      const response = NextResponse.redirect(new URL('/splash', request.url));
      response.cookies.delete('__session'); 
      return response;
    }
  } else {
    // No session cookie (user not authenticated)
    if (!isPublicPath) {
      // If trying to access a protected path, redirect to /splash (which then goes to /login)
      console.log("Middleware: No session cookie, accessing protected path, redirecting to /splash for path:", pathname);
      return NextResponse.redirect(new URL('/splash', request.url));
    }
    // If accessing a public path and not authenticated, allow access
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
