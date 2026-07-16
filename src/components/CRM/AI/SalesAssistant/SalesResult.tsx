"use client";

import { useCRM } from "@/components/CRM/context/CRMContext";
import { useRouter } from "next/navigation";

interface AnalysisData {
  area: number;
  level: string;
  dbLevel: string;
  minCost: number;
  maxCost: number;
  duration: number;
  aiText?: string;
}

export default function SalesResult({ analysis }: { analysis: AnalysisData }) {
  const { setCRMData } = useCRM();
  const router = useRouter();

  function handleRequestEstimate() {
    setCRMData((prev: any) => ({
      ...prev,
      activeTab: "المقايسة",
      customer: {
        customerCode: "C-" + Math.floor(1000 + Math.random() * 9000),
        name: "عميل مبيعات ذكي (محتمل)",
        mobile: "010xxxxxxx",
        phone: "",
        address: "التجمع الخامس - مشروع مبيعات ذكي",
        email: "sales.lead@goldendecor.com",
        status: "جديد"
      },
      project: {
        id: "d19b7d8d-6927-4481-8608-d8f96e4ab50f",
        projectCode: "P-" + Math.floor(1000 + Math.random() * 9000),
        projectName: `مشروع ${analysis.area}م² ${analysis.level} - مبيعات ذكي`,
        estimateNumber: "EST-" + Math.floor(1000 + Math.random() * 9000),
        estimateDate: new Date().toLocaleDateString("en-CA"),
        unitAddress: "موقع تشطيب مبيعات ذكي",
        unitType: "شقة",
        area: analysis.area,
        unitStatus: "بدون تشطيب (طوب احمر)",
        finishingLevel: Array.isArray(analysis.dbLevel) ? "متوسط (سوبر لوكس )" : analysis.dbLevel, 
        receptionsCount: 1,
        roomsCount: 2,
        bathroomsCount: 1,
        kitchensCount: 1,
        balconiesCount: 1
      }
    }));

    router.push("/CRM");
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
            {analysis.level}
          </h3>
        </div>

        <div className="border border-[#F0E6D2] rounded-xl p-4">
          <p className="text-gray-300 text-xs">التكلفة التقديرية</p>
          <h3 className="text-lg font-bold mt-2 text-[#F0E6D2]">
            {analysis.minCost.toLocaleString()} - {analysis.maxCost.toLocaleString()} جنيه
          </h3>
        </div>

        <div className="border border-[#F0E6D2] rounded-xl p-4">
          <p className="text-gray-300 text-xs">مدة التنفيذ</p>
          <h3 className="text-xl font-bold mt-2 text-[#F0E6D2]">
            {analysis.duration} يوم
          </h3>
        </div>
      </div>

      {analysis.aiText && (
        <div className="mt-6 p-4 bg-[#020B1C] border border-[#243556] rounded-xl text-right select-text">
          <h3 className="text-sm font-bold text-[#D4AF37] mb-3">💬 رد المساعد الذكي ورسالة الواتساب الجاهزة:</h3>
          <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed select-text font-sans">
            {analysis.aiText}
          </p>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-[#243556] flex justify-end">
        <button
          onClick={handleRequestEstimate}
          className="bg-[#D4AF37] text-black px-6 py-3 rounded-xl font-bold hover:bg-[#F0E6D2] cursor-pointer transition duration-200 text-xs flex items-center gap-2"
        >
          📋 طلب مقايسة مبدئية للمشروع
        </button>
      </div>

    </div>
  );
}