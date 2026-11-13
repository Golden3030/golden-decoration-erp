"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { isOnline } from "@/lib/offline-sync";

const LEVELS = [
  { key: "economic", label: "اقتصادي" },
  { key: "medium", label: "متوسط" },
  { key: "luxury", label: "لوكس" }
] as const;

type Prices = Record<string, { min: string; max: string }>;

const EMPTY: Prices = {
  economic: { min: "", max: "" },
  medium: { min: "", max: "" },
  luxury: { min: "", max: "" }
};

export default function QuickPricesCard() {
  const [prices, setPrices] = useState<Prices>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from("quick_estimate_prices").select("*");
      if (error) {
        setMessage({ type: "error", text: "تعذّر تحميل الأسعار. تأكد من تشغيل ملف SQL الخاص بجدول الأسعار." });
      } else {
        const next: Prices = JSON.parse(JSON.stringify(EMPTY));
        (data || []).forEach((row: any) => {
          if (next[row.level]) {
            next[row.level] = {
              min: Number(row.min_price_per_m2) > 0 ? String(row.min_price_per_m2) : "",
              max: Number(row.max_price_per_m2) > 0 ? String(row.max_price_per_m2) : ""
            };
          }
        });
        setPrices(next);
      }
      setLoading(false);
    }
    load();
  }, []);

  function setField(level: string, field: "min" | "max", value: string) {
    setMessage(null);
    setPrices((prev) => ({ ...prev, [level]: { ...prev[level], [field]: value } }));
  }

  async function handleSave() {
    if (!isOnline()) {
      setMessage({ type: "error", text: "حفظ الأسعار يتطلب اتصالاً بالإنترنت." });
      return;
    }
    const payload: any[] = [];
    for (const l of LEVELS) {
      const min = Number(prices[l.key].min || 0);
      const max = Number(prices[l.key].max || 0);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < 0) {
        setMessage({ type: "error", text: `أرقام غير صحيحة في مستوى ${l.label}.` });
        return;
      }
      if (max < min) {
        setMessage({ type: "error", text: `في مستوى ${l.label}: السعر الأقصى أقل من الأدنى.` });
        return;
      }
      payload.push({ level: l.key, min_price_per_m2: min, max_price_per_m2: max, updated_at: new Date().toISOString() });
    }
    setSaving(true);
    const { error } = await supabase.from("quick_estimate_prices").upsert(payload);
    setSaving(false);
    setMessage(
      error
        ? { type: "error", text: "فشل الحفظ: " + error.message }
        : { type: "ok", text: "تم حفظ الأسعار." }
    );
  }

  return (
    <div className="w-full bg-[#07132a] border border-[#D4AF37]/30 rounded-2xl p-5 space-y-4 text-right" dir="rtl">
      <h3 className="text-[#D4AF37] font-black text-base border-b border-[#D4AF37]/20 pb-2">
        💰 أسعار المتر للتقدير السريع (جنيه لكل م²)
      </h3>
      <p className="text-slate-300 text-xs font-bold">
        تُستخدم في التقدير السريع للعميل غير المسجل. السعر بيطلع كنطاق من الأدنى إلى الأقصى لكل مستوى تشطيب.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-xs font-bold">
          <Loader2 className="w-4 h-4 animate-spin" /> جاري التحميل...
        </div>
      ) : (
        <div className="space-y-3">
          {LEVELS.map((l) => (
            <div key={l.key} className="grid grid-cols-3 gap-3 items-center">
              <span className="text-white text-xs font-black">{l.label}</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="الأدنى"
                value={prices[l.key].min}
                onChange={(e) => setField(l.key, "min", e.target.value.replace(/[^0-9.]/g, ""))}
                className="h-10 rounded-lg bg-[#020B1C] border border-[#D4AF37]/30 text-white px-3 outline-none text-xs font-bold"
              />
              <input
                type="text"
                inputMode="decimal"
                placeholder="الأقصى"
                value={prices[l.key].max}
                onChange={(e) => setField(l.key, "max", e.target.value.replace(/[^0-9.]/g, ""))}
                className="h-10 rounded-lg bg-[#020B1C] border border-[#D4AF37]/30 text-white px-3 outline-none text-xs font-bold"
              />
            </div>
          ))}
        </div>
      )}

      {message && (
        <p className={`text-xs font-bold ${message.type === "ok" ? "text-emerald-400" : "text-rose-400"}`}>{message.text}</p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || loading}
        className="h-10 px-5 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F1E5C6] text-[#020B1C] font-black text-xs flex items-center gap-2 disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        حفظ الأسعار
      </button>
    </div>
  );
}