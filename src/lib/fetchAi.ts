// طلب موحد لمساعدي الذكاء الاصطناعي:
// - يقرأ الرد كنص ثم يحاول تحويله لـ JSON (فلا تظهر رسالة Unexpected token لو الرد HTML).
// - لو الرد ليس JSON (غالباً انقطاع من منصة الاستضافة) أو انقطع الاتصال، يعيد المحاولة مرة واحدة تلقائياً.
// - أخطاء الخادم المنطقية (بيانات ناقصة مثلاً) تظهر فوراً بدون إعادة محاولة.

class ServerMessageError extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function statusMessage(status: number): string {
  if (status === 504 || status === 408) return "انتهت مهلة الخادم، حاول مرة أخرى.";
  if (status === 413) return "حجم البيانات المرسلة كبير جداً.";
  if (status === 404) return "الخدمة المطلوبة غير موجودة على الخادم.";
  return "رد الخادم بخطأ غير متوقع (" + status + ").";
}

export async function fetchAiJson(
  url: string,
  init: RequestInit = {},
  options: { retries?: number; timeoutMs?: number } = {}
): Promise<any> {
  const retries = options.retries ?? 1;
  const timeoutMs = options.timeoutMs ?? 58000;
  let lastMessage = "تعذّر الاتصال بالخادم.";

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      const raw = await res.text();

      let data: any = null;
      try { data = JSON.parse(raw); } catch { data = null; }

      if (data) {
        if (res.ok) return data;
        throw new ServerMessageError(data.error || statusMessage(res.status));
      }
      lastMessage = statusMessage(res.status); // رد غير JSON: نعيد المحاولة
    } catch (err: any) {
      if (err instanceof ServerMessageError) throw err;
      lastMessage = err?.name === "AbortError" ? "استغرق الطلب وقتاً طويلاً، حاول مرة أخرى." : err?.message || lastMessage;
    } finally {
      clearTimeout(timer);
    }
    if (attempt < retries) await sleep(1500);
  }
  throw new Error(lastMessage);
}