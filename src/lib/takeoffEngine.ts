// أنواع الغرف وتصنيفها من الاسم، وتوزيع الغرف للتقدير السريع. الحصر نفسه (الكميات والتكاليف) في bomEngine.ts،
// وحصر المشروع المسجل في projectBom.ts. المحرك القديم (computeTakeoff) اتشال بعد التوحيد.

export type ApartmentState = "brick" | "plastered";
export type RoomKind =
  | "reception" | "living" | "bedroom" | "kitchen" | "bathroom"
  | "corridor" | "balcony" | "garden" | "other";
export type { FinishLevel } from "@/lib/finishLevels";

export interface TakeoffRoom {
  name: string;
  kind: RoomKind;
  area: number; // م²
}

export interface TakeoffLine {
  stage: string;
  item: string;
  quantity: number;
  unit: string;
  basis: string;
}

export interface TakeoffResult {
  rooms: TakeoffRoom[];
  lines: TakeoffLine[];
  assumptions: string[];
  warnings: string[];
  totals: {
    floorArea: number;
    netWallArea: number;
    plasterArea: number;
    paintArea: number;
    ceilingArea: number;
  };
}

export function classifyRoom(name: string): RoomKind {
  const n = String(name || "");
  if (/حمام/.test(n)) return "bathroom";
  if (/مطبخ/.test(n)) return "kitchen";
  if (/ريسبشن/.test(n)) return "reception";
  if (/ليفنج|معيشة/.test(n)) return "living";
  if (/نوم|أطفال|اطفال/.test(n)) return "bedroom";
  if (/بلكونة|تراس|شرفة/.test(n)) return "balcony";
  if (/حديقة|جاردن/.test(n)) return "garden";
  if (/طرقة|ممر|كوريدور|مدخل|هول/.test(n)) return "corridor";
  return "other";
}

const round1 = (n: number) => Math.round(n * 10) / 10;
// ---------- وضع التقدير السريع (عميل غير مسجل) ----------

export interface QuickInput {
  totalArea: number;
  bedrooms: number;
  bathrooms: number;
  receptions: number;
  kitchens: number;
  corridors: number; // عدد الطرقات (0 أو أكثر)
}

// توزيع المساحة الإجمالية على الغرف بأوزان تقديرية
export function buildQuickRooms(q: QuickInput): TakeoffRoom[] {
  const raw: { name: string; kind: RoomKind; weight: number }[] = [];
  for (let i = 1; i <= q.receptions; i++) {
    raw.push({ name: q.receptions === 1 ? "الريسبشن" : `الريسبشن ${i}`, kind: "reception", weight: 3.0 });
  }
  for (let i = 1; i <= q.bedrooms; i++) {
    raw.push({
      name: i === 1 ? "غرفة النوم الرئيسية" : `غرفة نوم ${i}`,
      kind: "bedroom",
      weight: i === 1 ? 2.0 : 1.4
    });
  }
  for (let i = 1; i <= q.bathrooms; i++) {
    raw.push({ name: q.bathrooms === 1 ? "الحمام" : `الحمام ${i}`, kind: "bathroom", weight: 0.6 });
  }
  for (let i = 1; i <= q.kitchens; i++) {
    raw.push({ name: q.kitchens === 1 ? "المطبخ" : `المطبخ ${i}`, kind: "kitchen", weight: 1.0 });
  }
  for (let i = 1; i <= q.corridors; i++) {
    raw.push({ name: q.corridors === 1 ? "الطرقة" : `الطرقة ${i}`, kind: "corridor", weight: 1.0 });
  }

  const totalWeight = raw.reduce((s, r) => s + r.weight, 0);
  return raw.map((r) => ({
    name: r.name,
    kind: r.kind,
    area: round1((q.totalArea * r.weight) / totalWeight)
  }));
}

// أسماء غرف التقدير السريع (نفس الأسماء يستخدمها الخادم والواجهة لاختيار غرف الجبس بورد)
export function quickRoomNames(q: Omit<QuickInput, "totalArea">): { name: string; kind: RoomKind }[] {
  return buildQuickRooms({ ...q, totalArea: 100 }).map((r) => ({ name: r.name, kind: r.kind }));
}

// مساحة الأسقف المعلقة = مجموع مساحات الغرف التي اختارها المستخدم بالاسم
export function quickCeilingArea(rooms: TakeoffRoom[], roomNames: string[]): number {
  return rooms.filter((r) => roomNames.includes(r.name)).reduce((s, r) => s + r.area, 0);
}

export function quickCostRange(totalArea: number, minPerM2: number, maxPerM2: number) {
  return { min: Math.round(totalArea * minPerM2), max: Math.round(totalArea * maxPerM2) };
}