// app/api/admin/members/batch-select/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'missing_env', message: 'Missing SUPABASE env vars' }, { status: 500 });
    }

    const body = await req.json().catch(() => null);

    // تأكدنا من أن ids مصفوفة سلاسل نصية مع تحديد نوع المعامل في filter
    const ids: string[] = Array.isArray(body?.ids)
      ? body.ids.filter((x: unknown): x is string => typeof x === 'string')
      : [];

    const selected = !!body?.selected;

    if (ids.length === 0) {
      return NextResponse.json({ error: 'invalid_input', message: 'No ids provided' }, { status: 400 });
    }

    // تحديث مجموعة السجلات دفعة واحدة
    const { data, error } = await supabaseAdmin
      .from('producer_members')
      .update({ invited_selected: selected })
      .in('id', ids)
      .select();

    if (error) {
      console.error('batch-select update error', error);
      return NextResponse.json(
        { error: 'db_error', message: String((error as Error)?.message ?? error) },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, updated: (data ?? []).length, rows: data ?? [] }, { status: 200 });
  } catch (err: unknown) {
    console.error('batch-select route error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'server_error', message }, { status: 500 });
  }
}