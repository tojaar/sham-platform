// app/api/admin/members/batch-select/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE env vars');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    const selected: boolean = !!body?.selected;

    if (!ids.length) {
      return NextResponse.json({ error: 'missing_ids' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('producer_members')
      .update({ invited_selected: selected })
      .in('id', ids)
      .select();

    if (error) {
      console.error('batch-select update error', error);
      return NextResponse.json(
        { error: 'db_error', message: String((error as Error).message ?? error) },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, updatedCount: (data ?? []).length }, { status: 200 });
  } catch (err: unknown) {
    console.error('batch-select route error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'server_error', message }, { status: 500 });
  }
}