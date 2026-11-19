// حصر المشروع المسجل: يشتق المساحات الهندسية من بيانات الغرف الفعلية (تاب المساحات وتاب الأسقف)
// ثم يحسب الكميات والتكاليف بنفس محرك الحصر الفني (bomEngine) ونفس جداول المعاملات والأسعار والمصنعيات
// المستخدمة في المحاكي والتقدير السريع والمقايسة المبدئية. دوال بحتة بدون اتصال بقاعدة البيانات.
// لا يخمّن: لو بيانات أساسية ناقصة يرجع blockers ويقف.

import {
  computeBom,
  sumTotals,
  BOM_FINAL_NOTE,
  type BomGroup,
  type BomItem,
  type BomMaterial,
  type BomResult,
  type BomRoomFactor,
  type DerivedAreas,
  type LaborConfig,
  type PlumbingInstall,
  type SimInput
} from "@/lib/bomEngine";
import type { ApartmentState, RoomKind } from "@/lib/takeoffEngine";

// افتراضات هندسية (غيّرها هنا لو احتجت)
export const PROJECT_ASSUMPTIONS = {
  roomAspectRatio: 1.3, // نسبة طول الغرفة إلى عرضها لتقدير المحيط من المساحة (مفيش أطوال حيطان مسجلة)
  openingsPct: 0.15,    // نسبة الأبواب والشبابيك من مساحة الحوائط (تُخصم فقط لو فيه نسبة هالك)
  doorWidthM: 0.9       // عرض الباب المخصوم من محيط الغرفة عند حساب الوزرة
};

export interface ProjectRoom {
  name: string;
  kind: RoomKind;
  area: number; // م²
}

export interface CeilingSpace {
  name: string;
  area: number; // م² الغرفة المفعّلة في تاب الأسقف
}

export interface ProjectBomInput {
  rooms: ProjectRoom[];
  state: ApartmentState | null;       // null = لم تُحدد
  ceilingHeight: number | null;       // null = لم يُحدد
  ceilingSpaces: CeilingSpace[];      // الأسقف المعلقة (جبس بورد) المفعّلة
  declaredTotalArea?: number;         // المساحة الإجمالية المسجلة للمشروع
  plumbingInstall?: PlumbingInstall;  // دفن أو عادي
  wastePct?: number;                  // 0 = بدون هالك وبدون خصم فراغات (القاعدة المعتمدة)، > 0 = هالك مع خصم الفراغات
}

export interface RoomDetail {
  name: string;
  kind: RoomKind;
  area: number;
  perimeter: number;
  grossWalls: number;
}

export interface ProjectAreasResult {
  ok: boolean;
  blockers: string[];   // لو غير فاضية: ما نحسبش
  warnings: string[];
  assumptions: string[];
  areas: DerivedAreas | null;
  gypsum: { area: number; perimeter: number };
  counts: { bedrooms: number; bathrooms: number; kitchens: number; receptions: number };
  rooms: RoomDetail[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

// محيط غرفة من مساحتها بنسبة طول/عرض ثابتة (تقدير، لأن أطوال الحيطان غير مسجلة)
export function perimeterFromArea(area: number): number {
  const r = PROJECT_ASSUMPTIONS.roomAspectRatio;
  return 2 * (1 + r) * Math.sqrt(Math.max(0, area) / r);
}

export function deriveProjectAreas(input: ProjectBomInput): ProjectAreasResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const assumptions: string[] = [];
  const rooms = (input.rooms || []).filter((r) => Number.isFinite(r.area) && r.area > 0);

  if (rooms.length === 0) blockers.push("لم تُسجَّل مساحات الغرف لهذا المشروع. سجّلها أولاً في تاب المساحات.");
  if (input.state !== "brick" && input.state !== "plastered") {
    blockers.push("حدد حالة الشقة (على الطوب الأحمر أو على المحارة) في تاب المساحات.");
  }
  const h = Number(input.ceilingHeight);
  if (!(h > 0)) blockers.push("حدد ارتفاع السقف في تاب المساحات (قيمة واحدة للشقة كلها).");

  const empty = {
    ok: false, blockers, warnings, assumptions, areas: null, gypsum: { area: 0, perimeter: 0 },
    counts: { bedrooms: 0, bathrooms: 0, kitchens: 0, receptions: 0 }, rooms: []
  };
  if (blockers.length > 0) return empty;

  const waste = Math.max(0, Number(input.wastePct) || 0);
  const wallFactor = waste > 0 ? 1 - PROJECT_ASSUMPTIONS.openingsPct : 1;

  const interior = rooms.filter((r) => r.kind !== "balcony" && r.kind !== "garden");
  const floorRooms = rooms.filter((r) => r.kind !== "garden");
  const dry = interior.filter((r) => r.kind !== "bathroom");
  const tiled = interior.filter((r) => r.kind === "bathroom" || r.kind === "kitchen");
  const painted = interior.filter((r) => r.kind !== "bathroom" && r.kind !== "kitchen");
  const wet = rooms.filter((r) => r.kind === "bathroom" || r.kind === "kitchen" || r.kind === "balcony");

  const detail: RoomDetail[] = rooms.map((r) => {
    const p = perimeterFromArea(r.area);
    return { name: r.name, kind: r.kind, area: round2(r.area), perimeter: round2(p), grossWalls: round2(p * h) };
  });
  const byName = (r: ProjectRoom) => detail.find((d) => d.name === r.name)!;
  const sumWalls = (list: ProjectRoom[]) => list.reduce((s, r) => s + byName(r).grossWalls, 0) * wallFactor;

  const interiorArea = interior.reduce((s, r) => s + r.area, 0);
  const floorArea = floorRooms.reduce((s, r) => s + r.area, 0);

  // المحارة: حوائط كل الغرف الداخلية (بما فيها الحمامات والمطبخ لأن السيراميك بيتركب على المحارة)
  const wallArea = sumWalls(interior);
  // سيراميك الحوائط: حمامات ومطابخ لحد ارتفاع السقف
  const wallTileArea = sumWalls(tiled);
  // الدهان: حوائط الغرف غير المكسية بالسيراميك + أسقف كل الغرف الداخلية
  const paintArea = sumWalls(painted) + interiorArea;
  // الوزرة: محيط الغرف الجافة (بدون الحمامات) ناقص باب لكل غرفة
  const baseboard = Math.max(0, dry.reduce((s, r) => s + byName(r).perimeter, 0) - dry.length * PROJECT_ASSUMPTIONS.doorWidthM);
  // العزل: أرضية الحمامات والمطابخ والبلكونات
  const waterproofArea = wet.reduce((s, r) => s + r.area, 0);

  // الجبس بورد: الغرف المفعّلة في تاب الأسقف فقط
  const spaces = (input.ceilingSpaces || []).filter((c) => Number.isFinite(c.area) && c.area > 0);
  const gypsumArea = spaces.reduce((s, c) => s + c.area, 0);
  const gypsumPerimeter = spaces.reduce((s, c) => s + perimeterFromArea(c.area), 0);

  const declared = Number(input.declaredTotalArea) || 0;
  const apartmentArea = declared > 0 ? declared : floorArea;

  const counts = {
    bedrooms: rooms.filter((r) => r.kind === "bedroom").length,
    bathrooms: rooms.filter((r) => r.kind === "bathroom").length,
    kitchens: rooms.filter((r) => r.kind === "kitchen").length,
    receptions: rooms.filter((r) => r.kind === "reception" || r.kind === "living").length
  };

  const areas: DerivedAreas = {
    wall_area: round2(wallArea),
    ceiling_area: round2(interiorArea),
    perimeter_ml: round2(baseboard),
    floor_area: round2(floorArea),
    wall_tile_area: round2(wallTileArea),
    waterproof_area: round2(waterproofArea),
    apartment_area: round2(apartmentArea),
    paint_area: round2(paintArea),
    masonry_area: 0
  };

  // ---------- التحذيرات (مفيش تخمين: كل نقص بيتكتب) ----------
  if (declared > 0) {
    const diff = Math.abs(floorArea - declared) / declared;
    if (diff > 0.1) {
      warnings.push(`مجموع مساحات الغرف المسجلة (${round1(floorArea)} م²) يختلف عن المساحة الإجمالية للمشروع (${round1(declared)} م²) بأكثر من 10%.`);
    }
  } else {
    warnings.push("المساحة الإجمالية للمشروع غير مسجلة، فاستُخدم مجموع مساحات الغرف كمساحة للشقة (تؤثر على مصنعيات البنود المحسوبة على مساحة الشقة).");
  }
  if (counts.bathrooms === 0) warnings.push("لا يوجد حمام ضمن الغرف المسجلة، فلن تُحسب مصنعية السباكة ولا علب وسباكة الحمامات.");
  if (counts.kitchens === 0) warnings.push("لا يوجد مطبخ ضمن الغرف المسجلة.");
  const unclassified = rooms.filter((r) => r.kind === "other").map((r) => r.name);
  if (unclassified.length > 0) {
    warnings.push(`غرف لم يُعرف نوعها من الاسم (${unclassified.join("، ")}): عوملت كغرف جافة داخلية (حوائط ودهان ووزرة وأرضية). غيّر اسم الغرفة لو غير ذلك.`);
  }
  if (gypsumArea > interiorArea + 0.01) {
    warnings.push(`مساحة الأسقف المعلقة (${round1(gypsumArea)} م²) أكبر من مساحة الغرف الداخلية (${round1(interiorArea)} م²).`);
  }
  if (gypsumArea === 0) assumptions.push("لا توجد أسقف جبس بورد مفعّلة في تاب الأسقف، فلم تُحتسب خاماتها (الأسقف تُدهن كلها).");

  // ---------- الافتراضات المعروضة ----------
  assumptions.push(input.state === "brick" ? "الشقة على الطوب الأحمر: أعمال المحارة محسوبة." : "الشقة على المحارة: أعمال المحارة غير محسوبة.");
  assumptions.push(`ارتفاع السقف ${h} م للشقة كلها.`);
  assumptions.push(
    `الحوائط = محيط كل غرفة × الارتفاع. ` +
      (waste > 0
        ? `مع نسبة هالك ${Math.round(waste * 100)}% تُخصم الفراغات (${Math.round(PROJECT_ASSUMPTIONS.openingsPct * 100)}% للأبواب والشبابيك). `
        : "بدون نسبة هالك فلا تُخصم الفراغات (الأبواب والشبابيك). ") +
      `المحيط مقدّر من مساحة الغرفة بنسبة طول/عرض ${PROJECT_ASSUMPTIONS.roomAspectRatio} لأن أطوال الحيطان غير مسجلة.`
  );
  assumptions.push("المحارة تشمل حوائط الحمامات والمطابخ (السيراميك يتركب على المحارة). البلكونات والحديقة خارج الحوائط.");
  assumptions.push("سيراميك الحوائط: حوائط الحمامات والمطابخ لحد ارتفاع السقف، ولذلك تخرج من الدهان.");
  assumptions.push("الدهان: حوائط الغرف غير المكسية بالسيراميك + أسقف كل الغرف الداخلية.");
  assumptions.push(`الوزرة: محيط الغرف الجافة (بدون الحمامات) ناقص ${PROJECT_ASSUMPTIONS.doorWidthM} م لباب كل غرفة.`);
  assumptions.push("العزل: أرضية الحمامات والمطابخ والبلكونات.");
  assumptions.push("أعمال المباني غير محسوبة في هذا الوضع (تُدخل يدوياً في المحاكي لو لزم).");
  assumptions.push("عدد الغرف (للعلب والمخارج) محسوب من تصنيف أسماء الغرف المسجلة؛ الطرقات والبلكونات لا تدخل في العدد.");

  return { ok: true, blockers, warnings, assumptions, areas, gypsum: { area: round2(gypsumArea), perimeter: round2(gypsumPerimeter) }, counts, rooms: detail };
}

export interface ProjectBomResult {
  ok: boolean;
  blockers: string[];
  bom: BomResult | null;
  derived: ProjectAreasResult;
}

export function computeProjectBom(
  items: BomItem[],
  materials: BomMaterial[],
  factors: BomRoomFactor[],
  labor: LaborConfig,
  input: ProjectBomInput
): ProjectBomResult {
  const derived = deriveProjectAreas(input);
  if (!derived.ok || !derived.areas) return { ok: false, blockers: derived.blockers, bom: null, derived };

  const a = derived.areas;
  const base: SimInput = {
    totalArea: a.apartment_area,
    bedrooms: derived.counts.bedrooms,
    bathrooms: derived.counts.bathrooms,
    kitchens: derived.counts.kitchens,
    receptions: derived.counts.receptions,
    plumbingInstall: input.plumbingInstall
  };

  // كل البنود ما عدا الجبس بورد (والمحارة لو الشقة متحارة): المساحات كلها من بيانات الغرف
  const main = computeBom(
    items.filter((i) => i.key !== "gypsum" && !(input.state === "plastered" && i.key === "plaster")),
    materials, factors,
    {
      ...base,
      overrides: {
        wall_area: a.wall_area, ceiling_area: a.ceiling_area, perimeter_ml: a.perimeter_ml, floor_area: a.floor_area,
        wall_tile_area: a.wall_tile_area, waterproof_area: a.waterproof_area, paint_area: a.paint_area, masonry_area: 0
      }
    },
    labor
  );

  // الجبس بورد: الغرف المفعّلة فقط (مساحتها ومحيطها من تاب الأسقف)
  let gypsumGroups: BomGroup[] = [];
  const gypsumItem = items.find((i) => i.key === "gypsum");
  if (derived.gypsum.area > 0 && gypsumItem) {
    gypsumGroups = computeBom(
      [gypsumItem], materials, factors,
      { ...base, overrides: { ceiling_area: derived.gypsum.area, perimeter_ml: derived.gypsum.perimeter } },
      labor
    ).groups; // المصنعيات المقطوعة تُحسب مرة واحدة من النتيجة الأساسية
  }

  const groups = [...main.groups, ...gypsumGroups].sort((x, y) => x.item.sort_order - y.item.sort_order);
  const bom: BomResult = {
    areas: a,
    groups,
    lumpLabor: main.lumpLabor,
    info: main.info,
    warnings: main.warnings,
    totals: sumTotals(groups, main.lumpLabor),
    note: BOM_FINAL_NOTE
  };
  return { ok: true, blockers: [], bom, derived };
}