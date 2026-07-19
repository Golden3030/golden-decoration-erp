"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from "./context/CRMContext";
import { supabase } from "@/lib/supabaseClient";
import InitialEstimate from "./estimate/InitialEstimate";
import Plaster from "./Finishing/Plaster";
import Paint from "./Finishing/Paint";
import Flooring from "./Finishing/Flooring";
import Ceiling from "./Finishing/Ceiling";
import Doors from "./Finishing/Doors";
import Aluminum from "./Finishing/Aluminum";
import Electricity from "./Finishing/Electricity";
import Plumbing from "./Finishing/Plumbing";
import AC from "./Finishing/AC";
import Decorations from "./Finishing/Decorations";
import Areas from "./Finishing/Areas";
import ArchMod from "./Finishing/ArchMod";
import Masonry from "./Finishing/Masonry";
import Ventilation from "./Finishing/Ventilation";
import Staircase from "./Finishing/Staircase";
import FinalEstimate from "./estimate/FinalEstimate";

export default function FinishingTabs() {
  const { crmData, setCRMData } = useCRM();

  const projectId = crmData?.project?.id || crmData?.project?.uuid || crmData?.projectId || "";

  const active = crmData.activeTab || "توزيع المساحات";

  // مرجع للانتقال المباشر للتاب المختار فور الضغط
  const contentRef = useRef<HTMLDivElement>(null);

  // معالجة الصلاحيات بالخلفية لتمكين الملاك والمديرين من فك تجميد المقايسات تعاقدياً
  const [userRole, setUserRole] = useState<string>("sales");

  useEffect(() => {
    loadCurrentUserRole();
  }, []);

  // مراقبة تغيير التبويب المختار للانتقال التلقائي والتركيز البصري
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [active]);

  async function loadCurrentUserRole() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile && profile.role) {
        setUserRole(String(profile.role).toLowerCase());
      }
    } catch (err) {
      console.error("فشل جلب رتبة المستخدم لتفعيل صلاحية التعديل للمقايسة المعتمدة:", err);
    }
  }

  const groups = [
    {
      title: "مرحلة التوزيع والهيكل الإنشائي",
      emoji: "🚧",
      items: [
        { label: "توزيع المساحات", emoji: "📐" },
        { label: "تعديل معماري", emoji: "🔨" },
        { label: "أعمال مباني", emoji: "🧱" }
      ]
    },
    {
      title: "مرحلة التأسيس الفني والحراري",
      emoji: "🛠️",
      items: [
        { label: "أعمال المحارة", emoji: "🧱" },
        { label: "الكهرباء", emoji: "🔌" },
        { label: "السباكة", emoji: "🚿" },
        { label: "السقف المعلق", emoji: "🪵" },
        { label: "التكييف", emoji: "❄️" },
        { label: "أعمال شفاطات", emoji: "💨" }
      ]
    },
    {
      title: "مرحلة الكسوة والتشطيب والديكور الفاخر",
      emoji: "✨",
      items: [
        { label: "الأبواب", emoji: "🚪" },
        { label: "الشبابيك", emoji: "🪟" },
        { label: "سلم داخلي", emoji: "🪜" },
        { label: "الأرضيات", emoji: "✨" },
        { label: "الدهانات", emoji: "🎨" },
        { label: "الديكورات", emoji: "👑" },
        { label: "المقايسة", emoji: "💼" }
      ]
    }
  ];

  return (
    /* 🌟 الكارت الرئيسي بنمط الأونيكس الداكن مذهب الأطراف */
    <div 
      dir="rtl" 
      className="bg-gradient-to-br from-[#07132a] via-[#040e20] to-[#020B1C] border-2 border-[#D4AF37]/30 rounded-[2.5rem] p-8 shadow-2xl transition-all duration-300 hover:border-[#D4AF37]/50 text-right font-alexandria"
    >
      
      {/* رأس الكارت متمركز بصرياً وبكسلياً كشعار العائلة الملكية */}
      <div className="flex flex-col items-center justify-center border-b border-[#D4AF37] pb-5 mb-6 text-center w-full select-none">
        <h2 className="text-[#D4AF37] text-lg md:text-xl font-black flex items-center justify-center gap-3 leading-none tracking-wide">
          <span>مواصفات وتفاصيل مراحل التشطيب الفاخرة</span>
          <span className="text-[#D4AF37] drop-shadow-[0_0_12px_rgba(212,175,55,0.6)]">⚜️</span>
        </h2>
      </div>

      {/* حاوية المراحل المضيئة */}
      <div className="space-y-4 mb-8 select-none">
        {groups.map((group, groupIdx) => (
          <div key={groupIdx} className="p-4 rounded-3xl bg-[#020B1C]/40 border border-[#1f2d4d]/60 space-y-3 shadow-inner">
            
            {/* 🌟 ترويسة إمبراطورية لكل مرحلة من المراحل الإنشائية */}
            <div className="flex items-center gap-2 border-b border-[#1f2d4d]/30 pb-2 mb-2">
              <span className="w-1.5 h-3.5 bg-[#D4AF37] rounded-full inline-block shadow-[0_0_8px_#D4AF37]" />
              <span className="text-xs font-bold text-gray-400 block">{group.emoji}</span>
              <span className="text-lg text-[#D4AF37] drop-shadow-[0_0_12px_rgba(212,175,55,0.6)] font-bold block pr-2">{group.title}</span>
            </div>

            <div className="flex flex-wrap gap-2.5 justify-start">
              {group.items.map((tab) => {
                const isCurrent = active === tab.label;
                return (
                  <button
                    key={tab.label}
                    onClick={() =>
                      setCRMData({
                        ...crmData,
                        activeTab: tab.label
                      })
                    }
                    className={`px-5 py-3 rounded-2xl transition-all duration-300 cursor-pointer text-xs md:text-sm shadow-xl border relative overflow-hidden flex items-center gap-2.5 select-none ${
                      isCurrent
                        ? "bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.3)] scale-[1.03] font-black"
                        : "bg-[#07132a] text-white border-[#1f2d4d] hover:border-[#D4AF37]/50 hover:bg-[#020B1C] hover:text-[#D4AF37] hover:scale-[1.01]"
                    }`}
                  >
                    {/* نبضة نيون ذهبية صغيرة تظهر بجانب الخيار النشط */}
                    {isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_6px_#D4AF37] animate-pulse" />
                    )}

                    <span className="text-xs font-bold leading-none">{tab.label}</span>
                    <span className="text-sm filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">{tab.emoji}</span>

                    {/* 🌟 خط نيون سفلي متدرج يشع بنعومة ومطابق لشاشات اللمس الفارهة */}
                    {isCurrent && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)] animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* حاوية عرض المكونات الفعالة مع دمج مرجع التركيز البصري التلقائي وهامش الإزاحة */}
      <div 
        ref={contentRef} 
        className="bg-[#020B1C]/80 border border-[#1f2d4d] rounded-3xl p-6 shadow-inner transition duration-150 scroll-mt-10"
      >
        
        {active === "توزيع المساحات" && <Areas />}

        {active === "تعديل معماري" && <ArchMod projectId={projectId} />}

        {active === "أعمال مباني" && <Masonry projectId={projectId} />}

        {active === "أعمال المحارة" && <Plaster projectId={projectId} />}

        {active === "الكهرباء" && <Electricity projectId={projectId} />}

        {active === "السباكة" && <Plumbing projectId={projectId} />}

        {active === "السقف المعلق" && <Ceiling projectId={projectId} />}

        {active === "التكييف" && <AC projectId={projectId} />}

        {active === "أعمال شفاطات" && <Ventilation projectId={projectId} />}

        {active === "الأبواب" && <Doors projectId={projectId} />}

        {active === "الشبابيك" && <Aluminum projectId={projectId} />}

        {active === "سلم داخلي" && <Staircase projectId={projectId} />}

        {active === "الأرضيات" && <Flooring />}

        {active === "الدهانات" && <Paint projectId={projectId} />}

        {active === "الديكورات" && <Decorations projectId={projectId} />}

        {active === "المقايسة" && (
          crmData.estimate?.status === "نهائية" 
            ? <FinalEstimate userRole={userRole} />  
            : <InitialEstimate />
        )}

        {active !== "توزيع المساحات" &&
          active !== "تعديل معماري" &&
          active !== "أعمال مباني" &&
          active !== "أعمال المحارة" &&
          active !== "الكهرباء" &&
          active !== "السباكة" &&
          active !== "السقف المعلق" &&
          active !== "التكييف" &&
          active !== "أعمال شفاطات" &&
          active !== "الأبواب" &&
          active !== "الشبابيك" &&
          active !== "سلم داخلي" &&
          active !== "الأرضيات" &&
          active !== "الدهانات" &&
          active !== "الديكورات" &&
          active !== "المقايسة" && (
            <div className="text-center text-[#D4AF37] py-20 text-xl font-bold select-none animate-pulse">
              جاري مزامنة وتجهيز مواصفات التشطيب المعتمدة ...
            </div>
          )}

      </div>
    </div>
  );
}