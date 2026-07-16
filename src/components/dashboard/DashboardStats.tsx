"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { 
  Users, 
  Construction, 
  FileSignature, 
  Coins, 
  TrendingUp, 
  AlertTriangle 
} from "lucide-react";

export default function DashboardStats() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    customersCount: 0,
    activeProjectsCount: 0,
    totalContracts: 0,
    totalReceivables: 0,
    monthlyProfit: 0,
    delayedProjectsCount: 0
  });

  useEffect(() => {
    async function fetchLiveDashboardStats() {
      try {
        const todayStr = new Date().toLocaleDateString("en-CA"); 

        // جلب الإحصائيات مع دمج تفاصيل المشاريع لجمع الأرقام والتقديرات بدقة الملايين
        const [
          { count: customersCount },
          { data: projectsData }, // جلب المشاريع مع مساحاتها والمقايسات المرتبطة بها
          { data: financialTransactions },
          { count: delayedCount }
        ] = await Promise.all([
          supabase.from("customers").select("*", { count: "exact", head: true }),
          supabase.from("projects").select(`
            status,
            area,
            estimate_headers (
              grand_total
            )
          `),
          supabase.from("transactions").select("amount, type"),
          supabase.from("tasks").select("project_id", { count: "exact", head: true }).neq("status", "completed").lt("due_date", todayStr)
        ]);

        // 1. حساب إجمالي عدد المشاريع الجارية الفعلي (غير منتهية)
        const activeProjectsList = (projectsData || []).filter((p: any) => p.status !== "completed");
        const activeProjectsCount = activeProjectsList.length;

        // 2. حساب إجمالي قيمة العقود بمطابقة تامة لنفس خوارزمية التقدير بالجدول
        const totalContractsSum = (projectsData || []).reduce((sum, item: any) => {
          const contractValue = item.estimate_headers?.[0]?.grand_total || (Number(item.area || 0) * 5000);
          return sum + Number(contractValue);
        }, 0);

        // 3. حساب إجمالي الوارد (Inflow) والصادر (Outflow) من حركات الخزينة الحقيقية
        const totalInflow = (financialTransactions || [])
          .filter((t: any) => t.type === "inflow")
          .reduce((sum, t: any) => sum + Number(t.amount || 0), 0);

        const totalOutflow = (financialTransactions || [])
          .filter((t: any) => t.type === "outflow")
          .reduce((sum, t: any) => sum + Number(t.amount || 0), 0);

        // 4. الحسابات المالية الحقيقية (صافي الخزينة والمستحقات المتبقية بالخارج)
        const realProfitSum = totalInflow - totalOutflow;
        const realReceivablesSum = totalContractsSum - totalInflow;

        setStats({
          customersCount: customersCount || 0,
          activeProjectsCount: activeProjectsCount,
          totalContracts: totalContractsSum,
          totalReceivables: realReceivablesSum > 0 ? realReceivablesSum : 0,
          monthlyProfit: realProfitSum,
          delayedProjectsCount: delayedCount || 0
        });
      } catch (err: any) {
        console.error("Error fetching dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchLiveDashboardStats();
  }, []);

  const cardsData = [
    {
      title: "عدد العملاء",
      value: loading ? "..." : stats.customersCount,
      change: "+12%",
      icon: Users,
      color: "border-[#D4AF37]/20 hover:border-[#D4AF37] hover:shadow-[0_0_20px_rgba(212,175,55,0.12)]",
      iconBg: "bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37]",
      path: "/customers"
    },
    {
      title: "المشاريع الجارية",
      value: loading ? "..." : stats.activeProjectsCount,
      change: "+8%",
      icon: Construction,
      color: "border-[#D4AF37]/20 hover:border-[#D4AF37] hover:shadow-[0_0_20px_rgba(212,175,55,0.12)]",
      iconBg: "bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37]",
      path: "/projects"
    },
    {
      title: "إجمالي قيمة العقود",
      value: loading ? "..." : `${stats.totalContracts.toLocaleString('en-US')} ج.م`,
      change: "+15%",
      icon: FileSignature,
      color: "border-[#D4AF37]/20 hover:border-[#D4AF37] hover:shadow-[0_0_25px_rgba(212,175,55,0.15)]",
      iconBg: "bg-[#020B1C] border border-[#D4AF37]/35 text-[#D4AF37]",
      path: "/treasury"
    },
    {
      title: "إجمالي المستحقات",
      value: loading ? "..." : `${stats.totalReceivables.toLocaleString('en-US')} ج.م`,
      icon: Coins,
      color: "border-[#D4AF37]/20 hover:border-[#D4AF37] hover:shadow-[0_0_25px_rgba(212,175,55,0.15)]",
      iconBg: "bg-[#020B1C] border border-[#D4AF37]/35 text-[#D4AF37]",
      path: "/treasury"
    },
    {
      title: "صافي الأرباح",
      value: loading ? "..." : `${stats.monthlyProfit.toLocaleString('en-US')} ج.م`,
      change: "+21%",
      icon: TrendingUp,
      color: stats.monthlyProfit >= 0 
        ? "border-emerald-500/20 hover:border-emerald-500 hover:shadow-[0_0_25px_rgba(16,185,129,0.12)]" 
        : "border-red-500/20 hover:border-red-500 hover:shadow-[0_0_25px_rgba(239,68,68,0.12)]",
      iconBg: stats.monthlyProfit >= 0 
        ? "bg-[#020B1C] border border-emerald-500/35 text-emerald-400" 
        : "bg-[#020B1C] border border-red-500/35 text-red-400",
      path: "/treasury"
    },
    {
      title: "المشاريع المتأخرة",
      value: loading ? "..." : stats.delayedProjectsCount,
      icon: AlertTriangle,
      color: stats.delayedProjectsCount > 0 
        ? "border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)] text-red-400 animate-pulse hover:border-red-500" 
        : "border-[#D4AF37]/20 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)]",
      iconBg: stats.delayedProjectsCount > 0 
        ? "bg-[#020B1C] border border-red-500/40 text-red-400" 
        : "bg-[#020B1C] border border-[#D4AF37]/20 text-[#F0E6D2]/50",
      path: "/projects"
    }
  ];

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800;900&display=swap');
        
        .font-alexandria {
          font-family: 'Alexandria', Arial, sans-serif !important;
          letter-spacing: normal !important;
        }
      `}</style>

      <div dir="rtl" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 font-alexandria">
        {cardsData.map((card, index) => {
          const IconComponent = card.icon;
          return (
            <div
              key={index}
              onClick={() => card.path && router.push(card.path)}
              className={`p-4.5 rounded-2xl bg-[#07132a] border transition-all duration-300 transform hover:translate-y-[-4px] flex flex-col justify-between cursor-pointer select-none ${card.color}`}
              title={`اضغط لمشاهدة تفاصيل ${card.title}`}
            >
              <div className="flex justify-between items-start w-full">
                {/* الأيقونة الفاخرة المعتمدة مع حاضنة دائرية مذهبة ومصقولة */}
                <div className={`p-2.5 rounded-xl shrink-0 flex items-center justify-center ${card.iconBg}`}>
                  <IconComponent size={18} strokeWidth={1.8} />
                </div>

                {/* نسبة التغير الفني بمؤشر ملوكي ناعم */}
                {card.change && (
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black ${
                    card.title === "صافي الأرباح" && stats.monthlyProfit < 0 
                      ? "bg-red-500/10 text-red-400" 
                      : "bg-emerald-500/10 text-emerald-400"
                  }`}>
                    {card.change}
                  </span>
                )}
              </div>

              {/* الكتلة الرقمية والبيانية */}
              <div className="mt-5 text-right w-full">
                <p className="text-[#F0E6D2]/80 text-xs font-bold leading-normal">{card.title}</p>
                <h3 className="text-white text-base md:text-[17px] font-black mt-1.5 font-mono leading-none tracking-normal">
                  {card.value}
                </h3>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}