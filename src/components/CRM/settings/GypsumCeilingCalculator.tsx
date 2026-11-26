"use client";

import { useState } from "react";
import GoldButton from "@/components/ui/GoldButton";
import GhostButton from "@/components/ui/GhostButton";
import { computeFlatGypsumCeiling, type CDirection, type EdgeType, type FlatCeilingResult } from "@/lib/gypsumCeiling";

// حاسبة سقف جبس بورد فلات: بتدخل أبعاد السقف، وبتطلع ألواح الجبس، وأعواد الزاوية أو الشادو جاب، والسي، والأوميجا، والوصلات، والكليبسات، والتيش.
// القيم الافتراضية هي النظام القياسي (عود 3 م، سي كل 80 سم، أوميجا كل 60 سم، تيش كل 90 سم، لوح 120 × 240).

const inputClass = "h-10 w-full rounded-lg bg-[#020B1C] border border-[#D4AF37]/30 text-white px-2.5 outline-none text-xs font-bold";
const labelClass = "block text-[10px] mb-1 font-bold text-gray-400";
const num = (v: string) => Number(v.replace(",", ".")) || 0;
const clean = (v: string) => v.replace(/[^0-9.]/g, "");
const f2 = (n: number) => (Math.round(n * 100) / 100).toLocaleString("en-US");
const m = (mm: number) => f2(mm / 1000);

// رسم توضيحي للسقف من فوق: الألواح، صفوف السي والأوميجا، التيش، وحافة السقف (زاوية أو شادو جاب).
// التوزيع تقريبي (الصفوف موزعة بالتساوي بعددها المحسوب)، والغرض منه يوضح الفكرة مش يكون مخطط تنفيذ.
function CeilingPlanSvg({ r }: { r: FlatCeilingResult }) {
  const { widthM, lengthM, cDirection, hangersPerRow } = r.layout;
  const W = 320;
  const scale = W / widthM;
  const H = Math.max(60, lengthM * scale);
  const cells = r.boards.surfaces[0]?.cells || [];
  const mmScale = scale / 1000;
  const cAlongLength = cDirection === "along_length";
  const across = cAlongLength ? widthM : lengthM;      // البعد اللي بتتوزع عليه صفوف السي (متر)
  const along = cAlongLength ? lengthM : widthM;       // طول صف السي (متر)
  const evenly = (n: number, total: number) => Array.from({ length: n }, (_, i) => ((i + 0.5) * total) / n);
  const cPos = evenly(r.c.rows, across);               // مواضع صفوف السي
  const oPos = evenly(r.omega.rows, along);            // مواضع صفوف الأوميجا
  const hPos = evenly(hangersPerRow, along);           // مواضع التيش على صف السي
  // تحويل (موضع عبر، موضع طول) لإحداثيات الرسم: x = العرض، y = الطول
  const pt = (a: number, l: number) => (cAlongLength ? { x: a * scale, y: l * scale } : { x: l * scale, y: a * scale });
  const edgeColor = r.edge.type === "angle" ? "#e5e7eb" : "#38bdf8";
  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm rounded-lg border border-[#1f2d4d] bg-[#020B1C]" role="img" aria-label="رسم توضيحي للسقف من فوق">
        {cells.map((c, i) => (
          <rect key={i} x={c.x * mmScale} y={c.y * mmScale} width={Math.max(1, c.w * mmScale)} height={Math.max(1, c.h * mmScale)}
            fill={c.kind === "full" ? "#16345f" : "#7a6420"} fillOpacity={0.55} stroke="#020B1C" strokeWidth={1} />
        ))}
        {oPos.map((o, i) => {
          const a = pt(0, o), b = pt(across, o);
          return <line key={`o${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#2f9e6a" strokeWidth={1.2} />;
        })}
        {cPos.map((c, i) => {
          const a = pt(c, 0), b = pt(c, along);
          return <line key={`c${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#D4AF37" strokeWidth={2.2} />;
        })}
        {cPos.flatMap((c, i) => hPos.map((h, j) => {
          const p = pt(c, h);
          return <circle key={`h${i}-${j}`} cx={p.x} cy={p.y} r={2.6} fill="#ffffff" stroke="#020B1C" strokeWidth={0.8} />;
        }))}
        <rect x={1.5} y={1.5} width={W - 3} height={H - 3} fill="none" stroke={edgeColor} strokeWidth={3} />
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold text-gray-400">
        <span><span className="inline-block w-4 h-1 align-middle ml-1" style={{ background: "#D4AF37" }} />سي</span>
        <span><span className="inline-block w-4 h-0.5 align-middle ml-1" style={{ background: "#2f9e6a" }} />أوميجا</span>
        <span><span className="inline-block w-2 h-2 rounded-full align-middle ml-1 bg-white" />تيش</span>
        <span><span className="inline-block w-4 h-1 align-middle ml-1" style={{ background: edgeColor }} />{r.edge.type === "angle" ? "زاوية" : "شادو جاب"} على المحيط</span>
        <span><span className="inline-block w-3 h-3 rounded-sm align-middle ml-1" style={{ background: "#16345f" }} />لوح كامل</span>
        <span><span className="inline-block w-3 h-3 rounded-sm align-middle ml-1" style={{ background: "#7a6420" }} />لوح مقصوص</span>
      </div>
      <p className="text-gray-500 text-[10px] font-bold">رسم توضيحي: الصفوف موزعة بالتساوي بعددها المحسوب، مش مخطط تنفيذ.</p>
    </div>
  );
}

export default function GypsumCeilingCalculator() {
  const [w, setW] = useState("");
  const [l, setL] = useState("");
  const [bw, setBw] = useState("120");
  const [bl, setBl] = useState("240");
  const [bar, setBar] = useState("3");
  const [edge, setEdge] = useState<EdgeType>("angle");
  const [cDir, setCDir] = useState<CDirection>("along_length");
  const [cSp, setCSp] = useState("80");
  const [oSp, setOSp] = useState("60");
  const [hSp, setHSp] = useState("90");
  const [result, setResult] = useState<FlatCeilingResult | null>(null);
  const [altBars, setAltBars] = useState<{ dir: CDirection; bars: number } | null>(null);
  const [error, setError] = useState("");

  function loadExample() {
    setW("3"); setL("4"); setBw("120"); setBl("240"); setBar("3"); setEdge("angle");
    setCDir("along_length"); setCSp("80"); setOSp("60"); setHSp("90"); setResult(null); setAltBars(null); setError("");
  }

  const build = (dir: CDirection) => computeFlatGypsumCeiling({
    widthM: num(w), lengthM: num(l), boardWidthCm: num(bw), boardLengthCm: num(bl), barLengthM: num(bar), edge,
    cSpacingCm: num(cSp), omegaSpacingCm: num(oSp), hangerSpacingCm: num(hSp), cDirection: dir, kerfMm: 0
  });

  function run() {
    setError("");
    if (!(num(w) > 0) || !(num(l) > 0)) { setError("اكتب عرض وطول السقف بالمتر."); setResult(null); return; }
    if (![bw, bl, bar, cSp, oSp, hSp].every((v) => num(v) > 0)) { setError("كل المقاسات والتباعدات لازم تكون أكبر من صفر."); setResult(null); return; }
    const main = build(cDir);
    setResult(main);
    // اقتراح: لو الاتجاه التاني للسي بيوفر أعواد
    const otherDir: CDirection = cDir === "along_length" ? "along_width" : "along_length";
    const alt = build(otherDir);
    const mainBars = main.c.result.totals.barsCount + main.omega.result.totals.barsCount;
    const altTotal = alt.c.result.totals.barsCount + alt.omega.result.totals.barsCount;
    setAltBars(altTotal < mainBars ? { dir: otherDir, bars: mainBars - altTotal } : null);
  }

  const touch = () => { setResult(null); setAltBars(null); };

  const rows: { k: string; v: string; note?: string }[] = result
    ? [
        { k: "ألواح جبس بورد", v: `${result.boards.totals.totalTiles} لوح`, note: `${f2(result.boards.totals.purchasedM2)} م² للسقف ${f2(result.boards.totals.netAreaM2)} م² (هالك ${f2(result.boards.totals.wastePct)}% من المشترى)` },
        { k: result.edge.type === "angle" ? "أعواد زاوية" : "أعواد شادو جاب", v: `${result.edge.result.totals.barsCount} عود`, note: `محيط ${f2(result.edge.perimeterM)} م، هالك ${m(result.edge.result.totals.wasteMm)} م` },
        { k: "أعواد سي", v: `${result.c.result.totals.barsCount} عود`, note: `${result.c.rows} صفوف × ${f2(result.c.rowLengthM)} م = ${m(result.c.result.totals.requiredMm)} م، هالك ${m(result.c.result.totals.wasteMm)} م` },
        { k: "أعواد أوميجا", v: `${result.omega.result.totals.barsCount} عود`, note: `${result.omega.rows} صفوف × ${f2(result.omega.rowLengthM)} م = ${m(result.omega.result.totals.requiredMm)} م، هالك ${m(result.omega.result.totals.wasteMm)} م` },
        { k: "وصلات (لتوصيل الأعواد)", v: `${result.connectors}` },
        { k: "كليبسات تقاطع سي × أوميجا", v: `${result.clips}` },
        { k: "تيش تعليق", v: `${result.hangers}` }
      ]
    : [];

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-[#07132a] border border-[#D4AF37]/30 rounded-2xl p-5 space-y-2">
        <h3 className="text-[#D4AF37] font-black text-sm">حاسبة سقف جبس بورد فلات</h3>
        <p className="text-slate-300 text-xs font-bold leading-relaxed">
          اكتب أبعاد السقف، وهتطلع ألواح الجبس وأعواد الزاوية أو الشادو جاب والسي والأوميجا والوصلات والكليبسات والتيش. القيم المكتوبة هي النظام القياسي، وتقدر تعدّلها.
        </p>
        <GhostButton onClick={loadExample}>جرّب مثال: سقف فلات 3 × 4 م</GhostButton>
      </div>

      <div className="bg-[#020B1C] border border-[#D4AF37]/30 rounded-xl p-4 space-y-3">
        <h4 className="text-[#D4AF37] font-black text-sm border-r-4 border-[#D4AF37] pr-2">السقف</h4>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelClass}>عرض السقف (م)</label><input type="text" inputMode="decimal" value={w} onChange={(e) => { setW(clean(e.target.value)); touch(); }} className={inputClass} /></div>
          <div><label className={labelClass}>طول السقف (م)</label><input type="text" inputMode="decimal" value={l} onChange={(e) => { setL(clean(e.target.value)); touch(); }} className={inputClass} /></div>
          <div><label className={labelClass}>عرض اللوح (سم)</label><input type="text" inputMode="decimal" value={bw} onChange={(e) => { setBw(clean(e.target.value)); touch(); }} className={inputClass} /></div>
          <div><label className={labelClass}>طول اللوح (سم)</label><input type="text" inputMode="decimal" value={bl} onChange={(e) => { setBl(clean(e.target.value)); touch(); }} className={inputClass} /></div>
        </div>
      </div>

      <div className="bg-[#020B1C] border border-[#D4AF37]/30 rounded-xl p-4 space-y-3">
        <h4 className="text-[#D4AF37] font-black text-sm border-r-4 border-[#D4AF37] pr-2">الأعواد والتقسيط</h4>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelClass}>طول العود (م)</label><input type="text" inputMode="decimal" value={bar} onChange={(e) => { setBar(clean(e.target.value)); touch(); }} className={inputClass} /></div>
          <div>
            <label className={labelClass}>حافة السقف على الحيطان</label>
            <select value={edge} onChange={(e) => { setEdge(e.target.value as EdgeType); touch(); }} className={inputClass}>
              <option value="angle">زاوية</option>
              <option value="shadow_gap">شادو جاب</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelClass}>اتجاه أعواد السي</label>
            <select value={cDir} onChange={(e) => { setCDir(e.target.value as CDirection); touch(); }} className={inputClass}>
              <option value="along_length">في اتجاه الطول (السي بطول السقف)</option>
              <option value="along_width">في اتجاه العرض (السي بعرض السقف)</option>
            </select>
          </div>
          <div><label className={labelClass}>تباعد السي (سم)</label><input type="text" inputMode="decimal" value={cSp} onChange={(e) => { setCSp(clean(e.target.value)); touch(); }} className={inputClass} /></div>
          <div>
            <label className={labelClass}>تباعد الأوميجا (سم)</label>
            <select value={oSp} onChange={(e) => { setOSp(e.target.value); touch(); }} className={inputClass}>
              <option value="40">40</option><option value="50">50</option><option value="60">60</option>
            </select>
          </div>
          <div className="col-span-2"><label className={labelClass}>تباعد التيش على طول عود السي (سم)</label><input type="text" inputMode="decimal" value={hSp} onChange={(e) => { setHSp(clean(e.target.value)); touch(); }} className={inputClass} /></div>
        </div>
      </div>

      <GoldButton size="lg" className="w-full" onClick={run}>احسب</GoldButton>
      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-3 text-rose-300 text-xs font-bold">{error}</div>}

      {result && (
        <div className="space-y-4">
          <div className="bg-[#020B1C] border border-[#D4AF37]/50 rounded-xl p-4 space-y-2">
            <h4 className="text-[#D4AF37] font-black text-sm border-r-4 border-[#D4AF37] pr-2">الكميات المطلوبة</h4>
            {rows.map((r) => (
              <div key={r.k} className="border-b border-[#1f2d4d] last:border-0 pb-2 last:pb-0">
                <div className="flex justify-between gap-3 text-xs font-black">
                  <span className="text-white">{r.k}</span><span className="text-[#D4AF37]">{r.v}</span>
                </div>
                {r.note && <p className="text-gray-500 text-[10px] font-bold mt-0.5">{r.note}</p>}
              </div>
            ))}
          </div>

          <div className="bg-[#020B1C] border border-[#1f2d4d] rounded-xl p-4 space-y-2">
            <p className="text-[#D4AF37] text-[11px] font-black">رسم السقف من فوق</p>
            <CeilingPlanSvg r={result} />
          </div>

          {altBars && (
            <p className="text-emerald-300 text-[11px] font-bold bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-2">
              💡 لو مديت السي في اتجاه {altBars.dir === "along_length" ? "الطول" : "العرض"} بتوفّر {altBars.bars} عود (سي + أوميجا).
            </p>
          )}
          {result.warnings.map((x) => (
            <p key={x} className="text-amber-300 text-[11px] font-bold bg-amber-950/20 border border-amber-500/30 rounded-lg p-2">⚠️ {x}</p>
          ))}
          <div className="bg-[#020B1C] border border-[#1f2d4d] rounded-xl p-4 space-y-1">
            <p className="text-[#D4AF37] text-[11px] font-black">طريقة الحساب</p>
            {result.assumptions.map((a) => (
              <p key={a} className="text-gray-400 text-[10px] font-bold leading-relaxed">• {a}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}