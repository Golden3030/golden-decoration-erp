"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  FolderKanban,
  FileText,
  HardHat,
  Wallet,
  Settings,
  Bot,
  Package,
  Key,
  BarChart,
  MessageSquare,
  CalendarDays,
  Notebook,
  Coins 
} from "lucide-react";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [role, setRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function getUserRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setRole("");
          setLoading(false);
          return;
        }

        const { data: profile, error } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (profile && profile.role) {
          setRole(profile.role);
        }
      } catch (err) {
        console.warn("Could not fetch user role, falling back securely:", err);
        setRole("");
      } finally {
        setLoading(false);
      }
    }

    getUserRole();
  }, []);

  const menuItems = [
    { name: "الرئيسية", path: "/dashboard", icon: LayoutDashboard, hint: "لوحة التحكم الرئيسية لمراقبة أداء المشاريع." },
    { name: "التقارير والتحليلات", path: "/reports", icon: BarChart, hint: "تحليل الأداء المالي والعمليات للمشروع." },
    { name: "CRM", path: "/CRM", icon: Users, hint: "إدارة تفاصيل مواصفات ومقايسات العملاء والمشاريع الحية." },
    { name: "طلبات العملاء", path: "/customer-requests", icon: ClipboardList, hint: "متابعة طلبات التسعير والمعاينة المستلمة." },
    { name: "العملاء", path: "/customers", icon: Users, hint: "سجل قائمة عملاء الشركة وتسجيل وإسناد المبيعات." },
    { name: "المشاريع", path: "/projects", icon: FolderKanban, hint: "إدارة وحفظ وتحديث مواقع ومشاريع العمل الجارية." },
    { name: "أرشيف العقود", path: "/contracts", icon: FileText, hint: "المركز السحابي لـمعاينة عقود العملاء والمقاولين." },
    { name: "المقايسات", path: "/estimates", icon: FileText, hint: "السجل المالي للمقايسات المبدئية والتفصيلية الـ BOQ." },
    { name: " البنود والخامات", path: "/products", icon: Package, hint: "إدارة وتسعير منتجات الخامات ومكتبة التوصيفات الإنشائية." },
    { name: "المقاولون", path: "/subcontractors", icon: HardHat, hint: "مراجعة سجل مقاولي الباطن والورش المسند إليها التنفيذ." },
    { name: "المالية والحسابات", path: "/treasury", icon: Wallet, hint: "حساب الخزينة الرئيسي وتتبع الإيرادات والمصروفات." },
    { name: "الرواتب والمسيرات", path: "/payroll", icon: Coins, hint: "إصدار كشوف مسيرات رواتب الموظفين والمهندسين وتسييلها ماليًا بالخزينة." },
    { name: "جدول المواعيد", path: "/appointments", icon: CalendarDays, hint: "جدولة اللقاءات والمعاينات الميدانية ومنع تضارب مواعيد الموظفين." },
    { name: "المساعد الذكي", path: "/ai-assistant", icon: Bot, hint: "استشارة المساعدين الأذكياء لتخطيط الأعمال والردود." },
    { name: "التواصل الداخلي", path: "/collaboration", icon: MessageSquare, hint: "تبادل الرسائل والمرفقات وتنسيق العمل الفني بين الموظفين." },
    { name: " المهام اليومية", path: "/notes", icon: Notebook, hint: "كتابة مهام سريعة وتصفح الملاحظات اليومية وتنبيهاتها حياً." },
    { name: "المستخدمين", path: "/users", icon: Key, hint: "شاشة مراجعة وصيانة حسابات الموظفين وصلاحياتهم." },
    { name: "الإعدادات", path: "/settings", icon: Settings, hint: "إعدادات النظام وتفضيلات الحساب الفنية للحصر." }
  ];

  const filteredMenuItems = menuItems.filter((item) => {
    const userRole = String(role || "").toLowerCase();
    if (userRole === "admin" || userRole === "owner" || userRole === "manager") return true;
    
    if (userRole === "sales") {
      const allowed = ["الرئيسية", "CRM", "العملاء", "المقايسات", "جدول المواعيد", "المساعد الذكي", "التواصل الداخلي", "الملاحظات والمهام", "الإعدادات"];
      return allowed.includes(item.name);
    }
    
    if (userRole === "sales_manager") {
      const allowed = ["الرئيسية", "CRM", "طلبات العملاء", "العملاء", "أرشيف العقود", "المقايسات", "جدول المواعيد", "المساعد الذكي", "التواصل الداخلي", "الملاحظات والمهام", "الإعدادات"];
      return allowed.includes(item.name);
    }
    if (userRole === "engineer") {
      const allowed = ["الرئيسية", "CRM", "المشاريع", "أرشيف العقود", "المساعد الذكي", "التواصل الداخلي", "الملاحظات والمهام", "الإعدادات"];
      return allowed.includes(item.name);
    }
    if (userRole === "accounts") {
      const allowed = ["الرئيسية", "التقارير والتحليلات", "العملاء", "أرشيف العقود", "المقايسات", "المالية والحسابات", "الرواتب والمسيرات", "المساعد الذكي", "التواصل الداخلي", "الملاحظات والمهام", "الإعدادات"];
      return allowed.includes(item.name);
    }
    if (userRole === "procurement") {
      const allowed = ["الرئيسية", "إدارة البنود والخامات", "المقاولون", "أرشيف العقود", "المساعد الذكي", "التواصل الداخلي", "الملاحظات والمهام", "الإعدادات"];
      return allowed.includes(item.name);
    }
    if (userRole === "client") {
      const allowed = ["الرئيسية", "المقايسات", "المساعد الذكي", "الإعدادات"];
      return allowed.includes(item.name);
    }
    return false;
  });

  if (!mounted || loading) {
    return (
      <aside dir="rtl" className="w-56 h-screen fixed right-0 top-0 bg-[#020B1C] border-l border-[#1f2d4d] flex flex-col justify-between text-white shrink-0 select-none print:hidden z-40" suppressHydrationWarning>
        <div className="pt-2 pb-2 px-4 border-b border-[#1f2d4d] shrink-0">
          <div className="w-[110px] h-[45px] mx-auto bg-[#020B1C] rounded-lg animate-pulse" />
        </div>
        <div className="flex-1 px-3 pt-4 space-y-3">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-10 w-full bg-[#020B1C]/60 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="p-3 border-t border-[#1f2d4d] mt-auto">
          <div className="h-10 w-full bg-[#020B1C] rounded-full animate-pulse" />
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* استدعاء خط Alexandria وفرضه وتكوين أزرار التمرير بالأسهم الذهبية التفاعلية */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;700;900&display=swap');
        
        *:not(code, pre, .font-mono, [class*="font-mono"]) {
          font-family: 'Alexandria', Arial, sans-serif !important;
          letter-spacing: normal !important;
        }

        /* شريط تمرير النظام المطور لدعم أسهم التحكم */
        ::-webkit-scrollbar {
          width: 5px !important;
          height: 5px !important;
        }
        ::-webkit-scrollbar-track {
          background: #020B1C !important;
        }
        ::-webkit-scrollbar-thumb {
          background: #D4AF37 !important;
          border-radius: 9999px !important;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #C9A45D !important;
        }

        /* تخصيص وتلوين أزرار أسهم الصعود والهبوط يدوياً */
        ::-webkit-scrollbar-button {
          display: block !important;
          background-color: #020B1C !important;
          height: 5px !important;
          width: 5px !important;
        }
        
        /* سهم الصعود للأعلى (مثلث متساوي الأضلاع ذهبي مائل للأعلى) */
        ::-webkit-scrollbar-button:vertical:decrement {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23D4AF37'><polygon points='50,20 15,80 85,80'/></svg>") !important;
          background-size: 5px !important;
          background-repeat: no-repeat !important;
          background-position: center !important;
        }
        
        /* سهم الهبوط للأسفل (مثلث متساوي الأضلاع ذهبي مائل للأسفل) */
        ::-webkit-scrollbar-button:vertical:increment {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23D4AF37'><polygon points='15,20 85,20 50,80'/></svg>") !important;
          background-size: 5px !important;
          background-repeat: no-repeat !important;
          background-position: center !important;
        }

        /* حركية التنفس للوجو والدعم الفني */
        @keyframes luxury-breath {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 4px rgba(212, 175, 55, 0.15), inset 0 0 2px rgba(212, 175, 55, 0.08);
            border-color: rgba(212, 175, 55, 0.4);
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0 0 14px rgba(212, 175, 55, 0.35), inset 0 0 6px rgba(212, 175, 55, 0.15);
            border-color: rgba(212, 175, 55, 0.85);
          }
        }

        .luxury-breath-btn {
          animation: luxury-breath 3.5s infinite ease-in-out;
        }

        .sidebar-scroll::-webkit-scrollbar {
          width: 5px !important;
        }
      `}</style>

      <aside
        dir="rtl"
        suppressHydrationWarning
        className="w-56 h-screen fixed right-0 top-0 bg-[#020B1C] border-l border-[#1f2d4d] flex flex-col justify-between text-white text-right shrink-0 select-none print:hidden z-40"
      >
        {/* كارت اللوجو العلوي المطور - تم تمديد الحجم ليمتد الشعار ملوكياً بالكامل py-1 px-2.5 وبحجم h-18 */}
        <div className="pt-3 px-3 pb-5 border-b border-[#D4AF37] shrink-0 select-none bg-[#07132a]">
          <div 
            onClick={() => router.push("/about")}
            className="luxury-breath-btn rounded-xl py-1 px-2.5 cursor-pointer transition-all duration-300 flex items-center justify-center border border-[#D4AF37]/50 bg-[#020B1C]"
            title="الانتقال الى التعريف بالنظام والمزايا الأساسية"
          >
            <img src="/logo.png" alt="Golden Decoration Logo" className="h-16 md:h-18 w-auto object-contain mx-auto transition-transform duration-300 hover:scale-105" />
          </div>
        </div>

        {/* قائمة روابط السايدبار التفاعلية بالهوية الأرستقراطية الملكية (Stealth Gold Capacitive Style) */}
        <nav className="sidebar-scroll flex-1 px-3 pt-3 pb-2 text-right overflow-y-auto max-h-[calc(100vh-230px)]">
          <ul className="space-y-1.5">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <li key={item.path}>
                  <button
                    onClick={() => router.push(item.path)}
                    data-hint={item.hint}
                    className={`w-full px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-start gap-3 transition-all duration-300 cursor-pointer border ${
                      isActive 
                        ? "bg-[#07132a] text-[#F0E6D2] border-[#D4AF37] shadow-[0_0_18px_rgba(212,175,55,0.3)] border-r-4 border-r-[#D4AF37]" 
                        : "text-[#F0E6D2]/80 border-transparent hover:bg-[#07132a] hover:border-[#D4AF37]/35 hover:text-[#D4AF37] hover:translate-x-[-3px]"
                    }`}
                  >
                    <Icon size={15} className={`shrink-0 transition-colors duration-300 ${isActive ? "text-[#D4AF37]" : "text-[#F0E6D2]/40 group-hover:text-[#D4AF37]"}`} />
                    <span className="truncate">{item.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* منطقة الفوتر: الدعم المباشر + جملة الحقوق باللون البني المعتمد */}
        <div className="p-3 border-t border-[#1f2d4d] mt-auto select-none shrink-0 bg-[#07132a] flex flex-col gap-2">
          {/* كارت الدعم الفني المنفس */}
          <a
            href="https://wa.me/201065282534"
            target="_blank"
            rel="noopener noreferrer"
            className="luxury-breath-btn block rounded-xl py-2 px-3 transition-all duration-300 bg-[#020B1C] border border-[#D4AF37]/40"
          >
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 shrink-0">
                <span className="font-mono font-bold text-[10px] text-[#D4AF37]">01065282534</span>
              </div>
              <div className="border-l border-[#D4AF37]/35 h-3.5" />
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[9px] font-bold text-[#F0E6D2]">الدعم المباشر</span>
              </div>
            </div>
          </a>

          {/* جملة جميع الحقوق محفوظة باللون البني البرونزي الفاخر كمتطلب ثابت */}
          <div className="text-center pt-1">
            <span className="text-[9px] font-medium text-[#A17A4C] block tracking-wide">
              جميع الحقوق محفوظة © ٢٠٢٦ جولد ديكور
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}