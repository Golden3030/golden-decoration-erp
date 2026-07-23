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
  Coins,
  ChevronDown // 👈 أيقونة السهم لتوجيه الأكورديون تفاعلياً
} from "lucide-react";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [role, setRole] = useState<string>("sales");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // حالات التحكم المستقلة في فتح وإغلاق المجموعات الأربعة المنسدلة
  const [isSalesOpen, setIsSalesOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [isCollabOpen, setIsCollabOpen] = useState(false);
  const [isFinanceOpen, setIsFinanceOpen] = useState(false);

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

  // 🌟 مستشعر التوجيه والمزامنة التلقائية: فتح المجموعة المعنية أوتوماتيكياً حسب مسار المتصفح الجاري فور التحميل
  useEffect(() => {
    if (["/customer-requests", "/CRM", "/customers"].includes(pathname)) {
      setIsSalesOpen(true);
    }
    if (["/projects", "/estimates", "/maintenance", "/settings"].includes(pathname)) {
      setIsProjectsOpen(true);
    }
    if (["/appointments", "/collaboration", "/notes"].includes(pathname)) {
      setIsCollabOpen(true);
    }
    if (["/treasury", "/payroll", "/disbursements"].includes(pathname)) {
      setIsFinanceOpen(true);
    }
  }, [pathname]);

  const menuItems = [
    { name: "الرئيسية", path: "/dashboard", icon: LayoutDashboard, hint: "لوحة التحكم الرئيسية لمراقبة أداء المشاريع." },
    { name: "التقارير والتحليلات", path: "/reports", icon: BarChart, hint: "تحليل الأداء المالي والعمليات للمشروع." },
    
    // المجموعة الأولى: المبيعات والـ CRM
    { name: "طلبات العملاء", path: "/customer-requests", icon: ClipboardList, hint: "متابعة طلبات التسعير والمعاينة المستلمة." },
    { name: "CRM", path: "/CRM", icon: Users, hint: "إدارة تفاصيل مواصفات ومقايسات العملاء والمشاريع الحية." },
    { name: "العملاء", path: "/customers", icon: Users, hint: "سجل قائمة عملاء الشركة وتسجيل وإسناد المبيعات." },
    
    // المجموعة الثانية: المشاريع والـ BOQ والضمان
    { name: "المشاريع", path: "/projects", icon: FolderKanban, hint: "إدارة وحفظ وتحديث مواقع ومشاريع العمل الجارية." },
    { name: "المقايسات", path: "/estimates", icon: FileText, hint: "السجل المالي للمقايسات المبدئية والتفصيلية الـ BOQ." },
    { name: "تذاكر الضمان", path: "/maintenance", icon: FileText, hint: "متابعة تذاكر الصيانة والضمان بعد التسليم للملاك." }, // 👈 إظهار شاشة الضمان
    { name: "الإعدادات الفنية", path: "/settings", icon: Settings, hint: "إعدادات النظام الفنية ومعاملات حصر الكميات." }, // 👈 تغيير مسمى الإعدادات
    
    { name: "أرشيف العقود", path: "/contracts", icon: FileText, hint: "المركز السحابي لـمعاينة عقود العملاء والمقاولين." },
    { name: " البنود والخامات", path: "/products", icon: Package, hint: "إدارة وتسعير منتجات الخامات ومكتبة التوصيفات الإنشائية." },
    { name: "المقاولون", path: "/subcontractors", icon: HardHat, hint: "مراجعة سجل مقاولي الباطن والورش المسند إليها التنفيذ." },
    
    // المجموعة الرابعة: الحسابات والمالية الموحدة
    { name: "المالية والحسابات", path: "/treasury", icon: Wallet, hint: "حساب الخزينة الرئيسي وتتبع الإيرادات والمصروفات." },
    { name: "الرواتب والمسيرات", path: "/payroll", icon: Coins, hint: "إصدار كشوف مسيرات رواتب الموظفين والمهندسين وتسييلها ماليًا بالخزينة." },
    { name: "صرف الخامات", path: "/disbursements", icon: Package, hint: "سندات صرف الخامات والمخازن للمواقع الميدانية ومراقبة الهدر." },

    // المجموعة الثالثة: التنسيق والجدولة المشتركة والمهام
    { name: "جدول المواعيد", path: "/appointments", icon: CalendarDays, hint: "جدولة اللقاءات والمعاينات الميدانية ومنع تضارب مواعيد الموظفين." },
    { name: "التواصل الداخلي", path: "/collaboration", icon: MessageSquare, hint: "تبادل الرسائل والمرفقات وتنسيق العمل الفني بين الموظفين." },
    { name: "المهام اليومية", path: "/notes", icon: Notebook, hint: "كتابة مهام سريعة وتصفح الملاحظات اليومية وتنبيهاتها حياً." }, // 👈 نقل المهام اليومية للمجموعة الثالثة
    
    { name: "المساعد الذكي", path: "/ai-assistant", icon: Bot, hint: "استشارة المساعدين الأذكياء لتخطيط الأعمال والردود." },
    { name: "المستخدمين", path: "/users", icon: Key, hint: "شاشة مراجعة وصيانة حسابات الموظفين وصلاحياتهم." }
  ];

  const filteredMenuItems = menuItems.filter((item) => {
    const userRole = String(role || "").toLowerCase();
    if (userRole === "admin" || userRole === "owner" || userRole === "manager") return true;
    
    if (userRole === "sales") {
      const allowed = ["الرئيسية", "CRM", "العملاء", "المقايسات", "جدول المواعيد", "المساعد الذكي", "التواصل الداخلي", "المهام اليومية", "الإعدادات الفنية"];
      return allowed.includes(item.name);
    }
    
    if (userRole === "sales_manager") {
      const allowed = ["الرئيسية", "CRM", "طلبات العملاء", "العملاء", "أرشيف العقود", "المقايسات", "جدول المواعيد", "المساعد الذكي", "التواصل الداخلي", "المهام اليومية", "الإعدادات الفنية"];
      return allowed.includes(item.name);
    }
    if (userRole === "engineer") {
      const allowed = ["الرئيسية", "CRM", "المشاريع", "تذاكر الضمان", "أرشيف العقود", "المساعد الذكي", "التواصل الداخلي", "المهام اليومية", "الإعدادات الفنية"];
      return allowed.includes(item.name);
    }
    if (userRole === "accountant") {
      const allowed = ["الرئيسية", "التقارير والتحليلات", "العملاء", "أرشيف العقود", "المقايسات", "المالية والحسابات", "الرواتب والمسيرات", "صرف الخامات", "المساعد الذكي", "التواصل الداخلي", "المهام اليومية", "الإعدادات الفنية"];
      return allowed.includes(item.name);
    }
    if (userRole === "procurement") {
      const allowed = ["الرئيسية", " البنود والخامات", "المقاولون", "صرف الخامات", "أرشيف العقود", "المساعد الذكي", "التواصل الداخلي", "المهام اليومية", "الإعدادات الفنية"];
      return allowed.includes(item.name);
    }
    if (userRole === "client") {
      const allowed = ["الرئيسية", "المقايسات", "المساعد الذكي", "الإعدادات الفنية"];
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

  // مصفوفات المسارات المجمعة لإخضاعها بذكاء لعقود الأكورديون التفاعلية
  const SALES_PATHS = ["/customer-requests", "/CRM", "/customers"];
  const PROJECT_PATHS = ["/projects", "/estimates", "/maintenance", "/settings"];
  const COLLAB_PATHS = ["/appointments", "/collaboration", "/notes"];
  const FINANCE_PATHS = ["/treasury", "/payroll", "/disbursements"];

  return (
    <>
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

        ::-webkit-scrollbar-button {
          display: block !important;
          background-color: #020B1C !important;
          height: 5px !important;
          width: 5px !important;
        }
        
        ::-webkit-scrollbar-button:vertical:decrement {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23D4AF37'><polygon points='50,20 15,80 85,80'/></svg>") !important;
          background-size: 5px !important;
          background-repeat: no-repeat !important;
          background-position: center !important;
        }
        
        ::-webkit-scrollbar-button:vertical:increment {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23D4AF37'><polygon points='15,20 85,20 50,80'/></svg>") !important;
          background-size: 5px !important;
          background-repeat: no-repeat !important;
          background-position: center !important;
        }

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

        /* تكنولوجيا التبويبات المضيئة (The Active Gilded Laser Token) المعتمدة من FinishingTabs */
        .royal-active-btn {
          background: linear-gradient(180deg, #0c1e3d 0%, #040e20 100%) !important;
          color: #D4AF37 !important;
          font-weight: 900 !important;
          border: 1px solid #D4AF37 !important;
          box-shadow: 0 0 18px rgba(212, 175, 55, 0.25) !important;
          transform: scale(1.02) !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .royal-laser-line {
          background: linear-gradient(90deg, transparent 0%, #D4AF37 50%, transparent 100%) !important;
          box-shadow: 0 -1px 6px rgba(212, 175, 55, 0.8) !important;
        }
      `}</style>

      <aside
        dir="rtl"
        suppressHydrationWarning
        className="w-56 h-screen fixed right-0 top-0 bg-[#020B1C] border-l border-[#1f2d4d] flex flex-col justify-between text-white text-right shrink-0 select-none print:hidden z-40"
      >
        {/* كارت اللوجو العلوي المطور */}
        <div className="pt-3 px-3 pb-5 border-b border-[#D4AF37] shrink-0 select-none bg-[#07132a]">
          <div 
            onClick={() => router.push("/about")}
            className="luxury-breath-btn rounded-xl py-1 px-2.5 cursor-pointer transition-all duration-300 flex items-center justify-center border border-[#D4AF37]/50 bg-[#020B1C]"
            title="الانتقال الى التعريف بالنظام والمزايا الأساسية"
          >
            <img src="/logo.png" alt="Golden Decoration Logo" className="h-16 md:h-18 w-auto object-contain mx-auto transition-transform duration-300 hover:scale-105" />
          </div>
        </div>

        {/* قائمة روابط السايدبار التفاعلية المدمجة بالأكورديونات الأربعة الهرمية الفاخرة للشركة */}
        <nav className="sidebar-scroll flex-1 px-3 pt-3 pb-2 text-right overflow-y-auto max-h-[calc(100vh-230px)]">
          <ul className="space-y-1.5">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;

              // 1. المجموعة الأولى: المبيعات والـ CRM
              if (SALES_PATHS.includes(item.path)) {
                if (item.path === "/customer-requests") {
                  const isAnySubActive = SALES_PATHS.includes(pathname);
                  return (
                    <li key="sales-accordion" className="space-y-1 animate-fade-in">
                      <button
                        type="button"
                        onClick={() => setIsSalesOpen(!isSalesOpen)}
                        className={`w-full px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all duration-300 cursor-pointer border ${
                          isAnySubActive 
                            ? "border-[#D4AF37]/50 text-[#D4AF37] bg-[#07132a]/60 shadow-[0_0_12px_rgba(212,175,55,0.15)]" 
                            : "text-[#F0E6D2]/80 border-transparent hover:bg-[#07132a] hover:border-[#D4AF37]/35 hover:text-[#D4AF37]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <ClipboardList size={15} className={isAnySubActive ? "text-[#D4AF37]" : "text-[#F0E6D2]/40"} />
                          <span> المبيعات والـ CRM</span>
                        </div>
                        <ChevronDown 
                          size={14} 
                          className={`transition-transform duration-300 ${isSalesOpen ? "rotate-180 text-[#D4AF37]" : "text-[#F0E6D2]/40"}`} 
                        />
                      </button>

                      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                        isSalesOpen 
                          ? "max-h-48 opacity-100 mt-1.5 space-y-1 pr-3 border-r border-[#D4AF37]/20 mr-2" 
                          : "max-h-0 opacity-0 pointer-events-none"
                      }`}>
                        {filteredMenuItems.some(x => x.path === "/customer-requests") && (
                          <button
                            type="button"
                            onClick={() => router.push("/customer-requests")}
                            className={`w-full px-3 py-2 rounded-lg font-bold text-[11px] flex items-center justify-start gap-2.5 transition-all duration-200 cursor-pointer border ${
                              pathname === "/customer-requests"
                                ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                                : "text-[#F0E6D2]/70 border-transparent hover:text-[#D4AF37]"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${pathname === "/customer-requests" ? "bg-[#D4AF37] animate-pulse" : "bg-gray-700"}`} />
                            <span>طلبات المعاينة (Leads)</span>
                          </button>
                        )}
                        {filteredMenuItems.some(x => x.path === "/CRM") && (
                          <button
                            type="button"
                            onClick={() => router.push("/CRM")}
                            className={`w-full px-3 py-2 rounded-lg font-bold text-[11px] flex items-center justify-start gap-2.5 transition-all duration-200 cursor-pointer border ${
                              pathname === "/CRM"
                                ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                                : "text-[#F0E6D2]/70 border-transparent hover:text-[#D4AF37]"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${pathname === "/CRM" ? "bg-[#D4AF37] animate-pulse" : "bg-gray-700"}`} />
                            <span>بيانات الـ CRM </span>
                          </button>
                        )}
                        {filteredMenuItems.some(x => x.path === "/customers") && (
                          <button
                            type="button"
                            onClick={() => router.push("/customers")}
                            className={`w-full px-3 py-2 rounded-lg font-bold text-[11px] flex items-center justify-start gap-2.5 transition-all duration-200 cursor-pointer border ${
                              pathname === "/customers"
                                ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                                : "text-[#F0E6D2]/70 border-transparent hover:text-[#D4AF37]"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${pathname === "/customers" ? "bg-[#D4AF37] animate-pulse" : "bg-gray-700"}`} />
                            <span>سجل كشوف العملاء</span>
                          </button>
                        )}
                      </div>
                    </li>
                  );
                }
                return null;
              }

              // 2. المجموعة الثانية: المشاريع والـ BOQ
              if (PROJECT_PATHS.includes(item.path)) {
                if (item.path === "/projects") {
                  const isAnySubActive = PROJECT_PATHS.includes(pathname);
                  return (
                    <li key="project-accordion" className="space-y-1 animate-fade-in">
                      <button
                        type="button"
                        onClick={() => setIsProjectsOpen(!isProjectsOpen)}
                        className={`w-full px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all duration-300 cursor-pointer border ${
                          isAnySubActive 
                            ? "border-[#D4AF37]/50 text-[#D4AF37] bg-[#07132a]/60 shadow-[0_0_12px_rgba(212,175,55,0.15)]" 
                            : "text-[#F0E6D2]/80 border-transparent hover:bg-[#07132a] hover:border-[#D4AF37]/35 hover:text-[#D4AF37]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <FolderKanban size={15} className={isAnySubActive ? "text-[#D4AF37]" : "text-[#F0E6D2]/40"} />
                          <span> المشاريع والـ BOQ</span>
                        </div>
                        <ChevronDown 
                          size={14} 
                          className={`transition-transform duration-300 ${isProjectsOpen ? "rotate-180 text-[#D4AF37]" : "text-[#F0E6D2]/40"}`} 
                        />
                      </button>

                      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                        isProjectsOpen 
                          ? "max-h-56 opacity-100 mt-1.5 space-y-1 pr-3 border-r border-[#D4AF37]/20 mr-2" 
                          : "max-h-0 opacity-0 pointer-events-none"
                      }`}>
                        {filteredMenuItems.some(x => x.path === "/projects") && (
                          <button
                            type="button"
                            onClick={() => router.push("/projects")}
                            className={`w-full px-3 py-2 rounded-lg font-bold text-[11px] flex items-center justify-start gap-2.5 transition-all duration-200 cursor-pointer border ${
                              pathname === "/projects"
                                ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                                : "text-[#F0E6D2]/70 border-transparent hover:text-[#D4AF37]"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${pathname === "/projects" ? "bg-[#D4AF37] animate-pulse" : "bg-gray-700"}`} />
                            <span>المشاريع والمواقع </span>
                          </button>
                        )}
                        {filteredMenuItems.some(x => x.path === "/estimates") && (
                          <button
                            type="button"
                            onClick={() => router.push("/estimates")}
                            className={`w-full px-3 py-2 rounded-lg font-bold text-[11px] flex items-center justify-start gap-2.5 transition-all duration-200 cursor-pointer border ${
                              pathname === "/estimates"
                                ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                                : "text-[#F0E6D2]/70 border-transparent hover:text-[#D4AF37]"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${pathname === "/estimates" ? "bg-[#D4AF37] animate-pulse" : "bg-gray-700"}`} />
                            <span>المقايسات والـ BOQ</span>
                          </button>
                        )}
                        {filteredMenuItems.some(x => x.path === "/maintenance") && (
                          <button
                            type="button"
                            onClick={() => router.push("/maintenance")}
                            className={`w-full px-3 py-2 rounded-lg font-bold text-[11px] flex items-center justify-start gap-2.5 transition-all duration-200 cursor-pointer border ${
                              pathname === "/maintenance"
                                ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                                : "text-[#F0E6D2]/70 border-transparent hover:text-[#D4AF37]"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${pathname === "/maintenance" ? "bg-[#D4AF37] animate-pulse" : "bg-gray-700"}`} />
                            <span> الضمان والصيانة</span>
                          </button>
                        )}
                        {filteredMenuItems.some(x => x.path === "/settings") && (
                          <button
                            type="button"
                            onClick={() => router.push("/settings")}
                            className={`w-full px-3 py-2 rounded-lg font-bold text-[11px] flex items-center justify-start gap-2.5 transition-all duration-200 cursor-pointer border ${
                              pathname === "/settings"
                                ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                                : "text-[#F0E6D2]/70 border-transparent hover:text-[#D4AF37]"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${pathname === "/settings" ? "bg-[#D4AF37] animate-pulse" : "bg-gray-700"}`} />
                            <span>الإعدادات الفنية للحصر</span>
                          </button>
                        )}
                      </div>
                    </li>
                  );
                }
                return null;
              }

              // 3. المجموعة الثالثة: التنسيق والجدولة المشتركة والمهام
              if (COLLAB_PATHS.includes(item.path)) {
                if (item.path === "/appointments") {
                  const isAnySubActive = COLLAB_PATHS.includes(pathname);
                  return (
                    <li key="collab-accordion" className="space-y-1 animate-fade-in">
                      <button
                        type="button"
                        onClick={() => setIsCollabOpen(!isCollabOpen)}
                        className={`w-full px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all duration-300 cursor-pointer border ${
                          isAnySubActive 
                            ? "border-[#D4AF37]/50 text-[#D4AF37] bg-[#07132a]/60 shadow-[0_0_12px_rgba(212,175,55,0.15)]" 
                            : "text-[#F0E6D2]/80 border-transparent hover:bg-[#07132a] hover:border-[#D4AF37]/35 hover:text-[#D4AF37]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <CalendarDays size={15} className={isAnySubActive ? "text-[#D4AF37]" : "text-[#F0E6D2]/40"} />
                          <span>التنسيق المشتركة</span>
                        </div>
                        <ChevronDown 
                          size={14} 
                          className={`transition-transform duration-300 ${isCollabOpen ? "rotate-180 text-[#D4AF37]" : "text-[#F0E6D2]/40"}`} 
                        />
                      </button>

                      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                        isCollabOpen 
                          ? "max-h-48 opacity-100 mt-1.5 space-y-1 pr-3 border-r border-[#D4AF37]/20 mr-2" 
                          : "max-h-0 opacity-0 pointer-events-none"
                      }`}>
                        {filteredMenuItems.some(x => x.path === "/appointments") && (
                          <button
                            type="button"
                            onClick={() => router.push("/appointments")}
                            className={`w-full px-3 py-2 rounded-lg font-bold text-[11px] flex items-center justify-start gap-2.5 transition-all duration-200 cursor-pointer border ${
                              pathname === "/appointments"
                                ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                                : "text-[#F0E6D2]/70 border-transparent hover:text-[#D4AF37]"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${pathname === "/appointments" ? "bg-[#D4AF37] animate-pulse" : "bg-gray-700"}`} />
                            <span> المواعيد واللقاءات</span>
                          </button>
                        )}
                        {filteredMenuItems.some(x => x.path === "/collaboration") && (
                          <button
                            type="button"
                            onClick={() => router.push("/collaboration")}
                            className={`w-full px-3 py-2 rounded-lg font-bold text-[11px] flex items-center justify-start gap-2.5 transition-all duration-200 cursor-pointer border ${
                              pathname === "/collaboration"
                                ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                                : "text-[#F0E6D2]/70 border-transparent hover:text-[#D4AF37]"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${pathname === "/collaboration" ? "bg-[#D4AF37] animate-pulse" : "bg-gray-700"}`} />
                            <span>التواصل والدردشة </span>
                          </button>
                        )}
                        {filteredMenuItems.some(x => x.path === "/notes") && (
                          <button
                            type="button"
                            onClick={() => router.push("/notes")}
                            className={`w-full px-3 py-2 rounded-lg font-bold text-[11px] flex items-center justify-start gap-2.5 transition-all duration-200 cursor-pointer border ${
                              pathname === "/notes"
                                ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                                : "text-[#F0E6D2]/70 border-transparent hover:text-[#D4AF37]"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${pathname === "/notes" ? "bg-[#D4AF37] animate-pulse" : "bg-gray-700"}`} />
                            <span>المهام والملاحظات</span>
                          </button>
                        )}
                      </div>
                    </li>
                  );
                }
                return null;
              }

              // 4. المجموعة الرابعة: المالية والحسابات الموحدة
              if (FINANCE_PATHS.includes(item.path)) {
                if (item.path === "/treasury") {
                  const isAnySubActive = FINANCE_PATHS.includes(pathname);
                  return (
                    <li key="finance-accordion" className="space-y-1 animate-fade-in">
                      <button
                        type="button"
                        onClick={() => setIsFinanceOpen(!isFinanceOpen)}
                        className={`w-full px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all duration-300 cursor-pointer border ${
                          isAnySubActive 
                            ? "border-[#D4AF37]/50 text-[#D4AF37] bg-[#07132a]/60 shadow-[0_0_12px_rgba(212,175,55,0.15)]" 
                            : "text-[#F0E6D2]/80 border-transparent hover:bg-[#07132a] hover:border-[#D4AF37]/35 hover:text-[#D4AF37]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Wallet size={15} className={isAnySubActive ? "text-[#D4AF37]" : "text-[#F0E6D2]/40"} />
                          <span>المالية والحسابات </span>
                        </div>
                        <ChevronDown 
                          size={14} 
                          className={`transition-transform duration-300 ${isFinanceOpen ? "rotate-180 text-[#D4AF37]" : "text-[#F0E6D2]/40"}`} 
                        />
                      </button>

                      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                        isFinanceOpen 
                          ? "max-h-48 opacity-100 mt-1.5 space-y-1 pr-3 border-r border-[#D4AF37]/20 mr-2" 
                          : "max-h-0 opacity-0 pointer-events-none"
                      }`}>
                        {filteredMenuItems.some(x => x.path === "/treasury") && (
                          <button
                            type="button"
                            onClick={() => router.push("/treasury")}
                            className={`w-full px-3 py-2 rounded-lg font-bold text-[11px] flex items-center justify-start gap-2.5 transition-all duration-200 cursor-pointer border ${
                              pathname === "/treasury"
                                ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                                : "text-[#F0E6D2]/70 border-transparent hover:text-[#D4AF37]"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${pathname === "/treasury" ? "bg-[#D4AF37] animate-pulse" : "bg-gray-700"}`} />
                            <span>الدفتر العام والخزينة</span>
                          </button>
                        )}

                        {filteredMenuItems.some(x => x.path === "/payroll") && (
                          <button
                            type="button"
                            onClick={() => router.push("/payroll")}
                            className={`w-full px-3 py-2 rounded-lg font-bold text-[11px] flex items-center justify-start gap-2.5 transition-all duration-200 cursor-pointer border ${
                              pathname === "/payroll"
                                ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                                : "text-[#F0E6D2]/70 border-transparent hover:text-[#D4AF37]"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${pathname === "/payroll" ? "bg-[#D4AF37] animate-pulse" : "bg-gray-700"}`} />
                            <span> الرواتب والخصومات</span>
                          </button>
                        )}

                        {filteredMenuItems.some(x => x.path === "/disbursements") && (
                          <button
                            type="button"
                            onClick={() => router.push("/disbursements")}
                            className={`w-full px-3 py-2 rounded-lg font-bold text-[11px] flex items-center justify-start gap-2.5 transition-all duration-200 cursor-pointer border ${
                              pathname === "/disbursements"
                                ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                                : "text-[#F0E6D2]/70 border-transparent hover:text-[#D4AF37]"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${pathname === "/disbursements" ? "bg-[#D4AF37] animate-pulse" : "bg-gray-700"}`} />
                            <span>صرف الخامات للمواقع</span>
                          </button>
                        )}
                      </div>
                    </li>
                  );
                }
                return null;
              }

              return (
                <li key={item.path}>
                  <button
                    type="button"
                    onClick={() => router.push(item.path)}
                    data-hint={item.hint}
                    className={`w-full px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-start gap-3 transition-all duration-300 cursor-pointer border relative overflow-hidden ${
                      isActive 
                        ? "royal-active-btn" 
                        : "text-[#F0E6D2]/80 border-transparent hover:bg-[#07132a] hover:border-[#D4AF37]/35 hover:text-[#D4AF37] hover:translate-x-[-3px]"
                    }`}
                  >
                    {/* نبضة نيون ذهبية دائرية تظهر بجانب الخيار النشط بالسايدبار لتوحيد النسق */}
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_6px_#D4AF37] animate-pulse shrink-0" />
                    )}

                    <Icon size={15} className={`shrink-0 transition-colors duration-300 ${isActive ? "text-[#D4AF37]" : "text-[#F0E6D2]/40"}`} />
                    <span className="truncate">{item.name}</span>

                    {/* خط الليزر السفلي المتوهج بقاع الخيار النشط بالسايدبار */}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] royal-laser-line animate-pulse pointer-events-none" />
                    )}
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
              جميع الحقوق محفوظة © ٢٠٢٦ جولدن ديكور
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}