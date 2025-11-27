// app/api/admin/members/[id]/select/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function extractId(pathname: string): string | undefined {
  // pathname: /api/admin/members/{id}/select
  const parts = pathname.split('/').filter(Boolean);
  return parts[parts.length - 2];
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'missing_env', message: 'Missing SUPABASE env vars' }, { status: 500 });
    }

    const id = extractId(req.nextUrl.pathname);
    if (!id) {
      return NextResponse.json({ error: 'missing_id' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const selected: boolean = !!body?.selected;

    const { data, error } = await supabaseAdmin
      .from('producer_members')
      .update({ invited_selected: selected })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('select update error', error);
      return NextResponse.json(
        { error: 'db_error', message: String((error as Error).message ?? error) },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, member: data }, { status: 200 });
  } catch (err: unknown) {
    console.error('select route error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'server_error', message }, { status: 500 });
  }
}