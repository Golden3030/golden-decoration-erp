// حاسبة سقف جبس بورد فلات: ألواح + أعواد زاوية أو شادو جاب + أعواد سي + أعواد أوميجا + وصلات + كليبسات + تيش.
// النظام القياسي (بحسب اللي حدده المستخدم): أعواد 3 م، سي كل 80 سم، أوميجا كل 60 سم (أو 40/50)، تيش كل 80 إلى 100 سم.
// دوال بحتة. الألواح بمحرك قص 2D، والأعواد بمحرك قص 1D (best-fit مع وصلات).

import { simulateTiling, type TilingResult } from "@/lib/cuttingEngine";
import { simulateLinear, type LinearResult } from "@/lib/linearCutting";

export type EdgeType = "angle" | "shadow_gap";          // زاوية عادية أو شادو جاب
export type CDirection = "along_length" | "along_width"; // اتجاه أعواد السي

export interface FlatCeilingInput {
  widthM: number;            // عرض السقف
  lengthM: number;           // طول السقف
  boardWidthCm: number;      // مقاس اللوح (120)
  boardLengthCm: number;     // (240)
  barLengthM: number;        // طول العود القياسي (3)
  edge: EdgeType;
  cSpacingCm: number;        // تباعد السي (80)
  omegaSpacingCm: number;    // تباعد الأوميجا (40 أو 50 أو 60)
  hangerSpacingCm: number;   // تباعد التيش على طول عود السي (80 إلى 100)
  cDirection: CDirection;
  kerfMm: number;            // فاقد القص
  skipEdge?: boolean;        // بدون زاوية/شادو جاب على المحيط (لما بيت النور هو اللي بيمسك الحيطان)
}

export interface ProfileLine {
  rows: number;              // عدد الصفوف (للسي والأوميجا)
  rowLengthM: number;
  result: LinearResult;
}

export interface FlatCeilingResult {
  boards: TilingResult;
  edge: { type: EdgeType; perimeterM: number; result: LinearResult };
  c: ProfileLine;
  omega: ProfileLine;
  hangers: number;           // تيش
  clips: number;             // كليبسات تقاطع سي × أوميجا
  connectors: number;        // وصلات سي وأوميجا (لتوصيل الأعواد)
  layout: { widthM: number; lengthM: number; cDirection: CDirection; hangersPerRow: number }; // للرسم التوضيحي
  assumptions: string[];
  warnings: string[];
}

const BAR_OPTS = { minOffcutMm: 100, allowSplice: true, shareBars: true };

// عدد الصفوف = البعد ÷ التباعد مقرّب لأعلى، بالسنتيمتر ومع هامش صغير لتفادي أخطاء الكسور (14 ÷ 0.4 مثلاً)
export const ceilDiv = (aM: number, spacingCm: number) => Math.ceil((aM * 100) / spacingCm - 1e-9);

export function computeFlatGypsumCeiling(inp: FlatCeilingInput): FlatCeilingResult {
  const warnings: string[] = [];
  const W = inp.widthM;
  const L = inp.lengthM;
  const bar = Math.round(inp.barLengthM * 1000);
  const kerf = Math.max(0, Math.round(inp.kerfMm));
  const lin = (name: string, lengths: { lengthM: number; count: number }[]) =>
    simulateLinear({ stockMm: bar, kerfMm: kerf, ...BAR_OPTS }, lengths.map((l) => ({ name, ...l })));

  // ألواح الجبس: قص 2D بدون فاصل
  const boards = simulateTiling(
    { widthCm: inp.boardWidthCm, lengthCm: inp.boardLengthCm, groutMm: 0, minOffcutCm: 10, reuseOffcuts: true, allowRotate: true },
    [{ name: "السقف", widthM: W, lengthM: L }],
    "auto"
  );

  // الزاوية أو الشادو جاب على المحيط كله
  const perimeterM = 2 * (W + L);
  const edge = inp.skipEdge
    ? lin("-", [])
    : lin(inp.edge === "angle" ? "زاوية" : "شادو جاب", [{ lengthM: W, count: 2 }, { lengthM: L, count: 2 }]);

  // السي في الاتجاه المختار: صفوف بتتوزع على البعد التاني بتباعد السي
  const cAlongLength = inp.cDirection === "along_length";
  const cRowLen = cAlongLength ? L : W;        // طول عود السي الواحد = بعد السقف في اتجاهه
  const across = cAlongLength ? W : L;         // البعد اللي بتتوزع عليه صفوف السي
  const cRows = Math.max(1, ceilDiv(across, inp.cSpacingCm));
  const cRes = lin("سي", [{ lengthM: cRowLen, count: cRows }]);

  // الأوميجا متعامدة على السي: صفوفها بتتوزع على طول السي بتباعد الأوميجا
  const omegaRowLen = across;
  const omegaRows = Math.max(1, ceilDiv(cRowLen, inp.omegaSpacingCm));
  const omegaRes = lin("أوميجا", [{ lengthM: omegaRowLen, count: omegaRows }]);

  const hangersPerRow = Math.max(1, ceilDiv(cRowLen, inp.hangerSpacingCm));
  const hangers = hangersPerRow * cRows;
  const clips = cRows * omegaRows;
  const connectors = cRes.totals.splices + omegaRes.totals.splices;

  const assumptions = [
    `السي ${cRows} صفوف كل ${inp.cSpacingCm} سم، كل صف ${cRowLen} م في اتجاه ${cAlongLength ? "الطول" : "العرض"}.`,
    `الأوميجا ${omegaRows} صفوف كل ${inp.omegaSpacingCm} سم، متعامدة على السي، كل صف ${omegaRowLen} م.`,
    `عدد الصفوف = البعد ÷ التباعد مقرّب لأعلى.`,
    `التيش ${hangersPerRow} لكل صف سي (كل ${inp.hangerSpacingCm} سم)، والكليبسات = صفوف السي × صفوف الأوميجا (نقطة تقاطع لكل كليبس).`,
    inp.skipEdge
      ? "الزاوية على الحيطان محسوبة ضمن بيت النور (مش بتتكرر هنا)."
      : `${inp.edge === "angle" ? "الزاوية" : "الشادو جاب"} على محيط السقف كله (${perimeterM} م طولي). مش بيتجمع الاتنين في السقف الفلات.`,
    "الأعواد بتتقص بأقل هالك: القطعة الأطول من العود بتتوصّل، والباقي بيتستخدم في قطع تانية.",
    "ألواح الجبس بدون فاصل بينها، وبتتقص مع إعادة استخدام القصاصات."
  ];
  if (inp.cSpacingCm > 100 || inp.omegaSpacingCm > 60) warnings.push("التباعد أكبر من المعتمد (سي حتى 100 سم، أوميجا حتى 60 سم): ممكن يحصل ترخيم.");
  [boards.warnings, edge.warnings, cRes.warnings, omegaRes.warnings].forEach((w) => warnings.push(...w));

  return {
    boards,
    edge: { type: inp.edge, perimeterM, result: edge },
    c: { rows: cRows, rowLengthM: cRowLen, result: cRes },
    omega: { rows: omegaRows, rowLengthM: omegaRowLen, result: omegaRes },
    hangers,
    clips,
    connectors,
    layout: { widthM: W, lengthM: L, cDirection: inp.cDirection, hangersPerRow },
    assumptions,
    warnings
  };
}