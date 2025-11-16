// app/api/producer/register/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWT_SECRET = process.env.JWT_SECRET!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE env vars');
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
  const email = String(body.email ?? '').trim();
  const password = String(body.password ?? '');
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

    // توليد هاش لكلمة السر
    const plainPassword = String(body.password);
    const password_hash = await bcrypt.hash(plainPassword, 10);

    const payload: any = {
      full_name: String(body.fullName).trim(),
      whatsapp: String(body.whatsapp).trim(),
      country: String(body.country).trim(),
      province: String(body.province).trim(),
      city: String(body.city).trim(),
      address: String(body.address).trim(),
      invite_code: String(body.inviteCode).trim(),
      email: String(body.email).trim().toLowerCase(),
      password_hash, // حفظ الهاش
      usdt_trc20: body.usdtTrc20 ? String(body.usdtTrc20).trim() : null,
      sham_cash_link: body.shamCashLink ? String(body.shamCashLink).trim() : null,
      sham_payment_code: body.shamPaymentCode ? String(body.shamPaymentCode).trim() : null,
      usdt_txid: body.usdtTxid ? String(body.usdtTxid).trim() : null,
      created_at: new Date().toISOString(),
      status: 'pending',
    };

    const insertResult = await insertProducerMemberWithRetries(payload);
    if (insertResult.error) {
      return NextResponse.json({ error: insertResult.error.code, message: insertResult.error.message }, { status: 500 });
    }

    const member = insertResult.data;

    // إنشاء JWT
    const token = jwt.sign(
      { id: member.id, email: member.email, status: member.status },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      ok: true,
      member: { id: member.id, invite_code: member.invite_code, invite_code_self: member.invite_code_self },
      token,
    }, { status: 201 });
  } catch (err: any) {
    console.error('Registration route error', err);
    return NextResponse.json({ error: 'server_error', message: String(err?.message || err) }, { status: 500 });
  }
}