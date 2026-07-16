"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import InitialEstimate, { PrintReportLayout } from "@/components/CRM/estimate/InitialEstimate";
import FinalEstimate from "@/components/CRM/estimate/FinalEstimate";
import { useCRM } from "@/components/CRM/context/CRMContext";
import { supabase } from "@/lib/supabaseClient";

export default function EstimatesPage() {
  const router = useRouter();
  const { crmData, setCRMData } = useCRM();

  const [estimatesList, setEstimatesList] = useState<any[]>([]);
  const [selectedEstimate, setSelectedEstimate] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // التبويبات المخصصة للمقايسة (مبدئية / نهائية)
  const [activeTab, setActiveTab] = useState<"initial" | "final">("initial");

  useEffect(() => {
        document.title = " المقايســات | Golden Decoration";
    loadEstimates();
  }, []);

  async function loadEstimates() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("estimate_headers")
        .select(`
          id,
          estimate_number,
          status,
          materials_total,
          labor_total,
          grand_total,
          created_at,
          projects (
            id,
            project_name,
            location,
            customers (
              name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEstimatesList(data || []);
    } catch (err: any) {
      console.error("Error loading estimates:", err);
    } finally {
      setLoading(false);
    }
  }

  // شحن المقايسة بالكامل بداخل الـ Context الموحد وتعديل تبويب الفتح الافتراضي تلقائياً
  function selectRow(item: any) {
    setSelectedEstimate(item);

    // ذكاء واجهة مستخدم: التوجيه الفوري للتبويب النهائي إذا كانت المقايسة نهائية
    setActiveTab(item.status === "نهائية" ? "final" : "initial");

    setCRMData((prev: any) => ({
      ...prev,
      customer: {
        name: item.projects?.customers?.name || "عميل غير محدد"
      },
      project: {
        id: item.projects?.id,
        projectName: item.projects?.project_name,
        estimateNumber: item.estimate_number,
        estimateDate: new Date(item.created_at).toLocaleDateString("en-CA"),
        unitAddress: item.projects?.location
      },
      estimate: {
        number: item.estimate_number,
        status: item.status,
        materialsCost: item.materials_total,
        laborCost: item.labor_total,
        grand_total: item.grand_total,
        items: prev.estimate?.items || []
      }
    }));
  }

  return (
    <main className="min-h-screen flex flex-row-reverse bg-[#020B1C]">
      {/* حظر ظهور السايدبار عند الطباعة */}
      <Sidebar />
      <section dir="rtl" className="flex-1 flex flex-col print:p-0">
        {/* حظر ظهور الهيدر عند الطباعة */}
        <Header />
        
        {/* صمام الأمان المالي: حظر عرض كامل عناصر وتصنيفات الشاشة عند الطباعة لتظهر المقايسة المذهبة منفردة */}
        <div className="p-8 space-y-6 print:hidden">
          <div>
            <h1 className="text-4xl font-bold text-[#F0E6D2]">سجل وإدارة المقايسات المالية (BOQ)</h1>
            <p className="text-gray-400 text-sm mt-2">عرض المقايسات المعتمدة وإدارتها وجدولتها التفصيلية حياً من قاعدة البيانات.</p>
          </div>

          {/* 1. جدول المقايسات المالي المعتمد (Grid) */}
          <div className="bg-[#07132a] border border-[#1f2d4d] rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#243556] bg-[#0b1b3d]">
              <h3 className="text-[#F0E6D2] font-bold">سجل المقايسات وعروض الأسعار الصادرة ({estimatesList.length})</h3>
            </div>
            <div className="overflow-x-auto max-h-52 overflow-y-auto">
              {loading ? (
                <div className="p-12 text-center text-gray-400 text-sm">جاري جلب سجل المقايسات...</div>
              ) : estimatesList.length > 0 ? (
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#0b1d3d] text-[#F0E6D2]">
                    <tr>
                      <th className="p-3">رقم المقايسة</th>
                      <th className="p-3">اسم المشروع</th>
                      <th className="p-3">العميل</th>
                      <th className="p-3">تاريخ الإصدار</th>
                      <th className="p-3">الحالة المالية</th>
                      <th className="p-3">إجمالي الخامات</th>
                      <th className="p-3">إجمالي المصنعيات</th>
                      <th className="p-3">الإجمالي النهائي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimatesList.map((e) => (
                      <tr
                        key={e.id}
                        onClick={() => selectRow(e)}
                        className={`border-t border-[#1f2d4d] hover:bg-[#0B1B38] text-white text-sm cursor-pointer transition ${
                          selectedEstimate?.id === e.id ? "bg-[#0b1b3d]/60 border-[#F0E6D2]/30" : ""
                        }`}
                      >
                        <td className="p-3 font-mono text-[#F0E6D2]">{e.estimate_number}</td>
                        <td className="p-3 font-bold">{e.projects?.project_name || "غير محدد"}</td>
                        <td className="p-3 text-gray-300">{e.projects?.customers?.name || "غير محدد"}</td>
                        <td className="p-3 text-gray-400 font-mono">{new Date(e.created_at).toLocaleDateString("en-CA")}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            e.status === "نهائية" ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                          }`}>{e.status || "مبدئية"}</span>
                        </td>
                        <td className="p-3 font-mono">{(e.materials_total || 0).toLocaleString('en-US')} ج.م</td>
                        <td className="p-3 font-mono">{(e.labor_total || 0).toLocaleString('en-US')} ج.م</td>
                        <td className="p-3 font-mono font-bold text-emerald-400">{(e.grand_total || 0).toLocaleString('en-US')} ج.م</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-gray-500">لا توجد مقايسات مسجلة حالياً بقاعدة البيانات.</div>
              )}
            </div>
          </div>

          {/* 2. شاشة التبويبات المالية للمقايسة (مبدئية / نهائية) تفاعلياً */}
          {selectedEstimate ? (
            <div className="bg-[#07132a] border border-[#F0E6D2] rounded-2xl p-6 space-y-6">
              
              {/* تبويبات التغيير لمرحلة المقايسة */}
              <div className="flex gap-4 border-b border-[#243556] pb-4">
                <button
                  onClick={() => setActiveTab("initial")}
                  className={`px-5 py-2 rounded-xl font-bold cursor-pointer transition text-xs ${
                    activeTab === "initial" ? "bg-[#D4AF37] text-black" : "border border-gray-600 text-white"
                  }`}
                >
                  📐 المقايسة المبدئية المجملة
                </button>
                <button
                  onClick={() => setActiveTab("final")}
                  className={`px-5 py-2 rounded-xl font-bold cursor-pointer transition text-xs ${
                    activeTab === "final" ? "bg-[#D4AF37] text-black" : "border border-gray-600 text-white"
                  }`}
                >
                  📜 المقايسة النهائية التفصيلية (BOQ)
                </button>
              </div>

              {/* رسم وعرض الشاشة النشطة بناءً على التبويب المختار */}
              <div className="transition-all duration-300">
                {activeTab === "initial" ? <InitialEstimate /> : <FinalEstimate />}
              </div>

            </div>
          ) : (
            <div className="p-12 border-2 border-dashed border-[#1f2d4d] rounded-2xl text-center">
              <p className="text-[#F0E6D2] text-lg font-bold mb-2">مرحباً بك في إدارة المقايسات المالية</p>
              <p className="text-gray-400 text-sm">يرجى تحديد مقايسة تعاقدية من الـ Grid بالأعلى لتعديل بنودها أو تحويلها من مبدئية لنهائية.</p>
            </div>
          )}

        </div>

        {/* 3. كود استدعاء ورقة التصدير الرسمية عزلناه للخارج ليظهر منفرداً 100% بالـ PDF وحجم الـ A4 */}
        {selectedEstimate && (
          <div className="hidden print:block">
            <PrintReportLayout estimateType={activeTab === "initial" ? "مقايسة أعمال مبدئية مجملة" : "مقايسة أعمال تفصيلية نهائية"} />
          </div>
        )}

      </section>
    </main>
  );
}