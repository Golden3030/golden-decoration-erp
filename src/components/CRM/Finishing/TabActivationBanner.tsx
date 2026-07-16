"use client";

import React from "react";
import { CheckCircle2, Lock, LucideIcon } from "lucide-react";

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
      className={`h-16 w-full rounded-2xl border transition-all duration-300 flex items-center justify-between px-4 shadow-xl cursor-pointer select-none font-alexandria ${
        enabled
          ? "bg-[#07132a] border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.12)] hover:shadow-[0_0_25px_rgba(212,175,55,0.22)]"
          : "bg-[#07132a]/40 border-[#1f2d4d] hover:border-[#D4AF37]/30"
      }`}
    >
      {/* اليمين: الأيقونة والعناوين المختصرة المنسقة */}
      <div className="flex items-center gap-3 pr-1">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0 ${
            enabled
              ? "bg-[#D4AF37] text-[#020B1C] shadow-[0_0_15px_rgba(212,175,55,0.35)]"
              : "bg-[#020B1C] text-gray-600"
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-right">
          <h4 className="text-xs md:text-sm font-black text-[#F0E6D2] leading-none">
            {title}
          </h4>
          <p className="text-[9px] text-gray-500 mt-1.5 uppercase font-bold tracking-widest leading-none font-mono">
            {subtitle}
          </p>
        </div>
      </div>

      {/* اليسار: الكبسولة اللمسية الفاخرة للتحكم في الحالة */}
      <button
        type="button"
        className={`h-9 px-4 rounded-xl border font-black text-[10px] md:text-xs transition-all duration-300 flex items-center gap-2 cursor-pointer shrink-0 ${
          enabled
            ? "bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.1)]"
            : "bg-[#020B1C] border-[#1f2d4d] text-gray-500"
        }`}
      >
        {enabled ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span>القسم مفعّل بالمقايسة</span>
          </>
        ) : (
          <>
            <Lock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <span>تفعيل القسم</span>
          </>
        )}
      </button>
    </div>
  );
}