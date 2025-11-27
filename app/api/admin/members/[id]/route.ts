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

// استخراج الـ id من المسار /api/admin/members/{id}
function extractId(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

// GET: تفاصيل العضو + المدعوين مستوى أول وثاني
export async function GET(req: NextRequest) {
  try {
    const id = extractId(req.nextUrl.pathname);
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

    // العضو الأساسي
    const { data: memberData, error: memErr } = await supabaseAdmin
      .from('producer_members')
      .select('*')
      .eq('id', id)
      .single();

    if (memErr) {
      console.error('member fetch error', memErr);
      return NextResponse.json({ error: 'db_error', message: String(memErr.message || memErr) }, { status: 500 });
    }
    if (!memberData) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // المستوى الأول: من استخدم invite_code = invite_code_self لهذا العضو
    const { data: level1, error: l1Err } = await supabaseAdmin
      .from('producer_members')
      .select('*')
      .eq('invite_code', memberData.invite_code_self)
      .order('created_at', { ascending: false });

    if (l1Err) {
      console.error('level1 fetch error', l1Err);
      return NextResponse.json({ error: 'db_error', message: String(l1Err.message || l1Err) }, { status: 500 });
    }

    // المستوى الثاني: من استخدم invite_code لأي invite_code_self من المستوى الأول
    const l1Codes = (level1 || []).map((r: any) => r.invite_code_self).filter(Boolean);
    let level2: any[] = [];
    if (l1Codes.length > 0) {
      const { data: l2, error: l2Err } = await supabaseAdmin
        .from('producer_members')
        .select('*')
        .in('invite_code', l1Codes)
        .order('created_at', { ascending: false });
      if (l2Err) {
        console.error('level2 fetch error', l2Err);
        return NextResponse.json({ error: 'db_error', message: String(l2Err.message || l2Err) }, { status: 500 });
      }
      level2 = l2 || [];
    }

    return NextResponse.json({
      member: memberData,
      referrals: { level1: level1 || [], level2 }
    }, { status: 200 });
  } catch (err: any) {
    console.error('GET member detail error', err);
    return NextResponse.json({ error: 'server_error', message: String(err?.message || err) }, { status: 500 });
  }
}

// POST: تحديث حالة العضو (approve/reject/delete)
export async function POST(req: NextRequest) {
  try {
    const id = extractId(req.nextUrl.pathname);
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

    const body = await req.json().catch(() => null);
    const action = body?.action;
    if (!action) return NextResponse.json({ error: 'invalid_action' }, { status: 400 });

    let statusValue = action;
    if (action === 'approve') statusValue = 'approved';
    if (action === 'reject') statusValue = 'rejected';
    if (action === 'delete') statusValue = 'deleted';

    const { data, error } = await supabaseAdmin
      .from('producer_members')
      .update({ status: statusValue })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('update member error', error);
      return NextResponse.json({ error: 'db_error', message: String(error.message || error) }, { status: 500 });
    }

    return NextResponse.json({ ok: true, member: data }, { status: 200 });
  } catch (err: any) {
    console.error('POST member update error', err);
    return NextResponse.json({ error: 'server_error', message: String(err?.message || err) }, { status: 500 });
  }
}