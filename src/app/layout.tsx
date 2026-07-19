import type { Metadata } from "next";
import { Geist, Geist_Mono, Alexandria } from "next/font/google";
import "./globals.css";
import { CRMProvider } from "@/components/CRM/context/CRMContext";

// 1. تهيئة وتثبيت الخطوط ذكياً سحابياً لمنع الـ FOUT وتفعيل Alexandria للغة العربية
const alexandria = Alexandria({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap", 
  variable: "--font-alexandria",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 2. تعيين الميتاداتا السحابية وتثبيت الـ PWA واللوجو الملوكي للمنظومة وأجهزة آبل
export const metadata: Metadata = {
  title: "Golden Decoration ERP",
  description: "نظام إدارة الحسابات والمواقع الفاخر لشركات التشطيبات",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png", // أيقونة المتصفح الرسمية
    apple: "/logo.png", // أيقونة التنزيل والتنصيب على أجهزة الآيفون والآيباد
  }
};

export const viewport = {
  themeColor: "#020B1C",
};

// 3. المكون الموحد والوحيد لـ RootLayout مغلفاً بسياق الـ CRMProvider لضمان عمل الجداول
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="ar" 
      dir="rtl" 
      className={`${alexandria.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#020B1C] text-white">
        <CRMProvider>
          {children}
        </CRMProvider>
      </body>
    </html>
  );
}