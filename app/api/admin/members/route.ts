// app/api/admin/members/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE env vars');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q') || '';
    // نطلب الحقول المهمة صراحة لنتأكد من أن البريد يُعاد
    let queryBuilder = supabaseAdmin
      .from('producer_members')
      .select('id, full_name, whatsapp, invite_code, invite_code_self, email, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (q) {
      // فلترة بسيطة: full_name أو invite_code
      // نستخدم ilike عبر رمز السلسلة حيث لا تدعم chaining بهذا الشكل في كل الإصدارات
      queryBuilder = supabaseAdmin
        .from('producer_members')
        .select('id, full_name, whatsapp, invite_code, invite_code_self, email, created_at')
        .or(`full_name.ilike.%${q}%,invite_code.ilike.%${q}%`)
        .order('created_at', { ascending: false })
        .limit(200);
    }

    const { data, error } = await queryBuilder;
    if (error) {
      console.error('admin.members fetch error', error);
      return NextResponse.json({ error: 'db_error', message: String(error.message || error) }, { status: 500 });
    }

    return NextResponse.json({ members: data || [] }, { status: 200 });
  } catch (err: any) {
    console.error('admin.members route error', err);
    return NextResponse.json({ error: 'server_error', message: String(err?.message || err) }, { status: 500 });
  }
}