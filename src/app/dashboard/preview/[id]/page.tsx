"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient"; 
import { 
  ArrowRight, 
  Layout, 
  FileText, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  ExternalLink,
  Loader2,
  Lock,
  Compass,
  AlertTriangle,
  Upload,
  UserCheck,
  Share2,  
  Copy,
  X     
} from "lucide-react";

export default function AdminClientPreview() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [project, setProject] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [estimateNumber, setEstimateNumber] = useState<string>("EST-M2.5");
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!projectId) return;

    async function fetchProjectDetails() {
      try {
        setIsLoading(true);
        setError(null);

        const { data: projData, error: projErr } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .single();

        if (projErr) throw projErr;
        setProject(projData);
        
        setIsPublished(projData?.status === "Completed" || projData?.is_published === true);

        // جلب كود المقايسة الفعلي لتوجيه العميل الرقمي
        const { data: estHeader } = await supabase
          .from("estimate_headers")
          .select("estimate_number")
          .eq("project_id", projectId)
          .maybeSingle();
        
        if (estHeader) {
          setEstimateNumber(estHeader.estimate_number);
        } else {
          setEstimateNumber(projData.project_code ? `EST-${projData.project_code.split("-")[1]}` : "EST-XXXX");
        }

        if (projData?.customer_id) {
          const { data: custData, error: custErr } = await supabase
            .from("customers")
            .select("*")
            .eq("id", projData.customer_id)
            .single();

          if (custErr) throw custErr;
          setCustomer(custData);
        }

      } catch (err: any) {
        console.error("Error loading preview project:", err);
        setError(err?.message || "لم يتم العثور على المشروع المحدد في قاعدة البيانات.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchProjectDetails();
  }, [projectId]);

  // معالج تحديث عنوان تاب المتصفح ديناميكياً
  useEffect(() => {
    if (project) {
      const clientName = customer?.name || "تحت التأسيس";
      const projectName = project?.project_name || project?.name || "الموقع الفني";
      document.title = `المعاينة الفنية: ${projectName} - العميل: ${clientName} | Golden Decoration`;
    } else {
      document.title = "المعاينة الفنية والملف ثلاثي الأبعاد | Golden Decoration";
    }
  }, [project, customer]);

  const handleTogglePublish = async () => {
    try {
      setIsUpdating(true);
      
      const { error: updateErr } = await supabase
        .from("projects")
        .update({ status: isPublished ? "Planning" : "Completed" })
        .eq("id", projectId);

      if (updateErr) throw updateErr;

      setIsPublished(!isPublished);

    } catch (err: any) {
      alert("فشل تحديث حالة النشر: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // ⚠️ تنويه: الدومين هنا ثابت يدوياً (golden-decoration.vercel.app). لو الدومين الفعلي
  // للموقع المنشور مختلف (دومين مخصص مثلاً)، الرابط ده هيبقى غلط لأي عميل يتبعت له.
  // يفضل ربطه بمتغير بيئة (NEXT_PUBLIC_SITE_URL) بدل ما يفضل مكتوب يدوياً هنا.
  const publicClientLink = `https://golden-decoration.vercel.app/public-estimate?code=${estimateNumber}`; 

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicClientLink);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const customerName = customer?.name || "عميلنا الموقر";
    const textMessage = `مرحباً استاذ ${customerName}، يسعدنا في جولدن ديكوراشن إبلاغكم بإتاحة ونشر ملف المعاينة الفنية المحدث والمخطط ثلاثي الأبعاد لموقعكم الموقر عبر بوابتكم الرقمية الجارية: ${publicClientLink}`;
    window.open(`https://api.whatsapp.com/send?phone=${customer?.mobile ? '20' + customer.mobile : ''}&text=${encodeURIComponent(textMessage)}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020B1C]" dir="rtl">
        <div className="text-center select-none font-alexandria">
          <Loader2 className="animate-spin text-[#D4AF37] mx-auto" size={40} />
          <p className="text-sm text-gray-400 mt-4 font-black animate-pulse">جاري تحميل المجلد الفني والملف ثلاثي الأبعاد للموقع...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen p-8 bg-[#020B1C] text-right font-alexandria" dir="rtl">
        <div className="max-w-md mx-auto bg-[#07132a] border border-rose-500/20 rounded-2xl p-6 text-center shadow-2xl">
          <AlertTriangle className="text-rose-500 mx-auto mb-4" size={40} />
          <h3 className="font-bold text-white text-lg">خلل في جلب الملف الفني</h3>
          <p className="text-xs text-rose-400 mt-2">{error || "لم يتم العثور على المشروع في قاعدة البيانات."}</p>
          <button 
            type="button"
            onClick={() => router.back()}
            className="mt-6 bg-gradient-to-r from-[#D4AF37] to-[#F0E6D2] text-[#020B1C] text-xs font-black py-3 px-6 rounded-xl hover:scale-105 active:scale-95 transition cursor-pointer"
          >
            العودة للوحة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020B1C] p-4 md:p-8 text-right text-white select-none animate-fade-in font-alexandria" dir="rtl">
      
      {/* 🛠️ جدار الحماية البصري المعتمد لتوحيد شريط التمرير الفاخر 6px بأسهم التحكم ومنع التقاطع */}
      <style dangerouslySetInnerHTML={{__html: `
        ::-webkit-scrollbar { width: 6px !important; height: 6px !important; }
        ::-webkit-scrollbar-track { background: #020B1C !important; }
        ::-webkit-scrollbar-thumb { background: #D4AF37 !important; border-radius: 9999px !important; }
        ::-webkit-scrollbar-thumb:hover { background: #AA7C11 !important; }

        /* تلوين أزرار أسهم الصعود والهبوط يدوياً لشريط التمرير */
        ::-webkit-scrollbar-button {
          display: block !important;
          background-color: #020B1C !important;
          height: 10px !important;
          width: 10px !important;
        }
        ::-webkit-scrollbar-button:vertical:decrement {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23D4AF37'><polygon points='50,20 15,80 85,80'/></svg>") !important;
          background-size: 6px !important;
          background-repeat: no-repeat !important;
          background-position: center !important;
        }
        ::-webkit-scrollbar-button:vertical:increment {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23D4AF37'><polygon points='15,20 85,20 50,80'/></svg>") !important;
          background-size: 6px !important;
          background-repeat: no-repeat !important;
          background-position: center !important;
        }

        /* إلغاء أكواد الإخفاء لضمان انسيابية التمرير بالماوس والجوال */
        .overflow-x-auto { 
          scrollbar-width: thin !important; 
          -ms-overflow-style: auto !important; 
          overflow-x: auto !important; 
        }

        /* توحيد كشوف البيانات والمرفقات لتكون أوف وايت ناعم */
        .spec-item, .spec-item * {
          color: #F0E6D2 !important;
        }
      `}} />

      {/* شريط الإجراءات العلوي الفاخر الموحد بالدستور البصري الميتاليكي المذهب للشركة */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8 border-b border-[#D4AF37]/20 pb-5 select-none">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-[#D4AF37] flex items-center gap-2">
            <span>إدارة ونشر الملف الفني للمشروع</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-pulse" />
          </h1>
          <p className="text-white text-xs mt-2 font-semibold">إتاحة المخطط ثلاثي الأبعاد وشيت المقايسة لتصفح العميل المباشر.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* 1. فقاعة حالة النشر الحالية المذهب */}
          <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 ${isPublished ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
            {isPublished ? <CheckCircle size={12} /> : <Lock size={12} />}
            {isPublished ? "منشور للعميل النهائي" : "مسودة (مخفي عن العميل)"}
          </span>
          
          {/* 2. زر تبديل النشر وحجب الملف للـ CRM */}
          <div className="relative group">
            <button 
              type="button"
              onClick={handleTogglePublish}
              disabled={isUpdating}
              className={`flex items-center gap-2 text-[10px] font-black py-2.5 px-4 rounded-xl shadow-sm text-[#020B1C] transition-all cursor-pointer hover:scale-103 active:scale-97 ${isPublished ? "bg-gradient-to-r from-red-500 to-rose-400 hover:shadow-[0_0_15px_rgba(244,63,94,0.4)]" : "bg-gradient-to-r from-emerald-500 to-teal-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]"}`}
            >
              {isUpdating ? <Loader2 size={12} className="animate-spin" /> : (isPublished ? <EyeOff size={14} /> : <Eye size={14} />)}
              {isPublished ? "حجب الملف المالي والفني" : "إتاحة ونشر للمستخدم النهائي"}
            </button>
            <div className="absolute top-full mt-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
              <div className="bg-[#07132a] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2.5 px-4 rounded-xl shadow-2xl relative">
                🔄 تفعيل أو حظر صلاحية وصول العميل للمخطط التفصيلي والمقايسة
                <div className="absolute bottom-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#07132a] border-t border-l border-[#D4AF37] rotate-45 -mt-1" />
              </div>
            </div>
          </div>

          {/* 3. زر معاينة بوابة العميل المباشرة بالكبسولة المذهبة المعتمدة */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => window.open(`/public-estimate?code=${estimateNumber}`, "_blank")}
              className="flex items-center gap-2 text-[10px] font-black bg-gradient-to-r from-[#D4AF37] to-[#F0E6D2] text-black px-5 py-2.5 rounded-xl shadow-lg shadow-[#D4AF37]/15 hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              <UserCheck size={14} />
              <span>👁️ معاينة بوابة العميل</span>
            </button>
            <div className="absolute top-full mt-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
              <div className="bg-[#07132a] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2.5 px-4 rounded-xl shadow-2xl relative">
                📱 فتح الواجهة الرقمية الخارجية التي يتصفحها العميل الآن
                <div className="absolute bottom-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#07132a] border-t border-l border-[#D4AF37] rotate-45 -mt-1" />
              </div>
            </div>
          </div>

          {/* 4. زر العودة للخلف الفاخر */}
          <div className="relative group">
            <button 
              type="button"
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 text-[10px] font-black text-[#D4AF37] hover:text-[#020B1C] hover:bg-gradient-to-r hover:from-[#D4AF37] hover:to-[#C9A45D] bg-[#07132a] border border-[#D4AF37]/40 hover:border-transparent px-4 py-2.5 rounded-xl transition-all duration-300 cursor-pointer hover:shadow-[0_0_15px_rgba(212,175,55,0.45)] hover:scale-103 active:scale-97"
            >
              <ArrowRight size={14} />
              العودة للخلف
            </button>
            <div className="absolute top-full mt-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
              <div className="bg-[#07132a] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2.5 px-4 rounded-xl shadow-2xl relative">
                🔙 العودة الفورية إلى لوحة التحكم ومراقبة المشاريع الجارية
                <div className="absolute bottom-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#07132a] border-t border-l border-[#D4AF37] rotate-45 -mt-1" />
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* العمود الأيمن مدمج بالإطارات الرفيعة الشفافة الفاخرة بالمقياس الإمبراطوري المتين بالمنصة */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#07132a] border-2 border-[#D4AF37]/20 rounded-[2rem] p-6 shadow-xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
            <h2 className="text-sm font-black text-[#D4AF37] border-b border-[#D4AF37]/20 pb-3 flex items-center gap-2">
              <Layout size={18} className="text-[#D4AF37]" />
              بيانات العميل والموقع الفنية
            </h2>
            <div className="space-y-4 text-xs spec-item">
              <div>
                <span className="text-gray-500 block font-bold">اسم العميل المتعاقد:</span>
                <span className="font-bold text-[#F0E6D2] text-xs mt-0.5 block">{customer?.name || "تحت التأسيس"}</span>
              </div>
              <div>
                <span className="text-gray-500 block font-bold">رقم موبايل العميل:</span>
                <span className="font-mono text-[#F0E6D2] mt-0.5 block font-bold">{customer?.mobile || "غير مسجل"}</span>
              </div>
              <div className="border-t border-[#1f2d4d] pt-3">
                <span className="text-gray-500 block font-bold">عنوان ومسمى الموقع:</span>
                <span className="font-bold text-[#F0E6D2] mt-0.5 block">{project?.project_name || project?.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-[#1f2d4d] pt-3">
                <div>
                  <span className="text-gray-500 block font-bold">المساحة الفعلية:</span>
                  <span className="font-bold text-[#F0E6D2] mt-0.5 block">{project?.area} متر مربع</span>
                </div>
                <div>
                  <span className="text-gray-500 block font-bold">مستوى التشطيب:</span>
                  <span className="font-bold text-[#F0E6D2] mt-0.5 block">{project?.finishing_level || "سوبر لوكس"}</span>
                </div>
              </div>
              <div className="border-t border-[#1f2d4d] pt-3">
                <span className="text-gray-500 block font-bold">المنطقة الجغرافية للتوزيع:</span>
                <span className="font-bold text-[#F0E6D2] mt-0.5 block">{project?.location || "غير محددة"}</span>
              </div>
            </div>
          </div>

          {/* مديول مشاركة الرابط السريع للعميل عبر واتساب بالمقياس الإمبراطوري المتين بالمنصة */}
          <div className="bg-[#07132a] border-2 border-[#D4AF37]/20 rounded-[2rem] p-6 shadow-xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
            <h2 className="text-sm font-black text-[#D4AF37] border-b border-[#D4AF37]/20 pb-3 flex items-center gap-2">
              <Share2 size={18} className="text-[#D4AF37]" />
              مشاركة بوابة العميل والمقايسة
            </h2>
            <p className="text-[10px] text-gray-500 leading-relaxed font-bold">
              يمكنك نسخ الرابط أو فتحه مباشرة للعميل لإرسال إخطار ترحيبي مذهب برابط المقايسة ثلاثية الأبعاد الخاصة به.
            </p>
            <div className="space-y-3 pt-2">
              
              {/* زر نسخ الرابط مع التولتيب */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full py-3 px-4 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-[#F0E6D2] hover:border-[#D4AF37] transition text-xs font-black flex items-center justify-between cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="truncate max-w-[180px]">{publicClientLink}</span>
                  <span className="text-[#D4AF37] text-[10px] font-bold flex items-center gap-1">
                    {copySuccess ? "تم النسخ ✓" : <Copy size={12} />}
                  </span>
                </button>
                <div className="absolute top-full mt-2 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                  <div className="bg-[#07132a] border border-[#D4AF37] text-[#F0E6D2] text-[9px] font-black py-1.5 px-3 rounded-lg shadow-2xl relative">
                    📋 نسخ رابط البوابة لمشاركته يدوياً
                    <div className="absolute bottom-full right-1/2 translate-x-1/2 w-1.5 h-1.5 bg-[#07132a] border-t border-l border-[#D4AF37] rotate-45 -mt-1" />
                  </div>
                </div>
              </div>

              {/* زر إرسال واتساب مع التولتيب بتصميم مستطيل رائع ذو ظل مذهب */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:shadow-[0_4px_15px_rgba(16,185,129,0.35)] text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>🟢 مشاركة ملف العميل عبر واتساب</span>
                </button>
                <div className="absolute top-full mt-2 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                  <div className="bg-[#07132a] border border-[#D4AF37] text-[#F0E6D2] text-[9px] font-black py-1.5 px-3 rounded-lg shadow-2xl relative">
                    ✉️ توليد رسالة ترحيبية وإرسال الرابط مباشرة للعميل
                    <div className="absolute bottom-full right-1/2 translate-x-1/2 w-1.5 h-1.5 bg-[#07132a] border-t border-l border-[#D4AF37] rotate-45 -mt-1" />
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div className="bg-[#07132a] border border-[#D4AF37]/40 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-[#D4AF37] border-b border-[#D4AF37]/20 pb-3 flex items-center gap-2">
              <FileText size={18} className="text-[#D4AF37]" />
              أحدث المرفقات والمستندات
            </h2>
            <div className="space-y-3 text-xs spec-item">
              <div className="flex justify-between items-center p-3 bg-[#020B1C]/50 rounded-xl border border-[#1f2d4d]">
                <span className="font-semibold text-gray-300">شيت المقايسة التفصيلية المعتمد</span>
                <button type="button" onClick={() => window.open(`/public-estimate?code=${estimateNumber}`, "_blank")} className="text-[#D4AF37] hover:text-[#F0E6D2] font-black flex items-center gap-1 cursor-pointer">
                  معاينة المخطط الرقمي <ExternalLink size={10} />
                </button>
              </div>
            </div>
          </div>

          {/* مديول عرض الكروكي المرفوع حياً من العميل */}
          {project?.plan_url ? (
            <div className="bg-[#07132a] border border-[#D4AF37]/40 rounded-2xl p-6 shadow-2xl space-y-4">
              <h2 className="text-sm font-bold text-[#D4AF37] border-b border-[#D4AF37]/20 pb-3 flex items-center gap-2">
                <Upload size={18} className="text-[#D4AF37]" />
                الكروكي المرفق من العميل
              </h2>
              <div className="relative w-full h-44 rounded-xl overflow-hidden border border-[#1f2d4d]">
                <img src={project.plan_url} alt="كروكي العميل" className="w-full h-full object-cover" />
              </div>
            </div>
          ) : (
            <div className="bg-[#07132a] border border-[#1f2d4d] rounded-2xl p-6 text-center text-xs text-slate-400">
              ⚠️ بانتظار العميل لإرفاق كروكي ومخطط الشقة يدوياً من بوابته الرقمية.
            </div>
          )}
        </div>

        {/* العمود الأيسر - نافذة العرض ثلاثية الأبعاد الفخمة بالمقياس الإمبراطوري المتين بالمنصة */}
        <div className="lg:col-span-2">
          <div className="bg-[#07132a] border-2 border-[#D4AF37]/20 rounded-[2rem] p-6 shadow-2xl h-full flex flex-col space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
            <div className="flex justify-between items-center border-b border-[#D4AF37]/20 pb-3">
              <h2 className="text-sm font-black text-[#D4AF37] flex items-center gap-2">
                <Compass size={18} className="text-[#D4AF37]" />
                معاينة نموذج التصميم ثلاثي الأبعاد الفعلي (3D Model Panel)
              </h2>
              <span className="text-[10px] bg-[#020B1C] border border-[#D4AF37]/30 text-[#D4AF37] px-3 py-1.5 rounded-full font-bold">تفاعلي عبر المتصفح</span>
            </div>
            
            <div className="relative bg-black rounded-2xl border border-[#1f2d4d] flex-grow min-h-[450px] overflow-hidden flex items-center justify-center shadow-[inset_0_4px_20px_rgba(212,175,55,0.08)]">
              {project?.design_embed_url ? (
                <iframe 
                  src={project.design_embed_url}
                  className="absolute inset-0 w-full h-full border-0"
                  allowFullScreen
                ></iframe>
              ) : (
                <div className="text-center p-8 space-y-4">
                  <Compass className="text-gray-700 mx-auto animate-pulse" size={48} />
                  <p className="text-xs font-bold text-gray-400">لا يوجد نموذج تصميم تفاعلي 3D مرفق في قاعدة البيانات لهذا المشروع حالياً</p>
                  <p className="text-[10px] text-gray-600 font-bold">يمكنك إضافة الرابط في عمود الـ design_embed_url بجدول المشاريع لتسييله حياً للعميل.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}