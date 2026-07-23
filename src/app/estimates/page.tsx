"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import InitialEstimate, { PrintReportLayout } from "@/components/CRM/estimate/InitialEstimate";
import FinalEstimate from "@/components/CRM/estimate/FinalEstimate";
import { useCRM } from "@/components/CRM/context/CRMContext";
import { supabase } from "@/lib/supabaseClient";
import { Sparkles, Loader2, FileText, CheckCircle2 } from "lucide-react";

export default function EstimatesPage() {
  const router = useRouter();
  const { crmData, setCRMData } = useCRM();

  const [estimatesList, setEstimatesList] = useState<any[]>([]);
  const [selectedEstimate, setSelectedEstimate] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // التبويبات المخصصة للمقايسة (مبدئية / نهائية)
  const [activeTab, setActiveTab] = useState<"initial" | "final">("initial");

  useEffect(() => {
    document.title = "المقايســات | Golden Decoration";
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
    // 🌟 حل المشكلة: إرجاع وسم التوجيه dir="rtl" وموازاة الـ flex إلى الـ main الرئيسي لضمان ثبات السايدبار الأيمن بالكامل وتكامل الشاشة كلياً
    <main className="min-h-screen flex bg-[#020B1C] relative overflow-hidden font-alexandria" dir="rtl">
      <Sidebar />
      <section className="flex-1 flex flex-col print:p-0 lg:pr-56 m-0 min-h-screen">
        <Header />
        
        {/* 🛠️ جدار الحماية البصري الموحد وتنسيق شريط التمرير مذهب الألوان بسمك 6px لمنع التداخل والقص كلياً للـ BOQ */}
        <style dangerouslySetInnerHTML={{ __html: `
          /* تفعيل وإظهار شريط التمرير الأفقي والرأسي بكافة الجداول بألوان ذهبية فاخرة */
          ::-webkit-scrollbar { 
            width: 6px !important; 
            height: 6px !important; 
            display: block !important;
          }
          ::-webkit-scrollbar-track { 
            background: #020B1C !important; 
          }
          ::-webkit-scrollbar-thumb { 
            background: #D4AF37 !important; 
            border-radius: 9999px !important; 
          }
          ::-webkit-scrollbar-thumb:hover { 
            background: #AA7C11 !important; 
          }

          /* إلغاء أكواد الإخفاء لضمان انسيابية التمرير بالماوس والجوال */
          .overflow-x-auto { 
            -ms-overflow-style: auto !important; 
            overflow-x: auto !important; 
          }

          /* عزل تلوين وأوزان خلايا جدول المقايسات ومنع تسريب الـ CSS للسايدبار */
          .premium-estimates-table thead th {
            font-size: 0.95rem !important;
            font-weight: 500 !important;
            color: #D4AF37 !important;
            text-align: right !important;
            background-color: #020B1C !important;
            border-bottom: 2px solid rgba(212, 175, 55, 0.3) !important;
            padding: 14px 16px !important;
            letter-spacing: normal !important;
          }

          .premium-estimates-table tbody td {
            font-size: 0.9rem !important;
            font-weight: 400 !important;
            text-align: right !important;
            border-bottom: 1px solid rgba(212, 175, 55, 0.1) !important;
            padding: 14px 16px !important;
            letter-spacing: normal !important;
          }

          .premium-estimates-table tbody tr:hover {
            background-color: rgba(7, 19, 42, 0.8) !important;
          }
        `}} />
        
        {/* صمام الأمان المالي: حظر عرض كامل عناصر وتصنيفات الشاشة عند الطباعة لتظهر المقايسة المذهبة منفردة */}
        <div className="p-4 md:p-8 space-y-6 print:hidden">
          <div className="border-b border-[#D4AF37]/20 pb-5 select-none">
            <h1 className="text-xl md:text-2xl font-bold text-[#D4AF37] flex items-center gap-2.5">
              <span>سجل وإدارة المقايسات المالية (BOQ)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-pulse" />
            </h1>
            <p className="text-white text-xs mt-2">عرض المقايسات المعتمدة وإدارتها وجدولتها التفصيلية من قاعدة البيانات.</p>
          </div>

          {/* 1. جدول المقايسات المالي المعتمد مدمج بالمقياس الإمبراطوري المتين بالمنصة */}
          <div className="bg-[#07132a] border-2 border-[#D4AF37] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col relative w-full">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
            <div className="p-4 border-b border-[#D4AF37] bg-[#0b1b3d]/60 select-none">
              <h3 className="text-[#D4AF37] font-bold text-sm md:text-md  flex items-center gap-2.5">سجل المقايسات وعروض الأسعار الصادرة ({estimatesList.length})</h3>
            </div>
            
            {/* تفعيل التمرير مذهب الألوان وحماية الجدول من التقاطع بـ whitespace-nowrap و min-w-[850px] بالكامل */}
            <div className="overflow-x-auto max-h-52 overflow-y-auto ai-chat-scroll">
              {loading ? (
                <div className="p-12 text-center text-[#D4AF37] animate-pulse text-xs font-bold flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={16} />
                  <span>جاري جلب سجل المقايسات...</span>
                </div>
              ) : estimatesList.length > 0 ? (
                <table className="w-full text-right table-auto min-w-[850px] premium-estimates-table">
                  <thead>
                    <tr className="whitespace-nowrap select-none">
                      <th>رقم المقايسة</th>
                      <th>اسم المشروع</th>
                      <th>العميل</th>
                      <th>تاريخ الإصدار</th>
                      <th>الحالة المالية</th>
                      <th>إجمالي الخامات</th>
                      <th>إجمالي المصنعيات</th>
                      <th>الإجمالي النهائي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimatesList.map((e) => (
                      <tr
                        key={e.id}
                        onClick={() => selectRow(e)}
                        className={`cursor-pointer whitespace-nowrap transition-all duration-200 ${
                          selectedEstimate?.id === e.id ? "bg-[#0b1b3d]/60 border-r-4 border-r-[#D4AF37]" : ""
                        }`}
                      >
                        <td className="p-3 text-[#D4AF37] font-bold">{e.estimate_number}</td>
                        <td className="p-3 font-black text-slate-100">{e.projects?.project_name || "غير حدد"}</td>
                        <td className="p-3 text-[#F0E6D2] font-bold">{e.projects?.customers?.name || "غير محدد"}</td>
                        <td className="p-3 text-gray-400 font-mono">{new Date(e.created_at).toLocaleDateString("ar-EG")}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-black ${
                            e.status === "نهائية" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 animate-pulse" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}>{e.status || "مبدئية"}</span>
                        </td>
                        <td className="p-3 font-mono">{(e.materials_total || 0).toLocaleString('en-US')} ج.م</td>
                        <td className="p-3 font-mono">{(e.labor_total || 0).toLocaleString('en-US')} ج.م</td>
                        <td className="p-3 font-mono font-black text-emerald-400">{(e.grand_total || 0).toLocaleString('en-US')} ج.م</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-slate-500">لا توجد مقايسات مسجلة حالياً بقاعدة البيانات.</div>
              )}
            </div>
          </div>

          {/* 2. شاشة التبويبات المالية للمقايسة المدمجة بالمقياس الإمبراطوري المتين بالمنصة */}
          {selectedEstimate ? (
            <div className="bg-[#07132a] border-2 border-[#D4AF37]/20 rounded-[2rem] p-6 space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-10" />
              
              {/* تفعيل التبويبات المنسدلة الهرمية (The Standard Gilded Swapper Deck) المتطابقة مع الهيكل الملكي */}
              <div className="bg-[#020B1C] border border-[#D4AF37]/30 p-1.5 rounded-2xl flex gap-2 select-none w-full lg:w-auto max-w-md shadow-2xl z-10 relative">
                <button
                  type="button" 
                  onClick={() => setActiveTab("initial")}
                  className={`px-6 py-2.5 rounded-xl text-xs transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 flex-1 ${
                    activeTab === "initial" 
                      ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.35)] font-bold scale-[1.02]" 
                      : "bg-transparent border border-transparent text-[#F0E6D2] hover:border-[#D4AF37]/20 hover:text-[#D4AF37] font-semibold"
                  }`}
                >
                  <span>📐 المقايسة المبدئية</span>
                </button>
                <button
                  type="button" 
                  onClick={() => setActiveTab("final")}
                  className={`px-6 py-2.5 rounded-xl text-xs transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 flex-1 ${
                    activeTab === "final" 
                      ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.35)] font-bold scale-[1.02]" 
                      : "bg-transparent border border-transparent text-[#F0E6D2] hover:border-[#D4AF37]/20 hover:text-[#D4AF37] font-semibold"
                  }`}
                >
                  <span>📜 المقايسة النهائية الـ BOQ</span>
                </button>
              </div>

              {/* رسم وعرض الشاشة النشطة بناءً على التبويب المختار مع التمرير المتوهج */}
              <div className="transition-all duration-300 z-10 relative">
                {activeTab === "initial" ? <InitialEstimate /> : <FinalEstimate />}
              </div>

            </div>
          ) : (
            <div className="p-12 border-2 border-dashed border-[#d4af37]/25 rounded-[2rem] text-center bg-[#07132a] select-none">
              <p className="text-[#F0E6D2] text-lg font-bold mb-2">مرحباً بك في إدارة المقايسات المالية والـ BOQ</p>
              <p className="text-gray-400 text-sm">يرجى تحديد مقايسة تعاقدية من الـ Grid بالأعلى لتعديل بنودها أو تحويلها من مبدئية لنهائية.</p>
            </div>
          )}

        </div>

        {/* 3. كود استدعاء ورقة التصدير الرسمية عزلناه للخارج ليظهر منفرداً 100% بالـ PDF وحجم الـ A4 */}
        {selectedEstimate && (
          <div className="hidden print:block">
            <PrintReportLayout estimateType={activeTab === "initial" ? "مقايسة أعمال مبدئية " : "مقايسة أعمال تفصيلية نهائية"} />
          </div>
        )}

      </section>
    </main>
  );
}