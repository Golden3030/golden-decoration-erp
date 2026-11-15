// اختيار المقايسة المعتمدة للمشروع: المشروع الناضج غالباً له أكثر من مقايسة (مبدئية + نهائية).
// القاعدة: النهائية أولاً، وبعدها الأحدث. (نفس القاعدة المستخدمة في بوابة العميل)

interface HeaderLike {
  status?: string | null;
  created_at?: string | null;
}

export function sortEstimateHeaders<T extends HeaderLike>(headers: T[]): T[] {
  return [...headers].sort((a, b) => {
    const fa = a.status === "نهائية" ? 1 : 0;
    const fb = b.status === "نهائية" ? 1 : 0;
    if (fa !== fb) return fb - fa;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });
}

export function pickEstimateHeader<T extends HeaderLike>(headers: T[] | null | undefined): T | null {
  return sortEstimateHeaders(headers || [])[0] || null;
}