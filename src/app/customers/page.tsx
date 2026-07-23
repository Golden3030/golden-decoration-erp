"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import ImportLeadsModal from "@/components/CRM/ImportLeadsModal"; // 👈 استيراد مودال الاستيراد وتأصيل المكون
import { supabase } from "@/lib/supabaseClient";
import { isOnline, addToOfflineQueue } from "@/lib/offline-sync";
import { 
  Plus, 
  Minus, 
  Calendar, 
  Users, 
  Clipboard, 
  Info, 
  CheckCircle2, 
  Lock, 
  UserPlus, 
  X, 
  Mail, 
  Phone, 
  MapPin, 
  Sparkles, 
  Trash2, 
  RefreshCw,
  FolderCheck // 👈 إضافة أيقونة استيراد الكشوف المعتمدة
} from "lucide-react";

interface Customer {
  id: string;
  customer_code: string;
  name: string;
  mobile: string;
  phone?: string;
  email?: string;
  address?: string;
  status: string;
  assigned_to?: string;
  created_at: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesReps, setSalesReps] = useState<any[]>([]); 
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // حالة لتتبع ما إذا كان المستخدم يقوم بتسجيل عميل جديد حراً
  const [isAddingNew, setIsAddingNew] = useState(false);

  // 🌟 حالة تتبع وفتح شاشة استيراد شيت الإكسيل لحظياً
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // حقول حماية الصلاحيات والرتب حياً
  const [currentUserId, setCurrentUserId] = useState("");
  const [userRole, setUserRole] = useState("sales");

  // حقول نموذج الإدخال والتحرير المكتملة
  const [cName, setCName] = useState("");
  const [cMobile, setCMobile] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cAddress, setCAddress] = useState("");
  const [cStatus, setCStatus] = useState("جديد"); 
  const [cAssignedTo, setCAssignedTo] = useState("");

  useEffect(() => {
    document.title = "سجل إدارة العملاء | Golden Decoration";
    loadCustomersAndSalesStaff();
  }, []);

  async function loadCustomersAndSalesStaff() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user?.id)
        .single();

      const roleKey = String(profile?.role || "sales").toLowerCase();
      setUserRole(roleKey);

      const [custRes, salesRes] = await Promise.all([
        supabase.from("customers").select("*").order("created_at", { ascending: false }),
        supabase.from("users").select("id, name").eq("role", "sales").order("name", { ascending: true })
      ]);

      if (custRes.error) throw custRes.error;
      setCustomers(custRes.data || []);
      setSalesReps(salesRes.data || []);
    } catch (err: any) {
      console.error("Error loading customers data:", err.message);
    } finally {
      document.title = "سجل وإدارة شؤون العملاء | Golden Decoration";
      setLoading(false);
    }
  }

  function clearForm() {
    setSelectedCustomer(null);
    setIsAddingNew(false); 
    setCName("");
    setCMobile("");
    setCPhone("");
    setCEmail("");
    setCAddress("");
    setCStatus("جديد");
    setCAssignedTo("");
  }

  function selectCustomerRow(cust: Customer) {
    setIsAddingNew(false); 
    setSelectedCustomer(cust);
    setCName(cust.name || "");
    setCMobile(cust.mobile || "");
    setCPhone(cust.phone || "");
    setCEmail(cust.email || "");
    setCAddress(cust.address || "");
    setCStatus(cust.status || "جديد");
    setCAssignedTo(cust.assigned_to || "");
  }

  const isManager = ["admin", "owner", "manager", "sales_manager"].includes(userRole);
  const isOperationalStaff = ["admin", "owner", "manager", "sales_manager", "sales", "procurement", "accountant", "engineer"].includes(userRole);

  // 1. دالة تسجيل عميل جديد
  async function handleInsertCustomer() {
    if (!cName || !cMobile) {
      alert("يرجى ملء الحقول المطلوبة (الاسم بالكامل، رقم المحمول) لإصدار كارت العميل.");
      return;
    }

    setSaving(true);
    try {
      const generatedCode = "CUST-" + Math.floor(1000 + Math.random() * 9000);
      const assignedRepId = isManager ? (cAssignedTo || null) : currentUserId;

      const payload = {
        customer_code: generatedCode,
        name: cName,
        mobile: cMobile,
        phone: cPhone || null,
        email: cEmail || null,
        address: cAddress || null,
        status: cStatus,
        assigned_to: assignedRepId
      };

      if (isOnline()) {
        const { error } = await supabase
          .from("customers")
          .insert([payload]);

        if (error) throw error;

        if (assignedRepId) {
          await supabase.from("notifications").insert({
            title: "ارسال وتوزيع عميل جديد",
            message: `📈 تم ارسال العميل الجديد (${cName}) لمتابعتك الفورية من قبل مدير المبيعات.`,
            type: "sales",
            link: "/CRM"
          });
        }

        alert("✅ تم تسجيل وإدراج العميل الجديد وتحديث توزيع العميل بنجاح!");
        clearForm();
      } else {
        addToOfflineQueue("customers", "INSERT", payload);
        alert("⚠️ تم حفظ العميل محلياً مؤقتاً لعدم وجود إنترنت؛ وسيتم توزيعه ومزامنته تلقائياً فور عودة الشبكة.");
      }

      await loadCustomersAndSalesStaff();
    } catch (err: any) {
      alert("حدث خطأ أثناء تسجيل العميل: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // 2. دالة تعديل وحفظ بيانات عميل قائم
  async function handleUpdateCustomer() {
    if (!selectedCustomer) return;
    setSaving(true);
    try {
      const assignedRepId = isManager ? (cAssignedTo || null) : selectedCustomer.assigned_to;

      const payload = {
        name: cName,
        mobile: cMobile,
        phone: cPhone || null,
        email: cEmail || null,
        address: cAddress || null,
        status: cStatus,
        assigned_to: assignedRepId
      };

      if (isOnline()) {
        const { error } = await supabase
          .from("customers")
          .update(payload)
          .eq("id", selectedCustomer.id);

        if (error) throw error;
        alert("✅ تم تعديل وحفظ ملف العميل وتحديث البيانات بنجاح!");
        clearForm();
      } else {
        addToOfflineQueue("customers", "UPDATE", { ...payload, id: selectedCustomer.id });
        alert("⚠️ تم حفظ التعديلات محلياً وسيتم المزامنة التلقائية فور توفر الإنترنت.");
      }
      await loadCustomersAndSalesStaff();
    } catch (err: any) {
      alert("خطأ أثناء الحفظ: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#020B1C] relative overflow-hidden font-alexandria" dir="rtl">
      <Sidebar />
      
      {/* تأصيل جدار حماية الاستجابة والمحاذاة الكاملة مع الـ Sidebar */}
      <section className="w-full lg:pr-56 min-h-screen flex flex-col z-10 relative">
        <Header />

        {/* 🛠️ جدار الحماية البصري الموحد وتنسيق شريط التمرير المذهب وحظر التداخل بـ whitespace-nowrap و min-w-[850px] بالجدول لمنع القص والتقاطع كلياً */}
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

          /* كشوف رؤوس الجداول الموحدة والمحصورة داخل الصفحة فقط */
          .premium-customers-table thead th {
            font-size: 0.75rem !important;
            font-weight: 500 !important;
            color: #D4AF37 !important;
            text-align: right !important;
            background-color: #020B1C !important;
            border-bottom: 2px solid rgba(212, 175, 55, 0.3) !important;
            padding: 14px 16px !important;
            letter-spacing: normal !important;
          }

          /* كشوف البيانات العاجية الناعمة والمقروءة */
          .premium-customers-table tbody td {
            font-size: 0.8rem !important;
            font-weight: 400 !important;
            color: #F0E6D2 !important;
            text-align: right !important;
            border-bottom: 1px solid rgba(212, 175, 55, 0.1) !important;
            padding: 14px 16px !important;
            letter-spacing: normal !important;
          }

          .premium-customers-table tbody tr:hover {
            background-color: rgba(7, 19, 42, 0.8) !important;
          }
        `}} />

        <div className="p-4 md:p-8 space-y-6 text-right select-none animate-fade-in">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#D4AF37]/20 pb-5">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[#D4AF37] flex items-center gap-2">
                <span>سجل وإدارة شؤون العملاء</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-pulse" />
              </h1>
              <p className="text-white text-xs mt-2">تسجيل وتوزيع العملاء على المبيعات، ومراقبة الحسابات الجارية وتحديث ملف الـ CRM.</p>
            </div>
          </div>

          {/* 1. جدول تتبع وتدفق العملاء مع إطار زجاجي رفيع وشبه شفاف وموحد */}
          {isOperationalStaff && (
            <div className="w-full bg-[#07132a] border border-[#D4AF37] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col relative">
              <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
              
              <div className="p-4 border-b border-[#D4AF37] bg-[#050914]/80 flex items-center justify-between gap-2 select-none">
                <div className="flex items-center gap-2">
                  <Users className="w-6 h-6 text-[#D4AF37]" />
                  <h3 className="text-[#D4AF37] font-black text-xs md:text-sm">سجل العملاء والـ CRM المسجل ({customers.length})</h3>
                </div>

                {/* 🌟 دمج أزرار الإجراءات وصرف الأقسام للدستور البصري الحركي الموحد */}
                <div className="flex items-center gap-2">
                  {/* أ. زر استيراد شيت إكسيل وتوزيعه دائرياً */}
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => setIsImportModalOpen(true)}
                      className="p-3 rounded-xl bg-[#020B1C] border-2 border-[#D4AF37]/50 text-[#D4AF37] hover:text-[#020B1C] hover:bg-[#D4AF37] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer flex items-center justify-center hover:shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                    >
                      <FolderCheck className="w-5 h-5 stroke-[2.5]" />
                    </button>

                    <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                      <div className="bg-[#050914] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2 px-4 rounded-xl shadow-2xl relative">
                        📥 استيراد وتوزيع كشف إكسيل تلقائياً على السيلز
                        <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#050914] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                      </div>
                    </div>
                  </div>

                  {/* ب. زر إضافة عميل جديد يدوي */}
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => {
                        clearForm();
                        setIsAddingNew(true);
                      }}
                      className="p-3 rounded-xl bg-[#020B1C] border-2 border-[#D4AF37] text-[#D4AF37] hover:text-[#020B1C] hover:bg-[#D4AF37] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer flex items-center justify-center hover:shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                    >
                      <UserPlus className="w-5 h-5 stroke-[2.5]" />
                    </button>

                    <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                      <div className="bg-[#050914] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2 px-4 rounded-xl shadow-2xl relative">
                        ➕ انقر هنا لإضافة عميل جديد يدوياً بالـ CRM
                        <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#050914] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            
              <div className="overflow-x-auto w-full max-w-full max-h-[240px] overflow-y-auto ai-chat-scroll">
                <table className="w-full text-right table-auto min-w-[850px] premium-customers-table">
                  <thead>
                    <tr className="whitespace-nowrap select-none">
                      <th className="p-4">كود العميل</th>
                      <th className="p-4">اسم العميل </th>
                      <th className="p-4">رقم المحمول والواتساب</th>
                      <th className="p-4">العنوان والإقامة</th>
                      <th className="p-4 text-center">حالة الحساب الجاري</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => selectCustomerRow(c)}
                        className={`cursor-pointer whitespace-nowrap transition-all duration-200 ${
                          selectedCustomer?.id === c.id ? "bg-[#0b1b3d]/60 border-r-4 border-r-[#D4AF37]" : ""
                        }`}
                      >
                        <td className="font-mono text-[#D4AF37] font-medium">{c.customer_code}</td>
                        <td className="text-[#F0E6D2]">{c.name}</td>
                        <td className="font-mono text-[#F0E6D2]/80">{c.mobile}</td>
                        <td className="text-[#F0E6D2]/70 truncate max-w-xs">{c.address || "-"}</td>
                        <td className="text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-medium ${
                            c.status === "تم التعاقد" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}>{c.status || "جديد"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. كارت تعديل وإنشاء العملاء مدمج بإطار شفاف رفيع وموحد */}
          {selectedCustomer || isAddingNew ? (
            <div className="bg-[#07132a] border border-[#D4AF37] rounded-[2rem] p-6 space-y-4 animate-fade-in shadow-2xl relative overflow-hidden w-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
              
              <h3 className="text-[#D4AF37] text-xs md:text-sm font-black border-b border-[#D4AF37]/20 pb-3 flex items-center justify-between select-none">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#D4AF37] animate-pulse" />
                  <span>{isAddingNew ? "تأسيس كارت عميل جديد بالـ CRM" : "بيانات ملف العميل المسجل بالمنظومة"}</span>
                </div>
                {selectedCustomer && (
                  <span className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] px-3 py-1 rounded-xl font-mono text-xs shadow-inner">
                    {selectedCustomer.customer_code}
                  </span>
                )}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-semibold text-xs md:text-sm">
                
                <div>
                  <label className="block text-[#D4AF37] font-black mb-1.5 text-[10px]">اسم العميل بالكامل *</label>
                  <input
                    type="text"
                    placeholder="الاسم الثلاثي المعتمد للتعاقد"
                    value={cName}
                    onChange={(e) => setCName(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#F0E6D2] px-4 outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder:text-[#F0E6D2]/20 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[#D4AF37] font-black mb-1.5 text-[10px]">رقم الموبايل والواتساب الرئيسي *</label>
                  <input
                    type="text"
                    placeholder="010xxxxxxxx"
                    value={cMobile}
                    onChange={(e) => setCMobile(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#F0E6D2] px-4 outline-none font-mono focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder:text-[#F0E6D2]/20 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[#D4AF37] font-black mb-1.5 text-[10px]">رقم موبايل بديل (إضافي)</label>
                  <input
                    type="text"
                    placeholder="رقم هاتف آخر للتواصل"
                    value={cPhone}
                    onChange={(e) => setCPhone(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#F0E6D2] px-4 outline-none font-mono focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder:text-[#F0E6D2]/20 text-xs font-medium"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[#D4AF37] font-black mb-1.5 text-[10px]">عنوان المراسلة والإقامة بالتفصيل *</label>
                  <input
                    type="text"
                    placeholder="المحافظة، المدينة، اسم الشارع ورقم المبنى بالتفصيل..."
                    value={cAddress}
                    onChange={(e) => setCAddress(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#F0E6D2] px-4 outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder:text-[#F0E6D2]/20 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[#D4AF37] font-black mb-1.5 text-[10px]">البريد الإلكتروني للعميل</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#F0E6D2] px-4 outline-none font-mono focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder:text-[#F0E6D2]/20 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[#D4AF37] font-black mb-1.5 text-[10px]">موظف المبيعات المسؤول عن المتابعة</label>
                  {isManager ? (
                    <select
                      value={cAssignedTo}
                      onChange={(e) => setCAssignedTo(e.target.value)}
                      className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] font-bold px-3 outline-none cursor-pointer text-xs focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all"
                    >
                      <option value="">-- عام (بدون موظف محدد) --</option>
                      {salesReps.map(rep => (
                        <option key={rep.id} value={rep.id}>{rep.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value="محجوز تحت حسابك الشخصي تلقائياً"
                      disabled
                      className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#243556] text-gray-500 px-3 outline-none text-center font-bold text-xs"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[#D4AF37] font-black mb-1.5 text-[10px]">حالة حساب العميل الجارية والمتابعة *</label>
                  <select
                    value={cStatus}
                    onChange={(e) => setCStatus(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] font-bold px-3 outline-none cursor-pointer text-xs focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all"
                  >
                    <option>جديد</option>
                    <option>متابعة مستمرة</option>
                    <option>قيد انتظار المقايسة</option>
                    <option>تم إصدار المقايسة</option>
                    <option>تم التعاقد</option>
                    <option>مؤجل</option>
                    <option>ملغي</option>
                  </select>
                </div>

              </div>

              {/* أزرار تفاعلية مذهبة مطابقة للدستور البصري الحركي مع تسييل ذكي للمنطق */}
              <div className="flex flex-wrap gap-4 pt-5 border-t border-[#243556] justify-end select-none">
                
                {/* 1. زر إلغاء وتصفير الحقول الفخم */}
                <div className="relative group">
                  <button
                    type="button"
                    onClick={clearForm}
                    className="px-6 h-11 rounded-xl bg-transparent border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 active:scale-95 transition-all text-xs font-black cursor-pointer"
                  >
                    إلغاء وتراجع
                  </button>

                  <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                    <div className="bg-[#050914] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2 px-4 rounded-xl shadow-2xl relative">
                      ❌ تفريغ حقول النموذج وإغلاق استمارة الإضافة أو التعديل
                      <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#050914] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                    </div>
                  </div>
                </div>

                {/* 2. زر حفظ عميل جديد - يظهر *فقط* عند إنشاء حساب عميل جديد بالـ CRM */}
                {isAddingNew && (
                  <div className="relative group animate-in zoom-in-95 duration-200">
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); handleInsertCustomer(); }}
                      disabled={saving}
                      className="px-6 h-11 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.03] active:scale-95 transition-all duration-300 cursor-pointer text-xs font-black flex items-center justify-center gap-1.5 select-none relative overflow-hidden disabled:opacity-50"
                    >
                      {saving ? "جاري الإدراج..." : "💾 حفظ عميل جديد"}
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
                    </button>

                    <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                      <div className="bg-[#050914] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2 px-4 rounded-xl shadow-2xl relative">
                        💾 حفظ وتثبيت كارت العميل الجديد في قاعدة البيانات 
                        <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#050914] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 3. زر حفظ التعديلات الجارية - يظهر *فقط* عند اختيار عميل قائم بالفعل من الجدول */}
                {selectedCustomer && (
                  <div className="relative group animate-in zoom-in-95 duration-200">
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); handleUpdateCustomer(); }}
                      disabled={saving}
                      className="px-6 h-11 rounded-xl bg-gradient-to-b from-[#064e3b] to-[#022c22] text-[#34d399] border-2 border-[#34d399] shadow-[0_0_20px_rgba(52,211,153,0.25)] hover:shadow-[0_0_30px_rgba(52,211,153,0.45)] hover:scale-[1.03] active:scale-95 transition-all duration-300 cursor-pointer text-xs font-black flex items-center justify-center gap-1.5 select-none relative overflow-hidden"
                    >
                      {saving ? "جاري الحفظ..." : "✏️ حفظ التعديلات الجارية"}
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#34d399] to-transparent shadow-[0_-1px_6px_rgba(52,211,153,0.8)]" />
                    </button>

                    <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                      <div className="bg-[#050914] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2 px-4 rounded-xl shadow-2xl relative">
                        💾 حفظ وتحديث التعديلات الجارية للعميل 
                        <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#050914] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          ) : (
            /* كارت التنبيه التوجيهي الشفاف المذهب */
            <div className="bg-[#07132a]/40 border border-dashed border-[#D4AF37]/50 rounded-[2rem] p-8 text-center select-none text-gray-400 text-xs">
              ⚠️ برجاء تحديد أحد العملاء من جدول المبيعات أعلاه لتنشيط التعديل، أو الضغط على أيقونة الإضافة لتأسيس كارت عميل جديد.
            </div>
          )}

        </div>
      </section>

      {/* 🌟 تسييل وحقن استدعاء مودال الاستيراد المطور بالصفحة */}
      <ImportLeadsModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImportSuccess={loadCustomersAndSalesStaff} 
      />
    </main>
  );
}