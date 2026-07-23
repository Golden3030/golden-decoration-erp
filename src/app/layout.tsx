import type { Metadata } from "next";
import { Geist, Geist_Mono, Alexandria } from "next/font/google";
import "./globals.css";
import { CRMProvider } from "@/components/CRM/context/CRMContext";
import Script from "next/script";

// =============================================
// تهيئة الخطوط (محسّنة للعربية والأداء)
// =============================================
const alexandria = Alexandria({
  subsets: ["arabic", "latin"],           // دعم عربي + لاتيني
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  // ✅ إصلاح متكرر: "swap" بيعرض الخط الاحتياطي (system-ui/Tahoma) فوراً كأول حاجة يشوفها المستخدم
  // ثم يستبدله بـ Alexandria لما يخلص التحميل - وده بالظبط اللي بيظهر كـ"Arial قبل Alexandria"
  // "block" بيخلي النص مخفي لجزء من الثانية بس (بدون عرض أي خط بديل) لحد ما Alexandria يجهز،
  // وبما إنه محمّل ذاتياً من نفس السيرفر (مش من جوجل)، التأخير غير محسوس عملياً
  display: "block",
  variable: "--font-alexandria",
  fallback: ["system-ui", "Tahoma", "sans-serif"], // احتياطي قوي (يُستخدم فقط لو تجاوز التحميل ~3 ثواني)
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// =============================================
// Metadata
// =============================================
export const metadata: Metadata = {
  title: "Golden Decoration ERP",
  description: "نظام إدارة الحسابات والمواقع الفاخر لشركات التشطيبات",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport = {
  themeColor: "#020B1C",
};

// =============================================
// Root Layout
// =============================================
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
      <body className="min-h-full flex flex-col bg-[#020B1C] text-white font-sans">
        
        {/* Google Analytics - Google Tag Manager */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-MRPFMQV1RR"
          strategy="afterInteractive"
        />
        
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-MRPFMQV1RR');
          `}
        </Script>

        <CRMProvider>
          {children}
        </CRMProvider>
      </body>
    </html>
  );
}