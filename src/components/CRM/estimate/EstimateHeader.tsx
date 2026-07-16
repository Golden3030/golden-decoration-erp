"use client";

import React from "react";
import { useCRM } from "@/components/CRM/context/CRMContext";
import { User, MapPin, FileText, Sparkles } from "lucide-react";

export default function EstimateHeader() {
  const { crmData } = useCRM();

  const estimate = crmData?.estimate || {};
  const status = estimate.status || "مبدئية";
  const converted = !!estimate.convertedFromInitial;

  const customer = crmData.customer || {};
  const project = crmData.project || {};

  const formattedDate = estimate.date 
    ? new Date(estimate.date).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    : "جاري التوليد...";

  const formatNumber = (num: number) => num.toLocaleString("en-US");

  const activeUnitAddress = project.unitAddress || project.unit_address || project.location || "عنوان غير محدد";
  const activeFinishingLevel = project.finishingLevel || project.finishing_level || "كلاسيك فاخر";
  const activeCustomerCode = customer.customerCode || customer.customer_code || "CUST-XXXX";

  // 🌟 حسم الخلل المزدوج: استخدام الفحص الثنائي الصريح لمنع رسم كروت ميزانيات فارغة أو تالفة
  const showEstimateCard = !!project.estimatedMin && !!project.estimatedMax;

  return (
    <div dir="rtl" className="space-y-5 mb-6 text-right select-none font-sans">
      
      {converted && (
        <div className="bg-[#1b1c0b] border-2 border-[#D4AF37] rounded-xl p-4 text-center transition-all duration-300 shadow-[0_0_15px_rgba(212,175,55,0.08)]">
          <p className="text-[#D4AF37] font-black text-sm">
            ⚠️ تنبيه تعاقدي: تم تجميد هذه النسخة وتحويلها رسمياً، والاحتفاظ بمسودة الحسابات التاريخية لتوثيق بنود التعاقد الأصلية.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        <div className="bg-[#07132a] border-2 border-[#D4AF37]/40 rounded-2xl p-5 flex flex-col justify-between hover:border-[#D4AF37]/60 transition-all duration-300 shadow-lg">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#1f2d4d]/80 text-[#D4AF37]">
            <User className="w-5 h-5" />
            <span className="font-black text-xs md:text-sm tracking-wide">بيانات العميل المستهدف</span>
          </div>
          <div className="space-y-2 font-bold text-sm">
            <div>
              <span className="text-gray-400 text-[10px] block">اسم العميل</span>
              <span className="text-[#F0E6D2] font-black text-base">{customer.name || "عميل غير مسجل"}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#1f2d4d]/40">
              <div>
                <span className="text-gray-400 text-[10px] block">رقم الموبايل</span>
                <span className="text-white text-xs md:text-sm font-mono">{customer.mobile || "غير مسجل"}</span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] block">كود العميل الموحد</span>
                <span className="text-[#D4AF37] text-xs md:text-sm font-mono font-black">{activeCustomerCode}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#07132a] border-2 border-[#D4AF37]/40 rounded-2xl p-5 flex flex-col justify-between hover:border-[#D4AF37]/60 transition-all duration-300 shadow-lg">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#1f2d4d]/80 text-[#D4AF37]">
            <MapPin className="w-5 h-5" />
            <span className="font-black text-xs md:text-sm tracking-wide">الموقع والمواصفات المعمارية</span>
          </div>
          <div className="space-y-2 font-bold text-sm">
            <div>
              <span className="text-gray-400 text-[10px] block">عنوان المشروع المعتمد</span>
              <span className="text-[#F0E6D2] font-black text-sm truncate block">{activeUnitAddress}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#1f2d4d]/40">
              <div>
                <span className="text-gray-400 text-[10px] block">مساحة الوحدة الفعالة</span>
                <span className="text-white text-xs md:text-sm font-mono font-black">{project.area || 0} م²</span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] block">نوع الوحدة الإنشائية</span>
                <span className="text-white text-xs md:text-sm">{project.unitType || project.unit_type || "شقة سكنية"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#07132a] border-2 border-[#D4AF37]/40 rounded-2xl p-5 flex flex-col justify-between hover:border-[#D4AF37]/60 transition-all duration-300 shadow-lg">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#1f2d4d]/80 text-[#D4AF37]">
            <FileText className="w-5 h-5" />
            <span className="font-black text-xs md:text-sm tracking-wide">بيانات مستند المقايسة المرجعية</span>
          </div>
          <div className="space-y-2 font-bold text-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-gray-400 text-[10px] block">رقم وتدقيق المقايسة</span>
                <span className="text-[#F0E6D2] font-mono font-black text-base">{estimate.number || "EST-0001"}</span>
              </div>
              <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black ${
                status === "نهائية" 
                  ? "bg-[#D4AF37] text-black shadow-[0_0_10px_rgba(212,175,55,0.2)]" 
                  : "bg-[#243556] text-white"
              }`}>
                {status === "نهائية" ? "🔒 نهائية معتمدة" : "✍️ مبدئية قيد التعديل"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#1f2d4d]/40">
              <div>
                <span className="text-gray-400 text-[10px] block">تاريخ الإصدار والتوثيق</span>
                <span className="text-white text-[11px] block mt-0.5 font-bold leading-5">{formattedDate}</span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] block">الباقة ومستوى التشطيب</span>
                <span className="text-[#D4AF37] text-xs md:text-sm font-black">{activeFinishingLevel}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {showEstimateCard && (
        <div className="p-4 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-[#D4AF37]/35 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-500 shadow-sm">
          <div className="text-right">
            <span className="text-xs text-gray-400 block font-bold flex items-center gap-1.5 select-none">
              <Sparkles className="text-[#D4AF37] w-4 h-4 animate-pulse" /> ميزانية العميل التقديرية المعتمدة بالعقد المبدئي:
            </span>
            <span className="text-base font-black block mt-1 text-[#F0E6D2]">
              من {formatNumber(Number(project.estimatedMin))} إلى {formatNumber(Number(project.estimatedMax))} ج.م
            </span>
          </div>
          <span className="px-3 py-1 rounded bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 text-[10px] font-black">مقايسة موثقة تفاعلياً ✓</span>
        </div>
      )}

    </div>
  );
}