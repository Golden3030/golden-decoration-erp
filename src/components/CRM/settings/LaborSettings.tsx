"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import GoldButton from "@/components/ui/GoldButton";
import { AREA_LABELS, PLUMBING_INSTALL_LABELS, type Basis, type LaborKind, type PlumbingInstall } from "@/lib/bomEngine";

// تاب المصنعيات: نوع مصنعية كل بند وسعرها. بالمتر للمحارة والدهانات والجبس بورد والسيراميك،
// ومقطوعة للكهرباء، والسباكة سعر مقطوع حسب عدد الحمامات ونوع التأسيس (دفن أو عادي).
// محرك الحصر بيقرا من هنا بس (المحاكي، التقدير السريع، المقايسة المبدئية، ووضع المشروع المسجل).

const inputClass = "h-9 w-full rounded-lg bg-[#020B1C] border border-[#D4AF37]/30 text-white px-2.5 outline-none text-xs font-bold";
const miniLabel = "block text-[10px] mb-1 font-bold text-gray-400";
const BASIS_OPTIONS = Object.keys(AREA_LABELS).filter((b) => b !== "per_unit") as Basis[];
const KIND_LABELS: Record<LaborKind, string> = {
  per_m2: "بالمتر (جنيه لكل م²)",
  lump: "مقطوعة (مبلغ ثابت للشقة)",
  plumbing_tiers: "سباكة: سعر حسب الحمامات ونوع التأسيس"
};
const TIERS: { tier: 1 | 2 | 3; label: string }[] = [
  { tier: 1, label: "حمام واحد" },
  { tier: 2, label: "حمامين" },
  { tier: 3, label: "3 حمامات فأكثر" }
];
const INSTALLS: PlumbingInstall[] = ["buried", "regular"];

interface ItemRow { key: string; name_ar: string; sort_order: number; is_active: boolean }
interface LaborRow { kind: LaborKind; basis: Basis; rate: string }
type Msg = { type: "ok" | "error"; text: string } | null;

export default function LaborSettings() {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [rows, setRows] = useState<Record<string, LaborRow>>({});
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
      supabase.from("takeoff_labor").select("*"),
      supabase.from("takeoff_plumbing_labor").select("*")
    ]);
    if (i.error || l.error || p.error) {
      setLoadError("تعذّر تحميل جداول المصنعيات. تأكد من تشغيل ملف migrate_labor_rates.sql في Supabase.");
      setLoading(false);
      return;
    }
    const itemList = ((i.data || []) as ItemRow[]).filter((x) => x.is_active);
    const map: Record<string, LaborRow> = {};
    itemList.forEach((it) => {
      const r = ((l.data || []) as any[]).find((x) => x.item_key === it.key);
      map[it.key] = r
        ? { kind: r.kind, basis: r.basis, rate: String(Number(r.rate || 0)) }
        : { kind: "per_m2", basis: "apartment_area", rate: "0" };
    });
    const pm: Record<string, string> = {};
    TIERS.forEach((t) => INSTALLS.forEach((ins) => { pm[`${t.tier}:${ins}`] = "0"; }));
    ((p.data || []) as any[]).forEach((x) => { pm[`${x.bathrooms_tier}:${x.install_type}`] = String(Number(x.price || 0)); });
    setItems(itemList);
    setRows(map);
    setPlumb(pm);
    setLoadError("");
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const patch = (key: string, v: Partial<LaborRow>) => {
    setRows((p) => ({ ...p, [key]: { ...p[key], ...v } }));
    setDirty((d) => ({ ...d, [key]: true }));
  };
  const clean = (v: string) => v.replace(/[^0-9.]/g, "");

  async function saveRow(key: string) {
    const r = rows[key];
    const rate = Number(r.rate || 0);
    if (!Number.isFinite(rate) || rate < 0) { setMsg({ type: "error", text: "السعر لازم يكون رقم صحيح." }); return; }
    setBusy(key);
    const { error } = await supabase.from("takeoff_labor").upsert(
      { item_key: key, kind: r.kind, basis: r.basis, rate: r.kind === "plumbing_tiers" ? 0 : rate, updated_at: new Date().toISOString() },
      { onConflict: "item_key" }
    );
    setBusy("");
    if (error) { setMsg({ type: "error", text: "تعذّر الحفظ: " + error.message }); return; }
    setDirty((d) => ({ ...d, [key]: false }));
    setMsg({ type: "ok", text: "تم حفظ مصنعية البند." });
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

  const hasPlumbingItem = items.some((it) => rows[it.key]?.kind === "plumbing_tiers");

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-[#07132a] border border-[#D4AF37]/30 rounded-2xl p-5 space-y-2">
        <h3 className="text-[#D4AF37] font-black text-sm">مصنعيات الحصر</h3>
        <p className="text-slate-300 text-xs font-bold leading-relaxed">
          اختار لكل بند نوع المصنعية: بالمتر (المحارة والدهانات والجبس بورد والسيراميك)، أو مقطوعة (الكهرباء)،
          أو سباكة بسعر حسب عدد الحمامات ونوع التأسيس. الأسعار دي بيستخدمها المحاكي والتقدير السريع والمقايسة المبدئية ووضع المشروع المسجل.
        </p>
      </div>

      {msg && (
        <div className={`rounded-xl border p-3 text-xs font-bold ${msg.type === "ok" ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300" : "border-rose-500/40 bg-rose-950/20 text-rose-300"}`}>
          {msg.text}
        </div>
      )}

      <div className="space-y-3">
        {items.map((it) => {
          const r = rows[it.key];
          return (
            <div key={it.key} className="bg-[#020B1C] border border-[#D4AF37]/30 rounded-xl p-4 space-y-3">
              <h4 className="text-[#D4AF37] font-black text-sm border-r-4 border-[#D4AF37] pr-2">{it.name_ar}</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className={miniLabel}>نوع المصنعية</label>
                  <select value={r.kind} onChange={(e) => patch(it.key, { kind: e.target.value as LaborKind })} className={inputClass}>
                    {(Object.keys(KIND_LABELS) as LaborKind[]).map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
                  </select>
                </div>
                {r.kind === "per_m2" && (
                  <>
                    <div>
                      <label className={miniLabel}>السعر (جنيه لكل م²)</label>
                      <input type="text" inputMode="decimal" value={r.rate} onChange={(e) => patch(it.key, { rate: clean(e.target.value) })} className={inputClass} />
                    </div>
                    <div>
                      <label className={miniLabel}>تُحسب على</label>
                      <select value={r.basis} onChange={(e) => patch(it.key, { basis: e.target.value as Basis })} className={inputClass}>
                        {BASIS_OPTIONS.map((b) => <option key={b} value={b}>{AREA_LABELS[b]}</option>)}
                      </select>
                    </div>
                  </>
                )}
                {r.kind === "lump" && (
                  <div className="col-span-2">
                    <label className={miniLabel}>المبلغ المقطوع للشقة (جنيه)</label>
                    <input type="text" inputMode="decimal" value={r.rate} onChange={(e) => patch(it.key, { rate: clean(e.target.value) })} className={inputClass} />
                  </div>
                )}
                {r.kind === "plumbing_tiers" && (
                  <p className="col-span-2 text-gray-400 text-[11px] font-bold">الأسعار في جدول مصنعية السباكة تحت.</p>
                )}
              </div>
              <GoldButton size="fill" disabled={!dirty[it.key] || busy === it.key} onClick={() => saveRow(it.key)}>
                {busy === it.key ? <Loader2 className="animate-spin w-4 h-4" /> : dirty[it.key] ? "حفظ" : "محفوظ"}
              </GoldButton>
            </div>
          );
        })}
      </div>

      <div className="bg-[#020B1C] border border-[#D4AF37]/50 rounded-xl p-4 space-y-3">
        <h4 className="text-[#D4AF37] font-black text-sm">مصنعية السباكة (مقطوعة)</h4>
        <p className="text-gray-400 text-[11px] font-bold leading-relaxed">
          السعر حسب عدد الحمامات ونوع التأسيس (دفن أو عادي).
          {!hasPlumbingItem && " تنبيه: مفيش بند نوعه \"سباكة\" حالياً، فاختار النوع ده لبند السباكة فوق عشان الأسعار دي تتحسب."}
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