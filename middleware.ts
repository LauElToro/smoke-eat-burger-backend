import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from './lib/auth';

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const token = req.cookies.get('session')?.value;
    if (!token) return NextResponse.redirect(new URL('/login', req.url));
    try {
      const payload = await verifySession(token);
      if (payload.role !== 'ADMIN') return NextResponse.redirect(new URL('/login', req.url));
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*'] };
