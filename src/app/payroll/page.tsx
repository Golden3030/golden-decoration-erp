"use client";

import { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";
import { isOnline, addToOfflineQueue } from "@/lib/offline-sync";
import { Coins, Banknote, Receipt, Check, Minus, Plus, Loader2, Sparkles } from "lucide-react"; 

interface PayrollSheet {
  id: string;
  user_id: string;
  salary_month: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  payment_status: "paid" | "unpaid";
  created_at: string;
  users?: { name: string; role: string };
}

const roleLabels: { [key: string]: string } = {
  admin: "مدير النظام 👑",
  manager: "مدير الحسابات والتشغيل 💵",
  sales_manager: "مدير مبيعات (CRM) 📊",
  sales: "موظف مبيعات (سيلز) 📈",
  procurement: "موظف مشتريات ومخازن 📦",
  engineer: "مهندس الموقع الميداني 🏗️",
  client: "العميل النهائي صاحب الوحدة 👤"
};

export default function PayrollPage() {
  const [payrollList, setPayrollList] = useState<PayrollSheet[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // حقول نموذج إصدار وصرف مسير الرواتب للموظف المتابع
  const [selectedUserId, setSelectedUserId] = useState("");
  const [salaryMonth, setSalaryMonth] = useState(new Date().toISOString().slice(0, 7)); // تنسيق الشهر الافتراضي YYYY-MM
  const [baseSalary, setBaseSalary] = useState<number | "">("");
  const [allowances, setAllowances] = useState<number | "">(0);
  const [deductions, setDeductions] = useState<number | "">(0); 
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid">("unpaid");

  useEffect(() => {
    document.title = "مسيرات الرواتب والخصومات | Golden Decoration";
    loadPayrollData();
  }, []);

  async function loadPayrollData() {
    setLoading(true);
    try {
      const { data: payrollData, error: payError } = await supabase
        .from("payroll_sheets")
        .select(`
          *,
          users (name, role)
        `)
        .order("salary_month", { ascending: false });

      if (payError) throw payError;
      setPayrollList(payrollData || []);

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, name, role")
        .order("name", { ascending: true });

      if (usersError) throw usersError;
      setUsers(usersData || []);

    } catch (err: any) {
      console.error("Error loading payroll details:", err.message);
    } finally {
      setLoading(false);
    }
  }

  const calculatedNetSalary = useMemo(() => {
    const base = Number(baseSalary) || 0;
    const allow = Number(allowances) || 0;
    const deduct = Number(deductions) || 0; 
    
    const net = base + allow - deduct;
    return net > 0 ? net : 0;
  }, [baseSalary, allowances, deductions]);

  async function handleCreatePayroll() {
    if (!selectedUserId || baseSalary === "") {
      alert("الرجاء تحديد الموظف وإدخال الراتب الأساسي لإصدار مسير الرواتب.");
      return;
    }

    const matchedUser = users.find(u => u.id === selectedUserId);
    const employeeName = matchedUser ? matchedUser.name : "الموظف المالي";

    setSaving(true);
    try {
      const payload = {
        user_id: selectedUserId,
        salary_month: salaryMonth,
        base_salary: Number(baseSalary),
        allowances: Number(allowances || 0),
        deductions: Number(deductions || 0), 
        net_salary: calculatedNetSalary,
        payment_status: paymentStatus
      };

      if (isOnline()) {
        const { error: payErr } = await supabase
          .from("payroll_sheets")
          .insert([payload]);

        if (payErr) throw payErr;

        if (paymentStatus === "paid") {
          const { error: transErr } = await supabase
            .from("transactions")
            .insert([{
              project_id: null, 
              amount: calculatedNetSalary,
              type: "outflow",
              category: "General_Expenses",
              description: `صرف مسير الراتب الشهري لشهر (${salaryMonth}) للموظف (${employeeName}) [راتب أساسي: ${baseSalary} ج.م + حوافز: ${allowances} ج.م - الخصم المطبق للغياب والجزاءات: ${deductions} ج.م] وصافي منصرف الخزينة: ${calculatedNetSalary} ج.م.`
            }]);

          if (transErr) throw transErr;
        }

        await supabase.from("notifications").insert({
          title: "إصدار وصرف رواتب",
          message: `💵 تم اعتماد وإصدار كشف راتب شهر (${salaryMonth}) للموظف (${employeeName}) بقيمة صافية (${calculatedNetSalary} ج.م) وحالة الدفع (${paymentStatus === "paid" ? "تم الصرف والخروج من الخزينة" : "معلق تحت الحساب"}).`,
          type: "finance",
          link: "/payroll"
        });

        alert("✅ تم إصدار مسير الراتب للموظف وتسييله بالخزينة وصافي الحسابات بنجاح!");
      } else {
        addToOfflineQueue("payroll_sheets", "INSERT", payload);
        alert("⚠️ تم حجز وتجميد مسير الراتب محلياً لعدم وجود شبكة؛ وسيتم تسييله بالخزينة ومزامنته تلقائياً فور توفر الإنترنت.");
      }

      setSelectedUserId("");
      setBaseSalary("");
      setAllowances(0);
      setDeductions(0);
      setPaymentStatus("unpaid");

      await loadPayrollData();
    } catch (err: any) {
      alert("حدث خطأ أثناء إصدار مسير الرواتب: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  const totalSalariesOutflow = useMemo(() => {
    return payrollList
      .filter(p => p.payment_status === "paid")
      .reduce((sum, p) => sum + Number(p.net_salary || 0), 0);
  }, [payrollList]);

  const totalDeductionsInvoiced = useMemo(() => {
    return payrollList.reduce((sum, p) => sum + Number(p.deductions || 0), 0);
  }, [payrollList]);

  return (
    // 🌟 تم تعديل الكلاس البرمجي إلى flex-1 لإنهاء عائق الـ Box Model والقص الأفقي بالمتصفح كلياً
    <main className="min-h-screen flex bg-[#020B1C] relative overflow-hidden font-alexandria" dir="rtl">
      
      {/* هيدر الهيكل لمنع وميض وتأخر تحميل الخط البصري FOUT */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <Sidebar />
      
      {/* 🛠️ جدار الحماية البصري الموحد وتعديل شريط التمرير المذهب للجريل والتفاصيل */}
      <style dangerouslySetInnerHTML={{__html: `
        ::-webkit-scrollbar { width: 6px !important; height: 6px !important; }
        ::-webkit-scrollbar-track { background: #020B1C !important; }
        ::-webkit-scrollbar-thumb { background: #D4AF37 !important; border-radius: 9999px !important; }
        ::-webkit-scrollbar-thumb:hover { background: #D4AF37 !important; }

        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none !important;
          margin: 0 !important;
        }
        input[type="number"] { -moz-appearance: textfield !important; }

        .overflow-x-auto::-webkit-scrollbar {
          display: block !important;
          height: 6px !important;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb {
          background: #D4AF37 !important;
          border-radius: 9999px !important;
        }

        th, td, h1, h2, h3, h4, h5, h6, span, p, button, label, input, select, textarea {
          font-family: 'Alexandria', Arial, sans-serif !important;
          letter-spacing: normal !important;
        }
      `}} />

      <section className="flex-1 flex flex-col lg:pr-56 m-0 min-h-screen">
        <Header />
        
        <div className="p-4 md:p-8 space-y-6 text-right select-none">
          
          {/* هيدر الصفحة متناسق بكسلياً مع شاشة الـ CRM والبنود والخامات */}
          <div className="flex justify-between items-center border-b border-[#D4AF37]/20 pb-5 select-none">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[#D4AF37] flex items-center gap-2.5">
                <span> رواتب ومستحقات الموظفين والمهندسين</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-ping" />
              </h1>
              <p className="text-white text-xs mt-2">تتبع الحوافز، والرواتب الثابتة للمهندسين والإداريين، وتطبيق الخصومات والجزاءات المباشرة حركياً بالخزينة.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none text-xs md:text-sm font-bold">
            <div className="p-5 rounded-3xl bg-[#07132a] border border-[#1f2d4d] flex flex-col justify-between shadow-lg">
              <div className="flex justify-between items-start">
                <Banknote className="w-6 h-6 text-rose-400" />
                <span className="bg-red-500/10 text-red-400 text-xs px-2.5 py-0.5 rounded-full font-bold">مصروفات الموظفين الصادرة</span>
              </div>
              <div className="mt-5 text-right">
                <p className="text-[#D4AF37] text-base font-black">إجمالي المرتبات المنصرفة فعلياً من الخزينة</p>
                <h3 className="text-white text-2xl md:text-3xl font-black mt-1 font-mono">-{totalSalariesOutflow.toLocaleString('en-US')} ج.م</h3>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-[#07132a] border border-[#1f2d4d] flex flex-col justify-between shadow-lg">
              <div className="flex justify-between items-start">
                <Receipt className="w-6 h-6 text-[#D4AF37]" />
                <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-[#D4AF37]/20">مجموع الخصومات والجزاءات</span>
              </div>
              <div className="mt-5 text-right">
                <p className="text-[#F0E6D2] text-sm font-bold">إجمالي الخصومات والاستقطاعات المطبقة</p>
                <h3 className="text-[#D4AF37] text-2xl font-black mt-1 font-mono">+{totalDeductionsInvoiced.toLocaleString('en-US')} ج.م تم خصمها</h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="bg-[#07132a] border border-[#D4AF37] rounded-[2rem] p-6 space-y-4 h-fit shadow-xl">
              <h3 className="text-[#D4AF37] text-sm md:text-base font-black border-b border-[#D4AF37] pb-3 select-none flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                <span>إصدار الرواتب الشهري للشركاء</span>
              </h3>
              
              <div className="space-y-4 text-xs md:text-sm font-bold">
                
                <div>
                  <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px] select-none">الموظف / المهندس المستهدف *</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] font-bold px-3 outline-none cursor-pointer focus:border-[#D4AF37] text-xs"
                  >
                    <option value="">-- اختر الموظف المستهدف --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({roleLabels[u.role] || u.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px] select-none">الشهر المالي للاستحقاق *</label>
                  <input
                    type="month"
                    value={salaryMonth}
                    onChange={(e) => setSalaryMonth(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] font-bold px-3 outline-none font-mono focus:border-[#D4AF37] text-xs text-center"
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px] select-none whitespace-nowrap">الراتب الأساسي الثابت *</label>
                    <div className="flex items-center gap-2.5 h-11" dir="ltr">
                      <button
                        type="button" // 👈 صمام الأمان المانع للريفريش
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setBaseSalary(prev => {
                            const val = Number(prev) || 0;
                            return val <= 500 ? 0 : val - 500;
                          });
                        }}
                        className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center text-md cursor-pointer transition active:scale-90 font-sans"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={baseSalary}
                        onChange={(e) => setBaseSalary(e.target.value !== "" ? Number(e.target.value) : "")}
                        className="flex-1 h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white text-center font-mono font-bold text-xs outline-none focus:border-[#D4AF37]"
                      />
                      <button
                        type="button" // 👈 صمام الأمان المانع للريفريش
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setBaseSalary(prev => (Number(prev) || 0) + 500);
                        }}
                        className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center text-md cursor-pointer transition active:scale-90 font-sans"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px] select-none whitespace-nowrap">حوافز ومكافآت (البدلات)</label>
                    <div className="flex items-center gap-2.5 h-11" dir="ltr">
                      <button
                        type="button" // 👈 صمام الأمان المانع للريفريش
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setAllowances(prev => {
                            const val = Number(prev) || 0;
                            return val <= 100 ? 0 : val - 100;
                          });
                        }}
                        className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90 font-sans"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={allowances}
                        onChange={(e) => setAllowances(e.target.value !== "" ? Number(e.target.value) : "")}
                        className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#F0E6D2] text-center px-3 outline-none font-mono font-bold text-xs focus:border-[#D4AF37]"
                      />
                      <button
                        type="button" // 👈 صمام الأمان المانع للريفريش
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setAllowances(prev => (prev === "" ? 100 : Number(prev) + 100));
                        }}
                        className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90 font-sans"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-[#020B1C] border border-red-500/20 p-4 rounded-xl space-y-3 select-none shadow-inner">
                  <label className="block text-rose-400/80 mb-1 font-bold text-[10px] select-none">🚨 الخصم والاستقطاع والجزاءات المطبقة</label>
                  <div className="flex items-center gap-2.5 h-11" dir="ltr">
                    <button
                      type="button" // 👈 صمام الأمان المانع للريفريش
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeductions(prev => {
                          const val = Number(prev) || 0;
                          return val <= 100 ? 0 : val - 100;
                        });
                      }}
                      className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90 font-sans"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      value={deductions}
                      onChange={(e) => setDeductions(e.target.value !== "" ? Number(e.target.value) : "")}
                      className="flex-1 h-11 rounded-xl bg-[#07132a] border border-[#243556] text-rose-400 text-center font-mono font-black text-xs outline-none focus:border-red-500/40"
                    />
                    <button
                      type="button" // 👈 صمام الأمان المانع للريفريش
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeductions(prev => (Number(prev) || 0) + 100);
                      }}
                      className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90 font-sans"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-gray-500 text-[10px] leading-relaxed font-bold">اكتب قيمة الخصم المباشر (مثل غياب يوم أو جزاء فني بالموقع) ليتم خصمه من الصافي حياً.</p>
                </div>

                <div className="bg-[#020B1C]/50 border-2 border-dashed border-[#243556] rounded-xl p-4 space-y-2 select-none">
                  <div className="flex justify-between items-center text-xs font-bold text-white">
                    <span className="text-[#D4AF37] font-black text-xs">صافي الراتب المستحق للصرف:</span>
                    <span className="text-[#D4AF37] font-black text-sm font-mono">{calculatedNetSalary.toLocaleString('ar-EG')} ج.م</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[#D4AF37] mb-1.5 font-bold text-[10px] select-none">حالة صرف وتسليم الراتب *</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] font-bold px-3 text-xs outline-none cursor-pointer focus:border-[#D4AF37]"
                  >
                    <option value="unpaid">تحت الاستحقاق (لم يصرف)</option>
                    <option value="paid">تم الصرف (الخروج المالي من الخزينة)</option>
                  </select>
                </div>

                {/* زر حفظ وصرف الراتب بالشكل الميتاليكي الفاخر المتوهج */}
                <button
                  type="button" // 👈 صمام أمان المانع للريفريش
                  onClick={(e) => { e.preventDefault(); handleCreatePayroll(); }}
                  disabled={saving}
                  className="w-full px-6 py-3.5 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.01] active:scale-95 transition-all duration-300  text-md cursor-pointer flex items-center justify-center gap-1.5 select-none relative overflow-hidden disabled:opacity-40"
                >
                  {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Coins className="w-4 h-4" />}
                  <span>{saving ? "جاري إصدار الكشف ماليًا..." : "اعتماد وصرف الراتب"}</span>
                  {/* عاكس الإضاءة النيوني المتوهج بقاع الزر */}
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#07132a] border border-[#D4AF37] rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-[#D4AF37] bg-[#0b1b3d] select-none">
                  <h3 className="text-[#D4AF37] text-md md:text-md">سجل رواتب وخصومات الموظفين التاريخي ({payrollList.length})</h3>
                </div>
                
                <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                  {loading ? (
                    <div className="p-12 text-center text-[#D4AF37] text-xs md:text-sm animate-pulse">جاري سحب كشوف الرواتب التاريخية...</div>
                  ) : payrollList.length > 0 ? (
                    <table className="w-full text-right table-auto">
                      <thead className="bg-[#0b1d3d] text-[#D4AF37] font-bold border-b border-[#1f2d4d] select-none text-[13px]">
                        <tr>
                          <th className="py-3 px-4">الشهر المالي</th>
                          <th className="py-3 px-4">اسم الموظف / المهندس</th>
                          <th className="py-3 px-4 font-mono">الراتب الأساسي</th>
                          <th className="py-3 px-4 font-mono">البدلات والحوافز</th>
                          <th className="py-3 px-4 font-mono text-rose-400">الخصومات المطبقة</th>
                          <th className="py-3 px-4 font-mono">صافي المنصرف ج.م</th>
                          <th className="py-3 px-4 text-center">الوضعية المالية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1f2d4d]/60 text-xs md:text-sm text-slate-100 font-semibold">
                        {payrollList.map((p) => (
                          <tr key={p.id} className="hover:bg-[#020B1C]/50 transition duration-150">
                            <td className="p-4 font-mono text-gray-400 whitespace-nowrap">{p.salary_month}</td>
                            <td className="p-4 font-black text-white">{p.users?.name || "موظف ممسوح"}</td>
                            <td className="p-4 font-mono text-white whitespace-nowrap">{Number(p.base_salary).toLocaleString()} ج.م</td>
                            <td className="p-4 font-mono text-emerald-400 font-bold whitespace-nowrap">+{Number(p.allowances).toLocaleString()} ج.م</td>
                            <td className="p-4 font-mono text-rose-400 font-bold whitespace-nowrap">-{Number(p.deductions).toLocaleString()} ج.م</td>
                            <td className="p-4 font-mono font-black text-[#D4AF37] whitespace-nowrap">{Number(p.net_salary).toLocaleString()} ج.م</td>
                            <td className="p-4 text-center whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded text-[10px] font-black ${
                                p.payment_status === "paid" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 animate-pulse" : "bg-red-500/10 text-red-400 animate-pulse"
                              }`}>{p.payment_status === "paid" ? "تم الصرف" : "تحت الحساب"}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-12 text-center text-gray-500 text-sm">لا توجد مسيرات رواتب مسجلة في قاعدة البيانات بعد.</div>
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>
    </main>
  );
}