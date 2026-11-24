"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useCRM } from "@/components/CRM/context/CRMContext";
import GoldButton from "@/components/ui/GoldButton";
import ComparisonCard, { type ComparisonPayload } from "@/components/CRM/estimate/ComparisonCard";
import { fetchAiJson } from "@/lib/fetchAi";
import type { EstimateLineShape } from "@/lib/bomEngine";

// لوحة "مراجعة بالحصر" في تاب المقايسة: بتحسب حصر المشروع من الغرف الفعلية وتقارنه بالمقايسة المعتمدة. للمراجعة فقط، مفيش كتابة.
export default function TakeoffReviewPanel() {
  const { crmData, updateBulkFinishingSection } = useCRM();
  const project = crmData?.project;
  const projectSaved = !!project?.id && !String(project.id).startsWith("new") && !String(project.id).startsWith("d19b7d8d");

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [comparison, setComparison] = useState<ComparisonPayload | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [lines, setLines] = useState<EstimateLineShape[]>([]);
  const [selected, setSelected] = useState<string[]>([]);   // الأقسام المختارة للتطبيق
  const [message, setMessage] = useState("");
  const existingQuick = crmData?.finishing?.quickBom;

  async function run() {
    if (!projectSaved) return;
    setLoading(true);
    setError("");
    try {
      // reviewOnly: حصر + مقارنة بدون شرح الذكاء الاصطناعي (أسرع وبدون تكلفة)
      const data = await fetchAiJson("/api/ai/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "project", projectId: project!.id, reviewOnly: true })
      });
      setComparison(data.comparison || null);
      setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
      setLines(Array.isArray(data.lines) ? data.lines : []);
      // الافتراضي: الأقسام الناقصة من المقايسة بس (عشان ما تتكررش بنودها)
      setSelected((data.comparison?.rows || []).filter((r: any) => r.status === "only_takeoff").map((r: any) => r.category));
      setMessage("");
    } catch (e: any) {
      setComparison(null);
      setWarnings([]);
      setLines([]);
      setSelected([]);
      setError(e?.message || "تعذّر إجراء المراجعة.");
    } finally {
      setLoading(false);
    }
  }

  const isFinal = comparison?.estimate?.status === "نهائية";
  const lineCost = (l: EstimateLineShape) => (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0) + (Number(l.laborCost) || 0);
  const chosenLines = lines.filter((l) => selected.includes(l.category));
  const chosenCost = chosenLines.reduce((s, l) => s + lineCost(l), 0);

  function toggleCategory(cat: string) {
    setSelected((p) => (p.includes(cat) ? p.filter((c) => c !== cat) : [...p, cat]));
    setMessage("");
  }

  // تطبيق الأقسام المختارة على المقايسة المبدئية: بنفس مسار الحصر السريع (قسم quickBom). مفيش لمس لبنود التابات.
  function apply() {
    if (isFinal) { setMessage("المقايسة المعتمدة نهائية. التطبيق متاح على المقايسة المبدئية فقط."); return; }
    if (chosenLines.length === 0) { setMessage("اختار قسم واحد على الأقل فيه حصر."); return; }
    const labels = (comparison?.rows || []).filter((r) => selected.includes(r.category)).map((r) => r.label).join("، ");
    const replacing = existingQuick?.enabled && Array.isArray(existingQuick.lines) && existingQuick.lines.length > 0;
    const ok = window.confirm(
      `تطبيق ${chosenLines.length} بند على المقايسة المبدئية؟\n` +
      `الأقسام: ${labels}\n` +
      `التكلفة المضافة التقريبية: ${Math.round(chosenCost).toLocaleString("en-US")} جنيه\n` +
      (replacing ? `تنبيه: هتستبدل ${existingQuick.lines.length} بند حصر سريع مضافين حالياً.\n` : "") +
      `بنود التابات التفصيلية ما بتتغيرش. لو القسم له بنود في التابات هتتكرر.`
    );
    if (!ok) return;
    let materials = 0, labor = 0;
    chosenLines.forEach((l) => { materials += (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0); labor += Number(l.laborCost) || 0; });
    updateBulkFinishingSection("quickBom", {
      enabled: true,
      lines: chosenLines,
      input: { source: "project_rooms", categories: selected },
      totals: { materials, labor, grand: materials + labor },
      createdAt: new Date().toISOString()
    });
    setMessage(`تمت إضافة ${chosenLines.length} بند للمقايسة المبدئية. بتتحفظ تلقائياً. أعد المراجعة بعد حفظ المقايسة لمقارنة جديدة.`);
  }

  return (
    <div className="p-5 rounded-2xl bg-[#07132a] border border-[#D4AF37]/30 space-y-4 text-right" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-[#D4AF37] font-black text-sm">مراجعة المقايسة بالحصر</h4>
          <p className="text-gray-400 text-[11px] font-bold mt-1">بيحسب الحصر من مساحات الغرف الفعلية ويقارنه بالمقايسة، لاكتشاف بند ناقص أو كمية بعيدة.</p>
        </div>
        <GoldButton toggle active={open} onClick={() => setOpen((v) => !v)}>{open ? "إخفاء" : "فتح"}</GoldButton>
      </div>

      {open && (
        <div className="space-y-3">
          {!projectSaved ? (
            <p className="text-amber-300 text-xs font-bold">احفظ المشروع الأول عشان تقدر تراجع المقايسة بالحصر.</p>
          ) : (
            <GoldButton size="lg" className="w-full" onClick={run} disabled={loading}>
              {loading ? <Loader2 className="animate-spin w-4 h-4" /> : comparison ? "إعادة المراجعة" : "ابدأ المراجعة"}
            </GoldButton>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-3 text-rose-300 text-xs font-bold whitespace-pre-line">{error}</div>
          )}
          {warnings.map((w) => (
            <p key={w} className="text-amber-300 text-[11px] font-bold bg-amber-950/20 border border-amber-500/30 rounded-lg p-2">⚠️ {w}</p>
          ))}
          {comparison && (
            <ComparisonCard
              comparison={comparison}
              selectable={comparison.estimate && !isFinal ? { selected, onToggle: toggleCategory } : undefined}
            />
          )}

          {comparison?.estimate && isFinal && (
            <p className="text-gray-400 text-[11px] font-bold">المقايسة المعتمدة نهائية: المقارنة للمراجعة فقط، والتطبيق متاح على المقايسة المبدئية فقط.</p>
          )}

          {comparison?.estimate && !isFinal && lines.length > 0 && (
            <div className="rounded-xl border border-[#D4AF37]/30 bg-[#020B1C] p-3 space-y-2">
              <p className="text-gray-300 text-[11px] font-bold">
                المختار للتطبيق: {chosenLines.length} بند، تكلفة تقريبية {Math.round(chosenCost).toLocaleString("en-US")} جنيه
              </p>
              <GoldButton size="lg" className="w-full" onClick={apply} disabled={chosenLines.length === 0}>
                طبّق الأقسام المختارة على المقايسة المبدئية
              </GoldButton>
            </div>
          )}

          {message && <p className="text-emerald-300 text-xs font-bold">{message}</p>}
        </div>
      )}
    </div>
  );
}