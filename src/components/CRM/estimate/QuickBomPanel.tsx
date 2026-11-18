"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useCRM } from "@/components/CRM/context/CRMContext";
import GoldButton from "@/components/ui/GoldButton";
import {
  bomToEstimateLines,
  computeQuickBom,
  type BomItem,
  type BomMaterial,
  type BomResult,
  type BomRoomFactor
} from "@/lib/bomEngine";

// لوحة "الحصر السريع" داخل المقايسة المبدئية: تحسب الخامات والمصنعيات من جدول المعاملات الفنية
// وتضيفها كبنود للمقايسة المبدئية للمشروع (تتحفظ تلقائياً مع باقي بنود المقايسة).
// المقايسة النهائية تفضل مبنية من مواصفات التابات التفصيلية، فعند الانتقال لها أوقف الحصر السريع من هنا.

const inputClass = "h-10 w-full rounded-lg bg-[#020B1C] border border-[#D4AF37]/30 text-white px-3 outline-none text-xs font-bold";
const labelClass = "block text-[11px] mb-1.5 font-black text-[#D4AF37]";
const fmt = (n: number) => Number(Math.round(n * 100) / 100).toLocaleString("en-US");
const counts = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

export default function QuickBomPanel() {
  const { crmData, updateBulkFinishingSection } = useCRM();
  const quick = crmData?.finishing?.quickBom;
  const project = crmData?.project;
  const projectSaved = !!project?.id && !String(project.id).startsWith("new") && !String(project.id).startsWith("d19b7d8d");

  const [items, setItems] = useState<BomItem[]>([]);
  const [materials, setMaterials] = useState<BomMaterial[]>([]);
  const [factors, setFactors] = useState<BomRoomFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [open, setOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [message, setMessage] = useState("");

  const [area, setArea] = useState("");
  const [bedrooms, setBedrooms] = useState("3");
  const [bathrooms, setBathrooms] = useState("1");
  const [kitchens, setKitchens] = useState("1");
  const [receptions, setReceptions] = useState("1");
  const [state, setState] = useState<"brick" | "plastered">("brick");
  const [gypsumPct, setGypsumPct] = useState("0");
  const initialized = useRef(false);

  useEffect(() => {
    async function load() {
      const [i, m, f] = await Promise.all([
        supabase.from("takeoff_items").select("*").order("sort_order"),
        supabase.from("takeoff_materials").select("*").order("sort_order"),
        supabase.from("takeoff_room_factors").select("*")
      ]);
      if (i.error || m.error || f.error || !(i.data || []).length) {
        setLoadError("جداول معاملات الحصر الفني غير جاهزة. شغّل takeoff_bom_setup.sql ثم migrate_bom_pricing.sql في Supabase.");
      } else {
        setItems(((i.data || []) as any[]).map((x) => ({ ...x, labor_per_m2: Number(x.labor_per_m2 || 0) })) as BomItem[]);
        setMaterials(((m.data || []) as any[]).map((x) => ({ ...x, coefficient: Number(x.coefficient), pack_size: Number(x.pack_size), unit_price: Number(x.unit_price || 0) })) as BomMaterial[]);
        setFactors(((f.data || []) as any[]).map((x) => ({ ...x, factor: Number(x.factor) })) as BomRoomFactor[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  // تعبئة أولية من بيانات المشروع (مرة واحدة)
  useEffect(() => {
    if (initialized.current || !project) return;
    const a = Number(project.area);
    if (!(a > 0)) return;
    initialized.current = true;
    setArea(String(a));
    setBedrooms(String(Number(project.roomsCount ?? 3)));
    setBathrooms(String(Math.max(1, Number(project.bathroomsCount ?? 1))));
    setKitchens(String(Math.max(1, Number(project.kitchensCount ?? 1))));
    setReceptions(String(Math.max(1, Number(project.receptionsCount ?? 1))));
    const st = crmData?.finishing?.areas?.apartmentState;
    if (st === "brick" || st === "plastered") setState(st);
    // نسبة الجبس بورد من تاب الأسقف (مجموع الأسقف المفعّلة ÷ مساحة الشقة)
    const spaces = crmData?.finishing?.ceiling?.spacesConfig || {};
    const enabledArea = Object.values(spaces).reduce((s: number, c: any) => s + (c?.enabled ? Number(c.area) || 0 : 0), 0) as number;
    if (enabledArea > 0) setGypsumPct(String(Math.min(100, Math.round((enabledArea / a) * 100))));
  }, [project, crmData]);

  const totalArea = Number(area) || 0;
  const result: BomResult | null = useMemo(() => {
    if (!open || !(totalArea > 0) || items.length === 0) return null;
    return computeQuickBom(items, materials, factors, {
      totalArea,
      bedrooms: Math.round(Number(bedrooms)) || 0,
      bathrooms: Math.max(1, Math.round(Number(bathrooms)) || 1),
      kitchens: Math.max(1, Math.round(Number(kitchens)) || 1),
      receptions: Math.max(1, Math.round(Number(receptions)) || 1),
      state,
      gypsumShare: Math.min(1, Math.max(0, (Number(gypsumPct) || 0) / 100))
    });
  }, [open, totalArea, items, materials, factors, bedrooms, bathrooms, kitchens, receptions, state, gypsumPct]);

  function apply() {
    if (!result) return;
    if (!projectSaved) { setMessage("احفظ المشروع أولاً (تاب بيانات المشروع) ثم أضف الحصر للمقايسة."); return; }
    const lines = bomToEstimateLines(result.groups);
    updateBulkFinishingSection("quickBom", {
      enabled: true,
      lines,
      input: { area: totalArea, bedrooms, bathrooms, kitchens, receptions, state, gypsumPct },
      totals: result.totals,
      createdAt: new Date().toISOString()
    });
    setMessage(`تمت إضافة ${lines.length} بند للمقايسة المبدئية. بتتحفظ تلقائياً.`);
  }

  function disable() {
    if (!window.confirm("إيقاف بنود الحصر السريع وإزالتها من المقايسة؟ (تستخدمها قبل الانتقال للمقايسة النهائية التفصيلية)")) return;
    updateBulkFinishingSection("quickBom", { enabled: false, lines: [] });
    setMessage("تم إيقاف الحصر السريع وإزالة بنوده من المقايسة.");
  }

  if (loading) return null;

  return (
    <div className="rounded-2xl bg-[#07132a] border border-[#D4AF37]/40 p-5 space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-[#D4AF37] font-black text-sm">الحصر السريع للمقايسة المبدئية</h4>
          <p className="text-gray-400 text-[11px] font-bold mt-1 leading-relaxed">
            بنود تلقائية من جدول المعاملات الفنية (خامات + مصنعيات) للمشاريع اللي لسه مفيش لها مواصفات تفصيلية في التابات.
          </p>
        </div>
        <GoldButton toggle active={open} onClick={() => setOpen((v) => !v)}>{open ? "إخفاء" : "فتح الحصر"}</GoldButton>
      </div>

      {quick?.enabled && (
        <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/40 p-3 space-y-2">
          <p className="text-emerald-300 text-xs font-black">
            ✓ الحصر السريع مضاف للمقايسة المبدئية: {(quick.lines || []).length} بند
            {quick.totals?.grand > 0 ? ` | إجمالي تقديري ${fmt(Number(quick.totals.grand))} جنيه` : ""}
          </p>
          <p className="text-gray-400 text-[10px] font-bold leading-relaxed">
            لما تجهز تبني المقايسة النهائية من مواصفات التابات التفصيلية، أوقف الحصر السريع عشان البنود ماتتكررش.
          </p>
          <GoldButton toggle active={false} onClick={disable}>إيقاف وإزالة بنود الحصر السريع</GoldButton>
        </div>
      )}

      {loadError && <p className="text-rose-300 text-xs font-bold">{loadError}</p>}
      {message && <p className="text-amber-200 text-xs font-bold">{message}</p>}

      {open && !loadError && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelClass}>مساحة الشقة (م²)</label>
              <input type="text" inputMode="decimal" value={area} onChange={(e) => setArea(e.target.value.replace(/[^0-9.]/g, ""))} className={inputClass} />
            </div>
            {[["غرف النوم", bedrooms, setBedrooms, 0, 8], ["الحمامات", bathrooms, setBathrooms, 1, 6], ["المطابخ", kitchens, setKitchens, 1, 3], ["الريسبشن", receptions, setReceptions, 1, 4]].map(([l, v, s, a, b]: any) => (
              <div key={l}>
                <label className={labelClass}>{l}</label>
                <select value={v} onChange={(e) => s(e.target.value)} className={inputClass}>{counts(a, b).map((c) => <option key={c} value={c}>{c}</option>)}</select>
              </div>
            ))}
            <div className="col-span-2 grid grid-cols-2 gap-2">
              <GoldButton toggle size="fill" active={state === "brick"} onClick={() => setState("brick")}>على الطوب الأحمر</GoldButton>
              <GoldButton toggle size="fill" active={state === "plastered"} onClick={() => setState("plastered")}>على المحارة</GoldButton>
            </div>
            <div className="col-span-2">
              <label className={labelClass}>نسبة الأسقف بالجبس بورد من الشقة (%)</label>
              <input type="text" inputMode="decimal" value={gypsumPct} onChange={(e) => setGypsumPct(e.target.value.replace(/[^0-9.]/g, ""))} className={inputClass} />
            </div>
          </div>

          {result && (
            <div className="space-y-3">
              <div className="rounded-xl bg-[#020B1C] border border-[#1f2d4d] p-3 space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-gray-300"><span>الخامات</span><span>{fmt(result.totals.materials)} جنيه</span></div>
                <div className="flex justify-between text-xs font-bold text-gray-300"><span>المصنعيات</span><span>{fmt(result.totals.labor)} جنيه</span></div>
                <div className="flex justify-between text-sm font-black text-white border-t border-[#1f2d4d] pt-2"><span>الإجمالي</span><span>{fmt(result.totals.grand)} جنيه</span></div>
                {result.totals.unpricedLines > 0 && (
                  <p className="text-amber-300 text-[10px] font-bold">{result.totals.unpricedLines} خامة بدون سعر وحدة هتظهر بسعر صفر. اضبط الأسعار من الإعدادات الفنية.</p>
                )}
              </div>

              <GoldButton toggle active={false} onClick={() => setShowDetails((v) => !v)}>{showDetails ? "إخفاء التفاصيل" : "عرض تفاصيل البنود"}</GoldButton>
              {showDetails && result.groups.map((g) => (
                <div key={g.item.key} className="rounded-xl bg-[#020B1C] border border-[#1f2d4d] p-3 space-y-1.5">
                  <p className="text-[#D4AF37] text-xs font-black">{g.item.name_ar} <span className="text-gray-500 font-bold">({fmt(g.totalCost)} جنيه)</span></p>
                  {g.lines.map((l) => (
                    <p key={l.materialId} className="text-gray-300 text-[11px] font-bold">• {l.name}: {fmt(l.quantity)} {l.unit}{l.unitPrice > 0 ? ` × ${fmt(l.unitPrice)}` : ""}</p>
                  ))}
                  {g.laborCost > 0 && <p className="text-gray-400 text-[11px] font-bold">• مصنعية: {fmt(g.laborCost)} جنيه</p>}
                </div>
              ))}

              <GoldButton size="lg" className="w-full" onClick={apply}>
                {quick?.enabled ? "تحديث بنود المقايسة من الحصر" : "إضافة للمقايسة المبدئية"}
              </GoldButton>
            </div>
          )}
          {!result && <p className="text-gray-500 text-xs font-bold flex items-center gap-2"><Loader2 className="animate-spin" size={14} /> اكتب مساحة الشقة لحساب الحصر.</p>}
        </div>
      )}
    </div>
  );
}