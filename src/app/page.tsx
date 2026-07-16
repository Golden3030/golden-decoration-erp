"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient"; // توحيد عميل الاتصال لمنع تكرار GoTrueClient
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [view, setView] = useState<"login" | "reset">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [showPassword, setShowPassword] = useState(false);

  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // فحص الجلسة الاستباقي الآمن
  useEffect(() => {
    async function checkActiveSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          const { data: userProfile } = await supabase
            .from("users")
            .select("role")
            .eq("id", session.user.id)
            .single();

          if (userProfile) {
            const userRole = String(userProfile.role || "").toLowerCase();
            if (userRole === "client") {
              router.push("/client");
            } else {
              router.push("/dashboard");
            }
          }
        }
      } catch (e) {
        console.warn("No active session detected or user table not sync yet.", e);
      }
    }
    checkActiveSession();
  }, [router]);

  // دالة الدخول التفاعلية الذكية لجميع رتب وموظفي وعملاء النظام دون أي تجميد
  async function handleClientSideLogin() {
    
    if (!email || !password) {
      alert("يرجى كتابة البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setLoading(true);
    try {
      // 1. تسجيل الدخول عبر نظام المصادقة السحابي
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      if (!data.user) throw new Error("لم يتم العثور على حساب مستخدم صالح.");

      // 2. الاستعلام عن الرتبة والصلاحيات المسجلة بالجدول
      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !userProfile) {
        await supabase.auth.signOut();
        const errorDetail = profileError 
          ? `كود الخطأ: ${profileError.code} - تفاصيل الخلل: ${profileError.message}`
          : "لم يتم العثور على سطر صلاحيات متطابق لمعرف هذا الحساب بجدول المستخدمين.";
        throw new Error(`عذراً، حسابك لا يمتلك أي صلاحية فنية نشطة. ${errorDetail}`);
      }

      const userRole = String(userProfile.role || "").toLowerCase();

      // 3. التوجيه الديناميكي المشترك والآمن للرتب
      if (userRole === "client") {
        router.push("/client"); // توجيه العميل فوراً لكابينة ملفه الـ 3D
      } else {
        router.push("/dashboard"); // توجيه المدير والموظفين للوحة الإدارة
      }

    } catch (err: any) {
      alert("فشل تسجيل الدخول: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetEmail) {
      alert("يرجى كتابة البريد الإلكتروني الخاص بك أولاً.");
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      await supabase.from("notifications").insert({
        title: "طلب استعادة كلمة مرور",
        message: `🚨 تنبيه أمني: الحساب صاحب البريد (${resetEmail}) يطلب تغيير وإعادة تعيين كلمة المرور لنسيانها.`,
        type: "tasks",
        link: "/users"
      });

      alert(`📩 تم إرسال رابط مشفر بنجاح لإعادة تعيين كلمة المرور إلى البريد: (${resetEmail})، ومزامنة إشعار الدعم الفني للمدير العام حياً.`);
      setView("login");
      setResetEmail("");
    } catch (err: any) {
      alert("فشل إرسال رابط الاستعادة: " + err.message);
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#020B1C] px-4 relative overflow-hidden" dir="rtl">
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-[#D4AF37]/5 blur-[120px] pointer-events-none select-none" />

      <div className="w-full max-w-md bg-white/[0.01] backdrop-blur-xl border-2 border-[#D4AF37] rounded-3xl p-8 shadow-[0_20px_50px_rgba(212,175,55,0.15)] space-y-5 select-none relative z-10 transition-all duration-300 hover:shadow-[0_25px_60px_rgba(212,175,55,0.22)]">
        
        <div className="text-center">
          <Image
            src="/logo.png"
            alt="Golden Decoration"
            width={210}
            height={210}
            className="mx-auto drop-shadow-[0_4px_15px_rgba(212,175,55,0.25)]"
            priority
          />
          <h2 className="text-[#F0E6D2] text-xl font-black mt-1">نظام تخطيط وإدارة الحسابات (ERP)</h2>
          <p className="text-gray-400 text-[10px] font-serif tracking-widest mt-1">GOLDEN DECORATION — EXCELLENCE IN WORK</p>
        </div>

        {view === "login" && (
          <div className="space-y-4 text-right">
            <div>
              <label className="block text-[#F0E6D2] text-xs mb-1.5 font-bold">البريد الإلكتروني المعتمد *</label>
              <input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 text-sm rounded-xl bg-[#010612]/70 border border-[#243556] text-white px-4 outline-none focus:border-[#D4AF37] transition duration-200"
                required
                dir="ltr"
                style={{ direction: "ltr", textAlign: "left" }}
                suppressHydrationWarning
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[#F0E6D2] text-xs font-bold">كلمة المرور المشفرة *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="اكتب كلمة مرورك السرية"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 text-sm rounded-xl bg-[#010612]/70 border border-[#243556] text-white pr-4 pl-12 outline-none focus:border-[#D4AF37] transition duration-200"
                  required
                  dir="ltr"
                  style={{ direction: "ltr", textAlign: "left" }}
                  suppressHydrationWarning
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-3.5 text-gray-400 hover:text-[#D4AF37] cursor-pointer transition duration-150"
                  title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#243556] bg-[#020B1C] text-[#D4AF37] accent-[#D4AF37] cursor-pointer"
                />
                <label htmlFor="remember" className="text-gray-400 font-bold cursor-pointer select-none">تذكرني</label>
              </div>
              <span
                onClick={() => setView("reset")}
                className="text-[#D4AF37] hover:text-[#F0E6D2] font-bold cursor-pointer transition duration-150"
              >
                نسيت كلمة المرور؟
              </span>
            </div>

            {/* زر الدخول التفاعلي الجديد الموجه ديناميكياً لجميع الرتب دون تجميد */}
            <button
              type="button"
              onClick={handleClientSideLogin}
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-[#D4AF37] to-[#F0E6D2] text-black rounded-xl font-bold hover:scale-[1.01] active:scale-[0.99] cursor-pointer transition-all duration-200 disabled:opacity-50 text-sm mt-6 shadow-lg shadow-[#D4AF37]/15 flex items-center justify-center gap-2"
            >
              {loading ? "جاري فحص الصلاحيات الإدارية..." : "🔑 تسجيل دخول آمن للنظام"}
            </button>
          </div>
        )}

        {view === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-4 text-right transition-all duration-300">
            <p className="text-gray-300 text-xs leading-relaxed mb-3 text-center">أدخل بريدك الإلكتروني المسجل وسيقوم النظام بإرسال رابط آمن ومشر لتغيير وتحديث كلمة المرور ببريدك حياً.</p>
            
            <div>
              <label className="block text-[#F0E6D2] text-xs mb-1.5 font-bold">البريد الإلكتروني المسجل *</label>
              <input
                type="email"
                placeholder="email@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full h-12 text-sm rounded-xl bg-[#010612]/70 border border-[#243556] text-white px-4 outline-none focus:border-[#D4AF37] transition duration-200"
                required
              />
            </div>

            <div className="flex justify-between items-center text-xs pt-1">
              <span
                onClick={() => setView("login")}
                className="text-gray-400 hover:text-white font-bold cursor-pointer transition duration-150"
              >
                ⬅️ العودة لتسجيل الدخول
              </span>
            </div>

            <button
              type="submit"
              disabled={resetLoading}
              className="w-full h-12 bg-gradient-to-r from-[#D4AF37] to-[#F0E6D2] text-black rounded-xl font-bold hover:scale-[1.01] active:scale-[0.99] cursor-pointer transition-all duration-200 disabled:opacity-50 text-sm mt-6 shadow-lg shadow-[#D4AF37]/15 flex items-center justify-center gap-2"
            >
              {resetLoading ? "جاري إرسال الرابط..." : "📩 إرسال رابط الاستعادة للبريد"}
            </button>
          </form>
        )}

      </div>

    </main>
  );
}