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
          // 🌟 تم معالجة وإصلاح ثغرة الـ payment_method وحقن طريقة صرف كاش افتراضية لتفادي تداخل القيود بقاعدة البيانات
          const { error: transErr } = await supabase
            .from("transactions")
            .insert([{
              project_id: null, 
              amount: calculatedNetSalary,
              type: "outflow",
              category: "administrative", // استخدام فئة المصاريف الإدارية المعتمدة بالخزينة
              payment_method: "cash", // 👈 تم حل الثغرة وحقن طريقة الصرف الإلزامية كاش لمنع تعارض الـ Constraint
              notes: `صرف مسير الراتب لشهر (${salaryMonth}) للموظف (${employeeName})`, // ربط بحقل الملاحظات المعتمد بالخزينة
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
    <main className="min-h-screen flex bg-[#020B1C] relative overflow-hidden font-alexandria" dir="rtl">
      
      <Sidebar />
      
      {/* 🛠️ جدار الحماية البصري الموحد وتنسيق شريط التمرير المذهب ومنع التداخل نهائياً */}
      <style dangerouslySetInnerHTML={{__html: `
        /* تفعيل وإظهار شريط التمرير الأفقي والرأسي بكافة الجداول بألوان ذهبية فاخرة */
        ::-webkit-scrollbar { 
          width: 4px !important; 
          height: 4px !important; 
          display: block !important;
        }
        ::-webkit-scrollbar-track { 
          background: #020B1C !important; 
        }
        ::-webkit-scrollbar-thumb { 
          background: #D4AF37 !important; 
          border-radius: 9999px !important; 
        }
        ::-webkit-scrollbar-thumb:hover { 
          background: #AA7C11 !important; 
        }

        /* إلغاء أكواد الإخفاء لضمان انسيابية التمرير بالماوس والجوال */
        .overflow-x-auto { 
          
          -ms-overflow-style: auto !important; 
          overflow-x: auto !important; 
        }

        /* عزل تلوين وأوزان خلايا جدول الرواتب وحمايتها من التداخل الكلمي */
        .premium-payroll-table thead th {
          font-size: 0.75rem !important;
          font-weight: 500 !important;
          color: #D4AF37 !important;
          text-align: right !important;
          background-color: #020B1C !important;
          border-bottom: 2px solid rgba(212, 175, 55, 0.3) !important;
          padding: 14px 16px !important;
          letter-spacing: normal !important;
        }

        .premium-payroll-table tbody td {
          font-size: 0.8rem !important;
          font-weight: 400 !important;
          text-align: center !important;
          border-bottom: 1px solid rgba(212, 175, 55, 0.1) !important;
          padding: 14px 16px !important;
          letter-spacing: normal !important;
        }

        .premium-payroll-table tbody tr:hover {
          background-color: rgba(7, 19, 42, 0.8) !important;
        }
      `}} />

      <section className="flex-1 flex flex-col lg:pr-56 m-0 min-h-screen">
        <Header />
        
        <div className="p-4 md:p-8 space-y-6 text-right select-none">
          
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
            <div className="p-5 rounded-[2rem] bg-[#07132a] border border-[#D4AF37]/20 flex flex-col justify-between shadow-lg">
              <div className="flex justify-between items-start">
                <Banknote className="w-6 h-6 text-rose-400" />
                <span className="bg-red-500/10 text-red-400 text-xs px-2.5 py-0.5 rounded-full font-bold">مصروفات الموظفين الصادرة</span>
              </div>
              <div className="mt-5 text-right">
                <p className="text-[#D4AF37] text-base font-black">إجمالي المرتبات المنصرفة فعلياً من الخزينة</p>
                <h3 className="text-white text-2xl md:text-3xl font-black mt-1 font-mono">-{totalSalariesOutflow.toLocaleString('en-US')} ج.م</h3>
              </div>
            </div>

            <div className="p-5 rounded-[2rem] bg-[#07132a] border border-[#D4AF37]/20 flex flex-col justify-between shadow-lg">
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
                  <label className="block text-[#D4AF37] mb-1.5 px-3 text-[12px] select-none">الموظف / المهندس المستهدف *</label>
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
                  <label className="block text-[#D4AF37] mb-1.5 text-[12px] px-3 select-none">الشهر المالي للاستحقاق *</label>
                  <input
                    type="month"
                    value={salaryMonth}
                    onChange={(e) => setSalaryMonth(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] font-bold px-3 outline-none font-mono focus:border-[#D4AF37] text-xs text-center"
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[#D4AF37] mb-1.5 text-[12px] px-8 select-none whitespace-nowrap">الراتب الأساسي الثابت *</label>
                    <div className="flex items-center gap-2.5 h-11" dir="ltr">
                      <button
                        type="button" 
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
                        type="button" 
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
                    <label className="block text-[#D4AF37] mb-1.5 text-[12px] px-8 select-none whitespace-nowrap">حوافز ومكافآت (البدلات)</label>
                    <div className="flex items-center gap-2.5 h-11" dir="ltr">
                      <button
                        type="button" 
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
                        type="button" 
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
                  <label className="block text-rose-400/80 mb-1 text-[11px] select-none">🚨 الخصم والاستقطاع والجزاءات المطبقة</label>
                  <div className="flex items-center gap-2.5 h-11" dir="ltr">
                    <button
                      type="button" 
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
                      type="button" 
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
                  <label className="block text-[#D4AF37] mb-1.5 text-[12px] px-3 select-none">حالة صرف وتسليم الراتب *</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] font-bold px-3 text-xs outline-none cursor-pointer focus:border-[#D4AF37]"
                  >
                    <option value="unpaid">تحت الاستحقاق (لم يصرف)</option>
                    <option value="paid">تم الصرف (الخروج المالي من الخزينة)</option>
                  </select>
                </div>

                {/* زر حفظ وصرف الراتب المذهب */}
                <button
                  type="button" 
                  onClick={(e) => { e.preventDefault(); handleCreatePayroll(); }}
                  disabled={saving}
                  className="w-full px-6 py-3.5 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.01] active:scale-95 transition-all duration-300  text-md cursor-pointer flex items-center justify-center gap-1.5 select-none relative overflow-hidden disabled:opacity-40"
                >
                  {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Coins className="w-4 h-4" />}
                  <span>{saving ? "جاري إصدار الكشف ماليًا..." : "اعتماد وصرف الراتب"}</span>
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#07132a] border border-[#D4AF37] rounded-[2rem] overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-[#D4AF37] bg-[#0b1b3d] select-none">
                  <h3 className="text-[#D4AF37] font-bold text-md md:text-md">سجل رواتب وخصومات الموظفين  ({payrollList.length})</h3>
                </div>
                
                {/* 🌟 تم تفعيل جدار التمرير المذهب وحظر التداخل بـ whitespace-nowrap و min-w-[850px] هنا بالبكسل */}
                <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                  {loading ? (
                    <div className="p-12 text-center text-[#D4AF37] text-xs md:text-sm animate-pulse">جاري سحب كشوف الرواتب ...</div>
                  ) : payrollList.length > 0 ? (
                    <table className="w-full text-right table-auto min-w-[850px] premium-payroll-table">
                      <thead>
                        <tr className="whitespace-nowrap select-none">
                          <th>الشهر المالي</th>
                          <th>اسم الموظف / المهندس</th>
                          <th>الراتب الأساسي</th>
                          <th>البدلات والحوافز</th>
                          <th className=" text-rose-400">الخصومات المطبقة</th>
                          <th>صافي المنصرف ج.م</th>
                          <th className="text-center">الوضعية المالية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1f2d4d]/60 text-xs md:text-sm text-slate-100 font-semibold">
                        {payrollList.map((p) => (
                          <tr key={p.id} className="whitespace-nowrap">
                            <td className="font-mono text-gray-400">{p.salary_month}</td>
                            <td className="font-black text-white">{p.users?.name || "موظف ممسوح"}</td>
                            <td className="font-mono text-white">{Number(p.base_salary).toLocaleString()} ج.م</td>
                            <td className="font-mono text-emerald-400 font-bold">+{Number(p.allowances).toLocaleString()} ج.م</td>
                            <td className="font-mono text-rose-400 font-bold">-{Number(p.deductions).toLocaleString()} ج.م</td>
                            <td className="font-mono font-black text-[#D4AF37]">{Number(p.net_salary).toLocaleString()} ج.م</td>
                            <td className="text-center">
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