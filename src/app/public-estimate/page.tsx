"use client";

import React, { useEffect, useState, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
// 🌟 تم تصحيح الاستيراد هنا بإضافة Search لحل خطأ بناء المترجم الحاسم تماماً وتأمين البناء
import { Printer, Sparkles, ShieldCheck, Check, Cpu, Layers, Search, Loader2 } from "lucide-react";

export const categoryNames: Record<string, string> = {
  archMod: "تعديل معماري وتكسير",
  masonry: "أعمال المباني والطوب",
  plaster: "أعمال البياض والمحارة",
  paint: "أعمال الدهانات والنقاشة",
  flooring: "أعمال الأرضيات والتكسيات",
  ceiling: "الأسقف المعلقة والجبس بورد",
  ac: "أعمال تكييف الهواء وتأسيس النحاس",
  ventilation: "أعمال تهوية وشفاطات",
  doors: "أعمال الأبواب والنجارة",
  aluminum: "الشبابيك وقطاعات الألوميتال",
  staircase: "تكسية وتجليد السلالم",
  electricity: "تأسيس وتمديد الكهرباء",
  plumbing: "تأسيس سباكة وتغذية مائية",
  decorations: "أعمال الديكورات والإكسسوارات الجمالية",
  engineering_fee: "هامش الإشراف والتشغيل الهندسي"
};

const initialStages = [
  { id: 1, label: "أعمال الهدم والتعديل المعماري", cumulative: 5 },
  { id: 2, label: "أعمال المباني والطوب", cumulative: 10 },
  { id: 3, label: "تأسيس أعمال السباكة والصحي", cumulative: 20 },
  { id: 4, label: "تأسيس أعمال الكهرباء والتمديد", cumulative: 30 },
  { id: 5, label: "أعمال بياض المحارة والأسمنت", cumulative: 45 },
  { id: 6, label: "أعمال الجبس بورد والأسقف", cumulative: 55 },
  { id: 7, label: "أعمال الأرضيات والسيراميك", cumulative: 70 },
  { id: 8, label: "تأسيس الدهانات والنقاشة", cumulative: 80 },
  { id: 9, label: "تركيب الأبواب والنجارة", cumulative: 85 },
  { id: 10, label: "تركيب الألوميتال والشبابيك", cumulative: 90 },
  { id: 11, label: "التشطيبات النهائية للمخارج والأطقم", cumulative: 95 },
  { id: 12, label: "أعمال النظافة والتسليم النهائي", cumulative: 100 }
];

const getCategoryIconSvg = (category: string) => {
  const icons: Record<string, string> = {
    plumbing: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 00-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>`,
    electricity: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>`,
    plaster: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>`,
    paint: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>`,
    ceiling: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>`,
    flooring: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>`,
    doors: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>`,
    aluminum: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"></path></svg>`,
    archMod: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4a2 2 0 114 0v1a2 2 0 01-2 2h-1M4 11V5a2 2 0 012-2h4v8m-1 1v8m0 0H4a2 2 0 01-2-2v-4a2 2 0 012-2h4z"></path></svg>`,
    decorations: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>`
  };
  return icons[category] || `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>`;
};

function PublicEstimateContent() {
  const searchParams = useSearchParams();
  const urlCode = searchParams.get("code");

  const [searchCode, setSearchCode] = useState("");
  const [estimateData, setEstimateData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // قيمة المنزلق الافتراضي
  const [sliderPos, setSliderPos] = useState<number>(50);

  useEffect(() => {
    document.title = "عرض مقايسة العميل | Golden Decoration";
  }, []);

  useEffect(() => {
    if (urlCode) {
      fetchPublicEstimate(urlCode);
    }
  }, [urlCode]);

  const fetchPublicEstimate = async (code: string) => {
    if (!code || code.trim() === "") return;
    setLoading(true);
    setErrorMsg("");
    try {
      const { data, error } = await supabase.rpc("get_public_estimate_v4", { target_code: code.trim() });

      if (error) throw error;

      if (!data) {
        setErrorMsg("🛑 كود المقايسة غير صحيح أو تم تعديله؛ يرجى مراجعة ممثل شركة Golden Decoration.");
        setEstimateData(null);
        return;
      }

      setEstimateData(data);
    } catch (err: any) {
      console.error("Error fetching public estimate:", err);
      setErrorMsg("حدث خطأ أثناء محاولة جلب المقايسة الفاخرة.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCode.trim()) {
      fetchPublicEstimate(searchCode);
    }
  };

  const header = estimateData?.header || {};
  const project = estimateData?.project || {};
  const customer = estimateData?.customer || {};
  const printItems = estimateData?.items || [];

  const progressPercentage = Number(project.progress_percentage || 0);
  const currentStageName = project.current_stage || "أعمال الهدم والتعديل المعماري";

  const materialsTotal = printItems.reduce((sum: number, item: any) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);
  const laborTotal = printItems.reduce((sum: number, item: any) => sum + Number(item.labor_cost || 0), 0);
  const directCost = materialsTotal + laborTotal;
  const engineeringPercentage = header.engineering_percentage ?? 15;
  const engineeringValue = directCost * (engineeringPercentage / 100);
  const taxesValue = directCost * 0.05; 
  const discountValue = header.status === "نهائية" ? 16800 : 0; 
  const grandTotal = directCost + engineeringValue + taxesValue - discountValue;

  const formattedDate = new Date(header.created_at || new Date()).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const categorySummaryList = useMemo(() => {
    const summary: Record<string, number> = {};
    printItems.forEach((item: any) => {
      const cat = item.category || "other";
      const totalCost = (Number(item.quantity || 0) * Number(item.unit_price || 0)) + Number(item.labor_cost || 0);
      summary[cat] = (summary[cat] || 0) + totalCost;
    });

    if (engineeringValue > 0) {
      summary["engineering_fee"] = engineeringValue;
    }

    return Object.entries(summary).map(([key, val]) => {
      const pct = grandTotal > 0 ? (val / grandTotal) * 100 : 0;
      return {
        key,
        value: val,
        percentage: Math.round(pct * 10) / 10
      };
    }).sort((a, b) => b.value - a.value);
  }, [printItems, grandTotal, engineeringValue]);

  const segmentColors = [
    "#C9A45D", "#0B1B38", "#1f2d4d", "#B48C34", "#F0E6D2", 
    "#E5D7B3", "#7A6030", "#8b6f2a", "#3b82f6", "#10b981", 
    "#f59e0b", "#ec4899"
  ];

  const svgRadius = 50;
  const svgStrokeWidth = 12; 
  const svgCircumference = 2 * Math.PI * svgRadius;
  const strokeDashoffset = svgCircumference - (progressPercentage / 100) * svgCircumference;

  let cumulativePercentage = 0;
  const slices = categorySummaryList.map((item, idx) => {
    const strokeSize = (item.percentage / 100) * svgCircumference;
    const strokeOffset = svgCircumference - (cumulativePercentage / 100) * svgCircumference;
    cumulativePercentage += item.percentage;
    const color = segmentColors[idx % segmentColors.length];
    return { ...item, strokeSize, strokeOffset, color };
  });

  const hasCategory = (cat: string) => printItems.some((item: any) => item.category === cat);

  const rawStages = [
    { code: "init", label: "اعتماد المقايسة", days: "1 يوم", enabled: true },
    { code: "survey", label: "المعاينة النهائية", days: "2-3 أيام", enabled: true },
    { code: "contract", label: "توقيع العقد", days: "1 يوم", enabled: true },
    { code: "demolition", label: "أعمال الهدم", days: "2-3 أيام", enabled: hasCategory("archMod") },
    { code: "plumbing", label: "السباكة والصحي", days: "4-6 أيام", enabled: hasCategory("plumbing") },
    { code: "electricity", label: "الكهرباء", days: "4-5 أيام", enabled: hasCategory("electricity") },
    { code: "plaster", label: "بياض المحارة", days: "5-7 أيام", enabled: hasCategory("plaster") },
    { code: "ceiling", label: "الجبس بورد", days: "4-5 أيام", enabled: hasCategory("ceiling") },
    { code: "flooring", label: "الأرضيات", days: "5-6 أيام", enabled: hasCategory("flooring") },
    { code: "paint", label: "الدهانات", days: "3-3 أيام", enabled: hasCategory("paint") },
    { code: "doors", label: "النجارة والأبواب", days: "3-3 أيام", enabled: hasCategory("doors") },
    { code: "aluminum", label: "الألوميتال", days: "3-6 أيام", enabled: hasCategory("aluminum") },
    { code: "clean", label: "أعمال التنظيف", days: "1 يوم", enabled: true },
    { code: "final_handover", label: "التسليم النهائي", days: "1 يوم", enabled: true }
  ];

  const activeStages = rawStages.filter(stage => stage.enabled);

  const goldenAdvantages = [
    { name: "إشراف هندسي 👷", desc: "إشراف كامل من مهندسين نقابيين معتمدين طوال مراحل التنفيذ خطوة بخطوة." },
    { name: "خامات أصلية 💎", desc: "اعتماد كلي على خامات أصلية وموثقة بضمان المصانع والشركات الكبرى." },
    { name: "فنيين متخصصين 🛠️", desc: "طواقم فنية مدربة ومحترفة في كافة تخصصات الديكور والتشطيبات الميدانية." },
    { name: "متابعة يومية 📱", desc: "تقارير مصورة وتحديثات يومية لتقدم الأعمال بالموقع مباشرة عبر جوالك." },
    { name: "التزام بالمواعيد 📅", desc: "جدولة زمنية صارمة ومخطط تسليم معتمد ومحمي قانونياً وبنود واضحة." },
    { name: "خدمة ما بعد التسليم 🛡️", desc: "خدمة ضمان حقيقي وصيانة شاملة للوحدة السكنية لمعالجة أي طوارئ فنية." }
  ];

  return (
    <div className="min-h-screen bg-[#020B1C] text-white flex flex-col items-center justify-start p-4 md:p-8 font-alexandria" dir="rtl">
      
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
          scrollbar-width: thin !important; 
          -ms-overflow-style: auto !important; 
          overflow-x: auto !important; 
        }

        /* عزل تلوين وأوزان خلايا جدول تفريد بنود المقايسة ومنع تسريب الـ CSS للسايدبار */
        .premium-public-estimate-table thead th {
          font-size: 0.75rem !important;
          font-weight: 500 !important;
          color: #D4AF37 !important;
          text-align: right !important;
          background-color: #000000 !important;
          border-bottom: 2px solid rgba(212, 175, 55, 0.3) !important;
          padding: 14px 16px !important;
          letter-spacing: normal !important;
        }

        .premium-public-estimate-table tbody td {
          font-size: 0.8rem !important;
          font-weight: 400 !important;
          color: #000000 !important; /* الاحتفاظ بالخطوط الداكنة لنسخة الطباعة الـ A4 البيضاء */
          text-align: right !important;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1) !important;
          padding: 14px 16px !important;
          letter-spacing: normal !important;
        }

        .premium-public-estimate-table tbody tr:hover {
          background-color: rgba(0, 0, 0, 0.02) !important;
        }
      `}} />

      <div className="w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between border-b border-[#1f2d4d] pb-6 mb-8 gap-4 select-none print:hidden">
        <div className="flex items-center gap-4">
          <div className="p-1 rounded-xl bg-[#07132a] border border-[#243556] shrink-0 select-none">
            <img src="/logo.png" alt="Golden Decoration Logo" className="h-14 w-14 object-contain" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#D4AF37]">عرض مقايسة أسعار</h1>
            <p className="text-xs text-gray-400 font-bold mt-1">البوابة الرقمية التفاعلية المعتمدة للعملاء</p>
          </div>
        </div>
        <span className="px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] font-bold text-xs flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
          <span>بوابة تتبع المشروعات والمقايسات المعتمدة</span>
        </span>
      </div>

      {/* لوحة استعلام المقايسة السريع - تم تطبيق مقاييس الكروت الإمبراطورية الفاخرة */}
      <div className="w-full max-w-3xl bg-[#07132a] border-2 border-[#D4AF37]/20 rounded-[2rem] p-6 md:p-8 shadow-2xl mb-8 space-y-4 print:hidden relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
        <h3 className="text-lg md:text-xl font-black text-[#D4AF37] flex items-center gap-2 z-10 relative">
          <span>🔍</span>
          <span>الاستعلام الفوري والتحميل الرقمي لعروض الأسعار</span>
        </h3>
        <p className="text-gray-400 text-xs md:text-sm leading-relaxed z-10 relative font-medium">
          يرجى كتابة كود المقايسة المرسل إليك عبر الواتساب في الخانة بالأسفل لاستعراض بنود المقايسة بالكامل وتصدير نسخة للطباعة:
        </p>

        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3 z-10 relative">
          <input
            type="text"
            placeholder="EST-XXXX"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-4 outline-none focus:border-[#D4AF37] font-mono font-bold text-center placeholder-gray-600"
          />
          {/* 🌟 ترقية وتوحيد زرار الاستعلام السحابي للدستور البصري الحركي لـ Golden Decoration */}
          <button
            type="submit"
            className="w-full sm:w-auto h-12 px-8 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.03] active:scale-95 transition-all duration-300 cursor-pointer text-sm font-black flex items-center justify-center gap-1.5 select-none relative overflow-hidden"
          >
            <span>استعلم الآن 🚀</span>
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
          </button>
        </form>

        {errorMsg && (
          <p className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs text-center animate-pulse">
            {errorMsg}
          </p>
        )}
      </div>

      {loading ? (
        <div className="p-16 text-center text-[#D4AF37] font-bold text-lg animate-pulse flex flex-col items-center gap-3">
          <span className="text-4xl animate-spin">⏳</span>
          <span>جاري سحب بنود المقايسة الفنية ومطابقتها برمجياً بسيرفرات التشفير...</span>
        </div>
      ) : estimateData ? (
        <div className="w-full max-w-5xl space-y-6">
          
          <div className="bg-[#07132a] border-2 border-[#D4AF37]/20 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden w-full text-right print:hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
            
            <h3 className="text-[#D4AF37] text-xl font-black border-b border-[#1f2d4d] pb-3 flex items-center gap-2 select-none">
              <Sparkles className="w-5 h-5 text-[#D4AF37] animate-pulse" />
              <span>لوحة تتبع المتابعة الميدانية ومستوى تقدم الأعمال بالشقة</span>
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-[#020B1C]/50 p-6 rounded-3xl border border-[#1f2d4d] items-center">
              
              <div className="flex flex-col items-center justify-center text-center space-y-2 select-none">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r={svgRadius} stroke="#1f2d4d" strokeWidth={svgStrokeWidth} fill="transparent" />
                    <circle cx="64" cy="64" r={svgRadius} stroke="#D4AF37" strokeWidth={svgStrokeWidth} fill="transparent" strokeDasharray={svgCircumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-500 ease-out" style={{ filter: "drop-shadow(0 0 4px rgba(212, 175, 55, 0.4))" }} />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-black font-mono text-white tracking-tight">{progressPercentage}%</span>
                    <span className="text-[10px] text-[#D4AF37] font-black uppercase">إنجاز الموقع</span>
                  </div>
                </div>
              </div>

              <div className="col-span-1 lg:col-span-2 text-right space-y-2.5">
                <span className="text-xs text-rose-500 block font-black">البند الجاري تنفيذه حالياً بالموقع بواسطة المهندس المشرف:</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-white">{currentStageName}</span>
                </div>
                <p className="text-gray-400 text-xs font-bold leading-relaxed">
                  أهلاً بك عميلنا الكريم في بوابتك السحابية التفاعلية؛ هذه القيمة مستخرجة حياً من ملفك الفني ومحدثة تلقائياً بناءً على تقارير تسليم البنود المعتمدة من مهندس الموقع المتابع لشقتكم.
                </p>
              </div>

            </div>

            <div className="mt-6 bg-[#020B1C] p-6 rounded-2xl border border-dashed border-[#D4AF37]/50 space-y-4">
              <p className="text-[#D4AF37] font-black text-sm flex items-center gap-2 select-none">
                <Cpu className="w-4 h-4 text-[#D4AF37] animate-pulse" />
                <span>المخطط والمسار الإنشائي العام للمشروع بالترتيب الزمني:</span>
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 select-none">
                {initialStages.map((stage) => {
                  const isCompleted = progressPercentage >= stage.cumulative;
                  return (
                    <div
                      key={stage.id}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all duration-300 ${
                        isCompleted
                          ? "border-[#D4AF37]/60 bg-gradient-to-br from-[#07132a] to-[#D4AF37]/5 shadow-[0_0_8px_rgba(212,175,55,0.06)]"
                          : "border-[#1f2d4d]/80 bg-[#020B1C]/40 opacity-40"
                      }`}
                    >
                      <span className={`text-xs font-black ${isCompleted ? "text-[#D4AF37]" : "text-gray-400"}`}>
                        {stage.label}
                      </span>
                      {isCompleted && (
                        <span className="w-5 h-5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37] text-[10px] font-black">✓</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          <div className="flex justify-end pr-2 select-none print:hidden">
            {/* 🌟 ترقية وتوحيد زرار طباعة المقايسة للدستور البصري الحركي لـ Golden Decoration */}
            <button
              onClick={() => window.print()}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer text-xs font-black flex items-center justify-center gap-2 select-none relative overflow-hidden"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>📥 تحميل المقايسة كـ PDF / طباعة فورية</span>
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
            </button>
          </div>

          {/* كارت ورقة المقايسة المطبوعة المنسق بالإطار المذهب والظل المتوهج الفاخر العائم */}
          <div className="bg-white rounded-3xl border-2 border-[#D4AF37] shadow-[0_0_60px_rgba(212,175,55,0.25)] p-12 text-[#0B1B38] print:border-0 print:p-0 print:shadow-none" style={{ fontFamily: "Cairo, Arial, sans-serif" }}>
            
            {/* 1. HEADER (تم إزالة اسم وشعار الشركة النصي كلياً، وحقن اللوجو يميناً، وعنوان "عرض مقايسة أسعار" عريض وغاية في الوضوح) */}
            <div className="flex items-center justify-between border-b-4 border-[#C9A45D] pb-6 mb-8 select-none">
              {/* اليمين: اللوجو المعتمد */}
              <div className="w-[40%] text-right">
                <img src="/logo.png" alt="Golden Decoration Logo" className="h-16 object-contain" />
              </div>
              
              {/* اليسار: عنوان "عرض مقايسة أسعار" عريض وواضح جداً للعميل */}
              <div className="w-[60%] text-left space-y-1">
                <h2 className="text-2xl md:text-3xl font-black text-[#0B1B38] tracking-normal font-sans">
                  عرض مقايسة أسعار
                </h2>
                <p className="text-xs text-gray-500 font-bold">تاريخ الإصدار والاعتماد الميداني: {formattedDate}</p>
              </div>
            </div>

            {/* 2. كروت البيانات الإرشادية المتناظرة */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-xs font-bold">
              <div className="space-y-3">
                <div className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/50 flex flex-col justify-between">
                  <span className="text-gray-400 text-[10px] block mb-1">اسم العميل المعتمد</span>
                  <span className="text-sm font-black text-[#0B1B38]">{customer.name || "أحمد محمد السيد"}</span>
                </div>
                <div className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/50 flex flex-col justify-between">
                  <span className="text-gray-400 text-[10px] block mb-1">مساحة الوحدة الفعالة</span>
                  <span className="text-sm font-black text-[#0B1B38]">{project.area || 120} م²</span>
                </div>
                <div className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/50 flex flex-col justify-between">
                  <span className="text-gray-400 text-[10px] block mb-1">مطلب التشطيب</span>
                  <span className="text-sm font-black text-[#0B1B38]">{project.finishing_level || "سوبر لوكس"}</span>
                </div>
              </div>

              <div className="border-2 border-[#C9A45D]/40 rounded-2xl p-5 bg-gradient-to-br from-white to-gray-50 flex flex-col justify-between shadow-sm">
                <div>
                  <span className="text-[#C9A45D] text-[10px] font-black uppercase tracking-wider block mb-2">بيانات وموقع المشروع</span>
                  <h4 className="text-sm font-black text-[#0B1B38] mb-2">{project.project_name || "مشروع العميل السكني"}</h4>
                  <p className="text-xs text-gray-500 font-bold leading-relaxed">{project.unit_address || project.location || "القاهرة"}</p>
                </div>
                <div className="border-t border-gray-100 pt-2 mt-4 flex justify-between text-[10px] text-gray-400">
                  <span>الوحدة: {project.unit_type || "شقة سكنية"}</span>
                  <span>الشركة المنفذة: Golden Decoration</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/50 flex flex-col justify-between">
                  <span className="text-gray-400 text-[10px] block mb-1">تاريخ المقايسة</span>
                  <span className="text-xs font-black font-mono text-[#0B1B38]">{formattedDate}</span>
                </div>
                <div className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/50 flex flex-col justify-between">
                  <span className="text-gray-400 text-[10px] block mb-1">كود المقايسة الفرعي</span>
                  <span className="text-xs font-black font-mono text-[#0B1B38]">{header.estimate_number || "—"}</span>
                </div>
                <div className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/50 flex flex-col justify-between">
                  <span className="text-gray-400 text-[10px] block mb-1">كود العميل الموحد</span>
                  <span className="text-xs font-black font-mono text-[#0B1B38]">{customer.customer_code || "—"}</span>
                </div>
              </div>
            </div>

            {/* 3. جدول المقايسة - تم تسييل حظر التداخل وتفعيل الـ Gilded Scrollbar للأجهزة المحمولة */}
            <div className="border border-gray-200 rounded-2xl overflow-x-auto mb-8 shadow-sm">
              <table className="w-full border-collapse text-xs text-right min-w-[850px] premium-public-estimate-table">
                <thead>
                  <tr className="bg-[#0B1B38] text-white select-none whitespace-nowrap">
                    <th className="p-3.5 text-center w-12 font-black">م</th>
                    <th className="p-3.5 font-black w-48">البند ومجال الأعمال</th>
                    <th className="p-3.5 font-black">تفصيل ووصف التوريد والتركيب الفني المعتمد للمشروع</th>
                    <th className="p-3.5 text-center w-16 font-black">الوحدة</th>
                    <th className="p-3.5 text-center w-16 font-black">الكمية</th>
                    <th className="p-3.5 text-center w-24 font-black">سعر الوحدة</th>
                    <th className="p-3.5 text-center w-28 font-black">الإجمالي (ج.م)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-[#0B1B38] font-semibold whitespace-nowrap">
                  {printItems.map((item: any, idx: number) => {
                    const qty = Number(item.quantity || 0);
                    const unitPrice = Number(item.unit_price ?? item.unitPrice ?? 0);
                    const labor = Number(item.labor_cost ?? item.laborCost ?? 0);
                    const rowTotal = (qty * unitPrice) + labor;
                    return (
                      <tr key={item.id || idx} className="hover:bg-gray-50 transition">
                        <td className="p-3.5 text-center font-mono text-gray-400 font-bold">{idx + 1}</td>
                        <td className="p-3.5 font-black">
                          <div className="flex items-center gap-2">
                            <span dangerouslySetInnerHTML={{ __html: getCategoryIconSvg(item.category) }} />
                            <span>{categoryNames[item.category] || item.category || "—"}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-gray-600 font-bold leading-relaxed whitespace-pre-wrap">{item.description || item.name}</td>
                        <td className="p-3.5 text-center">{item.unit || "م²"}</td>
                        <td className="p-3.5 text-center font-mono font-black">{qty.toLocaleString('en-US')}</td>
                        <td className="p-3.5 text-center font-mono font-bold text-gray-500">{unitPrice.toLocaleString('en-US')}</td>
                        <td className="p-3.5 text-center font-mono font-black">{rowTotal.toLocaleString('en-US')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 4. Summary & Donut Wheel Section */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8 items-stretch">
              
              <div className="lg:col-span-3 border border-gray-200 rounded-2xl p-5 bg-gradient-to-br from-white to-gray-50 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="80" cy="84" r={svgRadius} stroke="#F3F4F6" strokeWidth="12" fill="transparent" />
                    {slices.map((slice, idx) => (
                      <circle
                        key={idx}
                        cx="80"
                        cy="84"
                        r={svgRadius}
                        stroke={slice.color}
                        strokeWidth={svgStrokeWidth}
                        fill="transparent"
                        strokeDasharray={`${slice.strokeSize} ${svgCircumference}`}
                        strokeDashoffset={slice.strokeOffset}
                        strokeLinecap="round"
                      />
                    ))}
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] text-gray-400 font-bold">إجمالي العقد</span>
                    <span className="text-sm font-black font-mono mt-0.5">{grandTotal.toLocaleString()}</span>
                    <span className="text-[9px] text-[#C9A45D] font-bold">ج.م</span>
                  </div>
                </div>

                <div className="flex-1 text-right space-y-2.5">
                  <h4 className="text-[10px] text-[#C9A45D] font-black uppercase tracking-wider border-b border-gray-200 pb-1.5 mb-2">توزيع كلفة البنود والنسب المئوية من إجمالي العقد:</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[9px] font-bold text-gray-500">
                    {categorySummaryList.map((item: any, idx: number) => {
                      const color = segmentColors[idx % segmentColors.length];
                      return (
                        <div key={idx} className="flex items-center gap-1.5 truncate">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="truncate">{categoryNames[item.key] || "أعمال عامة"}:</span>
                          <span className="font-mono text-gray-800 font-black">{item.percentage}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 border-2 border-[#0B1B38] rounded-2xl overflow-hidden shadow-md flex flex-col justify-between">
                <div className="divide-y divide-gray-100 flex-1">
                  <div className="p-3.5 bg-gray-50/80 flex justify-between text-xs font-bold">
                    <span className="text-gray-500">إجمالي المواد والخامات:</span>
                    <span className="text-[#0B1B38] font-mono font-black">{materialsTotal.toLocaleString('en-US')} ج.م</span>
                  </div>
                  <div className="p-3.5 bg-gray-50/80 flex justify-between text-xs font-bold">
                    <span className="text-gray-500">إجمالي عمالة التنفيذ والمصنعية:</span>
                    <span className="text-[#0B1B38] font-mono font-black">{laborTotal.toLocaleString('en-US')} ج.م</span>
                  </div>
                  <div className="p-3.5 bg-gray-100 flex justify-between text-xs font-black">
                    <span className="text-[#0B1B38]">الإجمالي المباشر قبل الإشراف:</span>
                    <span className="text-[#0B1B38] font-mono">{directCost.toLocaleString('en-US')} ج.م</span>
                  </div>
                  <div className="p-3.5 bg-gray-50/80 flex justify-between text-xs font-bold">
                    <span className="text-gray-500">إشراف وتشغيل هندسي ({engineeringPercentage}%):</span>
                    <span className="text-[#0B1B38] font-mono font-black">+{engineeringValue.toLocaleString('en-US')} ج.م</span>
                  </div>
                </div>

                <div className="p-4 bg-[#C9A45D] text-[#0B1B38] flex justify-between items-center select-none">
                  <span className="text-sm font-black tracking-wide">الإجمالي التعاقدي الكلي للمشروع:</span>
                  <span className="text-lg font-black font-mono">{grandTotal.toLocaleString('en-US')} ج.م</span>
                </div>
              </div>

            </div>

            {/* 5. التوقيعات والاعتماد */}
            <div className="grid grid-cols-2 gap-12 mt-12 mb-16 text-xs font-bold text-center">
              <div className="border-t border-gray-300 pt-3">
                <span className="text-gray-400 block mb-1">توقيع واعتماد ممثل شركة Golden Decoration</span>
                <span className="text-[#0B1B38] font-black">المدير العام والمسؤول المالي للشركة</span>
              </div>
              <div className="border-t border-gray-300 pt-3">
                <span className="text-gray-400 block mb-1">توقيع واعتماد العميل الكريم</span>
                <span className="text-[#0B1B38] font-black">أوافق على كافة البنود والمواصفات أعلاه</span>
              </div>
            </div>

            {/* 10. ذيل الصفحة المذهب */}
            <div className="flex items-center justify-between border-t border-[#C9A45D] pt-5 text-[9px] text-gray-500 font-bold select-none">
              <div className="flex items-center gap-6">
                <span>📞 هاتف: 01065282534</span>
                <span>✉️ بريد: info@goldendecoration.com</span>
                <span>📍 العنوان: القاهرة - مصر</span>
              </div>
              <div>
                <span>www.goldendecoration.com — GOLDEN DECORATION ERP © 2026</span>
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* الحالة الافتراضية قبل الاستعلام */
        <div className="w-full max-w-5xl space-y-8 animate-fade-in mt-4">
          
          {/* 1. مديول شريط المقارنة التفاعلي (Before & After Slider) */}
          <div className="bg-[#07132a] border-2 border-[#D4AF37]/20 rounded-[2rem] p-6 shadow-[0_0_40px_rgba(212,175,55,0.12)] space-y-4 text-right">
            <div className="select-none space-y-1.5 pb-2">
              <h4 className="text-[#D4AF37] font-black text-xl flex items-center gap-2">
                <span>📸</span>
                <span>معاينة التحول الإنشائي الفاخر (سابقة أعمال جولدن ديكور)</span>
              </h4>
              <p className="text-gray-400 text-xs font-bold leading-normal">
                اسحب المؤشر المذهب يميناً ويساراً لترى جودة استلام البنود من المحارة والخرسانات حتى اللمسة المذهبة النهائية:
              </p>
            </div>

            {/* المنزلق التفاعلي الذكي للمقارنة البصرية يعتمد على خاماتك المحلية بجهازك (/before.jpg و /after.jpg) */}
            <div className="relative w-full h-[280px] md:h-[350px] rounded-3xl overflow-hidden border border-[#D4AF37]/30 select-none shadow-2xl">
              
              {/* الخلفية: بعد التشطيب والإنارة الفاخرة */}
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/after.jpg')" }}>
                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-[#D4AF37] px-3.5 py-1.5 rounded-xl text-[10px] font-black select-none">بعد تسليم التشطيب والإنارة ✨</div>
              </div>
              {/* الغطاء: قبل العمل على الطوب والمحارة */}
              <div className="absolute inset-0 bg-cover bg-center transition-all" style={{ backgroundImage: "url('/before.jpg')", clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}>
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm text-gray-300 px-3.5 py-1.5 rounded-xl text-[10px] font-black select-none">قبل البدء والتنفيذ (على الطوب) 🧱</div>
              </div>
              {/* الخط المذهب الفاصل والكبسولة التفاعلية */}
              <div className="absolute top-0 bottom-0 w-[3px] bg-[#D4AF37] pointer-events-none" style={{ left: `${sliderPos}%` }}>
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#020B1C] border-2 border-[#D4AF37] flex items-center justify-center text-[#D4AF37] text-xs font-black shadow-lg shadow-black/50 select-none pointer-events-none">↔</div>
              </div>
              {/* منزلق السحب الخفي اللمسي المتوافق مع الجوال والآيباد */}
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
              />
            </div>
          </div>

          {/* 2. مديول المزايا الـ 6 الفاخرة لـ GOLDEN DECORATION */}
          <div className="bg-[#07132a] border-2 border-[#D4AF37]/20 rounded-[2rem] p-6 shadow-2xl space-y-6">
            <div className="text-right border-b border-[#D4AF37]/20 pb-3 select-none">
              <h4 className="text-[#D4AF37] font-black text-xl tracking-wider uppercase font-sans">GOLDEN DECORATION</h4>
              <p className="text-gray-400 text-xs font-bold leading-normal mt-1">تأصيل معايير الجودة والضمان المعتمد في كافة مشاريعنا السكنية والتجارية:</p>
            </div>

            {/* شبكة المزايا الـ 6 الفاخرة */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-right">
              {goldenAdvantages.map((adv, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-[#020B1C]/50 border border-[#D4AF37]/15 hover:border-[#D4AF37]/35 transition-all duration-300 flex flex-col justify-between space-y-2 h-36">
                  <h5 className="text-[#D4AF37] font-black text-base flex items-center gap-2">
                    <span>◀</span>
                    <span>{adv.name}</span>
                  </h5>
                  <p className="text-gray-300 text-xs leading-relaxed font-bold">{adv.desc}</p>
                </div>
              ))}
            </div>

            {/* كارت الاتصال والتحصيل التفاعلي لـ الواتس اب المباشر ببريق ملوكي أخضر */}
            <div className="bg-[#020B1C]/80 border-2 border-emerald-500/20 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-inner">
              <div className="text-right">
                <h5 className="text-emerald-400 font-black text-sm flex items-center gap-1.5 select-none">
                  <span>🟢</span> تواصل فوري ومباشر مع مهندسنا عبر الواتساب
                </h5>
                <p className="text-gray-400 text-[11px] mt-1 font-bold">مهندسونا متاحون على مدار الساعة للرد على استفساراتك وتنسيق المعاينة الميدانية لشقتك مجاناً.</p>
              </div>
              
              {/* زر نسخ وتوجيه واتساب حركي ومفعل للجوالات */}
              <a
                href="https://wa.me/201065282534"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3.5 rounded-full bg-[#10b981] hover:bg-emerald-500 text-[#020B1C] font-black text-xs md:text-sm transition-all duration-200 hover:scale-[1.03] active:scale-97 cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-2 whitespace-nowrap"
              >
                <span>اضغط لبدء محادثة واتساب: 01065282534</span>
              </a>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default function PublicEstimatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020B1C] flex items-center justify-center text-[#D4AF37] font-black text-lg animate-pulse">
        جاري تهيئة البوابة للعملاء...
      </div>
    }>
      <PublicEstimateContent />
    </Suspense>
  );
}