// مقارنة حصر الكميات (من الغرف الفعلية) بالمقايسة المعتمدة للمشروع، على مستوى القسم (التصنيف).
// دوال بحتة بدون كتابة في أي مكان: المقارنة للمراجعة فقط.
// ملاحظة: التكلفة هي المقارنة العادلة بين الاتنين لأن بنود المقايسة وبنود الحصر مش بنفس التقسيم.

import { categoryNames } from "@/lib/categoryMeta";
import type { BomResult } from "@/lib/bomEngine";

export interface EstimateItemLike {
  category?: string | null;
  quantity?: number | string | null;
  unit_price?: number | string | null;
  labor_cost?: number | string | null;
}

export type CompareStatus = "match" | "review" | "only_takeoff" | "only_estimate" | "not_covered";

export interface CompareRow {
  category: string;
  label: string;
  takeoffMaterials: number;
  takeoffLabor: number;
  takeoffTotal: number;
  estimateMaterials: number;
  estimateLabor: number;
  estimateTotal: number;
  diff: number;                 // الحصر ناقص المقايسة
  diffPct: number | null;       // نسبة الفرق من المقايسة (null لو المقايسة صفر)
  status: CompareStatus;
}

export interface CompareResult {
  rows: CompareRow[];
  covered: { takeoff: number; estimate: number; diff: number; diffPct: number | null }; // الأقسام اللي بيغطيها الحصر بس
  outsideScopeEstimate: number;                                                         // أقسام في المقايسة مش بيغطيها الحصر (أبواب، تكييف...)
  notes: string[];
}

export const REVIEW_THRESHOLD_PCT = 15; // فرق أكبر من 15% في قسم = يحتاج مراجعة

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const round = (n: number) => Math.round(n);

export function compareTakeoffToEstimate(
  bom: BomResult,
  estimateItems: EstimateItemLike[],
  coveredCategories: string[]
): CompareResult {
  const takeoff: Record<string, { m: number; l: number }> = {};
  const add = (cat: string, m: number, l: number) => {
    const t = (takeoff[cat] ||= { m: 0, l: 0 });
    t.m += m;
    t.l += l;
  };
  for (const g of bom.groups) add(g.item.estimate_category || "decorations", g.materialsCost, g.laborCost);
  for (const l of bom.lumpLabor) add(l.category || "decorations", 0, l.amount);

  const estimate: Record<string, { m: number; l: number }> = {};
  for (const it of estimateItems) {
    const cat = it.category || "decorations";
    if (cat === "engineering_fee") continue; // هامش الإشراف نسبة محسوبة، مش بند
    const e = (estimate[cat] ||= { m: 0, l: 0 });
    e.m += num(it.quantity) * num(it.unit_price);
    e.l += num(it.labor_cost);
  }

  const covered = new Set(coveredCategories);
  const cats = Array.from(new Set([...Object.keys(takeoff), ...Object.keys(estimate)]));
  const order = Object.keys(categoryNames);
  cats.sort((a, b) => (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b)));

  const rows: CompareRow[] = cats.map((cat) => {
    const t = takeoff[cat] || { m: 0, l: 0 };
    const e = estimate[cat] || { m: 0, l: 0 };
    const tt = t.m + t.l;
    const et = e.m + e.l;
    const diff = tt - et;
    const diffPct = et > 0 ? (diff / et) * 100 : null;
    let status: CompareStatus;
    if (!covered.has(cat)) status = "not_covered";
    else if (et === 0 && tt > 0) status = "only_takeoff";
    else if (tt === 0 && et > 0) status = "only_estimate";
    else status = diffPct !== null && Math.abs(diffPct) > REVIEW_THRESHOLD_PCT ? "review" : "match";
    return {
      category: cat,
      label: categoryNames[cat] || cat,
      takeoffMaterials: round(t.m), takeoffLabor: round(t.l), takeoffTotal: round(tt),
      estimateMaterials: round(e.m), estimateLabor: round(e.l), estimateTotal: round(et),
      diff: round(diff),
      diffPct: diffPct === null ? null : Math.round(diffPct * 10) / 10,
      status
    };
  });

  const inScope = rows.filter((r) => r.status !== "not_covered");
  const tTotal = inScope.reduce((s, r) => s + r.takeoffTotal, 0);
  const eTotal = inScope.reduce((s, r) => s + r.estimateTotal, 0);
  const outside = rows.filter((r) => r.status === "not_covered").reduce((s, r) => s + r.estimateTotal, 0);

  const notes: string[] = [
    "المقارنة بالتكلفة لكل قسم. بنود المقايسة بتتسعّر من المنتجات المختارة في التابات، وبنود الحصر من أسعار جداول الحصر، فجزء من الفرق ممكن يكون فرق سعر مش فرق كمية.",
    `الفرق = الحصر ناقص المقايسة. القسم اللي فرقه أكبر من ${REVIEW_THRESHOLD_PCT}% بيتعلّم "يحتاج مراجعة".`
  ];
  if (outside > 0) notes.push("أقسام المقايسة اللي الحصر مش بيغطيها (مثل الأبواب والتكييف) بتظهر لوحدها ومش داخلة في فرق الإجمالي.");

  return {
    rows,
    covered: {
      takeoff: tTotal, estimate: eTotal, diff: tTotal - eTotal,
      diffPct: eTotal > 0 ? Math.round(((tTotal - eTotal) / eTotal) * 1000) / 10 : null
    },
    outsideScopeEstimate: outside,
    notes
  };
}