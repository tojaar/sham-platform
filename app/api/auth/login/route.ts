// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COOKIE_NAME = 'user_id_simple';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing supabase env vars');
  throw new Error('Server misconfiguration');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function buildCookie(name: string, value: string, opts: { path?: string; httpOnly?: boolean; secure?: boolean; sameSite?: string; maxAge?: number } = {}) {
  const parts = [`${name}=${value}`];
  parts.push(`Path=${opts.path ?? '/'}`);
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite ?? 'Lax'}`);
  if (typeof opts.maxAge === 'number') parts.push(`Max-Age=${opts.maxAge}`);
  return parts.join('; ');
}

export async function POST(req: NextRequest) {
  try {
    console.log('[login] incoming cookies:', req.headers.get('cookie') ?? '');
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!email || !password) return NextResponse.json({ error: 'missing_credentials' }, { status: 400 });

    // اقرأ السجل مباشرة في كل محاولة
    let member: any = null;
    try {
      const { data, error } = await supabaseAdmin
        .from('producer_members')
        .select('id, full_name, email, status, password_hash')
        .eq('email', email)
        .single();
      if (error) {
        console.warn('[login] supabase single error:', error);
      }
      member = data ?? null;
    } catch (e) {
      console.error('[login] supabase single threw', e);
    }

    if (!member) {
      // محاولة مرنة
      try {
        const { data } = await supabaseAdmin
          .from('producer_members')
          .select('id, full_name, email, status, password_hash')
          .ilike('email', email)
          .limit(1);
        if (Array.isArray(data) && data.length) member = data[0];
      } catch (e) {
        console.error('[login] fallback lookup error', e);
      }
    }

    if (!member) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const status = (member.status ?? '').toString().trim().toLowerCase();
    if (status !== 'approved') {
      return NextResponse.json({ error: 'not_approved', message: 'حسابك قيد المراجعة أو لم يتم قبوله بعد' }, { status: 403 });
    }

    if (!member.password_hash) return NextResponse.json({ error: 'no_password' }, { status: 400 });

    const match = await bcrypt.compare(password, member.password_hash).catch((e) => {
      console.error('[login] bcrypt error', e);
      return false;
    });

    if (!match) return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });

    // تسجيل ناجح — ضع كوكي يحتوي id المستخدم (بسيط)
    const res = NextResponse.json({ ok: true, user: { id: member.id, full_name: member.full_name, email: member.email } }, { status: 200 });
    // أثناء التطوير لا تضع secure=true على localhost
    res.headers.set('Set-Cookie', buildCookie(COOKIE_NAME, String(member.id), { path: '/', httpOnly: true, sameSite: 'Lax', maxAge: 7 * 24 * 3600 }));
    return res;
  } catch (err: any) {
    console.error('[login] unexpected', err);
    return NextResponse.json({ error: 'server_error', message: String(err?.message ?? err) }, { status: 500 });
  }
}