"use client";

import { useCRM } from "@/components/CRM/context/CRMContext";
import { Loader2, UserCheck, Calendar } from "lucide-react";

// تعريف الخصائص الصارمة المطلوبة للتوافق التام مع شاشة الـ CRM الكبرى
interface CustomerInfoProps {
  userRole: string;
  handleSaveCustomer: () => Promise<void>;
  saving: boolean;
}

export default function CustomerInfo({ userRole, handleSaveCustomer, saving }: CustomerInfoProps) {
  const { crmData, setCRMData, isLocked } = useCRM();

  const customer = crmData.customer || {};

  function handleChange(field: string, value: string) {
    setCRMData((prev: any) => ({
      ...prev,
      customer: {
        ...(prev.customer || {}),
        [field]: value
      }
    }));
  }

  // معالجة وتنسيق تاريخ التسجيل السحابي باللغة العربية بدقة وأمان
  const rawDate = customer.created_at || customer.createdAt;
  const formattedDate = rawDate 
    ? new Date(rawDate).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })
    : "قيد المزامنة السحابية...";

  return (
    <div className="bg-[#07132a] border border-[#D4AF37] rounded-2xl p-6 space-y-5 select-none text-right text-white font-alexandria" dir="rtl">
      
      {/* ترويسة الكارت الفاخرة بالذهب الإمبراطوري #D4AF37 وأيقونة Lucide الرسمية */}
      <h3 className="text-[#D4AF37] text-sm md:text-base font-black border-b border-[#D4AF37] pb-3 flex items-center gap-2 select-none">
        <UserCheck className="w-5 h-5 text-[#D4AF37] shrink-0" />
        <span>بيانات ملف العميل الأساسية</span>
      </h3>

      <div className="grid grid-cols-2 gap-4 text-xs">
        
        {/* الصف الأول: البيانات المرجعية المولدة سحابياً تلقائياً */}
        <div>
          <label className="block text-gray-500 mb-1.5 font-bold text-[10px]">كود العميل (تلقائي)</label>
          <input
            type="text"
            value={customer.customerCode || "سيتم توليده تلقائيا"}
            disabled
            className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/35 text-gray-500 px-4 outline-none font-mono text-center font-bold text-xs"
          />
        </div>

        {/* حقل تاريخ التسجيل السحابي الجديد المنسق */}
        <div>
          <label className="block text-gray-500 mb-1.5 font-bold text-[10px]">تاريخ التسجيل بالنظام (تلقائي)</label>
          <input
            type="text"
            value={formattedDate}
            disabled
            className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/35 text-gray-500 px-4 outline-none text-center font-bold text-xs"
          />
        </div>

        {/* الصف الثاني: حقل الاسم ممتد بالكامل col-span-2 ليتسع لأسماء عملاء النخبة الطويلة */}
        <div className="col-span-2">
          <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px]">اسم العميل *</label>
          <input
            type="text"
            disabled={isLocked}
            value={customer.name || ""}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-4 outline-none focus:border-[#D4AF37] font-semibold text-xs disabled:opacity-40"
          />
        </div>

        {/* الصف الثالث: الهواتف وأرقام المحمول */}
        <div>
          <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px]">رقم الموبايل *</label>
          <input
            type="text"
            disabled={isLocked}
            value={customer.mobile || ""}
            onChange={(e) => handleChange("mobile", e.target.value)}
            className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-4 outline-none font-mono font-semibold text-xs disabled:opacity-40"
          />
        </div>

        <div>
          <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px]">رقم اخر ان وجد</label>
          <input
            type="text"
            disabled={isLocked}
            value={customer.phone || ""}
            onChange={(e) => handleChange("phone", e.target.value)}
            className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-4 outline-none font-mono font-semibold text-xs disabled:opacity-40"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px]">عنوان  العميل</label>
          <input
            type="text"
            disabled={isLocked}
            value={customer.address || ""}
            onChange={(e) => handleChange("address", e.target.value)}
            className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-4 outline-none focus:border-[#D4AF37] font-semibold text-xs disabled:opacity-40"
          />
        </div>

        <div className="col-span-2">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[#D4AF37] font-bold block text-[10px]">البريد الإلكتروني للعميل</span>
            <span className="text-gray-500 font-bold font-mono text-[9px]">Email</span>
          </div>
          <input
            type="email"
            disabled={isLocked}
            value={customer.email || ""}
            onChange={(e) => handleChange("email", e.target.value)}
            className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-3 outline-none focus:border-[#D4AF37] font-mono text-left font-semibold text-xs disabled:opacity-40"
            style={{ direction: "ltr" }}
            placeholder="example@email.com"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px]">حالة حساب العميل الجارية بالـ CRM</label>
          <select
            disabled={isLocked}
            value={customer.status || "جديد"}
            onChange={(e) => handleChange("status", e.target.value)}
            className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] font-bold px-3 outline-none cursor-pointer text-xs disabled:opacity-40 focus:border-[#D4AF37]"
          >
            <option>جديد</option>
            <option>متابعة مستمرة</option>
            <option>قيد انتظار التسعير</option>  
            <option>تم إصدار المقايسة</option>
            <option>تم التعاقد</option>
            <option>مؤجل</option>
            <option>ملغي</option>
          </select>
        </div>

      </div>

      {/* زر الحفظ اللمسي المذهب الفاخر الموحد بتأثيرات الإزاحة والنيون */}
      <div className="pt-3 border-t border-[#D4AF37] flex justify-end select-none">
        <button
          onClick={handleSaveCustomer}
          disabled={saving}
          className="bg-black/60 hover:bg-[#D4AF37] border-2 border-[#D4AF37] text-[#D4AF37] hover:text-[#020B1C] py-2.5 px-6 rounded-full text-xs font-black cursor-pointer transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-1.5 hover:translate-y-[-2px] hover:shadow-[0_0_15px_rgba(212,175,55,0.45)]"
        >
          {saving ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : "💾 حفظ ومزامنة ملف العميل"}
        </button>
      </div>

    </div>
  );
}