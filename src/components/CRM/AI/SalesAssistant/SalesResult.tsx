"use client";

import { useRouter } from "next/navigation";
import GoldButton from "@/components/ui/GoldButton";

interface SalesOptionData {
  level: string;
  label: string;
  minCost: number | null;
  maxCost: number | null;
  minDays: number | null;
  maxDays: number | null;
}

interface AnalysisData {
  area: number;
  level: string;
  dbLevel: string;
  levelSpecified: boolean;
  minCost: number | null;
  maxCost: number | null;
  minDays: number | null;
  maxDays: number | null;
  options: SalesOptionData[];
  counts: { bedrooms: number | null; bathrooms: number | null; receptions: number | null; kitchens: number | null };
  location?: string | null;
  aiText?: string;
}

const money = (n: number) => n.toLocaleString("en-US");

export default function SalesResult({ analysis }: { analysis: AnalysisData }) {
  const router = useRouter();

  function handleRequestEstimate() {
    // نحفظ التقدير كمسودة فقط (بدون أي بيانات عميل وهمية). شاشة الـ CRM تفتح نموذج "إضافة عميل جديد"
    // فيكتب المندوب الاسم والموبايل الحقيقيين، وبعد التسجيل ينتقل التقدير لمشروع العميل تلقائياً.
    try {
      sessionStorage.setItem(
        "salesLeadDraft",
        JSON.stringify({
          area: analysis.area,
          levelLabel: analysis.level,
          dbLevel: analysis.dbLevel,
          levelSpecified: analysis.levelSpecified,
          minCost: analysis.minCost,
          maxCost: analysis.maxCost,
          minDays: analysis.minDays,
          maxDays: analysis.maxDays,
          counts: analysis.counts,
          location: analysis.location || "",
          createdAt: Date.now()
        })
      );
    } catch (e) {
      console.warn("تعذّر حفظ مسودة التقدير", e);
    }
    router.push("/CRM?newLead=1");
  }

  return (
    <div
      dir="rtl"
      className="mt-6 bg-[#07132a] border border-[#F0E6D2] rounded-xl p-6 text-white animate-fade-in"
    >
      <h2 className="text-2xl font-bold text-[#D4AF37] mb-6 select-none">
        نتيجة تحليل الطلب بالذكاء الاصطناعي
      </h2>

      <div className="grid grid-cols-2 gap-4 select-none">
        <div className="border border-[#F0E6D2] rounded-xl p-4">
          <p className="text-gray-300 text-xs">مساحة المشروع</p>
          <h3 className="text-xl font-bold mt-2 text-[#F0E6D2]">
            {analysis.area} متر
          </h3>
        </div>

        <div className="border border-[#F0E6D2] rounded-xl p-4">
          <p className="text-gray-300 text-xs">مستوى التشطيب</p>
          <h3 className="text-xl font-bold mt-2 text-[#F0E6D2]">
            {analysis.levelSpecified ? analysis.level : "لم يحدده العميل"}
          </h3>
        </div>

        <div className="border border-[#F0E6D2] rounded-xl p-4">
          <p className="text-gray-300 text-xs">التكلفة التقديرية</p>
          <h3 className="text-lg font-bold mt-2 text-[#F0E6D2]">
            {analysis.minCost !== null && analysis.maxCost !== null
              ? `${money(analysis.minCost)} - ${money(analysis.maxCost)} جنيه`
              : "غير مضبوطة في الإعدادات"}
          </h3>
        </div>

        <div className="border border-[#F0E6D2] rounded-xl p-4">
          <p className="text-gray-300 text-xs">مدة التنفيذ</p>
          <h3 className="text-xl font-bold mt-2 text-[#F0E6D2]">
            {analysis.minDays !== null && analysis.maxDays !== null
              ? `${analysis.minDays} - ${analysis.maxDays} يوم`
              : "غير مضبوطة في الإعدادات"}
          </h3>
        </div>
      </div>

      {!analysis.levelSpecified && analysis.options?.length > 0 && (
        <div className="mt-4 border border-[#243556] rounded-xl p-4 select-text">
          <p className="text-[#D4AF37] text-xs font-bold mb-3">التقدير لكل مستوى تشطيب (لأن العميل لم يحدد المستوى):</p>
          <div className="space-y-2">
            {analysis.options.map((o) => (
              <div key={o.level} className="flex items-center justify-between gap-3 text-xs text-gray-300 border-b border-[#1f2d4d] pb-2 last:border-0">
                <span className="font-bold text-white">{o.label}</span>
                <span>
                  {o.minCost !== null && o.maxCost !== null ? `${money(o.minCost)} - ${money(o.maxCost)} جنيه` : "السعر غير مضبوط"}
                  {" | "}
                  {o.minDays !== null && o.maxDays !== null ? `${o.minDays} - ${o.maxDays} يوم` : "المدة غير مضبوطة"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 text-[11px] text-gray-400 font-bold">
        مصدر الأرقام: جدول أسعار المتر ومدد التنفيذ في صفحة الإعدادات الفنية، وليست تقديراً من الذكاء الاصطناعي.
      </p>

      {analysis.aiText && (
        <div className="mt-6 p-4 bg-[#020B1C] border border-[#243556] rounded-xl text-right select-text">
          <h3 className="text-sm font-bold text-[#D4AF37] mb-3">💬 رد المساعد الذكي ورسالة الواتساب الجاهزة:</h3>
          <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed select-text font-sans">
            {analysis.aiText}
          </p>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-[#243556] flex justify-end">
        <GoldButton onClick={handleRequestEstimate}>
          📋 طلب مقايسة مبدئية للمشروع
        </GoldButton>
      </div>

    </div>
  );
}