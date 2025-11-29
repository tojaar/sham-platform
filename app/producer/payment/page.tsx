<div className="text-xs text-white/60">
                ملاحظة: الأزرار أعلاه محاكاة. استبدل استدعاءات alert(...) والمنطق الداخلي بإنشاء جلسة دفع حقيقية (API إلى مزود الدفع، إعادة توجيه إلى صفحة الدفع، أو استدعاء SDK).
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => router.back()}
                  className="flex-1 px-4 py-3 rounded-lg bg-white/6 hover:bg-white/10"
                >
                  العودة
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="flex-1 px-4 py-3 rounded-lg bg-transparent border border-white/6"
                >
                  الرئيسية
                </button>
              </div>
            </section>
          </div>

          <div className="border-t border-white/6 px-6 py-3 text-xs text-white/60 flex items-center justify-between">
            <div>آمن ومشفر</div>
            <div>تواصل للدعم عند الحاجة</div>
          </div>
        </div>
      </div>
    </main>
  );
}