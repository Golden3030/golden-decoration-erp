"use client";

import { useState } from "react";
import AddProductModal from "./AddProductModal"; // استيراد موديل إضافة المنتجات

export default function QuickActions() {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-4 mb-8" dir="rtl">
      
      {/* 1. زر إضافة منتج أو خامة جديدة الموصول بالـ Modal */}
      <button
        onClick={() => setIsProductModalOpen(true)}
        className="cursor-pointer bg-[#c9a227] hover:bg-[#F0E6D2] hover:text-black text-black font-bold px-6 py-3 rounded-xl transition-all h-12 text-sm flex items-center gap-2"
      >
        ➕ إضافة منتج / خامة جديدة للتسعير
      </button>

      {/* 2. زر إضافة مقايسة جديدة المدمج */}
      <button
        onClick={() => alert("سيتم فتح شاشة إنشاء مقايسة مالية جديدة.")}
        className="cursor-pointer bg-[#c9a227] hover:bg-[#F0E6D2] hover:text-black text-black font-bold px-6 py-3 rounded-xl transition-all h-12 text-sm flex items-center gap-2"
      >
        ➕ إضافة مقايسة جديدة
      </button>

      {/* 3. زر إضافة دفعة مالية جديدة المدمج */}
      <button
        onClick={() => alert("سيتم فتح شاشة تحصيل الدفعات المالية للخزينة.")}
        className="cursor-pointer bg-[#c9a227] hover:bg-[#F0E6D2] hover:text-black text-black font-bold px-6 py-3 rounded-xl transition-all h-12 text-sm flex items-center gap-2"
      >
        ➕ إضافة دفعة جديدة
      </button>

      {/* شاشة إضافة منتج منبثقة تفاعلية */}
      {isProductModalOpen && (
        <AddProductModal onClose={() => setIsProductModalOpen(false)} />
      )}

    </div>
  );
}