// app/api/user/referrals/[id]/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { PostgrestError } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

function extractId(pathname: string): string | undefined {
  const parts = pathname.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

function norm(s: unknown): string {
  return String(s ?? '').trim().toLowerCase();
}

type MemberRow = Record<string, unknown>;

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'missing_env', message: 'Missing SUPABASE env vars' }, { status: 500 });
    }

    const id = extractId(req.nextUrl.pathname);
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

    // جلب صاحب الحساب (استخدمت أسماء الحقول بصيغة snake_case كما في بقية المشروع)
    const { data: owner, error: ownerErr } = await supabaseAdmin
      .from('producer_members')
      .select('id, full_name, email, invite_code_self, invite_code, invited_selected')
      .eq('id', id)
      .single<MemberRow>();

    if (ownerErr) {
      console.error('[user/referrals] owner fetch error', ownerErr);
      return NextResponse.json(
        { error: 'db_error', message: String((ownerErr as PostgrestError)?.message ?? ownerErr) },
        { status: 500 }
      );
    }
    if (!owner) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const ownerCode = norm(owner.invite_code_self ?? owner.invite_code ?? owner.invited_selected ?? '');

    // المستوى الأول: أولًا بواسطة referrer_id
    const { data: byRef, error: byRefErr } = await supabaseAdmin
      .from('producer_members')
      .select('id, full_name, email, created_at, referrer_id, invite_code, invited_selected, invite_code_self, status')
      .eq('referrer_id', id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (byRefErr) {
      console.error('[user/referrals] byRef error', byRefErr);
      return NextResponse.json(
        { error: 'db_error', message: String((byRefErr as PostgrestError)?.message ?? byRefErr) },
        { status: 500 }
      );
    }
    const directByRef: MemberRow[] = Array.isArray(byRef) ? byRef : [];

    // المستوى الأول احتياطياً بواسطة invite_code / invite_code_self (case-insensitive)
    let directByCode: MemberRow[] = [];
    if (ownerCode) {
      try {
        // حاول الاستعلام مباشرةً باستخدام or مع ilike على الحقول المناسبة
        const orQuery = `invite_code.ilike.%${ownerCode}%,invite_code_self.ilike.%${ownerCode}%;;`
        const { data: byCode, error: byCodeErr } = await supabaseAdmin
          .from('producer_members')
          .select('id, full_name, email, created_at, referrer_id, invite_code, invited_selected, invite_code_self, status')
          .or(orQuery)
          .eq('status', 'approved')
          .order('created_at', { ascending: false });

        if (!byCodeErr) {
          directByCode = Array.isArray(byCode) ? byCode : [];
        } else {
          // fallback: جلب الصفوف المعتمدة التي تحتوي على invite_code أو invite_code_self ثم فلترتها في الجافاسكربت
          const { data: fallback, error: fallbackErr } = await supabaseAdmin
            .from('producer_members')
            .select('id, full_name, email, created_at, referrer_id, invite_code, invited_selected, invite_code_self, status')
            .neq('invite_code', null)
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

          if (!fallbackErr) {
            const arr: MemberRow[] = Array.isArray(fallback) ? fallback : [];
            directByCode = arr.filter((r: MemberRow) => {
              const ic = norm(r.invite_code);
              const ics = norm(r.invite_code_self);
              return ic === ownerCode || ics === ownerCode;
            });
          }
        }
      } catch (e) {
        console.error('[user/referrals] byCode exception', e);
      }
    }

    // دمج المستوى الأول وإزالة التكرار
    const map1 = new Map<string, MemberRow>();
    [...directByRef, ...directByCode].forEach((r) => {
      const rid = String((r as MemberRow).id ?? '');
      if (rid) map1.set(rid, r);
    });
    const level1: MemberRow[] = Array.from(map1.values());

    // المستوى الثاني: بناءً على referrer_id في level1 أو invite_code المطابق لأي invite_code_self من level1
    const level1Ids = level1.map((r) => String(r.id ?? '')).filter(Boolean);
    const level1InviteSelfs = level1.map((r) => norm(r.invite_code_self)).filter(Boolean);

    let level2: MemberRow[] = [];
    if (level1Ids.length) {
      const { data: l2ref, error: l2refErr } = await supabaseAdmin
        .from('producer_members')
        .select('id, full_name, email, created_at, referrer_id, invite_code, invited_selected, status')
        .in('referrer_id', level1Ids)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (!l2refErr) level2 = level2.concat(Array.isArray(l2ref) ? l2ref : []);
      else console.error('[user/referrals] l2 byRef error', l2refErr);
    }

    if (level1InviteSelfs.length) {
      try {
        // بناء استعلام OR من invite_code.ilike.%code% لكل كود
        const orParts = level1InviteSelfs.map((c) => `invite_code.ilike.%${c}%`).join(',');
        if (orParts) {
          const { data: l2code, error: l2codeErr } = await supabaseAdmin
            .from('producer_members')
            .select('id, full_name, email, created_at, referrer_id, invite_code, invited_selected, status')
            .or(orParts)
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

          if (!l2codeErr) level2 = level2.concat(Array.isArray(l2code) ? l2code : []);
        }
      } catch (e) {
        console.error('[user/referrals] l2 byCode exception', e);
      }

      // fallback client filter if needed
      if (level2.length === 0) {
        const { data: fallbackL2, error: fallbackL2Err } = await supabaseAdmin
          .from('producer_members')
          .select('id, full_name, email, created_at, referrer_id, invite_code, invited_selected, status')
          .neq('invite_code', null)
          .eq('status', 'approved')
          .order('created_at', { ascending: false });

        if (!fallbackL2Err) {
          const arr: MemberRow[] = Array.isArray(fallbackL2) ? fallbackL2 : [];
          const sset = new Set(level1InviteSelfs.map((x) => x.toLowerCase()));
          level2 = level2.concat(
            arr.filter((r: MemberRow) => sset.has(norm(r.invite_code).toLowerCase()))
          );
        }
      }
    }

    // إزالة التكرار في level2
    const map2 = new Map<string, MemberRow>();
    level2.forEach((r) => {
      const rid = String(r.id ?? '');
      if (rid) map2.set(rid, r);
    });
    level2 = Array.from(map2.values());

    return NextResponse.json({ member: owner, referrals: { level1, level2 } }, { status: 200 });
  } catch (err) {
    console.error('[user/referrals] error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'server_error', message }, { status: 500 });
  }
}