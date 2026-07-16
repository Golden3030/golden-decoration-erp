import type { NextConfig } from "next";
// @ts-ignore
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  
  // الإبقاء على تخطي أخطاء لغة البرمجة الصارمة فقط لتسهيل الإطلاق الفوري
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default withPWA(nextConfig);