"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

import QuickPricesCard from "@/components/CRM/settings/QuickPricesCard";
import BomSimulator from "@/components/CRM/settings/BomSimulator";
import BomSettings from "@/components/CRM/settings/BomSettings";
import LaborSettings from "@/components/CRM/settings/LaborSettings";
import CuttingTab from "@/components/CRM/settings/CuttingTab";
import GoldButton from "@/components/ui/GoldButton";

export default function SettingsPage() {
  const [tab, setTab] = useState<"sim" | "coeffs" | "labor" | "cutting" | "prices">("sim");

  useEffect(() => {
    document.title = "حصر الكميــات | Golden Decoration";
  }, []);

  return (
    <main className="min-h-screen flex bg-[#020B1C] relative overflow-hidden font-alexandria" dir="rtl">
      <Sidebar />

      {/* تنسيق شريط التمرير الذهبي */}
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
        
        .overflow-y-auto {
          scrollbar-width: thin !important;
          scrollbar-color: #D4AF37 #020B1C !important;
        }
      `}} />

      <section className="flex-1 flex flex-col lg:pr-sidebar m-0 min-h-screen">
        <Header />
        <div className="p-4 md:p-8 space-y-6 text-right select-none animate-fade-in">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-[#D4AF37] flex items-center gap-2 select-none">
              <span>حصر الكميات: المحاكي والمعاملات الفنية</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-pulse" />
            </h1>
            <p className="text-white text-xs mt-2 font-semibold">إدارة الثوابت الحسابية ومعاملات حصر الكميات الهندسية والمصنعيات للتحكم الفوري ببنود ومقايسات الـ BOQ.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 select-none">
            <GoldButton toggle size="fill" active={tab === "sim"} onClick={() => setTab("sim")}>محاكي الحصر الفوري</GoldButton>
            <GoldButton toggle size="fill" active={tab === "coeffs"} onClick={() => setTab("coeffs")}>ضبط المعاملات الفنية</GoldButton>
            <GoldButton toggle size="fill" active={tab === "labor"} onClick={() => setTab("labor")}>المصنعيات</GoldButton>
            <GoldButton toggle size="fill" active={tab === "cutting"} onClick={() => setTab("cutting")}>محاكي القص</GoldButton>
            <GoldButton toggle size="fill" active={tab === "prices"} onClick={() => setTab("prices")}>أسعار التقدير السريع</GoldButton>
          </div>

          {tab === "sim" && <BomSimulator />}
          {tab === "coeffs" && <BomSettings />}
          {tab === "labor" && <LaborSettings />}
          {tab === "cutting" && <CuttingTab />}
          {tab === "prices" && <QuickPricesCard />}
        </div>
      </section>
    </main>
  );
}