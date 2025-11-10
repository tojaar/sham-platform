// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE env vars: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// نستخدم ANON key هنا لبروكسي بسيط؛ إذا أردت sessions عبر السيرفر استخدم خدمة token exchange
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.email || !body?.password) {
      return NextResponse.json({ error: 'missing_credentials', message: 'Email and password required' }, { status: 400 });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(body.email).trim().toLowerCase(),
      password: String(body.password),
    });

    if (error) {
      return NextResponse.json({ error: 'auth_failed', message: error.message || String(error) }, { status: 401 });
    }

    // إرجاع session.user و session.access_token للعميل ليخزنها (مثال: localStorage أو cookies)
    return NextResponse.json({ ok: true, session: data.session, user: data.user }, { status: 200 });
  } catch (err: any) {
    console.error('Login route error', err);
    return NextResponse.json({ error: 'server_error', message: String(err?.message || err) }, { status: 500 });
  }
}