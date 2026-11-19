"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { isOnline } from "@/lib/offline-sync";
import GoldButton from "@/components/ui/GoldButton";
import { AREA_LABELS, type Basis, type BomItem, type BomMaterial, type BomRoomFactor, type Rounding } from "@/lib/bomEngine";

const inputClass =
  "h-9 w-full rounded-lg bg-[#020B1C] border border-[#D4AF37]/30 text-white px-2.5 outline-none text-xs font-bold";
const miniLabel = "block text-[10px] mb-1 font-bold text-gray-400";

const BASIS_OPTIONS = Object.keys(AREA_LABELS) as Basis[];
const ROUNDING_LABELS: Record<Rounding, string> = {
  ceil: "لأعلى عدد صحيح",
  half: "لأعلى 0.5 (للأمتار المكعبة)",
  none: "بدون تقريب"
};
const ROOM_LABELS: Record<string, string> = { bedroom: "غرفة نوم", kitchen: "مطبخ", bathroom: "حمام", reception: "ريسبشن" };
const CATEGORY_OPTIONS: Record<string, string> = {
  masonry: "المباني", plaster: "المحارة", paint: "الدهانات", flooring: "الأرضيات والسيراميك", ceiling: "الأسقف المعلقة",
  doors: "الأبواب", aluminum: "الألوميتال", electricity: "الكهرباء", plumbing: "السباكة والصحي", ac: "التكييف",
  decorations: "الديكورات", ventilation: "التهوية", staircase: "السلم", archMod: "التعديلات المعمارية"
};
const FACTOR_LABELS: Record<string, string> = { electric_boxes: "علب الكهرباء لكل غرفة", plumbing_outlets: "مخارج السباكة لكل غرفة" };

type Msg = { type: "ok" | "error"; text: string } | null;

export default function BomSettings() {
  const [items, setItems] = useState<BomItem[]>([]);
  const [materials, setMaterials] = useState<BomMaterial[]>([]);
  const [factors, setFactors] = useState<BomRoomFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState<string>("");
  const [viewSet, setViewSet] = useState<Record<string, "A" | "B">>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [newItemName, setNewItemName] = useState("");
  const [newMat, setNewMat] = useState<Record<string, { name: string; coef: string; unit: string }>>({});

  async function load() {
    const [i, m, f] = await Promise.all([
      supabase.from("takeoff_items").select("*").order("sort_order"),
      supabase.from("takeoff_materials").select("*").order("sort_order"),
      supabase.from("takeoff_room_factors").select("*")
    ]);
    if (i.error || m.error || f.error) {
      setLoadError("تعذّر تحميل جداول المعاملات. تأكد من تشغيل ملف takeoff_bom_setup.sql في Supabase.");
    } else {
      setItems(((i.data || []) as any[]).map((x) => ({ ...x, labor_per_m2: Number(x.labor_per_m2 || 0) })) as BomItem[]);
      setMaterials(((m.data || []) as any[]).map((x) => ({ ...x, coefficient: Number(x.coefficient), pack_size: Number(x.pack_size), unit_price: Number(x.unit_price || 0) })));
      setFactors(((f.data || []) as any[]).map((x) => ({ ...x, factor: Number(x.factor) })));
      setLoadError("");
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const ok = (text: string) => setMsg({ type: "ok", text });
  const fail = (text: string) => setMsg({ type: "error", text });

  async function run<T>(key: string, fn: () => Promise<T>) {
    if (!isOnline()) { fail("التعديل يتطلب اتصالاً بالإنترنت."); return null; }
    setBusy(key); setMsg(null);
    try { return await fn(); } catch (e: any) { fail("فشل الحفظ: " + (e?.message || "خطأ غير معروف")); return null; } finally { setBusy(""); }
  }

  const patchMat = (id: string, patch: Partial<BomMaterial>) => {
    setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    setDirty((d) => ({ ...d, [id]: true }));
  };

  async function saveMaterial(m: BomMaterial) {
    const coef = Number(m.coefficient);
    const pack = Number(m.pack_size);
    const price = Number(m.unit_price || 0);
    if (!m.name_ar.trim() || !Number.isFinite(coef) || coef < 0 || !Number.isFinite(pack) || !(pack > 0) || !Number.isFinite(price) || price < 0) {
      fail("راجع الاسم والمعامل وحجم العبوة (حجم العبوة لازم أكبر من صفر).");
      return;
    }
    await run(m.id, async () => {
      // خامات المجموعة المتبادلة (زي شادو جاب / شادو لايت): تفعيل واحدة يلغي الباقي
      if (m.variant_group && m.is_active) {
        const others = materials.filter((x) => x.item_key === m.item_key && x.set_name === m.set_name && x.variant_group === m.variant_group && x.id !== m.id && x.is_active);
        for (const o of others) {
          const { error } = await supabase.from("takeoff_materials").update({ is_active: false }).eq("id", o.id);
          if (error) throw error;
        }
        setMaterials((prev) => prev.map((x) => (others.some((o) => o.id === x.id) ? { ...x, is_active: false } : x)));
      }
      const { error } = await supabase.from("takeoff_materials").update({
        name_ar: m.name_ar.trim(), coefficient: coef, coeff_unit: m.coeff_unit, purchase_unit: m.purchase_unit,
        pack_size: pack, unit_price: price, rounding: m.rounding, basis: m.basis, is_active: m.is_active, updated_at: new Date().toISOString()
      }).eq("id", m.id);
      if (error) throw error;
      setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, coefficient: coef, pack_size: pack, unit_price: price } : x)));
      setDirty((d) => ({ ...d, [m.id]: false }));
      ok("تم حفظ الخامة.");
    });
  }

  async function deleteMaterial(m: BomMaterial) {
    if (!window.confirm(`حذف "${m.name_ar}" نهائياً؟`)) return;
    await run(m.id, async () => {
      const { error } = await supabase.from("takeoff_materials").delete().eq("id", m.id);
      if (error) throw error;
      setMaterials((prev) => prev.filter((x) => x.id !== m.id));
      ok("تم حذف الخامة.");
    });
  }

  async function addMaterial(item: BomItem, setName: "A" | "B") {
    const f = newMat[item.key + setName] || { name: "", coef: "", unit: "" };
    if (!f.name.trim() || f.coef === "" || !f.unit.trim()) { fail("اكتب اسم الخامة والمعامل ووحدة الشراء."); return; }
    await run(item.key, async () => {
      const sort = Math.max(0, ...materials.map((m) => m.sort_order)) + 1;
      const { data, error } = await supabase.from("takeoff_materials").insert([{
        item_key: item.key, set_name: setName, name_ar: f.name.trim(), basis: "apartment_area", coefficient: Number(f.coef),
        coeff_unit: null, purchase_unit: f.unit.trim(), pack_size: 1, rounding: "ceil", is_active: true, sort_order: sort
      }]).select("*").single();
      if (error) throw error;
      setMaterials((prev) => [...prev, { ...(data as any), coefficient: Number((data as any).coefficient), pack_size: Number((data as any).pack_size) }]);
      setNewMat((p) => ({ ...p, [item.key + setName]: { name: "", coef: "", unit: "" } }));
      ok("تمت إضافة الخامة. اضبط أساس الحساب لها (مساحة الحوائط، الأسقف...) من حقل 'يُحسب على'.");
    });
  }

  async function setActiveSet(item: BomItem, set: "A" | "B") {
    await run(item.key, async () => {
      const { error } = await supabase.from("takeoff_items").update({ active_set: set }).eq("key", item.key);
      if (error) throw error;
      setItems((prev) => prev.map((i) => (i.key === item.key ? { ...i, active_set: set } : i)));
      ok(`تم اعتماد المجموعة ${set === "A" ? "المعاملات الفنية" : "الحصر لكل 1م²"} في بند ${item.name_ar}.`);
    });
  }

  async function saveItem(item: BomItem) {
    await run(item.key, async () => {
      const { error } = await supabase.from("takeoff_items").update({
        name_ar: item.name_ar.trim(), golden_notes: item.golden_notes, is_active: item.is_active,
        estimate_category: item.estimate_category || "decorations"
      }).eq("key", item.key);
      if (error) throw error;
      setDirty((d) => ({ ...d, ["item:" + item.key]: false }));
      ok("تم حفظ بيانات البند.");
    });
  }

  async function addItem() {
    if (!newItemName.trim()) { fail("اكتب اسم البند الرئيسي."); return; }
    await run("new-item", async () => {
      const sort = Math.max(0, ...items.map((i) => i.sort_order)) + 10;
      const { data, error } = await supabase.from("takeoff_items").insert([{
        key: "custom_" + Date.now(), name_ar: newItemName.trim(), sort_order: sort, active_set: "A"
      }]).select("*").single();
      if (error) throw error;
      setItems((prev) => [...prev, data as BomItem]);
      setNewItemName("");
      ok("تمت إضافة البند. أضف له الخامات من داخله.");
    });
  }

  async function saveFactor(f: BomRoomFactor) {
    const value = Number(f.factor);
    if (!Number.isFinite(value) || value < 0) { fail("المعامل لازم يكون رقم صحيح."); return; }
    await run(f.factor_key + f.room_type, async () => {
      const { error } = await supabase.from("takeoff_room_factors").update({ factor: value }).eq("factor_key", f.factor_key).eq("room_type", f.room_type);
      if (error) throw error;
      setFactors((p) => p.map((x) => (x.factor_key === f.factor_key && x.room_type === f.room_type ? { ...x, factor: value } : x)));
      ok("تم حفظ المعامل.");
    });
  }

  if (loading) return <div className="p-8 text-center text-[#D4AF37] text-xs font-bold flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={16} /> جاري تحميل المعاملات...</div>;
  if (loadError) return <div className="p-5 rounded-2xl border border-rose-500/40 bg-rose-950/20 text-rose-300 text-xs font-bold">{loadError}</div>;

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-[#07132a] border border-[#D4AF37]/30 rounded-2xl p-4 text-xs text-slate-300 font-bold leading-relaxed">
        كل بند عنده مجموعتين من المعاملات: <span className="text-[#D4AF37]">أ: المعاملات الفنية</span> و<span className="text-[#D4AF37]">ب: الحصر لكل 1م²</span>.
        المجموعة اللي مكتوب عليها "معتمدة" هي اللي بيحسب منها المحاكي. تقدر تعدّل أي رقم أو تضيف خامة جديدة، وكل تعديل بيتحفظ بزرار "حفظ" في سطره.
      </div>

      {msg && (
        <div className={`rounded-xl p-3 text-xs font-black ${msg.type === "ok" ? "bg-emerald-950/30 border border-emerald-500/40 text-emerald-300" : "bg-rose-950/30 border border-rose-500/40 text-rose-300"}`}>
          {msg.text}
        </div>
      )}

      {items.map((item) => {
        const set = viewSet[item.key] || item.active_set;
        const mats = materials.filter((m) => m.item_key === item.key && m.set_name === set).sort((a, b) => a.sort_order - b.sort_order);
        const countA = materials.filter((m) => m.item_key === item.key && m.set_name === "A").length;
        const countB = materials.filter((m) => m.item_key === item.key && m.set_name === "B").length;
        const nm = newMat[item.key + set] || { name: "", coef: "", unit: "" };
        return (
          <div key={item.key} className="bg-[#07132a] border border-[#D4AF37]/30 rounded-2xl p-4 space-y-4">
            <div className="flex flex-col gap-3">
              <input
                value={item.name_ar}
                onChange={(e) => { setItems((p) => p.map((i) => (i.key === item.key ? { ...i, name_ar: e.target.value } : i))); setDirty((d) => ({ ...d, ["item:" + item.key]: true })); }}
                className="h-10 rounded-lg bg-[#020B1C] border border-[#D4AF37]/40 text-[#D4AF37] px-3 outline-none text-sm font-black"
              />
              <div className="grid grid-cols-2 gap-2">
                <GoldButton toggle size="fill" active={set === "A"} onClick={() => setViewSet((p) => ({ ...p, [item.key]: "A" }))}>
                  أ: المعاملات الفنية ({countA}){item.active_set === "A" ? " ✓ معتمدة" : ""}
                </GoldButton>
                <GoldButton toggle size="fill" active={set === "B"} onClick={() => setViewSet((p) => ({ ...p, [item.key]: "B" }))}>
                  ب: الحصر لكل 1م² ({countB}){item.active_set === "B" ? " ✓ معتمدة" : ""}
                </GoldButton>
              </div>
              {item.active_set !== set && (
                <GoldButton size="fill" disabled={busy === item.key} onClick={() => setActiveSet(item, set)}>
                  اعتماد المجموعة {set === "A" ? "أ" : "ب"} في الحساب لبند {item.name_ar}
                </GoldButton>
              )}
            </div>

            {mats.length === 0 && <p className="text-gray-400 text-xs font-bold">مفيش خامات في المجموعة دي لسه.</p>}

            <div className="space-y-3">
              {mats.map((m) => (
                <div key={m.id} className={`rounded-xl border p-3 space-y-2 ${m.is_active ? "border-[#1f2d4d] bg-[#020B1C]" : "border-[#1f2d4d] bg-[#020B1C] opacity-60"}`}>
                  <input value={m.name_ar} onChange={(e) => patchMat(m.id, { name_ar: e.target.value })} className={inputClass + " text-white"} />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={miniLabel}>المعامل</label>
                      <input type="text" inputMode="decimal" value={String(m.coefficient)} onChange={(e) => patchMat(m.id, { coefficient: e.target.value.replace(/[^0-9.]/g, "") as any })} className={inputClass} />
                    </div>
                    <div>
                      <label className={miniLabel}>وحدة الشراء</label>
                      <input value={m.purchase_unit} onChange={(e) => patchMat(m.id, { purchase_unit: e.target.value })} className={inputClass} />
                    </div>
                    <div className="col-span-2">
                      <label className={miniLabel}>وصف المعامل (مثال: شيكارة / م²)</label>
                      <input value={m.coeff_unit || ""} onChange={(e) => patchMat(m.id, { coeff_unit: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <label className={miniLabel}>يُحسب على</label>
                      <select value={m.basis} onChange={(e) => patchMat(m.id, { basis: e.target.value as Basis })} className={inputClass}>
                        {BASIS_OPTIONS.map((b) => <option key={b} value={b}>{AREA_LABELS[b]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={miniLabel}>حجم العبوة (لتحويل اللتر لبستلة مثلاً)</label>
                      <input type="text" inputMode="decimal" value={String(m.pack_size)} onChange={(e) => patchMat(m.id, { pack_size: e.target.value.replace(/[^0-9.]/g, "") as any })} className={inputClass} />
                    </div>
                    <div>
                      <label className={miniLabel}>سعر الوحدة (جنيه)</label>
                      <input type="text" inputMode="decimal" value={String(m.unit_price ?? 0)} onChange={(e) => patchMat(m.id, { unit_price: e.target.value.replace(/[^0-9.]/g, "") as any })} className={inputClass} />
                    </div>
                    <div>
                      <label className={miniLabel}>التقريب</label>
                      <select value={m.rounding} onChange={(e) => patchMat(m.id, { rounding: e.target.value as Rounding })} className={inputClass}>
                        {(Object.keys(ROUNDING_LABELS) as Rounding[]).map((r) => <option key={r} value={r}>{ROUNDING_LABELS[r]}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-300">
                      <input type="checkbox" checked={m.is_active} onChange={(e) => patchMat(m.id, { is_active: e.target.checked })} />
                      {m.variant_label ? `مفعّل (${m.variant_label})` : "مفعّل في الحساب"}
                    </label>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => deleteMaterial(m)} disabled={busy === m.id} className="w-9 h-9 rounded-lg border border-rose-500/40 text-rose-400 hover:bg-rose-950/40 flex items-center justify-center" aria-label="حذف">
                        <Trash2 size={14} />
                      </button>
                      <GoldButton disabled={!dirty[m.id] || busy === m.id} onClick={() => saveMaterial(m)} className="h-9! px-4!">
                        {busy === m.id ? <Loader2 className="animate-spin w-4 h-4" /> : dirty[m.id] ? "حفظ" : "محفوظ"}
                      </GoldButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-dashed border-[#D4AF37]/40 p-3 space-y-2">
              <p className="text-[#D4AF37] text-[11px] font-black">إضافة خامة جديدة لهذه المجموعة</p>
              <input placeholder="اسم الخامة" value={nm.name} onChange={(e) => setNewMat((p) => ({ ...p, [item.key + set]: { ...nm, name: e.target.value } }))} className={inputClass} />
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="المعامل" inputMode="decimal" value={nm.coef} onChange={(e) => setNewMat((p) => ({ ...p, [item.key + set]: { ...nm, coef: e.target.value.replace(/[^0-9.]/g, "") } }))} className={inputClass} />
                <input placeholder="وحدة الشراء" value={nm.unit} onChange={(e) => setNewMat((p) => ({ ...p, [item.key + set]: { ...nm, unit: e.target.value } }))} className={inputClass} />
              </div>
              <GoldButton size="fill" disabled={busy === item.key} onClick={() => addMaterial(item, set)}>+ إضافة الخامة</GoldButton>
            </div>

            <div className="rounded-xl border border-[#1f2d4d] bg-[#020B1C] p-3 space-y-2">
              <p className="text-[#D4AF37] text-[11px] font-black">قسم البند في المقايسة</p>
              <p className="text-gray-500 text-[10px] font-bold leading-relaxed">مصنعيات البنود بتتضبط من تاب "المصنعيات" (بالمتر أو مقطوعة).</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className={miniLabel}>يظهر في قسم المقايسة</label>
                  <select value={item.estimate_category || "decorations"}
                    onChange={(e) => { setItems((p) => p.map((i) => (i.key === item.key ? { ...i, estimate_category: e.target.value } : i))); setDirty((d) => ({ ...d, ["item:" + item.key]: true })); }}
                    className={inputClass}>
                    {Object.entries(CATEGORY_OPTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className={miniLabel}>ملاحظات فنية للبند</label>
              <textarea
                value={item.golden_notes || ""}
                rows={4}
                onChange={(e) => { setItems((p) => p.map((i) => (i.key === item.key ? { ...i, golden_notes: e.target.value } : i))); setDirty((d) => ({ ...d, ["item:" + item.key]: true })); }}
                className="w-full rounded-lg bg-[#020B1C] border border-[#D4AF37]/30 text-gray-200 p-2.5 outline-none text-xs font-semibold leading-relaxed"
              />
              <div className="mt-2 flex justify-end">
                <GoldButton disabled={!dirty["item:" + item.key] || busy === item.key} onClick={() => saveItem(item)} className="h-9! px-4!">
                  {dirty["item:" + item.key] ? "حفظ بيانات البند" : "محفوظ"}
                </GoldButton>
              </div>
            </div>
          </div>
        );
      })}

      <div className="bg-[#07132a] border border-[#D4AF37]/30 rounded-2xl p-4 space-y-3">
        <p className="text-[#D4AF37] text-sm font-black">إضافة بند رئيسي جديد</p>
        <input placeholder="اسم البند (مثال: أعمال الألوميتال)" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className={inputClass} />
        <GoldButton size="fill" disabled={busy === "new-item"} onClick={addItem}>+ إضافة البند</GoldButton>
      </div>

      <div className="bg-[#07132a] border border-[#D4AF37]/30 rounded-2xl p-4 space-y-3">
        <p className="text-[#D4AF37] text-sm font-black">معاملات المخارج حسب نوع الغرفة</p>
        {factors.map((f) => (
          <div key={f.factor_key + f.room_type} className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-gray-300">{FACTOR_LABELS[f.factor_key] || f.factor_key} - {ROOM_LABELS[f.room_type] || f.room_type}</span>
            <div className="flex items-center gap-2">
              <input type="text" inputMode="decimal" value={String(f.factor)} onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ""); setFactors((p) => p.map((x) => (x === f ? { ...x, factor: v as any } : x))); }} className={inputClass + " w-20!"} />
              <GoldButton onClick={() => saveFactor(f)} disabled={busy === f.factor_key + f.room_type} className="h-9! px-3!">حفظ</GoldButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}