// اختبار حاسبة سقف بيت النور. التشغيل: npx tsx scripts/test-gypsum-pocket.ts
// سقف 3 × 4 م، رف 40 سم، سقوط 15، مراية 6، مداد كل 40، قائم كل 60. كل النتايج محسوبة بالإيد.
import { computeLightPocketCeiling, type PocketInput } from "../src/lib/gypsumPocket";

let fails = 0;
const eq = (name: string, got: number, want: number, tol = 0.0005) => {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: got ${got} want ${want}`);
};
const truthy = (name: string, v: boolean) => { if (!v) fails++; console.log(`${v ? "PASS" : "FAIL"}  ${name}`); };

const base: PocketInput = {
  flat: { widthM: 3, lengthM: 4, boardWidthCm: 120, boardLengthCm: 240, barLengthM: 3, edge: "angle", cSpacingCm: 80, omegaSpacingCm: 60, hangerSpacingCm: 90, cDirection: "along_length", kerfMm: 0 },
  shelfCm: 40, dropCm: 15, mirrorCm: 6, crossSpacingCm: 40, studSpacingCm: 60
};
const r = computeLightPocketCeiling(base);

// المحيط الداخلي (3 - 0.8) × (4 - 0.8) = 2.2 × 3.2 = محيط 10.8 م (مش 12 م زي ما كان مكتوب)
eq("inner width 2.2", r.innerWidthM, 2.2);
eq("inner length 3.2", r.innerLengthM, 3.2);
eq("inner perimeter 10.8 m", r.innerPerimeterM, 10.8);
eq("LED = 10.8 m", r.ledM, 10.8);

// الزاوية: حيطان 3+3+4+4 + داخلي 2.2+2.2+3.2+3.2 = 24.8 م.
// القطع بعد التوصيل: 6 أعواد كاملة (3 من كل 3 و4 و3.2)، 2.2 و2.2 في عودين، البواقي 1 و1 في عود، 0.2 و0.2 في بواقي العودين = 9 أعواد
eq("angle: required 24.8 m", r.angle.totals.requiredMm, 24800);
eq("angle: 9 bars (27 m purchased)", r.angle.totals.barsCount, 9);

// الأوميجا: مدادات = ceil(14 ÷ 0.4) = 35 قطعة 40 سم (14 م) + مراية 2.2×2 + 3.2×2 (10.8 م) = 24.8 م.
// 3.2 = عود + 0.2 (×2) = عودين كاملين، 2.2 و2.2 في عودين (باقي 0.8: 2 مداد في كل واحد = 4 مدادات)،
// باقي 31 مداد ÷ 7 في العود = 5 أعواد. المجموع 9
eq("omega: 35 cross pieces", r.crossPieces, 35);
eq("omega: required 24.8 m", r.omega.totals.requiredMm, 24800);
eq("omega: 9 bars", r.omega.totals.barsCount, 9);

// السي: قوايم ceil(10.8 ÷ 0.6) = 18 قائم، طول القائم 15 + 6 = 21 سم. 14 قائم في العود (2.94 م) = عودين
eq("studs: 18 pieces", r.studPieces, 18);
eq("studs: 2 bars", r.studs.totals.barsCount, 2);

// ألواح بيت النور:
// شرائح الرف (40 سم، 3 من اللوح): 4 + 4 + 2.2 + 2.2 من شرائح 2.4 م = 2.4+2.4 (كاملين)، 2.2، 2.2، و1.6، 1.6 = 6 شرائح = لوحين
// شرائح الجنب والمراية (21 سم، 5 من اللوح): 2.2×2 + 3.2×2 = 2.4+2.4 (كاملين) + 2.2 + 2.2 + 0.8 + 0.8 (في شريحة) = 5 شرائح = لوح
eq("shelf strips: 3 per board", r.shelfStrips.perBoard, 3);
eq("shelf strips: 6", r.shelfStrips.strips, 6);
eq("shelf boards: 2", r.shelfStrips.boards, 2);
eq("lip strips: 5 per board (120 ÷ 21)", r.lipStrips.perBoard, 5);
eq("lip strips: 5", r.lipStrips.strips, 5);
eq("lip boards: 1", r.lipStrips.boards, 1);
eq("pocket boards = 3", r.pocketBoards, 3);

// السقف الفلات كامل: ألواح 5، سي 6 أعواد، أوميجا 7، تيش 20، كليبسات 28، وبدون زاوية (هي في بيت النور)
eq("flat boards 5", r.flat.boards.totals.totalTiles, 5);
eq("flat C bars 6", r.flat.c.result.totals.barsCount, 6);
eq("flat omega bars 7", r.flat.omega.result.totals.barsCount, 7);
eq("flat hangers 20", r.flat.hangers, 20);
eq("flat clips 28", r.flat.clips, 28);
eq("flat has no edge bars (the angle is counted in the pocket)", r.flat.edge.result.totals.barsCount, 0);

// رف 50 سم: داخلي 2.0 × 3.0 = 10 م. مدادات ceil(14 ÷ 0.4) = 35 بطول 50 سم. شرائح الرف 120 ÷ 50 = 2 من اللوح
const wide = computeLightPocketCeiling({ ...base, shelfCm: 50 });
eq("shelf 50 cm: inner perimeter 10 m", wide.innerPerimeterM, 10);
eq("shelf 50 cm: 2 strips per board", wide.shelfStrips.perBoard, 2);
// رف كبير جداً (160 سم): تحذير
truthy("shelf too wide warns", computeLightPocketCeiling({ ...base, shelfCm: 160 }).warnings.some((x) => x.includes("عرض الرف")));
// تباعد القوايم 80: ceil(10.8 ÷ 0.8) = 14 قائم
eq("studs every 80 cm: 14", computeLightPocketCeiling({ ...base, studSpacingCm: 80 }).studPieces, 14);

console.log(fails === 0 ? "\nALL TESTS PASSED" : `\n${fails} TEST(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);