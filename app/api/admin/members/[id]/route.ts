// app/api/admin/members/[id]/route.ts
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

type MemberRow = {
  id: string;
  user_id?: string | null;
  full_name?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  country?: string | null;
  province?: string | null;
  city?: string | null;
  address?: string | null;
  invite_code?: string | null;
  invite_code_self?: string | null;
  usdt_trc20?: string | null;
  sham_cash_link?: string | null;
  sham_payment_code?: string | null;
  usdt_txid?: string | null;
  status?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
};

// استخراج الـ id من المسار /api/admin/members/{id}
function extractId(pathname: string): string | undefined {
  const parts = pathname.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

// GET: تفاصيل العضو + المدعوين مستوى أول وثاني
export async function GET(req: NextRequest) {
  try {
    const id = extractId(req.nextUrl.pathname);
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

    // العضو الأساسي
    const memRes = await supabaseAdmin
      .from('producer_members')
      .select('*')
      .eq('id', id)
      .single();

    const memberData = (memRes.data as MemberRow | null) ?? null;
    const memErr = memRes.error ?? null;

    if (memErr) {
      console.error('member fetch error', memErr);
      return NextResponse.json(
        { error: 'db_error', message: String((memErr as { message?: string })?.message ?? memErr) },
        { status: 500 }
      );
    }
    if (!memberData) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // المستوى الأول: من استخدم invite_code = invite_code_self لهذا العضو
    const l1Res = await supabaseAdmin
      .from('producer_members')
      .select('*')
      .eq('invite_code', memberData.invite_code_self)
      .order('created_at', { ascending: false });

    const level1 = (l1Res.data as MemberRow[] | null) ?? [];
    const l1Err = l1Res.error ?? null;

    if (l1Err) {
      console.error('level1 fetch error', l1Err);
      return NextResponse.json(
        { error: 'db_error', message: String((l1Err as { message?: string })?.message ?? l1Err) },
        { status: 500 }
      );
    }

    // المستوى الثاني: من استخدم invite_code لأي invite_code_self من المستوى الأول
    const l1Codes = level1.map((r) => r.invite_code_self).filter(Boolean) as string[];
    let level2: MemberRow[] = [];
    if (l1Codes.length > 0) {
      const l2Res = await supabaseAdmin
        .from('producer_members')
        .select('*')
        .in('invite_code', l1Codes)
        .order('created_at', { ascending: false });

      const l2Err = l2Res.error ?? null;
      if (l2Err) {
        console.error('level2 fetch error', l2Err);
        return NextResponse.json(
          { error: 'db_error', message: String((l2Err as { message?: string })?.message ?? l2Err) },
          { status: 500 }
        );
      }
      level2 = (l2Res.data as MemberRow[] | null) ?? [];
    }

    return NextResponse.json(
      {
        member: memberData,
        referrals: { level1, level2 },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error('GET member detail error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'server_error', message }, { status: 500 });
  }
}

// POST: تحديث حالة العضو (approve/reject/delete)
export async function POST(req: NextRequest) {
  try {
    const id = extractId(req.nextUrl.pathname);
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });const body = await req.json().catch(() => null);
    const action = body?.action as string | undefined;
    if (!action) return NextResponse.json({ error: 'invalid_action' }, { status: 400 });

    let statusValue = action;
    if (action === 'approve') statusValue = 'approved';
    if (action === 'reject') statusValue = 'rejected';
    if (action === 'delete') statusValue = 'deleted';

    const updRes = await supabaseAdmin
      .from('producer_members')
      .update({ status: statusValue })
      .eq('id', id)
      .select()
      .single();

    const data = (updRes.data as MemberRow | null) ?? null;
    const error = updRes.error ?? null;

    if (error) {
      console.error('update member error', error);
      return NextResponse.json(
        { error: 'db_error', message: String((error as { message?: string })?.message ?? error) },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, member: data }, { status: 200 });
  } catch (err: unknown) {
    console.error('POST member update error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'server_error', message }, { status: 500 });
  }
}