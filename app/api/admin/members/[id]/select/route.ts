// app/api/admin/members/[id]/select/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer'; // إن لم يعمل alias '@' غيّره إلى المسار النسبي الصحيح

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

    // ملاحظة: لا نمرّر النوع العام داخل from<...>() لأن تعريف المكتبة يتطلب نوعين عامّين.
    const { data, error } = await supabase
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

    // نحوّل النتيجة إلى النوع المحلي MemberRow قبل الإرجاع
    const member = (data as MemberRow) ?? null;

    return NextResponse.json({ ok: true, member }, { status: 200 });
  } catch (err: unknown) {
    console.error('select route error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'server_error', message }, { status: 500 });
  }
}