// app/api/admin/login/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (!password) return NextResponse.json({ error: 'missing_password' }, { status: 400 });

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set({
      name: COOKIE_NAME,
      value: '1',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    });
    return res;
  } catch (err) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}