// app/api/user/referrals/[id]/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing SUPABASE env vars');

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function extractId(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  return parts[parts.length - 1];
}
function norm(s: any) { return String(s ?? '').trim().toLowerCase(); }

export async function GET(req: NextRequest) {
  try {
    const id = extractId(req.nextUrl.pathname);
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

    // جلب صاحب الحساب
    const { data: owner, error: ownerErr } = await supabaseAdmin
      .from('producer_members')
      .select('id, full_name, email, invite_code_self, invite_code, invited_selected')
      .eq('id', id)
      .single();

    if (ownerErr) {
      console.error('[user/referrals] owner fetch error', ownerErr);
      return NextResponse.json({ error: 'db_error', message: String(ownerErr.message || ownerErr) }, { status: 500 });
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
      return NextResponse.json({ error: 'db_error', message: String(byRefErr.message || byRefErr) }, { status: 500 });
    }
    const directByRef = Array.isArray(byRef) ? byRef : [];

    // المستوى الأول احتياطياً بواسطة invite_code / invited_selected (case-insensitive)
    let directByCode: any[] = [];
    if (ownerCode) {
      try {
        const { data: byCode, error: byCodeErr } = await supabaseAdmin
          .from('producer_members')
          .select('id, full_name, email, created_at, referrer_id, invite_code, invited_selected, invite_code_self, status')
          .or(`invite_code.ilike.${ownerCode},invited_selected.ilike.${ownerCode}`)
          .eq('status', 'approved')
          .order('created_at', { ascending: false });

        if (!byCodeErr) directByCode = Array.isArray(byCode) ? byCode : [];
        else {
          // fallback: fetch approved rows with non-null invite fields and filter in JS
          const { data: fallback, error: fallbackErr } = await supabaseAdmin
            .from('producer_members')
            .select('id, full_name, email, created_at, referrer_id, invite_code, invited_selected, invite_code_self, status')
            .neq('invite_code', null)
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

          if (!fallbackErr) {
            const arr = Array.isArray(fallback) ? fallback : [];
            directByCode = arr.filter((r: any) => norm(r.invite_code) === ownerCode || norm(r.invited_selected) === ownerCode);
          }
        }
      } catch (e) {
        console.error('[user/referrals] byCode exception', e);
      }
    }

    // دمج المستوى الأول وإزالة التكرار
    const map1 = new Map<string, any>();
    [...directByRef, ...directByCode].forEach((r: any) => { if (r?.id) map1.set(String(r.id), r); });
    const level1 = Array.from(map1.values());

    // المستوى الثاني: بناءً على referrer_id في level1 أو invite_code المطابق لأي invite_code_self من level1
    const level1Ids = level1.map((r: any) => r.id).filter(Boolean);
    const level1InviteSelfs = level1.map((r: any) => norm(r.invite_code_self)).filter(Boolean);

    let level2: any[] = [];
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
        const orParts = level1InviteSelfs.map(c => `invite_code.ilike.${c}`).join(',');
        const { data: l2code, error: l2codeErr } = await supabaseAdmin
          .from('producer_members')
          .select('id, full_name, email, created_at, referrer_id, invite_code, invited_selected, status')
          .or(orParts)
          .eq('status', 'approved')
          .order('created_at', { ascending: false });

        if (!l2codeErr) level2 = level2.concat(Array.isArray(l2code) ? l2code : []);
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
          const arr = Array.isArray(fallbackL2) ? fallbackL2 : [];
          const sset = new Set(level1InviteSelfs.map(x => x.toLowerCase()));
          level2 = level2.concat(arr.filter((r: any) => sset.has(norm(r.invite_code).toLowerCase())));
        }
      }
    }

    // dedupe level2
    const map2 = new Map<string, any>();
    level2.forEach((r: any) => { if (r?.id) map2.set(String(r.id), r); });
    level2 = Array.from(map2.values());

    return NextResponse.json({ member: owner, referrals: { level1, level2 } }, { status: 200 });
  } catch (err: any) {
    console.error('[user/referrals] error', err);
    return NextResponse.json({ error: 'server_error', message: String(err?.message || err) }, { status: 500 });
  }
}