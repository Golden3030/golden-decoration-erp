"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import GoldButton from "@/components/ui/GoldButton";
import { AREA_LABELS, PLUMBING_INSTALL_LABELS, type Basis, type LaborKind, type PlumbingInstall } from "@/lib/bomEngine";

// تاب المصنعيات: كل بند له سطر مصنعية أو أكتر. نوع السطر: بالمتر المربع (المحارة، الدهانات، جبس فلات، سيراميك)،
// بالمتر الطولي (جبس بيت نور)، مقطوعة (الكهرباء، المباني)، بالألف طوبة (المباني)، أو سباكة بسعر حسب الحمامات ونوع التأسيس.
// محرك الحصر بيقرا من هنا بس (المحاكي، التقدير السريع، المقايسة المبدئية، ووضع المشروع المسجل).

const inputClass = "h-9 w-full rounded-lg bg-[#020B1C] border border-[#D4AF37]/30 text-white px-2.5 outline-none text-xs font-bold";
const miniLabel = "block text-[10px] mb-1 font-bold text-gray-400";
const M2_BASES = Object.keys(AREA_LABELS).filter((b) => b !== "per_unit" && b !== "light_pocket_ml") as Basis[];
const ML_BASES: Basis[] = ["light_pocket_ml", "perimeter_ml"];
const KIND_LABELS: Record<LaborKind, string> = {
  per_m2: "بالمتر المربع (جنيه لكل م²)",
  per_ml: "بالمتر الطولي (جنيه لكل م.ط)",
  lump: "مقطوعة (مبلغ ثابت للشقة)",
  per_1000_bricks: "بالألف طوبة (جنيه لكل 1000 طوبة)",
  plumbing_tiers: "سباكة: سعر حسب الحمامات ونوع التأسيس"
};
const TIERS: { tier: 1 | 2 | 3; label: string }[] = [
  { tier: 1, label: "حمام واحد" },
  { tier: 2, label: "حمامين" },
  { tier: 3, label: "3 حمامات فأكثر" }
];
const INSTALLS: PlumbingInstall[] = ["buried", "regular"];

interface ItemRow { key: string; name_ar: string; sort_order: number; is_active: boolean }
interface LineRow { line_key: string; line_name: string; kind: LaborKind; basis: Basis; rate: string }
type Msg = { type: "ok" | "error"; text: string } | null;

const newKey = () => "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

export default function LaborSettings() {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [lines, setLines] = useState<Record<string, LineRow[]>>({});
  const [saved, setSaved] = useState<Record<string, string[]>>({}); // سطور الحفظ الأخير لكل بند (لتحديد المحذوف)
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [plumb, setPlumb] = useState<Record<string, string>>({});
  const [plumbDirty, setPlumbDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<Msg>(null);

  async function load() {
    const [i, l, p] = await Promise.all([
      supabase.from("takeoff_items").select("key, name_ar, sort_order, is_active").order("sort_order"),
      supabase.from("takeoff_labor").select("*").order("sort_order"),
      supabase.from("takeoff_plumbing_labor").select("*")
    ]);
    if (i.error || l.error || p.error) {
      setLoadError("تعذّر تحميل جداول المصنعيات. تأكد من تشغيل ملفي migrate_labor_rates.sql ثم migrate_labor_lines.sql في Supabase.");
      setLoading(false);
      return;
    }
    const itemList = ((i.data || []) as ItemRow[]).filter((x) => x.is_active);
    const map: Record<string, LineRow[]> = {};
    const savedMap: Record<string, string[]> = {};
    itemList.forEach((it) => {
      const rows = ((l.data || []) as any[]).filter((x) => x.item_key === it.key);
      savedMap[it.key] = rows.map((r) => r.line_key);
      map[it.key] = rows.length
        ? rows.map((r) => ({ line_key: r.line_key, line_name: r.line_name || "", kind: r.kind, basis: r.basis, rate: String(Number(r.rate || 0)) }))
        : [{ line_key: "main", line_name: `مصنعية ${it.name_ar}`, kind: "per_m2", basis: "apartment_area", rate: "0" }];
    });
    const pm: Record<string, string> = {};
    TIERS.forEach((t) => INSTALLS.forEach((ins) => { pm[`${t.tier}:${ins}`] = "0"; }));
    ((p.data || []) as any[]).forEach((x) => { pm[`${x.bathrooms_tier}:${x.install_type}`] = String(Number(x.price || 0)); });
    setItems(itemList);
    setLines(map);
    setSaved(savedMap);
    setPlumb(pm);
    setLoadError("");
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const patchLine = (itemKey: string, lineKey: string, v: Partial<LineRow>) => {
    setLines((p) => ({ ...p, [itemKey]: p[itemKey].map((ln) => (ln.line_key === lineKey ? { ...ln, ...v } : ln)) }));
    setDirty((d) => ({ ...d, [itemKey]: true }));
  };
  const changeKind = (itemKey: string, lineKey: string, kind: LaborKind) => {
    const basis: Basis = kind === "per_ml" ? "light_pocket_ml" : kind === "per_m2" ? "apartment_area" : "apartment_area";
    patchLine(itemKey, lineKey, { kind, basis });
  };
  const addLine = (it: ItemRow) => {
    setLines((p) => ({
      ...p,
      [it.key]: [...p[it.key], { line_key: newKey(), line_name: `مصنعية ${it.name_ar}`, kind: "per_m2", basis: "apartment_area", rate: "0" }]
    }));
    setDirty((d) => ({ ...d, [it.key]: true }));
  };
  const removeLine = (itemKey: string, lineKey: string) => {
    setLines((p) => ({ ...p, [itemKey]: p[itemKey].filter((ln) => ln.line_key !== lineKey) }));
    setDirty((d) => ({ ...d, [itemKey]: true }));
  };
  const clean = (v: string) => v.replace(/[^0-9.]/g, "");

  async function saveItem(itemKey: string) {
    const rows = lines[itemKey];
    if (rows.some((r) => !Number.isFinite(Number(r.rate || 0)) || Number(r.rate || 0) < 0)) {
      setMsg({ type: "error", text: "الأسعار لازم تكون أرقام صحيحة." });
      return;
    }
    setBusy(itemKey);
    const keep = rows.map((r) => r.line_key);
    const removed = (saved[itemKey] || []).filter((k) => !keep.includes(k));
    if (removed.length > 0) {
      const del = await supabase.from("takeoff_labor").delete().eq("item_key", itemKey).in("line_key", removed);
      if (del.error) { setBusy(""); setMsg({ type: "error", text: "تعذّر حذف السطر: " + del.error.message }); return; }
    }
    const payload = rows.map((r, idx) => ({
      item_key: itemKey, line_key: r.line_key, line_name: r.line_name.trim(), sort_order: idx, kind: r.kind,
      basis: r.kind === "per_m2" || r.kind === "per_ml" ? r.basis : "apartment_area",
      rate: r.kind === "plumbing_tiers" ? 0 : Number(r.rate || 0), updated_at: new Date().toISOString()
    }));
    const { error } = await supabase.from("takeoff_labor").upsert(payload, { onConflict: "item_key,line_key" });
    setBusy("");
    if (error) { setMsg({ type: "error", text: "تعذّر الحفظ: " + error.message }); return; }
    setSaved((s) => ({ ...s, [itemKey]: keep }));
    setDirty((d) => ({ ...d, [itemKey]: false }));
    setMsg({ type: "ok", text: "تم حفظ مصنعيات البند." });
  }

  async function savePlumbing() {
    const payload = TIERS.flatMap((t) => INSTALLS.map((ins) => ({
      bathrooms_tier: t.tier, install_type: ins, price: Number(plumb[`${t.tier}:${ins}`] || 0), updated_at: new Date().toISOString()
    })));
    if (payload.some((x) => !Number.isFinite(x.price) || x.price < 0)) { setMsg({ type: "error", text: "أسعار السباكة لازم تكون أرقام صحيحة." }); return; }
    setBusy("plumbing");
    const { error } = await supabase.from("takeoff_plumbing_labor").upsert(payload, { onConflict: "bathrooms_tier,install_type" });
    setBusy("");
    if (error) { setMsg({ type: "error", text: "تعذّر حفظ أسعار السباكة: " + error.message }); return; }
    setPlumbDirty(false);
    setMsg({ type: "ok", text: "تم حفظ أسعار مصنعية السباكة." });
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-[#D4AF37] text-xs font-bold flex items-center justify-center gap-2">
        <Loader2 className="animate-spin" size={16} /> جاري تحميل المصنعيات...
      </div>
    );
  }
  if (loadError) {
    return <div className="p-5 rounded-2xl border border-rose-500/40 bg-rose-950/20 text-rose-300 text-xs font-bold">{loadError}</div>;
  }

  const hasPlumbingItem = items.some((it) => (lines[it.key] || []).some((ln) => ln.kind === "plumbing_tiers"));

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-[#07132a] border border-[#D4AF37]/30 rounded-2xl p-5 space-y-2">
        <h3 className="text-[#D4AF37] font-black text-sm">مصنعيات الحصر</h3>
        <p className="text-slate-300 text-xs font-bold leading-relaxed">
          كل بند ليه سطر مصنعية أو أكتر. المحارة والدهانات بالمتر المربع، والجبس بورد فلات بالمتر المربع وبيت نور بالمتر الطولي،
          والسيراميك سطر للأرضيات وسطر للحوائط، والمباني مقطوعة أو بالألف طوبة، والكهرباء مقطوعة، والسباكة سعر حسب الحمامات ونوع التأسيس.
          الأسعار دي بيستخدمها المحاكي والتقدير السريع والمقايسة المبدئية ووضع المشروع المسجل.
        </p>
      </div>

      {msg && (
        <div className={`rounded-xl border p-3 text-xs font-bold ${msg.type === "ok" ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300" : "border-rose-500/40 bg-rose-950/20 text-rose-300"}`}>
          {msg.text}
        </div>
      )}

      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.key} className="bg-[#020B1C] border border-[#D4AF37]/30 rounded-xl p-4 space-y-3">
            <h4 className="text-[#D4AF37] font-black text-sm border-r-4 border-[#D4AF37] pr-2">{it.name_ar}</h4>

            {(lines[it.key] || []).map((ln) => (
              <div key={ln.line_key} className="rounded-lg border border-[#1f2d4d] bg-[#07132a] p-3 space-y-2">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className={miniLabel}>اسم السطر</label>
                    <input type="text" value={ln.line_name} onChange={(e) => patchLine(it.key, ln.line_key, { line_name: e.target.value })} className={inputClass} />
                  </div>
                  {(lines[it.key] || []).length > 1 && (
                    <button type="button" aria-label="حذف السطر" onClick={() => removeLine(it.key, ln.line_key)} className="h-9 w-9 shrink-0 rounded-lg border border-rose-500/40 text-rose-300 flex items-center justify-center">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <label className={miniLabel}>نوع المصنعية</label>
                    <select value={ln.kind} onChange={(e) => changeKind(it.key, ln.line_key, e.target.value as LaborKind)} className={inputClass}>
                      {(Object.keys(KIND_LABELS) as LaborKind[]).map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
                    </select>
                  </div>
                  {(ln.kind === "per_m2" || ln.kind === "per_ml") && (
                    <>
                      <div>
                        <label className={miniLabel}>{ln.kind === "per_ml" ? "السعر (جنيه لكل م.ط)" : "السعر (جنيه لكل م²)"}</label>
                        <input type="text" inputMode="decimal" value={ln.rate} onChange={(e) => patchLine(it.key, ln.line_key, { rate: clean(e.target.value) })} className={inputClass} />
                      </div>
                      <div>
                        <label className={miniLabel}>تُحسب على</label>
                        <select value={ln.basis} onChange={(e) => patchLine(it.key, ln.line_key, { basis: e.target.value as Basis })} className={inputClass}>
                          {(ln.kind === "per_ml" ? ML_BASES : M2_BASES).map((b) => <option key={b} value={b}>{AREA_LABELS[b]}</option>)}
                        </select>
                      </div>
                    </>
                  )}
                  {(ln.kind === "lump" || ln.kind === "per_1000_bricks") && (
                    <div className="col-span-2">
                      <label className={miniLabel}>{ln.kind === "lump" ? "المبلغ المقطوع للشقة (جنيه)" : "السعر لكل 1000 طوبة (جنيه)"}</label>
                      <input type="text" inputMode="decimal" value={ln.rate} onChange={(e) => patchLine(it.key, ln.line_key, { rate: clean(e.target.value) })} className={inputClass} />
                      {ln.kind === "per_1000_bricks" && (
                        <p className="text-gray-500 text-[10px] font-bold mt-1">عدد الطوب من تاب المباني في المشروع المسجل، ويُدخل يدوياً في المحاكي.</p>
                      )}
                    </div>
                  )}
                  {ln.kind === "plumbing_tiers" && (
                    <p className="col-span-2 text-gray-400 text-[11px] font-bold">الأسعار في جدول مصنعية السباكة تحت.</p>
                  )}
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              <GoldButton toggle active={false} onClick={() => addLine(it)}><Plus size={14} /> إضافة سطر مصنعية</GoldButton>
            </div>
            <GoldButton size="fill" disabled={!dirty[it.key] || busy === it.key} onClick={() => saveItem(it.key)}>
              {busy === it.key ? <Loader2 className="animate-spin w-4 h-4" /> : dirty[it.key] ? "حفظ" : "محفوظ"}
            </GoldButton>
          </div>
        ))}
      </div>

      <div className="bg-[#020B1C] border border-[#D4AF37]/50 rounded-xl p-4 space-y-3">
        <h4 className="text-[#D4AF37] font-black text-sm">مصنعية السباكة (مقطوعة)</h4>
        <p className="text-gray-400 text-[11px] font-bold leading-relaxed">
          السعر حسب عدد الحمامات ونوع التأسيس (دفن أو عادي). في المشروع المسجل نوع التأسيس بيتقرا من تاب السباكة بالمشروع.
          {!hasPlumbingItem && " تنبيه: مفيش سطر نوعه \"سباكة\" حالياً، فاختار النوع ده لبند السباكة فوق عشان الأسعار دي تتحسب."}
        </p>
        <div className="grid grid-cols-3 gap-2 items-end">
          <span />
          {INSTALLS.map((ins) => <span key={ins} className="text-[11px] font-black text-[#A17A4C] text-center">{PLUMBING_INSTALL_LABELS[ins]}</span>)}
          {TIERS.map((t) => (
            <div key={t.tier} className="contents">
              <span className="text-xs font-black text-white">{t.label}</span>
              {INSTALLS.map((ins) => (
                <input
                  key={ins} type="text" inputMode="decimal" aria-label={`${t.label} ${PLUMBING_INSTALL_LABELS[ins]}`}
                  value={plumb[`${t.tier}:${ins}`] ?? "0"}
                  onChange={(e) => { setPlumb((p) => ({ ...p, [`${t.tier}:${ins}`]: clean(e.target.value) })); setPlumbDirty(true); }}
                  className={inputClass}
                />
              ))}
            </div>
          ))}
        </div>
        <GoldButton size="fill" disabled={!plumbDirty || busy === "plumbing"} onClick={savePlumbing}>
          {busy === "plumbing" ? <Loader2 className="animate-spin w-4 h-4" /> : plumbDirty ? "حفظ أسعار السباكة" : "محفوظ"}
        </GoldButton>
      </div>
    </div>
  );
}