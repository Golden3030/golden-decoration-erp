// محاكي القص (الوحدة 3): قص بلاط/سيراميك على أسطح مستطيلة بمحاكاة حقيقية بدل نسبة هالك ثابتة.
// دوال بحتة بدون قاعدة بيانات. كل الأطوال بالمللي (أعداد صحيحة) لتفادي أخطاء الكسور.
//
// طريقة المحاكاة (محددة، نفس المدخلات تدّي نفس النتيجة):
// 1) تقسيم السطح لشبكة بلاط (مقاس البلاطة + عرض الفوغة)، والبلاط الكامل بيتعد.
// 2) القطع الطرفية (آخر عمود وآخر صف) هي القطع المطلوب قصها.
// 3) القطع بتتعالج من الأكبر للأصغر. كل قطعة بتدوّر الأول على أصغر قصاصة تكفيها (مع إمكانية التدوير 90 درجة)،
//    ولو مفيش بتفتح بلاطة جديدة. الباقي من القصاصة/البلاطة بينقسم لقطعتين (قص مستقيم)، والصالح منه (>= أقل قصاصة) بيدخل مخزون القصاصات.
// 4) الهالك = المشترى ناقص المركّب فعلياً (ناتج المحاكاة، مش نسبة ثابتة).

export interface TileSpec {
  widthCm: number;          // عرض البلاطة
  lengthCm: number;         // طول البلاطة
  groutMm: number;          // عرض الفوغة
  piecesPerBox?: number;    // عدد البلاط في الصندوق (اختياري لحساب الصناديق)
  minOffcutCm: number;      // أقل بعد للقصاصة الصالحة لإعادة الاستخدام
  reuseOffcuts: boolean;    // إعادة استخدام القصاصات (يتقفل مع البلاط المعرّق/الموجّه)
  allowRotate: boolean;     // يسمح بتدوير القصاصة 90 درجة عند الاستخدام
}

export interface SurfaceInput {
  name: string;
  widthM: number;           // البعد الأفقي (محور x)
  lengthM: number;          // البعد الرأسي (محور y)
}

export type CellKind = "full" | "cut_new" | "cut_reuse";

export interface Cell {
  x: number; y: number; w: number; h: number; // مللي
  kind: CellKind;
}

export type Orientation = "along_length" | "along_width" | "auto";

export interface SurfaceResult {
  name: string;
  widthMm: number;
  lengthMm: number;
  netAreaM2: number;
  fullTiles: number;
  cutPieces: number;
  reusedPieces: number;
  cells: Cell[];
}

export interface TilingTotals {
  fullTiles: number;
  cutPieces: number;
  reusedPieces: number;
  openedTiles: number;      // بلاط اتفتح عشان يتقص
  totalTiles: number;       // اللي هيتشترى
  boxes: number | null;
  netAreaM2: number;        // مساحة الأسطح
  purchasedM2: number;      // مساحة البلاط المشترى
  placedM2: number;         // مساحة البلاط المركّب فعلياً
  wasteM2: number;          // المشترى - المركّب
  wastePct: number;         // الهالك من المشترى
  overNetPct: number;       // الزيادة على مساحة الأسطح
  usableLeftovers: number;  // عدد قصاصات صالحة فاضلت
}

export interface TilingResult {
  orientation: "along_length" | "along_width";
  surfaces: SurfaceResult[];
  totals: TilingTotals;
  warnings: string[];
}

interface Rect { w: number; h: number }

const EPS = 0.5; // نص مللي

const mm = (cm: number) => Math.round(cm * 10);

function simulate(tile: TileSpec, surfaces: SurfaceInput[], rotated: boolean): TilingResult {
  const TW = rotated ? mm(tile.lengthCm) : mm(tile.widthCm);
  const TL = rotated ? mm(tile.widthCm) : mm(tile.lengthCm);
  const G = Math.max(0, Math.round(tile.groutMm));
  const minOff = mm(tile.minOffcutCm);
  const warnings: string[] = [];

  let pool: Rect[] = [];
  let openedTiles = 0;
  let totalFull = 0;
  let totalCuts = 0;
  let totalReused = 0;
  let placedMm2 = 0;
  let netMm2 = 0;
  const surfaceResults: SurfaceResult[] = [];
  const slivers: string[] = [];

  const sliverMm = 50; // قطعة أضيق من 5 سم: شكلها وتركيبها وحش

  for (const s of surfaces) {
    const SW = Math.round(s.widthM * 1000);
    const SL = Math.round(s.lengthM * 1000);
    if (SW <= 0 || SL <= 0) continue;

    const xs: { x: number; w: number }[] = [];
    for (let x = 0; x < SW - EPS; x += TW + G) xs.push({ x, w: Math.min(TW, SW - x) });
    const ys: { y: number; h: number }[] = [];
    for (let y = 0; y < SL - EPS; y += TL + G) ys.push({ y, h: Math.min(TL, SL - y) });

    const cells: Cell[] = [];
    const pending: { x: number; y: number; w: number; h: number }[] = [];
    let full = 0;
    for (const cy of ys) {
      for (const cx of xs) {
        if (cx.w === TW && cy.h === TL) {
          cells.push({ x: cx.x, y: cy.y, w: cx.w, h: cy.h, kind: "full" });
          full++;
        } else {
          pending.push({ x: cx.x, y: cy.y, w: cx.w, h: cy.h });
        }
      }
    }

    // القطع من الأكبر للأصغر (ترتيب ثابت: المساحة تنازلياً ثم المكان)
    pending.sort((a, b) => b.w * b.h - a.w * a.h || a.y - b.y || a.x - b.x);

    let reused = 0;
    for (const p of pending) {
      let bestIdx = -1;
      let bestArea = Infinity;
      let bestRot = false;
      if (tile.reuseOffcuts) {
        pool.forEach((o, i) => {
          const area = o.w * o.h;
          if (o.w >= p.w && o.h >= p.h && area < bestArea) { bestIdx = i; bestArea = area; bestRot = false; }
          else if (tile.allowRotate && o.w >= p.h && o.h >= p.w && area < bestArea) { bestIdx = i; bestArea = area; bestRot = true; }
        });
      }
      let source: Rect;
      let kind: CellKind;
      if (bestIdx >= 0) {
        source = pool[bestIdx];
        pool = pool.filter((_, i) => i !== bestIdx);
        kind = "cut_reuse";
        reused++;
      } else {
        source = { w: TW, h: TL };
        openedTiles++;
        kind = "cut_new";
        bestRot = false;
      }
      const pw = bestRot ? p.h : p.w;
      const ph = bestRot ? p.w : p.h;
      // قص مستقيم: نختار التقسيم اللي يطلع أكبر قصاصة متبقية
      const a1 = { w: source.w - pw, h: source.h };      // شريط جانبي بطول الارتفاع كله
      const a2 = { w: pw, h: source.h - ph };            // الباقي فوق القطعة
      const b1 = { w: source.w - pw, h: ph };            // شريط جانبي بارتفاع القطعة
      const b2 = { w: source.w, h: source.h - ph };      // الباقي فوق بالعرض كله
      const maxA = Math.max(a1.w * a1.h, a2.w * a2.h);
      const maxB = Math.max(b1.w * b1.h, b2.w * b2.h);
      const leftovers = maxA >= maxB ? [a1, a2] : [b1, b2];
      for (const lo of leftovers) {
        if (tile.reuseOffcuts && lo.w >= minOff && lo.h >= minOff && lo.w > 0 && lo.h > 0) pool.push(lo);
      }
      cells.push({ x: p.x, y: p.y, w: p.w, h: p.h, kind });
      placedMm2 += p.w * p.h;
      if (Math.min(p.w, p.h) < sliverMm) slivers.push(s.name);
    }

    placedMm2 += full * TW * TL;
    totalFull += full;
    totalCuts += pending.length;
    totalReused += reused;
    netMm2 += SW * SL;
    surfaceResults.push({
      name: s.name, widthMm: SW, lengthMm: SL, netAreaM2: (SW * SL) / 1e6,
      fullTiles: full, cutPieces: pending.length, reusedPieces: reused, cells
    });
  }

  if (slivers.length > 0) {
    warnings.push(`قطع ضيقة (أقل من 5 سم) في: ${Array.from(new Set(slivers)).join("، ")}. التقسيم بيبدأ من ركن واحد، فغيّر اتجاه التركيب أو وزّع القص على الجانبين.`);
  }
  const totalTiles = totalFull + openedTiles;
  const tileM2 = (TW * TL) / 1e6;
  const purchasedM2 = totalTiles * tileM2;
  const placedM2 = placedMm2 / 1e6;
  const netAreaM2 = netMm2 / 1e6;
  return {
    orientation: rotated ? "along_width" : "along_length",
    surfaces: surfaceResults,
    totals: {
      fullTiles: totalFull,
      cutPieces: totalCuts,
      reusedPieces: totalReused,
      openedTiles,
      totalTiles,
      boxes: tile.piecesPerBox && tile.piecesPerBox > 0 ? Math.ceil(totalTiles / tile.piecesPerBox) : null,
      netAreaM2,
      purchasedM2,
      placedM2,
      wasteM2: purchasedM2 - placedM2,
      wastePct: purchasedM2 > 0 ? ((purchasedM2 - placedM2) / purchasedM2) * 100 : 0,
      overNetPct: netAreaM2 > 0 ? ((purchasedM2 - netAreaM2) / netAreaM2) * 100 : 0,
      usableLeftovers: pool.length
    },
    warnings
  };
}

export function simulateTiling(tile: TileSpec, surfaces: SurfaceInput[], orientation: Orientation = "auto"): TilingResult {
  if (!(tile.widthCm > 0) || !(tile.lengthCm > 0)) {
    return { orientation: "along_length", surfaces: [], totals: emptyTotals(), warnings: ["مقاس البلاطة غير صحيح."] };
  }
  if (orientation === "along_length") return simulate(tile, surfaces, false);
  if (orientation === "along_width") return simulate(tile, surfaces, true);
  const a = simulate(tile, surfaces, false);
  const b = simulate(tile, surfaces, true);
  // الاتجاه الأوفر في عدد البلاط، ولو متساويين الأقل قص
  if (b.totals.totalTiles < a.totals.totalTiles) return b;
  if (b.totals.totalTiles === a.totals.totalTiles && b.totals.cutPieces < a.totals.cutPieces) return b;
  return a;
}

function emptyTotals(): TilingTotals {
  return {
    fullTiles: 0, cutPieces: 0, reusedPieces: 0, openedTiles: 0, totalTiles: 0, boxes: null, netAreaM2: 0,
    purchasedM2: 0, placedM2: 0, wasteM2: 0, wastePct: 0, overNetPct: 0, usableLeftovers: 0
  };
}