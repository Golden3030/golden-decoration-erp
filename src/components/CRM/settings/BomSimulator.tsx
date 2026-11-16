"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import GoldButton from "@/components/ui/GoldButton";
import { openReportPdf } from "@/lib/reportPrint";
import {
  AREA_LABELS,
  BOM_FINAL_NOTE,
  computeBom,
  deriveAreas,
  type BomItem,
  type BomMaterial,
  type BomResult,
  type BomRoomFactor,
  type DerivedAreas
} from "@/lib/bomEngine";
import { buildQuickRooms } from "@/lib/takeoffEngine";

type AreaKey = keyof DerivedAreas;
// المساحات المستنتجة التي يمكن تعديلها يدوياً
const EDITABLE_AREAS: AreaKey[] = [
  "wall_area", "ceiling_area", "perimeter_ml", "floor_area", "wall_tile_area", "waterproof_area", "masonry_area"
];

const inputClass =
  "h-10 w-full rounded-lg bg-[#020B1C] border border-[#D4AF37]/30 text-white px-3 outline-none text-xs font-bold";
const labelClass = "block text-[11px] mb-1.5 font-black text-[#D4AF37]";
const counts = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => String(from + i));
const fmt = (n: number) => Number(Math.round(n * 100) / 100).toLocaleString("en-US");

export default function BomSimulator() {
  const [items, setItems] = useState<BomItem[]>([]);
  const [materials, setMaterials] = useState<BomMaterial[]>([]);
  const [factors, setFactors] = useState<BomRoomFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [area, setArea] = useState("");
  const [bedrooms, setBedrooms] = useState("3");
  const [bathrooms, setBathrooms] = useState("1");
  const [kitchens, setKitchens] = useState("1");
  const [receptions, setReceptions] = useState("1");
  const [overrides, setOverrides] = useState<Partial<Record<AreaKey, string>>>({});
  const [removedRooms, setRemovedRooms] = useState<string[]>([]); // غرف محذوفة من الأسقف المعلقة
  const [result, setResult] = useState<BomResult | null>(null);

  useEffect(() => {
    async function load() {
      const [i, m, f] = await Promise.all([
        supabase.from("takeoff_items").select("*").order("sort_order"),
        supabase.from("takeoff_materials").select("*").order("sort_order"),
        supabase.from("takeoff_room_factors").select("*")
      ]);
      if (i.error || m.error || f.error) {
        setLoadError("تعذّر تحميل جداول المعاملات. تأكد من تشغيل ملف takeoff_bom_setup.sql في Supabase.");
      } else {
        setItems((i.data || []) as BomItem[]);
        setMaterials(((m.data || []) as any[]).map((x) => ({ ...x, coefficient: Number(x.coefficient), pack_size: Number(x.pack_size) })));
        setFactors(((f.data || []) as any[]).map((x) => ({ ...x, factor: Number(x.factor) })));
        if ((i.data || []).length === 0) setLoadError("جداول المعاملات فاضية. شغّل ملف takeoff_bom_setup.sql في Supabase.");
      }
      setLoading(false);
    }
    load();
  }, []);

  const n = (v: string) => Math.max(0, Math.round(Number(v) || 0));
  const totalArea = Number(area) || 0;

  // غرف الشقة التقديرية لتحديد الغرف المعلّقة بالجبس بورد وحذفها
  const rooms = useMemo(
    () =>
      buildQuickRooms({
        totalArea: totalArea > 0 ? totalArea : 100,
        bedrooms: n(bedrooms), bathrooms: Math.max(1, n(bathrooms)), receptions: Math.max(1, n(receptions)),
        kitchens: Math.max(1, n(kitchens)), corridors: 1
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [totalArea, bedrooms, bathrooms, receptions, kitchens]
  );
  const removed = removedRooms.filter((r) => rooms.some((x) => x.name === r));
  const ceilingShare = useMemo(() => {
    const all = rooms.reduce((s, r) => s + r.area, 0) || 1;
    const rem = rooms.filter((r) => removed.includes(r.name)).reduce((s, r) => s + r.area, 0);
    return Math.max(0, 1 - rem / all);
  }, [rooms, removed]);

  const baseInput = {
    totalArea,
    bedrooms: n(bedrooms), bathrooms: Math.max(1, n(bathrooms)),
    kitchens: Math.max(1, n(kitchens)), receptions: Math.max(1, n(receptions)),
    ceilingShare
  };
  const derived = useMemo(() => deriveAreas(baseInput), [totalArea, bedrooms, bathrooms, receptions, kitchens, ceilingShare]); // eslint-disable-line

  function numericOverrides() {
    const out: Partial<Record<AreaKey, number>> = {};
    (Object.keys(overrides) as AreaKey[]).forEach((k) => {
      const v = overrides[k];
      if (v !== undefined && v !== "" && Number.isFinite(Number(v))) out[k] = Number(v);
    });
    return out;
  }

  function touch() { setResult(null); }

  function handleCalculate() {
    if (!(totalArea > 0)) { alert("أدخل مساحة الشقة الإجمالية بالمتر المربع."); return; }
    setResult(computeBom(items, materials, factors, { ...baseInput, overrides: numericOverrides() }));
  }

  function handleExport() {
    if (!result) return;
    const a = result.areas;
    let md =
      `## المساحات الهندسية المستنتجة\n| البيان | القيمة |\n|---|---|\n` +
      (Object.keys(a) as AreaKey[])
        .filter((k) => k !== "paint_area" && (a[k] > 0))
        .map((k) => `| ${AREA_LABELS[k]} | ${fmt(a[k])} |`).join("\n") + "\n\n";
    result.groups.forEach((g) => {
      md += `## ${g.item.name_ar}\n| الخامة | الكمية | الوحدة | طريقة الحساب |\n|---|---|---|---|\n` +
        g.lines.map((l) => `| ${l.name} | ${fmt(l.quantity)} | ${l.unit} | ${l.basis} |`).join("\n") + "\n\n";
    });
    if (result.info.length) md += result.info.map((x) => `- ${x.label}: ${x.value}`).join("\n") + "\n\n";
    md += `> ${BOM_FINAL_NOTE}\n`;
    openReportPdf({
      title: "حصر الكميات المبدئي",
      subtitle: `شقة ${fmt(totalArea)} م²`,
      meta: [
        { label: "مساحة الشقة", value: `${fmt(totalArea)} م²` },
        { label: "الغرف", value: `${n(bedrooms)} نوم | ${Math.max(1, n(bathrooms))} حمام | ${Math.max(1, n(kitchens))} مطبخ | ${Math.max(1, n(receptions))} ريسبشن` }
      ],
      markdown: md
    });
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-[#D4AF37] text-xs font-bold flex items-center justify-center gap-2">
        <Loader2 className="animate-spin" size={16} /> جاري تحميل المعاملات...
      </div>
    );
  }
  if (loadError) {
    return <div className="p-5 rounded-2xl border border-rose-500/40 bg-rose-950/20 text-rose-300 text-xs font-bold">{loadError}</div>;
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-[#07132a] border border-[#D4AF37]/30 rounded-2xl p-5 space-y-4">
        <h3 className="text-[#D4AF37] font-black text-sm">محاكي حصر الكميات الفوري</h3>
        <p className="text-slate-300 text-xs font-bold leading-relaxed">
          اكتب مساحة الشقة وعدد الغرف، والنظام يستنتج المساحات الهندسية بالنسب المعمارية القياسية (تقدر تعدل أي مساحة بإيدك)،
          وبعدين يحسب الخامات من جدول المعاملات.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>مساحة الشقة الإجمالية (م²) *</label>
            <input type="text" inputMode="decimal" value={area} placeholder="مثال: 100"
              onChange={(e) => { setArea(e.target.value.replace(/[^0-9.]/g, "")); touch(); }} className={inputClass} />
          </div>
          {[
            ["غرف النوم", bedrooms, setBedrooms, 0, 8],
            ["الحمامات", bathrooms, setBathrooms, 1, 6],
            ["المطابخ", kitchens, setKitchens, 1, 3],
            ["قطع الريسبشن", receptions, setReceptions, 1, 4]
          ].map(([label, val, setter, from, to]: any) => (
            <div key={label}>
              <label className={labelClass}>{label}</label>
              <select value={val} onChange={(e) => { setter(e.target.value); touch(); }} className={inputClass}>
                {counts(from, to).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-black text-[#D4AF37]">الأسقف المعلقة (جبس بورد): احذف الغرف اللي مش هتتعلق</label>
            {removed.length > 0 && (
              <button type="button" onClick={() => { setRemovedRooms([]); touch(); }} className="text-[11px] font-black text-gray-400 underline">إرجاع الكل</button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {rooms.map((r) => (
              <GoldButton
                key={r.name}
                toggle
                size="fill"
                active={!removed.includes(r.name)}
                onClick={() => { setRemovedRooms((p) => (p.includes(r.name) ? p.filter((x) => x !== r.name) : [...p, r.name])); touch(); }}
              >
                {r.name}
              </GoldButton>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[#A17A4C] text-[11px] font-black mb-2">المساحات المستنتجة (قابلة للتعديل اليدوي)</p>
          <div className="grid grid-cols-2 gap-3">
            {EDITABLE_AREAS.map((k) => (
              <div key={k}>
                <label className="block text-[10px] mb-1 font-bold text-gray-300">{AREA_LABELS[k]}</label>
                <input
                  type="text" inputMode="decimal"
                  value={overrides[k] ?? (totalArea > 0 ? String(Math.round(derived[k] * 100) / 100) : "")}
                  placeholder={k === "masonry_area" ? "0" : ""}
                  onChange={(e) => { setOverrides((p) => ({ ...p, [k]: e.target.value.replace(/[^0-9.]/g, "") })); touch(); }}
                  className={inputClass + (overrides[k] !== undefined ? " border-[#D4AF37]" : "")}
                />
              </div>
            ))}
          </div>
          {Object.keys(overrides).length > 0 && (
            <button type="button" onClick={() => { setOverrides({}); touch(); }} className="mt-2 text-[11px] font-black text-gray-400 underline">
              إرجاع المساحات للقيم المستنتجة
            </button>
          )}
        </div>

        <GoldButton size="lg" className="w-full" onClick={handleCalculate}>احسب الكميات</GoldButton>
      </div>

      {result && (
        <div className="space-y-4 select-text">
          {result.groups.map((g) => (
            <div key={g.item.key} className="bg-[#020B1C] border border-[#D4AF37]/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[#D4AF37] font-black text-sm border-r-4 border-[#D4AF37] pr-2">{g.item.name_ar}</h4>
                <span className="text-[10px] text-gray-500 font-bold">مجموعة {g.item.active_set === "A" ? "المعاملات الفنية" : "الحصر لكل 1م²"}</span>
              </div>
              {g.lines.map((l) => (
                <div key={l.materialId} className="border-b border-[#1f2d4d] last:border-0 pb-2 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white text-xs font-black">{l.name}</span>
                    <span className="text-[#D4AF37] text-xs font-black" dir="ltr">{fmt(l.quantity)} {l.unit}</span>
                  </div>
                  <p className="text-gray-500 text-[10px] font-bold mt-1 leading-relaxed">{l.basis}</p>
                </div>
              ))}
            </div>
          ))}
          {result.info.map((x) => (
            <p key={x.label} className="text-gray-300 text-[11px] font-bold">• {x.label}: {x.value}</p>
          ))}
          <div className="bg-[#D4AF37]/10 border-r-4 border-[#D4AF37] rounded-lg p-3 text-amber-100 text-xs font-bold">{result.note}</div>
          <GoldButton onClick={handleExport}>📄 تصدير PDF</GoldButton>
        </div>
      )}
    </div>
  );
}