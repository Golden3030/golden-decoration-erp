// حاسبة مباني التعديلات المعمارية (قواطيع جديدة وفتحات أبواب وديكورات مبنية) داخل الشقق، مش مباني أدوار.
// المعدلات الافتراضية من وصف المستخدم (لكل 1 م² مباني سمك 12 سم بعد خصم الفتحات):
//   طوب مفرغ 25×12×6: 55 إلى 60 (شامل هالك 5%)، دوبل 25×12×12: 28 إلى 30، أسمنت 10 إلى 12 كجم، رمل 0.03 م³.
// أصول الصنعة: أشاير حديد كل 3 إلى 4 مداميك (40 إلى 50 سم) في الحيطة القديمة، أعتاب بتركيب 15 إلى 20 سم من كل جنب،
// فراغ 2 إلى 3 سم تحت السقف، وشبك فايبر 20 سم على الفاصل بين الجديد والقديم، وطوب مصمت في أول 3 مداميك بالحمامات والمطابخ وحوالين حلوق الأبواب.
// دوال بحتة، الأطوال بالمتر.

export type HollowKind = "single" | "double"; // 25×12×6 أو دوبل 25×12×12

export interface WallInput {
  name: string;
  lengthM: number;
  heightM: number;
  wet: boolean;             // حمام أو مطبخ: أول 3 مداميك طوب مصمت
  doors: number;
  doorWM: number;
  doorHM: number;
  windows: number;
  windowWM: number;
  windowHM: number;
  oldWallJunctions: number; // عدد الجنبات اللي بتلتقي بحيطة قديمة (0 إلى 2): أشاير وفايبر
  toCeiling: boolean;       // بتوصل للسقف: فراغ تشحيط وفايبر
}

export interface MasonryParams {
  brick: HollowKind;
  hollowSinglePerM2: number;   // 25×12×6 (شامل الهالك)
  hollowDoublePerM2: number;   // 25×12×12
  cementKgPerM2: number;
  cementBagKg: number;         // الشكارة 50 كجم
  sandM3PerM2: number;
  solidCourses: number;        // مداميك الطوب المصمت في الحمامات والمطابخ (3)
  courseHeightCm: number;      // ارتفاع المدماك بالمونة (6 + 1)
  jambSolidPerCourse: number;  // طوب مصمت على كل جنب من حلق الباب في كل مدماك (على الأقل 1)
  dowelLengthCm: number;       // طول الأشيرة (30)
  dowelSpacingCm: number;      // تباعد الأشاير على الارتفاع (40 إلى 50)
  rebarBarM: number;           // طول سيخ الحديد (12)
  lintelBearingCm: number;     // تركيب العتب على كل جنب (15 إلى 20)
}

export interface WallResult {
  name: string;
  netAreaM2: number;
  solidAreaM2: number;
  hollowAreaM2: number;
  solidBricks: number;
  hollowBricks: number;
  dowels: number;
  lintels: { lengthM: number }[];
  ceilingGapM: number;
  fiberM: number;
}

export interface MasonryResult {
  walls: WallResult[];
  brickLabel: string;
  netAreaM2: number;
  hollowBricks: number;
  solidBricks: number;
  totalBricks: number;       // الإجمالي (لمصنعية الألف طوبة)
  cementKg: number;
  cementBags: number;
  sandM3: number;
  dowels: number;
  rebarBars: number;
  anchorHoles: number;       // ثقوب تثبيت الأشاير بالكيمابوكسي
  lintels: number;
  lintelLengthM: number;     // مجموع أطوال الأعتاب
  ceilingGapM: number;
  fiberM: number;
  assumptions: string[];
  warnings: string[];
}

const BRICK_PITCH_M = 0.26; // طول الطوبة 25 + فاصل 1 سم

export function computeMasonryMods(walls: WallInput[], p: MasonryParams): MasonryResult {
  const warnings: string[] = [];
  const courseH = p.courseHeightCm / 100;
  const hollowRate = p.brick === "single" ? p.hollowSinglePerM2 : p.hollowDoublePerM2;
  const results: WallResult[] = [];
  let hollowExact = 0, solidExact = 0, netTotal = 0;
  let dowels = 0, lintelCount = 0, lintelLen = 0, gap = 0, fiber = 0;

  for (const w of walls) {
    if (!(w.lengthM > 0) || !(w.heightM > 0)) continue;
    const openings = w.doors * w.doorWM * w.doorHM + w.windows * w.windowWM * w.windowHM;
    const net = Math.max(0, w.lengthM * w.heightM - openings);
    if (w.lengthM * w.heightM - openings < 0) warnings.push(`فتحات ${w.name} أكبر من مساحة الحيطة.`);

    // الطوب المصمت: أول مداميك الحمامات والمطابخ (على طول الحيطة بدون عرض الأبواب)، وحوالين حلوق الأبواب
    const wetCourses = w.wet ? p.solidCourses : 0;
    const wetRun = Math.max(0, w.lengthM - w.doors * w.doorWM);
    const wetArea = wetCourses * courseH * wetRun;
    // مداميك الحلق = ارتفاع الباب ÷ ارتفاع المدماك لأعلى، ناقص اللي في المداميك المصمتة أصلاً
    const doorCourses = w.doors > 0 ? Math.ceil((w.doorHM * 100) / p.courseHeightCm - 1e-9) : 0;
    const jambCourses = Math.max(0, doorCourses - wetCourses);
    const jambArea = w.doors * 2 * p.jambSolidPerCourse * BRICK_PITCH_M * jambCourses * courseH;
    const solidArea = Math.min(net, wetArea + jambArea);
    const hollowArea = Math.max(0, net - solidArea);

    const solidBricks = solidArea * p.hollowSinglePerM2; // الطوب المصمت 25×12×6 بنفس معدل الطوب المفرغ العادي
    const hollowBricks = hollowArea * hollowRate;

    const wallDowels = Math.max(0, Math.min(2, w.oldWallJunctions)) * Math.ceil((w.heightM * 100) / p.dowelSpacingCm - 1e-9);
    const lintels = [
      ...Array.from({ length: w.doors }, () => ({ lengthM: w.doorWM + 2 * (p.lintelBearingCm / 100) })),
      ...Array.from({ length: w.windows }, () => ({ lengthM: w.windowWM + 2 * (p.lintelBearingCm / 100) }))
    ];
    const ceilingGapM = w.toCeiling ? w.lengthM : 0;
    const fiberM = Math.max(0, Math.min(2, w.oldWallJunctions)) * w.heightM + ceilingGapM;

    results.push({
      name: w.name, netAreaM2: net, solidAreaM2: solidArea, hollowAreaM2: hollowArea,
      solidBricks: Math.ceil(solidBricks - 1e-9), hollowBricks: Math.ceil(hollowBricks - 1e-9),
      dowels: wallDowels, lintels, ceilingGapM, fiberM
    });
    netTotal += net; solidExact += solidBricks; hollowExact += hollowBricks;
    dowels += wallDowels; lintelCount += lintels.length; lintelLen += lintels.reduce((s, l) => s + l.lengthM, 0);
    gap += ceilingGapM; fiber += fiberM;
  }

  const cementKg = netTotal * p.cementKgPerM2;
  const dowelsPerBar = Math.max(1, Math.floor((p.rebarBarM * 100) / p.dowelLengthCm + 1e-9));
  const hollowBricks = Math.ceil(hollowExact - 1e-9);
  const solidBricks = Math.ceil(solidExact - 1e-9);

  if (results.length === 0) warnings.push("أضف حيطة واحدة على الأقل بطولها وارتفاعها.");

  const assumptions = [
    `الطوب ${p.brick === "single" ? "المفرغ 25×12×6" : "الدوبل 25×12×12"}: ${hollowRate} لكل م² (شامل الهالك). الطوب المصمت 25×12×6 بمعدل ${p.hollowSinglePerM2} لكل م².`,
    `الأسمنت ${p.cementKgPerM2} كجم لكل م² (الشكارة ${p.cementBagKg} كجم)، والرمل ${p.sandM3PerM2} م³ لكل م²، على مساحة المباني بعد خصم الفتحات.`,
    `طوب مصمت: أول ${p.solidCourses} مداميك في الحمامات والمطابخ، وحوالين حلوق الأبواب ${p.jambSolidPerCourse} طوبة على كل جنب في كل مدماك (ارتفاع المدماك ${p.courseHeightCm} سم).`,
    `أشاير حديد طول ${p.dowelLengthCm} سم كل ${p.dowelSpacingCm} سم ارتفاع على كل جنب بيلتقي بحيطة قديمة، وبتتثبت بالكيمابوكسي.`,
    `أعتاب لكل باب وشباك بتركيب ${p.lintelBearingCm} سم من كل جنب.`,
    "فراغ تشحيط تحت السقف (2 إلى 3 سم) بطول الحيطة، وشبك فايبر عرض 20 سم على الفاصل (الجنبات الرأسية + تحت السقف).",
    "الطوب الأبيض الخفيف (الخلوي) غير محسوب لأن معدلاته غير مدخلة.",
    "مجاميع الطوب بتتحسب من الأرقام قبل التقريب، فممكن تفرق طوبة أو اتنين عن جمع أرقام الحيطان."
  ];

  return {
    walls: results,
    brickLabel: p.brick === "single" ? "طوب مفرغ 25×12×6" : "طوب دوبل 25×12×12",
    netAreaM2: netTotal,
    hollowBricks, solidBricks, totalBricks: hollowBricks + solidBricks,
    cementKg, cementBags: cementKg > 0 ? Math.ceil(cementKg / p.cementBagKg - 1e-9) : 0,
    sandM3: netTotal * p.sandM3PerM2,
    dowels, rebarBars: dowels > 0 ? Math.ceil(dowels / dowelsPerBar - 1e-9) : 0, anchorHoles: dowels,
    lintels: lintelCount, lintelLengthM: lintelLen, ceilingGapM: gap, fiberM: fiber,
    assumptions, warnings
  };
}

export const DEFAULT_MASONRY_PARAMS: MasonryParams = {
  brick: "single", hollowSinglePerM2: 57.5, hollowDoublePerM2: 29, cementKgPerM2: 11, cementBagKg: 50, sandM3PerM2: 0.03,
  solidCourses: 3, courseHeightCm: 7, jambSolidPerCourse: 1, dowelLengthCm: 30, dowelSpacingCm: 45, rebarBarM: 12, lintelBearingCm: 20
};