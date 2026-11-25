"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import GoldButton from "@/components/ui/GoldButton";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import { simulateTiling, type Orientation, type SurfaceResult, type TilingResult } from "@/lib/cuttingEngine";

// محاكي القص: بلاط/سيراميك على أسطح مستطيلة. الهالك بيطلع من محاكاة حقيقية للقص وإعادة استخدام القصاصات، مش نسبة ثابتة.
// بيبدأ فاضي، وفيه زرار لتحميل مثال حمام 2 × 2.8 م.

const inputClass = "h-10 w-full rounded-lg bg-[#020B1C] border border-[#D4AF37]/30 text-white px-2.5 outline-none text-xs font-bold";
const labelClass = "block text-[10px] mb-1 font-bold text-gray-400";

interface SurfaceRow { id: string; name: string; widthM: string; lengthM: string }
const newId = () => Math.random().toString(36).slice(2, 8);
const num = (v: string) => Number(v.replace(",", ".")) || 0;
const clean = (v: string) => v.replace(/[^0-9.]/g, "");
const f1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString("en-US");
const f2 = (n: number) => (Math.round(n * 100) / 100).toLocaleString("en-US");

const KIND_FILL: Record<string, string> = { full: "#16345f", cut_new: "#D4AF37", cut_reuse: "#2f9e6a" };

function LayoutSvg({ s }: { s: SurfaceResult }) {
  const W = 320;
  const scale = W / s.widthMm;
  const H = Math.max(40, Math.round(s.lengthMm * scale));
  if (s.cells.length > 1500) return <p className="text-gray-500 text-[11px] font-bold">الرسم مخفي لأن عدد القطع كبير.</p>;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm rounded-lg border border-[#1f2d4d] bg-[#020B1C]" role="img" aria-label={`رسم تقسيم ${s.name}`}>
      {s.cells.map((c, i) => (
        <rect key={i} x={c.x * scale} y={c.y * scale} width={Math.max(1, c.w * scale)} height={Math.max(1, c.h * scale)} fill={KIND_FILL[c.kind]} fillOpacity={c.kind === "full" ? 0.9 : 0.85} stroke="#020B1C" strokeWidth={1} />
      ))}
    </svg>
  );
}

function cutList(s: SurfaceResult) {
  const map = new Map<string, { w: number; h: number; kind: string; count: number }>();
  s.cells.filter((c) => c.kind !== "full").forEach((c) => {
    const key = `${c.w}x${c.h}|${c.kind}`;
    const e = map.get(key);
    if (e) e.count++;
    else map.set(key, { w: c.w, h: c.h, kind: c.kind, count: 1 });
  });
  return Array.from(map.values()).sort((a, b) => b.w * b.h - a.w * a.h);
}

export default function CuttingSimulator() {
  const [tw, setTw] = useState("");
  const [tl, setTl] = useState("");
  const [grout, setGrout] = useState("3");
  const [perBox, setPerBox] = useState("");
  const [minOff, setMinOff] = useState("10");
  const [reuse, setReuse] = useState(true);
  const [rotate, setRotate] = useState(true);
  const [orientation, setOrientation] = useState<Orientation>("auto");
  const [surfaces, setSurfaces] = useState<SurfaceRow[]>([]);
  const [result, setResult] = useState<TilingResult | null>(null);
  const [error, setError] = useState("");

  function loadExample() {
    setTw("60"); setTl("60"); setGrout("3"); setPerBox("4"); setMinOff("10");
    setReuse(true); setRotate(true); setOrientation("auto");
    setSurfaces([{ id: newId(), name: "أرضية حمام 2 × 2.8 م", widthM: "2", lengthM: "2.8" }]);
    setResult(null); setError("");
  }

  // مثال ألواح جبس بورد: لوح 120 × 240 سم بدون فاصل على سقف 3 × 4 م
  function loadGypsumExample() {
    setTw("120"); setTl("240"); setGrout("0"); setPerBox(""); setMinOff("10");
    setReuse(true); setRotate(true); setOrientation("along_length");
    setSurfaces([{ id: newId(), name: "سقف جبس بورد 3 × 4 م", widthM: "3", lengthM: "4" }]);
    setResult(null); setError("");
  }

  function run() {
    setError("");
    if (!(num(tw) > 0) || !(num(tl) > 0)) { setError("اكتب مقاس البلاطة (العرض والطول بالسم)."); setResult(null); return; }
    const valid = surfaces.filter((s) => num(s.widthM) > 0 && num(s.lengthM) > 0);
    if (valid.length === 0) { setError("أضف سطح واحد على الأقل بأبعاده بالمتر."); setResult(null); return; }
    setResult(simulateTiling(
      {
        widthCm: num(tw), lengthCm: num(tl), groutMm: num(grout), piecesPerBox: num(perBox) || undefined,
        minOffcutCm: num(minOff), reuseOffcuts: reuse, allowRotate: rotate
      },
      valid.map((s) => ({ name: s.name || "سطح", widthM: num(s.widthM), lengthM: num(s.lengthM) })),
      orientation
    ));
  }

  const patch = (id: string, v: Partial<SurfaceRow>) => { setSurfaces((p) => p.map((s) => (s.id === id ? { ...s, ...v } : s))); setResult(null); };
  const t = result?.totals;

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-[#07132a] border border-[#D4AF37]/30 rounded-2xl p-5 space-y-2">
        <h3 className="text-[#D4AF37] font-black text-sm">محاكي القص (سيراميك وبلاط)</h3>
        <p className="text-slate-300 text-xs font-bold leading-relaxed">
          بيقسّم كل سطح لبلاط كامل وقطع، ويقص القطع من البلاط ويعيد استخدام القصاصات. الهالك بيطلع من المحاكاة نفسها، مفيش نسبة هالك ثابتة. الأبعاد بالمتر والبلاط بالسنتيمتر.
        </p>
        <div className="flex flex-wrap gap-2">
          <GoldButton toggle active={false} onClick={loadExample}>تحميل مثال: حمام 2 × 2.8 م</GoldButton>
          <GoldButton toggle active={false} onClick={loadGypsumExample}>تحميل مثال: سقف جبس بورد 3 × 4 م (لوح 120 × 240)</GoldButton>
        </div>
        <p className="text-gray-500 text-[10px] font-bold">الألواح (زي الجبس بورد) نفس الفكرة: اكتب مقاس اللوح في خانتي البلاطة، والفوغة = الفاصل بين الألواح.</p>
      </div>

      <div className="bg-[#020B1C] border border-[#D4AF37]/30 rounded-xl p-4 space-y-3">
        <h4 className="text-[#D4AF37] font-black text-sm border-r-4 border-[#D4AF37] pr-2">البلاطة</h4>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelClass}>العرض (سم)</label><input type="text" inputMode="decimal" value={tw} onChange={(e) => { setTw(clean(e.target.value)); setResult(null); }} className={inputClass} /></div>
          <div><label className={labelClass}>الطول (سم)</label><input type="text" inputMode="decimal" value={tl} onChange={(e) => { setTl(clean(e.target.value)); setResult(null); }} className={inputClass} /></div>
          <div><label className={labelClass}>عرض الفوغة (مم)</label><input type="text" inputMode="decimal" value={grout} onChange={(e) => { setGrout(clean(e.target.value)); setResult(null); }} className={inputClass} /></div>
          <div><label className={labelClass}>عدد البلاط في الصندوق (اختياري)</label><input type="text" inputMode="numeric" value={perBox} onChange={(e) => { setPerBox(clean(e.target.value)); setResult(null); }} className={inputClass} /></div>
          <div><label className={labelClass}>أقل قصاصة صالحة (سم)</label><input type="text" inputMode="decimal" value={minOff} onChange={(e) => { setMinOff(clean(e.target.value)); setResult(null); }} className={inputClass} /></div>
          <div>
            <label className={labelClass}>اتجاه التركيب</label>
            <select value={orientation} onChange={(e) => { setOrientation(e.target.value as Orientation); setResult(null); }} className={inputClass}>
              <option value="auto">تلقائي (الأوفر)</option>
              <option value="along_length">الطول على بعد السطح الرأسي</option>
              <option value="along_width">الطول على بعد السطح الأفقي</option>
            </select>
          </div>
        </div>
        <ToggleSwitch checked={reuse} onChange={(v) => { setReuse(v); setResult(null); }} label="إعادة استخدام القصاصات (اقفلها للبلاط المعرّق أو الموجّه)" className="w-full" />
        <ToggleSwitch checked={rotate} onChange={(v) => { setRotate(v); setResult(null); }} label="السماح بتدوير القصاصة 90 درجة" className="w-full" />
      </div>

      <div className="bg-[#020B1C] border border-[#D4AF37]/30 rounded-xl p-4 space-y-3">
        <h4 className="text-[#D4AF37] font-black text-sm border-r-4 border-[#D4AF37] pr-2">الأسطح (أرضية أو جدار)</h4>
        {surfaces.length === 0 && <p className="text-gray-500 text-xs font-bold">لسه مفيش أسطح. أضف سطح أو حمّل المثال.</p>}
        {surfaces.map((s) => (
          <div key={s.id} className="grid grid-cols-[1fr_5rem_5rem_auto] gap-2 items-end">
            <div><label className={labelClass}>الاسم</label><input type="text" value={s.name} onChange={(e) => patch(s.id, { name: e.target.value })} className={inputClass} /></div>
            <div><label className={labelClass}>العرض (م)</label><input type="text" inputMode="decimal" value={s.widthM} onChange={(e) => patch(s.id, { widthM: clean(e.target.value) })} className={inputClass} /></div>
            <div><label className={labelClass}>الطول (م)</label><input type="text" inputMode="decimal" value={s.lengthM} onChange={(e) => patch(s.id, { lengthM: clean(e.target.value) })} className={inputClass} /></div>
            <button type="button" aria-label="حذف السطح" onClick={() => { setSurfaces((p) => p.filter((x) => x.id !== s.id)); setResult(null); }} className="h-10 w-10 rounded-lg border border-rose-500/40 text-rose-300 flex items-center justify-center"><Trash2 size={14} /></button>
          </div>
        ))}
        <GoldButton toggle active={false} onClick={() => { setSurfaces((p) => [...p, { id: newId(), name: `سطح ${p.length + 1}`, widthM: "", lengthM: "" }]); setResult(null); }}><Plus size={14} /> إضافة سطح</GoldButton>
        <p className="text-gray-500 text-[10px] font-bold">الأسطح بتتشارك القصاصات مع بعض. الفتحات (أبواب وشبابيك) لسه مش محسوبة: اطرحها من أبعاد السطح أو قسّم السطح.</p>
      </div>

      <GoldButton size="lg" className="w-full" onClick={run}>ابدأ المحاكاة</GoldButton>
      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-3 text-rose-300 text-xs font-bold">{error}</div>}

      {result && t && (
        <div className="space-y-4">
          <div className="bg-[#020B1C] border border-[#D4AF37]/50 rounded-xl p-4 space-y-2">
            <h4 className="text-[#D4AF37] font-black text-sm border-r-4 border-[#D4AF37] pr-2">النتيجة ({result.orientation === "along_length" ? "الاتجاه الأول" : "الاتجاه التاني (البلاطة مدورة 90 درجة)"})</h4>
            {([
              ["بلاط كامل", `${t.fullTiles}`],
              ["قطع محتاجة قص", `${t.cutPieces} (منها ${t.reusedPieces} من قصاصات)`],
              ["بلاط اتفتح للقص", `${t.openedTiles}`],
              ["إجمالي البلاط المطلوب", `${t.totalTiles} بلاطة`],
              ...(t.boxes !== null ? [["عدد الصناديق", `${t.boxes}`]] : []),
              ["مساحة الأسطح", `${f2(t.netAreaM2)} م²`],
              ["مساحة البلاط المشترى", `${f2(t.purchasedM2)} م²`],
              ["مساحة البلاط المركّب", `${f2(t.placedM2)} م²`],
              ["الهالك الفعلي", `${f2(t.wasteM2)} م² (${f1(t.wastePct)}% من المشترى)`],
              ["الزيادة على مساحة الأسطح", `${f1(t.overNetPct)}%`],
              ["قصاصات صالحة متبقية", `${t.usableLeftovers}`]
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 text-xs font-bold border-b border-[#1f2d4d] last:border-0 pb-1.5 last:pb-0">
                <span className="text-gray-400">{k}</span>
                <span className="text-white text-left">{v}</span>
              </div>
            ))}
          </div>

          {result.warnings.map((w) => (
            <p key={w} className="text-amber-300 text-[11px] font-bold bg-amber-950/20 border border-amber-500/30 rounded-lg p-2">⚠️ {w}</p>
          ))}

          {result.surfaces.map((s) => (
            <div key={s.name + s.widthMm + s.lengthMm} className="bg-[#020B1C] border border-[#1f2d4d] rounded-xl p-4 space-y-3">
              <h4 className="text-white font-black text-xs">{s.name}: {f2(s.widthMm / 1000)} × {f2(s.lengthMm / 1000)} م ({f2(s.netAreaM2)} م²)</h4>
              <LayoutSvg s={s} />
              <div className="flex flex-wrap gap-3 text-[10px] font-bold text-gray-400">
                <span><span className="inline-block w-3 h-3 rounded-sm align-middle ml-1" style={{ background: KIND_FILL.full }} />كامل ({s.fullTiles})</span>
                <span><span className="inline-block w-3 h-3 rounded-sm align-middle ml-1" style={{ background: KIND_FILL.cut_new }} />قص من بلاطة جديدة ({s.cutPieces - s.reusedPieces})</span>
                <span><span className="inline-block w-3 h-3 rounded-sm align-middle ml-1" style={{ background: KIND_FILL.cut_reuse }} />قص من قصاصة ({s.reusedPieces})</span>
              </div>
              {cutList(s).length > 0 && (
                <div className="space-y-1">
                  <p className="text-[#D4AF37] text-[11px] font-black">قائمة القص</p>
                  {cutList(s).map((c) => (
                    <p key={`${c.w}x${c.h}${c.kind}`} className="text-gray-300 text-[11px] font-bold">
                      {c.count} × ({f1(c.w / 10)} × {f1(c.h / 10)} سم) {c.kind === "cut_reuse" ? "من قصاصة" : "من بلاطة جديدة"}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
          <p className="text-gray-500 text-[10px] font-bold leading-relaxed">
            المحاكاة بتبدأ التقسيم من ركن واحد وبتقص قص مستقيم، وبتحسب الهالك من القص الفعلي. ما بتحسبش كسر أثناء التركيب ولا تفاوت الأبعاد الفعلي للبلاط، فاحتفظ بنسبة أمان صغيرة حسب خبرة المقاول.
          </p>
        </div>
      )}
    </div>
  );
}