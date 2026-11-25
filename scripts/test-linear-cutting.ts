// اختبار قص الأطوال (1D). التشغيل: npx tsx scripts/test-linear-cutting.ts
// النتايج المتوقعة محسوبة بالإيد.
import { simulateLinear, type LinearSpec } from "../src/lib/linearCutting";
import { simulateTiling } from "../src/lib/cuttingEngine";

let fails = 0;
const eq = (name: string, got: number, want: number, tol = 0.0005) => {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: got ${got} want ${want}`);
};
const truthy = (name: string, v: boolean) => { if (!v) fails++; console.log(`${v ? "PASS" : "FAIL"}  ${name}`); };

const spec: LinearSpec = { stockMm: 3000, kerfMm: 0, minOffcutMm: 100, allowSplice: true, shareBars: true };

// زاوية حول غرفة 3 × 4 م (3 و4 و3 و4) من قضبان 3 م:
// 3000 = قضيب كامل. 4000 = قضيب كامل + 1000 (وصلة). 3000 = قضيب. 4000 = قضيب + 1000.
// الـ 1000 + 1000 في قضيب واحد (باقي 1000). المجموع 5 قضبان = 15 م، المطلوب 14 م، الهالك 1 م
const room = simulateLinear(spec, [{ name: "ضلع 3", lengthM: 3, count: 2 }, { name: "ضلع 4", lengthM: 4, count: 2 }]);
eq("room perimeter: required 14 m", room.totals.requiredMm, 14000);
eq("room perimeter: 5 bars", room.totals.barsCount, 5);
eq("room perimeter: purchased 15 m", room.totals.purchasedMm, 15000);
eq("room perimeter: waste 1 m", room.totals.wasteMm, 1000);
eq("room perimeter: waste pct 6.67", room.totals.wastePct, 6.6667, 0.01);
eq("room perimeter: 2 splices", room.totals.splices, 2);
eq("room perimeter: one usable leftover of 1 m", room.totals.leftoverMm, 1000);

// المنشار 5 مم: 3 قطع × 1000 = 3000 + منشارين 10 = 3010 > 3000 فمحتاج قضيبين. بدون منشار قضيب واحد
const k0 = simulateLinear(spec, [{ name: "ق", lengthM: 1, count: 3 }]);
const k5 = simulateLinear({ ...spec, kerfMm: 5 }, [{ name: "ق", lengthM: 1, count: 3 }]);
eq("kerf 0: 1 bar", k0.totals.barsCount, 1);
eq("kerf 5 mm: 2 bars (3010 > 3000)", k5.totals.barsCount, 2);

// قضيب 3000 بقطعة 2000 وقطعة 1000 بمنشار 5: الأولى تاخد 2005 (باقي 995)، التانية 1000 > 995 فمش داخلة = قضيبين.
// أما 2000 + 995 = 2995 فتدخل في قضيب واحد (آخر قطعة ما بتحتاج منشار)
const tight = simulateLinear({ ...spec, kerfMm: 5 }, [{ name: "أ", lengthM: 2, count: 1 }, { name: "ب", lengthM: 0.995, count: 1 }]);
eq("kerf: 2000 + 995 fit one bar (last cut needs no kerf)", tight.totals.barsCount, 1);
const tight2 = simulateLinear({ ...spec, kerfMm: 5 }, [{ name: "أ", lengthM: 2, count: 1 }, { name: "ب", lengthM: 1, count: 1 }]);
eq("kerf: 2000 + 1000 need two bars", tight2.totals.barsCount, 2);

// بدون توصيل: قطعة 4 م أطول من القضيب = تحذير ومش بتتحسب
const noSplice = simulateLinear({ ...spec, allowSplice: false }, [{ name: "طويلة", lengthM: 4, count: 1 }, { name: "عادية", lengthM: 2, count: 1 }]);
truthy("splice off: long piece warns and is skipped", noSplice.warnings.length === 1 && noSplice.totals.barsCount === 1);

// بدون مشاركة: كل قطعة قضيب لوحدها = 4 قطع 1 م = 4 قضبان، ومع المشاركة قضيب 3 م واحد + قضيب
const noShare = simulateLinear({ ...spec, shareBars: false }, [{ name: "ق", lengthM: 1, count: 4 }]);
const share = simulateLinear(spec, [{ name: "ق", lengthM: 1, count: 4 }]);
eq("no sharing: 4 bars", noShare.totals.barsCount, 4);
eq("sharing: 2 bars (3 + 1)", share.totals.barsCount, 2);

// best-fit: قطع 1.5 و1.5 و1.0 و2.0: الأطول 2.0 (قضيب 1 باقي 1.0)، 1.5 (قضيب 2 باقي 1.5)، 1.5 (قضيب 2 باقي 0)،
// 1.0 (أصغر باقي كفاية: 1.0 من قضيب 1) = قضيبين بدون هالك
const bf = simulateLinear(spec, [{ name: "ا", lengthM: 2, count: 1 }, { name: "ب", lengthM: 1.5, count: 2 }, { name: "ج", lengthM: 1, count: 1 }]);
eq("best-fit: 2 bars, zero waste", bf.totals.barsCount, 2);
eq("best-fit: waste = 0", bf.totals.wasteMm, 0);
truthy("invalid stock length rejected", simulateLinear({ ...spec, stockMm: 0 }, []).warnings.length === 1);

// ألواح جبس بورد 120 × 240 سم على سقف 3 × 4 م (بدون فاصل): بالإيد 2 كامل + 4 قطع،
// 3 ألواح اتفتحت، المجموع 5 ألواح = 14.4 م² للسقف 12 م²، الهالك 2.4 م² (16.67% من المشترى)
const board = simulateTiling({ widthCm: 120, lengthCm: 240, groutMm: 0, minOffcutCm: 10, reuseOffcuts: true, allowRotate: true, piecesPerBox: undefined }, [{ name: "سقف 3×4", widthM: 3, lengthM: 4 }], "along_length");
eq("gypsum boards: 2 full", board.totals.fullTiles, 2);
eq("gypsum boards: 4 cut pieces", board.totals.cutPieces, 4);
eq("gypsum boards: 3 opened, 5 total", board.totals.totalTiles, 5);
eq("gypsum boards: purchased 14.4 m2", board.totals.purchasedM2, 14.4);
eq("gypsum boards: waste 2.4 m2", board.totals.wasteM2, 2.4, 1e-6);
eq("gypsum boards: waste pct 16.67", board.totals.wastePct, 16.6667, 0.01);

console.log(fails === 0 ? "\nALL TESTS PASSED" : `\n${fails} TEST(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);