// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_PREFIX = '/admin';
const COOKIE_NAME = 'admin';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // لا نطبق الحماية على صفحة تسجيل الدخول أو API الخاصة بتسجيل الدخول/الخروج
  if (!pathname.startsWith(ADMIN_PREFIX)) return NextResponse.next();
  if (pathname === '/admin/login' || pathname.startsWith('/api/admin')) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  // قيمة الكوكي بسيطة ('1')، وجودها يعني مصادقة
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};