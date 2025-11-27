// app/api/admin/members/[id]/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer'; // عدّل المسار إذا لم تستخدم alias '@'

// استخراج الـ id من المسار /api/admin/members/{id}
function extractId(pathname: string): string | undefined {
  const parts = pathname.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

// تعريف نوع العضو لتفادي استخدام any
type Member = {
  id: string;
  invitecode_self?: string | number | null; // بعض الجداول تستخدم هذا الاسم
  invitecodeself?: string | number | null;  // وبعضها يستخدم هذا الاسم
  invitecode?: string | number | null;      // أو هذا
  invite_code?: string | number | null;     // أو هذا
  created_at?: string;
  [key: string]: unknown;
};

export async function GET(req: NextRequest) {
  try {
    const id = extractId(req.nextUrl.pathname);
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

    const supabase = await getSupabaseServerClient();

    // العضو الأساسي
    const { data: memberData, error: memErr } = await supabase
      .from('producer_members')
      .select('*')
      .eq('id', id)
      .single<Member>();

    if (memErr) {
      console.error('member fetch error', memErr);
      return NextResponse.json(
        { error: 'db_error', message: String((memErr as Error).message ?? memErr) },
        { status: 500 }
      );
    }
    if (!memberData) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // استخرج قيمة invitecode_self بأمان بغض النظر عن اسم الحقل في DB
    const inviteSelf =
      (memberData as any).invitecode_self ??
      (memberData as any).invitecodeself ??
      (memberData as any).invite_code ??
      (memberData as any).invitecode ??
      null;

    // المستوى الأول: من استخدم invitecode = invitecode_self لهذا العضو
    const { data: level1, error: l1Err } = await supabase
      .from('producer_members')
      .select('*')
      .eq('invitecode', inviteSelf) // افترضنا أن عمود المدعو هو invitecode؛ عدّله إن كان مختلفًا
      .order('created_at', { ascending: false });

    if (l1Err) {
      console.error('level1 fetch error', l1Err);
      return NextResponse.json(
        { error: 'db_error', message: String((l1Err as Error).message ?? l1Err) },
        { status: 500 }
      );
    }

    // المستوى الثاني: من استخدم invitecode لأي invitecode_self من المستوى الأول
    const l1Codes = (level1 ?? []).map((r: Member) => {
      return (r as any).invitecode_self ?? (r as any).invitecodeself ?? (r as any).invite_code ?? (r as any).invitecode;
    }).filter(Boolean) as (string | number)[];

    let level2: Member[] = [];
    if (l1Codes.length > 0) {
      const { data: l2, error: l2Err } = await supabase
        .from('producer_members')
        .select('*')
        .in('invitecode', l1Codes) // افترضنا اسم العمود invitecode أيضاً
        .order('created_at', { ascending: false });

      if (l2Err) {
        console.error('level2 fetch error', l2Err);
        return NextResponse.json(
          { error: 'db_error', message: String((l2Err as Error).message ?? l2Err) },
          { status: 500 }
        );
      }
      level2 = (l2 ?? []) as Member[];
    }

    return NextResponse.json(
      {
        member: memberData,
        referrals: { level1: level1 ?? [], level2 },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error('GET member detail error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'server_error', message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const id = extractId(req.nextUrl.pathname);
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

    const body = await req.json().catch(() => null);
    const action: string | undefined = body?.action;
    if (!action) return NextResponse.json({ error: 'invalid_action' }, { status: 400 });let statusValue = action;
    if (action === 'approve') statusValue = 'approved';
    if (action === 'reject') statusValue = 'rejected';
    if (action === 'delete') statusValue = 'deleted';

    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase
      .from('producer_members')
      .update({ status: statusValue })
      .eq('id', id)
      .select()
      .single<Member>();

    if (error) {
      console.error('update member error', error);
      return NextResponse.json(
        { error: 'db_error', message: String((error as Error).message ?? error) },
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