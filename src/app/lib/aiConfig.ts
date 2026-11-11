// اسم موديل Gemini في مكان واحد فقط.
// لو جوجل أوقفت الموديل مرة تانية، غيّر المتغير GEMINI_MODEL في Vercel بدون ما تعدل الكود.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

// يعيد المحاولة تلقائياً لو جوجل رجعت خطأ مؤقت (ضغط عالي 503 أو تجاوز مؤقت للحد 429)
// أي خطأ آخر (مفتاح خاطئ، موديل غير موجود...) يظهر فوراً بدون إعادة محاولة.
export async function withGeminiRetry(fn: () => Promise<any>, maxAttempts = 3): Promise<any> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || "");
      const temporary = /\b(503|429|500|504)\b|high demand|overloaded|try again/i.test(msg);
      if (!temporary || attempt === maxAttempts) throw err;
      await new Promise((resolve) => setTimeout(resolve, attempt * 2500));
    }
  }
  throw lastError;
}