"use client";

import { useCRM } from "@/components/CRM/context/CRMContext";
import { Loader2, UserCheck } from "lucide-react";

// تعريف الخصائص الصارمة المطلوبة للتوافق التام مع شاشة الـ CRM الكبرى
interface CustomerInfoProps {
  userRole: string;
  handleSaveCustomer: () => Promise<void>;
  saving: boolean;
  calculatorEstimate: {min: number; max: number} | null; // تمرير تقديرات الحاسبة للعميل النشط
}

export default function CustomerInfo({ userRole, handleSaveCustomer, saving, calculatorEstimate }: CustomerInfoProps) {
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
    <div className="bg-[#07132a] border-2 border-[#D4AF37] rounded-[2rem] p-6 space-y-5 select-none text-right text-white font-alexandria h-full flex flex-col justify-between" dir="rtl">
      
      <div className="space-y-5">
        {/* ترويسة الكارت الفاخرة بالذهب الإمبراطوري #D4AF37 وأيقونة Lucide الرسمية */}
        <h3 className="text-[#D4AF37] text-sm md:text-base font-bold border-b border-[#D4AF37] pb-3 flex  gap-2 select-none">
          <UserCheck className="w-5 h-5 text-[#D4AF37] shrink-0" />
          <span>بيانات ملف العميل الأساسية والميزانيات المعتمدة</span>
        </h3>

        <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
          
          {/* الصف الأول: البيانات المرجعية المولدة سحابياً تلقائياً */}
          <div>
            <label className="block text-gray-500 mb-1.5 font-bold text-[10px]">كود العميل (تلقائي)</label>
            <input
              type="text"
              value={customer.customerCode || "سيتم توليده تلقائيا"}
              disabled
              className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-gray-500 px-4 outline-none font-mono text-center font-bold text-xs"
            />
          </div>

          {/* حقل تاريخ التسجيل السحابي الجديد المنسق */}
          <div>
            <label className="block text-gray-500 mb-1.5 font-bold text-[10px]">تاريخ التسجيل بالنظام (تلقائي)</label>
            <input
              type="text"
              value={formattedDate}
              disabled
              className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-gray-500 px-4 outline-none text-center font-bold text-xs"
            />
          </div>

          {/* الاسم */}
          <div className="col-span-2">
            <label className="block text-[#D4AF37] mb-1.5 font-bold px-2 text-[12px]">اسم العميل *</label>
            <input
              type="text"
              disabled={isLocked}
              value={customer.name || ""}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-4 outline-none focus:border-[#D4AF37] font-semibold text-xs disabled:opacity-40"
            />
          </div>

          {/* أرقام الهواتف والموبايل */}
          <div>
            <label className="block text-[#D4AF37] mb-1.5 font-bold px-2 text-[12px]">رقم الموبايل *</label>
            <input
              type="text"
              disabled={isLocked}
              value={customer.mobile || ""}
              onChange={(e) => handleChange("mobile", e.target.value)}
              className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-center text-white px-4 outline-none font-mono font-semibold text-xs disabled:opacity-40"
            />
          </div>

          <div>
            <label className="block text-[#D4AF37] mb-1.5 font-bold px-2 text-[12px]">رقم موبايل اخر</label>
            <input
              type="text"
              disabled={isLocked}
              value={customer.phone || ""}
              onChange={(e) => handleChange("phone", e.target.value)}
              className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-center text-white px-4 outline-none font-mono font-semibold text-xs disabled:opacity-40"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-[#D4AF37] mb-1.5 font-bold px-2 text-[12px]">عنوان العميل</label>
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
              <span className="text-[#D4AF37] font-bold block px-2 text-[12px]">البريد الإلكتروني للعميل</span>
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
            <label className="block text-[#D4AF37] mb-1.5 font-bold px-2 text-[12px]">حالة حساب العميل الجارية بالـ CRM</label>
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

          {/* 🌟 تم التحديث هنا: تفتيت وفصل تقدير الحاسبة إلى خانتين من وإلى بالعملة الرسمية */}
          <div className="col-span-2">
            <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px]">تقدير ميزانية التشطيب (تلقائي)</label>
            {calculatorEstimate ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-500 mb-1.5 font-bold px-2 text-[12px]">الحد الأدنى (من)</label>
                  <div className="w-full h-11 rounded-xl bg-[#020B1C] border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-black text-xs shadow-inner">
                    {calculatorEstimate.min.toLocaleString('en-US')} ج.م
                  </div>
                </div>
                <div>
                  <label className="block text-gray-500 mb-1.5 font-bold px-2 text-[12px]">الحد الأقصى (إلى)</label>
                  <div className="w-full h-11 rounded-xl bg-[#020B1C] border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-black text-xs shadow-inner">
                    {calculatorEstimate.max.toLocaleString('en-US')} ج.م
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-gray-500 flex items-center justify-center text-[10px] font-bold select-none">
                — لم تُستخدم الحاسبة للتقدير التلقائي —
              </div>
            )}
          </div>

        </div>
      </div>

      {/* زر الحفظ الإمبراطوري المتطابق مع الفخامة الأرستقراطية لـ FinishingTabs وعواكس الإضاءة النيونية السفلى */}
      <div className="pt-3 border-t border-[#D4AF37]/20 flex justify-end select-none">
        <button
          type="button" 
          onClick={(e) => { e.preventDefault(); handleSaveCustomer(); }}
          disabled={saving}
          className="w-full h-11 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.01] active:scale-95 transition-all duration-300 font-black cursor-pointer text-xs flex items-center justify-center gap-1.5 select-none relative overflow-hidden disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : "💾 حفظ ومزامنة ملف العميل"}
          <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
        </button>
      </div>

    </div>
  );
}