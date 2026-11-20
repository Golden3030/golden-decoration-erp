// اختبار حسابات حصر المشروع المسجل (بدون قاعدة بيانات). التشغيل: npx tsx scripts/test-project-bom.ts
import { computeProjectBom, deriveProjectAreas, perimeterFromArea, type ProjectBomInput } from "../src/lib/projectBom";
import { computeBom, computeQuickBom, bomToEstimateLines, type BomItem, type BomMaterial, type LaborConfig } from "../src/lib/bomEngine";
import { classifyRoom } from "../src/lib/takeoffEngine";

let fails = 0;
const eq = (name: string, got: number, want: number, tol = 0.011) => {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: got ${got} want ${want}`);
};
const truthy = (name: string, v: boolean) => { if (!v) fails++; console.log(`${v ? "PASS" : "FAIL"}  ${name}`); };

// حساب مستقل للمحيط بطريقة مختلفة (عرض وطول)
const indep = (A: number) => { const w = Math.sqrt(A / 1.3); return 2 * (w + 1.3 * w); };
eq("perimeter 13 m2 (hand: w=3.1623,l=4.1110)", perimeterFromArea(13), 14.5466, 0.001);
eq("perimeter fn equals independent", perimeterFromArea(25), indep(25), 1e-9);

const mk = (key: string, name: string, order: number, cat: string): BomItem =>
  ({ key, name_ar: name, sort_order: order, active_set: "A", golden_notes: null, is_active: true, estimate_category: cat });
const items: BomItem[] = [
  mk("plaster", "المحارة", 1, "plaster"), mk("paint", "الدهانات", 2, "paint"), mk("gypsum", "الجبس بورد", 3, "ceiling"),
  mk("ceramic", "السيراميك", 4, "flooring"), mk("electric", "الكهرباء", 5, "electricity"), mk("plumb", "السباكة", 6, "plumbing"),
  mk("masonry", "المباني", 7, "masonry")
];
let mid = 0;
const mat = (item: string, basis: any, name: string): BomMaterial => ({
  id: "m" + ++mid, item_key: item, set_name: "A", name_ar: name, basis, coefficient: 1, coeff_unit: null,
  purchase_unit: "م²", pack_size: 1, rounding: "none", variant_group: null, variant_label: null, extra_factor_key: null,
  is_active: true, sort_order: 1, notes: null, unit_price: 10
});
const materials: BomMaterial[] = [
  mat("plaster", "wall_area", "محارة"), mat("paint", "paint_area", "دهان"), mat("gypsum", "ceiling_area", "جبس سقف"),
  mat("gypsum", "perimeter_ml", "شادو جاب"), mat("ceramic", "floor_area", "سيراميك أرضيات"), mat("ceramic", "wall_tile_area", "سيراميك حوائط"),
  mat("ceramic", "waterproof_area", "عزل"), mat("ceramic", "perimeter_ml", "وزرة"), mat("ceramic", "apartment_area", "مساحة الشقة"),
  mat("masonry", "apartment_area", "مباني")
];
const L = (item_key: string, line_key: string, line_name: string, sort_order: number, kind: any, basis: any, rate: number) =>
  ({ item_key, line_key, line_name, sort_order, kind, basis, rate });
const labor: LaborConfig = {
  rates: [
    L("plaster", "main", "مصنعية المحارة", 0, "per_m2", "wall_area", 10),
    L("paint", "main", "مصنعية الدهانات", 0, "per_m2", "paint_area", 5),
    L("gypsum", "main", "جبس فلات", 0, "per_m2", "flat_ceiling_area", 20),
    L("gypsum", "light_pocket", "جبس بيت نور", 1, "per_ml", "light_pocket_ml", 35),
    L("ceramic", "main", "سيراميك أرضيات", 0, "per_m2", "floor_area", 30),
    L("ceramic", "wall", "سيراميك حوائط", 1, "per_m2", "wall_tile_area", 25),
    L("electric", "main", "مصنعية الكهرباء", 0, "lump", "apartment_area", 8000),
    L("plumb", "main", "مصنعية السباكة", 0, "plumbing_tiers", "apartment_area", 0),
    L("masonry", "main", "مصنعية المباني (1000 طوبة)", 0, "per_1000_bricks", "apartment_area", 600)
  ],
  plumbing: [
    { bathrooms_tier: 1, install_type: "buried", price: 6000 }, { bathrooms_tier: 1, install_type: "regular", price: 4000 },
    { bathrooms_tier: 2, install_type: "buried", price: 9000 }, { bathrooms_tier: 2, install_type: "regular", price: 6500 },
    { bathrooms_tier: 3, install_type: "buried", price: 12000 }, { bathrooms_tier: 3, install_type: "regular", price: 9000 }
  ]
};

const R = (name: string, area: number) => ({ name, kind: classifyRoom(name), area });
const rooms = [R("الريسبشن", 25), R("غرفة نوم 1", 16), R("غرفة نوم 2", 14), R("المطبخ", 10), R("الحمام", 6), R("الطرقة", 8), R("بلكونة", 5)];
const input: ProjectBomInput = {
  rooms, state: "brick", ceilingHeight: 3, declaredTotalArea: 85,
  ceilingSpaces: [
    { name: "الريسبشن", area: 25, type: "flat_gypsum" },
    { name: "غرفة نوم 1", area: 12, type: "light_pocket", length: 3, width: 4 } // 3+4+3+4 = 14 م.ط
  ],
  plumbingInstall: "buried", bricksCount: 12000
};

const d = deriveProjectAreas(input);
truthy("classify: kinds", rooms.map((r) => r.kind).join() === "reception,bedroom,bedroom,kitchen,bathroom,corridor,balcony");
const A = d.areas!;
// حساب مستقل بالأطوال
const P = (a: number) => indep(a);
const int = [25, 16, 14, 10, 6, 8], h = 3;
eq("floor_area = all rooms incl. balcony", A.floor_area, 25 + 16 + 14 + 10 + 6 + 8 + 5);
eq("wall_area = interior perimeters x h (no openings deducted)", A.wall_area, int.reduce((s, a) => s + P(a), 0) * h);
eq("wall_tile_area = bathroom+kitchen walls to ceiling", A.wall_tile_area, (P(10) + P(6)) * h);
eq("paint_area = walls excl tiled + interior ceilings", A.paint_area, [25, 16, 14, 8].reduce((s, a) => s + P(a), 0) * h + 79);
eq("ceiling_area (all interior)", A.ceiling_area, 79);
eq("perimeter_ml baseboard = dry perimeters - 0.9 per dry room", A.perimeter_ml, [25, 16, 14, 10, 8].reduce((s, a) => s + P(a), 0) - 5 * 0.9);
eq("waterproof = bathroom+kitchen+balcony floors", A.waterproof_area, 21);
eq("apartment_area = declared", A.apartment_area, 85);
eq("gypsum area = flat + pocket rooms", d.gypsum.area, 37);
eq("flat ceiling area (flat rooms only)", d.gypsum.flatArea, 25);
eq("light pocket length = 3+4+3+4 = 14", d.gypsum.pocketMl, 14);
eq("gypsum shadow-gap perimeter (estimated flat + exact pocket)", d.gypsum.perimeter, P(25) + 14);
eq("areas expose flat_ceiling_area / light_pocket_ml", A.flat_ceiling_area * 1000 + A.light_pocket_ml, 25 * 1000 + 14);
truthy("counts", d.counts.bedrooms === 2 && d.counts.bathrooms === 1 && d.counts.kitchens === 1 && d.counts.receptions === 1);

// نفس المساحات تظهر في الكميات (معامل 1)
const res = computeProjectBom(items, materials, [], labor, input);
const qty = (item: string, name: string) => res.bom!.groups.find((g) => g.item.key === item)!.lines.find((l) => l.name === name)!.rawQuantity;
eq("plaster qty = wall_area", qty("plaster", "محارة"), A.wall_area);
eq("paint qty = paint_area", qty("paint", "دهان"), A.paint_area);
eq("gypsum ceiling qty = enabled spaces only", qty("gypsum", "جبس سقف"), 37);
eq("gypsum shadow-gap perimeter", qty("gypsum", "شادو جاب"), d.gypsum.perimeter);
eq("ceramic floor qty", qty("ceramic", "سيراميك أرضيات"), A.floor_area);
eq("wall tile qty", qty("ceramic", "سيراميك حوائط"), A.wall_tile_area);
eq("baseboard qty", qty("ceramic", "وزرة"), A.perimeter_ml);

// المصنعيات
const g = (k: string) => res.bom!.groups.find((x) => x.item.key === k)!;
eq("plaster labor = 10 x wall_area", g("plaster").laborCost, 10 * A.wall_area, 0.05);
eq("gypsum labor = flat 20 x 25 + pocket 35 x 14", g("gypsum").laborCost, 20 * 25 + 35 * 14, 0.05);
truthy("gypsum has two labor lines (flat m2, pocket ml)", g("gypsum").laborLines.length === 2 && g("gypsum").laborLines[1].unit === "م.ط" && g("gypsum").laborLines[1].base === 14);
eq("ceramic labor: floors 30 x floor_area + walls 25 x wall_tile_area", g("ceramic").laborCost, 30 * A.floor_area + 25 * A.wall_tile_area, 0.05);
truthy("ceramic has separate floor and wall lines", g("ceramic").laborLines.length === 2);
eq("masonry labor per 1000 bricks: 12000 bricks x 600/1000", g("masonry").laborCost, 7200, 0.05);
const lump = res.bom!.lumpLabor;
eq("lump electricity = 8000", lump.find((l) => l.itemKey === "electric")!.amount, 8000);
eq("lump plumbing 1 bathroom buried = 6000", lump.find((l) => l.itemKey === "plumb")!.amount, 6000);
truthy("lump plumbing basis text mentions burial", lump.find((l) => l.itemKey === "plumb")!.basis.includes("دفن"));
const labTotal = res.bom!.groups.reduce((s, x) => s + x.laborCost, 0) + 14000;
eq("totals.labor = per-m2 labor + lump", res.bom!.totals.labor, labTotal, 0.05);
const est = bomToEstimateLines(res.bom!.groups, lump);
truthy("estimate lines carry lump labor in the right categories",
  est.some((l) => l.category === "electricity" && l.laborCost === 8000) && est.some((l) => l.category === "plumbing" && l.laborCost === 6000));

// السباكة: عدد الحمامات ونوع التأسيس
const two = { ...input, rooms: [...rooms, R("الحمام 2", 4)], plumbingInstall: "regular" as const };
eq("plumbing 2 bathrooms regular = 6500", computeProjectBom(items, materials, [], labor, two).bom!.lumpLabor.find((l) => l.itemKey === "plumb")!.amount, 6500);
const three = { ...input, rooms: [...rooms, R("الحمام 2", 4), R("حمام الضيوف", 3), R("حمام 4", 3)], plumbingInstall: "buried" as const };
eq("plumbing 4 bathrooms -> tier 3+ buried = 12000", computeProjectBom(items, materials, [], labor, three).bom!.lumpLabor.find((l) => l.itemKey === "plumb")!.amount, 12000);
const noInstall = computeProjectBom(items, materials, [], labor, { ...input, plumbingInstall: undefined });
truthy("missing install type: no plumbing labor + warning", !noInstall.bom!.lumpLabor.some((l) => l.itemKey === "plumb") && noInstall.bom!.warnings.some((w) => w.includes("نوع التأسيس")));

// حالة الشقة والمحارة
const pl = computeProjectBom(items, materials, [], labor, { ...input, state: "plastered" });
truthy("plastered apartment removes plaster group", !pl.bom!.groups.some((x) => x.item.key === "plaster"));
truthy("brick apartment keeps plaster group", res.bom!.groups.some((x) => x.item.key === "plaster"));

// هالك: خصم الفراغات 15%
const w = deriveProjectAreas({ ...input, wastePct: 0.1 });
eq("with waste: walls minus 15% openings", w.areas!.wall_area, A.wall_area * 0.85);

// بدون جبس
const ng = computeProjectBom(items, materials, [], labor, { ...input, ceilingSpaces: [] });
truthy("no enabled ceilings: no gypsum group", !ng.bom!.groups.some((x) => x.item.key === "gypsum"));

// بيت نور بدون أبعاد: تحذير ومصنعيته لا تُحسب (لا تخمين)
const noDims = computeProjectBom(items, materials, [], labor, {
  ...input, ceilingSpaces: [{ name: "الريسبشن", area: 25, type: "flat_gypsum" }, { name: "غرفة نوم 1", area: 12, type: "light_pocket" }]
});
truthy("pocket room without dims: warning names the room", noDims.derived.warnings.some((w) => w.includes("غرفة نوم 1") && w.includes("بيت النور")));
eq("pocket room without dims: no pocket labor (only flat 20 x 25)", noDims.bom!.groups.find((x) => x.item.key === "gypsum")!.laborCost, 500, 0.05);

// المباني بالألف طوبة: بدون عدد طوب تحذير ولا تخمين
const noBricks = computeProjectBom(items, materials, [], labor, { ...input, bricksCount: undefined });
truthy("missing bricks count: warning and no masonry labor", noBricks.bom!.warnings.some((w) => w.includes("عدد الطوب")) && noBricks.bom!.groups.find((x) => x.item.key === "masonry")!.laborCost === 0);

// مساحة المحارة: الشقة كلها / بدون الحمام والمطبخ / غرف محددة
const noWet = deriveProjectAreas({ ...input, plasterRoomNames: ["الريسبشن", "غرفة نوم 1", "غرفة نوم 2", "الطرقة"] });
eq("plaster scope: apartment without bathroom and kitchen", noWet.areas!.wall_area, [25, 16, 14, 8].reduce((s, a) => s + P(a), 0) * h);
eq("plaster scope does not change paint area", noWet.areas!.paint_area, A.paint_area);
const onlyBeds = deriveProjectAreas({ ...input, plasterRoomNames: ["غرفة نوم 1", "غرفة نوم 2"] });
eq("plaster scope: specific rooms only", onlyBeds.areas!.wall_area, (P(16) + P(14)) * h);
const noneSel = deriveProjectAreas({ ...input, plasterRoomNames: [] });
truthy("plaster scope: no rooms selected -> zero + warning", noneSel.areas!.wall_area === 0 && noneSel.warnings.some((w) => w.includes("المحارة")));
const scoped = computeProjectBom(items, materials, [], labor, { ...input, plasterRoomNames: ["غرفة نوم 1"] });
eq("plaster labor follows the selected rooms", scoped.bom!.groups.find((x) => x.item.key === "plaster")!.laborCost, 10 * P(16) * h, 0.05);

// التوقف عند نقص البيانات (لا تخمين)
const b1 = deriveProjectAreas({ ...input, rooms: [] });
truthy("no rooms blocks", !b1.ok && b1.blockers.length === 1 && b1.areas === null);
const b2 = deriveProjectAreas({ ...input, state: null });
truthy("no apartment state blocks", !b2.ok && b2.blockers[0].includes("حالة الشقة"));
const b3 = deriveProjectAreas({ ...input, ceilingHeight: null });
truthy("no ceiling height blocks", !b3.ok && b3.blockers[0].includes("ارتفاع السقف"));
const b4 = deriveProjectAreas({ ...input, rooms: [], state: null, ceilingHeight: 0 });
truthy("all three missing -> three blockers", b4.blockers.length === 3);

// تحذيرات
const wd = deriveProjectAreas({ ...input, declaredTotalArea: 150 });
truthy("declared area mismatch warns", wd.warnings.some((x) => x.includes("يختلف")));
const un = deriveProjectAreas({ ...input, rooms: [...rooms, R("غرفة الدريسنج", 6)] });
truthy("unclassified room warns", un.warnings.some((x) => x.includes("الدريسنج")));

// المحاكي والتقدير السريع لسه شغالين بنفس الجداول (تأكد من عدم كسر الواجهة القديمة)
const sim = computeBom(items, materials, [], { totalArea: 100, bedrooms: 3, bathrooms: 2, kitchens: 1, receptions: 1, plumbingInstall: "regular" }, labor);
eq("simulator wall_area = 100 x 2.8", sim.areas.wall_area, 280);
eq("simulator plumbing 2 bathrooms regular", sim.lumpLabor.find((l) => l.itemKey === "plumb")!.amount, 6500);
const quick = computeQuickBom(items, materials, [], { totalArea: 100, bedrooms: 3, bathrooms: 1, kitchens: 1, receptions: 1, state: "plastered", gypsumShare: 0.5, plumbingInstall: "buried" }, labor);
truthy("quick: plastered removes plaster, gypsum present", !quick.groups.some((x) => x.item.key === "plaster") && quick.groups.some((x) => x.item.key === "gypsum"));
eq("quick: lump labor counted once", quick.lumpLabor.filter((l) => l.itemKey === "electric").length, 1);
eq("quick: totals.labor includes lump", quick.totals.labor, quick.groups.reduce((s, x) => s + x.laborCost, 0) + 8000 + 6000, 0.05);
eq("simulator: flat gypsum defaults to whole ceiling, no pocket", sim.areas.flat_ceiling_area * 1000 + sim.areas.light_pocket_ml, 100 * 1000);
const simBricks = computeBom(items, materials, [], { totalArea: 100, bedrooms: 3, bathrooms: 2, kitchens: 1, receptions: 1, bricksCount: 5000 }, labor);
eq("simulator: masonry labor per 1000 bricks", simBricks.groups.find((x) => x.item.key === "masonry")!.laborCost, 3000, 0.05);
const simNoBricks = computeBom(items, materials, [], { totalArea: 100, bedrooms: 3, bathrooms: 2, kitchens: 1, receptions: 1 }, labor);
truthy("simulator: masonry per-1000 without bricks warns", simNoBricks.warnings.some((w) => w.includes("عدد الطوب")));

console.log(fails === 0 ? "\nALL TESTS PASSED" : `\n${fails} TEST(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);