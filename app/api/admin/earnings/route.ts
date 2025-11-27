// app/api/admin/earnings/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE env vars');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('earnings_ladder').select('*').order('level', { ascending: true });
    if (error) {
      console.error('earnings fetch error', error);
      return NextResponse.json({ error: 'db_error', message: String(error.message || error) }, { status: 500 });
    }
    return NextResponse.json({ rows: data || [] }, { status: 200 });
  } catch (err: any) {
    console.error('earnings route error', err);
    return NextResponse.json({ error: 'server_error', message: String(err?.message || err) }, { status: 500 });
  }
}