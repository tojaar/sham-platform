// app/api/admin/members/[id]/select/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing SUPABASE env vars');

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function extractId(pathname: string) {
  // pathname: /api/admin/members/{id}/select
  const parts = pathname.split('/').filter(Boolean);
  // last part is 'select', previous is id
  return parts[parts.length - 2];
}

export async function POST(req: NextRequest) {
  try {
    const id = extractId(req.nextUrl.pathname);
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

    const body = await req.json().catch(() => null);
    const selected = !!body?.selected;

    const { data, error } = await supabaseAdmin
      .from('producer_members')
      .update({ invited_selected: selected })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('select update error', error);
      return NextResponse.json({ error: 'db_error', message: String(error.message || error) }, { status: 500 });
    }

    return NextResponse.json({ ok: true, member: data }, { status: 200 });
  } catch (err: any) {
    console.error('select route error', err);
    return NextResponse.json({ error: 'server_error', message: String(err?.message || err) }, { status: 500 });
  }
}