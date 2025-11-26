// app/api/admin/earnings/route.ts
import type { NextRequest } from 'next/server';

/**
 * Route handler آمن لإنشاء استعلامات Supabase دون تنفيذ أي شيء أثناء البناء.
 * تأكد من ضبط المتغيرات في بيئتك: SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY (أو الأسماء التي تستخدمها).
 */

export async function GET(req: NextRequest) {
  // تحقق من متغيرات البيئة داخل الدالة (runtime) وليس على مستوى الوحدة
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    // لا ترمِ استثناء أثناء التقييم؛ أعد استجابة واضحة بدلاً من ذلك
    return new Response(
      JSON.stringify({ error: 'Missing SUPABASE env vars. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // استيراد ديناميكي لمنع تنفيذ أي كود عند البناء
    const { createClient } = await import('@supabase/supabase-js');

    // أنشئ العميل هنا داخل الدالة
    const supabase = createClient(url, key, {
      // اختياري: إعدادات إضافية
      auth: { persistSession: false },
    });

    // مثال استعلام: عدّ الأرباح أو أي منطق لديك
    // عدّل الاستعلام حسب بنية جدولك
    const { data, error } = await supabase
      .from('earnings')
      .select('id,amount,created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Supabase query error:', error);
      return new Response(JSON.stringify({ error: 'Supabase query failed', details: error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error in /api/admin/earnings:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}