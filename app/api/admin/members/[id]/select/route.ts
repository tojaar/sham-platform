// app/api/admin/members/[id]/select/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

type MemberRow = {
  id: string;
  invited_selected?: boolean | null;
  [key: string]: unknown;
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'missing_id' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const selected: boolean = !!body?.selected;

    const supabase = await getSupabaseServerClient();

    // مرّرنا payload كـ Partial<MemberRow> لتجنّب خطأ "type 'never'"
    const updatePayload: Partial<MemberRow> = { invited_selected: selected };

    // لا نستخدم generics هنا لتجنّب تعقيدات أنواع المكتبة
    const res = await supabase
      .from('producer_members')
      .update(updatePayload)
      .eq('id', id)
      .select('*') // صريح لتقليل استنتاج الأنواع
      .single();

    if (res.error) {
      console.error('select update error', res.error);
      return NextResponse.json(
        { error: 'db_error', message: String((res.error as Error).message ?? res.error) },
        { status: 500 }
      );
    }

    const member = (res.data as MemberRow) ?? null;

    return NextResponse.json({ ok: true, member }, { status: 200 });
  } catch (err: unknown) {
    console.error('select route error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'server_error', message }, { status: 500 });
  }
}