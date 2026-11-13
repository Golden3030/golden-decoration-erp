// الموديل الأساسي (يقرأ من Vercel أو يستخدم gemini-3.8-flash افتراضياً)
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

// الموديل الاحتياطي عند فشل الأساسي بسبب ضغط الخوادم
export const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite";

// الميزانية الزمنية الكلية للمحاولات. أقل من حد Vercel (60 ثانية) عشان ترجع رسالة خطأ واضحة
// بدل صفحة خطأ HTML من المنصة (وهي سبب رسالة: Unexpected token 'A', "An error o"...)
const TOTAL_BUDGET_MS = 52000;
const PRIMARY_FIRST_ATTEMPT_MS = 30000; // أقصى انتظار للموديل الأساسي قبل التحويل للبديل
const PRIMARY_RETRY_MS = 15000;
const MIN_USEFUL_MS = 4000;

class AiTimeoutError extends Error {}

const TEMPORARY = /\b(503|429|500|504)\b|high demand|overloaded|try again/i;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new AiTimeoutError("timeout")), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}

// الدالة الرئيسية: تجرب الموديل الأساسي، ولو تأخر أو فشل بضغط مؤقت تنتقل للبديل تلقائياً،
// وكل ده داخل ميزانية زمنية ثابتة.
export async function withGeminiFallback(
  fn: (modelName: string) => Promise<any>,
  maxAttemptsPerModel = 2
): Promise<any> {
  const startedAt = Date.now();
  const remainingMs = () => TOTAL_BUDGET_MS - (Date.now() - startedAt);
  const modelsToTry = Array.from(new Set([GEMINI_MODEL, GEMINI_FALLBACK_MODEL]));
  let lastError: any;

  for (let m = 0; m < modelsToTry.length; m++) {
    const isLastModel = m === modelsToTry.length - 1;

    for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
      const remaining = remainingMs();
      if (remaining < MIN_USEFUL_MS) break;

      // الموديل الأخير ياخد كل الوقت المتبقي، والأساسي ياخد حصة ويترك وقتاً للبديل
      const cap = isLastModel
        ? remaining
        : Math.min(remaining, attempt === 1 ? PRIMARY_FIRST_ATTEMPT_MS : PRIMARY_RETRY_MS);

      try {
        return await withTimeout(fn(modelsToTry[m]), cap);
      } catch (err: any) {
        lastError = err;
        const timedOut = err instanceof AiTimeoutError;
        if (!timedOut && !TEMPORARY.test(String(err?.message || ""))) throw err; // خطأ حقيقي (مفتاح، صلاحيات...)

        console.warn(`الموديل ${modelsToTry[m]} ${timedOut ? "تأخر في الرد" : "مشغول"}، المحاولة ${attempt}.`);
        if (timedOut) break; // لا فائدة من إعادة نفس الموديل بعد التأخر
        if (attempt < maxAttemptsPerModel) await sleep(1500);
      }
    }
  }

  if (lastError instanceof AiTimeoutError || !lastError) {
    throw new Error("خوادم الذكاء الاصطناعي مشغولة حالياً ولم ترد في الوقت المحدد. حاول مرة أخرى بعد لحظات.");
  }
  throw lastError;
}