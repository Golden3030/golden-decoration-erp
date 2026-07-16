"use client";
import React, { useState, useEffect } from 'react';
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

  // 🌟 معالجة الصلاحيات بالخلفية لتمكين الملاك والمديرين من فك تجميد المقايسات تعاقدياً من لوحة الـ CRM
  const [userRole, setUserRole] = useState<string>("sales");

  useEffect(() => {
    loadCurrentUserRole();
  }, []);

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
      title: "🚧 مرحلة التوزيع والهيكل الإنشائي",
      items: [
        { label: "توزيع المساحات", emoji: "📐" },
        { label: "تعديل معماري", emoji: "🔨" },
        { label: "أعمال مباني", emoji: "🧱" }
      ]
    },
    {
      title: "🛠️ مرحلة التأسيس الفني والحراري",
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
      title: "✨ مرحلة الكسوة والتشطيب والديكور الفاخر",
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
    <div 
      dir="rtl" 
      className="bg-[#07132a] border border-[#D4AF37]/25 rounded-2xl p-6 shadow-2xl transition-all duration-300 hover:border-[#D4AF37]/45 text-right font-alexandria"
    >
      
      {/* تم تحويل الرأس بالكامل ليتمركز بكسلياً في المنتصف المطلق للكارت بنسق متزن وملك فخم */}
      <div className="flex flex-col items-center justify-center border-b border-[#D4AF37]/15 pb-4 mb-6 text-center w-full select-none">
        <h2 className="text-[#D4AF37] text-xl md:text-2xl font-black flex items-center justify-center gap-2 leading-none">
          <span>مواصفات وتفاصيل مراحل التشطيب الفاخرة</span>
          <span className="text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">⚜️</span>
        </h2>
      </div>

      <div className="space-y-6 mb-8 select-none">
        {groups.map((group, groupIdx) => (
          <div key={groupIdx} className="p-4 rounded-xl bg-[#020B1C]/50 border border-[#1f2d4d]/60 space-y-3">
            <span className="text-xl md:text-xl text-[#D4AF37] tracking-wider block">{group.title}</span>
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
                    className={`px-4.5 py-3 rounded-xl transition-all duration-300 cursor-pointer text-[10px] md:text-sm shadow-md border flex items-center gap-1.5 ${
                      isCurrent
                        ? "bg-gradient-to-r from-[#D4AF37] via-[#F0E6D2] to-[#D4AF37] text-[#020B1C] border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.3)] scale-[1.03] font-black"
                        : "bg-[#07132a] text-white border-[#1f2d4d] hover:border-[#D4AF37]/50 hover:bg-[#020B1C] hover:text-[#D4AF37]"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="text-base">{tab.emoji}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#020B1C]/80 border border-[#1f2d4d] rounded-2xl p-6 shadow-inner transition duration-150">
        
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
            ? <FinalEstimate userRole={userRole} />  // 🌟 تم تعديل التمرير هنا لضمان فتح الـ 14 تابة للمدير
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
            <div className="text-center text-[#F0E6D2] py-20 text-xl font-bold select-none animate-pulse">
              جاري مزامنة وتجهيز مواصفات التشطيب المعتمدة ...
            </div>
          )}

      </div>
    </div>
  );
}