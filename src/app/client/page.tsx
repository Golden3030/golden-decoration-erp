"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { Lock, CheckCircle, ExternalLink, Loader2, Compass, DollarSign, FileText, Upload } from "lucide-react";

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
    <main className="min-h-screen bg-[#020B1C] text-white p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8 text-right">
        
        <div className="border-b border-[#243556] pb-5 flex justify-between items-center select-none">
          <div>
            <h1 className="text-3xl font-black text-[#F0E6D2] leading-tight">بوابة العميل الرقمية المعتمدة</h1>
            <p className="text-gray-400 text-xs mt-1.5">مراقبة حية وتتبع إستراتيجي مالي وإنشائي حقيقي لمشروعك.</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-transparent border border-red-500 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition duration-150"
          >
            ✕ تسجيل الخروج الآمن
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500 text-xs animate-pulse">جاري جلب وتأمين ملفك الهندسي والمالي حياً...</div>
        ) : project ? (
          <div className="space-y-8 animate-fade-in">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 select-none">
              <div className="space-y-3">
                <div className="bg-[#FDFBF7] border border-[#D4AF37]/20 rounded-xl p-2.5 flex items-center justify-between gap-3">
                  <span className="text-base select-none">👤</span>
                  <div className="text-left flex-1">
                    <p className="text-gray-400 text-[8px] font-bold">اسم العميل</p>
                    <p className="font-bold text-black text-[11px]">{project.project_name || "جاري التحديد..."}</p>
                  </div>
                </div>
                <div className="bg-[#FDFBF7] border border-[#D4AF37]/20 rounded-xl p-2.5 flex items-center justify-between gap-3">
                  <span className="text-base select-none">📏</span>
                  <div className="text-left flex-1">
                    <p className="text-gray-400 text-[8px] font-bold">المساحة م²</p>
                    <p className="font-bold text-black text-[11px] font-mono">{project.area || "0"} م²</p>
                  </div>
                </div>
                <div className="bg-[#FDFBF7] border border-[#D4AF37]/20 rounded-xl p-2.5 flex items-center justify-between gap-3">
                  <span className="text-base select-none">🥞</span>
                  <div className="text-left flex-1">
                    <p className="text-gray-400 text-[8px] font-bold">مستوى التشطيب المعتمد</p>
                    <p className="font-bold text-black text-[11px]">{project.finishing_level || "قيد التحديد"}</p>
                  </div>
                </div>
                <div className="bg-[#FDFBF7] border border-[#D4AF37]/20 rounded-xl p-2.5 flex items-center justify-between gap-3">
                  <span className="text-base select-none">🔑</span>
                  <div className="text-left flex-1">
                    <p className="text-gray-400 text-[8px] font-bold">كود المشروع المرجعي</p>
                    <p className="font-bold text-black text-[11px] font-mono">{project.project_code || "QD-0000"}</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#FDFBF7] border border-[#D4AF37]/30 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2">
                <span className="text-2xl select-none">🏢</span>
                <p className="text-[#8b6f2a] font-bold text-[9px]">بيانات وموقع المشروع</p>
                <p className="font-black text-black text-xs">{project.project_name || "مشروع العميل السكني"}</p>
                <p className="text-gray-600 text-[10px]">{project.location || "غير محدد"}</p>
                <p className="text-gray-500 text-[9px]">القاهرة</p>
              </div>

              <div className="space-y-3">
                <div className="bg-[#FDFBF7] border border-[#D4AF37]/20 rounded-xl p-2.5 flex items-center justify-between gap-3">
                  <span className="text-base select-none">📅</span>
                  <div className="text-left flex-1">
                    <p className="text-gray-400 text-[8px] font-bold">تاريخ التعاقد والبدء</p>
                    <p className="font-bold text-black text-[11px] font-mono">{project.start_date || "-"}</p>
                  </div>
                </div>
                <div className="bg-[#FDFBF7] border border-[#D4AF37]/20 rounded-xl p-2.5 flex items-center justify-between gap-3">
                  <span className="text-base select-none">＃</span>
                  <div className="text-left flex-1">
                    <p className="text-gray-400 text-[8px] font-bold">كود المقايسة التعاقدية</p>
                    <p className="font-bold text-black text-[11px] font-mono">{estimateNumber}</p>
                  </div>
                </div>
                <div className="bg-[#FDFBF7] border border-[#D4AF37]/20 rounded-xl p-2.5 flex items-center justify-between gap-3">
                  <span className="text-base select-none">🏠</span>
                  <div className="text-left flex-1">
                    <p className="text-gray-400 text-[8px] font-bold">نوع الوحدة السكنية</p>
                    <p className="font-bold text-black text-[11px]">{project.unit_type || "شقة سكنية"}</p>
                  </div>
                </div>
                <div className="bg-[#FDFBF7] border border-[#D4AF37]/20 rounded-xl p-2.5 flex items-center justify-between gap-3">
                  <span className="text-base select-none">🏗️</span>
                  <div className="text-left flex-1">
                    <p className="text-gray-400 text-[8px] font-bold">حالة الوحدة عند الاستلام</p>
                    <p className="font-bold text-black text-[11px]">{project.unit_status || "بدون تشطيب (على الطوب)"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#07132a] border border-[#1f2d4d] rounded-2xl p-6 shadow-xl space-y-3 select-none">
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

            <div className="bg-[#07132a] border-2 border-[#D4AF37] rounded-3xl p-6 shadow-2xl space-y-4">
              <h3 className="text-[#F0E6D2] text-lg font-bold flex items-center gap-2 select-none">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 select-none">
              <div className="p-5 rounded-2xl bg-[#07132a] border border-[#1f2d4d] flex flex-col justify-between shadow-xl">
                <div className="flex justify-between items-start">
                  <span className="text-2xl">📜</span>
                  <span className="bg-blue-500/10 text-blue-400 text-[10px] px-2.5 py-0.5 rounded-full font-bold">قيمة العقد</span>
                </div>
                <div className="mt-5 text-right">
                  <p className="text-gray-400 text-xs font-bold">إجمالي القيمة المالية للتعاقد</p>
                  <h3 className="text-white text-xl font-black mt-1 font-mono">{contractTotal.toLocaleString('en-US')} ج.م</h3>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#07132a] border border-[#1f2d4d] flex flex-col justify-between shadow-xl">
                <div className="flex justify-between items-start">
                  <span className="text-2xl">💵</span>
                  <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2.5 py-0.5 rounded-full font-bold">المسدد لشركتنا</span>
                </div>
                <div className="mt-5 text-right">
                  <p className="text-gray-400 text-xs font-bold">إجمالي الدفعات المسددة للشركة حياً</p>
                  <h3 className="text-emerald-400 text-xl font-black mt-1 font-mono">+{totalPaid.toLocaleString('en-US')} ج.م</h3>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#07132a] border-2 border-[#D4AF37] flex flex-col justify-between shadow-xl">
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
              
              <div className="bg-[#07132a] border border-[#1f2d4d] rounded-2xl p-6 shadow-xl space-y-4 select-none">
                <h3 className="text-[#F0E6D2] text-lg font-bold border-b border-[#243556] pb-3 flex items-center gap-2">
                  <FileText className="text-[#D4AF37]" size={18} />
                  📁 خزانة المستندات والتعاقدات المعتمدة للموقع
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-[#020B1C] border border-[#1f2d4d] rounded-xl p-4 flex justify-between items-center">
                    <div className="text-right">
                      <p className="text-white text-xs font-bold">عقد تشطيب وديكور موقع العمل الموثق</p>
                      <p className="text-gray-500 text-[10px] mt-1 font-mono">تاريخ التوقيع: {project.start_date || "-"}</p>
                    </div>
                    <span className="text-emerald-400 text-xs font-bold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">✓ معتمد وموثق</span>
                  </div>

                  <div className="bg-[#020B1C] border border-[#1f2d4d] rounded-xl p-4 flex justify-between items-center">
                    <div className="text-right">
                      <p className="text-white text-xs font-bold">مقايسة أعمال التشطيب الفنية الـ BOQ</p>
                      <p className="text-gray-500 text-[10px] mt-1 font-mono">الرقم المرجعي: {estimateNumber}</p>
                    </div>
                    <button
                      onClick={() => router.push("/estimates")} 
                      className="bg-transparent border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5"
                    >
                      📥 تحميل المقايسة PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* بطاقة رفع الكروكي ومزامنته للـ CRM وموظفي المبيعات */}
              <div className="bg-[#07132a] border-2 border-dashed border-[#D4AF37]/30 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-[#F0E6D2] text-lg font-bold border-b border-[#243556]/50 pb-3 flex items-center gap-2 select-none">
                  <Upload className="text-[#D4AF37]" size={18} />
                  📐 إرسال وإرفاق كروكي / مخطط الشقة الفوري
                </h3>
                <div className="flex flex-col items-center justify-center p-4 bg-[#020B1C] border border-[#1f2d4d] rounded-xl relative">
                  <input
                    type="file"
                    accept="image/*"
                    id="client-plan-upload"
                    onChange={handlePlanUpload}
                    className="hidden"
                    disabled={uploadingPlan}
                  />
                  {project.plan_url ? (
                    <div className="space-y-3 flex flex-col items-center">
                      <img src={project.plan_url} alt="Uploaded Plan" className="max-h-24 rounded-lg border border-[#D4AF37]/20 shadow-md" />
                      <div className="flex gap-2">
                        <label htmlFor="client-plan-upload" className="text-[10px] bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold px-3 py-1.5 rounded-lg cursor-pointer transition">🔄 استبدال المخطط</label>
                        <a href={project.plan_url} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-[#07132a] border border-[#1f2d4d] text-white px-3 py-1.5 rounded-lg hover:underline font-bold">👁️ معاينة الحجم الكامل</a>
                      </div>
                    </div>
                  ) : (
                    <label htmlFor="client-plan-upload" className="flex flex-col items-center justify-center cursor-pointer space-y-2 text-gray-400 hover:text-[#F0E6D2] transition">
                      <span className="text-3xl select-none">📷</span>
                      <span className="text-xs font-bold">{uploadingPlan ? "جاري رفع ومزامنة الملف..." : "اضغط هنا لرفع كروكي الشقة"}</span>
                      <span className="text-[9px] text-gray-500">يدعم رفع صور الكروكي المرسوم باليد أو المخطط المعماري</span>
                    </label>
                  )}
                </div>
              </div>

            </div>

          </div>
        ) : (
          <div className="mt-12 p-12 border-2 border-dashed border-[#1f2d4d] rounded-2xl text-center select-none bg-[#07132a]">
            <p className="text-[#F0E6D2] text-lg font-bold mb-2">مرحباً بك في بوابة غولدن ديكوريشن السحابية</p>
            <p className="text-gray-400 text-sm">عذراً، لا توجد مشاريع تشطيب نشطة مرتبطة بحسابك حالياً في قاعدة البيانات. يرجى التواصل مع إدارة الشركة للتفعيل.</p>
          </div>
        )}

      </div>
    </main>
  );
}