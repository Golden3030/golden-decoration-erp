// اختبار حاسبة سقف الجبس بورد الفلات. التشغيل: npx tsx scripts/test-gypsum-ceiling.ts
// السقف 3 × 4 م بالنظام القياسي. كل النتايج محسوبة بالإيد.
import { computeFlatGypsumCeiling, type FlatCeilingInput } from "../src/lib/gypsumCeiling";

let fails = 0;
const eq = (name: string, got: number, want: number, tol = 0.0005) => {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: got ${got} want ${want}`);
};
const truthy = (name: string, v: boolean) => { if (!v) fails++; console.log(`${v ? "PASS" : "FAIL"}  ${name}`); };

const base: FlatCeilingInput = {
  widthM: 3, lengthM: 4, boardWidthCm: 120, boardLengthCm: 240, barLengthM: 3, edge: "angle",
  cSpacingCm: 80, omegaSpacingCm: 60, hangerSpacingCm: 90, cDirection: "along_length", kerfMm: 0
};
const r = computeFlatGypsumCeiling(base);

// الألواح: 2 كامل + 4 قطع، 3 مفتوحة = 5 ألواح (14.4 م² لسقف 12 م²)
eq("boards: 5", r.boards.totals.totalTiles, 5);
// المحيط 14 م: 3 + 3 + 4 + 4. 3 = عود. 4 = عود + 1 م. الباقيين 1 م + 1 م في عود = 5 أعواد
eq("edge perimeter 14 m", r.edge.perimeterM, 14);
eq("edge: 5 bars", r.edge.result.totals.barsCount, 5);
// السي في اتجاه الطول 4 م: صفوف = ceil(3 / 0.8) = ceil(3.75) = 4 صفوف × 4 م = 16 م
eq("C rows = ceil(3/0.8) = 4", r.c.rows, 4);
eq("C required length 16 m", r.c.result.totals.requiredMm, 16000);
// كل صف 4 م = عود 3 م + 1 م. الـ 4 قطع 1 م تتوزع على عودين = 4 + 2 = 6 أعواد (مش 5: 5 أعواد = 15 م أقل من 16 م)
eq("C bars = 6 (5 bars = 15 m cannot cover 16 m)", r.c.result.totals.barsCount, 6);
// الأوميجا: صفوف = ceil(4 / 0.6) = ceil(6.67) = 7 صفوف × 3 م = 21 م = 7 أعواد بالظبط
eq("omega rows = ceil(4/0.6) = 7", r.omega.rows, 7);
eq("omega required 21 m", r.omega.result.totals.requiredMm, 21000);
eq("omega bars = 7 (each row is exactly one 3 m bar)", r.omega.result.totals.barsCount, 7);
// التيش: ceil(4 / 0.9) = 5 لكل صف × 4 صفوف = 20
eq("hangers = 5 x 4 = 20", r.hangers, 20);
// الكليبسات: 4 × 7 = 28
eq("clips = 4 x 7 = 28", r.clips, 28);
// الوصلات: كل صف سي 4 م متوصّل مرة = 4، والأوميجا 0
eq("connectors = 4 (one per C row)", r.connectors, 4);

// التيش كل 100 سم: ceil(4/1.0) = 4 × 4 = 16
eq("hangers at 100 cm = 16", computeFlatGypsumCeiling({ ...base, hangerSpacingCm: 100 }).hangers, 16);

// أوميجا كل 40 سم: ceil(4/0.4) = 10 صفوف = 10 أعواد 3 م
const o40 = computeFlatGypsumCeiling({ ...base, omegaSpacingCm: 40 });
eq("omega at 40 cm = 10 rows", o40.omega.rows, 10);
eq("omega at 40 cm = 10 bars", o40.omega.result.totals.barsCount, 10);

// السي في اتجاه العرض (3 م): صفوف = ceil(4 / 0.8) = 5 × 3 م = 5 أعواد بالظبط.
// الأوميجا متعامدة: صفوف = ceil(3 / 0.6) = 5 صفوف × 4 م = 5 أعواد + 5 قطع 1 م (عودين) = 7. الكليبسات 25، التيش 4 × 5 = 20
const w = computeFlatGypsumCeiling({ ...base, cDirection: "along_width" });
eq("C along width: rows = 5", w.c.rows, 5);
eq("C along width: 5 bars", w.c.result.totals.barsCount, 5);
eq("omega perpendicular: rows = ceil(3/0.6) = 5", w.omega.rows, 5);
eq("omega perpendicular: 7 bars", w.omega.result.totals.barsCount, 7);
eq("clips = 5 x 5 = 25", w.clips, 25);
eq("hangers = ceil(3/0.9) x 5 = 4 x 5 = 20", w.hangers, 20);

// مع منشار 3 مم: ثلاث قطع 1 م في عود 3 م مش هتتحمّل (التالتة 994 مم)، فالأوميجا في اتجاه السي العرضي تحتاج 5 + 3 = 8 أعواد
const wk = computeFlatGypsumCeiling({ ...base, cDirection: "along_width", kerfMm: 3 });
eq("kerf 3 mm: omega perpendicular needs 8 bars (2 pieces of 1 m per bar)", wk.omega.result.totals.barsCount, 8);

// بيانات الرسم التوضيحي: أبعاد السقف واتجاه السي وعدد التيش لكل صف (ceil(4/0.9) = 5)
truthy("layout data for the drawing", r.layout.widthM === 3 && r.layout.lengthM === 4 && r.layout.cDirection === "along_length" && r.layout.hangersPerRow === 5);

// شادو جاب بدل الزاوية: نفس الأطوال والعدد
const sg = computeFlatGypsumCeiling({ ...base, edge: "shadow_gap" });
eq("shadow gap: same 5 bars", sg.edge.result.totals.barsCount, 5);
truthy("shadow gap is named in the assumptions", sg.assumptions.some((a) => a.includes("الشادو جاب")));
truthy("wide spacing warns", computeFlatGypsumCeiling({ ...base, omegaSpacingCm: 80 }).warnings.some((x) => x.includes("ترخيم")));

console.log(fails === 0 ? "\nALL TESTS PASSED" : `\n${fails} TEST(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);