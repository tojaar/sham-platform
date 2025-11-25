// app/api/producer/register/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { PostgrestError } from '@supabase/supabase-js';
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

// تعريف نوع للـ payload والعضو
type RegisterPayload = {
  id?: string;
  full_name: string;
  whatsapp: string;
  country: string;
  province: string;
  city: string;
  address: string;
  invite_code: string;
  email: string;
  password_hash: string;
  usdt_trc20?: string | null;
  sham_cash_link?: string | null;
  sham_payment_code?: string | null;
  usdt_txid?: string | null;
  created_at: string;
  status: string;
  invite_code_self?: string;
};

function validatePayload(body: unknown): string | null {
  if (!body || typeof body !== 'object') return 'body_required';
  const b = body as Record<string, unknown>;
  const required = [
    'fullName',
    'whatsapp',
    'country',
    'province',
    'city',
    'address',
    'email',
    'password',
    'inviteCode',
  ];
  for (const k of required) {
    if (!b[k] || String(b[k]).trim() === '') return `missing_${k};`
  }
  const email = String(b.email ?? '').trim();
  const password = String(b.password ?? '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'invalid_email';
  if (password.length < 8) return 'weak_password';
  return null;
}

function generateInviteCodeSelf(seed = ''): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const base = (seed || 'USER').toString().replace(/\s+/g, '-').slice(0, 6).toUpperCase();
  return `${base}-${rand};`
}

async function insertProducerMemberWithRetries(
  payload: RegisterPayload,
  maxAttempts = 6
): Promise<{ data?: RegisterPayload; error?: { code: string; message: string } }> {
  let attempts = 0;
  while (attempts < maxAttempts) {
    payload.invite_code_self = generateInviteCodeSelf(payload.full_name || 'USER');
    const { data, error } = await supabaseAdmin
      .from('producer_members')
      .insert([payload])
      .select()
      .single<RegisterPayload>();

    if (!error && data) return { data };

    console.error('producer_members insert failed attempt', attempts + 1, { payload, error });

    const pgErr = error as PostgrestError | null;
    const msg = String(pgErr?.message ?? pgErr?.details ?? error);
    if (/unique|duplicate|23505/i.test(msg)) {
      attempts++;
      continue;
    }

    return { error: { code: 'insert_failed', message: msg || 'Insert failed' } };
  }
  return {
    error: {
      code: 'insert_retries_exhausted',
      message: 'Failed to insert producer_member after retries',
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const invalid = validatePayload(body);
    if (invalid) {
      return NextResponse.json(
        { error: invalid, message: 'Invalid or missing fields' },
        { status: 400 }
      );
    }

    const b = body as Record<string, unknown>;

    // توليد هاش لكلمة السر
    const plainPassword = String(b.password);
    const password_hash = await bcrypt.hash(plainPassword, 10);

    const payload: RegisterPayload = {
      full_name: String(b.fullName).trim(),
      whatsapp: String(b.whatsapp).trim(),
      country: String(b.country).trim(),
      province: String(b.province).trim(),
      city: String(b.city).trim(),
      address: String(b.address).trim(),
      invite_code: String(b.inviteCode).trim(),
      email: String(b.email).trim().toLowerCase(),
      password_hash,
      usdt_trc20: b.usdtTrc20 ? String(b.usdtTrc20).trim() : null,
      sham_cash_link: b.shamCashLink ? String(b.shamCashLink).trim() : null,
      sham_payment_code: b.shamPaymentCode ? String(b.shamPaymentCode).trim() : null,
      usdt_txid: b.usdtTxid ? String(b.usdtTxid).trim() : null,
      created_at: new Date().toISOString(),
      status: 'pending',
    };

    const insertResult = await insertProducerMemberWithRetries(payload);
    if (insertResult.error) {
      return NextResponse.json(
        { error: insertResult.error.code, message: insertResult.error.message },
        { status: 500 }
      );
    }

    const member = insertResult.data!;
    // إنشاء JWT
    const token = jwt.sign(
      { id: member.id, email: member.email, status: member.status },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json(
      {
        ok: true,
        member: {
          id: member.id,
          invite_code: member.invite_code,
          invite_code_self: member.invite_code_self,
        },
        token,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('Registration route error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'server_error', message }, { status: 500 });
  }
}