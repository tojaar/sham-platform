// app/api/admin/earnings/route.ts

/**
 * Route handler آمن لاستعلامات Supabase.
 * تأكد من ضبط المتغيرات في .env.local أو إعدادات الاستضافة:
 * SUPABASE_URL
 * SUPABASE_SERVICE_ROLE_KEY   (أو SUPABASE_ANON_KEY إذا كنت تستخدم مفتاح عميل)
 */

export async function GET() {
  // تحقق من متغيرات البيئة داخل الدالة (runtime)
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return new Response(
      JSON.stringify({
        error: 'Missing SUPABASE env vars. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY).',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // استيراد ديناميكي لمنع التنفيذ أثناء مرحلة البناء
    const { createClient } = await import('@supabase/supabase-js');

    const supabase = createClient(url, key, { auth: { persistSession: false } });

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
  } catch (err: unknown) {
    // تعامل آمن مع الخطأ بدون استخدام any
    const message = err instanceof Error ? err.message : String(err);
    console.error('Unexpected error in /api/admin/earnings:', message);
    return new Response(JSON.stringify({ error: 'Internal server error', details: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}