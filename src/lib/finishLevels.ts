// مستويات التشطيب المعتمدة في الشركة، في مكان واحد يستخدمه كل البرنامج:
// أسعار الإعدادات، والتقدير السريع، ومساعد المبيعات.
// dbLevel: النص المخزَّن في بيانات المشروع (مطابق للقيم القديمة في قاعدة البيانات).

export type FinishLevel = "lux" | "super_lux" | "ultra_lux";

export const FINISH_LEVELS: { key: FinishLevel; label: string; dbLevel: string }[] = [
  { key: "lux", label: "لوكس", dbLevel: "اقتصادى (لوكس)" },
  { key: "super_lux", label: "سوبر لوكس", dbLevel: "متوسط (سوبر لوكس )" },
  { key: "ultra_lux", label: "ألترا لوكس", dbLevel: "فاخر (الترا لوكس)" }
];

export const DEFAULT_FINISH_LEVEL: FinishLevel = "super_lux";

export function isFinishLevel(v: any): v is FinishLevel {
  return FINISH_LEVELS.some((l) => l.key === v);
}

export function levelLabel(key: FinishLevel): string {
  return FINISH_LEVELS.find((l) => l.key === key)?.label || key;
}

export function levelDbValue(key: FinishLevel): string {
  return FINISH_LEVELS.find((l) => l.key === key)?.dbLevel || FINISH_LEVELS[0].dbLevel;
}

// يستخرج المستوى من نص عربي حر. يرجع null لو لم يُذكر مستوى.
export function levelFromText(text: string | null | undefined): FinishLevel | null {
  const t = String(text || "");
  if (/[اأ]?لترا|ultra|فاخر/i.test(t)) return "ultra_lux";
  if (/سوبر|super/i.test(t)) return "super_lux";
  if (/لوكس|lux/i.test(t)) return "lux";
  return null;
}