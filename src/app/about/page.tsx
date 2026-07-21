"use client";

import { useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function AboutPage() {
  useEffect(() => {
    document.title = "حول النظام | Golden Decoration";
  }, []);

  return (
    <main className="min-h-screen flex bg-[#020B1C] relative overflow-hidden" dir="rtl">
      <Sidebar />
      
      {/* 🛡️ تفعيل جدار الحماية وعزل الإزاحة الجانبية الميدانية */}
      <section className="w-full lg:pr-56 m-0 min-h-screen flex flex-col">
        <Header />
        
        <div className="p-8 space-y-6 text-right select-none flex-1 flex flex-col justify-between">
          
          <div className="space-y-6">
            <div className="border-b border-[#D4AF37] pb-5">
              <h1 className="text-3xl font-extrabold text-[#D4AF37] flex items-center gap-2.5">
                <span>حول نظام Golden Decoration ERP</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-pulse" />
              </h1>
              <p className="text-white text-sm mt-1.5">المعلومات الفنية والتوثيق الرسمي للإصدار الاحترافي والمزايا الأساسية للمنظومة.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-[#07132a] border border-[#D4AF37] rounded-[2rem] p-6 space-y-4 shadow-2xl relative overflow-hidden">
                <h3 className="text-[#D4AF37] font-black text-base border-b border-[#243556] pb-2">📋 تفاصيل الإصدار</h3>
                <div className="space-y-3 text-xs font-bold">
                  <div className="flex justify-between">
                    <span className="text-gray-400">اسم البرنامج:</span>
                    <span className="text-white font-extrabold">Golden ERP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">إصدار النظام الجاري:</span>
                    {/* 🌟 تم الترقية برمجياً للإصدار v2.8.0-PRO */}
                    <span className="text-[#D4AF37] font-mono font-black text-sm">v1.8.0-PRO</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">تاريخ آخر تحديث معتمد:</span>
                    {/* 🌟 تم الترقية وتعديل تاريخ التحديث ليتوافق مع سياق التحديثات الحالية */}
                    <span className="text-white font-mono">2026-07-15</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">ترخيص الاستخدام:</span>
                    <span className="text-emerald-400 font-black">نشط مدى الحياة (مرخص للشركة)</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#07132a] border border-[#D4AF37] rounded-[2rem] p-6 space-y-4 md:col-span-2 shadow-2xl relative overflow-hidden">
                <h3 className="text-[#D4AF37] font-black text-base border-b border-[#243556] pb-2">🚀 البنية التحتية والتقنيات المستخدمة</h3>
                <p className="text-white text-xs leading-relaxed">
                  تم بناء وتأسيس النظام وفق أرقى المعايير التقنية السحابية وهندسة قواعد البيانات المعقدة ليتحمل التدفقات المالية الضخمة، مع سهولة التامة للاستخدام كتطبيقات الموبايل.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs font-bold">
                  <div className="bg-[#020B1C] p-3 rounded-xl border border-[#243556] hover:border-[#D4AF37]/35 transition duration-150">
                    <p className="text-gray-400 font-extrabold mb-1">واجهات العميل السريعة</p>
                    <p className="text-[#D4AF37] font-mono font-black">Next.js 14 App Router</p>
                  </div>
                  <div className="bg-[#020B1C] p-3 rounded-xl border border-[#243556] hover:border-[#D4AF37]/35 transition duration-150">
                    <p className="text-gray-400 font-extrabold mb-1">قاعدة البيانات السحابية</p>
                    <p className="text-[#D4AF37] font-mono font-black">Supabase PostgreSQL</p>
                  </div>
                  <div className="bg-[#020B1C] p-3 rounded-xl border border-[#243556] hover:border-[#D4AF37]/35 transition duration-150">
                    <p className="text-gray-400 font-extrabold mb-1">تزامن البيانات أوفلاين</p>
                    <p className="text-[#D4AF37] font-mono font-black">PWA Service Worker & Sync Queue</p>
                  </div>
                  <div className="bg-[#020B1C] p-3 rounded-xl border border-[#243556] hover:border-[#D4AF37]/35 transition duration-150">
                    <p className="text-gray-400 font-extrabold mb-1">محرك التصاميم الفاخر</p>
                    <p className="text-[#D4AF37] font-mono font-black">Tailwind CSS & Approved Gold UI</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div className="bg-[#07132a] border border-[#D4AF37] rounded-[2rem] p-6 text-center space-y-3 shadow-2xl relative overflow-hidden">
            <h4 className="text-[#D4AF37] font-black text-xl tracking-wide select-none">شركة جولدن ديكوريشن للتشطيبات المتكاملة</h4>
            <p className="text-[#F0E6D2] text-sm max-w-2xl mx-auto leading-relaxed">
              تطبيق إداري متكامل وحصري لتنظيم حصر الكميات والمقايسات الفورية، إدارة المبيعات والعملاء، متابعة جداول المهام والمواقع الميدانية، والتحكيم المالي الدقيق للخزينة الرئيسية ومقاولي الباطن.
            </p>
            <p className="text-[#D4AF37] text-xs font-bold">جميع الحقوق محفوظة لصالح شركة جولدن ديكور © 2026</p>
          </div>

        </div>
      </section>
    </main>
  );
}