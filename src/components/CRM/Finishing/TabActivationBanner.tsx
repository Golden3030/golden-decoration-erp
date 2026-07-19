"use client";

import React from "react";
import { LucideIcon, CheckCircle, Circle } from "lucide-react";

interface TabActivationBannerProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  enabled: boolean;
  onToggle: () => void;
}

export default function TabActivationBanner({
  title,
  subtitle,
  icon: Icon,
  enabled,
  onToggle,
}: TabActivationBannerProps) {
  return (
    <div
      onClick={onToggle}
      className={`h-24 w-full rounded-2xl border transition-all duration-300 flex items-center justify-between px-5 cursor-pointer select-none font-alexandria ${
        enabled
          ? "bg-[#020B1C] border-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.12)] hover:shadow-[0_0_35px_rgba(212,175,55,0.22)] opacity-100"
          : "bg-[#07132a]/20 border-[#1f2d4d]/60 opacity-60 hover:opacity-85 hover:border-[#D4AF37]/25"
      }`}
    >
      {/* اليمين: الأيقونة التعبيرية والعناوين بنسق صامت مذهب يتفاعل مع حالة القسم */}
      <div className="flex items-center gap-3.5 pr-1">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 border ${
            enabled
              ? "bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.3)]"
              : "bg-[#020B1C]/60 border-[#1f2d4d] text-gray-600"
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-right">
          <h4 className={`text-lg font-bold block pr-.5 leading-none transition-colors duration-300 ${enabled ? 'text-[#D4AF37]' : 'text-[#F0E6D2]/50'}`}>
            {title}
          </h4>
          <p className="text-[9px] text-gray-300 mt-2.5 uppercase font-bold tracking-widest leading-none font-mono">
            {subtitle}
          </p>
        </div>
      </div>

      {/* اليسار: كبسولة بيان الحالة اللمسية (LED Status Badge) */}
      <div className="flex items-center gap-3 shrink-0">
        {enabled ? (
          /* حالة التشغيل (الإنارة الذهبية الفاخرة) */
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 shadow-[0_0_10px_rgba(212,175,55,0.05)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4AF37]"></span>
            </span>
            <span className="text-[10px] font-black text-[#D4AF37] tracking-wide">
              البند مفعل
            </span>
          </div>
        ) : (
          /* حالة الإطفاء (الرمادي الصامت) */
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1f2d4d]/10 border border-[#1f2d4d]">
            <span className="h-2 w-2 rounded-full bg-gray-600" />
            <span className="text-[10px] font-bold text-gray-500 tracking-wide">
              البند غير نشط
            </span>
          </div>
        )}
      </div>
    </div>
  );
}