"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";
import { 
  ClipboardList, 
  User, 
  Phone, 
  MapPin, 
  Sparkles, 
  Loader2, 
  ArrowLeftRight,
  Lock,
  TrendingUp,
  X,
  Calendar
} from "lucide-react";

// قاموس الصلاحيات والأدوار المعتمد لهيكل الشركة
const ROLE_LABELS: Record<string, string> = {
  admin: "مدير النظام 👑",
  manager: "مدير الحسابات والتشغيل 💵",
  sales_manager: "مدير مبيعات (CRM) 📊",
};

// دالة توليد كود العميل التلقائي التالي
function generateNextCustomerCode(existingCustomers: any[]): string {
  const numbers = existingCustomers
    .map((c: any) => {
      const codeStr = String(c.customer_code || "");
      const match = codeStr.match(/\d+/);
      return match ? parseInt(match[0], 10) : null;
    })
    .filter((num): num is number => num !== null);

  const maxCode = numbers.length > 0 ? Math.max(...numbers) : 1000;
  return `CUST-${maxCode + 1}`;
}

// دالة معالجة واستخراج الأسعار التقديرية
const getEstimatedCosts = (item: any) => {
  if (!item) return { min: 0, max: 0 };
  if (item.estimated_cost_min && item.estimated_cost_max) {
    return { min: Number(item.estimated_cost_min), max: Number(item.estimated_cost_max) };
  }
  if (item.estimatedMin && item.estimatedMax) {
    return { min: Number(item.estimatedMin), max: Number(item.estimatedMax) };
  }
  
  const notesStr = item.notes || "";
  const minMatch = notesStr.match(/من\s+([\d,]+)/);
  const maxMatch = notesStr.match(/إلى\s+([\d,]+)/);
  if (minMatch && maxMatch) {
    return {
      min: parseInt(minMatch[1].replace(/,/g, ""), 10),
      max: parseInt(maxMatch[1].replace(/,/g, ""), 10)
    };
  }

  const rateMap: Record<string, number> = { "اقتصادي (لوكس)": 3500, "سوبر لوكس": 5500, "ألترا لوكس": 8500 };
  const level = item.finishing_level || "سوبر لوكس";
  const rate = rateMap[level] || 5500;
  const base = Number(item.area || 0) * rate;
  return { min: Math.round(base * 0.95), max: Math.round(base * 1.05) };
};

const formatNumber = (num: number) => num.toLocaleString("en-US");

export default function CustomerRequestsPage() {
  const router = useRouter();

  // حالات تخزين طلبات الحملة الإعلانية حياً من سوبابيز
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // التحقق من دور المستخدم الحالي (الصفحة مقصورة على admin و sales_manager و manager)
  const [userRole, setUserRole] = useState<string>("sales");
  const [checkingAccess, setCheckingAccess] = useState<boolean>(true);

  // قائمة موظفي المبيعات لاختيار المسؤول وقت ترقية الـ Lead
  const [salesStaff, setSalesStaff] = useState<any[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<string>("");

  const isOperationalStaff = userRole === "admin" || userRole === "sales_manager" || userRole === "manager";

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  async function checkAccessAndLoad() {
    setCheckingAccess(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCheckingAccess(false);
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      const role = profile?.role || "";
      setUserRole(role);

      if (role === "admin" || role === "sales_manager" || role === "manager") {
        await loadCustomerRequests();

        const { data: staffData } = await supabase
          .from("users")
          .select("id, name")
          .eq("role", "sales");
        setSalesStaff(staffData || []);
      }
    } catch (err) {
      console.error("Error checking access:", err);
    } finally {
      setCheckingAccess(false);
    }
  }

  async function loadCustomerRequests() {
    setLoading(true);
    try {
      document.title = "طلبات عملاء احسب تكلفة شقتك من موبايلك | Golden Decoration";

      const { data, error } = await supabase
        .from("customer_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      console.error("Error loading customer requests:", err);
    } finally {
      setLoading(false);
    }
  }

  // دالة ترقية وتحويل الطلب البارد إلى عميل مع التعديل السحابي وتاريخ بدء المشروع
  async function handleConvertToCRM() {
    if (!selectedRequest?.id) {
      alert("يرجى تحديد طلب العميل المراد تحويله من الجدول بالأعلى أولاً.");
      return;
    }

    const currentStatus = String(selectedRequest.status || "");
    if (currentStatus === "تم التحويل لعميل" || currentStatus.startsWith("تم تحويل")) {
      alert("⚠️ هذا العميل تم تحويله وحفظة مسبقاً لجدول الـ CRM وهو نشط حالياً.");
      return;
    }

    if (!selectedAssignee) {
      alert("يرجى اختيار موظف المبيعات المسؤول عن هذا العميل .");
      return;
    }

    setActionLoading(true);
    try {
      // 1. جلب أكواد العملاء الحالية لتوليد الكود التالي
      const { data: existingCustomers, error: custErr } = await supabase
        .from("customers")
        .select("customer_code");

      if (custErr) throw custErr;
      const nextCustomerCode = generateNextCustomerCode(existingCustomers || []);

      // 2. استدعاء العملية المحدثة في قاعدة البيانات بالـ 6 متغيرات الأصلية تلافياً لانهيار الـ Schema [1]
      const { error: rpcError } = await supabase.rpc("convert_request_to_customer", {
        p_request_id: selectedRequest.id,
        p_customer_code: nextCustomerCode,
        p_name: selectedRequest.name,
        p_mobile: selectedRequest.phone,
        p_address: selectedRequest.region,
        p_assigned_to: selectedAssignee
      });

      if (rpcError) throw rpcError;

      // 🌟 جلب اسم السيلز المختار لصياغة الحالة الجديدة بالجريل
      const salesRepName = salesStaff.find(s => s.id === selectedAssignee)?.name || "السيلز";
      const customStatusText = `تم تحويل العميل لـ ${salesRepName}`;

      // 🌟 تحديث حالة الطلب حيوياً بجدول طلبات الحاسبة لعرضها زمردية مذهلة
      await supabase
        .from("customer_requests")
        .update({ status: customStatusText })
        .eq("id", selectedRequest.id);

      // 🌟 3. مديول الاستشفاء الذاتي السحابي: سحب معرّف العميل الجديد وتحديث تاريخ بدء المشروع تلقائياً
      if (selectedRequest.execution_date) {
        const { data: newCust } = await supabase
          .from("customers")
          .select("id")
          .eq("customer_code", nextCustomerCode)
          .single();

        if (newCust) {
          // تحديث تاريخ البدء المتوقع بجدول المشاريع حركياً بالخلفية
          await supabase
            .from("projects")
            .update({ start_date: selectedRequest.execution_date })
            .eq("customer_id", newCust.id);
        }
      }

      // 4. إرسال إشعار فوري للنظام
      await supabase.from("notifications").insert({
        title: "ترقية عميل إعلانات إلى CRM",
        message: `✅ تم بنجاح تحويل العميل المحتمل: ${selectedRequest.name} وإسناده لـ (${salesRepName}).`,
        type: "sales",
        link: "/customers"
      });

      alert(`✅ تم بنجاح ترقية ومزامنة بيانات العميل وتاريخ التنفيذ وإسناده لـ (${salesRepName})!`);
      clearSelection();
      await loadCustomerRequests();

    } catch (err: any) {
      alert("فشل تحويل العميل: " + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  function selectRequestRow(item: any) {
    setSelectedRequest(item);
    setSelectedAssignee("");
  }

  function clearSelection() {
    setSelectedRequest(null);
    setSelectedAssignee("");
  }

  if (checkingAccess) {
    return (
      <main className="min-h-screen bg-[#020B1C] relative overflow-hidden" dir="rtl">
        <Sidebar />
        <section className="w-full lg:pr-56 min-h-screen flex flex-col">
          <Header />
          <div className="p-12 text-center text-[#D4AF37] font-black text-lg animate-pulse flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" size={24} />
            <span>جاري تحميل البيانات الإدارية وسحب سجلات الـ CRM...</span>
          </div>
        </section>
      </main>
    );
  }

  // جدار حماية الرتب غير المصرح لها
  if (!isOperationalStaff) {
    return (
      <main className="min-h-screen bg-[#020B1C] flex items-center justify-center text-right p-8" dir="rtl">
        <div className="max-w-md w-full bg-[#07132a] border border-[#D4AF37]/40 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden animate-in zoom-in duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#D4AF37]/10 to-transparent rounded-full blur-xl pointer-events-none" />
          <Lock className="text-[#D4AF37] mx-auto mb-4 animate-pulse" size={56} />
          <h3 className="font-black text-[#D4AF37] text-xl mb-2">منطقة أمنية محظورة 🔒</h3>
          <p className="text-gray-300 text-xs leading-relaxed font-bold">
            عذراً؛ هذه الشاشة مقصورة حصرياً على مدير عام الشركة ومدير المبيعات المسؤول لمراقبة الحملة الإعلانية وتوزيع العملاء.
          </p>
          <button 
            type="button"
            onClick={() => router.push("/dashboard")} 
            className="mt-6 w-full bg-gradient-to-r from-[#D4AF37] to-[#F0E6D2] text-[#020B1C] font-black py-3 rounded-xl shadow-2xl text-xs cursor-pointer"
          >
            العودة للرئيسية
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020B1C] relative overflow-hidden font-alexandria" dir="rtl">
      
      {/* 🌟 هيدر الهيكل لمنع وميض وتأخر تحميل الخط البصري FOUT على مستوى المتصفح */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* هالة تلميحات الإضاءة الخلفية الدافئة تتدفق ببطء خلف الكروت */}
      <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] rounded-full bg-[#D4AF37]/5 blur-[140px] pointer-events-none z-0" />

      {/* 🛠️ جدار الحماية البصري الموحد وتثبيت التمرير */}
      <style dangerouslySetInnerHTML={{ __html: `
        ::-webkit-scrollbar { width: 8px !important; height: 8px !important; }
        ::-webkit-scrollbar-track { background: #020B1C !important; }
        ::-webkit-scrollbar-thumb { background: #D4AF37 !important; border-radius: 9999px !important; }
        
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

        .overflow-x-auto::-webkit-scrollbar { display: none !important; height: 0px !important; }
        .overflow-x-auto { scrollbar-width: none !important; overflow-x: auto !important; }

        th, td, h1, h2, h3, h4, h5, h6, span, p, button, label, input, select, textarea {
          font-family: 'Alexandria', Arial, sans-serif !important;
          letter-spacing: normal !important;
        }

        thead th, th {
          font-size: 0.8rem !important;
          font-weight: 900 !important;
          color: #D4AF37 !important;
          text-align: right !important;
          border-bottom: 2px solid rgba(212, 175, 55, 0.2) !important;
          background-color: #050914 !important;
          padding: 12px 14px !important;
        }

        tbody td, td {
          font-size: 0.75rem !important;
          font-weight: 700 !important;
          color: #F0E6D2 !important;
          text-align: right !important;
          border-bottom: 1px solid rgba(212, 175, 55, 0.15) !important;
          padding: 12px 14px !important;
        }

        .glass-price-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%) !important;
          border: 1px solid rgba(212, 175, 55, 0.45) !important;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.18) !important;
        }
      `}} />

      <Sidebar />
      <section className="w-full lg:pr-56 min-h-screen flex flex-col z-10 relative animate-fade-in">
        <Header />
        <div className="p-4 md:p-8 space-y-6 text-right select-none">
          
          {/* الترويسة المحدثة بضم شارة عرض الصلاحية الديناميكية الفخمة */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[#D4AF37] flex items-center gap-2 select-none">
                <span>طلبات المعاينة وحصر ليدات الحملة الإعلانية (Leads Queue)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-pulse" />
              </h1>
              <p className="text-white text-xs mt-2">مراقبة وفحص طلبات المقايسات المبدئية الواردة من حاسبة السوشيال ميديا وترقيتها للـ CRM.</p>
            </div>

            {/* شارة عرض الصلاحية النشطة للمستخدم الإداري */}
            {userRole && ROLE_LABELS[userRole] && (
              <div className="flex-shrink-0 bg-[#D4AF37]/10 border border-[#D4AF37]/35 text-[#D4AF37] px-4 py-2 rounded-xl text-xs font-black shadow-lg flex items-center gap-2 select-none">
                <span>صلاحيتك النشطة:</span>
                <span className="text-white bg-black/60 px-2.5 py-0.5 rounded-lg border border-white/5 font-mono">{ROLE_LABELS[userRole]}</span>
              </div>
            )}
          </div>

          {/* 1. جدول عرض طلبات الإعلانات الحالية */}
          <div className="bg-[#07132a] border border-[#D4AF37] rounded-2xl overflow-hidden shadow-2xl flex flex-col relative w-full">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
            
            <div className="p-4 border-b border-[#D4AF37]/20 bg-[#0b1b3d]/60">
              <h3 className="text-[#D4AF37] font-black text-xs md:text-sm flex items-center gap-2">
                <ClipboardList size={18} />
                <span>العملاء الواردة من حاسبة الموقع ({requests.length})</span>
              </h3>
            </div>
            
            <div className="overflow-x-auto max-h-[240px] overflow-y-auto">
              {loading ? (
                <div className="p-12 text-center text-[#D4AF37] font-black text-ms animate-pulse flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={16} />
                  <span>جاري جلب وقراءة الطلبات من قاعدة البيانات...</span>
                </div>
              ) : requests.length > 0 ? (
                <table className="w-full text-right table-auto">
                  <thead>
                    <tr className="whitespace-nowrap select-none">
                      <th>اسم العميل</th>
                      <th>رقم الموبايل</th>
                      <th>المساحة م²</th>
                      <th>مستوى التشطيب</th>
                      <th>المنطقة</th>
                      <th>تاريخ التسجيل</th>
                      <th>النطاق السعري التقديري</th>
                      <th className="text-center">حالة الطلب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D4AF37]/15">
                    {requests.map((r) => {
                      const costs = getEstimatedCosts(r);
                      const isConverted = String(r.status || "").includes("تم تحويل") || r.status === "تم التحويل لعميل";
                      return (
                        <tr
                          key={r.id}
                          onClick={() => selectRequestRow(r)}
                          className={`hover:bg-[#0b1b3d]/60 cursor-pointer whitespace-nowrap transition-all duration-200 ${
                            selectedRequest?.id === r.id ? "bg-[#0b1b3d] border-r-4 border-r-[#D4AF37]" : ""
                          }`}
                        >
                          <td className="font-black text-slate-100">{r.name}</td>
                          <td className="font-mono text-slate-200 font-extrabold">{r.phone}</td>
                          <td className="font-mono font-black text-[#D4AF37]">{r.area} م²</td>
                          <td className="text-slate-300 font-bold">{r.finishing_level}</td>
                          <td className="text-slate-300 font-bold">{r.region}</td>
                          <td className="text-slate-300 font-bold">{r.execution_date || "غير محدد"}</td>
                          <td className="font-mono font-black text-[#D4AF37]">
                            من {formatNumber(costs.min)} إلى {formatNumber(costs.max)} ج.م
                          </td>
                          <td className="text-center">
                            {/* شارة حالة الطلب: تظهر زمردية متوهجة عند ترقية العميل وتعيين السيلز */}
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                              isConverted ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}>{r.status || "جديد"}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-slate-400 font-bold text-xs">لا توجد طلبات واردة من حاسبة الإعلانات حالياً بقاعدة البيانات.</div>
              )}
            </div>
          </div>

          {/* 🌟 2. تفاصيل وبيانات طلب العميل المحتمل (تمت إعادة هندسته وتصميمه بالكامل ليطابق كروت الـ CRM) */}
          {selectedRequest && (
            <div className="bg-[#07132a] border border-[#D4AF37] rounded-[2rem] p-6 space-y-5 shadow-2xl relative overflow-hidden w-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
              
              {/* ترويسة الكارت الفاخرة بالذهب الإمبراطوري #D4AF37 وأيقونة مذهبة */}
              <h3 className="text-[#D4AF37] text-sm md:text-base font-black border-b border-[#D4AF37]/15 pb-3 flex items-center gap-2 select-none">
                <Sparkles className="w-5 h-5 text-[#D4AF37] shrink-0 animate-pulse" />
                <span>مراجعة وتخصيص تفاصيل طلب العميل المحتمل</span>
              </h3>

              <div className="grid grid-cols-2 gap-4 text-xs">
                {/* الاسم بالكامل */}
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px]">الاسم بالكامل (أوتوماتيكي)</label>
                  <input
                    type="text"
                    disabled
                    value={selectedRequest.name || ""}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-4 outline-none font-semibold text-xs opacity-80"
                  />
                </div>

                {/* رقم الموبايل والواتساب */}
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px]">رقم الموبايل والواتساب (أوتوماتيكي)</label>
                  <input
                    type="text"
                    disabled
                    value={selectedRequest.phone || ""}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-4 outline-none font-mono font-semibold text-xs opacity-80"
                  />
                </div>

                {/* المنطقة الجغرافية للتوزيع */}
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px]">المنطقة الجغرافية للتوزيع</label>
                  <input
                    type="text"
                    disabled
                    value={selectedRequest.region || ""}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-4 outline-none font-semibold text-xs opacity-80"
                  />
                </div>

                {/* تاريخ التنفيذ المتوقع */}
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px]">تاريخ التنفيذ المتوقع</label>
                  <input
                    type="text"
                    disabled
                    value={selectedRequest.execution_date || "غير محدد"}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-4 outline-none font-mono font-semibold text-xs opacity-80"
                  />
                </div>

                {/* المساحة ومستوى التشطيب */}
                <div className="col-span-2">
                  <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px]">مساحة الشقة ومستوى التشطيب المختار بالحاسبة</label>
                  <input
                    type="text"
                    disabled
                    value={`${selectedRequest.area || 0} م² — مستوى التشطيب: (${selectedRequest.finishing_level || "غير محدد"})`}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-4 outline-none font-semibold text-xs opacity-80"
                  />
                </div>

                {/* كارت زجاجي بلوري فخم يعرض النطاق السعري التقديري للعميل المختار */}
                <div className="col-span-2">
                  <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px]">التكلفة التقديرية التلقائية بالحملة الإعلانية</label>
                  <div className="w-full h-11 rounded-xl bg-[#020B1C] border border-emerald-500/35 text-emerald-400 flex items-center justify-center font-mono font-black text-xs gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.15)] select-none">
                    <span className="text-[10px] text-gray-500 font-bold">من:</span>
                    <span>{getEstimatedCosts(selectedRequest).min.toLocaleString()}</span>
                    <span className="text-gray-500 font-normal text-[10px]">إلى:</span>
                    <span>{getEstimatedCosts(selectedRequest).max.toLocaleString()}</span>
                    <span className="text-[10px] text-gray-500 font-bold mr-1">ج.م</span>
                  </div>
                </div>

                {/* المواصفات والطلبات الفنية الإضافية */}
                <div className="col-span-2">
                  <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px]">المواصفات والطلبات الإضافية المدخلة من العميل</label>
                  <textarea
                    disabled
                    value={selectedRequest.notes || "لا توجد ملاحظات إضافية مسجلة من العميل."}
                    className="w-full h-20 p-3.5 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white outline-none resize-none text-xs leading-relaxed font-semibold opacity-80"
                  />
                </div>

                {/* تعيين موظف المبيعات لترقية اليد */}
                {!(String(selectedRequest.status || "").includes("تم تحويل") || selectedRequest.status === "تم التحويل لعميل") && (
                  <div className="col-span-2 pt-2">
                    <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px]">تعيين موظف المبيعات المسؤول عن هذا العميل قبل الترقية للـ CRM *</label>
                    <select
                      value={selectedAssignee}
                      onChange={(e) => setSelectedAssignee(e.target.value)}
                      className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/35 text-[#D4AF37] font-black px-3 outline-none cursor-pointer text-xs focus:border-[#D4AF37]"
                    >
                      <option value="">-- حدد موظف المبيعات للربط --</option>
                      {salesStaff.map((s) => (
                        <option key={s.id} value={s.id}>📈 {s.name}</option>
                      ))}
                    </select>
                  </div>
                )}

              </div>

              {/* أزرار الإجراءات للـ Lead مصممة بالشكل الإمبراطوري الفاخر مع حظر إعادة تحميل الصفحة نهائياً */}
              <div className="flex gap-4 pt-4 border-t border-[#D4AF37]/20 justify-end select-none">
                
                {/* 1. زر إلغاء التحديد */}
                <button
                  type="button" // 👈 حظر إعادة التحميل الافتراضية بنسبة 100%
                  onClick={(e) => { e.preventDefault(); clearSelection(); }}
                  className="px-6 h-11 rounded-xl bg-gradient-to-b from-[#0c1e3d]/40 to-[#040e20]/40 text-[#D4AF37] border border-[#D4AF37]/30 shadow-md hover:border-[#D4AF37] transition-all duration-300 font-bold cursor-pointer text-xs flex items-center justify-center gap-1.5"
                >
                  إلغاء التحديد
                </button>

                {/* 2. زر ترقية العميل حيوياً بالشكل الفاخر المعتمد */}
                <button
                  type="button" // 👈 حظر إعادة التحميل الافتراضية بنسبة 100%
                  onClick={(e) => { e.preventDefault(); handleConvertToCRM(); }}
                  disabled={actionLoading || String(selectedRequest.status || "").includes("تم تحويل") || selectedRequest.status === "تم التحويل لعميل"}
                  className="px-8 h-11 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.02] active:scale-95 transition-all duration-300 font-black cursor-pointer text-xs flex items-center justify-center gap-2 select-none relative overflow-hidden disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <ArrowLeftRight size={14} />}
                  {String(selectedRequest.status || "").includes("تم تحويل") || selectedRequest.status === "تم التحويل لعميل" ? "تمت الترقية للـ CRM وتعيين السيلز بنجاح" : "✅ تحويل وترقية لعميل CRM رسمي"}
                  {/* عاكس الإضاءة النيوني المتوهج بقاع الزر */}
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
                </button>

              </div>

            </div>
          )}

        </div>
      </section>
    </main>
  );
}