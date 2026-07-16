"use client";

import { useState, useEffect } from "react";
import { useCRM } from "@/components/CRM/context/CRMContext";
import { supabase } from "@/lib/supabaseClient";
import { ShieldCheck, RotateCcw, Printer } from "lucide-react";
import EstimateHeader from "./EstimateHeader";
import EstimateTotals from "./EstimateTotals";
import EstimateTable from "./EstimateTable";

interface FinalEstimateProps {
  userRole?: string;
}

export default function FinalEstimate({ userRole = "" }: FinalEstimateProps) {
  const { crmData, revertEstimateToInitial } = useCRM();
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const estimate = crmData?.estimate || {};
  const frozenItems = estimate.items || [];

  // 🔒 صمام الأمان الإداري: يُسمح فقط للمديرين والمالك برؤية زر التراجع عن التجميد وإلغاء القفل
  const isAuthorizedToUnlock = ["admin", "owner", "manager"].includes(String(userRole).toLowerCase());

  const handleRevertToInitial = async () => {
    if (!isAuthorizedToUnlock) {
      alert("🛑 محاولة مرفوضة: إلغاء قفل المقايسة المعتمدة تعاقدياً من صلاحية الإدارة العليا فقط.");
      return;
    }

    const confirmFreeze = window.confirm(
      "⚠️ تنبيه إداري صارم وجنائي:\n\nتأكيد تراجعك عن التجميد التعاقدي سيؤدي إلى فتح الـ 14 تابة لإمكانية التعديل يدوياً من جديد ومسح النسخة التاريخية.\n\nهل تريد تأكيد إلغاء القفل والتحرير الكامل؟"
    );
    if (!confirmFreeze) return;

    setIsSaving(true);
    try {
      await revertEstimateToInitial();
    } catch (err: any) {
      console.error("خطأ تراجع ومسح المقايسة المجمدة:", err);
      alert("حدث خطأ غير متوقع أثناء محاولة مسح بيانات السيرفر: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div dir="rtl" className="space-y-8 text-right">
      <div className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-2xl bg-[#020B1C] border border-[#D4AF37] relative overflow-hidden shadow-[0_0_15px_rgba(212,175,55,0.08)]">
        {isSaving && (
          <div className="absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent animate-pulse" />
        )}

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37] text-[#D4AF37]">
            <ShieldCheck className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#D4AF37]">مقايسة تعاقدية معتمدة ومجمدة رسمياً</h3>
            <p className="text-xs text-gray-400 mt-1">لقطة حسابية ثابتة مغلقة تماماً ومحفوظة تلقائياً في السيرفر لحماية حقوق الطرفين من تغير الأسعار</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-[#07132a] border border-[#1f2d4d] hover:border-[#D4AF37] text-gray-300 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة العقد (PDF)</span>
          </button>

          {/* 🔒 لا يظهر هذا الزر المخصص للتعديل التعاقدي نهائياً لحسابات السيلز أو المهندسين لمنع التجاوزات */}
          {isAuthorizedToUnlock && (
            <button
              onClick={handleRevertToInitial}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-[#07132a] border border-red-500 hover:bg-red-500 hover:text-white text-red-500 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              <span>🔓 إلغاء القفل والتحرير الكامل</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-8 animate-fade-in">
        <EstimateHeader />
        <EstimateTable items={frozenItems} isEditable={false} />
        {/* 🌟 تم التعديل هنا: استدعاء نظيف ومباشر متوافق مع حقل الحسابات الموحد للـ BOQ */}
        <EstimateTotals />
      </div>
    </div>
  );
}