"use client";

import { useCRM } from "@/components/CRM/context/CRMContext";
import { Loader2, Home, CheckCircle2, ArrowRightLeft } from "lucide-react";

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

  function handleChange(field: string, value: any) {
    setCRMData((prev: any) => ({
      ...prev,
      project: {
        ...(prev.project || {}),
        [field]: value
      }
    }));
  }

  // دالة تعريب مراحل سير العمل سحابياً لتجنب إظهار المعرفات الإنجليزية الخام بالـ ERP
  const getWorkflowStageLabel = (stage: string) => {
    const s = String(stage || "").trim().toLowerCase();
    if (s === "needs_estimate") return "بانتظار تسعير المهندس ⏳";
    if (s === "initial_ready") return "المقايسة المبدئية جاهزة 📄";
    if (s === "final") return "تم الاعتماد النهائي والتعاقد 🔒";
    return "تأسيس مواصفات المشروع";
  };

  return (
    <div className="bg-[#07132a] border border-[#D4AF37]/25 rounded-2xl p-6 space-y-4 select-none text-right text-white font-alexandria" dir="rtl">
      
      {/* رأس ترويسة المشروع بالذهب الإمبراطوري وأيقونة Lucide الرسمية */}
      <h3 className="text-[#D4AF37] text-sm md:text-base font-black border-b border-[#D4AF37]/15 pb-3 flex items-center gap-2">
        <Home className="w-5 h-5 text-[#D4AF37] shrink-0" />
        <span>بيانات ومواصفات المشروع والوحدة الإنشائية</span>
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

        <div>
          <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px]">المساحة الإجمالية (م²) *</label>
          <input
            type="number"
            disabled={isLocked}
            placeholder="اكتب المساحة الرقمية..."
            value={project.area || ""}
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

        {/* تسييل سير العمل (Workflow Stage Buttons) - أزرار لمسية كهرومغناطيسية مذهبة ونيومورفيك بالكامل */}
        {project.id && !project.id.startsWith("new") && (
          <div className="col-span-2 pt-3.5 border-t border-[#D4AF37] flex justify-between items-center select-none font-bold text-[10px]">
            <div className="flex gap-2">
              {project.workflow_stage !== "needs_estimate" && project.workflow_stage !== "initial_ready" && project.workflow_stage !== "final" && (
                <button
                  type="button"
                  onClick={() => advanceWorkflowStage(project.id, "needs_estimate", "engineer", `🚨 مطلوب معاينة وتسعير فني فوري لموقع: ${project.projectName}`)}
                  disabled={saving}
                  className="bg-black/60 hover:bg-[#D4AF37] border border-[#D4AF37] text-[#D4AF37] hover:text-[#020B1C] py-2 px-3 rounded-lg cursor-pointer transition-all duration-300 text-[10px] font-black hover:translate-y-[-1px] shadow-[0_0_10px_rgba(212,175,55,0.15)] hover:shadow-[0_0_15px_rgba(212,175,55,0.45)] disabled:opacity-50"
                >
                  ⏳ طلب المعاينة والتسعير من المهندس
                </button>
              )}

              {project.workflow_stage === "needs_estimate" && (
                <button
                  type="button"
                  onClick={() => advanceWorkflowStage(project.id, "initial_ready", "sales", `✅ تم الانتهاء من حصر البنود وإصدار المقايسة المبدئية لموقع: ${project.projectName}`)}
                  disabled={saving}
                  className="bg-black/60 hover:bg-emerald-500 border border-emerald-500/50 text-emerald-400 hover:text-black py-2 px-3 rounded-lg cursor-pointer transition-all duration-300 text-[10px] font-black hover:translate-y-[-1px] shadow-[0_0_10px_rgba(16,185,129,0.15)] hover:shadow-[0_0_15px_rgba(16,185,129,0.45)] disabled:opacity-50"
                >
                  🚀 إصدار وتجهيز المقايسة المبدئية للعميل
                </button>
              )}
            </div>
            
            {/* الشارة معربة بنسبة 100% بدلاً من القيم الإنجليزية لضمان هيبة الواجهة */}
            <span className="text-[#D4AF37] bg-black/60 px-2.5 py-1 rounded-lg border border-[#D4AF37]/15 font-black">
              {getWorkflowStageLabel(project.workflow_stage)}
            </span>
          </div>
        )}

      </div>

      {/* زر الحفظ الملحق بأسفل كارت المشروع بتصميم ميتاليك لمسي فاخر */}
      <div className="pt-3 border-t border-[#D4AF37] flex justify-end select-none">
        <button
          onClick={handleSaveProject}
          disabled={saving}
          className="bg-black/60 hover:bg-[#D4AF37] border-2 border-[#D4AF37] text-[#D4AF37] hover:text-[#020B1C] py-2.5 px-6 rounded-full text-xs font-black cursor-pointer transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-1.5 hover:translate-y-[-2px] hover:shadow-[0_0_15px_rgba(212,175,55,0.45)]"
        >
          {saving ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : "💾 حفظ بيانات ومواصفات المشروع"}
        </button>
      </div>

    </div>
  );
}