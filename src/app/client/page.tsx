"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { Lock, CheckCircle, ExternalLink, Loader2, Compass, DollarSign, FileText, Upload, X } from "lucide-react";

interface ClientProject {
  id: string;
  project_name: string;
  project_code: string;
  location: string;
  area: number;
  finishing_level: string;
  status: string;
  progress_percentage: number;
  unit_status: string;
  contract_value?: number;
  design_embed_url?: string;
  start_date?: string;
  unit_type?: string;
  plan_url?: string; // تفعيل قراءة حقل الكروكي المرفوع سحابياً
}

export default function ClientDashboardPage() {
  const router = useRouter();
  const [project, setProject] = useState<ClientProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPlan, setUploadingPlan] = useState(false); // حالة رفع الكروكي

  const [contractTotal, setContractTotal] = useState<number>(0);
  const [totalPaid, setTotalPaid] = useState<number>(0);
  const [estimateNumber, setEstimateNumber] = useState<string>("EST-1001");

  useEffect(() => {
    loadClientPortalData();
  }, []);

  async function loadClientPortalData() {
    setLoading(true);
    try {
      document.title = "خزانة ملف العميل والـ 3D | Golden Decoration";

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      const { data: projectData, error: projError } = await supabase
        .from("projects")
        .select("*")
        .eq("customer_id", user.id)
        .maybeSingle();

      if (projError) throw projError;

      if (projectData) {
        setProject(projectData);

        const { data: estimateHeader } = await supabase
          .from("estimate_headers")
          .select("id, estimate_number, grand_total")
          .eq("project_id", projectData.id)
          .maybeSingle();

        const contractValue = estimateHeader ? Number(estimateHeader.grand_total) : Number(projectData.contract_value || 0);
        setContractTotal(contractValue);
        if (estimateHeader) {
          setEstimateNumber(estimateHeader.estimate_number);
        }

        const { data: transactionsData } = await supabase
          .from("transactions")
          .select("amount")
          .eq("project_id", projectData.id)
          .eq("type", "inflow");

        const paidSum = (transactionsData || []).reduce((sum, t) => sum + Number(t.amount || 0), 0);
        setTotalPaid(paidSum);
      }

    } catch (err) {
      console.error("Error loading client portal data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  // دالة معالجة ورفع صورة كروكي الشقة وتحويلها لـ Base64 وحفظها بجدول المشاريع السحابي
  async function handlePlanUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("تنبيه: حجم الملف كبير جداً (الحد الأقصى 2 ميجا بايت) لتسريع الأداء.");
      return;
    }

    setUploadingPlan(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      try {
        const { error } = await supabase
          .from("projects")
          .update({ plan_url: base64Data })
          .eq("id", project?.id);

        if (error) throw error;

        setProject((prev: any) => prev ? { ...prev, plan_url: base64Data } : null);
        alert("✅ تم رفع كروكي الشقة ومزامنته بنجاح مع مهندسي المبيعات والتصميم بالشركة!");
      } catch (err: any) {
        alert("حدث خطأ أثناء رفع الكروكي: " + err.message);
      } finally {
        setUploadingPlan(false);
      }
    };
    reader.readAsDataURL(file);
  }

  const remainingDue = contractTotal - totalPaid;

  return (
    <main className="min-h-screen bg-[#020B1C] text-white p-4 md:p-8 font-alexandria" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8 text-right relative overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] rounded-full bg-[#D4AF37]/5 blur-[140px] pointer-events-none z-0" />
        
        {/* 🛠️ جدار الحماية البصري الموحد وتنسيق شريط التمرير المذهب ومنع التداخل نهائياً */}
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
        `}} />

        <div className="border-b border-[#D4AF37]/20 pb-5 flex justify-between items-center select-none z-10 relative">
          <div>
            <h1 className="text-x1 md:text-3xl font-black text-[#D4AF37] flex items-center gap-2">
              <span>بوابة العميل الرقمية المعتمدة</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-pulse" />
            </h1>
            <p className="text-white text-xs mt-2">مراقبة حية وتتبع إستراتيجي مالي وإنشائي حقيقي لمشروعك.</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="h-10 px-5 rounded-xl bg-transparent border border-red-500/40 text-red-500 hover:bg-red-600 hover:text-white transition duration-150 cursor-pointer text-xs font-bold"
          >
            ✕ تسجيل الخروج الآمن
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#D4AF37] animate-pulse text-xs font-bold flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" size={16} />
            <span>جاري جلب وتأمين ملفك الهندسي والمالي حياً...</span>
          </div>
        ) : project ? (
          <div className="space-y-8 animate-fade-in z-10 relative">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 select-none font-semibold text-xs md:text-sm">
              <div className="space-y-3">
                {/* 🌟 تم التحديث وتعديل كروت البيانات المزعجة والتالفة تباينياً إلى النسق الداكن المذهب الموحد بالبرنامج */}
                <div className="bg-[#020B1C] border border-[#D4AF37]/20 rounded-xl p-3 flex items-center justify-between gap-3 shadow-inner">
                  <span className="text-base select-none">👤</span>
                  <div className="text-left flex-1">
                    <p className="text-[#F0E6D2]/60 text-[8px] font-bold">اسم العميل</p>
                    <p className="font-bold text-[#F0E6D2] text-[11px]">{project.project_name || "جاري التحديد..."}</p>
                  </div>
                </div>
                <div className="bg-[#020B1C] border border-[#D4AF37]/20 rounded-xl p-3 flex items-center justify-between gap-3 shadow-inner">
                  <span className="text-base select-none">📏</span>
                  <div className="text-left flex-1">
                    <p className="text-[#F0E6D2]/60 text-[8px] font-bold">المساحة م²</p>
                    <p className="font-bold text-[#F0E6D2] text-[11px] font-mono">{project.area || "0"} م²</p>
                  </div>
                </div>
                <div className="bg-[#020B1C] border border-[#D4AF37]/20 rounded-xl p-3 flex items-center justify-between gap-3 shadow-inner">
                  <span className="text-base select-none">🥞</span>
                  <div className="text-left flex-1">
                    <p className="text-[#F0E6D2]/60 text-[8px] font-bold">مستوى التشطيب المعتمد</p>
                    <p className="font-bold text-[#F0E6D2] text-[11px]">{project.finishing_level || "قيد التحديد"}</p>
                  </div>
                </div>
                <div className="bg-[#020B1C] border border-[#D4AF37]/20 rounded-xl p-3 flex items-center justify-between gap-3 shadow-inner">
                  <span className="text-base select-none">🔑</span>
                  <div className="text-left flex-1">
                    <p className="text-[#F0E6D2]/60 text-[8px] font-bold">كود المشروع المرجعي</p>
                    <p className="font-bold text-[#F0E6D2] text-[11px] font-mono">{project.project_code || "QD-0000"}</p>
                  </div>
                </div>
              </div>

              {/* 🌟 تم التحديث وتعديل الكارت الأوسط للنسق الداكن المذهب والزوايا الإمبراطورية المتينة */}
              <div className="bg-[#020B1C] border-2 border-[#D4AF37]/20 rounded-[2rem] p-5 flex flex-col items-center justify-center text-center space-y-2 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-full blur-xl pointer-events-none" />
                <span className="text-2xl select-none z-10">🏢</span>
                <p className="text-[#D4AF37] font-bold text-[9px] uppercase z-10">بيانات وموقع المشروع</p>
                <p className="font-black text-white text-xs z-10">{project.project_name || "مشروع العميل السكني"}</p>
                <p className="text-gray-400 text-[10px] z-10">{project.location || "غير محدد"}</p>
                <p className="text-[#D4AF37] text-[9px] font-bold z-10">القاهرة</p>
              </div>

              <div className="space-y-3">
                <div className="bg-[#020B1C] border border-[#D4AF37]/20 rounded-xl p-3 flex items-center justify-between gap-3 shadow-inner">
                  <span className="text-base select-none">📅</span>
                  <div className="text-left flex-1">
                    <p className="text-[#F0E6D2]/60 text-[8px] font-bold">تاريخ التعاقد والبدء</p>
                    <p className="font-bold text-[#F0E6D2] text-[11px] font-mono">{project.start_date || "-"}</p>
                  </div>
                </div>
                <div className="bg-[#020B1C] border border-[#D4AF37]/20 rounded-xl p-3 flex items-center justify-between gap-3 shadow-inner">
                  <span className="text-base select-none">＃</span>
                  <div className="text-left flex-1">
                    <p className="text-[#F0E6D2]/60 text-[8px] font-bold">كود المقايسة التعاقدية</p>
                    <p className="font-bold text-[#F0E6D2] text-[11px] font-mono">{estimateNumber}</p>
                  </div>
                </div>
                <div className="bg-[#020B1C] border border-[#D4AF37]/20 rounded-xl p-3 flex items-center justify-between gap-3 shadow-inner">
                  <span className="text-base select-none">🏠</span>
                  <div className="text-left flex-1">
                    <p className="text-[#F0E6D2]/60 text-[8px] font-bold">نوع الوحدة السكنية</p>
                    <p className="font-bold text-[#F0E6D2] text-[11px]">{project.unit_type || "شقة سكنية"}</p>
                  </div>
                </div>
                <div className="bg-[#020B1C] border border-[#D4AF37]/20 rounded-xl p-3 flex items-center justify-between gap-3 shadow-inner">
                  <span className="text-base select-none">🏗️</span>
                  <div className="text-left flex-1">
                    <p className="text-[#F0E6D2]/60 text-[8px] font-bold">حالة الوحدة عند الاستلام</p>
                    <p className="font-bold text-[#F0E6D2] text-[11px]">{project.unit_status || "بدون تشطيب (على الطوب)"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#07132a] border-2 border-[#D4AF37]/20 rounded-[2rem] p-6 shadow-xl space-y-3 select-none">
              <p className="text-[#D4AF37] text-xs font-bold flex items-center gap-1.5">📈 نسبة الإنجاز الهندسي والإداري الفعلي بالموقع حالياً</p>
              <div className="flex items-center gap-4">
                <div className="w-full bg-black h-4 rounded-full overflow-hidden p-0.5 border border-[#243556]">
                  <div
                    className="bg-[#D4AF37] h-full rounded-full transition-all duration-500 shadow-[0_0_12px_#D4AF37]"
                    style={{ width: `${project.progress_percentage || 0}%` }}
                  />
                </div>
                <span className="font-mono text-base font-bold text-[#D4AF37]">{project.progress_percentage || 0}%</span>
              </div>
            </div>

            {/* ترقية زوايا كارت النموذج ثلاثي الأبعاد */}
            <div className="bg-[#07132a] border-2 border-[#D4AF37]/20 rounded-[2rem] p-6 shadow-2xl space-y-4">
              <h3 className="text-[#F0E6D2] text-sm md:text-base font-black flex items-center gap-2 select-none border-b border-[#D4AF37]/15 pb-3">
                <Compass className="text-[#D4AF37]" size={20} />
                استعراض النموذج ثلاثي الأبعاد وتوزيع الفراغات والأثاث (3D View Panel)
              </h3>
              {project.design_embed_url ? (
                <div className="relative w-full h-[450px] rounded-2xl overflow-hidden border border-[#1f2d4d] bg-black shadow-2xl">
                  <iframe
                    src={project.design_embed_url}
                    title="3D Design View"
                    className="absolute inset-0 w-full h-full border-0"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="h-[380px] bg-[#020B1C]/50 border-2 border-dashed border-[#243556] rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-3 select-none">
                  <Compass className="text-gray-600 animate-spin" size={40} />
                  <h4 className="text-[#F0E6D2] font-extrabold text-base">جاري مراجعة وإخراج مجسم وحدتك التفاعلي</h4>
                  <p className="text-gray-500 text-xs max-w-md leading-relaxed">يعمل مهندسو الديكور لدينا حالياً على معالجة الرفع المساحي وإخراج لوحة التوزيع التفاعلية الخاصة بك حركياً. سيظهر هنا فور اعتماده وتأكيده هندسياً.</p>
                </div>
              )}
            </div>

            {/* الأرصدة المالية الكبرى للبوابة */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 select-none font-semibold text-xs md:text-sm">
              <div className="p-5 rounded-[2rem] bg-[#07132a] border border-[#D4AF37]/20 flex flex-col justify-between shadow-xl">
                <div className="flex justify-between items-start">
                  <span className="text-2xl">📜</span>
                  <span className="bg-blue-500/10 text-blue-400 text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-blue-500/25">قيمة العقد</span>
                </div>
                <div className="mt-5 text-right">
                  <p className="text-gray-400 text-xs font-bold">إجمالي القيمة المالية للتعاقد</p>
                  <h3 className="text-white text-xl font-black mt-1 font-mono">{contractTotal.toLocaleString('en-US')} ج.م</h3>
                </div>
              </div>

              <div className="p-5 rounded-[2rem] bg-[#07132a] border border-[#D4AF37]/20 flex flex-col justify-between shadow-xl">
                <div className="flex justify-between items-start">
                  <span className="text-2xl">💵</span>
                  <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/25">المسدد لشركتنا</span>
                </div>
                <div className="mt-5 text-right">
                  <p className="text-gray-400 text-xs font-bold">إجمالي الدفعات المسددة للشركة حياً</p>
                  <h3 className="text-emerald-400 text-xl font-black mt-1 font-mono">+{totalPaid.toLocaleString('en-US')} ج.م</h3>
                </div>
              </div>

              <div className="p-5 rounded-[2rem] bg-[#07132a] border-2 border-[#D4AF37] flex flex-col justify-between shadow-xl">
                <div className="flex justify-between items-start">
                  <span className="text-2xl">💰</span>
                  <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-[#D4AF37]/20">متبقي عليك</span>
                </div>
                <div className="mt-5 text-right">
                  <p className="text-gray-400 text-xs font-bold">إجمالي المتبقي طرف العميل</p>
                  <h3 className="text-[#D4AF37] text-xl font-black mt-1 font-mono">{remainingDue.toLocaleString('en-US')} ج.م</h3>
                </div>
              </div>
            </div>

            {/* صف التفاعل الثنائي بين المستندات ورفع الكروكي الفوري لربط السيلز */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-[#07132a] border-2 border-[#D4AF37]/20 rounded-[2rem] p-6 shadow-xl space-y-4 select-none">
                <h3 className="text-[#F0E6D2] text-sm md:text-base font-black border-b border-[#D4AF37]/15 pb-3 flex items-center gap-2">
                  <FileText className="text-[#D4AF37]" size={18} />
                  <span>📁 خزانة المستندات والتعاقدات المعتمدة للموقع</span>
                </h3>
                <div className="grid grid-cols-1 gap-4 font-semibold text-xs md:text-sm">
                  <div className="bg-[#020B1C] border border-[#D4AF37]/15 rounded-xl p-4 flex justify-between items-center">
                    <div className="text-right">
                      <p className="text-white text-xs font-bold">عقد تشطيب وديكور موقع العمل الموثق</p>
                      <p className="text-gray-500 text-[10px] mt-1 font-mono">تاريخ التوقيع: {project.start_date || "-"}</p>
                    </div>
                    <span className="text-emerald-400 text-xs font-bold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">✓ معتمد وموثق</span>
                  </div>

                  <div className="bg-[#020B1C] border border-[#D4AF37]/15 rounded-xl p-4 flex justify-between items-center">
                    <div className="text-right">
                      <p className="text-white text-xs font-bold">مقايسة أعمال التشطيب الفنية الـ BOQ</p>
                      <p className="text-gray-500 text-[10px] mt-1 font-mono">الرقم المرجعي: {estimateNumber}</p>
                    </div>
                    {/* 🌟 ترقية وتنسيق زر تحميل المقايسة الـ PDF للدستور البصري الحركي الموحد */}
                    <button
                      type="button" 
                      onClick={() => router.push("/estimates")} 
                      className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.15)] hover:shadow-[0_0_20px_rgba(212,175,55,0.35)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer text-xs font-black relative overflow-hidden"
                    >
                      <span>📥 تحميل المقايسة PDF</span>
                      <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_4px_rgba(212,175,55,0.8)]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* بطاقة رفع الكروكي ومزامنته للـ CRM وموظفي المبيعات */}
              <div className="bg-[#07132a] border-2 border-dashed border-[#D4AF37]/30 rounded-[2rem] p-6 shadow-xl space-y-4">
                <h3 className="text-[#F0E6D2] text-sm md:text-base font-black border-b border-[#243556]/50 pb-3 flex items-center gap-2 select-none">
                  <Upload className="text-[#D4AF37]" size={18} />
                  <span>📐 إرسال وإرفاق كروكي / مخطط الشقة الفوري</span>
                </h3>
                <div className="flex flex-col items-center justify-center p-4 bg-[#020B1C] border border-[#1f2d4d] rounded-xl relative font-semibold text-xs md:text-sm">
                  <input
                    type="file"
                    accept="image/*"
                    id="client-plan-upload"
                    onChange={handlePlanUpload}
                    className="hidden"
                    disabled={uploadingPlan}
                  />
                  {project.plan_url ? (
                    <div className="space-y-3 flex flex-col items-center select-none">
                      <img src={project.plan_url} alt="Uploaded Plan" className="max-h-24 rounded-lg border border-[#D4AF37]/20 shadow-md" />
                      <div className="flex gap-2">
                        <label htmlFor="client-plan-upload" className="text-[10px] bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold px-3 py-1.5 rounded-lg cursor-pointer transition">🔄 استبدال المخطط</label>
                        <a href={project.plan_url} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-[#07132a] border border-[#1f2d4d] text-white px-3 py-1.5 rounded-lg hover:underline font-bold">👁️ معاينة الحجم الكامل</a>
                      </div>
                    </div>
                  ) : (
                    <label htmlFor="client-plan-upload" className="flex flex-col items-center justify-center cursor-pointer space-y-2 text-gray-400 hover:text-[#F0E6D2] transition select-none">
                      <span className="text-3xl select-none">📷</span>
                      <span className="text-xs font-bold">{uploadingPlan ? "جاري رفع ومزامنة الملف..." : "اضغط هنا لرفع كروكي الشقة"}</span>
                      <span className="text-[9px] text-gray-500 font-bold">يدعم رفع صور الكروكي المرسوم باليد أو المخطط المعماري</span>
                    </label>
                  )}
                </div>
              </div>

            </div>

          </div>
        ) : (
          <div className="mt-12 p-12 border-2 border-dashed border-[#D4AF37]/25 rounded-[2rem] text-center select-none bg-[#07132a]">
            <p className="text-[#D4AF37] text-lg font-bold mb-2">مرحباً بك في بوابة جولدن ديكوريشن </p>
            <p className="text-gray-400 text-sm">عذراً، لا توجد مشاريع تشطيب نشطة مرتبطة بحسابك حالياً في قاعدة البيانات. يرجى التواصل مع إدارة الشركة للتفعيل.</p>
          </div>
        )}

      </div>
    </main>
  );
}