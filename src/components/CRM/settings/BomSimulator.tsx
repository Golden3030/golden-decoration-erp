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
  PLUMBING_INSTALL_LABELS,
  type BomItem,
  type BomMaterial,
  type BomResult,
  type BomRoomFactor,
  type DerivedAreas,
  type LaborConfig,
  type PlumbingInstall
} from "@/lib/bomEngine";
import { fetchLaborConfig } from "@/lib/laborLoader";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
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
  const [labor, setLabor] = useState<LaborConfig | null>(null);
  const [plumbingInstall, setPlumbingInstall] = useState<"" | PlumbingInstall>("");
  const [bricksCount, setBricksCount] = useState(""); // عدد الطوب لمصنعية المباني بالألف طوبة (اختياري)
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
  const [excluded, setExcluded] = useState<string[]>([]); // خامات مستبعدة من تقرير الـ PDF
  const [includeAreas, setIncludeAreas] = useState(true);

  useEffect(() => {
    async function load() {
      const [i, m, f, lab] = await Promise.all([
        supabase.from("takeoff_items").select("*").order("sort_order"),
        supabase.from("takeoff_materials").select("*").order("sort_order"),
        supabase.from("takeoff_room_factors").select("*"),
        fetchLaborConfig()
      ]);
      if (lab.error) {
        setLoadError(lab.error);
      } else if (i.error || m.error || f.error) {
        setLoadError("تعذّر تحميل جداول المعاملات. تأكد من تشغيل ملف takeoff_bom_setup.sql في Supabase.");
      } else {
        setItems(((i.data || []) as any[]).map((x) => ({ ...x, labor_per_m2: Number(x.labor_per_m2 || 0) })) as BomItem[]);
        setMaterials(((m.data || []) as any[]).map((x) => ({ ...x, coefficient: Number(x.coefficient), pack_size: Number(x.pack_size), unit_price: Number(x.unit_price || 0) })));
        setFactors(((f.data || []) as any[]).map((x) => ({ ...x, factor: Number(x.factor) })));
        setLabor(lab.config);
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

  function touch() { setResult(null); setExcluded([]); }

  function handleCalculate() {
    if (!(totalArea > 0)) { alert("أدخل مساحة الشقة الإجمالية بالمتر المربع."); return; }
    setResult(computeBom(items, materials, factors, { ...baseInput, overrides: numericOverrides(), plumbingInstall: plumbingInstall || undefined, bricksCount: Number(bricksCount) > 0 ? Number(bricksCount) : undefined }, labor || undefined));
  }

  // اختيار البنود والخامات اللي تدخل تقرير الـ PDF
  const isIncluded = (id: string) => !excluded.includes(id);
  const toggleLine = (id: string) => setExcluded((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleGroup = (ids: string[]) =>
    setExcluded((p) => (ids.every((id) => !p.includes(id)) ? [...p, ...ids] : p.filter((x) => !ids.includes(x))));
  const selectedCount = result ? result.groups.reduce((s, g) => s + g.lines.filter((l) => isIncluded(l.materialId)).length, 0) : 0;
  // تكلفة المحدد: خامات الخامات المختارة + مصنعية كل بند فيه خامة مختارة
  const selectedTotals = (() => {
    if (!result) return { materials: 0, labor: 0, grand: 0 };
    let materials = 0, labor = 0;
    result.groups.forEach((g) => {
      const sel = g.lines.filter((l) => isIncluded(l.materialId));
      if (sel.length === 0) return;
      materials += sel.reduce((s, l) => s + l.cost, 0);
      labor += g.laborCost;
    });
    labor += result.lumpLabor.reduce((s, l) => s + l.amount, 0);
    return { materials, labor, grand: materials + labor };
  })();

  function handleExport() {
    if (!result) return;
    if (selectedCount === 0 && !includeAreas) { alert("اختار بند أو خامة واحدة على الأقل للتصدير."); return; }
    const a = result.areas;
    let md = "";
    if (includeAreas) {
      md +=
        `## المساحات الهندسية المستنتجة\n| البيان | القيمة |\n|---|---|\n` +
        (Object.keys(a) as AreaKey[])
          .filter((k) => k !== "paint_area" && (a[k] > 0))
          .map((k) => `| ${AREA_LABELS[k]} | ${fmt(a[k])} |`).join("\n") + "\n\n";
    }
    const priced = result.groups.some((g) => g.lines.some((l) => isIncluded(l.materialId) && l.unitPrice > 0)) || result.groups.some((g) => g.laborCost > 0);
    result.groups.forEach((g) => {
      const lines = g.lines.filter((l) => isIncluded(l.materialId));
      if (lines.length === 0) return;
      md += priced
        ? `## ${g.item.name_ar}\n| الخامة | الكمية | الوحدة | سعر الوحدة | التكلفة | طريقة الحساب |\n|---|---|---|---|---|---|\n` +
          lines.map((l) => `| ${l.name} | ${fmt(l.quantity)} | ${l.unit} | ${l.unitPrice > 0 ? fmt(l.unitPrice) : "-"} | ${l.cost > 0 ? fmt(l.cost) : "-"} | ${l.basis} |`).join("\n") + "\n\n"
        : `## ${g.item.name_ar}\n| الخامة | الكمية | الوحدة | طريقة الحساب |\n|---|---|---|---|\n` +
          lines.map((l) => `| ${l.name} | ${fmt(l.quantity)} | ${l.unit} | ${l.basis} |`).join("\n") + "\n\n";
      const mat = lines.reduce((s, l) => s + l.cost, 0);
      if (priced && (mat > 0 || g.laborCost > 0)) {
        md += `**خامات: ${fmt(mat)} جنيه | مصنعيات: ${fmt(g.laborCost)} جنيه | إجمالي البند: ${fmt(mat + g.laborCost)} جنيه**\n\n`;
      }
    });
    if (result.lumpLabor.length > 0) {
      md += `## المصنعيات المقطوعة\n| البند | المبلغ (جنيه) | الأساس |\n|---|---|---|\n` +
        result.lumpLabor.map((l) => `| ${l.name} | ${fmt(l.amount)} | ${l.basis} |`).join("\n") + "\n\n";
    }
    if (result.warnings.length > 0) md += result.warnings.map((w) => `> ${w}`).join("\n") + "\n\n";
    if (priced || result.lumpLabor.length > 0) {
      md += `## إجمالي التكلفة التقديرية\n| البيان | القيمة (جنيه) |\n|---|---|\n| إجمالي الخامات | ${fmt(selectedTotals.materials)} |\n| إجمالي المصنعيات | ${fmt(selectedTotals.labor)} |\n| **الإجمالي** | **${fmt(selectedTotals.grand)}** |\n\n`;
    }
    if (result.info.length && selectedCount > 0) md += result.info.map((x) => `- ${x.label}: ${x.value}`).join("\n") + "\n\n";
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
          <label className={labelClass}>عدد الطوب (لمصنعية المباني بالألف طوبة، اختياري)</label>
          <input type="text" inputMode="numeric" value={bricksCount} onChange={(e) => { setBricksCount(e.target.value.replace(/[^0-9]/g, "")); touch(); }} className={inputClass} placeholder="مثال: 12000" />
        </div>

        <div>
          <label className={labelClass}>نوع تأسيس السباكة (لمصنعية السباكة المقطوعة)</label>
          <select value={plumbingInstall} onChange={(e) => { setPlumbingInstall(e.target.value as "" | PlumbingInstall); touch(); }} className={inputClass}>
            <option value="">اختر النوع</option>
            {(Object.keys(PLUMBING_INSTALL_LABELS) as PlumbingInstall[]).map((k) => <option key={k} value={k}>{PLUMBING_INSTALL_LABELS[k]}</option>)}
          </select>
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
                <div className="flex items-center gap-2.5">
                  <ToggleSwitch
                    checked={g.lines.every((l) => isIncluded(l.materialId))}
                    onChange={() => toggleGroup(g.lines.map((l) => l.materialId))}
                    ariaLabel={`تضمين بند ${g.item.name_ar} في التقرير`}
                  />
                  <h4 className="text-[#D4AF37] font-black text-sm border-r-4 border-[#D4AF37] pr-2">{g.item.name_ar}</h4>
                </div>
                <span className="text-[10px] text-gray-500 font-bold text-left">
                  {g.totalCost > 0
                    ? `خامات ${fmt(g.materialsCost)} + مصنعيات ${fmt(g.laborCost)} = ${fmt(g.totalCost)} ج.م`
                    : `مجموعة ${g.item.active_set === "A" ? "المعاملات الفنية" : "الحصر لكل 1م²"}`}
                </span>
              </div>
              {g.laborLines.length > 0 && (
                <div className="rounded-lg bg-[#07132a] border border-[#1f2d4d] p-2.5 space-y-1">
                  {g.laborLines.map((ll) => (
                    <p key={ll.name} className="text-[11px] font-bold text-gray-300">
                      🛠️ {ll.name}: {fmt(ll.base)} {ll.unit} × {fmt(ll.rate)} = <span className="text-[#D4AF37]">{fmt(ll.cost)} جنيه</span>
                    </p>
                  ))}
                </div>
              )}
              {g.lines.map((l) => (
                <div key={l.materialId} className="border-b border-[#1f2d4d] last:border-0 pb-2 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ToggleSwitch checked={isIncluded(l.materialId)} onChange={() => toggleLine(l.materialId)} ariaLabel={`تضمين ${l.name} في التقرير`} />
                      <span className="text-white text-xs font-black">{l.name}</span>
                    </div>
                    <span className="text-[#D4AF37] text-xs font-black" dir="ltr">{fmt(l.quantity)} {l.unit}</span>
                  </div>
                  <p className="text-gray-500 text-[10px] font-bold mt-1 leading-relaxed">
                    {l.basis}
                    {l.unitPrice > 0 ? ` | ${fmt(l.quantity)} × ${fmt(l.unitPrice)} = ${fmt(l.cost)} جنيه` : ""}
                  </p>
                </div>
              ))}
            </div>
          ))}
          {result.lumpLabor.length > 0 && (
            <div className="bg-[#020B1C] border border-[#D4AF37]/30 rounded-xl p-4 space-y-2">
              <h4 className="text-[#D4AF37] font-black text-sm border-r-4 border-[#D4AF37] pr-2">المصنعيات المقطوعة</h4>
              {result.lumpLabor.map((l) => (
                <div key={l.itemKey} className="flex items-start justify-between gap-3 border-b border-[#1f2d4d] last:border-0 pb-2 last:pb-0">
                  <div>
                    <p className="text-white text-xs font-black">{l.name}</p>
                    <p className="text-gray-500 text-[10px] font-bold">{l.basis}</p>
                  </div>
                  <span className="text-[#D4AF37] text-xs font-black whitespace-nowrap">{fmt(l.amount)} جنيه</span>
                </div>
              ))}
            </div>
          )}
          {result.warnings.map((w) => (
            <p key={w} className="text-amber-300 text-[11px] font-bold bg-amber-950/20 border border-amber-500/30 rounded-lg p-2">⚠️ {w}</p>
          ))}
          {result.info.map((x) => (
            <p key={x.label} className="text-gray-300 text-[11px] font-bold">• {x.label}: {x.value}</p>
          ))}
          {result.totals.grand > 0 ? (
            <div className="bg-[#020B1C] border border-[#D4AF37]/50 rounded-xl p-4 space-y-1.5">
              <p className="text-[#D4AF37] font-black text-xs">إجمالي التكلفة التقديرية (من أسعار ومصنعيات جدول المعاملات)</p>
              <div className="flex justify-between text-xs font-bold text-gray-300"><span>الخامات</span><span>{fmt(result.totals.materials)} جنيه</span></div>
              <div className="flex justify-between text-xs font-bold text-gray-300"><span>المصنعيات</span><span>{fmt(result.totals.labor)} جنيه</span></div>
              <div className="flex justify-between text-sm font-black text-white border-t border-[#1f2d4d] pt-2"><span>الإجمالي</span><span>{fmt(result.totals.grand)} جنيه</span></div>
              {result.totals.unpricedLines > 0 && (
                <p className="text-amber-300 text-[10px] font-bold">{result.totals.unpricedLines} خامة بدون سعر وحدة، فالإجمالي ناقص. اضبط أسعارها من تاب ضبط المعاملات الفنية.</p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-600 p-3 text-gray-400 text-[11px] font-bold">
              لسه ماتضبطتش أسعار الخامات ولا مصنعيات البنود، فالجدول كميات بس. ضبطها من تاب ضبط المعاملات الفنية عشان يطلع إجمالي التكلفة.
            </div>
          )}
          <div className="bg-[#D4AF37]/10 border-r-4 border-[#D4AF37] rounded-lg p-3 text-amber-100 text-xs font-bold">{result.note}</div>
          <div className="bg-[#07132a] border border-[#D4AF37]/30 rounded-xl p-4 space-y-3">
            <p className="text-[#D4AF37] text-[11px] font-black">اختار اللي يدخل تقرير الـ PDF (علّم على البنود أو الخامات فوق)</p>
            <ToggleSwitch checked={includeAreas} onChange={setIncludeAreas} label="تضمين جدول المساحات المستنتجة" />
            <div className="flex flex-wrap gap-2">
              <GoldButton onClick={handleExport}>📄 تصدير المحدد ({selectedCount} خامة) PDF</GoldButton>
              <GoldButton toggle active={false} onClick={() => setExcluded([])}>تحديد الكل</GoldButton>
              <GoldButton toggle active={false} onClick={() => setExcluded(result.groups.flatMap((g) => g.lines.map((l) => l.materialId)))}>إلغاء الكل</GoldButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}