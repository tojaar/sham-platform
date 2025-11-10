// app/api/producer/register/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function validatePayload(body: any) {
  if (!body) return 'body_required';
  const required = ['fullName', 'whatsapp', 'country', 'province', 'city', 'address', 'email', 'password', 'inviteCode'];
  for (const k of required) {
    if (!body[k] || String(body[k]).trim() === '') return `missing_${k};`
  }
  const email = String(body.email || '').trim();
  const password = String(body.password || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'invalid_email';
  if (password.length < 8) return 'weak_password';
  return null;
}

function generateInviteCodeSelf(seed = '') {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const base = (seed || 'USER').toString().replace(/\s+/g, '-').slice(0, 6).toUpperCase();
  return `${base}-${rand};`
}

async function insertProducerMemberWithRetries(payload: any, maxAttempts = 6) {
  let attempts = 0;
  while (attempts < maxAttempts) {
    payload.invite_code_self = generateInviteCodeSelf(payload.full_name || payload.fullName || 'USER');
    const { data, error } = await supabaseAdmin
      .from('producer_members')
      .insert([payload])
      .select()
      .single();

    if (!error && data) return { data };

    console.error('producer_members insert failed attempt', attempts + 1, { payload, error });

    const msg = String(error?.message || error?.details || error);
    if (/unique|duplicate|23505/i.test(msg)) {
      if (/invite_code\b/i.test(msg)) {
        return { error: { code: 'db_constraint_invite_code', message: 'DB constraint prevents reuse of invite_code. Remove UNIQUE on invite_code.' } };
      }
      attempts++;
      continue;
    }

    return { error: { code: 'insert_failed', message: msg || 'Insert failed' } };
  }
  return { error: { code: 'insert_retries_exhausted', message: 'Failed to insert producer_member after retries' } };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const invalid = validatePayload(body);
    if (invalid) {
      return NextResponse.json({ error: invalid, message: 'Invalid or missing fields' }, { status: 400 });
    }

    const payload: any = {
      full_name: String(body.fullName).trim(),
      whatsapp: String(body.whatsapp).trim(),
      country: String(body.country).trim(),
      province: String(body.province).trim(),
      city: String(body.city).trim(),
      address: String(body.address).trim(),
      invite_code: String(body.inviteCode).trim(),
      email: String(body.email).trim().toLowerCase(),
      usdt_trc20: body.usdtTrc20 ? String(body.usdtTrc20).trim() : null,
      sham_cash_link: body.shamCashLink ? String(body.shamCashLink).trim() : null,
      sham_payment_code: body.shamPaymentCode ? String(body.shamPaymentCode).trim() : null,
      usdt_txid: body.usdtTxid ? String(body.usdtTxid).trim() : null,
      created_at: new Date().toISOString(),
    };

    const insertResult = await insertProducerMemberWithRetries(payload);
    if (insertResult.error) {
      const code = insertResult.error.code || 'insert_error';
      const message = insertResult.error.message || 'Insert error';
      if (code === 'db_constraint_invite_code') {
        return NextResponse.json({ error: code, message }, { status: 409 });
      }
      return NextResponse.json({ error: code, message }, { status: 500 });
    }

    const member = insertResult.data;

    const email = String(body.email).trim().toLowerCase();
    let userId: string | null = null;

    try {
      const listResp: any = await supabaseAdmin.auth.admin.listUsers({ search: email });
      if (listResp?.data?.users && listResp.data.users.length > 0) {
        userId = listResp.data.users[0].id;
      } else if (listResp?.users && listResp.users.length > 0) {
        userId = listResp.users[0].id;
      }
    } catch (e) {
      console.error('admin.listUsers failed', e);
    }

    if (!userId) {
      try {
        const createResp: any = await supabaseAdmin.auth.admin.createUser({
          email,
          password: String(body.password),
          email_confirm: true,
          user_metadata: {
            full_name: payload.full_name,
            whatsapp: payload.whatsapp,
          },
        });

        if (createResp?.error) {
          const errMsg = String(createResp.error?.message || createResp.error);
          if (/user_already_exists|duplicate/i.test(errMsg)) {
            const listAgain: any = await supabaseAdmin.auth.admin.listUsers({ search: email }).catch(() => null);
            if (listAgain?.data?.users && listAgain.data.users.length > 0) {
              userId = listAgain.data.users[0].id;
            } else if (listAgain?.users && listAgain.users.length > 0) {
              userId = listAgain.users[0].id;
            } else {
              await supabaseAdmin.from('producer_members').delete().eq('id', member.id);
              return NextResponse.json({ error: 'user_create_failed', message: 'Failed to create user and cannot find existing user' }, { status: 500 });
            }
          } else {
            await supabaseAdmin.from('producer_members').delete().eq('id', member.id);
            return NextResponse.json({ error: 'user_create_failed', message: errMsg }, { status: 500 });
          }
        } else {
          userId = createResp?.data?.user?.id || createResp?.user?.id || null;
        }
      } catch (errCreate) {
        console.error('createUser threw', errCreate);
        await supabaseAdmin.from('producer_members').delete().eq('id', member.id);
        return NextResponse.json({ error: 'user_create_exception', message: String(errCreate) }, { status: 500 });
      }
    }

    if (userId) {
      try {
        await supabaseAdmin
          .from('producer_members')
          .update({ user_id: userId, email: payload.email })
          .eq('id', member.id);
      } catch (errUpd) {
        console.error('Failed to update producer_members.user_id or email', errUpd);
      }
    }

    return NextResponse.json({
      ok: true,
      member: { id: member.id, invite_code: member.invite_code, invite_code_self: member.invite_code_self },
      user_id: userId,
    }, { status: 201 });
  } catch (err: any) {
    console.error('Registration route error', err);
    return NextResponse.json({ error: 'server_error', message: String(err?.message || err) }, { status: 500 });
  }
}