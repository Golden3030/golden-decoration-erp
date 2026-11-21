// حصر المشروع المسجل: يشتق المساحات الهندسية من بيانات الغرف الفعلية (تاب المساحات وتاب الأسقف)
// ثم يحسب الكميات والتكاليف بنفس محرك الحصر الفني (bomEngine) ونفس جداول المعاملات والأسعار والمصنعيات
// المستخدمة في المحاكي والتقدير السريع والمقايسة المبدئية. دوال بحتة بدون اتصال بقاعدة البيانات.
// لا يخمّن: لو بيانات أساسية ناقصة يرجع blockers ويقف.

import {
  computeBom,
  DEFAULT_PLASTER_THICKNESS_CM,
  PLASTER_BASE_THICKNESS_CM,
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
  area: number;      // م² الغرفة المفعّلة في تاب الأسقف
  type?: string;     // flat_gypsum (فلات) أو light_pocket (بيت نور)
  length?: number;   // طول الغرفة بالمتر (لغرف بيت النور)
  width?: number;    // عرض الغرفة بالمتر (لغرف بيت النور)
}

export interface ProjectBomInput {
  rooms: ProjectRoom[];
  state: ApartmentState | null;       // null = لم تُحدد
  ceilingHeight: number | null;       // null = لم يُحدد
  ceilingSpaces: CeilingSpace[];      // الأسقف المعلقة (جبس بورد) المفعّلة
  declaredTotalArea?: number;         // المساحة الإجمالية المسجلة للمشروع
  plumbingInstall?: PlumbingInstall;  // دفن أو عادي (من تاب السباكة في المشروع المسجل)
  plasterRoomNames?: string[];        // الغرف اللي تدخل المحارة (غير محدد = كل الغرف الداخلية)
  bricksCount?: number;               // عدد الطوب من تاب المباني (لمصنعية الألف طوبة)
  plasterThicknessCm?: number;        // سمك المحارة من تاب المحارة (غير مسجل = افتراضي التاب 2.5 سم)
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
  gypsum: { area: number; perimeter: number; flatArea: number; pocketMl: number };
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
    ok: false, blockers, warnings, assumptions, areas: null, gypsum: { area: 0, perimeter: 0, flatArea: 0, pocketMl: 0 },
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

  // المحارة: الغرف اللي اختارها المستخدم (الافتراضي كل الغرف الداخلية، بما فيها الحمامات والمطبخ لأن السيراميك بيتركب على المحارة)
  const plasterRooms = input.plasterRoomNames
    ? interior.filter((r) => input.plasterRoomNames!.includes(r.name))
    : interior;
  const wallArea = sumWalls(plasterRooms);
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
  const isPocket = (c: CeilingSpace) => c.type === "light_pocket";
  const hasDims = (c: CeilingSpace) => Number(c.length) > 0 && Number(c.width) > 0;
  // بيت النور: المحيط بالظبط من الطول والعرض (3+4+3+4). الفلات: بالمساحة. غرفة بيت نور بدون أبعاد لا تُحسب مصنعيتها
  const flatArea = spaces.filter((c) => !isPocket(c)).reduce((s, c) => s + c.area, 0);
  const pocketSpaces = spaces.filter(isPocket);
  const pocketMl = pocketSpaces.filter(hasDims).reduce((s, c) => s + 2 * (Number(c.length) + Number(c.width)), 0);
  const pocketMissing = pocketSpaces.filter((c) => !hasDims(c)).map((c) => c.name);
  const gypsumPerimeter = spaces.reduce(
    (s, c) => s + (isPocket(c) && hasDims(c) ? 2 * (Number(c.length) + Number(c.width)) : perimeterFromArea(c.area)), 0
  );

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
    masonry_area: 0,
    flat_ceiling_area: round2(flatArea),
    light_pocket_ml: round2(pocketMl)
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
  if (pocketMissing.length > 0) {
    warnings.push(`غرف بيت النور بدون طول وعرض في تاب الأسقف (${pocketMissing.join("، ")}): مصنعية بيت النور بتاعتها لم تُحسب. سجّل الأبعاد.`);
  }
  if (input.plasterRoomNames && plasterRooms.length === 0) {
    warnings.push("لم تُختر أي غرفة للمحارة، فأعمال المحارة صفر.");
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
  assumptions.push(
    input.plasterRoomNames
      ? `المحارة على الغرف المختارة فقط (${plasterRooms.length} من ${interior.length} غرفة داخلية).`
      : "المحارة تشمل حوائط كل الغرف الداخلية بما فيها الحمامات والمطابخ (السيراميك يتركب على المحارة). البلكونات والحديقة خارج الحوائط."
  );
  if (pocketSpaces.length > 0) assumptions.push("بيت النور: المحيط من طول وعرض الغرفة المسجلين في تاب الأسقف (مصنعية بالمتر الطولي)، والفلات بالمتر المربع.");
  assumptions.push("سيراميك الحوائط: حوائط الحمامات والمطابخ لحد ارتفاع السقف، ولذلك تخرج من الدهان.");
  assumptions.push("الدهان: حوائط الغرف غير المكسية بالسيراميك + أسقف كل الغرف الداخلية.");
  assumptions.push(`الوزرة: محيط الغرف الجافة (بدون الحمامات) ناقص ${PROJECT_ASSUMPTIONS.doorWidthM} م لباب كل غرفة.`);
  assumptions.push("العزل: أرضية الحمامات والمطابخ والبلكونات.");
  assumptions.push("أعمال المباني غير محسوبة في هذا الوضع (تُدخل يدوياً في المحاكي لو لزم).");
  assumptions.push("عدد الغرف (للعلب والمخارج) محسوب من تصنيف أسماء الغرف المسجلة؛ الطرقات والبلكونات لا تدخل في العدد.");

  return {
    ok: true, blockers, warnings, assumptions, areas,
    gypsum: { area: round2(gypsumArea), perimeter: round2(gypsumPerimeter), flatArea: round2(flatArea), pocketMl: round2(pocketMl) },
    counts, rooms: detail
  };
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
  const thicknessSaved = Number(input.plasterThicknessCm) > 0;
  const plasterThickness = thicknessSaved ? Number(input.plasterThicknessCm) : DEFAULT_PLASTER_THICKNESS_CM;
  derived.assumptions.push(
    `سمك المحارة ${plasterThickness} سم${thicknessSaved ? " (من تاب المحارة)" : " (افتراضي التاب، لم يُغيَّر في المشروع)"}: خامات المحارة (أسمنت ورمل) = معاملات الحصر لسمك ${PLASTER_BASE_THICKNESS_CM} سم × ${Math.round((plasterThickness / PLASTER_BASE_THICKNESS_CM) * 100) / 100}.`
  );
  const base: SimInput = {
    totalArea: a.apartment_area,
    bedrooms: derived.counts.bedrooms,
    bathrooms: derived.counts.bathrooms,
    kitchens: derived.counts.kitchens,
    receptions: derived.counts.receptions,
    plumbingInstall: input.plumbingInstall,
    bricksCount: input.bricksCount,
    // سمك المحارة بيضرب خامات بند المحارة (أسمنت ورمل) بنسبة السمك ÷ 2 سم (أساس معاملات الحصر)
    itemFactors: { plaster: plasterThickness / PLASTER_BASE_THICKNESS_CM }
  };

  // كل البنود ما عدا الجبس بورد (والمحارة لو الشقة متحارة): المساحات كلها من بيانات الغرف
  const main = computeBom(
    items.filter((i) => i.key !== "gypsum" && !(input.state === "plastered" && i.key === "plaster")),
    materials, factors,
    {
      ...base,
      overrides: {
        wall_area: a.wall_area, ceiling_area: a.ceiling_area, perimeter_ml: a.perimeter_ml, floor_area: a.floor_area,
        wall_tile_area: a.wall_tile_area, waterproof_area: a.waterproof_area, paint_area: a.paint_area, masonry_area: 0,
        flat_ceiling_area: derived.gypsum.flatArea, light_pocket_ml: derived.gypsum.pocketMl
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
      {
        ...base,
        overrides: {
          ceiling_area: derived.gypsum.area, perimeter_ml: derived.gypsum.perimeter,
          flat_ceiling_area: derived.gypsum.flatArea, light_pocket_ml: derived.gypsum.pocketMl
        }
      },
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