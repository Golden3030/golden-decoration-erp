"use client";

import { useEffect, useState } from "react"; 
import { useRouter } from "next/navigation"; 
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

import ProjectsTable from "@/components/dashboard/ProjectsTable";
import Notifications from "@/components/dashboard/Notifications";

import Tasks from "@/components/dashboard/Tasks";
import PerformanceChart from "@/components/dashboard/PerformanceChart";
import PerformanceIndicators from "@/components/dashboard/PerformanceIndicators";

import RecentActivities from "@/components/dashboard/RecentActivities";
import UpcomingProjects from "@/components/dashboard/UpcomingProjects";

import { supabase } from "@/lib/supabaseClient";
import { 
  Users, 
  Activity, 
  ClipboardList, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  Clock,
  Target,       
  Bell,         
  FileSignature,
  Sparkles,
  Wallet,
  Loader2 // 👈 أضف هذه الأيقونة المفقودة في الاستيراد لحل المشكلة البرمجية رقم 5
} from "lucide-react";

interface DashboardStatsState {
  customers: number;
  activeProjects: number;
  pendingEstimates: number;
  contracted: number;
  revenue: number;
  costs: number;
}

// 📅 مكون التقويم التفاعلي المطور لدعم المواعيد المتعددة والمزامنة الحية - ديناميكي بالكامل لأي شهر وسنة
const ARABIC_MONTH_NAMES = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

const MiniCalendar = () => {
  // ✅ إصلاح: كان الشهر/السنة/اليوم الحالي كلهم ثابتين يدوياً على يوليو 2026
  // فكان التقويم هيتعطل تماماً (صفر مواعيد، تاريخ غلط) بمجرد ما يعدي الشهر ده
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  const todayDate = now.getDate();

  const [selectedDay, setSelectedDay] = useState<number>(todayDate);
  const [events, setEvents] = useState<Record<number, string[]>>({}); 
  const [loadingEvents, setLoadingEvents] = useState(true);

  // جلب المواعيد النشطة للشهر الحالي حيوياً من قاعدة البيانات
  useEffect(() => {
    async function fetchLiveCalendarEvents() {
      try {
        setLoadingEvents(true);

        const monthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0);
        const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

        const { data, error } = await supabase
          .from("appointments")
          .select("title, start_time")
          .eq("status", "scheduled")
          .gte("start_time", monthStart.toISOString())
          .lte("start_time", monthEnd.toISOString());

        if (error) throw error;

        const mappedEvents: Record<number, string[]> = {};
        (data || []).forEach((app: any) => {
          const dateObj = new Date(app.start_time);
          const day = dateObj.getDate(); // استخراج رقم اليوم الفعلي
          
          if (!mappedEvents[day]) {
            mappedEvents[day] = [];
          }
          mappedEvents[day].push(app.title);
        });

        setEvents(mappedEvents);
      } catch (err) {
        console.error("Error loading live calendar events:", err);
      } finally {
        setLoadingEvents(false);
      }
    }

    fetchLiveCalendarEvents();
  }, [currentYear, currentMonth]);

  // ✅ حساب عدد أيام الشهر الحالي فعلياً (بدل الرقم الثابت 31)
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  // ✅ حساب يوم بداية الشهر الفعلي في الأسبوع (0 = أحد) بدل الأوفست الثابت
  const startOffset = new Date(currentYear, currentMonth, 1).getDay();

  const daysArray = [];
  for (let i = 0; i < startOffset; i++) {
    daysArray.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    daysArray.push(i);
  }

  return (
    <div className="bg-[#07132a] border border-[#D4AF37] rounded-2xl p-5 space-y-4 shadow-xl text-right ai-chat-scroll">
      {/* تحويل لون ترويسة العنوان للون البني البرونزي المعتمد `#A17A4C` */}
      <h3 className="text-[#D4AF37] font-black text-xs md:text-sm border-b border-[#D4AF37] pb-2 select-none flex items-center justify-between">
        <span>📅 جدول المواعيد والمعاينات</span>
        <span className="text-[10px] bg-[#020B1C] px-2.5 py-1 rounded-md text-gray-400 font-mono font-bold">{ARABIC_MONTH_NAMES[currentMonth]} {currentYear}</span>
      </h3>

      {/* أسماء الأيام */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-[#F0E6D2] select-none pb-1">
        <span>أحد</span>
        <span>إثن</span>
        <span>ثلا</span>
        <span>أرب</span>
        <span>خميس</span>
        <span>جمع</span>
        <span>سبت</span>
      </div>

      {/* شبكة الأيام */}
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {daysArray.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />;
          }

          const hasEvent = !!events[day] && events[day].length > 0;
          const isSelected = selectedDay === day;
          const isCurrentToday = todayDate === day;

          return (
            <button
              key={`day-${day}`}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all duration-200 cursor-pointer flex flex-col items-center justify-center relative ${
                isSelected
                  ? "border-2 border-[#D4AF37] text-white bg-[#020B1C]/30 shadow-[0_0_12px_rgba(212,175,55,0.15)]" 
                  : isCurrentToday
                  ? "bg-[#D4AF37] text-[#020B1C]" 
                  : "bg-[#F0E6D2] text-black hover:border-slate-600 border border-transparent"
              }`}
            >
              <span>{day}</span>
              {hasEvent && (
                <span className={`w-1.5 h-1.5 rounded-full absolute bottom-1 ${isSelected ? "bg-[#D4AF37]" : "bg-[#D4AF37]"}`} />
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-[#020B1C]/80 border border-[#D4AF37]/20 rounded-2xl p-4 text-right animate-fade-in space-y-2.5">
        <p className="text-[#D4AF37] text-xs font-black select-none">
          📍 تفاصيل يوم {selectedDay} {ARABIC_MONTH_NAMES[currentMonth]}:
        </p>
        
        {loadingEvents ? (
          <span className="text-gray-500 animate-pulse font-bold block text-center text-[10px]">جاري استرجاع المواعيد من قاعدة البيانات...</span>
        ) : events[selectedDay] && events[selectedDay].length > 0 ? (
          <div className="space-y-2">
            {events[selectedDay].map((eventTitle, index) => (
              <div key={index} className="flex items-start gap-2 text-white text-xs font-black leading-relaxed">
                <span className="text-[#D4AF37] select-none text-[9px] mt-0.5">◀</span>
                <span className="flex-1">{eventTitle}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-[10px] font-bold leading-relaxed">لا توجد مواعيد أو معاينات مجدولة لهذا اليوم بالسيستم.</p>
        )}
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();

  const [userRole, setUserRole] = useState<string>("sales");
  const [loadingRole, setLoadingRole] = useState<boolean>(true);

  const [stats, setStats] = useState<DashboardStatsState>({
    customers: 0,
    activeProjects: 0,
    pendingEstimates: 0,
    contracted: 0,
    revenue: 0,
    costs: 0
  });

  useEffect(() => {
    document.title = "لوحة التحكم الإدارية | Golden Decoration";
    loadUserRoleAndStats();
  }, []);

  async function loadUserRoleAndStats() {
    setLoadingRole(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      const roleKey = String(profile?.role || "sales").toLowerCase();
      setUserRole(roleKey);

      const [custCount, projCount, estCount, contractedCount, financialData] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("projects").select("id", { count: "exact", head: true }).eq("unit_status", "جاري التنفيذ الميداني"),
        supabase.from("projects").select("id", { count: "exact", head: true }).eq("workflow_stage", "needs_estimate"),
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("status", "تم التعاقد"),
        supabase.from("estimate_headers").select("grand_total, materials_total, labor_total").eq("status", "نهائية")
      ]);

      const totalRevenue = (financialData.data || []).reduce((sum, h) => sum + Number(h.grand_total || 0), 0);
      const totalCosts = (financialData.data || []).reduce((sum, h) => sum + Number(h.materials_total || 0) + Number(h.labor_total || 0), 0);

      setStats({
        customers: custCount.count || 0,
        activeProjects: projCount.count || 0,
        pendingEstimates: estCount.count || 0,
        contracted: contractedCount.count || 0,
        revenue: totalRevenue,
        costs: totalCosts
      });

    } catch (err) {
      console.error("خطأ أثناء جلب وتحليل البيانات:", err);
    } finally {
      setLoadingRole(false);
    }
  }

  const isFinancialStaff = ["admin", "owner", "manager", "accountant"].includes(userRole);
  const isOperationalStaff = ["admin", "owner", "manager", "sales_manager", "sales", "procurement", "accountant", "engineer"].includes(userRole);
  const isSalesStaff = ["admin", "owner", "manager", "sales_manager", "sales"].includes(userRole);
  const isEngineeringStaff = ["admin", "owner", "manager", "engineer", "procurement"].includes(userRole);

  if (loadingRole) {
    return (
      <div className="min-h-screen bg-[#020B1C] flex items-center justify-center text-[#D4AF37] font-black select-none">
        <div className="text-center">
          <Loader2 className="animate-spin text-[#D4AF37] mx-auto mb-4" size={40} />
          <p className="text-sm font-black animate-pulse">جاري تحميل لوحة التحكم Golden Decoration ERP...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#020B1C] relative overflow-hidden" dir="rtl">
      
      {/* 🛠️ جدار الحماية البصري الموحد لتوحيد شريط التمرير الفاخر 8px بأسهم التحكم */}
      <style dangerouslySetInnerHTML={{__html: `
        ::-webkit-scrollbar { width: 4px !important; height: 4px !important; }
        ::-webkit-scrollbar-track { background: #020B1C !important; }
        ::-webkit-scrollbar-thumb { background: #D4AF37 !important; border-radius: 9999px !important; }
        ::-webkit-scrollbar-thumb:hover { background: #C9A45D !important; }

        /* تلوين أزرار أسهم الصعود والهبوط يدوياً لشريط التمرير */
        ::-webkit-scrollbar-button {
          display: block !important;
          background-color: #020B1C !important;
          height: 10px !important;
          width: 10px !important;
        }
        ::-webkit-scrollbar-button:vertical:decrement {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23D4AF37'><polygon points='50,20 15,80 85,80'/></svg>") !important;
          background-size: 6px !important;
          background-repeat: no-repeat !important;
          background-position: center !important;
        }
        ::-webkit-scrollbar-button:vertical:increment {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23D4AF37'><polygon points='15,20 85,20 50,80'/></svg>") !important;
          background-size: 6px !important;
          background-repeat: no-repeat !important;
          background-position: center !important;
        }
        
        th, .table-header {
          font-size: 0.7rem !important;
          font-weight: 900 !important;
          color: #D4AF37 !important;
          text-align: right !important;
          padding: 12px 14px !important;
          border-bottom: 2px solid rgba(212, 175, 55, 0.2) !important;
          background-color: #0b1b3d !important;
        }

        td, .table-cell {
          font-size: 0.75rem !important;
          font-weight: 700 !important;
          color: #F0E6D2 !important;
          text-align: right !important;
          padding: 12px 14px !important;
          border-bottom: 1px solid rgba(212, 231, 144, 0.1) !important;
        }
      `}} />

      <Sidebar />

      <section className="w-full lg:pr-56 min-h-screen flex flex-col z-10 relative">
        <Header />

        <div className="p-4 md:p-8 space-y-8 text-right font-sans animate-fade-in">

          <div className="flex justify-between items-center border-b border-[#D4AF37]/20 pb-5">
            <div>
              {/* تصغير حجم العنوان الرئيسي للتوافق مع الدستور الجمالي الموحد */}
              <h1 className="text-xl md:text-2xl font-black text-[#D4AF37] flex items-center gap-2">
                <span>لوحة التحكم الرئيسية لـ Golden Decoration ERP</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-pulse" />
              </h1>
              {/* تعديل لون الشرح أسفل العنوان للأبيض الصافي لتعزيز التباين البصري */}
              <p className="text-white text-xs mt-2 ">مراقبة تفاعلية للعمليات والمؤشرات المالية والمشاريع الجارية.</p>
            </div>

            <button
              onClick={loadUserRoleAndStats}
              className="p-3 rounded-xl bg-[#07132a] border border-[#D4AF37]/40 hover:border-[#D4AF37] text-[#D4AF37] transition duration-300"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* 1. الإحصائيات مع الإطارات شبه الشفافة الفاخرة */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard icon={<Users />} label="عملاء CRM" value={stats.customers} onClick={() => router.push("/customers")} />
            <StatCard icon={<Activity />} label="مشاريع جارية" value={stats.activeProjects} onClick={() => router.push("/projects")} />
            <StatCard icon={<Clock />} label="مقايسات معلقة" value={stats.pendingEstimates} onClick={() => router.push("/estimates")} />
            <StatCard icon={<ShieldCheck />} label="تعاقدات نهائية" value={stats.contracted} onClick={() => router.push("/estimates")} />
            
            {isFinancialStaff ? (
              <>
                <StatCard icon={<TrendingUp className="text-emerald-400" />} label="إيرادات" value={`${stats.revenue.toLocaleString()} ج.م`} onClick={() => router.push("/reports")} />
                <StatCard icon={<TrendingDown className="text-rose-400" />} label="تكاليف" value={`${stats.costs.toLocaleString()} ج.م`} onClick={() => router.push("/reports")} />
              </>
            ) : (
              <div className="p-4 rounded-2xl bg-[#07132a]/40 border border-[#1f2d4d] flex flex-col justify-center items-center opacity-50 select-none">
                <span className="text-[10px] font-black text-gray-500 italic">بيانات مالية محجوبة</span>
              </div>
            )}
          </div>

          {/* 2. جدول المشاريع مدمج بالحدود شبه الشفافة */}
          {isOperationalStaff && (
            <div className="bg-[#07132a] border border-[#D4AF37] rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-[#D4AF37] bg-[#0b1b3d]/60 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-[#D4AF37]" />
                {/* تحويل لون ترويسة العنوان للون البني البرونزي المعتمد `#A17A4C` */}
                <h3 className="text-[#D4AF37] font-black text-xs md:text-sm">تتبع المشاريع الميدانية</h3>
              </div>
              <div className="overflow-x-auto max-h-[400px] ai-chat-scroll">
                <ProjectsTable />
              </div>
            </div>
          )}

          {/* 3. المهام والمخطط */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {isEngineeringStaff && (
              <div className="xl:col-span-1 bg-[#07132a] border border-[#D4AF37] rounded-2xl shadow-xl overflow-hidden">
                <div className="p-4 border-b border-[#D4AF37] bg-[#0b1b3d]/60 flex items-center gap-2">
                  <ClipboardList className="w-6 h-6 text-[#D4AF37]" />
                  {/* تحويل لون ترويسة عنوان المهام للون البني البرونزي المعتمد `#A17A4C` */}
                  <h3 className="text-[#D4AF37] font-black text-xs md:text-sm">المهام الهندسية</h3>
                </div>
                <Tasks />
              </div>
            )}

            {isFinancialStaff && (
              <div className="xl:col-span-2 bg-[#07132a] border border-[#D4AF37] rounded-2xl shadow-xl overflow-hidden">
                <div className="p-4 border-b border-[#D4AF37] bg-[#0b1b3d]/60 flex items-center gap-2">
                  <Wallet className="w-6 h-6 text-[#D4AF37]" />
                  {/* تحويل لون ترويسة العنوان للبني المعتمد `#A17A4C` */}
                  <h3 className="text-[#D4AF37] font-black text-xs md:text-sm">التدفقات النقدية</h3>
                </div>
                <PerformanceChart />
              </div>
            )}
          </div>

          {/* 4. المؤشرات والتنبيهات */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {isFinancialStaff && (
              <div className="xl:col-span-1 bg-[#07132a] border border-[#D4AF37] rounded-2xl shadow-xl overflow-hidden">
                <div className="p-4 border-b border-[#D4AF37] bg-[#0b1b3d]/60 flex items-center gap-2">
                  <Target className="w-6 h-6 text-[#D4AF37]" />
                  {/* تحويل لون ترويسة العنوان للبني المعتمد `#A17A4C` */}
                  <h3 className="text-[#D4AF37] font-black text-xs md:text-sm">كفاءة الأداء</h3>
                </div>
                <PerformanceIndicators />
              </div>
            )}

            {isOperationalStaff && (
              <div className="xl:col-span-2 bg-[#07132a] border border-[#D4AF37] rounded-2xl shadow-xl overflow-hidden">
                <div className="p-4 border-b border-[#D4AF37] bg-[#0b1b3d]/60 flex items-center gap-2">
                  <Bell className="w-6 h-6 text-[#D4AF37]" />
                  {/* تحويل لون ترويسة العنوان للبني المعتمد `#A17A4C` */}
                  <h3 className="text-[#D4AF37] font-black text-xs md:text-sm">مركز الإشعارات والتحليلات</h3>
                </div>
                <Notifications />
              </div>
            )}
          </div>

          {/* 5. الأنشطة والتعاقدات والتقويم */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-[#07132a] border border-[#D4AF37] rounded-2xl shadow-xl overflow-hidden">
              <div className="p-4 border-b border-[#D4AF37] bg-[#0b1b3d]/60 flex items-center gap-2">
                <Activity className="w-6 h-6 text-[#D4AF37]" />
                {/* تحويل لون ترويسة العنوان للبني المعتمد `#A17A4C` */}
                <h3 className="text-[#D4AF37] font-black text-xs md:text-sm">آخر الأنشطة والعمليات الميدانية</h3>
              </div>
              <RecentActivities />
            </div>

            <div className="bg-[#07132a] border border-[#D4AF37] rounded-2xl shadow-xl overflow-hidden">
              <div className="p-4 border-b border-[#D4AF37] bg-[#0b1b3d]/60 flex items-center gap-2">
                <FileSignature className="w-6 h-6 text-[#D4AF37]" />
                {/* تحويل لون ترويسة العنوان للبني المعتمد `#A17A4C` */}
                <h3 className="text-[#D4AF37] font-black text-xs md:text-sm">التعاقدات القادمة وعقود الملاك</h3>
              </div>
              <UpcomingProjects />
            </div>

            <MiniCalendar />
          </div>

        </div>
      </section>
    </main>
  );
}

// مكون فرعي لبطاقات الإحصائيات لتقليل التكرار مدمج بالإطارات الشفافة الرفيعة
function StatCard({ icon, label, value, onClick }: { icon: any, label: string, value: any, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="p-4 rounded-2xl bg-[#07132a] border border-[#D4AF37]/40 flex flex-col justify-between hover:scale-[1.03] hover:border-[#D4AF37] transition duration-300 shadow-lg cursor-pointer group"
    >
      <div className="flex justify-between items-center w-full">
        <div className="text-[#D4AF37] group-hover:scale-110 transition-transform">{icon}</div>
        <span className="text-[#F0E6D2] text-xs md:text-sm font-mono">{value}</span>
      </div>
      <div className="mt-3 text-right">
        {/* تحويل مسمى شارة الإحصاء للون البني البرونزي المعتمد `#A17A4C` */}
        <p className="text-[#D4AF37] text-[10px] font-black uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}