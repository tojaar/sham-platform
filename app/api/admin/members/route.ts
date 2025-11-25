// app/api/admin/members/route.ts
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

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q') || '';
    const status = req.nextUrl.searchParams.get('status') || ''; // e.g., approved,pending
    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') || '1'));
    const perPage = Math.min(
      200,
      Math.max(10, Number(req.nextUrl.searchParams.get('perPage') || '50'))
    );
    const order = req.nextUrl.searchParams.get('order') || 'created_at';
    const dir = (req.nextUrl.searchParams.get('dir') || 'desc').toLowerCase();

    let builder = supabaseAdmin
      .from('producer_members')
      .select(
        'id, user_id, full_name, email, whatsapp, country, province, city, address, invite_code, invite_code_self, usdt_trc20, sham_cash_link, sham_payment_code, usdt_txid, status, created_at',
        { count: 'exact' }
      );

    if (status) {
      const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
      if (statuses.length === 1) builder = builder.eq('status', statuses[0]);
      else builder = builder.in('status', statuses);
    }

    if (q) {
      builder = builder.or(
        `full_name.ilike.%${q}%,email.ilike.%${q}%,whatsapp.ilike.%${q}%,invite_code_self.ilike.%${q}%`
      );
    }

    builder = builder
      .order(order, { ascending: dir === 'asc' })
      .range((page - 1) * perPage, page * perPage - 1);

    const { data, error, count } = await builder;
    if (error) {
      console.error('admin.members fetch error', error);
      return NextResponse.json(
        { error: 'db_error', message: String((error as Error).message ?? error) },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { members: data ?? [], count: count ?? 0, page, perPage },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error('admin.members route error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'server_error', message }, { status: 500 });
  }
}