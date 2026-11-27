"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import GoldButton from "@/components/ui/GoldButton";
import GhostButton from "@/components/ui/GhostButton";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import { computeMasonryMods, DEFAULT_MASONRY_PARAMS, type HollowKind, type MasonryResult, type WallInput } from "@/lib/masonryMods";

// حاسبة مباني التعديلات المعمارية (قواطيع جديدة، فتحات أبواب، ديكورات مبنية): طوب، مونة، أشاير، أعتاب، فراغ السقف وشبك الفايبر.

const inputClass = "h-10 w-full rounded-lg bg-[#020B1C] border border-[#D4AF37]/30 text-white px-2.5 outline-none text-xs font-bold";
const labelClass = "block text-[10px] mb-1 font-bold text-gray-400";

interface WallRow {
  id: string; name: string; lengthM: string; heightM: string; wet: boolean;
  doors: string; doorW: string; doorH: string; windows: string; windowW: string; windowH: string;
  junctions: string; toCeiling: boolean;
}
const newId = () => Math.random().toString(36).slice(2, 8);
const num = (v: string) => Number(v.replace(",", ".")) || 0;
const clean = (v: string) => v.replace(/[^0-9.]/g, "");
const f2 = (n: number) => (Math.round(n * 100) / 100).toLocaleString("en-US");
const f1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString("en-US");
const blankWall = (name: string): WallRow => ({
  id: newId(), name, lengthM: "", heightM: "", wet: false, doors: "0", doorW: "0.9", doorH: "2.1",
  windows: "0", windowW: "1.2", windowH: "1", junctions: "1", toCeiling: true
});

// رسم الحيطة من الأمام: طوب مصمت (رمادي)، عتب (كهرماني)، أشاير على جنب الحيطة القديمة (نقط بيضا)، فراغ السقف (شريط أبيض)، وشبك فايبر (أزرق فاتح متقطع).
// مكان الباب في الرسم في نص الحيطة (للتوضيح بس، مش بيأثر على الكميات).
function WallSvg({ w, params }: { w: WallInput; params: { dowelSpacingCm: number; lintelBearingCm: number; solidCourses: number; courseHeightCm: number } }) {
  const W = 300;
  const scale = W / w.lengthM;
  const H = Math.max(60, w.heightM * scale);
  const doorW = w.doors > 0 ? w.doorWM * scale : 0;
  const doorH = w.doors > 0 ? Math.min(w.doorHM, w.heightM) * scale : 0;
  const doorX = (W - doorW) / 2;
  const bear = (params.lintelBearingCm / 100) * scale;
  const brickW = 0.26 * scale;
  const courseH = (params.courseHeightCm / 100) * scale;
  const junctions = Math.min(2, w.oldWallJunctions);
  // عدد الأشاير = الارتفاع ÷ التباعد لأعلى (نفس عدد الحساب)، موزعة بالتساوي على الارتفاع
  const dowelCount = Math.ceil((w.heightM * 100) / params.dowelSpacingCm - 1e-9);
  const dowelY = Array.from({ length: dowelCount }, (_, i) => ((i + 0.5) * H) / dowelCount);
  return (
    <svg viewBox={`-6 -6 ${W + 12} ${H + 12}`} className="w-full max-w-sm rounded-md bg-[#020B1C] border border-[#1f2d4d]" role="img" aria-label={`رسم حيطة ${w.name}`}>
      <rect x={0} y={0} width={W} height={H} fill="#16345f" fillOpacity={0.55} stroke="#243556" />
      {w.wet && <rect x={0} y={H - params.solidCourses * courseH} width={W} height={params.solidCourses * courseH} fill="#6b7280" fillOpacity={0.8} />}
      {w.doors > 0 && (
        <>
          <rect x={doorX - brickW} y={H - doorH} width={brickW} height={doorH} fill="#6b7280" fillOpacity={0.85} />
          <rect x={doorX + doorW} y={H - doorH} width={brickW} height={doorH} fill="#6b7280" fillOpacity={0.85} />
          <rect x={doorX} y={H - doorH} width={doorW} height={doorH} fill="#020B1C" stroke="#9ca3af" strokeWidth={1} />
          <rect x={doorX - bear} y={H - doorH - 6} width={doorW + 2 * bear} height={5} fill="#f59e0b" />
        </>
      )}
      {w.toCeiling && <rect x={0} y={0} width={W} height={3} fill="#e5e7eb" />}
      {Array.from({ length: junctions }).map((_, i) => {
        const x = i === 0 ? 0 : W;
        return (
          <g key={i}>
            <line x1={x} y1={0} x2={x} y2={H} stroke="#22d3ee" strokeWidth={5} strokeDasharray="5 3" strokeOpacity={0.8} />
            {dowelY.map((y, j) => <circle key={j} cx={x} cy={y} r={2.6} fill="#ffffff" stroke="#020B1C" strokeWidth={0.8} />)}
          </g>
        );
      })}
      {w.toCeiling && <line x1={0} y1={1.5} x2={W} y2={1.5} stroke="#22d3ee" strokeWidth={3} strokeDasharray="5 3" strokeOpacity={0.8} />}
    </svg>
  );
}

export default function MasonryCalculator() {
  const [walls, setWalls] = useState<WallRow[]>([]);
  const [brick, setBrick] = useState<HollowKind>("single");
  const [showAdv, setShowAdv] = useState(false);
  const [single, setSingle] = useState(String(DEFAULT_MASONRY_PARAMS.hollowSinglePerM2));
  const [double, setDouble] = useState(String(DEFAULT_MASONRY_PARAMS.hollowDoublePerM2));
  const [cement, setCement] = useState(String(DEFAULT_MASONRY_PARAMS.cementKgPerM2));
  const [sand, setSand] = useState(String(DEFAULT_MASONRY_PARAMS.sandM3PerM2));
  const [solidCourses, setSolidCourses] = useState(String(DEFAULT_MASONRY_PARAMS.solidCourses));
  const [jamb, setJamb] = useState(String(DEFAULT_MASONRY_PARAMS.jambSolidPerCourse));
  const [dowelLen, setDowelLen] = useState(String(DEFAULT_MASONRY_PARAMS.dowelLengthCm));
  const [dowelSp, setDowelSp] = useState(String(DEFAULT_MASONRY_PARAMS.dowelSpacingCm));
  const [bearing, setBearing] = useState(String(DEFAULT_MASONRY_PARAMS.lintelBearingCm));
  const [result, setResult] = useState<MasonryResult | null>(null);
  const [error, setError] = useState("");

  const touch = () => setResult(null);
  const patch = (id: string, v: Partial<WallRow>) => { setWalls((p) => p.map((x) => (x.id === id ? { ...x, ...v } : x))); touch(); };

  function loadExample() {
    setWalls([{ ...blankWall("قاطوع"), lengthM: "3", heightM: "2.8", doors: "1", junctions: "1", toCeiling: true }]);
    setBrick("single"); touch(); setError("");
  }

  const wallInputs: WallInput[] = walls
    .filter((x) => num(x.lengthM) > 0 && num(x.heightM) > 0)
    .map((x) => ({
      name: x.name || "حيطة", lengthM: num(x.lengthM), heightM: num(x.heightM), wet: x.wet, doors: Math.floor(num(x.doors)),
      doorWM: num(x.doorW), doorHM: num(x.doorH), windows: Math.floor(num(x.windows)), windowWM: num(x.windowW), windowHM: num(x.windowH),
      oldWallJunctions: Math.floor(num(x.junctions)), toCeiling: x.toCeiling
    }));
  const params = {
    ...DEFAULT_MASONRY_PARAMS, brick, hollowSinglePerM2: num(single), hollowDoublePerM2: num(double), cementKgPerM2: num(cement), sandM3PerM2: num(sand),
    solidCourses: Math.floor(num(solidCourses)), jambSolidPerCourse: num(jamb), dowelLengthCm: num(dowelLen), dowelSpacingCm: num(dowelSp), lintelBearingCm: num(bearing)
  };

  function run() {
    setError("");
    if (wallInputs.length === 0) { setError("أضف حيطة واحدة على الأقل بطولها وارتفاعها."); setResult(null); return; }
    if (![single, double, dowelLen, dowelSp].every((v) => num(v) > 0)) { setError("معدلات الطوب وأبعاد الأشاير لازم تكون أكبر من صفر."); setResult(null); return; }
    setResult(computeMasonryMods(wallInputs, params));
  }

  const r = result;
  const field = (label: string, value: string, set: (v: string) => void, extra = "") => (
    <div className={extra}><label className={labelClass}>{label}</label><input type="text" inputMode="decimal" value={value} onChange={(e) => { set(clean(e.target.value)); touch(); }} className={inputClass} /></div>
  );

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-[#07132a] border border-[#D4AF37]/30 rounded-2xl p-5 space-y-2">
        <h3 className="text-[#D4AF37] font-black text-sm">حاسبة مباني التعديلات المعمارية</h3>
        <p className="text-slate-300 text-xs font-bold leading-relaxed">
          للقواطيع وفتحات الأبواب والديكورات المبنية داخل الشقق. اكتب أبعاد كل حيطة جديدة وفتحاتها، وهتطلع الطوب (المفرغ والمصمت) والأسمنت والرمل والأشاير والأعتاب وفراغ السقف وشبك الفايبر.
        </p>
        <GhostButton onClick={loadExample}>جرّب مثال: قاطوع 3 × 2.8 م فيه باب</GhostButton>
      </div>

      <div className="space-y-3">
        {walls.length === 0 && <p className="text-gray-500 text-xs font-bold">لسه مفيش حيطان. أضف حيطة أو جرّب المثال.</p>}
        {walls.map((x) => (
          <div key={x.id} className="bg-[#020B1C] border border-[#D4AF37]/30 rounded-xl p-4 space-y-3">
            <div className="flex items-end gap-2">
              <div className="flex-1"><label className={labelClass}>اسم الحيطة</label><input type="text" value={x.name} onChange={(e) => patch(x.id, { name: e.target.value })} className={inputClass} /></div>
              <button type="button" aria-label="حذف الحيطة" onClick={() => { setWalls((p) => p.filter((y) => y.id !== x.id)); touch(); }} className="h-10 w-10 shrink-0 rounded-lg border border-rose-500/40 text-rose-300 flex items-center justify-center"><Trash2 size={14} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {field("الطول (م)", x.lengthM, (v) => patch(x.id, { lengthM: v }))}
              {field("الارتفاع (م)", x.heightM, (v) => patch(x.id, { heightM: v }))}
              {field("عدد الأبواب", x.doors, (v) => patch(x.id, { doors: v }))}
              <div className="grid grid-cols-2 gap-2">
                {field("عرض الباب", x.doorW, (v) => patch(x.id, { doorW: v }))}
                {field("ارتفاعه", x.doorH, (v) => patch(x.id, { doorH: v }))}
              </div>
              {field("عدد الشبابيك", x.windows, (v) => patch(x.id, { windows: v }))}
              <div className="grid grid-cols-2 gap-2">
                {field("عرض الشباك", x.windowW, (v) => patch(x.id, { windowW: v }))}
                {field("ارتفاعه", x.windowH, (v) => patch(x.id, { windowH: v }))}
              </div>
              <div className="col-span-2">
                <label className={labelClass}>جنبات بتلتقي بحيطة قديمة (أشاير وفايبر)</label>
                <select value={x.junctions} onChange={(e) => patch(x.id, { junctions: e.target.value })} className={inputClass}>
                  <option value="0">مفيش</option><option value="1">جنب واحد</option><option value="2">الجنبين</option>
                </select>
              </div>
            </div>
            <ToggleSwitch checked={x.toCeiling} onChange={(v) => patch(x.id, { toCeiling: v })} label="بتوصل للسقف (فراغ تشحيط وفايبر)" className="w-full" />
            <ToggleSwitch checked={x.wet} onChange={(v) => patch(x.id, { wet: v })} label="حمام أو مطبخ (أول 3 مداميك طوب مصمت)" className="w-full" />
          </div>
        ))}
        <GoldButton toggle active={false} onClick={() => { setWalls((p) => [...p, blankWall(`حيطة ${p.length + 1}`)]); touch(); }}><Plus size={14} /> إضافة حيطة</GoldButton>
      </div>

      <div className="bg-[#020B1C] border border-[#D4AF37]/30 rounded-xl p-4 space-y-3">
        <h4 className="text-[#D4AF37] font-black text-sm border-r-4 border-[#D4AF37] pr-2">نوع الطوب</h4>
        <select value={brick} onChange={(e) => { setBrick(e.target.value as HollowKind); touch(); }} className={inputClass}>
          <option value="single">طوب مفرغ 25 × 12 × 6 (نصف طوبة، سمك 12 سم)</option>
          <option value="double">طوب دوبل 25 × 12 × 12</option>
        </select>
        <ToggleSwitch checked={showAdv} onChange={setShowAdv} label="إظهار المعدلات والإعدادات" className="w-full" />
        {showAdv && (
          <div className="grid grid-cols-2 gap-2">
            {field("طوب مفرغ لكل م² (شامل الهالك)", single, setSingle)}
            {field("طوب دوبل لكل م²", double, setDouble)}
            {field("أسمنت لكل م² (كجم)", cement, setCement)}
            {field("رمل لكل م² (م³)", sand, setSand)}
            {field("مداميك مصمتة في الحمام والمطبخ", solidCourses, setSolidCourses)}
            {field("طوب مصمت على كل جنب حلق الباب (لكل مدماك)", jamb, setJamb)}
            {field("طول الأشيرة (سم)", dowelLen, setDowelLen)}
            {field("تباعد الأشاير على الارتفاع (سم)", dowelSp, setDowelSp)}
            {field("تركيب العتب على كل جنب (سم)", bearing, setBearing, "col-span-2")}
          </div>
        )}
      </div>

      <GoldButton size="lg" className="w-full" onClick={run}>احسب</GoldButton>
      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-3 text-rose-300 text-xs font-bold">{error}</div>}

      {r && (
        <div className="space-y-4">
          <div className="bg-[#020B1C] border border-[#D4AF37]/50 rounded-xl p-4 space-y-2">
            <h4 className="text-[#D4AF37] font-black text-sm border-r-4 border-[#D4AF37] pr-2">الكميات المطلوبة</h4>
            {([
              ["مساحة المباني (بعد خصم الفتحات)", `${f2(r.netAreaM2)} م²`],
              [r.brickLabel, `${r.hollowBricks} طوبة`],
              ["طوب مصمت 25×12×6", `${r.solidBricks} طوبة`],
              ["إجمالي الطوب (لمصنعية الألف طوبة)", `${r.totalBricks} طوبة`],
              ["أسمنت", `${f1(r.cementKg)} كجم = ${r.cementBags} شكارة`],
              ["رمل", `${f2(r.sandM3)} م³`],
              ["أشاير حديد (طول الواحدة " + params.dowelLengthCm + " سم)", `${r.dowels} أشيرة (${r.rebarBars} سيخ ${DEFAULT_MASONRY_PARAMS.rebarBarM} م)`],
              ["كيمابوكسي لتثبيت الأشاير", `${r.anchorHoles} ثقب`],
              ["أعتاب", `${r.lintels} عتب (إجمالي ${f2(r.lintelLengthM)} م)`],
              ["فراغ تشحيط تحت السقف", `${f2(r.ceilingGapM)} م طولي`],
              ["شبك فايبر عرض 20 سم", `${f2(r.fiberM)} م طولي`]
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 text-xs font-bold border-b border-[#1f2d4d] last:border-0 pb-1.5 last:pb-0">
                <span className="text-gray-400">{k}</span><span className="text-white text-left">{v}</span>
              </div>
            ))}
          </div>

          {r.warnings.map((w) => (
            <p key={w} className="text-amber-300 text-[11px] font-bold bg-amber-950/20 border border-amber-500/30 rounded-lg p-2">⚠️ {w}</p>
          ))}

          {r.walls.map((x, i) => (
            <div key={x.name + i} className="bg-[#020B1C] border border-[#1f2d4d] rounded-xl p-4 space-y-2">
              <p className="text-white font-black text-xs">{x.name}: صافي {f2(x.netAreaM2)} م²</p>
              <p className="text-gray-400 text-[11px] font-bold">
                مفرغ {x.hollowBricks} + مصمت {x.solidBricks} | أشاير {x.dowels} | أعتاب {x.lintels.length} | فراغ سقف {f2(x.ceilingGapM)} م | فايبر {f2(x.fiberM)} م
              </p>
              <WallSvg w={wallInputs[i]} params={params} />
            </div>
          ))}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold text-gray-400">
            <span><span className="inline-block w-3 h-3 rounded-sm align-middle ml-1" style={{ background: "#6b7280" }} />طوب مصمت</span>
            <span><span className="inline-block w-4 h-1 align-middle ml-1" style={{ background: "#f59e0b" }} />عتب</span>
            <span><span className="inline-block w-2 h-2 rounded-full align-middle ml-1 bg-white" />أشاير حديد</span>
            <span><span className="inline-block w-4 h-1 align-middle ml-1" style={{ background: "#22d3ee" }} />شبك فايبر</span>
            <span><span className="inline-block w-4 h-1 align-middle ml-1" style={{ background: "#e5e7eb" }} />فراغ تحت السقف</span>
          </div>
          <p className="text-gray-500 text-[10px] font-bold">الرسم توضيحي: الباب في نص الحيطة ومكانه مش بيأثر على الكميات.</p>

          <div className="bg-[#020B1C] border border-[#1f2d4d] rounded-xl p-4 space-y-1">
            <p className="text-[#D4AF37] text-[11px] font-black">طريقة الحساب</p>
            {r.assumptions.map((a) => <p key={a} className="text-gray-400 text-[10px] font-bold leading-relaxed">• {a}</p>)}
          </div>
        </div>
      )}
    </div>
  );
}