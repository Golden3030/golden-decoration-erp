"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import GoldButton from "@/components/ui/GoldButton";
import GhostButton from "@/components/ui/GhostButton";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import { computeInsulation, type InsulationResult } from "@/lib/insulation";

// حاسبة العزل الأسمنتي للأرضيات (زي سيكا توب سيل 107): أرضية الغرفة + رفع العزل على الحوائط، وعدد المجموعات وشريط الفايبر.
// القيم الافتراضية من نشرة المنتج اللي حددتها: المجموعة 25 كجم (بودرة 20 + سائل 5) تفرد حوالي 10 م² وجهين، ورفع على الحوائط 20 إلى 30 سم.

const inputClass = "h-10 w-full rounded-lg bg-[#020B1C] border border-[#D4AF37]/30 text-white px-2.5 outline-none text-xs font-bold";
const labelClass = "block text-[10px] mb-1 font-bold text-gray-400";

interface RoomRow { id: string; name: string; widthM: string; lengthM: string }
const newId = () => Math.random().toString(36).slice(2, 8);
const num = (v: string) => Number(v.replace(",", ".")) || 0;
const clean = (v: string) => v.replace(/[^0-9.]/g, "");
const f2 = (n: number) => (Math.round(n * 100) / 100).toLocaleString("en-US");
const f1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString("en-US");

// رسم الغرف من فوق بمقياس موحد: الأرضية بالأزرق، شريط رفع العزل على الحوائط بالكهرماني، وشريط الفايبر على الزوايا (أزرق فاتح متقطع).
function PlanSvg({ rooms, upturnM }: { rooms: { name: string; widthM: number; lengthM: number }[]; upturnM: number }) {
  const maxDim = Math.max(...rooms.map((r) => Math.max(r.widthM, r.lengthM)), 1);
  const scale = 130 / maxDim;
  // الشريط أوسع شوية من حجمه الحقيقي عشان يبان في الرسم
  const band = Math.max(3, upturnM * scale);
  return (
    <div className="flex flex-wrap gap-3">
      {rooms.map((r, i) => {
        const w = r.widthM * scale;
        const h = r.lengthM * scale;
        return (
          <div key={i} className="space-y-1">
            <svg width={w + 8} height={h + 8} viewBox={`-4 -4 ${w + 8} ${h + 8}`} role="img" aria-label={`رسم عزل ${r.name}`} className="rounded-md bg-[#020B1C] border border-[#1f2d4d]">
              <rect x={0} y={0} width={w} height={h} fill="#16345f" fillOpacity={0.85} />
              <rect x={band / 2} y={band / 2} width={Math.max(0, w - band)} height={Math.max(0, h - band)} fill="none" stroke="#f59e0b" strokeWidth={band} strokeOpacity={0.6} />
              <rect x={band} y={band} width={Math.max(0, w - 2 * band)} height={Math.max(0, h - 2 * band)} fill="none" stroke="#22d3ee" strokeWidth={1.5} strokeDasharray="4 3" />
              <text x={w / 2} y={h / 2} textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontSize={10} fontWeight={700}>{r.name}</text>
            </svg>
            <p className="text-[10px] font-bold text-gray-500 text-center">{f2(r.widthM)} × {f2(r.lengthM)} م</p>
          </div>
        );
      })}
    </div>
  );
}

export default function InsulationCalculator() {
  const [coverage, setCoverage] = useState("10");
  const [powder, setPowder] = useState("20");
  const [liquid, setLiquid] = useState("5");
  const [upturn, setUpturn] = useState("30");
  const [door, setDoor] = useState("0");
  const [meshRoll, setMeshRoll] = useState("10");
  const [meshExtra, setMeshExtra] = useState("0");
  const [share, setShare] = useState(true);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [result, setResult] = useState<InsulationResult | null>(null);
  const [error, setError] = useState("");

  const touch = () => setResult(null);

  function loadExample() {
    setRooms([
      { id: newId(), name: "حمام 1", widthM: "2", lengthM: "3" },
      { id: newId(), name: "حمام 2", widthM: "1.5", lengthM: "2.4" },
      { id: newId(), name: "مطبخ", widthM: "2.5", lengthM: "3" }
    ]);
    setCoverage("10"); setPowder("20"); setLiquid("5"); setUpturn("30"); setDoor("0"); setMeshRoll("10"); setMeshExtra("0"); setShare(true);
    setResult(null); setError("");
  }

  const validRooms = rooms.filter((r) => num(r.widthM) > 0 && num(r.lengthM) > 0).map((r) => ({ name: r.name || "غرفة", widthM: num(r.widthM), lengthM: num(r.lengthM) }));

  function run() {
    setError("");
    if (validRooms.length === 0) { setError("أضف غرفة واحدة على الأقل بأبعادها بالمتر."); setResult(null); return; }
    if (!(num(coverage) > 0) || !(num(powder) >= 0) || !(num(liquid) >= 0) || !(num(meshRoll) > 0)) { setError("تغطية المجموعة وطول لفة الفايبر لازم يكونوا أكبر من صفر."); setResult(null); return; }
    setResult(computeInsulation({
      rooms: validRooms, upturnCm: num(upturn), doorWidthM: num(door), coveragePerKitM2: num(coverage),
      powderKg: num(powder), liquidKg: num(liquid), shareKits: share, meshRollM: num(meshRoll), meshExtraM: num(meshExtra)
    }));
  }

  const patch = (id: string, v: Partial<RoomRow>) => { setRooms((p) => p.map((x) => (x.id === id ? { ...x, ...v } : x))); touch(); };
  const r = result;

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-[#07132a] border border-[#D4AF37]/30 rounded-2xl p-5 space-y-2">
        <h3 className="text-[#D4AF37] font-black text-sm">حاسبة العزل الأسمنتي للأرضيات</h3>
        <p className="text-slate-300 text-xs font-bold leading-relaxed">
          اكتب أبعاد الغرف المعزولة (حمام، حمامين، حمام ومطبخ، أو أكتر). الحاسبة بتحسب أرضية كل غرفة مع رفع العزل على الحوائط، وعدد المجموعات (بودرة وسائل) وشريط الفايبر.
        </p>
        <GhostButton onClick={loadExample}>جرّب مثال: حمامين + مطبخ</GhostButton>
      </div>

      <div className="bg-[#020B1C] border border-[#D4AF37]/30 rounded-xl p-4 space-y-3">
        <h4 className="text-[#D4AF37] font-black text-sm border-r-4 border-[#D4AF37] pr-2">الغرف</h4>
        {rooms.length === 0 && <p className="text-gray-500 text-xs font-bold">لسه مفيش غرف. أضف غرفة أو جرّب المثال.</p>}
        {rooms.map((x) => (
          <div key={x.id} className="grid grid-cols-[1fr_5rem_5rem_auto] gap-2 items-end">
            <div><label className={labelClass}>الاسم</label><input type="text" value={x.name} onChange={(e) => patch(x.id, { name: e.target.value })} className={inputClass} /></div>
            <div><label className={labelClass}>العرض (م)</label><input type="text" inputMode="decimal" value={x.widthM} onChange={(e) => patch(x.id, { widthM: clean(e.target.value) })} className={inputClass} /></div>
            <div><label className={labelClass}>الطول (م)</label><input type="text" inputMode="decimal" value={x.lengthM} onChange={(e) => patch(x.id, { lengthM: clean(e.target.value) })} className={inputClass} /></div>
            <button type="button" aria-label="حذف الغرفة" onClick={() => { setRooms((p) => p.filter((y) => y.id !== x.id)); touch(); }} className="h-10 w-10 rounded-lg border border-rose-500/40 text-rose-300 flex items-center justify-center"><Trash2 size={14} /></button>
          </div>
        ))}
        <GoldButton toggle active={false} onClick={() => { setRooms((p) => [...p, { id: newId(), name: p.length === 0 ? "حمام" : `غرفة ${p.length + 1}`, widthM: "", lengthM: "" }]); touch(); }}><Plus size={14} /> إضافة غرفة</GoldButton>
      </div>

      <div className="bg-[#020B1C] border border-[#D4AF37]/30 rounded-xl p-4 space-y-3">
        <h4 className="text-[#D4AF37] font-black text-sm border-r-4 border-[#D4AF37] pr-2">المنتج والتنفيذ</h4>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelClass}>تغطية المجموعة (م²) وجهين</label><input type="text" inputMode="decimal" value={coverage} onChange={(e) => { setCoverage(clean(e.target.value)); touch(); }} className={inputClass} /></div>
          <div><label className={labelClass}>رفع العزل على الحوائط (سم) 20 إلى 30</label><input type="text" inputMode="decimal" value={upturn} onChange={(e) => { setUpturn(clean(e.target.value)); touch(); }} className={inputClass} /></div>
          <div><label className={labelClass}>بودرة المجموعة (كجم)</label><input type="text" inputMode="decimal" value={powder} onChange={(e) => { setPowder(clean(e.target.value)); touch(); }} className={inputClass} /></div>
          <div><label className={labelClass}>سائل المجموعة (كجم)</label><input type="text" inputMode="decimal" value={liquid} onChange={(e) => { setLiquid(clean(e.target.value)); touch(); }} className={inputClass} /></div>
          <div><label className={labelClass}>عرض الباب المخصوم لكل غرفة (م)</label><input type="text" inputMode="decimal" value={door} onChange={(e) => { setDoor(clean(e.target.value)); touch(); }} className={inputClass} /></div>
          <div><label className={labelClass}>طول لفة الفايبر (م)</label><input type="text" inputMode="decimal" value={meshRoll} onChange={(e) => { setMeshRoll(clean(e.target.value)); touch(); }} className={inputClass} /></div>
          <div className="col-span-2"><label className={labelClass}>زيادة فايبر حوالين المواسير والبيبات (م)</label><input type="text" inputMode="decimal" value={meshExtra} onChange={(e) => { setMeshExtra(clean(e.target.value)); touch(); }} className={inputClass} /></div>
        </div>
        <ToggleSwitch checked={share} onChange={(v) => { setShare(v); touch(); }} label="الغرف بتتعزل في نفس الجلسة وبتتشارك المجموعات" className="w-full" />
      </div>

      <GoldButton size="lg" className="w-full" onClick={run}>احسب</GoldButton>
      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-3 text-rose-300 text-xs font-bold">{error}</div>}

      {r && (
        <div className="space-y-4">
          <div className="bg-[#020B1C] border border-[#D4AF37]/50 rounded-xl p-4 space-y-2">
            <h4 className="text-[#D4AF37] font-black text-sm border-r-4 border-[#D4AF37] pr-2">الكميات المطلوبة</h4>
            {([
              ["مساحة الأرضيات", `${f2(r.floorM2)} م²`],
              ["رفع العزل على الحوائط", `${f2(r.upturnM2)} م²`],
              ["إجمالي المساحة المعزولة", `${f2(r.totalM2)} م²`],
              ["عدد المجموعات (بودرة + سائل)", `${r.kits}`],
              ["البودرة", `${f2(r.powderKg)} كجم`],
              ["السائل", `${f2(r.liquidKg)} كجم`],
              ["الوزن الكلي", `${f2(r.totalKg)} كجم`],
              ["استهلاك المجموعات", `${f1(r.utilizationPct)}% (الباقي ${f1(r.spareM2)} م²)`],
              ["شريط الفايبر", `${f1(r.meshM)} م = ${r.meshRolls} لفة`]
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 text-xs font-bold border-b border-[#1f2d4d] last:border-0 pb-1.5 last:pb-0">
                <span className="text-gray-400">{k}</span><span className="text-white text-left">{v}</span>
              </div>
            ))}
            {r.kitsSeparate !== r.kitsShared && (
              <p className="text-gray-500 text-[10px] font-bold">لو كل غرفة لوحدها: {r.kitsSeparate} مجموعة. لو مشتركين: {r.kitsShared}.</p>
            )}
          </div>

          {r.warnings.map((w) => (
            <p key={w} className="text-amber-300 text-[11px] font-bold bg-amber-950/20 border border-amber-500/30 rounded-lg p-2">⚠️ {w}</p>
          ))}

          <div className="bg-[#020B1C] border border-[#1f2d4d] rounded-xl p-4 space-y-2">
            <p className="text-[#D4AF37] text-[11px] font-black">تفاصيل كل غرفة</p>
            {r.rooms.map((x) => (
              <p key={x.name + x.floorM2} className="text-gray-300 text-[11px] font-bold">
                • {x.name}: أرضية {f2(x.floorM2)} + وزرة {f2(x.upturnM2)} (محيط {f2(x.perimeterM)} م) = {f2(x.totalM2)} م²
              </p>
            ))}
          </div>

          <div className="bg-[#020B1C] border border-[#1f2d4d] rounded-xl p-4 space-y-2">
            <p className="text-[#D4AF37] text-[11px] font-black">رسم الغرف من فوق</p>
            <PlanSvg rooms={validRooms} upturnM={num(upturn) / 100} />
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold text-gray-400">
              <span><span className="inline-block w-3 h-3 rounded-sm align-middle ml-1" style={{ background: "#16345f" }} />أرضية</span>
              <span><span className="inline-block w-4 h-1 align-middle ml-1" style={{ background: "#f59e0b" }} />رفع العزل على الحوائط</span>
              <span><span className="inline-block w-4 h-0.5 align-middle ml-1" style={{ background: "#22d3ee" }} />شريط الفايبر على الزوايا</span>
            </div>
            <p className="text-gray-500 text-[10px] font-bold">رسم توضيحي بمقياس موحد بين الغرف، وعرض شريط الوزرة مكبّر شوية.</p>
          </div>

          <div className="bg-[#020B1C] border border-[#1f2d4d] rounded-xl p-4 space-y-1">
            <p className="text-[#D4AF37] text-[11px] font-black">ملاحظات التنفيذ</p>
            {[
              "اخلط البودرة بالسائل المرفق معها فقط باستخدام مضرب كهربائي، ولا تضف أي مياه خارجية.",
              "التنفيذ على وجهين متعامدين: الوجه الأول في اتجاه، وبعد الجفاف (حوالي 4 إلى 6 ساعات) الوجه التاني في اتجاه متعامد عليه.",
              "العزل بيترفع على الحوائط بارتفاع 20 إلى 30 سم، وشريط الفايبر على الزوايا وحوالين مواسير الصرف والبيبة.",
              "المجموعة بتتخلط كاملة ومش بتتقسم، فعدد المجموعات بيتقرّب لأعلى. استخدم فرشاة عريضة (4 بوصة) أو رولة خشنة للفرد."
            ].map((n) => <p key={n} className="text-gray-400 text-[10px] font-bold leading-relaxed">• {n}</p>)}
          </div>
        </div>
      )}
    </div>
  );
}