// محرك حصر الكميات: دوال حسابية بحتة، بدون اتصال بقاعدة البيانات وبدون ذكاء اصطناعي.
// كل رقم في النتيجة له "أساس حساب" مكتوب بجانبه، والـ AI لا يغيّر أي رقم هنا.

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

export interface Coeff {
  value: number;
  fromSettings: boolean; // true = من صفحة الإعدادات، false = قيمة افتراضية
  unit?: string;         // وحدة المعامل كما هي مسجلة في الإعدادات (للعرض في أساس الحساب)
}

export interface TakeoffCoefficients {
  putty: Coeff;
  primer: Coeff;
  finishPaint: Coeff;
  ceramicFloor: Coeff;
  sandFloor: Coeff;
  cementFloor: Coeff;
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

// افتراضات هندسية عامة (غيّرها هنا لو احتجت)
export const ASSUMPTIONS = {
  roomAspectRatio: 1.3,      // نسبة طول الغرفة إلى عرضها لتقدير المحيط من المساحة
  openingsPct: 0.15,         // نسبة الأبواب والشبابيك من مساحة الحوائط
  // قاعدة المحارة المعتمدة: شيكارة الأسمنت (50 كجم) تفرد 5 م² بسمك 2.5 سم، وكل 6 شكاير أسمنت تحتاج 1 م³ رمل
  plasterBagCoverageM2: 5,
  cementBagKg: 50,
  cementBagsPerSandM3: 6,
  doorWidthM: 0.9,           // عرض الباب المخصوم من محيط الغرفة عند حساب الوزرة
  // قاعدة المحارة: لو لا توجد نسبة هالك فالفراغات (أبواب وشبابيك) لا تُخصم، ولو أُضيفت نسبة هالك فالفراغات تُخصم
  plasterWastePct: 0,        // 0 = بدون هالك وبدون خصم فراغات، مثال: 0.1 = هالك 10% مع خصم الفراغات
  defaultCeilingHeight: 3,   // م، لو لم يُحدد في تاب المساحات
  gypsumSheetArea: 2.88,     // م² مساحة لوح الجبس بورد (1.2 × 2.4)
  anglesPerM2: 1.2,          // متر زوايا صاج لكل م² سقف
  omegasPerM2: 1.5,          // متر أوميجا لكل م² سقف
  jointPuttyKgPerM2: 0.25    // كجم معجون فواصل لكل م² سقف
};

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
const round2 = (n: number) => Math.round(n * 100) / 100;

// مساحة الحوائط الكاملة للغرفة: المحيط × الارتفاع
function grossWallArea(roomArea: number, height: number): number {
  const r = ASSUMPTIONS.roomAspectRatio;
  const perimeter = 2 * (1 + r) * Math.sqrt(roomArea / r);
  return perimeter * height;
}

// مساحة الحوائط الصافية للغرفة: (المحيط × الارتفاع) − الأبواب والشبابيك
function netWallArea(roomArea: number, height: number): number {
  return grossWallArea(roomArea, height) * (1 - ASSUMPTIONS.openingsPct);
}

export interface TakeoffInput {
  rooms: TakeoffRoom[];
  state: ApartmentState;
  ceilingHeight: number | null; // null = لم يُحدد
  ceilingArea: number;          // م² الأسقف المعلقة المفعّلة
  coeffs: TakeoffCoefficients;
  declaredTotalArea?: number;   // المساحة الإجمالية المتعاقد عليها للمقارنة
}

export function computeTakeoff(input: TakeoffInput): TakeoffResult {
  const { rooms, state, coeffs } = input;
  const height = input.ceilingHeight ?? ASSUMPTIONS.defaultCeilingHeight;
  const assumptions: string[] = [];
  const warnings: string[] = [];

  const interior = rooms.filter((r) => r.kind !== "balcony" && r.kind !== "garden");
  const floorRooms = rooms.filter((r) => r.kind !== "garden");

  const floorArea = floorRooms.reduce((s, r) => s + r.area, 0);
  const interiorArea = interior.reduce((s, r) => s + r.area, 0);
  const netWalls = interior.reduce((s, r) => s + netWallArea(r.area, height), 0);
  const grossWalls = interior.reduce((s, r) => s + grossWallArea(r.area, height), 0);
  const paintWalls = interior
    .filter((r) => r.kind !== "bathroom")
    .reduce((s, r) => s + netWallArea(r.area, height), 0);

  // المحارة: بدون هالك تُحسب على الحوائط كاملة (الفراغات لا تُخصم)، ومع هالك تُحسب بعد خصم الفراغات
  const plasterWaste = ASSUMPTIONS.plasterWastePct;
  const plasterArea = state === "brick" ? (plasterWaste > 0 ? netWalls : grossWalls) : 0;
  const paintArea = paintWalls + interiorArea; // حوائط (بدون الحمامات) + أسقف الغرف الداخلية
  const ceilingArea = Math.max(0, input.ceilingArea || 0);

  const src = (c: Coeff) => (c.fromSettings ? "من الإعدادات" : "قيمة افتراضية");
  const cv = (c: Coeff) => (c.unit ? `${c.value} ${c.unit}` : `${c.value}`);
  const lines: TakeoffLine[] = [];

  if (state === "brick") {
    // قاعدة المحارة: عدد شكاير الأسمنت = المساحة ÷ 5، والرمل = عدد الشكاير ÷ 6
    // نحسب على المساحة المقرّبة المعروضة لتجنب أخطاء الكسور العشرية (300 ÷ 5 = 60 بالظبط)
    const cementBags = Math.ceil((round1(plasterArea) * (1 + plasterWaste)) / ASSUMPTIONS.plasterBagCoverageM2);
    const cementTons = (cementBags * ASSUMPTIONS.cementBagKg) / 1000;
    const sandM3 = cementBags / ASSUMPTIONS.cementBagsPerSandM3;
    lines.push({
      stage: "أعمال المحارة", item: "أسمنت محارة", unit: "شيكارة",
      quantity: cementBags,
      basis: `مساحة المحارة ${round1(plasterArea)} م² (${plasterWaste > 0 ? `بعد خصم الفراغات مع هالك ${Math.round(plasterWaste * 100)}%` : "حوائط كاملة بدون خصم فراغات وبدون هالك"}) ÷ ${ASSUMPTIONS.plasterBagCoverageM2} م² للشيكارة (سمك 2.5 سم) = ${cementBags} شيكارة، يعني حوالي ${round2(cementTons)} طن (الشيكارة ${ASSUMPTIONS.cementBagKg} كجم)`
    });
    lines.push({
      stage: "أعمال المحارة", item: "رمل محارة", unit: "م³",
      quantity: round1(sandM3),
      basis: `${cementBags} شيكارة أسمنت ÷ ${ASSUMPTIONS.cementBagsPerSandM3} شكاير لكل 1 م³ رمل`
    });
  }

  const paintBasis = (c: Coeff) =>
    `مساحة الدهان ${round1(paintArea)} م² × معامل ${cv(c)} ÷ 3 (${src(c)})`;
  lines.push({
    stage: "المعجون والدهانات", item: "معجون", unit: "كيس",
    quantity: Math.ceil((paintArea * coeffs.putty.value) / 3), basis: paintBasis(coeffs.putty)
  });
  lines.push({
    stage: "المعجون والدهانات", item: "بطانة دهان", unit: "جردل",
    quantity: Math.ceil((paintArea * coeffs.primer.value) / 3), basis: paintBasis(coeffs.primer)
  });
  lines.push({
    stage: "المعجون والدهانات", item: "دهان نهائي", unit: "جردل",
    quantity: Math.ceil((paintArea * coeffs.finishPaint.value) / 3), basis: paintBasis(coeffs.finishPaint)
  });

  const floorBasis = (c: Coeff) => `مساحة الأرضيات ${round1(floorArea)} م² × معامل ${cv(c)} (${src(c)})`;
  lines.push({
    stage: "الأرضيات", item: "سيراميك أرضيات", unit: "م²",
    quantity: Math.ceil(floorArea * coeffs.ceramicFloor.value), basis: floorBasis(coeffs.ceramicFloor)
  });
  // الوزرة بالمتر الطولي = محيط الغرف (بدون الحمامات لأن حوائطها مكسية) − عرض باب لكل غرفة
  const dryRooms = interior.filter((r) => r.kind !== "bathroom");
  const dryPerimeter = dryRooms.reduce(
    (s, r) => s + 2 * (1 + ASSUMPTIONS.roomAspectRatio) * Math.sqrt(r.area / ASSUMPTIONS.roomAspectRatio),
    0
  );
  const baseboardLength = Math.max(0, dryPerimeter - dryRooms.length * ASSUMPTIONS.doorWidthM);
  lines.push({
    stage: "الأرضيات", item: "وزرة", unit: "متر",
    quantity: Math.ceil(baseboardLength),
    basis: `محيط ${dryRooms.length} غرفة (بدون الحمامات) ${round1(dryPerimeter)} م − ${ASSUMPTIONS.doorWidthM} م لباب كل غرفة (بدون هالك)`
  });
  lines.push({
    stage: "الأرضيات", item: "رمل ردم", unit: "م³",
    quantity: round1(floorArea * coeffs.sandFloor.value), basis: floorBasis(coeffs.sandFloor)
  });
  lines.push({
    stage: "الأرضيات", item: "أسمنت تركيب", unit: "كيس",
    quantity: Math.ceil(floorArea * coeffs.cementFloor.value), basis: floorBasis(coeffs.cementFloor)
  });

  if (ceilingArea > 0) {
    const cb = `مساحة الأسقف المعلقة ${round1(ceilingArea)} م²`;
    lines.push({
      stage: "الأسقف المعلقة (جبس بورد)", item: "ألواح جبس بورد", unit: "لوح",
      quantity: Math.ceil(ceilingArea / ASSUMPTIONS.gypsumSheetArea),
      basis: `${cb} ÷ ${ASSUMPTIONS.gypsumSheetArea} م² للوح`
    });
    lines.push({
      stage: "الأسقف المعلقة (جبس بورد)", item: "زوايا صاج", unit: "متر",
      quantity: Math.ceil(ceilingArea * ASSUMPTIONS.anglesPerM2),
      basis: `${cb} × ${ASSUMPTIONS.anglesPerM2} متر لكل م²`
    });
    lines.push({
      stage: "الأسقف المعلقة (جبس بورد)", item: "أوميجا صاج", unit: "متر",
      quantity: Math.ceil(ceilingArea * ASSUMPTIONS.omegasPerM2),
      basis: `${cb} × ${ASSUMPTIONS.omegasPerM2} متر لكل م²`
    });
    lines.push({
      stage: "الأسقف المعلقة (جبس بورد)", item: "معجون فواصل جبس", unit: "كجم",
      quantity: round1(ceilingArea * ASSUMPTIONS.jointPuttyKgPerM2),
      basis: `${cb} × ${ASSUMPTIONS.jointPuttyKgPerM2} كجم لكل م²`
    });
  }

  // الافتراضات المعروضة للمستخدم
  assumptions.push(
    state === "brick"
      ? "الشقة على الطوب الأحمر: تم احتساب أعمال المحارة للحوائط الداخلية."
      : "الشقة على المحارة: لم تُحتسب أعمال المحارة."
  );
  assumptions.push(
    input.ceilingHeight === null
      ? `ارتفاع السقف ${height} م (القيمة الافتراضية، لم يُحدد في تاب المساحات).`
      : `ارتفاع السقف ${height} م للشقة كلها.`
  );
  assumptions.push(
    `مساحة الحوائط = محيط كل غرفة × الارتفاع. ` + (plasterWaste > 0 ? "" : `للدهان يُخصم ${Math.round(ASSUMPTIONS.openingsPct * 100)}% للأبواب والشبابيك، وللمحارة لا يُخصم شيء لأنها بدون نسبة هالك. `) +
    `المحيط مقدّر من مساحة الغرفة بافتراض نسبة طول/عرض ${ASSUMPTIONS.roomAspectRatio}.`
  );
  assumptions.push("حوائط الحمامات مكسية بالكامل بالسيراميك فلا تدخل في الدهان (تدخل في المحارة).");
  assumptions.push("الوزرة تُحسب من محيط الغرف (بدون الحمامات) بعد خصم عرض باب لكل غرفة، وليس بمعامل.");
  if (state === "brick") {
    assumptions.push("المحارة: شيكارة الأسمنت (50 كجم) تفرد 5 م² بسمك 2.5 سم، وكل 6 شكاير أسمنت تحتاج 1 م³ رمل.");
  }
  assumptions.push("الدهان يشمل حوائط الغرف الداخلية وأسقفها. البلكونات والحديقة خارج حساب الحوائط والدهان.");
  assumptions.push("تكسيات الحوائط (سيراميك الحمامات والمطبخ) غير داخلة في هذا الحصر.");
  if (ceilingArea > 0) {
    assumptions.push("خامات الجبس بورد محسوبة بمعاملات ثابتة في المحرك، ولا تختلف حسب نوع السقف.");
  } else {
    assumptions.push("لا توجد أسقف معلقة (جبس بورد) محددة، فلم تُحتسب خاماتها.");
  }

  // تحذيرات المراجعة
  const defaults = Object.entries(coeffs)
    .filter(([, c]) => !(c as Coeff).fromSettings)
    .map(([k]) => k);
  if (defaults.length > 0) {
    warnings.push(
      `بعض المعاملات لم تُضبط في الإعدادات وتم استخدام قيمة افتراضية لها (${defaults.length} من ${Object.keys(coeffs).length}).`
    );
  }
  if (input.declaredTotalArea && input.declaredTotalArea > 0) {
    const diff = Math.abs(floorArea - input.declaredTotalArea) / input.declaredTotalArea;
    if (diff > 0.1) {
      warnings.push(
        `مجموع مساحات الغرف المسجلة (${round1(floorArea)} م²) يختلف عن المساحة الإجمالية للمشروع (${round1(input.declaredTotalArea)} م²) بأكثر من 10%.`
      );
    }
  }
  if (ceilingArea > interiorArea && interiorArea > 0) {
    warnings.push(
      `مساحة الأسقف المعلقة (${round1(ceilingArea)} م²) أكبر من مساحة الغرف الداخلية (${round1(interiorArea)} م²).`
    );
  }

  return {
    rooms,
    lines,
    assumptions,
    warnings,
    totals: {
      floorArea: round1(floorArea),
      netWallArea: round1(netWalls),
      plasterArea: round1(plasterArea),
      paintArea: round1(paintArea),
      ceilingArea: round1(ceilingArea)
    }
  };
}

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