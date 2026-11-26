// حاسبة سقف جبس بورد بيت نور: السقف الفلات كامل + بيت النور (رف ساقط) حوالين المحيط.
// حسب وصف المستخدم: بيت النور بيتضاف لحسابات السقف الفلات، والزاوية على الحيطان بتتحسب في بيت النور (مش بتتكرر في الفلات).
//
// نموذج بيت النور (كل الأرقام قابلة للتعديل):
//  - رف عرضه S من الحيطان (تحت السقف الفلات)، وجنب ساقط ارتفاعه D وفوقه مراية ارتفاعها M حوالين الحافة الداخلية.
//  - المحيط الداخلي = (العرض - 2S) و(الطول - 2S). شريط الليد بيمشي عليه.
//  - زاوية: على الحيطان (المحيط الخارجي) + على المحيط الداخلي.
//  - أوميجا: مدادات عرضية طولها S كل تباعد على المحيط الخارجي + أوميجا طولي للمراية على المحيط الداخلي.
//  - سي: قوايم رأسية كل تباعد على المحيط الداخلي، طول القائم = ارتفاع السقوط والمراية (الافتراضي D + M).
//  - ألواح بيت النور: بتتقطع لشرائح بالطول: شرائح الرف (عرض S) وشرائح الجنب والمراية (عرض D + M)، وكل شرائح بتتوزع بقص الأطوال.

import { computeFlatGypsumCeiling, ceilDiv, type FlatCeilingInput, type FlatCeilingResult } from "@/lib/gypsumCeiling";
import { simulateLinear, type LinearResult } from "@/lib/linearCutting";

export interface PocketInput {
  flat: FlatCeilingInput;       // السقف الفلات (الأبعاد، اللوح، العود، التباعدات...)
  shelfCm: number;              // عرض الرف (40 إلى 50)
  dropCm: number;               // سقوط بيت النور (10 إلى 15)
  mirrorCm: number;             // ارتفاع المراية (5 إلى 7)
  crossSpacingCm: number;       // تباعد المدادات العرضية (أوميجا) (40 إلى 50)
  studSpacingCm: number;        // تباعد القوايم الرأسية (سي) (60 إلى 80)
  studHeightCm?: number;        // طول القائم (الافتراضي = السقوط + المراية)
}

export interface PocketResult {
  flat: FlatCeilingResult;
  innerWidthM: number;
  innerLengthM: number;
  outerPerimeterM: number;
  innerPerimeterM: number;
  angle: LinearResult;                              // زاوية: حيطان + محيط داخلي
  omega: LinearResult;                              // مدادات + مراية
  crossPieces: number;                              // عدد المدادات العرضية
  studs: LinearResult;                              // قوايم سي
  studPieces: number;
  shelfStrips: { strips: number; perBoard: number; boards: number; result: LinearResult };
  lipStrips: { strips: number; perBoard: number; boards: number; result: LinearResult };
  pocketBoards: number;                             // ألواح بيت النور
  ledM: number;                                     // شريط الليد
  assumptions: string[];
  warnings: string[];
}

export function computeLightPocketCeiling(inp: PocketInput): PocketResult {
  const f = inp.flat;
  const W = f.widthM;
  const L = f.lengthM;
  const S = inp.shelfCm / 100;
  const warnings: string[] = [];
  const Wi = W - 2 * S;
  const Li = L - 2 * S;
  if (!(Wi > 0) || !(Li > 0)) warnings.push("عرض الرف كبير على أبعاد السقف: المحيط الداخلي بقى صفر أو سالب.");
  const wi = Math.max(0, Wi);
  const li = Math.max(0, Li);
  const bar = Math.round(f.barLengthM * 1000);
  const lin = (name: string, stockMm: number, lengths: { lengthM: number; count: number }[]) =>
    simulateLinear({ stockMm, kerfMm: Math.max(0, Math.round(f.kerfMm)), minOffcutMm: 100, allowSplice: true, shareBars: true }, lengths.map((l) => ({ name, ...l })));

  // السقف الفلات كامل، من غير زاوية الحيطان (هي في بيت النور)
  const flat = computeFlatGypsumCeiling({ ...f, skipEdge: true });

  const outerPerimeterM = 2 * (W + L);
  const innerPerimeterM = 2 * (wi + li);

  const angle = lin("زاوية", bar, [
    { lengthM: W, count: 2 }, { lengthM: L, count: 2 }, { lengthM: wi, count: 2 }, { lengthM: li, count: 2 }
  ].filter((p) => p.lengthM > 0));

  const crossPieces = ceilDiv(outerPerimeterM, inp.crossSpacingCm);
  const omega = lin("أوميجا", bar, [
    { lengthM: S, count: crossPieces }, { lengthM: wi, count: 2 }, { lengthM: li, count: 2 }
  ].filter((p) => p.lengthM > 0));

  const studH = (inp.studHeightCm ?? inp.dropCm + inp.mirrorCm) / 100;
  const studPieces = innerPerimeterM > 0 ? ceilDiv(innerPerimeterM, inp.studSpacingCm) : 0;
  const studs = lin("سي رأسي", bar, studPieces > 0 ? [{ lengthM: studH, count: studPieces }] : []);

  // ألواح بيت النور كشرائح: كل لوح بيتقطع بالطول لشرائح بعرض معين، وطول الشريحة = طول اللوح
  const boardLenMm = Math.round(f.boardLengthCm * 10);
  const strips = (widthCm: number, lengths: { lengthM: number; count: number }[]) => {
    const perBoard = Math.max(0, Math.floor(f.boardWidthCm / widthCm + 1e-9));
    const result = lin("شريحة", boardLenMm, lengths.filter((p) => p.lengthM > 0));
    return { strips: result.totals.barsCount, perBoard, boards: perBoard > 0 ? Math.ceil(result.totals.barsCount / perBoard) : 0, result };
  };
  // الرف: أضلاع على الحيطان بطول الطول كامل، وبينهم أضلاع (العرض - 2S)
  const shelfStrips = strips(inp.shelfCm, [{ lengthM: L, count: 2 }, { lengthM: wi, count: 2 }]);
  // الجنب الساقط والمراية: على المحيط الداخلي، عرض الشريحة = السقوط + المراية
  const lipStrips = strips(inp.dropCm + inp.mirrorCm, [{ lengthM: wi, count: 2 }, { lengthM: li, count: 2 }]);
  if (shelfStrips.perBoard < 1 || lipStrips.perBoard < 1) warnings.push("عرض الشريحة أكبر من عرض اللوح.");

  [angle.warnings, omega.warnings, studs.warnings, flat.warnings].forEach((w) => warnings.push(...w));

  const assumptions = [
    `رف بيت النور ${inp.shelfCm} سم من الحيطان، وسقوط ${inp.dropCm} سم، ومراية ${inp.mirrorCm} سم. المحيط الداخلي ${wi.toFixed(2)} × ${li.toFixed(2)} م (${innerPerimeterM.toFixed(1)} م).`,
    "السقف الفلات بيتحسب كامل لأبعاد الغرفة، وبيت النور بيتضاف حواليه (بحسب وصفك).",
    `الزاوية: على الحيطان (${outerPerimeterM} م) وعلى المحيط الداخلي (${innerPerimeterM.toFixed(1)} م).`,
    `الأوميجا: ${crossPieces} مداد عرضي (كل ${inp.crossSpacingCm} سم، طول المداد ${inp.shelfCm} سم) + أوميجا طولي للمراية على المحيط الداخلي.`,
    `السي: ${studPieces} قائم رأسي (كل ${inp.studSpacingCm} سم) طول القائم ${Math.round(studH * 100)} سم.`,
    `ألواح بيت النور: شرائح الرف (${inp.shelfCm} سم، ${shelfStrips.perBoard} من اللوح) وشرائح الجنب والمراية (${inp.dropCm + inp.mirrorCm} سم، ${lipStrips.perBoard} من اللوح)، وكل الشرائح بتتوزع بقص الأطوال مع وصلات.`,
    "شريط الليد = المحيط الداخلي.",
    ...flat.assumptions.filter((a) => !a.includes("مش بتتكرر"))
  ];

  return {
    flat, innerWidthM: wi, innerLengthM: li, outerPerimeterM, innerPerimeterM,
    angle, omega, crossPieces, studs, studPieces, shelfStrips, lipStrips,
    pocketBoards: shelfStrips.boards + lipStrips.boards,
    ledM: innerPerimeterM, assumptions, warnings
  };
}