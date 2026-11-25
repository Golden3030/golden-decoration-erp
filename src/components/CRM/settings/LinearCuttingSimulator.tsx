"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import GoldButton from "@/components/ui/GoldButton";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import { simulateLinear, type LinearResult } from "@/lib/linearCutting";

// محاكي قص الأطوال (1D): بروفيلات الجبس بورد، الوزرة، المواسير، الكابلات... قطع بأطوال مطلوبة تتقص من قضبان بطول ثابت.

const inputClass = "h-10 w-full rounded-lg bg-[#020B1C] border border-[#D4AF37]/30 text-white px-2.5 outline-none text-xs font-bold";
const labelClass = "block text-[10px] mb-1 font-bold text-gray-400";

interface PieceRow { id: string; name: string; lengthM: string; count: string }
const newId = () => Math.random().toString(36).slice(2, 8);
const num = (v: string) => Number(v.replace(",", ".")) || 0;
const clean = (v: string) => v.replace(/[^0-9.]/g, "");
const f2 = (n: number) => (Math.round(n * 100) / 100).toLocaleString("en-US");
const m = (mm: number) => f2(mm / 1000);

export default function LinearCuttingSimulator() {
  const [stock, setStock] = useState("");
  const [kerf, setKerf] = useState("0");
  const [minOff, setMinOff] = useState("10");
  const [splice, setSplice] = useState(true);
  const [share, setShare] = useState(true);
  const [pieces, setPieces] = useState<PieceRow[]>([]);
  const [result, setResult] = useState<LinearResult | null>(null);
  const [error, setError] = useState("");

  function loadExample() {
    setStock("3"); setKerf("0"); setMinOff("10"); setSplice(true); setShare(true);
    setPieces([
      { id: newId(), name: "ضلع 3 م", lengthM: "3", count: "2" },
      { id: newId(), name: "ضلع 4 م", lengthM: "4", count: "2" }
    ]);
    setResult(null); setError("");
  }

  function run() {
    setError("");
    if (!(num(stock) > 0)) { setError("اكتب طول العود بالمتر."); setResult(null); return; }
    const valid = pieces.filter((p) => num(p.lengthM) > 0 && num(p.count) > 0);
    if (valid.length === 0) { setError("أضف قطعة واحدة على الأقل بطولها وعددها."); setResult(null); return; }
    setResult(simulateLinear(
      { stockMm: num(stock) * 1000, kerfMm: num(kerf), minOffcutMm: num(minOff) * 10, allowSplice: splice, shareBars: share },
      valid.map((p) => ({ name: p.name || "قطعة", lengthM: num(p.lengthM), count: Math.floor(num(p.count)) }))
    ));
  }

  const patch = (id: string, v: Partial<PieceRow>) => { setPieces((p) => p.map((x) => (x.id === id ? { ...x, ...v } : x))); setResult(null); };
  const t = result?.totals;
  const stockMm = num(stock) * 1000;

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-[#07132a] border border-[#D4AF37]/30 rounded-2xl p-5 space-y-2">
        <h3 className="text-[#D4AF37] font-black text-sm">محاكي قص الأعواد والأطوال (سي، أوميجا، زاوية، شادو جاب، وزرة، مواسير)</h3>
        <p className="text-slate-300 text-xs font-bold leading-relaxed">
          اكتب طول العود الجاهز (زي عود 3 م) والقطع المطلوبة بأطوالها. المحاكاة بتوزع القطع على الأعواد بأقل هالك. فاقد القص هو الشريحة اللي بتضيع من العود مع كل قطع، وسيبه صفر لو مش عايز تحسبه.
        </p>
        <GoldButton toggle active={false} onClick={loadExample}>تحميل مثال: زاوية حول غرفة 3 × 4 م (أعواد 3 م)</GoldButton>
      </div>

      <div className="bg-[#020B1C] border border-[#D4AF37]/30 rounded-xl p-4 space-y-3">
        <h4 className="text-[#D4AF37] font-black text-sm border-r-4 border-[#D4AF37] pr-2">العود</h4>
        <div className="grid grid-cols-3 gap-2">
          <div><label className={labelClass}>طول العود (م)</label><input type="text" inputMode="decimal" value={stock} onChange={(e) => { setStock(clean(e.target.value)); setResult(null); }} className={inputClass} /></div>
          <div><label className={labelClass}>فاقد القص (مم)</label><input type="text" inputMode="decimal" value={kerf} onChange={(e) => { setKerf(clean(e.target.value)); setResult(null); }} className={inputClass} /></div>
          <div><label className={labelClass}>أقل باقي صالح (سم)</label><input type="text" inputMode="decimal" value={minOff} onChange={(e) => { setMinOff(clean(e.target.value)); setResult(null); }} className={inputClass} /></div>
        </div>
        <ToggleSwitch checked={share} onChange={(v) => { setShare(v); setResult(null); }} label="القطع تتشارك نفس العود" className="w-full" />
        <ToggleSwitch checked={splice} onChange={(v) => { setSplice(v); setResult(null); }} label="توصيل القطعة الأطول من العود (وصلة)" className="w-full" />
      </div>

      <div className="bg-[#020B1C] border border-[#D4AF37]/30 rounded-xl p-4 space-y-3">
        <h4 className="text-[#D4AF37] font-black text-sm border-r-4 border-[#D4AF37] pr-2">القطع المطلوبة</h4>
        {pieces.length === 0 && <p className="text-gray-500 text-xs font-bold">لسه مفيش قطع. أضف قطعة أو حمّل المثال.</p>}
        {pieces.map((p) => (
          <div key={p.id} className="grid grid-cols-[1fr_5rem_4rem_auto] gap-2 items-end">
            <div><label className={labelClass}>الاسم</label><input type="text" value={p.name} onChange={(e) => patch(p.id, { name: e.target.value })} className={inputClass} /></div>
            <div><label className={labelClass}>الطول (م)</label><input type="text" inputMode="decimal" value={p.lengthM} onChange={(e) => patch(p.id, { lengthM: clean(e.target.value) })} className={inputClass} /></div>
            <div><label className={labelClass}>العدد</label><input type="text" inputMode="numeric" value={p.count} onChange={(e) => patch(p.id, { count: clean(e.target.value) })} className={inputClass} /></div>
            <button type="button" aria-label="حذف القطعة" onClick={() => { setPieces((x) => x.filter((r) => r.id !== p.id)); setResult(null); }} className="h-10 w-10 rounded-lg border border-rose-500/40 text-rose-300 flex items-center justify-center"><Trash2 size={14} /></button>
          </div>
        ))}
        <GoldButton toggle active={false} onClick={() => { setPieces((p) => [...p, { id: newId(), name: `قطعة ${p.length + 1}`, lengthM: "", count: "1" }]); setResult(null); }}><Plus size={14} /> إضافة قطعة</GoldButton>
      </div>

      <GoldButton size="lg" className="w-full" onClick={run}>ابدأ المحاكاة</GoldButton>
      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-3 text-rose-300 text-xs font-bold">{error}</div>}

      {result && t && (
        <div className="space-y-4">
          <div className="bg-[#020B1C] border border-[#D4AF37]/50 rounded-xl p-4 space-y-2">
            <h4 className="text-[#D4AF37] font-black text-sm border-r-4 border-[#D4AF37] pr-2">النتيجة</h4>
            {([
              ["الأطوال المطلوبة", `${m(t.requiredMm)} م`],
              ["عدد الأعواد المطلوب شراؤها", `${t.barsCount}`],
              ["الطول المشترى", `${m(t.purchasedMm)} م`],
              ["الهالك", `${m(t.wasteMm)} م (${f2(t.wastePct)}% من المشترى)`],
              ["عدد الوصلات", `${t.splices}`],
              ["بواقي صالحة", `${t.usableLeftovers} (إجمالي ${m(t.leftoverMm)} م)`]
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 text-xs font-bold border-b border-[#1f2d4d] last:border-0 pb-1.5 last:pb-0">
                <span className="text-gray-400">{k}</span><span className="text-white text-left">{v}</span>
              </div>
            ))}
          </div>

          {result.warnings.map((w) => (
            <p key={w} className="text-amber-300 text-[11px] font-bold bg-amber-950/20 border border-amber-500/30 rounded-lg p-2">⚠️ {w}</p>
          ))}

          <div className="bg-[#020B1C] border border-[#1f2d4d] rounded-xl p-4 space-y-2">
            <p className="text-[#D4AF37] text-[11px] font-black">خطة القص (كل صف = عود)</p>
            {result.bars.map((b, i) => (
              <div key={i} className="space-y-1">
                <div className="flex h-5 w-full overflow-hidden rounded-md border border-[#1f2d4d] bg-[#07132a]" dir="ltr">
                  {b.pieces.map((p, j) => (
                    <div key={j} style={{ width: `${(p.lengthMm / stockMm) * 100}%` }} className={`h-full border-l border-[#020B1C] ${p.spliced ? "bg-[#2f9e6a]" : "bg-[#D4AF37]"}`} title={`${p.name} ${m(p.lengthMm)} م`} />
                  ))}
                </div>
                <p className="text-gray-400 text-[10px] font-bold">
                  عود {i + 1}: {b.pieces.map((p) => `${m(p.lengthMm)}${p.spliced ? " (وصلة)" : ""}`).join(" + ")} | باقي {m(b.remainingMm)} م
                </p>
              </div>
            ))}
            <p className="text-gray-500 text-[10px] font-bold">دهبي = قطعة كاملة، أخضر = جزء من قطعة موصولة.</p>
          </div>
        </div>
      )}
    </div>
  );
}