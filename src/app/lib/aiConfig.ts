// الموديل الأساسي (يقرأ من Vercel أو يستخدم gemini-3.8-flash افتراضياً)
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

// الموديل الاحتياطي عند فشل الأساسي بسبب ضغط الخوادم
export const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite";

// دالة مساعدة لإعادة المحاولة على موديل واحد
async function retrySingleModel(fn: () => Promise<any>, maxAttempts: number): Promise<any> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || "");
      const temporary = /\b(503|429|500|504)\b|high demand|overloaded|try again/i.test(msg);
      
      // لو الخطأ مش مؤقت (زي مفتاح غلط) ارمي الخطأ فوراً بدون ما تكمل
      if (!temporary) throw err;
      
      // لو لسه باقي محاولات انتظر شوية وجرب تاني
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      }
    }
  }
  throw lastError;
}

// الدالة الرئيسية: بتجرب الموديل الأساسي ولو فشل بضغط مؤقت بتنتقل للبديل تلقائياً
export async function withGeminiFallback(
  fn: (modelName: string) => Promise<any>,
  maxAttemptsPerModel = 2
): Promise<any> {
  // بناء قائمة الموديلات بدون تكرار (في حالة لو غيرت GEMINI_MODEL في Vercel لنفس قيمة البديل)
  const modelsToTry = Array.from(new Set([GEMINI_MODEL, GEMINI_FALLBACK_MODEL]));
  let lastError: any;

  for (const model of modelsToTry) {
    try {
      return await retrySingleModel(() => fn(model), maxAttemptsPerModel);
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || "");
      const temporary = /\b(503|429|500|504)\b|high demand|overloaded|try again/i.test(msg);

      // لو الخطأ مش مؤقت ارميه فوراً وماتجربش الموديل البديل
      if (!temporary) throw err;

      console.warn(`فشل الموديل ${model} بسبب ضغط الخوادم، جاري الانتقال للموديل البديل...`);
    }
  }

  throw lastError;
}
