"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isOnline } from "@/lib/offline-sync";
import GoldButton from "@/components/ui/GoldButton";
import CloseButton from "@/components/ui/CloseButton";
import { quickRoomNames } from "@/lib/takeoffEngine";
import { DEFAULT_FINISH_LEVEL, FINISH_LEVELS, type FinishLevel } from "@/lib/finishLevels";
import { AREA_LABELS, PLUMBING_INSTALL_LABELS, type Basis, type PlumbingInstall } from "@/lib/bomEngine";
import { openReportPdf } from "@/lib/reportPrint";
import ToggleSwitch from "@/components/ui/ToggleSwitch";

type Mode = "project" | "quick";

interface EstimateLine { stage: string; item: string; quantity: number; unit: string; basis: string }
interface BomPayloadLine { name: string; quantity: number; unit: string; unitPrice: number; cost: number; basis: string }
interface BomPayloadGroup {
  key: string; name: string; materialsCost: number; laborCost: number; laborLines: { name: string; unit: string; base: number; rate: number; cost: number }[]; lines: BomPayloadLine[];
}
interface BomPayload {
  areas: Record<string, number>;
  groups: BomPayloadGroup[];
  lump: { name: string; amount: number; basis: string }[];
  info: { label: string; value: string }[];
  totals: { materials: number; labor: number; grand: number; unpricedLines: number };
  note: string;
}
interface EstimateResult {
  mode: Mode;
  bom: BomPayload | null;
  lines: EstimateLine[];
  totals: { floorArea: number; netWallArea: number; plasterArea: number; paintArea: number; ceilingArea: number };
  assumptions: string[];
  warnings: string[];
  cost: { level: string; min: number; max: number } | null;
  duration: { minDays: number; maxDays: number } | null;
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
  const [level, setLevel] = useState<FinishLevel>(DEFAULT_FINISH_LEVEL);
  const [corridors, setCorridors] = useState("1");
  const [ceilingRooms, setCeilingRooms] = useState<string[]>([]);
  const [plumbingInstall, setPlumbingInstall] = useState<"" | PlumbingInstall>("");
  const [excludedStages, setExcludedStages] = useState<string[]>([]); // بنود مستبعدة من تقرير الـ PDF
  const [includeLump, setIncludeLump] = useState(true);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  // غرف الشقة الناتجة من الأعداد المختارة، وتُستخدم لاختيار غرف الجبس بورد بالاسم
  const roomOptions = quickRoomNames({
    bedrooms: Number(bedrooms),
    bathrooms: Number(bathrooms),
    receptions: Number(receptions),
    kitchens: Number(kitchens),
    corridors: Number(corridors)
  });
  const selectedCeilingRooms = ceilingRooms.filter((n) => roomOptions.some((r) => r.name === n));

  function resetResult() {
    setResult(null);
    setCopied(false);
    setExcludedStages([]);
    setIncludeLump(true);
  }

  function toggleCeilingRoom(name: string) {
    resetResult();
    setCeilingRooms((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
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
              plumbingInstall: plumbingInstall || undefined,
              quick: {
                totalArea: Number(totalArea),
                bedrooms: Number(bedrooms),
                bathrooms: Number(bathrooms),
                receptions: Number(receptions),
                kitchens: Number(kitchens),
                corridors: Number(corridors),
                state,
                level,
                ceilingRooms: selectedCeilingRooms
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

  // تصدير PDF لنتيجة الحصر (مشروع مسجل أو تقدير سريع): البنود المحددة فقط، بنفس شكل تقرير المحاكي
  function handleExportPdf() {
    if (!result?.bom) return;
    const bom = result.bom;
    const groups = bom.groups.filter((g) => !excludedStages.includes(g.name));
    const lump = includeLump ? bom.lump : [];
    if (groups.length === 0 && lump.length === 0) { alert("اختار بند واحد على الأقل للتصدير."); return; }
    const f2 = (n: number) => Number(Math.round(n * 100) / 100).toLocaleString("en-US");

    let md = "";
    md += `## المساحات الهندسية\n| البيان | القيمة |\n|---|---|\n` +
      Object.keys(bom.areas).filter((k) => bom.areas[k] > 0).map((k) => `| ${AREA_LABELS[k as Basis] || k} | ${f2(bom.areas[k])} |`).join("\n") + "\n\n";
    const priced = groups.some((g) => g.lines.some((l) => l.unitPrice > 0) || g.laborCost > 0) || lump.length > 0;
    let materials = 0, labor = 0;
    groups.forEach((g) => {
      md += priced
        ? `## ${g.name}\n| الخامة | الكمية | الوحدة | سعر الوحدة | التكلفة | طريقة الحساب |\n|---|---|---|---|---|---|\n` +
          g.lines.map((l) => `| ${l.name} | ${f2(l.quantity)} | ${l.unit} | ${l.unitPrice > 0 ? f2(l.unitPrice) : "-"} | ${l.cost > 0 ? f2(l.cost) : "-"} | ${l.basis} |`).join("\n") + "\n\n"
        : `## ${g.name}\n| الخامة | الكمية | الوحدة | طريقة الحساب |\n|---|---|---|---|\n` +
          g.lines.map((l) => `| ${l.name} | ${f2(l.quantity)} | ${l.unit} | ${l.basis} |`).join("\n") + "\n\n";
      if (g.laborLines.length > 0) {
        md += g.laborLines.map((ll) => `- ${ll.name}: ${f2(ll.base)} ${ll.unit} × ${f2(ll.rate)} = ${f2(ll.cost)} جنيه`).join("\n") + "\n\n";
      }
      if (priced && (g.materialsCost > 0 || g.laborCost > 0)) {
        md += `**خامات: ${f2(g.materialsCost)} جنيه | مصنعيات: ${f2(g.laborCost)} جنيه | إجمالي البند: ${f2(g.materialsCost + g.laborCost)} جنيه**\n\n`;
      }
      materials += g.materialsCost;
      labor += g.laborCost;
    });
    if (lump.length > 0) {
      md += `## المصنعيات المقطوعة\n| البند | المبلغ (جنيه) | الأساس |\n|---|---|---|\n` + lump.map((l) => `| ${l.name} | ${f2(l.amount)} | ${l.basis} |`).join("\n") + "\n\n";
      labor += lump.reduce((sum, l) => sum + l.amount, 0);
    }
    if (priced) {
      md += `## إجمالي التكلفة التقديرية\n| البيان | القيمة (جنيه) |\n|---|---|\n| إجمالي الخامات | ${f2(materials)} |\n| إجمالي المصنعيات | ${f2(labor)} |\n| **الإجمالي** | **${f2(materials + labor)}** |\n\n`;
    }
    if (result.warnings.length > 0) md += result.warnings.map((w) => `> ${w}`).join("\n") + "\n\n";
    if (bom.info.length > 0) md += bom.info.map((x) => `- ${x.label}: ${x.value}`).join("\n") + "\n\n";
    md += `## الافتراضات\n` + result.assumptions.filter((a) => a !== bom.note).map((a) => `- ${a}`).join("\n") + "\n\n";
    md += `> ${bom.note}\n`;

    const project = projects.find((p) => p.id === projectId);
    openReportPdf({
      title: result.mode === "project" ? "حصر كميات المشروع" : "حصر الكميات المبدئي (تقدير سريع)",
      subtitle: result.mode === "project" ? (project?.project_name || "") : `شقة ${totalArea} م²`,
      meta: result.mode === "project"
        ? [{ label: "المشروع", value: project?.project_name || "-" }, { label: "الموقع", value: project?.location || "-" }]
        : [{ label: "مساحة الشقة", value: `${totalArea} م²` }, { label: "مستوى التشطيب", value: FINISH_LEVELS.find((l) => l.key === level)?.label || "" }],
      markdown: md
    });
  }

  // الخطوة التالية بعد التقدير السريع (مكالمة عميل): تسجيل العميل وفتح مشروعه والتقدير منقول له
  function handleContinueToCRM() {
    if (!result || result.mode !== "quick") return;
    const levelInfo = FINISH_LEVELS.find((l) => l.key === level) || FINISH_LEVELS[0];
    try {
      sessionStorage.setItem(
        "salesLeadDraft",
        JSON.stringify({
          area: Number(totalArea),
          levelLabel: levelInfo.label,
          dbLevel: levelInfo.dbLevel,
          levelSpecified: true,
          minCost: result.cost?.min ?? null,
          maxCost: result.cost?.max ?? null,
          minDays: result.duration?.minDays ?? null,
          maxDays: result.duration?.maxDays ?? null,
          counts: {
            bedrooms: Number(bedrooms),
            bathrooms: Number(bathrooms),
            receptions: Number(receptions),
            kitchens: Number(kitchens)
          },
          location: "",
          createdAt: Date.now()
        })
      );
    } catch (e) {
      console.warn("تعذّر حفظ مسودة التقدير", e);
    }
    router.push("/CRM?newLead=1");
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


  return (
    <div className="w-full max-w-2xl bg-[#07132a] border border-[#D4AF37]/40 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
      <div className="p-4 bg-[#0b1d3d] border-b border-[#D4AF37]/20 flex justify-between items-center" dir="rtl">
        <span className="text-[#A17A4C] font-black text-xs md:text-sm">📐 مهندس التسعير وحساب الكميات | جولدن ديكوريشن</span>
        <CloseButton onClick={handleClose} />
      </div>

      <div className="p-6 overflow-y-auto flex-1 ai-chat-scroll space-y-5 text-right" dir="rtl">
        <div className="grid grid-cols-2 gap-2">
          <GoldButton toggle size="fill" active={mode === "project"} onClick={() => { setMode("project"); resetResult(); }}>
            مشروع مسجل
          </GoldButton>
          <GoldButton toggle size="fill" active={mode === "quick"} onClick={() => { setMode("quick"); resetResult(); }}>
            تقدير سريع لعميل جديد
          </GoldButton>
        </div>

        {mode === "project" ? (
          <div className="space-y-3">
            <p className="text-white text-xs font-semibold">
              يقرأ الحصر مساحات الغرف وأسقف الجبس (فلات أو بيت نور) وحالة الشقة والارتفاع ونطاق المحارة وعدد الطوب ونوع تأسيس السباكة من بيانات المشروع نفسه.
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
              <div className="col-span-2">
                <label className={labelClass}>الطرقة</label>
                <select value={corridors} onChange={(e) => { setCorridors(e.target.value); resetResult(); }} className={selectClass}>
                  {COUNT_OPTIONS(0, 2).map((n) => <option key={n} value={n}>{n === "0" ? "بدون طرقة" : n}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>حالة الشقة</label>
              <div className="grid grid-cols-2 gap-2">
                <GoldButton toggle size="fill" active={state === "brick"} onClick={() => { setState("brick"); resetResult(); }}>على الطوب الأحمر</GoldButton>
                <GoldButton toggle size="fill" active={state === "plastered"} onClick={() => { setState("plastered"); resetResult(); }}>على المحارة</GoldButton>
              </div>
            </div>

            <div>
              <label className={labelClass}>مستوى التشطيب</label>
              <div className="grid grid-cols-3 gap-2">
                {FINISH_LEVELS.map((l) => (
                  <GoldButton
                    key={l.key}
                    toggle
                    size="fill"
                    active={level === l.key}
                    onClick={() => { setLevel(l.key); resetResult(); }}
                  >
                    {l.label}
                  </GoldButton>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-[#D4AF37]">جبس بورد في (اختر الغرف)</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { resetResult(); setCeilingRooms(roomOptions.map((r) => r.name)); }}
                    className="text-[11px] font-black text-[#D4AF37] underline"
                  >
                    تحديد الكل
                  </button>
                  <button
                    type="button"
                    onClick={() => { resetResult(); setCeilingRooms([]); }}
                    className="text-[11px] font-black text-gray-400 underline"
                  >
                    مسح
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {roomOptions.map((r) => (
                  <GoldButton
                    toggle
                    size="fill"
                    active={selectedCeilingRooms.includes(r.name)}
                    key={r.name}
                    onClick={() => toggleCeilingRoom(r.name)}
                  >
                    {r.name}
                  </GoldButton>
                ))}
              </div>
            </div>
          </div>
        )}

        {mode === "quick" && (
        <div>
          <label className={labelClass}>نوع تأسيس السباكة (لمصنعية السباكة المقطوعة)</label>
          <select value={plumbingInstall} onChange={(e) => { setPlumbingInstall(e.target.value as "" | PlumbingInstall); resetResult(); }} className={selectClass}>
            <option value="">اختر النوع</option>
            {(Object.keys(PLUMBING_INSTALL_LABELS) as PlumbingInstall[]).map((k) => <option key={k} value={k}>{PLUMBING_INSTALL_LABELS[k]}</option>)}
          </select>
        </div>
        )}

        {!loading && (
          <GoldButton size="lg" className="w-full" onClick={handleRun}>
            {mode === "project" ? "🔍 تشغيل حصر الكميات للمشروع" : "⚡ احسب التقدير السريع"}
          </GoldButton>
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
                    {result.duration && (
                      <p className="text-white font-black text-xs mt-2">
                        مدة التنفيذ التقديرية: {fmt(result.duration.minDays)} – {fmt(result.duration.maxDays)} يوم
                      </p>
                    )}
                    <p className="text-gray-400 text-[10px] font-bold mt-1">تقدير مبدئي غير ملزم لحين المعاينة والمقايسة.</p>
                  </>
                ) : (
                  <p className="text-gray-300 text-xs font-bold">{result.costNote}</p>
                )}
              </div>
            )}

            {result.mode === "quick" && (
              <div className="bg-[#07132a] border border-[#D4AF37]/40 rounded-xl p-4 space-y-3">
                <p className="text-[#D4AF37] font-black text-xs">الخطوة التالية: لو العميل موافق</p>
                <p className="text-gray-300 text-[11px] font-bold leading-relaxed">
                  سجّل العميل (الاسم والموبايل) وهيتفتحله مشروع جاهز بالمساحة والمستوى وعدد الغرف وقيمة التقدير، وتكمل المقايسة من هناك.
                </p>
                <GoldButton size="fill" onClick={handleContinueToCRM}>👤 تسجيل العميل وفتح مشروعه</GoldButton>
              </div>
            )}

            {stages.map((s) => (
              <div key={s.name} className="bg-[#020B1C] border border-[#D4AF37]/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2.5">
                  <ToggleSwitch
                    checked={!excludedStages.includes(s.name)}
                    onChange={() => setExcludedStages((p) => (p.includes(s.name) ? p.filter((x) => x !== s.name) : [...p, s.name]))}
                    ariaLabel={`تضمين بند ${s.name} في التقرير`}
                  />
                  <h4 className="text-[#A17A4C] font-black text-xs border-r-2 border-[#D4AF37] pr-2">{s.name}</h4>
                </div>
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

            {result.bom && result.bom.lump.length > 0 && (
              <div className="bg-[#020B1C] border border-[#D4AF37]/30 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2.5">
                  <ToggleSwitch checked={includeLump} onChange={setIncludeLump} ariaLabel="تضمين المصنعيات المقطوعة في التقرير" />
                  <h4 className="text-[#A17A4C] font-black text-xs border-r-2 border-[#D4AF37] pr-2">المصنعيات المقطوعة</h4>
                </div>
                {result.bom.lump.map((l) => (
                  <div key={l.name} className="flex items-start justify-between gap-3 border-b border-[#1f2d4d] last:border-0 pb-2 last:pb-0">
                    <div>
                      <p className="text-white text-xs font-black">{l.name}</p>
                      <p className="text-gray-500 text-[10px] font-bold">{l.basis}</p>
                    </div>
                    <span className="text-[#D4AF37] text-xs font-black whitespace-nowrap">{fmt(Math.round(l.amount))} جنيه</span>
                  </div>
                ))}
              </div>
            )}

            {result.bom && result.bom.totals.grand > 0 && (
              <div className="bg-[#020B1C] border border-[#D4AF37]/50 rounded-xl p-4 space-y-1.5">
                <p className="text-[#D4AF37] font-black text-xs">تكلفة الخامات والمصنعيات من جدول الحصر (للمراجعة الداخلية)</p>
                <div className="flex justify-between text-xs font-bold text-gray-300"><span>الخامات</span><span>{fmt(Math.round(result.bom.totals.materials))} جنيه</span></div>
                <div className="flex justify-between text-xs font-bold text-gray-300"><span>المصنعيات</span><span>{fmt(Math.round(result.bom.totals.labor))} جنيه</span></div>
                <div className="flex justify-between text-sm font-black text-white border-t border-[#1f2d4d] pt-2"><span>الإجمالي</span><span>{fmt(Math.round(result.bom.totals.grand))} جنيه</span></div>
                {result.bom.totals.unpricedLines > 0 && (
                  <p className="text-amber-300 text-[10px] font-bold">{result.bom.totals.unpricedLines} خامة بدون سعر وحدة، فالإجمالي ناقص. اضبط أسعارها من الإعدادات.</p>
                )}
              </div>
            )}

            {result.bom && (
              <div className="bg-[#07132a] border border-[#D4AF37]/30 rounded-xl p-4 space-y-3">
                <p className="text-[#D4AF37] text-[11px] font-black">علّم على البنود اللي تدخل تقرير الـ PDF (المربعات فوق)</p>
                <div className="flex flex-wrap gap-2">
                  <GoldButton onClick={handleExportPdf}>📄 تصدير PDF</GoldButton>
                  <GoldButton toggle active={false} onClick={() => { setExcludedStages([]); setIncludeLump(true); }}>تحديد الكل</GoldButton>
                  <GoldButton toggle active={false} onClick={() => { setExcludedStages(stages.map((x) => x.name)); setIncludeLump(false); }}>إلغاء الكل</GoldButton>
                </div>
              </div>
            )}

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
                <GoldButton onClick={handleCopy}>
                  {copied ? "تم النسخ ✓" : "نسخ الرسالة"}
                </GoldButton>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}