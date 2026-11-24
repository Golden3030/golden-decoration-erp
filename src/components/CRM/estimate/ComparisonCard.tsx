"use client";

import ToggleSwitch from "@/components/ui/ToggleSwitch";

// كارت مقارنة الحصر بالمقايسة (مشترك بين شاشة التسعير الذكي ولوحة "مراجعة بالحصر" في تاب المقايسة)

export interface CompareRowPayload {
  category: string;
  label: string;
  takeoffMaterials: number;
  takeoffLabor: number;
  takeoffTotal: number;
  estimateMaterials: number;
  estimateLabor: number;
  estimateTotal: number;
  diff: number;
  diffPct: number | null;
  status: "match" | "review" | "only_takeoff" | "only_estimate" | "not_covered";
}

export interface ComparisonPayload {
  estimate: { number: string | null; status: string | null; itemsCount: number } | null;
  message?: string;
  rows?: CompareRowPayload[];
  covered?: { takeoff: number; estimate: number; diff: number; diffPct: number | null };
  outsideScopeEstimate?: number;
  notes?: string[];
}

export const COMPARE_STATUS: Record<CompareRowPayload["status"], { label: string; cls: string }> = {
  match: { label: "مطابق تقريباً", cls: "text-emerald-300 border-emerald-500/40 bg-emerald-950/20" },
  review: { label: "يحتاج مراجعة", cls: "text-amber-300 border-amber-500/40 bg-amber-950/20" },
  only_takeoff: { label: "في الحصر فقط", cls: "text-amber-300 border-amber-500/40 bg-amber-950/20" },
  only_estimate: { label: "في المقايسة فقط", cls: "text-rose-300 border-rose-500/40 bg-rose-950/20" },
  not_covered: { label: "خارج نطاق الحصر", cls: "text-gray-400 border-[#1f2d4d] bg-[#07132a]" }
};

export const signed = (n: number) => (n > 0 ? "+" : "") + Math.round(n).toLocaleString("en-US");
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

interface Props {
  comparison: ComparisonPayload;
  include?: boolean;                       // حالة تضمين المقارنة في التقرير (اختياري)
  onIncludeChange?: (next: boolean) => void;
  // اختيار الأقسام اللي تتطبق على المقايسة المبدئية (لوحة المراجعة في تاب المقايسة)
  selectable?: { selected: string[]; onToggle: (category: string) => void };
}

export default function ComparisonCard({ comparison, include, onIncludeChange, selectable }: Props) {
  return (
    <div className="bg-[#020B1C] border border-[#D4AF37]/50 rounded-xl p-4 space-y-3" dir="rtl">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[#D4AF37] font-black text-sm border-r-4 border-[#D4AF37] pr-2">مقارنة الحصر بالمقايسة</h4>
        {comparison.estimate && onIncludeChange && (
          <ToggleSwitch checked={!!include} onChange={onIncludeChange} ariaLabel="تضمين المقارنة في التقرير" />
        )}
      </div>

      {!comparison.estimate ? (
        <p className="text-gray-400 text-xs font-bold">{comparison.message}</p>
      ) : (
        <>
          <p className="text-gray-400 text-[11px] font-bold">
            المقايسة رقم {comparison.estimate.number || "-"}
            {comparison.estimate.status ? ` (${comparison.estimate.status})` : ""}، عدد بنودها {comparison.estimate.itemsCount}
          </p>

          {(comparison.rows || []).map((r) => (
            <div key={r.category} className="rounded-lg border border-[#1f2d4d] bg-[#07132a] p-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-white text-xs font-black">{r.label}</p>
                <span className={`text-[10px] font-black border rounded-full px-2 py-0.5 whitespace-nowrap ${COMPARE_STATUS[r.status].cls}`}>
                  {COMPARE_STATUS[r.status].label}
                </span>
              </div>
              {selectable && r.takeoffTotal > 0 && r.status !== "not_covered" && (
                <ToggleSwitch
                  checked={selectable.selected.includes(r.category)}
                  onChange={() => selectable.onToggle(r.category)}
                  label="طبّق هذا القسم على المقايسة المبدئية"
                  className="w-full"
                />
              )}
              <div className="grid grid-cols-3 gap-2 text-[11px] font-bold">
                <div><p className="text-gray-500">الحصر</p><p className="text-white">{fmt(r.takeoffTotal)}</p></div>
                <div><p className="text-gray-500">المقايسة</p><p className="text-white">{fmt(r.estimateTotal)}</p></div>
                <div>
                  <p className="text-gray-500">الفرق</p>
                  <p className={r.status === "match" ? "text-emerald-300" : r.status === "not_covered" ? "text-gray-400" : "text-amber-300"} dir="ltr">
                    {signed(r.diff)}{r.diffPct !== null ? ` (${r.diffPct}%)` : ""}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {comparison.covered && (
            <div className="flex justify-between text-xs font-black text-white border-t border-[#1f2d4d] pt-2">
              <span>إجمالي الأقسام المغطاة بالحصر (فرق)</span>
              <span dir="ltr" className="text-[#D4AF37]">
                {signed(comparison.covered.diff)}{comparison.covered.diffPct !== null ? ` (${comparison.covered.diffPct}%)` : ""}
              </span>
            </div>
          )}

          {(comparison.notes || []).map((n) => (
            <p key={n} className="text-gray-500 text-[10px] font-bold leading-relaxed">• {n}</p>
          ))}
        </>
      )}
    </div>
  );
}