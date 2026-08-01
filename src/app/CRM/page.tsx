import { Metadata } from "next";
import { Suspense } from "react";
import CRMClientPage from "./CRMClientPage";

// 🌟 تصدير ترويسة المتصفح الرسمية لـ Next.js بشكل آمن وسريع على السيرفر
export const metadata: Metadata = {
  title: "Golden Decoration ERP - الـ CRM و سجل العملاء والمتابعات",
  description: "نظام إدارة علاقات العملاء ومتابعات المبيعات الميدانية لشركة جولدن ديكوريشن",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020B1C]" />}>
      <CRMClientPage />
    </Suspense>
  );
}