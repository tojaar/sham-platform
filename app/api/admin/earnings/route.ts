// app/api/admin/earnings/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * لا ننشئ العميل على مستوى الوحدة لتجنّب رمي استثناء أثناء البناء.
 * بدلاً من ذلك نعيد العميل من دالة تُستدعى داخل الهاندلر.
 */
function getSupabaseAdmin(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      // نعيد استجابة واضحة بدل رمي استثناء أثناء وقت التحميل/البناء
      return NextResponse.json({ error: 'missing_env', message: 'Missing SUPABASE env vars' }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from('earnings_ladder')
      .select('*')
      .order('level', { ascending: true });

    if (error) {
      console.error('earnings fetch error', error);
      return NextResponse.json(
        { error: 'db_error', message: String((error as Error)?.message ?? error) },
        { status: 500 }
      );
    }

    return NextResponse.json({ rows: data ?? [] }, { status: 200 });
  } catch (err: unknown) {
    console.error('earnings route error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'server_error', message }, { status: 500 });
  }
}