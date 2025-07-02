import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes, static files, and public routes
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/' ||
    pathname.startsWith('/forms/') ||
    pathname.startsWith('/preview/')
  ) {
    return NextResponse.next();
  }

  // Protect admin routes
  if (pathname.startsWith('/admin/')) {
    const adminToken = request.cookies.get('admin-token');
    const tokenValue = typeof adminToken === 'string'
      ? adminToken
      : adminToken?.value;

    if (!tokenValue) {
      // Redirect to login if no admin token
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Note: In a real implementation, you'd verify the token here
    // For now, we'll assume any presence of the token is valid
    // The actual verification happens in the API routes using the ADMIN_COOKIE_SECRET
  }

  return NextResponse.next();
}

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