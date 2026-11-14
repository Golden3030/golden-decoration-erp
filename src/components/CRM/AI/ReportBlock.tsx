"use client";

import React, { useMemo } from "react";
import GoldButton from "@/components/ui/GoldButton";
import { markdownToHtml } from "@/lib/markdownLite";
import { openReportPdf } from "@/lib/reportPrint";

interface Props {
  heading: string;       // عنوان الكارت على الشاشة
  reportTitle: string;   // عنوان التقرير في ملف الـ PDF
  markdown: string;      // محتوى التقرير
  projectName?: string;  // اسم المشروع (يظهر في ترويسة الـ PDF)
}

const REPORT_CLASSES =
  "text-gray-300 text-xs leading-relaxed font-bold select-text " +
  "[&_h2]:text-[#D4AF37] [&_h2]:text-sm [&_h2]:font-black [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:border-r-4 [&_h2]:border-[#D4AF37] [&_h2]:pr-2 " +
  "[&_h3]:text-[#A17A4C] [&_h3]:text-xs [&_h3]:font-black [&_h3]:mt-4 [&_h3]:mb-2 " +
  "[&_h4]:text-white [&_h4]:text-xs [&_h4]:font-black [&_h4]:mt-3 [&_h4]:mb-1 " +
  "[&_p]:mb-2 [&_ul]:list-disc [&_ul]:pr-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pr-5 [&_ol]:mb-3 [&_li]:mb-1 " +
  "[&_strong]:text-white [&_hr]:border-[#1f2d4d] [&_hr]:my-3 " +
  "[&_blockquote]:bg-[#D4AF37]/10 [&_blockquote]:border-r-4 [&_blockquote]:border-[#D4AF37] [&_blockquote]:p-3 [&_blockquote]:rounded-lg [&_blockquote]:mb-3 [&_blockquote]:text-amber-100 " +
  "[&_.table-wrap]:overflow-x-auto [&_.table-wrap]:mb-4 [&_table]:min-w-full [&_table]:border-collapse " +
  "[&_th]:bg-[#0c1e3d] [&_th]:text-[#D4AF37] [&_th]:p-2 [&_th]:text-right [&_th]:border [&_th]:border-[#1f2d4d] [&_th]:whitespace-nowrap " +
  "[&_td]:p-2 [&_td]:border [&_td]:border-[#1f2d4d] [&_td]:align-top";

export default function ReportBlock({ heading, reportTitle, markdown, projectName }: Props) {
  const html = useMemo(() => markdownToHtml(markdown), [markdown]);

  function handleExport() {
    openReportPdf({
      title: reportTitle,
      meta: projectName ? [{ label: "المشروع", value: projectName }] : [],
      markdown
    });
  }

  return (
    <div className="bg-[#020B1C] border border-[#D4AF37]/30 rounded-xl p-5 space-y-3 transition-all duration-300 select-text">
      <h4 className="text-[#A17A4C] font-black text-xs border-r-2 border-[#D4AF37] pr-2">{heading}</h4>
      <div className={REPORT_CLASSES} dangerouslySetInnerHTML={{ __html: html }} />
      <div className="flex justify-end pt-2">
        <GoldButton onClick={handleExport}>📄 تصدير PDF</GoldButton>
      </div>
    </div>
  );
}