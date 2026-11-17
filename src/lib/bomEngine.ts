// محرك الحصر الفني (محاكي الكميات): يستنتج المساحات الهندسية التقديرية من مساحة الشقة الإجمالية،
// ثم يحسب الخامات المطلوبة من جداول المعاملات في قاعدة البيانات، ويقرّب لأقرب وحدة شراء صحيحة.
// دوال بحتة بدون اتصال بقاعدة البيانات، فهي قابلة للاختبار.

export type Basis =
  | "wall_area" | "ceiling_area" | "perimeter_ml" | "floor_area" | "wall_tile_area"
  | "waterproof_area" | "apartment_area" | "paint_area" | "masonry_area" | "per_unit";

export type Rounding = "ceil" | "half" | "none";

export interface BomItem {
  key: string;
  name_ar: string;
  sort_order: number;
  active_set: "A" | "B";
  golden_notes: string | null;
  is_active: boolean;
}

export interface BomMaterial {
  id: string;
  item_key: string;
  set_name: "A" | "B";
  name_ar: string;
  basis: Basis;
  coefficient: number;
  coeff_unit: string | null;
  purchase_unit: string;
  pack_size: number;
  rounding: Rounding;
  variant_group: string | null;
  variant_label: string | null;
  extra_factor_key: string | null;
  is_active: boolean;
  sort_order: number;
  notes: string | null;
}

export interface BomRoomFactor {
  factor_key: string;
  room_type: string; // bedroom | kitchen | bathroom | reception
  factor: number;
}

export type DerivedAreas = Record<Exclude<Basis, "per_unit">, number>;

export const AREA_LABELS: Record<Basis, string> = {
  wall_area: "مساحة الحوائط (محارة ودهانات)",
  ceiling_area: "مساحة الأسقف والجبس بورد",
  perimeter_ml: "محيط الشادو جاب والوزر (م.ط)",
  floor_area: "مساحة سيراميك الأرضيات",
  wall_tile_area: "مساحة سيراميك الحوائط (حمامات ومطابخ)",
  waterproof_area: "مساحة العزل (حمامات ومطابخ)",
  apartment_area: "مساحة الشقة الإجمالية",
  paint_area: "مساحة الدهان (حوائط + أسقف)",
  masonry_area: "مساحة المباني",
  per_unit: "لكل شقة"
};

// النسب المعمارية القياسية (قابلة للتعديل من المستخدم داخل المحاكي)
export const DEFAULT_RATIOS = {
  wall: 2.8,          // الحوائط = المساحة × 2.8
  ceiling: 1,         // الأسقف = المساحة × 1
  perimeter: 2,       // المحيط = المساحة × 2 م.ط (لا توجد قاعدة ثابتة، يُعدَّل يدوياً)
  floor: 1,           // سيراميك الأرضيات = المساحة × 1
  wallTileOneBath: 0.45, // حمام واحد ومطبخ
  wallTileTwoBath: 0.55, // حمامان ومطبخ
  waterproof: 0.12    // العزل = المساحة × 0.12
};

export interface SimInput {
  totalArea: number;
  bedrooms: number;
  bathrooms: number;
  kitchens: number;
  receptions: number;
  ceilingShare?: number;                              // نسبة الأسقف المعلقة المختارة (0 إلى 1)، الافتراضي 1
  masonryArea?: number;                               // مساحة المباني (تُدخل يدوياً، الافتراضي 0)
  overrides?: Partial<Record<keyof DerivedAreas, number>>; // تعديل يدوي لأي مساحة مشتقة
}

export function deriveAreas(inp: SimInput): DerivedAreas {
  const A = Math.max(0, Number(inp.totalArea) || 0);
  const share = Math.min(1, Math.max(0, inp.ceilingShare ?? 1));
  const tileRatio = inp.bathrooms >= 2 ? DEFAULT_RATIOS.wallTileTwoBath : DEFAULT_RATIOS.wallTileOneBath;

  const base: DerivedAreas = {
    wall_area: A * DEFAULT_RATIOS.wall,
    ceiling_area: A * DEFAULT_RATIOS.ceiling * share,
    perimeter_ml: A * DEFAULT_RATIOS.perimeter,
    floor_area: A * DEFAULT_RATIOS.floor,
    wall_tile_area: A * tileRatio,
    waterproof_area: A * DEFAULT_RATIOS.waterproof,
    apartment_area: A,
    paint_area: 0,
    masonry_area: Math.max(0, inp.masonryArea ?? 0)
  };
  const ov = inp.overrides || {};
  (Object.keys(ov) as (keyof DerivedAreas)[]).forEach((k) => {
    const v = Number(ov[k]);
    if (Number.isFinite(v) && v >= 0) base[k] = v;
  });
  // مساحة الدهان المركّبة تُحسب بعد التعديلات اليدوية (ما لم تُعدَّل بنفسها)
  if (ov.paint_area === undefined) base.paint_area = base.wall_area + base.ceiling_area;
  return base;
}

// التقريب لأقرب وحدة شراء: ceil للأعداد الصحيحة، وhalf لأقرب 0.5 (الأمتار المكعبة) لأعلى
export function roundQty(x: number, rounding: Rounding): number {
  if (!(x > 0)) return 0;
  if (rounding === "ceil") return Math.ceil(x - 1e-9);
  if (rounding === "half") return Math.ceil(x * 2 - 1e-9) / 2;
  return Math.round(x * 100) / 100;
}

export interface BomLine {
  itemKey: string;
  materialId: string;
  name: string;
  quantity: number;     // بوحدة الشراء بعد التقريب
  unit: string;
  rawQuantity: number;  // قبل التقريب
  basis: string;        // شرح طريقة الحساب
}

export interface BomGroup {
  item: BomItem;
  lines: BomLine[];
}

export interface BomResult {
  areas: DerivedAreas;
  groups: BomGroup[];
  info: { label: string; value: string }[];
  note: string;
}

export const BOM_FINAL_NOTE = "جميع الكميات تقريبية للحصر المبدئي، ويتم المراجعة حسب المخططات والمواصفات الفنية للمشروع.";

const fmt = (n: number) => Number(Math.round(n * 1000) / 1000).toLocaleString("en-US", { maximumFractionDigits: 3 });

export function computeBom(
  items: BomItem[],
  materials: BomMaterial[],
  factors: BomRoomFactor[],
  inp: SimInput
): BomResult {
  const areas = deriveAreas(inp);
  const counts: Record<string, number> = {
    bedroom: inp.bedrooms, kitchen: inp.kitchens, bathroom: inp.bathrooms, reception: inp.receptions
  };

  const groups: BomGroup[] = [];
  const orderedItems = [...items].filter((i) => i.is_active).sort((a, b) => a.sort_order - b.sort_order);

  for (const item of orderedItems) {
    const mats = materials
      .filter((m) => m.item_key === item.key && m.set_name === item.active_set && m.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);

    const lines: BomLine[] = [];
    for (const m of mats) {
      const base = m.basis === "per_unit" ? 1 : areas[m.basis];
      let raw = base * m.coefficient;
      let extraText = "";

      // علب الكهرباء (وأي خامة لها معامل مخارج): الكمية = المساحة × معامل + عدد الغرف × معامل المخارج
      if (m.extra_factor_key) {
        const extra = factors
          .filter((f) => f.factor_key === m.extra_factor_key)
          .reduce((s, f) => s + (counts[f.room_type] || 0) * f.factor, 0);
        raw += extra;
        extraText = ` + ${fmt(extra)} حسب عدد الغرف`;
      }

      if (!(raw > 0)) continue; // بند بدون كمية (مثل المباني لو المساحة صفر)

      const packs = raw / (m.pack_size || 1);
      const qty = roundQty(packs, m.rounding);
      const baseText = m.basis === "per_unit" ? "لكل شقة" : `${fmt(base)} (${AREA_LABELS[m.basis].split(" (")[0]})`;
      lines.push({
        itemKey: item.key,
        materialId: m.id,
        name: m.name_ar,
        quantity: qty,
        unit: m.purchase_unit,
        rawQuantity: raw,
        basis:
          `${baseText} × ${fmt(m.coefficient)}${extraText}` +
          (m.pack_size > 1 ? ` ÷ ${fmt(m.pack_size)} للوحدة` : "")
      });
    }
    if (lines.length > 0) groups.push({ item, lines });
  }

  // مخارج السباكة: معلومة إرشادية فقط (لم يحدد النص أي خامة تُضرب فيها)
  const outletFactors = factors.filter((f) => f.factor_key === "plumbing_outlets");
  const outlets = outletFactors.reduce((s, f) => s + (counts[f.room_type] || 0) * f.factor, 0);
  const info = outlets > 0 ? [{ label: "عدد مخارج السباكة التقديري (حمامات ومطابخ)", value: fmt(outlets) + " مخرج" }] : [];

  return { areas, groups, info, note: BOM_FINAL_NOTE };
}
// ---------- التقدير السريع (مكالمة عميل): نفس الجداول لكن بخيارات حالة الشقة والجبس بورد ----------
export interface QuickBomInput {
  totalArea: number;
  bedrooms: number;
  bathrooms: number;
  kitchens: number;
  receptions: number;
  state: "brick" | "plastered"; // على الطوب الأحمر أو على المحارة (المحارة لا تُحتسب لو الشقة متحارة)
  gypsumShare: number;          // نسبة الأسقف المعلقة بالجبس بورد من الشقة (0 = بدون جبس بورد)
}

export function computeQuickBom(
  items: BomItem[],
  materials: BomMaterial[],
  factors: BomRoomFactor[],
  p: QuickBomInput
): BomResult {
  const base: SimInput = {
    totalArea: p.totalArea,
    bedrooms: p.bedrooms,
    bathrooms: Math.max(1, p.bathrooms),
    kitchens: Math.max(1, p.kitchens),
    receptions: Math.max(1, p.receptions)
  };

  // كل البنود ما عدا الجبس بورد (والمحارة لو الشقة متحارة). الأسقف تُدهن كلها حتى بدون جبس بورد.
  const main = computeBom(
    items.filter((i) => i.key !== "gypsum" && !(p.state === "plastered" && i.key === "plaster")),
    materials, factors, { ...base, ceilingShare: 1 }
  );

  let gypsumGroups: BomGroup[] = [];
  const share = Math.min(1, Math.max(0, p.gypsumShare));
  const gypsumItem = items.find((i) => i.key === "gypsum");
  if (share > 0 && gypsumItem) {
    // الجبس بورد على الغرف المختارة فقط: المساحة والمحيط يتناسبان مع نسبتها
    gypsumGroups = computeBom([gypsumItem], materials, factors, {
      ...base,
      ceilingShare: share,
      overrides: { perimeter_ml: p.totalArea * DEFAULT_RATIOS.perimeter * share }
    }).groups;
  }

  const groups = [...main.groups, ...gypsumGroups].sort((a, b) => a.item.sort_order - b.item.sort_order);
  return { areas: main.areas, groups, info: main.info, note: BOM_FINAL_NOTE };
}