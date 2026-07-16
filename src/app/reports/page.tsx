"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  FileText, 
  Users, 
  AlertTriangle, 
  Printer, 
  Filter, 
  Percent, 
  Activity,
  Download,
  ShieldCheck,
  TrendingDown,
  UserCheck,
  Coins,
  Receipt,
  Loader2,
  HardHat,
  Scale,
  Banknote,
  Minus,
  Check,
  Cpu,
  User,
  Box,
  ChevronLeft
} from "lucide-react";

interface SubcontractorEV {
  id: string;
  name: string;
  specialty: string;
  projectName: string;
  contractValue: number;
  totalPaid: number;
  remainingDue: number;
  paymentPercentage: number;
  physicalProgress: number;
  variance: number;
  statusAlert: string;
}

interface SalesConversion {
  salesName: string;
  totalLeads: number;
  activeLeads: number;
  contractedLeads: number;
  conversionRate: number;
}

interface MaterialsVariance {
  projectName: string;
  estimatedCost: number;
  actualCost: number;
  variance: number;
  status: string;
}

const specialtyLabels: Record<string, string> = {
  plaster: "أعمال المحارة والترميمات",
  paint: "أعمال النقاشة والدهانات",
  flooring: "أعمال الأرضيات والسيراميك",
  ceiling: "أعمال الجبس والأسقف",
  doors: "أعمال الأبواب الخشبية",
  aluminum: "أعمال الشبابيك والألوميتال",
  electricity: "أعمال التأسيس والكهرباء",
  plumbing: "أعمال الصحي والسباكة",
  ac: "أعمال التكييفات وتمديد الفريون",
  decorations: "أعمال الديكورات الجمالية",
  materials_supplier: "مورد خامات ومستلزمات عامة"
};

const expenseCategories = [
  { key: "materials", label: "خامات ومواد أساسية" },
  { key: "labor", label: "مصنعيات وأجور" },
  { key: "shipping", label: "نقل ومون" },
  { key: "transport", label: "تنقلات ومواصلات" },
  { key: "tips", label: "إكراميات وبقشيش" },
  { key: "maintenance", label: "صيانة دورية" },
  { key: "tools", label: "أدوات وعدد تشغيل" },
  { key: "ads", label: "دعاية وإعلانات" },
  { key: "rent", label: "إيجار مقرات" },
  { key: "electricity", label: "كهرباء ومرافق" },
  { key: "internet", label: "إنترنت واتصالات" },
  { key: "others", label: "أخرى ونثريات" }
];

export default function ReportsDashboard() {
  const router = useRouter();

  const [startDate, setStartDate] = useState<string>("2026-01-01");
  const [endDate, setEndDate] = useState<string>("2026-12-31");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  
  const [activeTab, setActiveTab] = useState<"ledgers" | "profit_loss" | "expenses" | "debts" | "growth">("ledgers");

  const [selectedStatementPartnerId, setSelectedStatementPartnerId] = useState<string>("all");
  const [selectedStatementType, setSelectedStatementType] = useState<"customer" | "supplier" | "subcontractor">("customer");

  const [dbCustomers, setDbCustomers] = useState<any[]>([]);
  const [dbProjects, setDbProjects] = useState<any[]>([]);
  const [dbSubcontractors, setDbSubcontractors] = useState<any[]>([]);
  const [dbTransactions, setDbTransactions] = useState<any[]>([]);
  const [dbEstimates, setDbEstimates] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDatabaseData() {
      try {
        setIsLoading(true);
        setDbError(null);
        document.title = "التقارير المالية والتحليلات الشاملة | Golden Decoration";

        const [custRes, projRes, subRes, transRes, estRes, usersRes] = await Promise.all([
          supabase.from("customers").select("*"),
          supabase.from("projects").select("*"),
          supabase.from("subcontractors").select("*"),
          supabase.from("transactions").select("*"),
          supabase.from("estimate_headers").select("*"),
          supabase.from("users").select("id, name, role")
        ]);

        if (custRes.error) throw custRes.error;
        if (projRes.error) throw projRes.error;
        if (transRes.error) throw transRes.error;

        setDbCustomers(custRes.data || []);
        setDbProjects(projRes.data || []);
        setDbSubcontractors(subRes.data || []);
        setDbTransactions(transRes.data || []);
        setDbEstimates(estRes.data || []);
        setUsersList(usersRes.data || []);

      } catch (err: any) {
        console.error("Error loading reports data:", err);
        setDbError(err?.message || "فشل تحميل بعض مستندات التقارير من قاعدة البيانات.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchDatabaseData();
  }, []);

  const filteredTransactions = useMemo(() => {
    return dbTransactions.filter((t: any) => {
      const paymentDate = t.payment_date || t.created_at?.split("T")[0];
      const matchDate = paymentDate >= startDate && paymentDate <= endDate;
      const matchProject = selectedProjectId === "all" || t.project_id === selectedProjectId;
      return matchDate && matchProject;
    });
  }, [dbTransactions, startDate, endDate, selectedProjectId]);

  const statementPartnerData = useMemo(() => {
    if (!selectedStatementPartnerId) return null;

    if (selectedStatementType === "customer") {
      const cust = dbCustomers.find((c: any) => c.id === selectedStatementPartnerId);
      if (!cust) return null;
      const proj = dbProjects.find((p: any) => p.customer_id === cust.id) || {};
      const txs = filteredTransactions.filter((t: any) => t.project_id === proj.id && t.type === "inflow");
      const totalPaid = txs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const contractVal = Number(proj.contract_value || 0);

      return {
        name: cust.name,
        code: cust.customer_code || "CUST-XXXX",
        projectName: proj.project_name || "تحت التأسيس",
        contractValue: contractVal,
        totalPaid,
        remainingDue: Math.max(0, contractVal - totalPaid),
        txs
      };
    } else if (selectedStatementType === "supplier") {
      const sup = dbSubcontractors.find((s: any) => s.id === selectedStatementPartnerId && s.status === "supplier");
      if (!sup) return null;
      const txs = filteredTransactions.filter((t: any) => t.subcontractor_id === sup.id && t.type === "outflow");
      const totalPaid = txs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const purchases = Number(sup.contract_value || 0);

      return {
        name: sup.name,
        code: "SUPP-M1.2",
        projectName: "مورد معتمد للشركة",
        contractValue: purchases,
        totalPaid,
        remainingDue: Math.max(0, purchases - totalPaid),
        txs
      };
    } else {
      const sub = dbSubcontractors.find((s: any) => s.id === selectedStatementPartnerId && s.status !== "supplier");
      if (!sub) return null;
      const txs = filteredTransactions.filter((t: any) => t.subcontractor_id === sub.id && t.type === "outflow");
      const totalPaid = txs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const contractVal = Number(sub.contract_value || 0);

      return {
        name: sub.name,
        code: specialtyLabels[sub.specialty] || sub.specialty,
        projectName: dbProjects.find((p: any) => p.id === sub.project_id)?.project_name || "مشروعات متعددة",
        contractValue: contractVal,
        totalPaid,
        remainingDue: Math.max(0, contractVal - totalPaid),
        txs
      };
    }
  }, [selectedStatementPartnerId, selectedStatementType, dbCustomers, dbProjects, dbSubcontractors, filteredTransactions]);

  const projectProfitsReport = useMemo(() => {
    return dbProjects.map((proj: any) => {
      const contractValue = Number(proj.contract_value || 0);
      const executionCosts = dbTransactions
        .filter((t: any) => t.project_id === proj.id && t.type === "outflow" && t.category !== "administrative")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      
      const adminExpenses = dbTransactions
        .filter((t: any) => t.project_id === proj.id && t.type === "outflow" && t.category === "administrative")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const netProfit = contractValue - (executionCosts + adminExpenses);
      const margin = contractValue > 0 ? Math.round((netProfit / contractValue) * 100) : 0;

      return {
        projectName: proj.project_name,
        contractValue,
        executionCosts,
        adminExpenses,
        netProfit,
        margin
      };
    }).filter((p: any) => p.contractValue > 0);
  }, [dbProjects, dbTransactions]);

  const cashFlowTimelineReport = useMemo(() => {
    const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
    return months.map((m: string) => {
      const inMonth = dbTransactions
        .filter((t: any) => t.type === "inflow" && t.created_at?.split("-")[1] === m)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const outMonth = dbTransactions
        .filter((t: any) => t.type === "outflow" && t.created_at?.split("-")[1] === m)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      return {
        month: `شهر ${m}`,
        inflow: inMonth,
        outflow: outMonth,
        net: inMonth - outMonth
      };
    });
  }, [dbTransactions]);

  const categorizedExpenses = useMemo(() => {
    let totals: Record<string, number> = {
      materials: 0, labor: 0, shipping: 0, transport: 0, tips: 0, maintenance: 0, tools: 0, ads: 0, rent: 0, electricity: 0, internet: 0, others: 0
    };

    dbTransactions.filter((t: any) => t.type === "outflow").forEach((t: any) => {
      const amt = Number(t.amount || 0);
      if (t.category === "material_purchase") totals.materials += amt;
      else if (t.category === "subcontractor_labor") totals.labor += amt;
      else if (t.category === "other_out") {
        if (String(t.notes || "").includes("نقل") || String(t.notes || "").includes("مشال")) totals.shipping += amt;
        else if (String(t.notes || "").includes("مواصلات") || String(t.notes || "").includes("بنزين")) totals.transport += amt;
        else if (String(t.notes || "").includes("إكرامية") || String(t.notes || "").includes("شاي")) totals.tips += amt;
        else totals.others += amt;
      } else if (t.category === "administrative") {
        if (String(t.notes || "").includes("إيجار")) totals.rent += amt;
        else if (String(t.notes || "").includes("كهرباء") || String(t.notes || "").includes("مياه")) totals.electricity += amt;
        else if (String(t.notes || "").includes("نت") || String(t.notes || "").includes("تليفون")) totals.internet += amt;
        else totals.others += amt;
      } else {
        totals.others += amt;
      }
    });

    const totalOutflow = dbTransactions.filter((t: any) => t.type === "outflow").reduce((sum, t) => sum + Number(t.amount || 0), 0);

    return {
      list: expenseCategories.map((cat: any) => ({
        ...cat,
        value: totals[cat.key] || 0
      })),
      totalOutflow
    };
  }, [dbTransactions]);

  const projectExpensesReport = useMemo(() => {
    return dbProjects.map((p: any) => {
      const totalSpent = dbTransactions
        .filter((t: any) => t.project_id === p.id && t.type === "outflow")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      return {
        projectName: p.project_name,
        totalSpent
      };
    }).filter((p: any) => p.totalSpent > 0);
  }, [dbProjects, dbTransactions]);

  const outstandingLiabilitiesReport = useMemo(() => {
    const suppliers = dbSubcontractors.filter((s: any) => s.status === "supplier").map((sup: any) => {
      const paid = dbTransactions
        .filter((t: any) => t.subcontractor_id === sup.id && t.type === "outflow")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      return {
        name: sup.name,
        type: "مورد خامات آجل",
        due: Math.max(0, Number(sup.contract_value || 0) - paid)
      };
    });

    const subcontractorsList = dbSubcontractors.filter((s: any) => s.status !== "supplier").map((sub: any) => {
      const paid = dbTransactions
        .filter((t: any) => t.subcontractor_id === sub.id && t.type === "outflow")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      return {
        name: sub.name,
        type: "مقاول باطن",
        due: Math.max(0, Number(sub.contract_value || 0) - paid)
      };
    });

    return [...suppliers, [...subcontractorsList]].flat().filter((l: any) => l.due > 0);
  }, [dbSubcontractors, dbTransactions]);

  const clientReceivablesReport = useMemo(() => {
    return dbCustomers.map((cust: any) => {
      const proj = dbProjects.find((p: any) => p.customer_id === cust.id) || {};
      const contractValue = Number(proj.contract_value || 0);
      const paid = dbTransactions
        .filter((t: any) => t.project_id === proj.id && t.type === "inflow")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      return {
        name: cust.name,
        contractValue,
        collected: paid,
        remaining: Math.max(0, contractValue - paid)
      };
    }).filter((c: any) => c.contractValue > 0 && c.remaining > 0);
  }, [dbCustomers, dbProjects, dbTransactions]);

  const growthKPIs = useMemo(() => {
    const totalLeads = dbCustomers.length;
    const contractedClients = dbCustomers.filter((c: any) => c.status === "تم التعاقد").length;
    const conversionRate = totalLeads > 0 ? Math.round((contractedClients / totalLeads) * 100) : 0;

    const totalContractsValue = dbProjects.reduce((sum: number, p: any) => sum + Number(p.contract_value || 0), 0);
    const contractsCount = dbProjects.filter((p: any) => Number(p.contract_value || 0) > 0).length;
    const averageTicketSize = contractsCount > 0 ? Math.round(totalContractsValue / contractsCount) : 0;

    return {
      totalLeads,
      contractedClients,
      conversionRate,
      totalContractsValue,
      contractsCount,
      averageTicketSize
    };
  }, [dbCustomers, dbProjects]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020B1C] flex items-center justify-center text-[#D4AF37] font-black select-none font-alexandria">
        <div className="text-center">
          <Loader2 className="animate-spin text-[#D4AF37] mx-auto mb-4" size={40} />
          <p className="text-sm font-black animate-pulse">جاري إعداد وتحليل التقارير السنوية المدمجة...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#020B1C] relative overflow-hidden font-alexandria" dir="rtl">
      
      {/* 🛠️ ورقة أنماط الخط الملكي الموحد والتمرير */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;700;900&display=swap');

        *:not(code, pre, .font-mono, [class*="font-mono"]) {
          font-family: 'Alexandria', Arial, sans-serif !important;
          letter-spacing: normal !important;
        }

        ::-webkit-scrollbar { width: 6px !important; height: 6px !important; }
        ::-webkit-scrollbar-track { background: #020B1C !important; }
        ::-webkit-scrollbar-thumb { background: #D4AF37 !important; border-radius: 9999px !important; }
        ::-webkit-scrollbar-thumb:hover { background: #D4AF37 !important; }

        ::-webkit-scrollbar-horizontal,
        .overflow-x-auto::-webkit-scrollbar { display: none !important; height: 0px !important; }
        .overflow-x-auto { scrollbar-width: none !important; -ms-overflow-style: none !important; overflow-x: auto !important; }

        thead th, th {
          font-size: 0.75rem !important;
          font-weight: 500 !important; /* خفض السمك لخط Alexandria الأنيق */
          color: #D4AF37 !important;
          text-align: right !important;
          border-bottom: 2px solid #1f2d4d !important;
          background-color: #0b1d3d !important;
          padding: 14px 16px !important;
        }

        tbody td, td {
          font-size: 0.8rem !important;
          font-weight: 600 !important;
          color: #F0E6D2 !important;
          text-align: right !important;
          border-bottom: 1px solid rgba(31, 45, 77, 0.4) !important;
          padding: 14px 16px !important;
        }
      `}} />

      <Sidebar />
      <section className="w-full lg:pr-56 min-h-screen flex flex-col">
        <Header />
        
        <div className="p-4 md:p-8 space-y-6 text-right select-none font-sans">
          
          {dbError && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-start gap-3 print:hidden animate-pulse">
              <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-bold text-sm">خطأ في مزامنة التحليلات</h4>
                <p className="text-xs mt-1">{dbError}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#243556] pb-5 print:hidden">
            <div>
              {/* تصغير حجم خط العنوان الرئيسي ومحاذاته للأعلى بنسبة متزنة تماشياً مع الدستور الجمالي الموحد */}
              <h1 className="text-xl md:text-2xl font-black text-[#D4AF37] flex items-center gap-2.5">
                <span>التقارير والمخططات الاستراتيجية للشركة</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </h1>
              <p className="text-white text-xs mt-2">توليد كشوف حسابات العملاء، مستخلصات مقاولي الباطن، وموازنة الأرباح والتنبؤ المالي.</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* تصغير زرار الطباعة والتصدير ليكون عبارة عن أيقونة مذهبة دائرية فقط */}
              <button 
                onClick={() => window.print()}
                className="w-10 h-10 bg-black/60 hover:bg-[#D4AF37] border-2 border-[#D4AF37] text-[#D4AF37] hover:text-[#020B1C] rounded-full cursor-pointer transition-all duration-300 flex items-center justify-center hover:translate-y-[-2px] hover:shadow-[0_0_20px_rgba(212,175,55,0.45)] shadow-[0_0_10px_rgba(212,175,55,0.15)] shrink-0"
                title="تصدير وطباعة التقرير الفوري (A4)"
              >
                <Printer size={15} />
              </button>
            </div>
          </div>

          <div className="bg-[#07132a] border border-[#D4AF37]/20 rounded-[2rem] p-5 shadow-2xl relative overflow-hidden print:hidden">
            {/* تم تحويل لون عنوان الصندوق للذهب الإمبراطوري */}
            <h2 className="text-[#D4AF37] text-xs md:text-sm font-black flex items-center gap-2 mb-3">
              <Filter size={16} />
              <span>محددات البحث وتحديد فترات فحص المشاريع والمقايسات</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold text-slate-300">
              <div>
                <label className="block text-[#D4AF37] font-black mb-1.5">من تاريخ *</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-11 bg-[#020B1C] border border-[#243556] rounded-xl px-3 text-sm text-white focus:border-[#D4AF37] outline-none font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[#D4AF37] font-black mb-1.5">إلى تاريخ *</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-11 bg-[#020B1C] border border-[#243556] rounded-xl px-3 text-sm text-white focus:border-[#D4AF37] outline-none font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[#D4AF37] font-black mb-1.5">تشريح مشروع أو موقع معين مالياً *</label>
                <select 
                  value={selectedProjectId} 
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full h-11 bg-[#020B1C] border border-[#243556] text-[#D4AF37] rounded-xl px-3 text-xs font-bold focus:border-[#D4AF37] outline-none cursor-pointer"
                >
                  <option value="all">كل مشاريع التشطيب جغرافياً</option>
                  {dbProjects.map((p) => (
                    <option key={p.id} value={p.id}>🏢 {p.project_name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* تابات التحكم السحابية المذهبة بالكامل - تم تقليص حجمها وتكثيفها لتستقر على سطر واحد برياً وبسحب لمسي للموبايل */}
          <div className="flex flex-row flex-nowrap overflow-x-auto gap-2 border-b border-[#243556]/60 pb-4 print:hidden select-none">
            <button 
              onClick={() => { setActiveTab("ledgers"); setSelectedStatementPartnerId(""); }}
              className={`py-2 px-3.5 text-[10px] md:text-xs font-black flex items-center gap-1.5 rounded-xl cursor-pointer transition-all duration-300 whitespace-nowrap shrink-0 ${
                activeTab === "ledgers" 
                  ? "bg-black border-2 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.4)]" 
                  : "bg-[#07132a] border border-[#D4AF37]/15 text-[#F0E6D2]/60 hover:border-[#D4AF37]/45 hover:text-[#F0E6D2]"
              }`}
            >
              <FileText size={13} /> 
              <span>كشوف الأستاذ المساعد</span>
            </button>
            <button 
              onClick={() => setActiveTab("profit_loss")}
              className={`py-2 px-3.5 text-[10px] md:text-xs font-black flex items-center gap-1.5 rounded-xl cursor-pointer transition-all duration-300 whitespace-nowrap shrink-0 ${
                activeTab === "profit_loss" 
                  ? "bg-black border-2 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.4)]" 
                  : "bg-[#07132a] border border-[#D4AF37]/15 text-[#F0E6D2]/60 hover:border-[#D4AF37]/45 hover:text-[#F0E6D2]"
              }`}
            >
              <TrendingUp size={13} /> 
              <span>الأرباح والتدفقات</span>
            </button>
            <button 
              onClick={() => setActiveTab("expenses")}
              className={`py-2 px-3.5 text-[10px] md:text-xs font-black flex items-center gap-1.5 rounded-xl cursor-pointer transition-all duration-300 whitespace-nowrap shrink-0 ${
                activeTab === "expenses" 
                  ? "bg-black border-2 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.4)]" 
                  : "bg-[#07132a] border border-[#D4AF37]/15 text-[#F0E6D2]/60 hover:border-[#D4AF37]/45 hover:text-[#F0E6D2]"
              }`}
            >
              <Receipt size={13} /> 
              <span>المصاريف والتكاليف</span>
            </button>
            <button 
              onClick={() => setActiveTab("debts")}
              className={`py-2 px-3.5 text-[10px] md:text-xs font-black flex items-center gap-1.5 rounded-xl cursor-pointer transition-all duration-300 whitespace-nowrap shrink-0 ${
                activeTab === "debts" 
                  ? "bg-black border-2 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.4)]" 
                  : "bg-[#07132a] border border-[#D4AF37]/15 text-[#F0E6D2]/60 hover:border-[#D4AF37]/45 hover:text-[#F0E6D2]"
              }`}
            >
              <Scale size={13} /> 
              <span>الديون</span>
            </button>
            <button 
              onClick={() => setActiveTab("growth")}
              className={`py-2 px-3.5 text-[10px] md:text-xs font-black flex items-center gap-1.5 rounded-xl cursor-pointer transition-all duration-300 whitespace-nowrap shrink-0 ${
                activeTab === "growth" 
                  ? "bg-black border-2 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.4)]" 
                  : "bg-[#07132a] border border-[#D4AF37]/15 text-[#F0E6D2]/60 hover:border-[#D4AF37]/45 hover:text-[#F0E6D2]"
              }`}
            >
              <Activity size={13} /> 
              <span>كفاءة النمو</span>
            </button>
          </div>

          {activeTab === "ledgers" && (
            <div className="bg-[#07132a] border border-[#D4AF37]/20 rounded-[2rem] p-6 space-y-6 relative overflow-hidden animate-in fade-in duration-300">
              <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#243556] pb-3">
                {/* تحويل لون ترويسة العنوان للذهب الإمبراطوري */}
                <h3 className="text-[#D4AF37] font-black text-sm md:text-base flex items-center gap-1.5">
                  <FileText size={16} />
                  <span>مولد كشوفات الحساب الموحد للشركاء والموردين والمقاولين</span>
                </h3>

                {/* أزرار فرز كشف الحساب لمسية نيونية فاخرة */}
                <div className="flex items-center gap-2 bg-[#020B1C] border border-[#1f2d4d] rounded-xl p-1 select-none text-[10px] font-bold">
                  <button 
                    onClick={() => { setSelectedStatementType("customer"); setSelectedStatementPartnerId(""); }}
                    className={`px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer ${
                      selectedStatementType === "customer" 
                        ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.3)] font-black" 
                        : "bg-[#07132a] border border-transparent text-[#F0E6D2]/60 hover:border-[#D4AF37]/20"
                    }`}
                  >
                    👤 كشف عميل
                  </button>
                  <button 
                    onClick={() => { setSelectedStatementType("supplier"); setSelectedStatementPartnerId(""); }}
                    className={`px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer ${
                      selectedStatementType === "supplier" 
                        ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.3)] font-black" 
                        : "bg-[#07132a] border border-transparent text-[#F0E6D2]/60 hover:border-[#D4AF37]/20"
                    }`}
                  >
                    📦 كشف مورد
                  </button>
                  <button 
                    onClick={() => { setSelectedStatementType("subcontractor"); setSelectedStatementPartnerId(""); }}
                    className={`px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer ${
                      selectedStatementType === "subcontractor" 
                        ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.3)] font-black" 
                        : "bg-[#07132a] border border-transparent text-[#F0E6D2]/60 hover:border-[#D4AF37]/20"
                    }`}
                  >
                    👷 كشف مقاول باطن
                  </button>
                </div>
              </div>

              <div className="p-4 bg-[#020B1C]/50 rounded-xl border border-[#1f2d4d] text-xs">
                <label className="block text-[#D4AF37] font-black mb-2">اختر المستفيد / الشريك لتركيب وتصدير كشف حسابه التاريخي الجاري:</label>
                <select
                  value={selectedStatementPartnerId}
                  onChange={(e) => setSelectedStatementPartnerId(e.target.value)}
                  className="w-full h-11 bg-[#020B1C] border border-[#243556] text-white px-3 font-bold rounded-lg outline-none focus:border-[#D4AF37]"
                >
                  <option value="">-- حدد الاسم المستعلم عنه --</option>
                  {selectedStatementType === "customer" && dbCustomers.map((c: any) => <option key={c.id} value={c.id}>👤 {c.name}</option>)}
                  {selectedStatementType === "supplier" && dbSubcontractors.filter((s: any) => s.status === "supplier").map((s: any) => <option key={s.id} value={s.id}>📦 {s.name}</option>)}
                  {selectedStatementType === "subcontractor" && dbSubcontractors.filter((s: any) => s.status !== "supplier").map((s: any) => <option key={s.id} value={s.id}>👷 {s.name} ({specialtyLabels[s.specialty] || s.specialty})</option>)}
                </select>
              </div>

              {statementPartnerData ? (
                <div className="space-y-4 animate-in zoom-in duration-150">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-[#020B1C]/55 border border-[#1f2d4d] rounded-xl">
                      <span className="text-slate-400 text-[10px] block">إجمالي قيمة المستند / العقد</span>
                      <span className="text-[#F0E6D2] font-mono font-black text-sm block mt-1">{(statementPartnerData.contractValue).toLocaleString('en-US')} ج.م</span>
                    </div>
                    <div className="p-3 bg-[#020B1C]/55 border border-[#1f2d4d] rounded-xl">
                      <span className="text-slate-400 text-[10px] block">المسدد كاش بالخزينة</span>
                      <span className="text-emerald-400 font-mono font-black block mt-1">+{(statementPartnerData.totalPaid || 0).toLocaleString('en-US')} ج.م</span>
                    </div>
                    <div className="p-3 bg-[#020B1C]/55 border border-rose-500/20 rounded-xl">
                      <span className="text-rose-400 text-[10px] block">المتبقي / التزام معلق</span>
                      <span className="text-rose-400 font-mono font-black text-sm block mt-1">{(statementPartnerData.remainingDue || 0).toLocaleString('en-US')} ج.م</span>
                    </div>
                  </div>

                  <div className="bg-[#020B1C]/50 rounded-2xl overflow-hidden border border-[#1f2d4d]">
                    <div className="p-3 bg-[#0b1b3d] border-b border-[#1f2d4d]">
                      <span className="text-xs text-[#D4AF37] font-black">سجل قيود وحركات المعاملات التفصيلية للطرف الثاني:</span>
                    </div>
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-[#020B1C] text-[#D4AF37] font-bold">
                          <th className="p-2">تاريخ القيد</th>
                          <th className="p-2">طريقة الاستلام / السداد</th>
                          <th className="p-2">البيان والشرح</th>
                          <th className="p-2 text-left">القيمة المالية</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statementPartnerData.txs.map((tx: any, idx: number) => (
                          <tr key={idx} className="hover:bg-[#07132a]">
                            <td className="p-2 font-mono text-slate-300">{new Date(tx.created_at).toLocaleDateString("ar-EG")}</td>
                            <td className="p-2 text-slate-300">{tx.payment_method === "cash" ? "كاش" : "بنكي"}</td>
                            <td className="p-2 text-slate-300 truncate max-w-xs">{tx.notes || "-"}</td>
                            <td className={`p-2 font-mono font-black text-left ${tx.type === "inflow" ? "text-emerald-400" : "text-rose-400"}`}>
                              {tx.type === "inflow" ? "+" : "-"}{(tx.amount || 0).toLocaleString('en-US')} ج.م
                            </td>
                          </tr>
                        ))}
                        {statementPartnerData.txs.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-4 text-center text-gray-500 font-bold">لا توجد حركات مسجلة لحساب هذا الطرف حالياً بالخزينة.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 text-xs font-bold border border-dashed border-[#1f2d4d] rounded-xl">
                  ⚠️ الرجاء اختيار الاسم وتحديد الفئة لتوليد وتصدير كشف حساب الشريك بالكامل.
                </div>
              )}
            </div>
          )}

          {activeTab === "profit_loss" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              <div className="bg-[#07132a] border border-[#D4AF37]/20 rounded-[2rem] overflow-hidden shadow-2xl relative w-full flex flex-col">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
                <div className="p-4 bg-[#0b1b3d] border-b border-[#243556]">
                  {/* تحويل العناوين إلى الذهب الإمبراطوري */}
                  <h3 className="text-[#D4AF37] font-black text-sm md:text-base">جدول كشوف الأرباح ونسب الهامش الصافي لكل مشروع جاري (المقاولات والتشطيبات)</h3>
                </div>
                <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
                  <table className="w-full text-right table-auto">
                    <thead>
                      <tr className="whitespace-nowrap select-none">
                        <th>اسم المشروع وموقعه</th>
                        <th>إجمالي قيمة العقد</th>
                        <th>تكلفة التنفيذ المباشرة</th>
                        <th>مصروفات إدارية وعامة</th>
                        <th>صافي أرباح الشركة التقديرية</th>
                        <th className="text-center">نسبة الربح %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectProfitsReport.map((p: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#0B1B38] transition-all">
                          <td className="font-black text-slate-100">{p.projectName}</td>
                          <td className="font-mono text-slate-200 font-bold">{(p.contractValue).toLocaleString('en-US')} ج.م</td>
                          <td className="font-mono text-rose-400 font-bold">{(p.executionCosts).toLocaleString('en-US')} ج.م</td>
                          <td className="font-mono text-slate-400">{(p.adminExpenses).toLocaleString('en-US')} ج.م</td>
                          <td className="font-mono text-emerald-400 font-black">{(p.netProfit).toLocaleString('en-US')} ج.م</td>
                          <td className="text-center">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-black ${p.margin >= 25 ? "bg-emerald-500/10 text-emerald-400" : "bg-[#C9A45D]/10 text-[#C9A45D]"}`}>
                              {p.margin}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-[#07132a] border border-[#D4AF37]/20 rounded-[2rem] overflow-hidden shadow-2xl relative w-full flex flex-col">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
                <div className="p-4 bg-[#0b1b3d] border-b border-[#243556]">
                  {/* تحويل العناوين للذهب الإمبراطوري */}
                  <h3 className="text-[#D4AF37] font-black text-sm md:text-base">تقرير التدفقات النقدية والموازنة التراكمية شهرياً (Inflow vs Outflow 2026)</h3>
                </div>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full text-right table-auto">
                    <thead>
                      <tr className="whitespace-nowrap select-none">
                        <th>الشهر المخطط</th>
                        <th>المقبوضات الإجمالية (الوارد للخزينة)</th>
                        <th>المصروفات التشغيلية (الصادر)</th>
                        <th>صافي السيولة المنتجة خلال الشهر</th>
                        <th className="text-center">الحالة والموازنة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashFlowTimelineReport.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#0B1B38] transition-all">
                          <td className="font-bold text-slate-100">{row.month}</td>
                          <td className="font-mono text-emerald-400 font-black">+{(row.inflow).toLocaleString('en-US')} ج.م</td>
                          <td className="font-mono text-rose-400 font-bold">-{(row.outflow).toLocaleString('en-US')} ج.م</td>
                          <td className={`font-mono font-black ${row.net >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {(row.net).toLocaleString('en-US')} ج.م
                          </td>
                          <td className="text-center">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-black ${row.net >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                              {row.net >= 0 ? "فائض سيولة ✓" : "عجز كاش ⚠️"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {activeTab === "expenses" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
              
              <div className="lg:col-span-1 bg-[#07132a] border border-[#D4AF37]/20 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden h-fit">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
                {/* تحويل العناوين للذهب الإمبراطوري */}
                <h3 className="text-[#D4AF37] font-black text-sm md:text-base border-b border-[#243556] pb-3 mb-4">كشف المصروفات والبنود الـ 12</h3>
                <div className="space-y-3 font-semibold text-xs text-slate-300">
                  {categorizedExpenses.list.map((cat: any, idx: number) => (
                    <div key={idx} className="p-3 bg-[#020B1C]/55 rounded-xl border border-[#1f2d4d] flex justify-between items-center">
                      <span className="text-[#F0E6D2] font-black">{cat.label}</span>
                      <span className="font-mono font-black text-[#D4AF37]">{(cat.value).toLocaleString('en-US')} ج.م</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 bg-[#07132a] border border-[#D4AF37]/20 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden h-fit">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
                {/* تحويل العناوين للذهب الإمبراطوري */}
                <h3 className="text-[#D4AF37] font-black text-sm md:text-base border-b border-[#243556] pb-3 mb-4">تقرير المصروفات الإجمالية لكل موقع ومشروع جاري</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-right table-auto text-xs">
                    <thead>
                      <tr className="bg-[#0b1d3d] text-[#D4AF37]">
                        <th>المشروع والموقع الإنشائي</th>
                        <th className="text-left">إجمالي المصروفات بالخزينة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectExpensesReport.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#0B1B38]">
                          <td className="font-black text-slate-100">{row.projectName}</td>
                          <td className="font-mono text-rose-400 font-black text-left">{(row.totalSpent).toLocaleString('en-US')} ج.م</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {activeTab === "debts" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
              
              <div className="bg-[#07132a] border border-[#D4AF37]/20 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
                {/* تحويل العناوين للذهب الإمبراطوري */}
                <h3 className="text-[#D4AF37] font-black text-sm md:text-base border-b border-[#243556] pb-3 mb-4">تقرير الديون والالتزامات المالية المعلقة للموردين والمقاولين (الذمم الدائنة)</h3>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full text-right table-auto text-xs">
                    <thead>
                      <tr className="bg-[#0b1d3d] text-[#D4AF37]">
                        <th>اسم الشريك / الورشة</th>
                        <th>التصنيف</th>
                        <th className="text-left">القيمة المتبقية المستحقة بالخزينة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outstandingLiabilitiesReport.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#0B1B38]">
                          <td className="font-black text-slate-100">{row.name}</td>
                          <td>
                            <span className="bg-[#C9A45D]/10 text-[#C9A45D] px-2 py-0.5 rounded text-[10px] font-black border border-[#C9A45D]/25">{row.type}</span>
                          </td>
                          <td className="font-mono text-rose-400 font-black text-left">{(row.due).toLocaleString('en-US')} ج.م</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-[#07132a] border border-[#D4AF37]/20 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
                {/* تحويل العناوين للذهب الإمبراطوري */}
                <h3 className="text-[#D4AF37] font-black text-sm md:text-base border-b border-[#243556] pb-3 mb-4">تقرير التحصيل والأقساط المتبقية لدى العملاء المتعاقدين (الذمم المدينة)</h3>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full text-right table-auto text-xs">
                    <thead>
                      <tr className="bg-[#0b1d3d] text-[#D4AF37]">
                        <th>اسم العميل المتعاقد</th>
                        <th>قيمة العقد الكلي</th>
                        <th>المحصل الفعلي كاش</th>
                        <th className="text-left">المتبقي المطلوب تحصيله</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientReceivablesReport.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#0B1B38]">
                          <td className="font-black text-slate-100">{row.name}</td>
                          <td className="font-mono text-slate-400">{(row.contractValue).toLocaleString('en-US')} ج.م</td>
                          <td className="font-mono text-emerald-400 font-bold">{(row.collected).toLocaleString('en-US')} ج.م</td>
                          <td className="font-mono text-[#D4AF37] font-black text-left">{(row.remaining).toLocaleString('en-US')} ج.م</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {activeTab === "growth" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
              
              <div className="bg-[#07132a] border border-[#D4AF37]/20 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between h-fit">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
                {/* تحويل العناوين للذهب الإمبراطوري */}
                <h3 className="text-[#D4AF37] font-black text-sm md:text-base border-b border-[#243556] pb-3 mb-4">تقرير نمو العملاء وحصر كفاءة تحويل ليدات الـ CRM (CRM Conversion)</h3>
                <div className="space-y-4 text-xs font-semibold text-slate-300">
                  <div className="flex justify-between p-3 bg-[#020B1C] rounded-xl border border-[#1f2d4d]">
                    <span>إجمالي العملاء المسجلين بالـ CRM:</span>
                    <span className="font-mono font-black text-[#D4AF37] text-sm">{growthKPIs.totalLeads} عملاء</span>
                  </div>
                  <div className="flex justify-between p-3 bg-[#020B1C] rounded-xl border border-[#1f2d4d]">
                    <span>عدد العملاء المتعاقدين نهائياً:</span>
                    <span className="font-mono font-black text-emerald-400 text-sm">{growthKPIs.contractedClients} عقود نهائية</span>
                  </div>
                  <div className="flex justify-between p-4 bg-[#0b1b3d] rounded-xl border border-[#D4AF37]/30 items-center">
                    <span className="text-[#D4AF37] font-black">معدل تحويل الصفقات العام للشركة (Conversion Rate):</span>
                    <span className="bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl text-sm font-black border border-emerald-500/20">{growthKPIs.conversionRate}% كفاءة</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#07132a] border border-[#D4AF37]/20 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between h-fit">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
                {/* تحويل العناوين للذهب الإمبراطوري */}
                <h3 className="text-[#D4AF37] font-black text-sm md:text-base border-b border-[#243556] pb-3 mb-4">تقرير عدد وحجم مبيعات العقود والتحليل المالي</h3>
                <div className="space-y-4 text-xs font-semibold text-slate-300">
                  <div className="flex justify-between p-3 bg-[#020B1C] rounded-xl border border-[#1f2d4d]">
                    <span>إجمالي قيمة عقود التشطيب الموقعة والمفعلة:</span>
                    <span className="font-mono font-black text-emerald-400 text-sm">{(growthKPIs.totalContractsValue).toLocaleString('en-US')} ج.م</span>
                  </div>
                  <div className="flex justify-between p-3 bg-[#020B1C] rounded-xl border border-[#1f2d4d]">
                    <span>عدد العقود السارية والجاري تنفيذها:</span>
                    <span className="font-mono font-black text-[#D4AF37] text-sm">{growthKPIs.contractsCount} عقود منفصلة</span>
                  </div>
                  <div className="flex justify-between p-4 bg-[#0b1b3d] rounded-xl border border-[#D4AF37]/30 items-center">
                    <span className="text-[#D4AF37] font-black">متوسط قيمة التعاقد للشقة الواحدة بالشركة (Average Ticket):</span>
                    <span className="font-mono font-black text-[#D4AF37] text-sm">{(growthKPIs.averageTicketSize).toLocaleString('en-US')} ج.م</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          <div className="hidden print:flex flex-col mt-12 pt-8 border-t-2 border-slate-900 text-slate-900 select-none text-xs font-black">
            <div className="flex justify-between px-6">
              <div className="text-center">
                <p className="mb-8">الاعتماد والمراجعة المالي والقانوني</p>
                <p className="border-b border-slate-400 w-32 mx-auto"></p>
              </div>
              <div className="text-center">
                <p className="mb-8">المدير العام والمالك للمجموعة</p>
                <p className="border-b border-slate-400 w-32 mx-auto"></p>
              </div>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}