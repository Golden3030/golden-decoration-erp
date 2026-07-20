"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
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
  RefreshCw 
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
    <main className="min-h-screen bg-[#020B1C] relative overflow-hidden" dir="rtl">
      <Sidebar />
      
      {/* تأصيل جدار حماية الاستجابة والمحاذاة الكاملة مع الـ Sidebar */}
      <section className="w-full lg:pr-56 min-h-screen flex flex-col z-10 relative">
        <Header />

        {/* 🛠️ جدار الحماية البصري الموحد لتثبيت تباين خط Alexandria ومقاصة شريط التمرير المذهب بالأسهم */}
        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;700;900&display=swap');

          *:not(code, pre, .font-mono, [class*="font-mono"]) {
            font-family: 'Alexandria', Arial, sans-serif !important;
            letter-spacing: normal !important;
          }

          ::-webkit-scrollbar {
            width: 8px !important;
            height: 8px !important;
          }
          ::-webkit-scrollbar-track {
            background: #020B1C !important;
          }
          ::-webkit-scrollbar-thumb {
            background: #D4AF37 !important;
            border-radius: 9999px !important;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #C9A45D !important;
          }

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

          /* كشوف رؤوس الجداول الكبيرة المذهبة */
          thead th, th {
            font-size: 0.8rem !important;
            font-weight: 900 !important;
            color: #D4AF37 !important;
            text-align: right !important;
            border-bottom: 2px solid rgba(212, 175, 55, 0.2) !important;
            background-color: #050914 !important;
            padding: 12px 14px !important;
          }

          /* كشوف البيانات العاجية */
          tbody td, td {
            font-size: 0.75rem !important;
            font-weight: 700 !important;
            color: #F0E6D2 !important;
            text-align: right !important;
            border-bottom: 1px solid rgba(212, 175, 55, 0.15) !important;
            padding: 12px 14px !important;
          }
        `}} />

        <div className="p-4 md:p-8 space-y-6 text-right select-none animate-fade-in">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#D4AF37]/20 pb-5">
            <div>
              {/* تصغير مقاس العنوان الرئيسي للتوافق مع الدستور الجمالي للنظام */}
              <h1 className="text-xl md:text-2xl font-black text-[#D4AF37] flex items-center gap-2">
                <span>سجل وإدارة شؤون العملاء</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-pulse" />
              </h1>
              {/* تعديل لون الشرح أسفل العنوان للأبيض الصافي لتعزيز التباين */}
              <p className="text-white text-xs mt-2">تسجيل وتوزيع العملاء على المبيعات، ومراقبة الحسابات الجارية وتحديث ملف الـ CRM.</p>
            </div>
          </div>

          {/* 1. جدول تتبع وتدفق العملاء مع إطار زجاجي رفيع وشبه شفاف وموحد */}
          {isOperationalStaff && (
            <div className="w-full bg-[#07132a] border border-[#D4AF37] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
              <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
              
              <div className="p-4 border-b border-[#D4AF37] bg-[#050914]/80 flex items-center justify-between gap-2 select-none">
                <div className="flex items-center gap-2">
                  <Users className="w-6 h-6 text-[#D4AF37]" />
                  {/* تحويل ترويسة العنوان للون البني البرونزي المعتمد `#A17A4C` */}
                  <h3 className="text-[#D4AF37] font-black text-xs md:text-sm">سجل العملاء والـ CRM المسجل ({customers.length})</h3>
                </div>

                {/* زر إضافة عميل جديد المطور */}
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => {
                      clearForm();
                      setIsAddingNew(true);
                    }}
                    className="p-3 rounded-xl bg-[#020B1C] border border-[#D4AF37] text-[#D4AF37] hover:text-[#020B1C] hover:bg-gradient-to-r hover:from-[#D4AF37] hover:to-[#C9A45D] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer flex items-center justify-center hover:shadow-[0_0_15px_rgba(212,175,55,0.4)]"
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
            
              <div className="overflow-x-auto w-full max-w-full max-h-[240px] overflow-y-auto ai-chat-scroll">
                <table className="w-full text-right table-auto">
                  <thead className="bg-[#050914] border-b border-[#D4AF37]/20">
                    <tr className="whitespace-nowrap select-none">
                      <th className="p-4">كود العميل</th>
                      <th className="p-4">اسم العميل </th>
                      <th className="p-4">رقم المحمول والواتساب</th>
                      <th className="p-4">العنوان والاقامة</th>
                      <th className="p-4 text-center">حالة الحساب الجاري</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D4AF37]/15">
                    {customers.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => selectCustomerRow(c)}
                        className={`hover:bg-[#0b1b3d]/60 cursor-pointer whitespace-nowrap transition-all duration-200 ${
                          selectedCustomer?.id === c.id ? "bg-[#0b1b3d] border-r-4 border-r-[#D4AF37]" : ""
                        }`}
                      >
                        <td className="p-4 font-mono text-[#D4AF37] font-black text-xs">{c.customer_code}</td>
                        <td className="p-4 font-black text-[#F0E6D2] text-xs">{c.name}</td>
                        <td className="p-4 font-mono text-[#F0E6D2]/80 text-xs">{c.mobile}</td>
                        <td className="p-4 text-[#F0E6D2]/70 text-xs truncate max-w-xs">{c.address || "-"}</td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black ${
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
            <div className="bg-[#07132a] border border-[#D4AF37] rounded-[2rem] p-6 space-y-6 animate-fade-in shadow-2xl relative overflow-hidden w-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
              
              {/* تحويل عنوان كارت التعديل للون البني البرونزي المعتمد `#A17A4C` والتحجيم */}
              <h3 className="text-[#D4AF37] text-xs md:text-sm font-black border-b border-[#D4AF37]/20 pb-3 flex items-center gap-2 select-none">
                <Sparkles className="w-5 h-5 text-[#D4AF37] animate-pulse" />
                <span>بيانات ملف العميل المسجل بالمنظومة</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-semibold text-xs md:text-sm">
                
                <div>
                  <label className="block text-[#D4AF37] font-black mb-2 text-[10px]">كود العميل *</label>
                  <input
                    type="text"
                    value={selectedCustomer ? selectedCustomer.customer_code : "CUST-XXXX"}
                    disabled
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/35 text-gray-500 px-4 outline-none text-center font-mono font-bold text-xs animate-pulse"
                  />
                </div>

                <div>
                  <label className="block text-[#D4AF37] font-black mb-2 text-[10px]">اسم العميل بالكامل *</label>
                  <input
                    type="text"
                    placeholder="الاسم الثلاثي المعتمد للتعاقد"
                    value={cName}
                    onChange={(e) => setCName(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/35 text-[#F0E6D2] px-4 outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder:text-[#F0E6D2]/20 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#D4AF37] font-black mb-2 text-[10px]">رقم موبايل بديل (إضافي)</label>
                    <input
                      type="text"
                      placeholder="رقم هاتف آخر للتواصل"
                      value={cPhone}
                      onChange={(e) => setCPhone(e.target.value)}
                      className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/35 text-[#F0E6D2] px-4 outline-none font-mono focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder:text-[#F0E6D2]/20 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[#D4AF37] font-black mb-2 text-[10px]">رقم الموبايل والواتساب الرئيسي *</label>
                    <input
                      type="text"
                      placeholder="010xxxxxxxx"
                      value={cMobile}
                      onChange={(e) => setCMobile(e.target.value)}
                      className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/35 text-[#F0E6D2] px-4 outline-none font-mono focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder:text-[#F0E6D2]/20 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#D4AF37] font-black mb-2 text-[10px]">عنوان المراسلة والإقامة بالتفصيل *</label>
                  <input
                    type="text"
                    placeholder="المحافظة، المدينة، اسم الشارع ورقم المبنى بالتفصيل..."
                    value={cAddress}
                    onChange={(e) => setCAddress(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/35 text-[#F0E6D2] px-4 outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder:text-[#F0E6D2]/20 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[#D4AF37] font-black mb-2 text-[10px]">البريد الإلكتروني للعميل</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/35 text-[#F0E6D2] px-4 outline-none font-mono focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder:text-[#F0E6D2]/20 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#D4AF37] font-black mb-2 text-[10px]">موظف المبيعات المسؤول عن المتابعة</label>
                    {isManager ? (
                      <select
                        value={cAssignedTo}
                        onChange={(e) => setCAssignedTo(e.target.value)}
                        className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/35 text-[#D4AF37] font-bold px-3 outline-none cursor-pointer focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all text-xs"
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
                        className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#243556] text-gray-500 px-4 outline-none text-center font-bold text-[10px]"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-[#D4AF37] font-black mb-2 text-[10px]">حالة حساب العميل الجارية والمتابعة *</label>
                    <select
                      value={cStatus}
                      onChange={(e) => setCStatus(e.target.value)}
                      className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/35 text-[#D4AF37] font-bold px-3 outline-none cursor-pointer focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all text-xs"
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

              </div>

              {/* أزرار تفاعلية مذهبة مع الـ Tooltips التعريفية */}
              <div className="flex flex-wrap gap-4 pt-5 border-t border-[#243556] justify-end select-none">
                
                {/* 1. زر إلغاء وتصفير الحقول الفخم */}
                <div className="relative group">
                  <button
                    type="button"
                    onClick={clearForm}
                    className="h-11 bg-transparent border border-[#D4AF37]/40 text-[#D4AF37] px-6 py-3 rounded-full font-black text-xs hover:text-[#020B1C] hover:bg-gradient-to-r hover:from-[#D4AF37] hover:to-[#C9A45D] transition-all duration-300 cursor-pointer flex items-center justify-center hover:shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                  >
                    إلغاء وتصفير الحقول
                  </button>

                  <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                    <div className="bg-[#050914] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2 px-4 rounded-xl shadow-2xl relative">
                      ❌ تفريغ حقول النموذج وإغلاق استمارة الإضافة أو التعديل
                      <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#050914] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                    </div>
                  </div>
                </div>

                {/* 2. زر حفظ عميل جديد */}
                <div className="relative group">
                  <button
                    type="button"
                    onClick={handleInsertCustomer}
                    disabled={saving || !!selectedCustomer}
                    className="h-11 bg-gradient-to-r from-[#C9A45D] via-[#F0E6D2] to-[#D4AF37] text-[#020B1C] px-6 rounded-full font-black transition-all duration-300 cursor-pointer shadow-md hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] disabled:opacity-50 flex items-center justify-center text-xs hover:scale-103 active:scale-97"
                  >
                    {saving ? "جاري الإدراج..." : "💾 حفظ عميل جديد"}
                  </button>

                  <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                    <div className="bg-[#050914] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2 px-4 rounded-xl shadow-2xl relative">
                      💾 حفظ وتثبيت كارت العميل الجديد في قاعدة البيانات 
                      <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#050914] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                    </div>
                  </div>
                </div>
                
                {/* 3. زر حفظ التعديلات الجارية */}
                <div className="relative group">
                  <button
                    type="button"
                    onClick={handleUpdateCustomer}
                    disabled={saving || !selectedCustomer}
                    className="h-11 bg-gradient-to-r from-emerald-600 to-teal-500 hover:shadow-[0_4px_15px_rgba(16,185,129,0.35)] text-white px-6 rounded-full font-black transition-all duration-300 cursor-pointer flex items-center justify-center text-xs hover:scale-103 active:scale-97"
                  >
                    {saving ? "جاري الحفظ..." : "✏️ حفظ التعديلات الجارية"}
                  </button>

                  <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                    <div className="bg-[#050914] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2 px-4 rounded-xl shadow-2xl relative">
                      💾 حفظ وتحديث التعديلات للعميل 
                      <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#050914] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            /* كارت التنبيه التوجيهي الشفاف */
            <div className="bg-[#07132a]/40 border border-dashed border-[#1f2d4d] rounded-2xl p-8 text-center select-none text-gray-500 text-xs">
              ⚠️ برجاء تحديد أحد العملاء من جدول المبيعات أعلاه لتنشيط التعديل، أو الضغط على أيقونة الإضافة لتأسيس كارت عميل جديد.
            </div>
          )}

        </div>
      </section>
    </main>
  );
}