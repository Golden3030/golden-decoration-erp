import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { CRMProvider } from "@/components/CRM/context/CRMContext";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});


const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});



export const metadata = {
  title: "Golden Decoration ERP",
  description: "نظام إدارة الحسابات والمواقع الفاخر لشركات التشطيبات",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png", // تعيين شعارك كأيقونة للمتصفح على الكمبيوتر
    apple: "/logo.png", // تعيين شعارك كأيقونة للبرنامج عند تثبيته على أجهزة الآيفون والآيباد
  }
};

export const viewport = {
  themeColor: "#020B1C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {


return (

<html
lang="ar"

className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
>


<body className="min-h-full flex flex-col">


<CRMProvider>

{children}

</CRMProvider>


</body>


</html>

);

}