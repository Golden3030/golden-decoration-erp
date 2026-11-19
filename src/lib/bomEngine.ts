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
  labor_per_m2?: number;          // مصنعية البند (جنيه لكل م² من مساحة الأساس)
  labor_basis?: Basis;            // المساحة التي تُحسب عليها المصنعية
  estimate_category?: string | null; // قسم المقايسة الذي يذهب إليه البند
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
  unit_price?: number;            // سعر وحدة الشراء بالجنيه
}

export interface BomRoomFactor {
  factor_key: string;
  room_type: string; // bedroom | kitchen | bathroom | reception
  factor: number;
}

// ---------- المصنعيات (تاب منفصل في الإعدادات): بالمتر، أو مقطوعة، أو سباكة حسب عدد الحمامات ونوع التأسيس ----------
export type LaborKind = "per_m2" | "lump" | "plumbing_tiers";
export type PlumbingInstall = "buried" | "regular"; // دفن أو عادي

export interface LaborRate {
  item_key: string;
  kind: LaborKind;
  basis: Basis;   // المساحة التي تُحسب عليها المصنعية (للنوع per_m2 فقط)
  rate: number;   // جنيه لكل م² (per_m2) أو مبلغ مقطوع (lump)
}

export interface PlumbingTier {
  bathrooms_tier: 1 | 2 | 3; // 3 = ثلاثة حمامات فأكثر
  install_type: PlumbingInstall;
  price: number;
}

export interface LaborConfig {
  rates: LaborRate[];
  plumbing: PlumbingTier[];
}

export const PLUMBING_INSTALL_LABELS: Record<PlumbingInstall, string> = { buried: "تأسيس دفن", regular: "تأسيس عادي" };

export interface LumpLabor {
  itemKey: string;
  name: string;
  amount: number;
  basis: string;
  category: string;
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
  plumbingInstall?: PlumbingInstall;                  // نوع تأسيس السباكة (دفن أو عادي) لمصنعية السباكة المقطوعة
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
  unitPrice: number;    // سعر وحدة الشراء (0 = غير مسعّر)
  cost: number;         // الكمية × سعر الوحدة
}

export interface BomGroup {
  item: BomItem;
  lines: BomLine[];
  materialsCost: number;
  laborBase: number;    // مساحة حساب المصنعية
  laborRate: number;    // جنيه لكل م²
  laborCost: number;
  totalCost: number;
}

export interface BomTotals {
  materials: number;
  labor: number;
  grand: number;
  unpricedLines: number;
}

export interface BomResult {
  areas: DerivedAreas;
  groups: BomGroup[];
  lumpLabor: LumpLabor[];   // مصنعيات مقطوعة (كهرباء، سباكة...) خارج جداول الخامات
  info: { label: string; value: string }[];
  warnings: string[];
  totals: BomTotals;
  note: string;
}

export function sumTotals(groups: BomGroup[], lump: LumpLabor[] = []): BomTotals {
  const materials = groups.reduce((s, g) => s + g.materialsCost, 0);
  const labor = groups.reduce((s, g) => s + g.laborCost, 0) + lump.reduce((s, l) => s + l.amount, 0);
  const unpricedLines = groups.reduce((s, g) => s + g.lines.filter((l) => !(l.unitPrice > 0)).length, 0);
  return { materials, labor, grand: materials + labor, unpricedLines };
}

export const BOM_FINAL_NOTE = "جميع الكميات تقريبية للحصر المبدئي، ويتم المراجعة حسب المخططات والمواصفات الفنية للمشروع.";

const fmt = (n: number) => Number(Math.round(n * 1000) / 1000).toLocaleString("en-US", { maximumFractionDigits: 3 });

// دمج جدول المصنعيات في البنود: البند اللي نوعه "بالمتر" ياخد سعره وأساسه من التاب، وغيره بدون مصنعية متر
export function applyLaborRates(items: BomItem[], rates: LaborRate[]): BomItem[] {
  return items.map((it) => {
    const r = rates.find((x) => x.item_key === it.key);
    if (r && r.kind === "per_m2") return { ...it, labor_per_m2: r.rate, labor_basis: r.basis };
    return { ...it, labor_per_m2: 0 };
  });
}

// المصنعيات المقطوعة: كهرباء وأمثالها (مبلغ ثابت للشقة)، والسباكة (سعر حسب عدد الحمامات ونوع التأسيس)
export function computeLumpLabor(
  items: BomItem[],
  labor: LaborConfig,
  bathrooms: number,
  install: PlumbingInstall | undefined
): { lines: LumpLabor[]; warnings: string[] } {
  const lines: LumpLabor[] = [];
  const warnings: string[] = [];
  for (const it of items.filter((i) => i.is_active).sort((a, b) => a.sort_order - b.sort_order)) {
    const r = labor.rates.find((x) => x.item_key === it.key);
    if (!r) continue;
    const category = it.estimate_category || "decorations";
    if (r.kind === "lump") {
      if (r.rate > 0) {
        lines.push({ itemKey: it.key, name: `مصنعية ${it.name_ar}`, amount: r.rate, basis: "مصنعية مقطوعة للشقة", category });
      } else {
        warnings.push(`مصنعية ${it.name_ar} (مقطوعة) غير مضبوطة في تاب المصنعيات، فلم تُحسب.`);
      }
    } else if (r.kind === "plumbing_tiers") {
      if (!(bathrooms >= 1)) {
        warnings.push(`مصنعية ${it.name_ar} لم تُحسب لأن عدد الحمامات صفر.`);
        continue;
      }
      if (!install) {
        warnings.push(`مصنعية ${it.name_ar} لم تُحسب: اختر نوع التأسيس (دفن أو عادي).`);
        continue;
      }
      const tier = (bathrooms >= 3 ? 3 : bathrooms) as 1 | 2 | 3;
      const row = labor.plumbing.find((x) => x.bathrooms_tier === tier && x.install_type === install);
      if (row && row.price > 0) {
        const tierLabel = tier === 1 ? "حمام واحد" : tier === 2 ? "حمامان" : "ثلاثة حمامات فأكثر";
        lines.push({
          itemKey: it.key,
          name: `مصنعية ${it.name_ar}`,
          amount: row.price,
          basis: `مقطوعة: ${tierLabel} (${bathrooms} فعلياً)، ${PLUMBING_INSTALL_LABELS[install]}`,
          category
        });
      } else {
        warnings.push(`سعر مصنعية ${it.name_ar} لـ ${tier === 1 ? "حمام واحد" : tier === 2 ? "حمامين" : "ثلاثة حمامات فأكثر"} (${PLUMBING_INSTALL_LABELS[install]}) غير مضبوط في تاب المصنعيات.`);
      }
    }
  }
  return { lines, warnings };
}

export function computeBom(
  items: BomItem[],
  materials: BomMaterial[],
  factors: BomRoomFactor[],
  inp: SimInput,
  labor?: LaborConfig
): BomResult {
  const areas = deriveAreas(inp);
  if (labor) items = applyLaborRates(items, labor.rates);
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
          (m.pack_size > 1 ? ` ÷ ${fmt(m.pack_size)} للوحدة` : ""),
        unitPrice: Number(m.unit_price) || 0,
        cost: qty * (Number(m.unit_price) || 0)
      });
    }
    if (lines.length > 0) {
      const materialsCost = lines.reduce((s, l) => s + l.cost, 0);
      const laborBasis = (item.labor_basis || "apartment_area") as Basis;
      const laborBase = laborBasis === "per_unit" ? 1 : areas[laborBasis];
      const laborRate = Number(item.labor_per_m2) || 0;
      const laborCost = laborBase * laborRate;
      groups.push({ item, lines, materialsCost, laborBase, laborRate, laborCost, totalCost: materialsCost + laborCost });
    }
  }

  // مخارج السباكة: معلومة إرشادية فقط (لم يحدد النص أي خامة تُضرب فيها)
  const outletFactors = factors.filter((f) => f.factor_key === "plumbing_outlets");
  const outlets = outletFactors.reduce((s, f) => s + (counts[f.room_type] || 0) * f.factor, 0);
  const info = outlets > 0 ? [{ label: "عدد مخارج السباكة التقديري (حمامات ومطابخ)", value: fmt(outlets) + " مخرج" }] : [];

  const lump = labor ? computeLumpLabor(items, labor, inp.bathrooms, inp.plumbingInstall) : { lines: [], warnings: [] };
  return {
    areas, groups, lumpLabor: lump.lines, info, warnings: lump.warnings,
    totals: sumTotals(groups, lump.lines), note: BOM_FINAL_NOTE
  };
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
  plumbingInstall?: PlumbingInstall; // نوع تأسيس السباكة (دفن أو عادي)
}

export function computeQuickBom(
  items: BomItem[],
  materials: BomMaterial[],
  factors: BomRoomFactor[],
  p: QuickBomInput,
  labor?: LaborConfig
): BomResult {
  const base: SimInput = {
    totalArea: p.totalArea,
    bedrooms: p.bedrooms,
    bathrooms: Math.max(1, p.bathrooms),
    kitchens: Math.max(1, p.kitchens),
    receptions: Math.max(1, p.receptions),
    plumbingInstall: p.plumbingInstall
  };

  // كل البنود ما عدا الجبس بورد (والمحارة لو الشقة متحارة). الأسقف تُدهن كلها حتى بدون جبس بورد.
  const main = computeBom(
    items.filter((i) => i.key !== "gypsum" && !(p.state === "plastered" && i.key === "plaster")),
    materials, factors, { ...base, ceilingShare: 1 }, labor
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
    }, labor).groups; // المصنعيات المقطوعة تُحسب مرة واحدة من النتيجة الأساسية فقط
  }

  const groups = [...main.groups, ...gypsumGroups].sort((a, b) => a.item.sort_order - b.item.sort_order);
  return {
    areas: main.areas, groups, lumpLabor: main.lumpLabor, info: main.info, warnings: main.warnings,
    totals: sumTotals(groups, main.lumpLabor), note: BOM_FINAL_NOTE
  };
}

// ---------- ربط الحصر بالمقايسة: تحويل نتيجة الحصر لبنود بنفس شكل بنود المقايسة ----------
export interface EstimateLineShape {
  category: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  laborCost: number;
  description: string;
}

export function bomToEstimateLines(groups: BomGroup[], lump: LumpLabor[] = []): EstimateLineShape[] {
  const out: EstimateLineShape[] = [];
  for (const g of groups) {
    const category = g.item.estimate_category || "decorations";
    for (const l of g.lines) {
      out.push({
        category,
        name: `${l.name} (${g.item.name_ar})`,
        unit: l.unit,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        laborCost: 0,
        description: `من الحصر الفني: ${l.basis}`
      });
    }
    if (g.laborCost > 0) {
      out.push({
        category,
        name: `مصنعية ${g.item.name_ar}`,
        unit: "م²",
        quantity: Math.round(g.laborBase * 100) / 100,
        unitPrice: 0,
        laborCost: Math.round(g.laborCost),
        description: `مصنعية ${g.item.name_ar}: ${fmt(g.laborBase)} م² × ${fmt(g.laborRate)} جنيه/م²`
      });
    }
  }
  for (const l of lump) {
    out.push({
      category: l.category,
      name: l.name,
      unit: "مقطوعة",
      quantity: 1,
      unitPrice: 0,
      laborCost: Math.round(l.amount),
      description: `${l.name}: ${l.basis}`
    });
  }
  return out;
}