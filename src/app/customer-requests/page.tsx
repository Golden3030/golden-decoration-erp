"use client";

import { useEffect, useState, useMemo } from "react";
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

  // حالات محرك البحث والفرز المزدوج للعملاء الجدد والذين تم تحويلهم
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "converted">("all");

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

  // فرز وتصفية ليدات الإعلانات لحظياً بالاسم، الهاتف، التاريخ والجديد/المحول بالـ useMemo الفوري لسرعة فائقة
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // 1. تصفية محرك البحث الثلاثي (الاسم، الموبايل، التاريخ)
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = !q || 
        String(r.name || "").toLowerCase().includes(q) ||
        String(r.phone || "").includes(q) ||
        String(r.execution_date || "").includes(q) ||
        String(r.created_at || "").includes(q);

      if (!matchSearch) return false;

      // 2. تصفية التمييز بين الجديد والمحول للـ CRM
      const isConverted = String(r.status || "").includes("تم تحويل") || r.status === "تم التحويل لعميل";
      if (statusFilter === "new") {
        return !isConverted;
      }
      if (statusFilter === "converted") {
        return isConverted;
      }
      return true;
    });
  }, [requests, searchQuery, statusFilter]);

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
      <main className="min-h-screen bg-[#020B1C] flex items-center justify-center text-[#D4AF37] font-black" dir="rtl">
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
    <main className="min-h-screen flex bg-[#020B1C] relative overflow-hidden font-alexandria" dir="rtl">
      
      {/* 🌟 هالة تلميحات الإضاءة الخلفية الدافئة تتدفق ببطء خلف الكروت */}
      <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] rounded-full bg-[#D4AF37]/5 blur-[140px] pointer-events-none z-0" />

      {/* 🛠️ جدار الحماية البصري الموحد وتنسيق شريط التمرير مذهب الألوان بسمك 6px لإنهاء عوائق الـ CRM */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* تفعيل وإظهار شريط التمرير الأفقي والرأسي بكافة الجداول بألوان ذهبية فاخرة */
        ::-webkit-scrollbar { 
          width: 4px !important; 
          height: 4px !important; 
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

        /* عزل تلوين وأوزان خلايا جدول ليدات الإعلانات وحمايتها من التداخل الكلمي */
        .premium-leads-table thead th {
          font-size: 0.80rem !important;
          font-weight: 500 !important;
          color: #D4AF37 !important;
          text-align: right !important;
          background-color: #020B1C !important;
          border-bottom: 2px solid rgba(212, 175, 55, 0.3) !important;
          padding: 14px 16px !important;
          letter-spacing: normal !important;
        }

        .premium-leads-table tbody td {
          font-size: 0.9rem !important;
          font-weight: 400 !important;
          
          text-align: right !important;
          border-bottom: 1px solid rgba(212, 175, 55, 0.1) !important;
          padding: 14px 16px !important;
          letter-spacing: normal !important;
        }

        .premium-leads-table tbody tr:hover {
          background-color: rgba(7, 19, 42, 0.8) !important;
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
              <p className="text-white text-xs mt-2">مراقبة وفحص طلبات المقايسات المبدئية الواردة من السوشيال ميديا وترقيتها للـ CRM.</p>
            </div>

            {/* شارة عرض الصلاحية النشطة للمخدم الإداري */}
            {userRole && ROLE_LABELS[userRole] && (
              <div className="flex-shrink-0 bg-[#D4AF37]/10 border border-[#D4AF37]/35 text-[#D4AF37] px-4 py-2 rounded-xl text-xs font-black shadow-lg flex items-center gap-2 select-none">
                <span>صلاحيتك النشطة:</span>
                <span className="text-white bg-black/60 px-2.5 py-0.5 rounded-lg border border-white/5 font-mono">{ROLE_LABELS[userRole]}</span>
              </div>
            )}
          </div>

          {/* 1. جدول عرض طلبات الإعلانات الحالية مدعم بحماية منع تداخل الحروف القياسي والتمرير المذهب */}
          <div className="bg-[#07132a] border border-[#D4AF37] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col relative w-full">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
            
            {/* 🌟 هيدر الجدول: مدمج به محرك البحث الثلاثي وأزرار الفلترة المذهبة للدستور البصري الموحد */}
            <div className="p-4 border-b border-[#D4AF37]/20 bg-[#0b1b3d]/60 flex flex-col md:flex-row justify-between items-center gap-4 select-none">
              <h3 className="text-[#D4AF37] font-bold text-sm md:text-md flex items-center gap-2">
                <ClipboardList size={18} />
                <span>العملاء الواردة من حاسبة تكلفة التشطيب ({filteredRequests.length})</span>
              </h3>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                {/* أزرار الفلترة النيونية الفاخرة للتمييز بين الجديد والمحول */}
                <div className="flex items-center gap-1 bg-[#020B1C] border border-[#D4AF37]/20 rounded-xl p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className={`px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer ${
                      statusFilter === "all" 
                        ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.3)] font-bold" 
                        : "bg-[#07132a] border border-transparent text-[#F0E6D2] hover:border-[#D4AF37]/20"
                    }`}
                  >
                    👥 الكل
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("new")}
                    className={`px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer ${
                      statusFilter === "new" 
                        ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.3)] font-bold" 
                        : "bg-[#07132a] border border-transparent text-[#F0E6D2] hover:border-[#D4AF37]/20"
                    }`}
                  >
                    ✨ طلبات جديدة
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("converted")}
                    className={`px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer ${
                      statusFilter === "converted" 
                        ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.3)] font-bold" 
                        : "bg-[#07132a] border border-transparent text-[#F0E6D2] hover:border-[#D4AF37]/20"
                    }`}
                  >
                    ✅ تم تحويلهم للـ CRM
                  </button>
                </div>

                {/* محرك البحث الرشيق بالاسم، الهاتف، التاريخ */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="ابحث بالاسم، الموبايل، التاريخ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 rounded-xl bg-[#020B1C] border border-[#243556] text-[#F0E6D2] pr-10 pl-4 text-xs font-bold outline-none focus:border-[#D4AF37] placeholder-slate-600 transition"
                  />
                  <span className="absolute right-3.5 top-3 text-[#D4AF37] text-xs">🔍</span>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto max-h-[240px] overflow-y-auto">
              {loading ? (
                <div className="p-12 text-center text-[#D4AF37] font-black text-ms animate-pulse flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={16} />
                  <span>جاري جلب وقراءة الطلبات من قاعدة البيانات...</span>
                </div>
              ) : filteredRequests.length > 0 ? (
                <table className="w-full text-right table-auto min-w-[850px] premium-leads-table font-bold">
                  <thead>
                    <tr className="whitespace-nowrap select-none font-bold">
                      <th>اسم العميل</th>
                      <th>رقم الموبايل</th>
                      <th>المساحة م²</th>
                      <th>مستوى التشطيب</th>
                      <th>المنطقة</th>
                      <th>تاريخ التسجيل</th>
                      <th>النطاق السعري التقديري</th>
                      <th className="text-center font-bold">حالة الطلب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D4AF37]/15">
                    {filteredRequests.map((r) => {
                      const costs = getEstimatedCosts(r);
                      const isConverted = String(r.status || "").includes("تم تحويل") || r.status === "تم التحويل لعميل";
                      return (
                        <tr
                          key={r.id}
                          onClick={() => selectRequestRow(r)}
                          className={`cursor-pointer whitespace-nowrap transition-all duration-200 ${
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
                              isConverted ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 animate-pulse" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}>{r.status || "جديد"}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-slate-400 font-bold text-xs">لا توجد طلبات واردة تطابق الفئات المحددة حالياً.</div>
              )}
            </div>
          </div>

          {/* 🌟 2. تفاصيل وبيانات طلب العميل المحتمل (تم ضغطه بالتبويب المدمج المذهب ذو الوسام العائم لتوحيد الرؤية ومكافحة التضخم البصري) */}
          {selectedRequest && (
            <div className="bg-[#07132a] border border-[#D4AF37] rounded-[2rem] p-6 space-y-5 shadow-2xl relative overflow-hidden w-full animate-fade-in">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
              
              {/* هيدر الكارت المطور: تم فيه حذف حقول إدخال الاسم والهاتف المعطلة ونقلهما كوسام ذهبي عائم يوفر المساحة ويمنع التضخم */}
              <h3 className="text-[#D4AF37] text-md md:text-md font-bold border-b border-[#D4AF37] pb-3 flex items-center justify-between select-none">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#D4AF37] animate-pulse" />
                  <span>تفاصيل بيانات للعميل:({selectedRequest.name})</span>
                </div>
                <span className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] px-3 py-1 rounded-xl font-mono text-xs shadow-inner">
                  📞 {selectedRequest.phone}
                </span>
              </h3>

              {/* إعادة هيكلة البيانات في شبكة ثلاثية رشيقة وموفرة للمساحة الرأسية */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-semibold text-xs md:text-sm">
                
                <div>
                  <label className="block text-[#D4AF37] mb-1.5 font-bold px-2 text-[13px]">المنطقة الجغرافية / العنوان المكتوب</label>
                  <input
                    type="text"
                    disabled
                    value={selectedRequest.region || ""}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-3 outline-none text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[#D4AF37] mb-1.5 font-bold px-2 text-[13px]">تاريخ التسجيل</label>
                  <input
                    type="text"
                    disabled
                    value={selectedRequest.execution_date || "غير محدد"}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] px-3 outline-none font-mono text-center text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[#D4AF37] mb-1.5 font-bold px-2 text-[13px]">المساحة والتشطيب المطلوب </label>
                  <input
                    type="text"
                    disabled
                    value={`${selectedRequest.area || 0} م² — مستوى: (${selectedRequest.finishing_level || "غير محدد"})`}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-3 outline-none text-xs font-semibold"
                  />
                </div>

                {/* كارت النطاق السعري التقديري للعميل المختار */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[#D4AF37] mb-1.5 font-bold px-2 text-[13px]">التكلفة التقديرية التلقائية بالحملة الإعلانية</label>
                  <div className="w-full h-11 rounded-xl bg-[#020B1C] border border-emerald-500/35 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.15)] select-none">
                    <span className="text-[13px] text-gray-500 font-bold">من:</span>
                    <span>{getEstimatedCosts(selectedRequest).min.toLocaleString()}</span>
                    <span className="text-gray-500 font-normal text-[13px]">إلى:</span>
                    <span>{getEstimatedCosts(selectedRequest).max.toLocaleString()}</span>
                    <span className="text-[10px] text-gray-500 font-bold mr-1">ج.م</span>
                  </div>
                </div>

                {/* تعيين موظف المبيعات لترقية اليد */}
                {!(String(selectedRequest.status || "").includes("تم تحويل") || selectedRequest.status === "تم التحويل لعميل") ? (
                  <div>
                    <label className="block text-[#D4AF37] mb-1.5 font-bold px-2 text-[13px]">تعيين مسؤول المبيعات للربط والترقية *</label>
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
                ) : (
                  <div>
                    <label className="block text-gray-500 mb-1.5 font-bold px-2 text-[13px]">حالة توزيع العميل ومسؤول المبيعات</label>
                    <div className="w-full h-11 rounded-xl bg-[#020B1C]/50 border border-[#1f2d4d] text-gray-500 flex items-center justify-center text-xs font-bold">
                      ✅ تم التوزيع والتحويل لقسم المبيعات بنجاح
                    </div>
                  </div>
                )}

                {/* المواصفات والطلبات الفنية الإضافية */}
                <div className="col-span-1 sm:col-span-3">
                  <label className="block text-[#D4AF37] mb-1.5 font-bold px-2 text-[13px]">المواصفات والطلبات الإضافية المدخلة من العميل</label>
                  <textarea
                    disabled
                    value={selectedRequest.notes || "لا توجد ملاحظات إضافية مسجلة من العميل."}
                    className="w-full h-16 p-3 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white outline-none resize-none text-xs leading-relaxed font-semibold opacity-85"
                  />
                </div>

              </div>

              {/* أزرار الإجراءات للـ Lead مصممة بالشكل الإمبراطوري الفاخر مع حظر إعادة تحميل الصفحة نهائياً */}
              <div className="flex gap-4 pt-4 border-t border-[#D4AF37]/20 justify-end select-none">
                
                {/* 1. زر إلغاء التحديد */}
                <button
                  type="button" 
                  onClick={(e) => { e.preventDefault(); clearSelection(); }}
                  className="px-6 h-11 rounded-xl bg-transparent border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 active:scale-95 transition-all text-xs font-black cursor-pointer"
                >
                  إلغاء التحديد
                </button>

                {/* 2. زر ترقية العميل حيوياً بالشكل الفاخر المعتمد والمثبت بـ عاكس الإضاءة السفلي */}
                <button
                  type="button" 
                  onClick={(e) => { e.preventDefault(); handleConvertToCRM(); }}
                  disabled={actionLoading || String(selectedRequest.status || "").includes("تم تحويل") || selectedRequest.status === "تم التحويل لعميل"}
                  className="px-8 h-11 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.02] active:scale-95 transition-all duration-300 font-black cursor-pointer text-xs flex items-center justify-center gap-2 select-none relative overflow-hidden disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <ArrowLeftRight size={14} />}
                  {String(selectedRequest.status || "").includes("تم تحويل") || selectedRequest.status === "تم التحويل لعميل" ? "تمت الترقية للـ CRM وتعيين السيلز بنجاح" : "✅ تحويل وترقية لعميل CRM رسمي"}
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