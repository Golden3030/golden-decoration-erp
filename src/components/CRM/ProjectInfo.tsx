"use client";

import React, { useState } from "react";
import { useCRM } from "@/components/CRM/context/CRMContext";
import { supabase } from "@/lib/supabaseClient"; 
import { 
  Loader2, 
  Home, 
  ArrowRightLeft, 
  Send, 
  FileText, 
  Check, 
  FileEdit,
  Sparkles,
  Printer,
  Share2
} from "lucide-react";

// تعريف الخصائص الصارمة المطلوبة لضمان توافق تجميع التايب سكريبت والربط المتزامن
interface ProjectInfoProps {
  customerProjects: any[];
  handleSwitchActiveProject: (projectId: string) => Promise<void>;
  handleSaveProject: () => Promise<void>;
  saving: boolean;
  advanceWorkflowStage: (projectId: string, stage: string, role: string, msg: string) => Promise<void>;
}

export default function ProjectInfo({
  customerProjects,
  handleSwitchActiveProject,
  handleSaveProject,
  saving,
  advanceWorkflowStage
}: ProjectInfoProps) {
  const { crmData, setCRMData, isLocked } = useCRM();

  const project = crmData.project || {};

  // حالات الشاشة المنبثقة لتسجيل تعديلات العميل
  const [isAmendmentsOpen, setIsAmendmentsOpen] = useState(false);
  const [amendmentsText, setAmendmentsText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(field: string, value: any) {
    setCRMData((prev: any) => ({
      ...prev,
      project: {
        ...(prev.project || {}),
        [field]: value
      }
    }));
  }

  // دالة تعريب مراحل سير العمل سحابياً
  const getWorkflowStageLabel = (stage: string) => {
    const s = String(stage || "").trim().toLowerCase();
    if (s === "needs_estimate") return "بانتظار تسعير المهندس ⏳";
    if (s === "initial_ready") return "المقايسة المبدئية جاهزة 📄";
    if (s === "amendments_requested") return "تعديلات مطلوبة فنية 🛠️";
    if (s === "final") return "تم الاعتماد والتعاقد 🔒";
    return "تأسيس مواصفات المشروع";
  };

  const getWorkflowStageIndex = (stage: string) => {
    const s = String(stage || "").trim().toLowerCase();
    if (s === "needs_estimate") return 1;
    if (s === "initial_ready") return 2;
    if (s === "amendments_requested") return 3;
    if (s === "final") return 4;
    return 0; // pending_specs
  };

  const activeStageIndex = getWorkflowStageIndex(project.workflow_stage);

  // 🌟 فك تفعيل كارت المشاركة وتأمينه أوتوماتيكياً حسب مرحلة المقايسة
  const isShareActive = activeStageIndex >= 2;

  // دالة الإرسال التلقائي للواتساب وصياغة رسالة المقايسة الرسمية للشركة
  const handleSendWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault(); // 👈 منع السلوك الافتراضي لتعطيل الريفريش
    
    const clientMobile = crmData.customer?.mobile;
    if (!clientMobile) {
      alert("⚠️ لا يوجد رقم هاتف جوال مسجل للعميل لإرسال المقايسة.");
      return;
    }

    let cleanPhone = String(clientMobile).trim();
    if (cleanPhone.startsWith("01")) {
      cleanPhone = "2" + cleanPhone; 
    }

    const clientName = crmData.customer?.name || "العميل الكريم";
    const projName = project.projectName || "الوحدة السكنية";
    const projCode = project.projectCode || "P-XXXX";
    const area = project.area || 0;
    const finishing = project.finishingLevel || "اقتصادي (لوكس)";
    const estimateTotal = crmData.estimate?.total || 0;

    const messageText = `السلام عليكم ورحمة الله وبركاته يا فندم، مع حضرتك قسم إدارة العلاقات والـ CRM بشركة *Golden Decoration* للتشطيبات الفاخرة واللوحات المعمارية.\n\n` +
      `يسعدنا إرسال تفاصيل ومواصفات المقايسة المبدئية المعتمدة لوحدتكم الموقرة *(${clientName})*:\n\n` +
      `▪️ *كود العقد الإنشائي:* ${projCode}\n` +
      `▪️ *وصف الموقع:* ${projName}\n` +
      `▪️ *المساحة الحركية المعتمدة:* ${area} م²\n` +
      `▪️ *مستوى المواد والتنسيق:* ${finishing}\n` +
      `▪️ *إجمالي القيمة التقديرية الكلية:* ${estimateTotal.toLocaleString('en-US')} ج.م\n\n` +
      `📍 يمكنك الآن تفريغ أمتار حصر الرخام والسيراميك والجبس بورد بالكامل، والاطلاع على بنود المقايسة التفصيلية، بالإضافة إلى *رؤية ومحاكاة مجسم الـ 3D التفاعلي لشقتك من هاتفك* عبر بوابة العميل السحابية الخاصة بك بالرابط التالي:\n` +
      `${window.location.origin}/client\n\n` +
      `يسعدنا دوماً باستقبال أي تعديلات معمارية أو فنية، أو اعتماد العقد المالي للبدء الفوري بالتنفيذ الميداني.`;

    const encodedMessage = encodeURIComponent(messageText);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
    
    window.open(whatsappUrl, "_blank");
  };

  // دالة أمر الطباعة لنسخة الـ PDF المتناسقة مع A4
  const handlePrintPDF = (e: React.MouseEvent) => {
    e.preventDefault(); // 👈 منع السلوك الافتراضي لتعطيل الريفريش
    window.print();
  };

  // معالجة حفظ وإرسال طلب التعديل الفني وسحبه بالـ CRM timeline تلقائياً
  const handleConfirmAmendments = async (e: React.FormEvent) => {
    e.preventDefault(); // 👈 منع السلوك الافتراضي لتعطيل الريفريش
    if (!amendmentsText.trim()) {
      alert("الرجاء كتابة تفاصيل التعديلات الفنية التي يطلبها العميل أولاً.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: custData } = await supabase
        .from("customers")
        .select("id")
        .eq("customer_code", crmData.customer?.customerCode)
        .single();

      if (!custData) throw new Error("لم يتم العثور على العميل المرتبط بالمشروع.");

      const logText = `[طلبات تعديل العميل على المقايسة]: ${amendmentsText}`;
      const { error: logErr } = await supabase
        .from("customer_logs")
        .insert([{
          customer_id: custData.id,
          interaction_type: "طلب تعديل مقايسة",
          feedback: logText
        }]);
      if (logErr) throw logErr;

      await advanceWorkflowStage(
        project.id, 
        "amendments_requested", 
        "engineer", 
        `🛠️ العميل طلب تعديلات فنية للمقايسة بموقع (${project.projectName}): ${amendmentsText}`
      );

      setIsAmendmentsOpen(false);
      setAmendmentsText("");
      alert("✅ تم تسجيل وحفظ طلبات التعديل بالـ CRM وتنبيه المهندس بنجاح!");
    } catch (err: any) {
      alert("فشل ترحيل وتسجيل التعديلات الفنية: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#07132a] border border-[#D4AF37]/25 rounded-2xl p-6 space-y-4 select-none text-right text-white font-alexandria h-full flex flex-col justify-between relative overflow-hidden" dir="rtl">
      
      <div className="space-y-4">
        {/* ترويسة الكارت مدمج بها أيقونة تعديلات المقايسة البرونزية الفاخرة على اليسار */}
        <h3 className="text-[#D4AF37] text-sm md:text-base font-black border-b border-[#D4AF37]/15 pb-3 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-[#D4AF37] shrink-0" />
            <span>بيانات ومواصفات المشروع والوحدة الإنشائية</span>
          </div>

          {/* أيقونة برونزية مذهبة لتسجيل طلبات تعديل العميل تفتح الشاشة المنبثقة الفخمة */}
          {activeStageIndex >= 2 && (
            <button
              type="button" // 👈 حظر السلوك الافتراضي للمتصفح
              onClick={(e) => { e.preventDefault(); setIsAmendmentsOpen(true); }}
              className="p-1.5 rounded-lg border border-[#B48C34]/40 bg-[#020B1C] text-[#B48C34] hover:bg-[#B48C34] hover:text-[#020B1C] transition duration-300 cursor-pointer shadow-md shrink-0 flex items-center justify-center gap-1.5 text-[10px] font-black"
              title="تسجيل تعديلات العميل الفنية على المقايسة"
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>تسجيل تعديل</span>
            </button>
          )}
        </h3>

        {/* مديول المبدل الذكي للمشاريع المتعددة للعميل الواحد */}
        {customerProjects && customerProjects.length > 1 && (
          <div className="p-3 bg-[#020B1C]/80 border border-[#D4AF37]/20 rounded-xl mb-2">
            <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px] flex items-center gap-1.5 select-none">
              <ArrowRightLeft size={12} className="text-[#D4AF37]" />
              <span>المشاريع النشطة للعميل (تبديل):</span>
            </label>
            <select
              value={project.id || ""}
              onChange={(e) => handleSwitchActiveProject(e.target.value)}
              className="w-full h-10 rounded-lg bg-[#07132a] border border-[#D4AF37]/30 text-white px-3 outline-none text-xs font-bold cursor-pointer focus:border-[#D4AF37]"
            >
              {customerProjects.map(p => (
                <option key={p.id} value={p.id}>🏠 {p.project_name} ({p.location})</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-xs">
          
          <div>
            <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px]">رقم المقايسة (تلقائي)</label>
            <input
              type="text"
              value={project.estimateNumber || "EST-سيولد تلقائياً"}
              disabled
              className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-gray-500 px-3 outline-none text-center font-mono font-bold text-xs"
            />
          </div>

          <div>
            <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px]">اسم المشروع الحالي *</label>
            <input
              type="text"
              disabled={isLocked}
              placeholder="مثال: شقة المهندسين"
              value={project.projectName || ""}
              onChange={(e) => handleChange("projectName", e.target.value)}
              className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-3 outline-none focus:border-[#D4AF37] text-xs font-semibold disabled:opacity-40"
            />
          </div>

          <div>
            <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px]">تاريخ إصدار المقايسة</label>
            <input
              type="date"
              disabled={isLocked}
              value={project.estimateDate || ""}
              onChange={(e) => handleChange("estimateDate", e.target.value)}
              className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] px-3 outline-none font-mono text-center text-xs font-bold disabled:opacity-40"
            />
          </div>

          <div>
            <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px]">نوع الوحدة *</label>
            <select
              disabled={isLocked}
              value={project.unitType || "شقة"}
              onChange={(e) => handleChange("unitType", e.target.value)}
              className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-3 outline-none cursor-pointer text-xs disabled:opacity-40 focus:border-[#D4AF37]"
            >
              <option>شقة</option>
              <option>فيلا</option>
              <option>دوبلكس</option>
              <option>محل تجاري</option>
              <option>مكتب إداري</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px]">موقع وعنوان الوحدة بالتفصيل *</label>
            <input
              type="text"
              disabled={isLocked}
              placeholder="العنوان وموقع المشروع بدقة"
              value={project.unitAddress || ""}
              onChange={(e) => handleChange("unitAddress", e.target.value)}
              className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-4 outline-none focus:border-[#D4AF37] text-xs font-semibold disabled:opacity-40"
            />
          </div>

          <div>
            <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px]">حالة استلام الوحدة</label>
            <select
              disabled={isLocked}
              value={project.unitStatus || "بدون تشطيب (طوب احمر)"}
              onChange={(e) => handleChange("unitStatus", e.target.value)}
              className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-3 outline-none cursor-pointer text-xs disabled:opacity-40 focus:border-[#D4AF37]"
            >
              <option>بدون تشطيب (طوب احمر)</option>
              <option>نصف تشطيب (محارة وحلوق)</option>
              <option>تجديد (ساكنة)</option>
            </select>
          </div>

          {/* معالجة حراسة وعرض قيمة المساحة الرقمية لمنع الارتداد الوهمي */}
          <div>
            <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px]">المساحة الإجمالية (م²) *</label>
            <input
              type="number"
              disabled={isLocked}
              placeholder="اكتب المساحة الرقمية..."
              value={project.area === 0 ? "" : project.area || ""}
              onChange={(e) => handleChange("area", e.target.value !== "" ? Number(e.target.value) : "")}
              className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-3 outline-none focus:border-[#D4AF37] font-mono text-right placeholder:text-gray-500 placeholder:text-xs text-xs font-semibold disabled:opacity-40"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px]">مستوى التشطيب المطلوب</label>
            <select
              disabled={isLocked}
              value={project.finishingLevel || "اقتصادى (لوكس)"}
              onChange={(e) => handleChange("finishingLevel", e.target.value)}
              className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] font-bold px-3 outline-none cursor-pointer text-xs disabled:opacity-40 focus:border-[#D4AF37]"
            >
              <option value="اقتصادى (لوكس)">اقتصادى (لوكس)</option>
              <option value="متوسط (سوبر لوكس )">متوسط (سوبر لوكس )</option>
              <option value="فاخر (الترا لوكس)">فاخر (الترا لوكس)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 🌟 كارت مركز المشاركة الثابت الارتفاع بالكامل والمقفل تلقائياً بالتجميد الشفاف إذا كانت المقايسة قيد التحضير */}
      <div className={`p-4 rounded-xl bg-[#020B1C]/80 border transition-all duration-300 space-y-3 select-none ${
        isShareActive 
          ? "border-[#D4AF37]/40 opacity-100 pointer-events-auto shadow-[0_0_20px_rgba(212,175,55,0.05)]" 
          : "border-[#1f2d4d] opacity-20 pointer-events-none filter grayscale select-none"
      }`}>
        <div className="flex items-center justify-between gap-2 border-b border-[#1f2d4d] pb-1.5 w-full">
          <span className="text-[10px] text-[#D4AF37] font-black">
            {isShareActive 
              ? "✨ مركز مشاركة وإرسال المقايسة الفوري المعتمد للعميل:" 
              : "🔒 مركز مشاركة المقايسة (مغلق ريثما تصدر المقايسة المبدئية)"}
          </span>
          {!isShareActive && <span className="text-[8px] text-gray-500 font-bold">بانتظار إنهاء التسعير...</span>}
        </div>
        
        <div className="flex gap-3 justify-end w-full">
          {/* أ. زر إرسال المقايسة واتساب ذكي */}
          <button
            type="button" // 👈 صمام أمان
            disabled={!isShareActive}
            onClick={(e) => handleSendWhatsApp(e)}
            className="flex-1 h-10 rounded-lg bg-emerald-950/40 border border-emerald-500/50 hover:bg-emerald-500 hover:text-black text-emerald-400 text-xs font-black cursor-pointer transition flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <Share2 className="w-4 h-4 animate-bounce" />
            <span>إرسال واتساب للعميل</span>
          </button>

          {/* ب. زر طباعة / تصدير PDF */}
          <button
            type="button" // 👈 صمام أمان
            disabled={!isShareActive}
            onClick={(e) => handlePrintPDF(e)}
            className="flex-1 h-10 rounded-lg bg-[#07132a] border border-[#D4AF37]/35 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-xs font-black cursor-pointer transition flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <Printer className="w-4 h-4" />
            <span>تصدير وطباعة PDF</span>
          </button>
        </div>
      </div>

      {/* شريط التحكم السفلي ثابت المقاس والارتفاع تماماً */}
      <div className="pt-4 border-t border-[#D4AF37]/20 flex items-center justify-between h-14 select-none mt-auto">
        
        {/* شارة التقييم والمرحلة الجارية بالـ ERP */}
        <div className="flex flex-col text-right">
          <span className="text-[9px] text-gray-500 font-bold leading-none mb-1">المرحلة الجارية بالـ ERP:</span>
          <span className="text-[11px] text-[#D4AF37] font-black">
            {project.id ? getWorkflowStageLabel(project.workflow_stage) : "تأسيس مواصفات المشروع"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          
          {/* أيقونات خط السير تظهر وتختفي داخلياً بحيز مجهري ثابت بناءً على المرحلة النشطة */}
          {project.id && !String(project.id).startsWith("new") && (
            <div className="flex items-center gap-2">
              
              {/* أيقونة طلب تسعير (Send) */}
              {activeStageIndex === 0 && (
                <button
                  type="button" // 👈 حظر السلوك الافتراضي للمتصفح لمنع الريفريش
                  onClick={(e) => { e.preventDefault(); advanceWorkflowStage(project.id, "needs_estimate", "engineer", `🚨 مطلوب معاينة وتسعير فني لموقع: ${project.projectName}`); }}
                  disabled={saving}
                  className="w-10 h-10 rounded-xl bg-black/60 border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] flex items-center justify-center cursor-pointer transition-all duration-300 shadow-[0_0_12px_rgba(212,175,55,0.15)] disabled:opacity-50"
                  title="إرسال طلب المعاينة الفورية والتسعير للمهندس"
                >
                  <Send className="w-4.5 h-4.5 animate-pulse" />
                </button>
              )}

              {/* أيقونة إصدار المقايسة المبدئية (FileText) */}
              {activeStageIndex === 1 && (
                <button
                  type="button" // 👈 حظر السلوك الافتراضي للمتصفح لمنع الريفريش
                  onClick={(e) => { e.preventDefault(); advanceWorkflowStage(project.id, "initial_ready", "sales", `✅ تم الانتهاء من حصر البنود وإصدار المقايسة المبدئية لموقع: ${project.projectName}`); }}
                  disabled={saving}
                  className="w-10 h-10 rounded-xl bg-black/60 border border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black flex items-center justify-center cursor-pointer transition-all duration-300 shadow-[0_0_12px_rgba(16,185,129,0.15)] disabled:opacity-50"
                  title="تجهيز وإصدار المقايسة المبدئية لإرسالها للعميل"
                >
                  <FileText className="w-4.5 h-4.5" />
                </button>
              )}

              {/* أيقونة إعادة إصدار وتعديل المقايسة (Sparkles) */}
              {activeStageIndex === 3 && (
                <button
                  type="button" // 👈 حظر السلوك الافتراضي للمتصفح لمنع الريفريش
                  onClick={(e) => { e.preventDefault(); advanceWorkflowStage(project.id, "initial_ready", "sales", `✅ تم تحديث وتعديل المقايسة بناء على الطلب لموقع: ${project.projectName}`); }}
                  disabled={saving}
                  className="w-10 h-10 rounded-xl bg-black/60 border border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black flex items-center justify-center cursor-pointer transition-all duration-300 shadow-[0_0_12px_rgba(16,185,129,0.15)] disabled:opacity-50"
                  title="اعتماد وإعادة إرسال المقايسة المعدلة للعميل"
                >
                  <Sparkles className="w-4.5 h-4.5" />
                </button>
              )}
            </div>
          )}

          {/* 💾 زر الحفظ الإمبراطوري الثابت تماماً والمعروض دائماً */}
          <button
            type="button" // 👈 حظر السلوك الافتراضي للمتصفح لمنع الريفريش
            onClick={(e) => { e.preventDefault(); handleSaveProject(); }}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.03] active:scale-95 transition-all duration-300 font-black cursor-pointer text-xs flex items-center justify-center gap-1.5 select-none relative overflow-hidden disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : "💾 حفظ المشروع"}
            {/* عاكس الإضاءة النيوني المتوهج بقاع الزر */}
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
          </button>

        </div>
      </div>

      {/* شاشة تسجيل التعديلات المنبثقة الفاخرة */}
      {isAmendmentsOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 select-none animate-fade-in text-right">
          <div className="bg-[#07132a] border-2 border-[#D4AF37] rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-[0_0_40px_rgba(212,175,55,0.25)] relative space-y-4">
            
            <div className="flex justify-between items-center border-b border-[#243556] pb-3 mb-4 select-none">
              <h3 className="text-[#D4AF37] font-black text-base md:text-lg flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-[#D4AF37]" />
                <span>تسجيل وتوثيق تعديلات العميل المطلوبة بالـ CRM</span>
              </h3>
              <button 
                type="button" // 👈 حظر السلوك الافتراضي
                onClick={(e) => { e.preventDefault(); setIsAmendmentsOpen(false); }}
                className="text-gray-400 hover:text-rose-500 font-bold text-sm cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-right">
              <label className="block text-[#D4AF37] font-bold text-xs">اكتب هنا تفاصيل البنود والكميات والخامات المراد تعديلها يدوياً للمهندس المشرف:</label>
              <textarea
                value={amendmentsText}
                onChange={(e) => setAmendmentsText(e.target.value)}
                placeholder="مثال: العميل يريد إلغاء أعمال الجبس بورد في الريسبشن واستبدال بانيو الحمام الرئيسي بكابينة زجاج سيكوريت 10 مم..."
                className="w-full h-32 p-4 rounded-xl bg-[#020B1C] border border-[#1f2d4d] hover:border-[#D4AF37]/50 focus:border-[#D4AF37] text-white outline-none transition-all resize-none text-xs leading-relaxed font-semibold text-right"
              />
              <span className="text-[10px] text-gray-500 block">سيتم أرشفة هذه التعديلات وحفظها باسم السيلز بملف مكالمات العميل التاريخية فورياً.</span>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#1f2d4d]/60">
              <button
                type="button" // 👈 حظر السلوك الافتراضي
                onClick={(e) => { e.preventDefault(); handleConfirmAmendments(e); }}
                disabled={isSubmitting}
                className="px-6 py-3 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.03] active:scale-95 transition-all duration-300 font-black cursor-pointer text-xs flex items-center justify-center gap-1.5 select-none relative overflow-hidden"
              >
                {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : "🚀 إرسال طلب التعديل للمهندس"}
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}