// اختبار محاكي القص. التشغيل: npx tsx scripts/test-cutting.ts
// كل النتايج المتوقعة محسوبة بالإيد (مكتوب الحساب جنب كل فحص).
import { simulateTiling, type TileSpec } from "../src/lib/cuttingEngine";

let fails = 0;
const eq = (name: string, got: number | null, want: number | null, tol = 0.0005) => {
  const ok = got === want || (got !== null && want !== null && Math.abs(got - want) <= tol);
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: got ${got} want ${want}`);
};
const truthy = (name: string, v: boolean) => { if (!v) fails++; console.log(`${v ? "PASS" : "FAIL"}  ${name}`); };

const base: TileSpec = { widthCm: 60, lengthCm: 60, groutMm: 3, minOffcutCm: 10, reuseOffcuts: true, allowRotate: true, piecesPerBox: 4 };
const bath = [{ name: "حمام 2×2.8", widthM: 2, lengthM: 2.8 }];

// مثال الحمام 2 × 2.8 م، بلاط 60×60، فوغة 3 مم:
// أعمدة: 0 و603 و1206 و1809 (آخر قطعة 191)، صفوف: 0 و603 و1206 و1809 و2412 (آخر قطعة 388)
// كامل = 3 × 4 = 12. قطع = 4 (191×600) + 3 (600×388) + 1 (191×388) = 8
const r = simulateTiling(base, bath, "along_length");
eq("bathroom: full tiles = 12", r.totals.fullTiles, 12);
eq("bathroom: cut pieces = 8", r.totals.cutPieces, 8);
// ثلاث 600×388 تفتح 3 بلاطات (باقي 600×212 كل واحدة)، ثلاث 191×600 تتقص مدورة من القصاصات (600×191)،
// الرابعة تفتح بلاطة رابعة (باقي 409×600)، والركن 191×388 يتقص منها. يعني 4 بلاطات مفتوحة.
eq("bathroom: opened tiles = 4", r.totals.openedTiles, 4);
eq("bathroom: reused pieces = 4 (3 rotated + corner)", r.totals.reusedPieces, 4);
eq("bathroom: total tiles = 16", r.totals.totalTiles, 16);
eq("bathroom: boxes of 4 = 4", r.totals.boxes, 4);
eq("bathroom: purchased m2 = 16 x 0.36", r.totals.purchasedM2, 5.76);
// المركّب = 12×0.36 + 3×0.2328 + 4×0.1146 + 0.074108 = 5.550908
eq("bathroom: placed m2", r.totals.placedM2, 5.550908, 0.00001);
eq("bathroom: waste m2 = 5.76 - 5.550908", r.totals.wasteM2, 0.209092, 0.00001);
eq("bathroom: waste pct of purchased = 3.63", r.totals.wastePct, 3.6300, 0.01);
eq("bathroom: over net surface (5.6 m2) = 2.857%", r.totals.overNetPct, 2.857, 0.01);
eq("bathroom: usable leftovers at the end = 2 (218x600, 191x212)", r.totals.usableLeftovers, 2);

// بدون إعادة استخدام القصاصات: كل قطعة مقصوصة تفتح بلاطة = 12 + 8 = 20
const noReuse = simulateTiling({ ...base, reuseOffcuts: false }, bath, "along_length");
eq("no reuse: total tiles = 20", noReuse.totals.totalTiles, 20);
truthy("reuse saves tiles vs no reuse", r.totals.totalTiles < noReuse.totals.totalTiles);

// بدون تدوير القصاصات: 3 بلاطات للـ 388 + بلاطة للأول من 191×600 (باقي 409) تخدم التاني (باقي 218) والتالت،
// والرابع يفتح بلاطة (باقي 409) والركن يتقص منها = 5 بلاطات مفتوحة، المجموع 17
const noRot = simulateTiling({ ...base, allowRotate: false }, bath, "along_length");
eq("no rotation: opened tiles = 5, total = 17", noRot.totals.totalTiles, 17);

// أقل قصاصة 30 سم (300 مم): باقي الـ 388 (600×212) مرفوض لأن 212 < 300، فالتلات قطع 600×388 تفتح 3 بلاطات.
// 191×600: الأولى تفتح بلاطة (باقي 409×600 صالح)، التانية منه (باقي 218×600 مرفوض)، التالتة تفتح بلاطة، الرابعة منها،
// والركن 191×388 يفتح بلاطة (مفيش قصاصة): 3 + 2 + 1 = 6 مفتوحة، المجموع 12 + 6 = 18
const bigMin = simulateTiling({ ...base, minOffcutCm: 30 }, bath, "along_length");
eq("min offcut 30 cm: 6 opened, 18 tiles", bigMin.totals.totalTiles, 18);
truthy("stricter min offcut costs more tiles than 10 cm", bigMin.totals.totalTiles > r.totals.totalTiles);

// تطابق تام: 1.2 × 1.2 م بلاط 60×60 بدون فوغة = 4 بلاطات كاملة، صفر قص، صفر هالك
const exact = simulateTiling({ ...base, groutMm: 0 }, [{ name: "مربع", widthM: 1.2, lengthM: 1.2 }], "along_length");
eq("exact fit: 4 full tiles", exact.totals.fullTiles, 4);
eq("exact fit: no cuts", exact.totals.cutPieces, 0);
eq("exact fit: waste = 0", exact.totals.wasteM2, 0, 1e-9);

// بلاط 30×60 على 1.0 × 2.4 م بدون فوغة:
//  طولي (30 على x): 3 أعمدة كاملة + قطعة 100، 4 صفوف كاملة = 12 كامل. قطع 4 (100×600):
//  الأولى تفتح بلاطة (باقي 200×600)، التانية منها (باقي 100×600)، التالتة منها، الرابعة تفتح بلاطة = 2 مفتوحة، المجموع 14
//  عرضي: 600 على x: عمود كامل + قطعة 400، 8 صفوف: 8 كامل + 8 قطع 400×300 كل واحدة بلاطة = 16
const t3060: TileSpec = { ...base, widthCm: 30, lengthCm: 60, groutMm: 0 };
const surf = [{ name: "جدار", widthM: 1, lengthM: 2.4 }];
const al = simulateTiling(t3060, surf, "along_length");
const aw = simulateTiling(t3060, surf, "along_width");
eq("30x60 along length: 14 tiles", al.totals.totalTiles, 14);
eq("30x60 along width: 16 tiles", aw.totals.totalTiles, 16);
const auto = simulateTiling(t3060, surf, "auto");
eq("auto picks the cheaper orientation (14)", auto.totals.totalTiles, 14);
truthy("auto reports its orientation", auto.orientation === "along_length");

// أسطح متعددة تتشارك القصاصات: سطحين متطابقين 1.0 × 2.4 (30×60) = أقل من ضعف بلاط الواحد
const two = simulateTiling(t3060, [surf[0], { ...surf[0], name: "جدار 2" }], "along_length");
truthy("two surfaces share offcuts (< 2 x single)", two.totals.totalTiles < 2 * al.totals.totalTiles);
eq("two surfaces: net area = 4.8", two.totals.netAreaM2, 4.8);
eq("cells of the bathroom = 12 full + 8 cut = 20", r.surfaces[0].cells.length, 20);
truthy("cells are tagged: 12 full, 4 new cuts, 4 reused", r.surfaces[0].cells.filter((c) => c.kind === "full").length === 12 && r.surfaces[0].cells.filter((c) => c.kind === "cut_new").length === 4 && r.surfaces[0].cells.filter((c) => c.kind === "cut_reuse").length === 4);

// تحذير القطع الضيقة (أقل من 5 سم): 1.23 م عرض بلاط 60 = بواقي 30 مم
const sliver = simulateTiling({ ...base, groutMm: 0 }, [{ name: "ضيق", widthM: 1.23, lengthM: 1.2 }], "along_length");
truthy("sliver warning for a 30 mm strip", sliver.warnings.some((w) => w.includes("ضيقة")));
truthy("invalid tile size is rejected", simulateTiling({ ...base, widthCm: 0 }, bath).warnings.length > 0);

console.log(fails === 0 ? "\nALL TESTS PASSED" : `\n${fails} TEST(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);