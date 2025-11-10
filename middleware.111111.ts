// middleware.ts (ضعه في جذر المشروع)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient } from '@supabase/auth-helpers-nextjs';

// نحمي مسارات /producer/* ولكن نستثني صفحة signin وموارد أخرى لتفادي حلقات إعادة التوجيه
export const config = {
  matcher: ['/producer/:path*'],
};

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const pathname = req.nextUrl.pathname;

  const PUBLIC_PATHS = [
    '/producer/signin',
    '/producer/signout',
    '/producer/reset',
  ];

  // السماح للـ _next و api و static و صفحات الاستثناءات بالمرور
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    PUBLIC_PATHS.includes(pathname)
  ) {
    return NextResponse.next();
  }

  try {
    const res = NextResponse.next();
    const supabase = createMiddlewareSupabaseClient({ req, res } as any);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    // إذا توجد جلسة سامح بالوصول
    if (session) {
      return res;
    }

    // لا توجد جلسة → إعادة توجيه لمرة واحدة إلى صفحة تسجيل الدخول
    url.pathname = '/producer/signin';
    url.searchParams.set('returnTo', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  } catch (err) {
    // في حال خطأ غير متوقع، أعِد التوجيه إلى صفحة تسجيل الدخول لتجنب حلقات لا نهائية
    const fallback = req.nextUrl.clone();
    fallback.pathname = '/producer/signin';
    return NextResponse.redirect(fallback);
  }
}