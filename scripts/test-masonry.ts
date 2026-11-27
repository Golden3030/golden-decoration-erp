// اختبار حاسبة مباني التعديلات المعمارية. التشغيل: npx tsx scripts/test-masonry.ts
// كل النتايج محسوبة بالإيد.
import { computeMasonryMods, DEFAULT_MASONRY_PARAMS, type WallInput } from "../src/lib/masonryMods";

let fails = 0;
const eq = (name: string, got: number, want: number, tol = 0.0005) => {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: got ${got} want ${want}`);
};
const truthy = (name: string, v: boolean) => { if (!v) fails++; console.log(`${v ? "PASS" : "FAIL"}  ${name}`); };

const P = DEFAULT_MASONRY_PARAMS;
const wall: WallInput = {
  name: "قاطوع", lengthM: 3, heightM: 2.8, wet: false, doors: 1, doorWM: 0.9, doorHM: 2.1,
  windows: 0, windowWM: 0, windowHM: 0, oldWallJunctions: 1, toCeiling: true
};

// قاطوع 3 × 2.8 فيه باب 0.9 × 2.1: صافي المساحة 8.4 - 1.89 = 6.51 م²
// حلق الباب: مداميك = ceil(210 ÷ 7) = 30، طوبة على كل جنب = 2 × 30 = 60 طوبة صافي. المساحة 2 × 0.26 × 30 × 0.07 = 1.092 م² × 57.5 = 62.79 = 63 طوبة مصمتة
// المفرغ: 6.51 - 1.092 = 5.418 م² × 57.5 = 311.5 = 312 (دوبل × 29 = 157.1 = 158)
const r = computeMasonryMods([wall], P);
eq("net area 6.51", r.netAreaM2, 6.51);
eq("solid area (door jambs) 1.092", r.walls[0].solidAreaM2, 1.092);
eq("solid bricks 63", r.solidBricks, 63);
eq("hollow area 5.418", r.walls[0].hollowAreaM2, 5.418);
eq("hollow single bricks 312", r.hollowBricks, 312);
eq("total bricks 375", r.totalBricks, 375);
eq("hollow double bricks 158", computeMasonryMods([wall], { ...P, brick: "double" }).hollowBricks, 158);
// الأسمنت 6.51 × 11 = 71.61 كجم = شكارتين (50). الرمل 6.51 × 0.03 = 0.1953 م³
eq("cement 71.61 kg", r.cementKg, 71.61);
eq("cement bags 2", r.cementBags, 2);
eq("sand 0.1953 m3", r.sandM3, 0.1953);
// أشاير: جنب واحد × ceil(280 ÷ 45) = 7، 7 قطعة × 30 سم في سيخ 12 م (40 قطعة) = سيخ واحد
eq("dowels 7", r.dowels, 7);
eq("rebar 1 bar (40 pieces per 12 m)", r.rebarBars, 1);
eq("anchor holes 7", r.anchorHoles, 7);
// عتب: عرض الباب 0.9 + 2 × 0.2 = 1.3 م
eq("1 lintel", r.lintels, 1);
eq("lintel length 1.3", r.lintelLengthM, 1.3);
// فراغ تحت السقف 3 م. فايبر = جنب رأسي 2.8 + تحت السقف 3 = 5.8 م
eq("ceiling gap 3 m", r.ceilingGapM, 3);
eq("fiber 5.8 m", r.fiberM, 5.8);

// نفس القاطوع في حمام: أول 3 مداميك مصمتة على الطول بدون الباب: 3 × 0.07 × (3 - 0.9) = 0.441 م²
// حلق الباب بعد خصم 3 مداميك: 27 مدماك: 2 × 0.26 × 27 × 0.07 = 0.9828 م². المصمت = 1.4238 م² × 57.5 = 81.87 = 82
// المفرغ: 6.51 - 1.4238 = 5.0862 م² × 57.5 = 292.46 = 293
const wet = computeMasonryMods([{ ...wall, wet: true }], P);
eq("wet wall: solid area 1.4238", wet.walls[0].solidAreaM2, 1.4238, 1e-4);
eq("wet wall: solid bricks 82", wet.solidBricks, 82);
eq("wet wall: hollow bricks 293", wet.hollowBricks, 293);

// جنبين قديمين: أشاير 14 وفايبر 2×2.8 + 3 = 8.6 م. بدون سقف: بدون فراغ وفايبر 5.6 م
const two = computeMasonryMods([{ ...wall, oldWallJunctions: 2 }], P);
eq("two old-wall junctions: 14 dowels", two.dowels, 14);
eq("two old-wall junctions: fiber 8.6 m", two.fiberM, 8.6);
const noCeil = computeMasonryMods([{ ...wall, toCeiling: false }], P);
eq("no ceiling: no gap", noCeil.ceilingGapM, 0);
eq("no ceiling: fiber 2.8 m", noCeil.fiberM, 2.8);

// شباك 1.2 × 1.0: صافي 6.51 - 1.2 = 5.31 م²، عتبين (باب وشباك): 1.3 + 1.6 = 2.9 م
const win = computeMasonryMods([{ ...wall, windows: 1, windowWM: 1.2, windowHM: 1.0 }], P);
eq("window: net 5.31", win.netAreaM2, 5.31);
eq("window: 2 lintels", win.lintels, 2);
eq("window: lintel length 1.3 + 1.6 = 2.9", win.lintelLengthM, 2.9);

// طوبتين مصمت على كل جنب: مساحة الحلق ×2 = 2.184
const jamb2 = computeMasonryMods([wall], { ...P, jambSolidPerCourse: 2 });
eq("2 solid bricks per jamb course: solid area 2.184", jamb2.walls[0].solidAreaM2, 2.184);

// حيطتين: المجاميع من الأرقام قبل التقريب: صافي 6.51 + (4 × 2.8 = 11.2) = 17.71. أسمنت 17.71 × 11 = 194.81 كجم = 4 شكاير
const two2 = computeMasonryMods([wall, { ...wall, name: "حيطة 2", lengthM: 4, doors: 0, oldWallJunctions: 0 }], P);
eq("two walls: net 17.71", two2.netAreaM2, 17.71);
eq("two walls: cement 194.81 kg = 4 bags", two2.cementBags, 4);
// الحيطة 2 بدون باب: مفرغ فقط 11.2 × 57.5 = 644 طوبة
eq("wall 2 hollow bricks 644", two2.walls[1].hollowBricks, 644);
truthy("empty list warns", computeMasonryMods([], P).warnings.length === 1);

console.log(fails === 0 ? "\nALL TESTS PASSED" : `\n${fails} TEST(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);