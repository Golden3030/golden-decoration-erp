"use client";

import React, { useRef, useState } from "react";
import { X } from "lucide-react";
import { isOnline } from "@/lib/offline-sync";

type Mode = "project" | "quick";

interface EstimateLine { stage: string; item: string; quantity: number; unit: string; basis: string }
interface EstimateResult {
  mode: Mode;
  lines: EstimateLine[];
  totals: { floorArea: number; netWallArea: number; plasterArea: number; paintArea: number; ceilingArea: number };
  assumptions: string[];
  warnings: string[];
  cost: { level: string; min: number; max: number } | null;
  costNote: string;
  analysis: string;
  whatsappMessage: string;
}

interface Props {
  projects: any[];
  loadingProjects: boolean;
  onClose: () => void;
}

const fmt = (n: number) => Number(n).toLocaleString("en-US");

const COUNT_OPTIONS = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

const selectClass =
  "w-full h-11 rounded-lg bg-[#020B1C] border border-[#D4AF37]/30 text-white px-3 outline-none text-xs font-bold";
const labelClass = "block text-xs mb-2 font-black text-[#D4AF37]";

export default function EstimateAssistantModal({ projects, loadingProjects, onClose }: Props) {
  const [mode, setMode] = useState<Mode>("project");
  const [projectId, setProjectId] = useState("");

  // بيانات التقدير السريع
  const [totalArea, setTotalArea] = useState("");
  const [bedrooms, setBedrooms] = useState("3");
  const [bathrooms, setBathrooms] = useState("2");
  const [receptions, setReceptions] = useState("1");
  const [kitchens, setKitchens] = useState("1");
  const [state, setState] = useState<"brick" | "plastered">("brick");
  const [level, setLevel] = useState<"economic" | "medium" | "luxury">("medium");
  const [ceilingKinds, setCeilingKinds] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  function resetResult() {
    setResult(null);
    setCopied(false);
  }

  function toggleCeilingKind(kind: string) {
    resetResult();
    setCeilingKinds((prev) => (prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]));
  }

  async function handleRun() {
    if (!isOnline()) {
      alert("عذراً، يتطلب حصر الكميات اتصالاً نشطاً بالإنترنت.");
      return;
    }
    if (mode === "project" && !projectId) {
      alert("يرجى اختيار المشروع أولاً.");
      return;
    }
    if (mode === "quick" && !(Number(totalArea) > 0)) {
      alert("أدخل مساحة الشقة بالمتر المربع.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 58000);

    setLoading(true);
    resetResult();
    try {
      const body =
        mode === "project"
          ? { mode, projectId }
          : {
              mode,
              quick: {
                totalArea: Number(totalArea),
                bedrooms: Number(bedrooms),
                bathrooms: Number(bathrooms),
                receptions: Number(receptions),
                kitchens: Number(kitchens),
                state,
                level,
                ceilingKinds
              }
            };

      const res = await fetch("/api/ai/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const raw = await res.text();
      let data: any = null;
      try { data = JSON.parse(raw); } catch { /* الرد ليس JSON */ }
      if (!res.ok || !data) {
        throw new Error(
          data?.error ||
            (res.status === 504 || res.status === 408
              ? "انتهت مهلة الخادم، حاول مرة أخرى."
              : "رد الخادم بخطأ غير متوقع (" + res.status + ").")
        );
      }
      setResult(data as EstimateResult);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        if (abortRef.current === controller) alert("استغرق الحصر وقتاً طويلاً وتم إيقافه، حاول مرة أخرى.");
      } else {
        alert("حدث خطأ أثناء حصر الكميات: " + err.message);
      }
    } finally {
      clearTimeout(timeoutId);
      if (abortRef.current === controller) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  }

  async function handleCopy() {
    if (!result?.whatsappMessage) return;
    try {
      await navigator.clipboard.writeText(result.whatsappMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("تعذّر النسخ، انسخ الرسالة يدوياً.");
    }
  }

  function handleClose() {
    abortRef.current?.abort();
    abortRef.current = null;
    onClose();
  }

  // تجميع بنود الحصر حسب المرحلة
  const stages: { name: string; items: EstimateLine[] }[] = [];
  (result?.lines || []).forEach((l) => {
    let s = stages.find((x) => x.name === l.stage);
    if (!s) { s = { name: l.stage, items: [] }; stages.push(s); }
    s.items.push(l);
  });

  const toggleBtn = (active: boolean) =>
    `h-11 rounded-xl border text-xs font-bold transition-all ${
      active
        ? "bg-[#D4AF37] text-[#020B1C] border-[#D4AF37]"
        : "bg-[#020B1C] text-white border-[#243556] hover:border-[#D4AF37]"
    }`;

  return (
    <div className="w-full max-w-2xl bg-[#07132a] border border-[#D4AF37]/40 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
      <div className="p-4 bg-[#0b1d3d] border-b border-[#D4AF37]/20 flex justify-between items-center" dir="rtl">
        <span className="text-[#A17A4C] font-black text-xs md:text-sm">📐 مهندس التسعير وحساب الكميات | جولدن ديكوريشن</span>
        <button
          onClick={handleClose}
          className="w-8 h-8 rounded-full bg-[#020B1C] border border-[#D4AF37]/30 text-[#D4AF37] hover:text-red-400 hover:border-red-500/20 transition-all flex items-center justify-center"
        >
          <X size={14} />
        </button>
      </div>

      <div className="p-6 overflow-y-auto flex-1 ai-chat-scroll space-y-5 text-right" dir="rtl">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={toggleBtn(mode === "project")} onClick={() => { setMode("project"); resetResult(); }}>
            مشروع مسجل
          </button>
          <button type="button" className={toggleBtn(mode === "quick")} onClick={() => { setMode("quick"); resetResult(); }}>
            تقدير سريع لعميل جديد
          </button>
        </div>

        {mode === "project" ? (
          <div className="space-y-3">
            <p className="text-white text-xs font-semibold">
              يقرأ الحصر مساحات الغرف وأسقف الجبس وحالة الشقة والارتفاع من بيانات المشروع نفسه.
            </p>
            <label className={labelClass}>اختر المشروع *</label>
            <select
              value={projectId}
              onChange={(e) => { setProjectId(e.target.value); resetResult(); }}
              disabled={loadingProjects}
              className={selectClass}
            >
              <option value="">{loadingProjects ? "جاري جلب المشاريع الحالية..." : "اختر المشروع التابع للعميل..."}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_name} ({p.location})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-white text-xs font-semibold">
              لعميل لم يُسجَّل بعد: اكتب بيانات الشقة كما قالها وخذ تقديراً مبدئياً للرد عليه قبل المقايسة الحقيقية.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>مساحة الشقة (م²) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={totalArea}
                  onChange={(e) => { setTotalArea(e.target.value.replace(/[^0-9.]/g, "")); resetResult(); }}
                  placeholder="مثال: 120"
                  className={selectClass}
                />
              </div>
              <div>
                <label className={labelClass}>غرف النوم</label>
                <select value={bedrooms} onChange={(e) => { setBedrooms(e.target.value); resetResult(); }} className={selectClass}>
                  {COUNT_OPTIONS(0, 8).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>الحمامات</label>
                <select value={bathrooms} onChange={(e) => { setBathrooms(e.target.value); resetResult(); }} className={selectClass}>
                  {COUNT_OPTIONS(1, 6).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>قطع الريسبشن</label>
                <select value={receptions} onChange={(e) => { setReceptions(e.target.value); resetResult(); }} className={selectClass}>
                  {COUNT_OPTIONS(1, 4).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>المطابخ</label>
                <select value={kitchens} onChange={(e) => { setKitchens(e.target.value); resetResult(); }} className={selectClass}>
                  {COUNT_OPTIONS(1, 2).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>حالة الشقة</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={toggleBtn(state === "brick")} onClick={() => { setState("brick"); resetResult(); }}>على الطوب الأحمر</button>
                <button type="button" className={toggleBtn(state === "plastered")} onClick={() => { setState("plastered"); resetResult(); }}>على المحارة</button>
              </div>
            </div>

            <div>
              <label className={labelClass}>مستوى التشطيب</label>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" className={toggleBtn(level === "economic")} onClick={() => { setLevel("economic"); resetResult(); }}>اقتصادي</button>
                <button type="button" className={toggleBtn(level === "medium")} onClick={() => { setLevel("medium"); resetResult(); }}>متوسط</button>
                <button type="button" className={toggleBtn(level === "luxury")} onClick={() => { setLevel("luxury"); resetResult(); }}>لوكس</button>
              </div>
            </div>

            <div>
              <label className={labelClass}>جبس بورد في (اختياري)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { k: "reception", t: "الريسبشن" },
                  { k: "bedroom", t: "غرف النوم" },
                  { k: "corridor", t: "الطرقة" }
                ].map((o) => (
                  <button key={o.k} type="button" className={toggleBtn(ceilingKinds.includes(o.k))} onClick={() => toggleCeilingKind(o.k)}>
                    {o.t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && (
          <button
            onClick={handleRun}
            className="w-full h-11 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F1E5C6] hover:from-[#B48C34] hover:to-[#E5D7B3] text-[#020B1C] font-black text-xs transition-all"
          >
            {mode === "project" ? "🔍 تشغيل حصر الكميات للمشروع" : "⚡ احسب التقدير السريع"}
          </button>
        )}

        {loading && (
          <div className="bg-[#020B1C] border border-[#D4AF37]/20 rounded-xl p-6 text-center text-gray-400 text-xs font-bold flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" />
            جاري حساب الكميات ومراجعتها...
          </div>
        )}

        {result && (
          <div className="space-y-4 select-text">
            {result.warnings.length > 0 && (
              <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-4 space-y-2">
                <h4 className="text-amber-400 font-black text-xs">⚠️ نقاط تحتاج مراجعة</h4>
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-amber-100 text-xs font-bold leading-relaxed">• {w}</p>
                ))}
              </div>
            )}

            {result.mode === "quick" && (
              <div className="bg-[#020B1C] border border-[#D4AF37]/40 rounded-xl p-4">
                {result.cost ? (
                  <>
                    <p className="text-[#D4AF37] font-black text-xs">التكلفة التقديرية (مستوى {result.cost.level})</p>
                    <p className="text-white font-black text-lg mt-1">
                      {fmt(result.cost.min)} – {fmt(result.cost.max)} جنيه
                    </p>
                    <p className="text-gray-400 text-[10px] font-bold mt-1">تقدير مبدئي غير ملزم لحين المعاينة والمقايسة.</p>
                  </>
                ) : (
                  <p className="text-gray-300 text-xs font-bold">{result.costNote}</p>
                )}
              </div>
            )}

            {stages.map((s) => (
              <div key={s.name} className="bg-[#020B1C] border border-[#D4AF37]/30 rounded-xl p-4 space-y-3">
                <h4 className="text-[#A17A4C] font-black text-xs border-r-2 border-[#D4AF37] pr-2">{s.name}</h4>
                {s.items.map((l) => (
                  <div key={l.item} className="border-b border-[#1f2d4d] last:border-0 pb-2 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-white text-xs font-black">{l.item}</span>
                      <span className="text-[#D4AF37] text-xs font-black" dir="ltr">
                        {fmt(l.quantity)} {l.unit}
                      </span>
                    </div>
                    <p className="text-gray-500 text-[10px] font-bold mt-1 leading-relaxed">{l.basis}</p>
                  </div>
                ))}
              </div>
            ))}

            <details className="bg-[#020B1C] border border-[#1f2d4d] rounded-xl p-4">
              <summary className="text-[#D4AF37] font-black text-xs cursor-pointer">الافتراضات المستخدمة في الحساب</summary>
              <div className="mt-3 space-y-2">
                {result.assumptions.map((a, i) => (
                  <p key={i} className="text-gray-300 text-[11px] font-bold leading-relaxed">• {a}</p>
                ))}
              </div>
            </details>

            {result.analysis && (
              <div className="bg-[#020B1C] border border-[#D4AF37]/30 rounded-xl p-4">
                <p className="text-gray-300 text-xs whitespace-pre-wrap leading-relaxed font-sans font-bold">{result.analysis}</p>
              </div>
            )}

            {result.whatsappMessage && (
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 space-y-3">
                <h4 className="text-emerald-400 font-black text-xs">💬 رسالة جاهزة للعميل</h4>
                <p className="text-white text-xs whitespace-pre-wrap leading-relaxed font-bold">{result.whatsappMessage}</p>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="h-9 px-4 rounded-full bg-emerald-500 text-[#020B1C] font-black text-xs"
                >
                  {copied ? "تم النسخ ✓" : "نسخ الرسالة"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}