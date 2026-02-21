import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and static assets
  if (pathname === '/login' || pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Check for token in cookies or let client-side handle redirect
  // We use a lightweight check here - full validation happens on API calls
  const token = request.cookies.get('token')?.value;

  // For SSR, we can't easily check localStorage, so we allow the request through
  // The client-side auth provider will handle the redirect
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
