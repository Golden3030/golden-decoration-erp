"use client";

import { categoryNames } from "./EstimateTable";

const categoryIcons: { [key: string]: string } = {
  archMod: "🔨", masonry: "🧱", plaster: "🖌️", paint: "🎨",
  flooring: "▦", ceiling: "🔲", ac: "❄️", ventilation: "💨",
  doors: "🚪", aluminum: "🪟", staircase: "🪜", electricity: "⚡",
  plumbing: "🚿", decorations: "✨",
};

const DONUT_COLORS = [
  "#1e3a5f", "#2e8b8b", "#D4AF37", "#8b6f47", "#4a6741",
  "#a0522d", "#5f4b8b", "#2f6690", "#b8860b", "#556b2f",
  "#8b4513", "#4682b4", "#cd853f", "#708090",
];

interface PrintableEstimateProps {
  customer?: any;
  project?: any;
  estimate?: any; // لازم يحتوي على items[] + materialsCost/laborCost/engineeringPercentage/... (أو النسخة snake_case المقابلة)
}

export default function PrintableEstimate({ customer = {}, project = {}, estimate = {} }: PrintableEstimateProps) {
  const items = estimate.items || [];

  const groupedItems: Record<string, any[]> = items.reduce((acc: any, item: any) => {
    const key = item.category || "decorations";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  // ترتيب التصنيفات حسب نفس ترتيبها فى categoryNames بدل الترتيب العشوائي
  const orderedCategoryKeys = Object.keys(categoryNames).filter((k) => groupedItems[k]?.length > 0);

  const categoryTotals = orderedCategoryKeys.map((key) => {
    const catItems = groupedItems[key];
    const materials = catItems.reduce((s: number, it: any) => s + Number(it.quantity || 0) * Number(it.unitPrice ?? it.unit_price ?? 0), 0);
    const execution = catItems.reduce((s: number, it: any) => s + Number(it.laborCost ?? it.labor_cost ?? 0), 0);
    return { key, materials, execution, total: materials + execution };
  });

  const materialsCost = Number(estimate.materialsCost ?? estimate.materials_cost ?? categoryTotals.reduce((s, c) => s + c.materials, 0));
  const laborCost = Number(estimate.laborCost ?? estimate.labor_cost ?? categoryTotals.reduce((s, c) => s + c.execution, 0));
  const engineeringPercentage = Number(estimate.engineeringPercentage ?? estimate.engineering_percentage ?? 10);
  const preSupervisionTotal = materialsCost + laborCost;
  const engineeringValue = (estimate.engineeringValue ?? estimate.engineering_value)
    ? Number(estimate.engineeringValue ?? estimate.engineering_value)
    : preSupervisionTotal * (engineeringPercentage / 100);
  const grandTotal = estimate.total ? Number(estimate.total) : preSupervisionTotal + engineeringValue;

  const formattedDate = (estimate.date ?? estimate.created_at)
    ? new Date(estimate.date ?? estimate.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });

  const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

  // حساب زوايا الرسم الدائري (Donut) من نسب المواد فقط لكل تصنيف من إجمالي الخامات
  let cumulativePercent = 0;
  const donutSegments = categoryTotals.map((cat, i) => {
    const percent = materialsCost > 0 ? (cat.materials / materialsCost) * 100 : 0;
    const startPercent = cumulativePercent;
    cumulativePercent += percent;
    return { ...cat, percent, startPercent, color: DONUT_COLORS[i % DONUT_COLORS.length] };
  });

  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  return (
    <div dir="rtl" id="printable-estimate" className="bg-white text-[#1a1a1a] max-w-250 mx-auto font-sans" style={{ fontFamily: "var(--font-alexandria)" }}>
      {/* الهيدر */}
      <div className="flex items-center justify-between p-8 bg-linear-to-l from-[#020B1C] via-[#0c1e3d] to-[#D4AF37]/20 border-b-4 border-[#D4AF37]">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Golden Decoration" className="h-16 w-auto" />
          <div>
            <p className="text-[#D4AF37] font-black text-lg tracking-wide">GOLDEN DECORATION</p>
            <p className="text-white/60 text-[10px] tracking-widest">ART IN EVERY SPACE</p>
          </div>
        </div>
        <div className="text-left">
          <h1 className="text-[#D4AF37] text-4xl font-black">مقايسة</h1>
          <p className="text-white text-lg font-bold">عرض أسعار</p>
        </div>
      </div>

      {/* كروت البيانات */}
      <div className="grid grid-cols-3 gap-4 p-6">
        <InfoCard icon="👤" label="اسم العميل" value={customer.name || "—"} />
        <InfoCard icon="🏢" label="بيانات المشروع" value={`${project.projectName ?? project.project_name ?? "—"}\n${project.unitAddress ?? project.unit_address ?? project.location ?? ""}`} multiline />
        <InfoCard icon="📅" label="تاريخ المقايسة" value={formattedDate} />
        <InfoCard icon="📏" label="المساحة" value={`${project.area || "—"} م²`} />
        <InfoCard icon="🎯" label="مستوى التشطيب" value={project.finishingLevel ?? project.finishing_level ?? "—"} />
        <InfoCard icon="#" label="كود المقايسة" value={estimate.estimateNumber ?? estimate.estimate_number ?? project.estimateNumber ?? "—"} />
        <InfoCard icon="🏠" label="نوع الوحدة" value={project.unitType ?? project.unit_type ?? "شقة سكنية"} />
      </div>

      {/* الجدول مجمّع بالتصنيف */}
      <div className="px-6">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#1a1a1a] text-white">
              <th className="p-3 text-center w-10">م</th>
              <th className="p-3 text-right">البند</th>
              <th className="p-3 text-center">الوحدة</th>
              <th className="p-3 text-center">الكمية</th>
              <th className="p-3 text-center">تكلفة الخامات (ج.م)</th>
              <th className="p-3 text-center">تكلفة التنفيذ (ج.م)</th>
              <th className="p-3 text-center">إجمالي البند (ج.م)</th>
            </tr>
          </thead>
          <tbody>
            {orderedCategoryKeys.map((catKey, catIdx) => (
              <>
                <tr key={`cat-${catKey}`} className="bg-[#D4AF37]/10">
                  <td colSpan={7} className="p-2 font-black text-[#8b6f1f] flex items-center gap-2">
                    <span>{categoryIcons[catKey] || "•"}</span> {catIdx + 1}. {categoryNames[catKey]}
                  </td>
                </tr>
                {groupedItems[catKey].map((item: any, i: number) => (
                  <tr key={item.id || i} className="border-b border-gray-200">
                    <td className="p-2 text-center text-gray-400 text-xs">{catIdx + 1}.{i + 1}</td>
                    <td className="p-2">
                      <div className="font-bold">{item.name}</div>
                      {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                    </td>
                    <td className="p-2 text-center">{item.unit}</td>
                    <td className="p-2 text-center">{item.quantity}</td>
                    <td className="p-2 text-center font-mono">{fmt(Number(item.quantity || 0) * Number(item.unitPrice ?? item.unit_price ?? 0))}</td>
                    <td className="p-2 text-center font-mono">{fmt(Number(item.laborCost ?? item.labor_cost ?? 0))}</td>
                    <td className="p-2 text-center font-mono font-black text-[#8b6f1f]">
                      {fmt(Number(item.quantity || 0) * Number(item.unitPrice ?? item.unit_price ?? 0) + Number(item.laborCost ?? item.labor_cost ?? 0))}
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* الملخص المالي + الرسم الدائري */}
      <div className="grid grid-cols-2 gap-6 p-6 mt-4">
        <div className="rounded-xl overflow-hidden border-2 border-[#1a1a1a]">
          <SummaryRow label="إجمالي الخامات" value={`${fmt(materialsCost)} ج.م`} />
          <SummaryRow label="إجمالي التنفيذ" value={`${fmt(laborCost)} ج.م`} />
          <SummaryRow label="الإجمالي قبل الإشراف" value={`${fmt(preSupervisionTotal)} ج.م`} />
          <SummaryRow label={`نسبة الإشراف الهندسي (${engineeringPercentage}%)`} value={`${fmt(engineeringValue)} ج.م`} />
          <SummaryRow label="الاجمالي التعاقدي" value={`${fmt(grandTotal)} ج.م`} highlight />
        </div>

        <div className="flex flex-col items-center justify-center">
          <p className="font-black text-sm mb-2">توزيع تكلفة الخامات على البنود</p>
          <div className="relative w-45 h-45">
            <svg viewBox="0 0 180 180" className="-rotate-90">
              {donutSegments.map((seg, i) => {
                const dash = (seg.percent / 100) * circumference;
                const offset = (seg.startPercent / 100) * circumference;
                return (
                  <circle
                    key={i}
                    cx="90" cy="90" r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="24"
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offset}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-gray-500">إجمالي الخامات</span>
              <span className="font-black text-sm">{fmt(materialsCost)} ج.م</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-[10px]">
            {donutSegments.map((seg, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: seg.color }} />
                <span>{categoryNames[seg.key]}</span>
                <span className="text-gray-400">{seg.percent.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-gray-500 px-6">* هذه المقايسة صالحة لمدة 30 يوم من تاريخ الإصدار</p>

      {/* الفوتر */}
      <div className="flex items-center justify-around bg-[#1a1a1a] text-white p-4 mt-6 text-xs">
        <span>📞 0100 123 4567</span>
        <span>✉️ info@goldendecoration.com</span>
        <span>🌐 www.goldendecoration.com</span>
        <span>📍 القاهرة - مصر</span>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value, multiline }: { icon: string; label: string; value: string; multiline?: boolean }) {
  return (
    <div className="border-2 border-[#D4AF37]/50 rounded-xl p-3 flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-[10px] text-gray-500">{label}</p>
        <p className={`font-bold text-sm ${multiline ? "whitespace-pre-line leading-tight" : ""}`}>{value}</p>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-200 last:border-0 ${highlight ? "bg-[#D4AF37]/20 font-black" : ""}`}>
      <span className="text-sm">{label}</span>
      <span className="font-mono font-bold">{value}</span>
    </div>
  );
}