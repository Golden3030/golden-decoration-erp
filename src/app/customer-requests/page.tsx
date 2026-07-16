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
  X
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

  // دالة ترقية وتحويل الطلب البارد إلى عميل CRM رسمي متعاقد بضغط زر واحدة
  async function handleConvertToCRM() {
    if (!selectedRequest?.id) {
      alert("يرجى تحديد طلب العميل المراد تحويله من الجدول بالأعلى أولاً.");
      return;
    }

    if (selectedRequest.status === "تم التحويل لعميل") {
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

      // 2. استدعاء العملية المحدثة في قاعدة البيانات
      const { error: rpcError } = await supabase.rpc("convert_request_to_customer", {
        p_request_id: selectedRequest.id,
        p_customer_code: nextCustomerCode,
        p_name: selectedRequest.name,
        p_mobile: selectedRequest.phone,
        p_address: selectedRequest.region,
        p_assigned_to: selectedAssignee
      });

      if (rpcError) throw rpcError;

      // 3. إرسال إشعار فوري للنظام
      await supabase.from("notifications").insert({
        title: "ترقية عميل إعلانات إلى CRM",
        message: `✅ تم بنجاح تحويل العميل المحتمل: ${selectedRequest.name} إلى عميل CRM رسمي برقم كود (${nextCustomerCode}).`,
        type: "sales",
        link: "/customers"
      });

      alert(`✅ تم بنجاح حفظ وتحويل العميل والبيانات المساحة والمنطقة في المشروع بنجاح!`);
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
          <button onClick={() => router.push("/dashboard")} className="mt-6 w-full bg-gradient-to-r from-[#D4AF37] to-[#F0E6D2] text-[#020B1C] font-black py-3 rounded-xl shadow-2xl text-xs">
            العودة للرئيسية
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020B1C] relative overflow-hidden" dir="rtl">
      
      {/* هالة تلميحات الإضاءة الخلفية الدافئة تتدفق ببطء خلف الكروت */}
      <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] rounded-full bg-[#D4AF37]/5 blur-[140px] pointer-events-none z-0" />

      {/* 🛠️ جدار الحماية البصري الموحد لتثبيت تباين خط Alexandria المعتمد ولون الشاشات القاتم الكحلي */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;700;900&display=swap');

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
              {/* تصغير مقاس العنوان الرئيسي للتوافق التام مع الدستور الجمالي */}
              <h1 className="text-xl md:text-2xl font-black text-[#D4AF37] flex items-center gap-2 select-none">
                <span>طلبات المعاينة وحصر ليدات الحملة الإعلانية (Leads Queue)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-pulse" />
              </h1>
              {/* تعديل لون الشرح أسفل العنوان للأبيض الصافي لتعزيز التباين */}
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

          {/* 1. جدول عرض طلبات الإعلانات الحالية بتصميم زجاجي رفيع شبه شفاف */}
          <div className="bg-[#07132a] border border-[#D4AF37] rounded-2xl overflow-hidden shadow-2xl flex flex-col relative w-full">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
            
            <div className="p-4 border-b border-[#D4AF37]/20 bg-[#0b1b3d]/60">
              {/* تحويل عنوان الترويسة للون البني البرونزي المعتمد `#A17A4C` */}
              <h3 className="text-[#D4AF37] font-black text-xs md:text-sm flex items-center gap-2">
                <ClipboardList size={18} />
                <span>  العملاء الواردة من حاسبة الموقع ({requests.length})</span>
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
                      <th>النطاق السعري التقديري</th>
                      <th className="text-center">حالة الطلب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D4AF37]/15">
                    {requests.map((r) => {
                      const costs = getEstimatedCosts(r);
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
                          <td className="font-mono font-black text-[#D4AF37]">
                            من {formatNumber(costs.min)} إلى {formatNumber(costs.max)} ج.م
                          </td>
                          <td className="text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                              r.status === "تم التحويل لعميل" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
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

          {/* 2. كرت مراجعة تفاصيل طلب العميل المختار والترقية بنقرة زر مذهبة وتولتيب مخصص */}
          {selectedRequest && (
            <div className="bg-[#07132a] border border-[#D4AF37] rounded-[2rem] p-6 space-y-6 animate-fade-in shadow-2xl relative overflow-hidden w-full text-xs md:text-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
              
              {/* تحويل عنوان الترويسة للون البني البرونزي المعتمد `#A17A4C` */}
              <h3 className="text-[#D4AF37] font-black text-sm md:text-base border-b border-[#D4AF37] pb-3 flex items-center gap-2 select-none">
                <Sparkles className="w-5 h-5 text-[#D4AF37] animate-pulse" />
                <span>تفاصيل طلب مبيعات العميل: {selectedRequest.name}</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-white font-semibold">
                
                <div className="flex items-center gap-3 p-3 bg-[#020B1C]/50 rounded-xl border border-[#D4AF37]/15">
                  <User className="text-[#D4AF37]" size={16} />
                  <div>
                    <span className="text-gray-400 block text-[10px] font-bold">الاسم بالكامل:</span>
                    <span className="font-bold text-[#F0E6D2] text-xs">{selectedRequest.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-[#020B1C]/50 rounded-xl border border-[#D4AF37]/15">
                  <Phone className="text-[#D4AF37]" size={16} />
                  <div>
                    <span className="text-gray-400 block text-[10px] font-bold">رقم الموبايل والواتساب:</span>
                    <span className="font-mono text-[#F0E6D2] text-xs">{selectedRequest.phone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-[#020B1C]/50 rounded-xl border border-[#D4AF37]/15">
                  <MapPin className="text-[#D4AF37]" size={16} />
                  <div>
                    <span className="text-gray-400 block text-[10px] font-bold">المنطقة الجغرافية للتوزيع:</span>
                    <span className="font-bold text-[#F0E6D2] text-xs">{selectedRequest.region}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-[#020B1C]/50 rounded-xl border border-[#D4AF37]/15">
                  <Sparkles className="text-[#D4AF37]" size={16} />
                  <div>
                    <span className="text-gray-400 block text-[10px] font-bold">المساحة ومستوى التشطيب:</span>
                    <span className="font-bold text-[#F0E6D2] text-xs">{selectedRequest.area} م² - ({selectedRequest.finishing_level})</span>
                  </div>
                </div>

                {/* كارت زجاجي بلوري فخم يعرض النطاق السعري للعميل المختار بشكل بارز يطابق حاسبة العميل */}
                <div className="col-span-1 md:col-span-2 p-4 glass-price-card rounded-2xl relative overflow-hidden flex flex-col justify-center">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-[#D4AF37]" />
                  <span className="text-emerald-400 block mb-2 text-xs font-black flex items-center gap-1.5 select-none">
                    <TrendingUp size={14} className="shrink-0 animate-pulse" /> التكلفة المبدئية التي شاهدها العميل في الآلة الحاسبة:
                  </span>
                  <div className="flex gap-6 font-mono text-sm md:text-base font-black text-[#D4AF37] tracking-tight">
                    <span>من: {formatNumber(getEstimatedCosts(selectedRequest).min)} ج.م</span>
                    <span>إلى: {formatNumber(getEstimatedCosts(selectedRequest).max)} ج.م</span>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 p-4 bg-black/60 rounded-xl border border-[#D4AF37]/15">
                  <span className="text-gray-400 block mb-1 text-[10px] font-bold">المواصفات والطلبات الفنية الإضافية المدخلة من العميل:</span>
                  <p className="text-[#F0E6D2] text-xs leading-relaxed font-bold">{selectedRequest.notes || "لا توجد ملاحظات أو مواصفات خاصة مدخلة من العميل."}</p>
                </div>
              </div>

              {selectedRequest.status !== "تم التحويل لعميل" && (
                <div className="p-4 bg-[#020B1C]/50 rounded-xl border border-[#D4AF37]/15">
                  <label className="text-gray-400 block mb-2 text-[10px] font-bold">اختر موظف المبيعات المسؤول عن هذا العميل قبل الترقية المباشرة للـ CRM:</label>
                  <select
                    value={selectedAssignee}
                    onChange={(e) => setSelectedAssignee(e.target.value)}
                    className="w-full bg-[#020B1C] border border-[#D4AF37]/35 text-[#D4AF37] font-bold p-3 rounded-lg text-xs outline-none focus:border-[#D4AF37] cursor-pointer"
                  >
                    <option value="">-- حدد موظف المبيعات للربط --</option>
                    {salesStaff.map((s) => (
                      <option key={s.id} value={s.id}>📈 {s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* أزرار الإجراءات للـ Lead مع فقاعات التولتيب التعريفية المذهبة */}
              <div className="flex gap-4 pt-5 border-t border-[#D4AF37]/20 justify-end select-none">
                
                {/* 1. زر إلغاء التحديد */}
                <div className="relative group">
                  <button
                    onClick={clearSelection}
                    className="h-11 bg-transparent border border-gray-600 text-gray-300 px-6 rounded-xl font-bold hover:bg-gray-800 transition duration-150 cursor-pointer text-xs"
                  >
                    إلغاء التحديد
                  </button>
                  <div className="absolute bottom-full mb-2.5 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                    <div className="bg-[#07132a] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-1.5 px-3 rounded-xl shadow-2xl relative">
                      ❌ تصفير الاختيار الحالي للعميل
                      <div className="absolute top-full right-1/2 translate-x-1/2 w-1.5 h-1.5 bg-[#07132a] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                    </div>
                  </div>
                </div>

                {/* 2. زر ترقية العميل حيوياً لجدول الـ CRM السحابي بضغطة زر وتولتيب مذهب */}
                <div className="relative group">
                  <button
                    onClick={handleConvertToCRM}
                    disabled={actionLoading || selectedRequest.status === "تم التحويل لعميل"}
                    className="h-11 bg-gradient-to-r from-[#C9A45D] via-[#F0E6D2] to-[#D4AF37] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] text-black px-8 rounded-xl font-black cursor-pointer disabled:opacity-50 text-xs flex items-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all"
                  >
                    {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <ArrowLeftRight size={14} />}
                    {selectedRequest.status === "تم التحويل لعميل" ? "تم التحويل والترقية للـ CRM بنجاح" : "✅ تحويل وترقية لعميل CRM رسمي"}
                  </button>
                  
                  <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                    <div className="bg-[#07132a] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2 px-4 rounded-xl shadow-2xl relative">
                      ⚙️ معالجة وترقية العميل المحتمل تلقائياً من الإعلانات إلى سجلات الـ CRM
                      <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#07132a] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      </section>
    </main>
  );
}