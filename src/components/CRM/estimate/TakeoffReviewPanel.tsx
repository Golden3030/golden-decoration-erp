"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useCRM } from "@/components/CRM/context/CRMContext";
import GoldButton from "@/components/ui/GoldButton";
import ComparisonCard, { type ComparisonPayload } from "@/components/CRM/estimate/ComparisonCard";
import { fetchAiJson } from "@/lib/fetchAi";

// لوحة "مراجعة بالحصر" في تاب المقايسة: بتحسب حصر المشروع من الغرف الفعلية وتقارنه بالمقايسة المعتمدة. للمراجعة فقط، مفيش كتابة.
export default function TakeoffReviewPanel() {
  const { crmData } = useCRM();
  const project = crmData?.project;
  const projectSaved = !!project?.id && !String(project.id).startsWith("new") && !String(project.id).startsWith("d19b7d8d");

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [comparison, setComparison] = useState<ComparisonPayload | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

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
    } catch (e: any) {
      setComparison(null);
      setWarnings([]);
      setError(e?.message || "تعذّر إجراء المراجعة.");
    } finally {
      setLoading(false);
    }
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
          {comparison && <ComparisonCard comparison={comparison} />}
        </div>
      )}
    </div>
  );
}