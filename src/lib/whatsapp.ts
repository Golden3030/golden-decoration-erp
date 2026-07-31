/**
 * بتحول رقم موبايل مصري محلي (زي 01012345678) لصيغة دولية لواتساب (201012345678)
 * (نفس منطق التحويل المستخدم بالفعل فى ProjectInfo.tsx عند إرسال المقايسة)
 */
export function normalizeEgyptianPhone(mobile: string): string {
  let cleanPhone = String(mobile).trim().replace(/\D/g, "");
  if (cleanPhone.startsWith("01")) {
    cleanPhone = "2" + cleanPhone;
  }
  return cleanPhone;
}

/**
 * بتفتح واتساب (ويب أو تطبيق) برسالة جاهزة مُعبّأة مسبقاً، والموظف بس يدوس "إرسال".
 * نفس الفكرة والطريقة المستخدمة بالفعل فى شاشة إرسال المقايسة (ProjectInfo.tsx) —
 * من غير أي حساب Meta Business، من غير API keys، ومن غير انتظار موافقة قالب.
 */
export function openWhatsAppChat(mobile: string, message: string) {
  const phone = normalizeEgyptianPhone(mobile);
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
  window.open(whatsappUrl, "_blank");
}