"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { isOnline } from "@/lib/offline-sync";
import GoldButton from "@/components/ui/GoldButton";
import { FINISH_LEVELS } from "@/lib/finishLevels";

type Row = { min: string; max: string; dmin: string; dmax: string; fmin: string; fmax: string };
type Rows = Record<string, Row>;

const emptyRows = (): Rows =>
  Object.fromEntries(FINISH_LEVELS.map((l) => [l.key, { min: "", max: "", dmin: "", dmax: "", fmin: "", fmax: "" }]));

const inputClass =
  "h-10 w-full rounded-lg bg-[#020B1C] border border-[#D4AF37]/30 text-white px-3 outline-none text-xs font-bold";

const digits = (v: string) => v.replace(/[^0-9.]/g, "");
const positive = (v: any) => (Number(v) > 0 ? String(v) : "");

export default function QuickPricesCard() {
  const [rows, setRows] = useState<Rows>(emptyRows());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [historyHint, setHistoryHint] = useState<string>("");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from("quick_estimate_prices").select("*");
      if (error) {
        setMessage({ type: "error", text: "تعذّر تحميل الأسعار. تأكد من تشغيل ملف SQL الخاص بجدول الأسعار والمستويات." });
      } else {
        const next = emptyRows();
        (data || []).forEach((r: any) => {
          if (next[r.level]) {
            next[r.level] = {
              min: positive(r.min_price_per_m2),
              max: positive(r.max_price_per_m2),
              dmin: positive(r.min_days_per_100m2),
              dmax: positive(r.max_days_per_100m2),
              fmin: positive(r.fixed_days_min),
              fmax: positive(r.fixed_days_max)
            };
          }
        });
        setRows(next);
      }

      // معدل مدة التنفيذ الفعلي من مشاريعك المنتهية (للاسترشاد عند ضبط المدد)
      const { data: projs } = await supabase
        .from("projects")
        .select("area, start_date, actual_end_date")
        .not("actual_end_date", "is", null)
        .not("start_date", "is", null);
      const rates = (projs || [])
        .map((p: any) => {
          const days = (new Date(p.actual_end_date).getTime() - new Date(p.start_date).getTime()) / 86400000;
          const area = Number(p.area);
          return days > 0 && area > 0 ? (days / area) * 100 : null;
        })
        .filter((v: number | null): v is number => v !== null)
        .sort((a: number, b: number) => a - b);
      if (rates.length >= 3) {
        const median = rates[Math.floor(rates.length / 2)];
        setHistoryHint(`وسيط مشاريعك المنتهية: ${Math.round(median)} يوم لكل 100 م² (من ${rates.length} مشروع).`);
      }
      setLoading(false);
    }
    load();
  }, []);

  function setField(level: string, field: keyof Row, value: string) {
    setMessage(null);
    setRows((prev) => ({ ...prev, [level]: { ...prev[level], [field]: digits(value) } }));
  }

  async function handleSave() {
    if (!isOnline()) {
      setMessage({ type: "error", text: "حفظ الأسعار يتطلب اتصالاً بالإنترنت." });
      return;
    }
    const payload: any[] = [];
    for (const l of FINISH_LEVELS) {
      const r = rows[l.key];
      const min = Number(r.min || 0), max = Number(r.max || 0), dmin = Number(r.dmin || 0), dmax = Number(r.dmax || 0);
      const fmin = Number(r.fmin || 0), fmax = Number(r.fmax || 0);
      if ([min, max, dmin, dmax, fmin, fmax].some((n) => !Number.isFinite(n) || n < 0)) {
        setMessage({ type: "error", text: `أرقام غير صحيحة في مستوى ${l.label}.` });
        return;
      }
      if (max < min) { setMessage({ type: "error", text: `في مستوى ${l.label}: السعر الأقصى أقل من الأدنى.` }); return; }
      if (dmax < dmin) { setMessage({ type: "error", text: `في مستوى ${l.label}: أقصى مدة أقل من الأدنى.` }); return; }
      if (fmax < fmin) { setMessage({ type: "error", text: `في مستوى ${l.label}: أقصى مدة ثابتة أقل من الأدنى.` }); return; }
      payload.push({
        level: l.key,
        min_price_per_m2: min,
        max_price_per_m2: max,
        min_days_per_100m2: dmin,
        max_days_per_100m2: dmax,
        fixed_days_min: fmin,
        fixed_days_max: fmax,
        updated_at: new Date().toISOString()
      });
    }
    setSaving(true);
    const { error } = await supabase.from("quick_estimate_prices").upsert(payload);
    setSaving(false);
    setMessage(error ? { type: "error", text: "فشل الحفظ: " + error.message } : { type: "ok", text: "تم حفظ الأسعار والمدد." });
  }

  return (
    <div className="w-full bg-[#07132a] border border-[#D4AF37]/30 rounded-2xl p-5 space-y-4 text-right" dir="rtl">
      <h3 className="text-[#D4AF37] font-black text-base border-b border-[#D4AF37]/20 pb-2">
        💰 أسعار المتر ومدد التنفيذ (التقدير السريع ومساعد المبيعات)
      </h3>
      <p className="text-slate-300 text-xs font-bold leading-relaxed">
        كل رقم في التكلفة والمدة التقديرية اللي بيظهر للعميل مصدره الجدول ده. الأسعار بالجنيه لكل م²،
        والمدة بعدد الأيام لكل 100 م²، وبتتحسب كنطاق من الأدنى للأقصى.
      </p>
      {historyHint && <p className="text-[#D4AF37] text-xs font-black">{historyHint}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-xs font-bold">
          <Loader2 className="w-4 h-4 animate-spin" /> جاري التحميل...
        </div>
      ) : (
        <div className="space-y-4">
          {FINISH_LEVELS.map((l) => (
            <div key={l.key} className="rounded-xl border border-[#1f2d4d] bg-[#020B1C] p-4 space-y-3">
              <span className="text-white text-sm font-black">{l.label}</span>
              <div>
                <p className="text-[#A17A4C] text-[11px] font-black mb-2">سعر المتر (جنيه)</p>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" inputMode="decimal" placeholder="الأدنى" value={rows[l.key].min} onChange={(e) => setField(l.key, "min", e.target.value)} className={inputClass} />
                  <input type="text" inputMode="decimal" placeholder="الأقصى" value={rows[l.key].max} onChange={(e) => setField(l.key, "max", e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <p className="text-[#A17A4C] text-[11px] font-black mb-2">مدة التنفيذ الثابتة للنظام (بالأيام، بغض النظر عن المساحة)</p>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" inputMode="decimal" placeholder="الأدنى" value={rows[l.key].fmin} onChange={(e) => setField(l.key, "fmin", e.target.value)} className={inputClass} />
                  <input type="text" inputMode="decimal" placeholder="الأقصى" value={rows[l.key].fmax} onChange={(e) => setField(l.key, "fmax", e.target.value)} className={inputClass} />
                </div>
                <p className="text-gray-500 text-[10px] font-bold mt-1">لو اتضبطت المدة الثابتة، هي اللي بتظهر للعميل وبتتقدم على المعدل بالمتر تحت.</p>
              </div>
              <div>
                <p className="text-[#A17A4C] text-[11px] font-black mb-2">أو: مدة التنفيذ بالمعدل (يوم لكل 100 م²)</p>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" inputMode="decimal" placeholder="الأدنى" value={rows[l.key].dmin} onChange={(e) => setField(l.key, "dmin", e.target.value)} className={inputClass} />
                  <input type="text" inputMode="decimal" placeholder="الأقصى" value={rows[l.key].dmax} onChange={(e) => setField(l.key, "dmax", e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {message && (
        <p className={`text-xs font-bold ${message.type === "ok" ? "text-emerald-400" : "text-rose-400"}`}>{message.text}</p>
      )}

      <GoldButton onClick={handleSave} disabled={saving || loading}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        حفظ الأسعار والمدد
      </GoldButton>
    </div>
  );
}