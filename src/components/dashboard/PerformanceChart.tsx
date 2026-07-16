"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { TrendingUp, LineChart } from "lucide-react";

export default function PerformanceChart() {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function aggregateAnnualFinancialData() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("transactions")
          .select("amount, type, payment_date");

        if (error) throw error;

        const monthsList = [
          { name: "يناير", income: 0, expense: 0 },
          { name: "فبراير", income: 0, expense: 0 },
          { name: "مارس", income: 0, expense: 0 },
          { name: "أبريل", income: 0, expense: 0 },
          { name: "مايو", income: 0, expense: 0 },
          { name: "يونيو", income: 0, expense: 0 },
          { name: "يوليو", income: 0, expense: 0 },
          { name: "أغسطس", income: 0, expense: 0 },
          { name: "سبتمبر", income: 0, expense: 0 },
          { name: "أكتوبر", income: 0, expense: 0 },
          { name: "نوفمبر", income: 0, expense: 0 },
          { name: "ديسمبر", income: 0, expense: 0 }
        ];

        (data || []).forEach((tx) => {
          // تأمين دفاعي: التحقق من وجود التاريخ لتجنب انهيار التجميع البرمجي
          if (!tx.payment_date) return;
          
          const date = new Date(tx.payment_date);
          const monthIndex = date.getMonth();
          const amount = Number(tx.amount) || 0;

          if (monthIndex >= 0 && monthIndex < 12) {
            if (tx.type === "Revenue" || tx.type === "inflow") {
              monthsList[monthIndex].income += amount;
            } else {
              monthsList[monthIndex].expense += amount;
            }
          }
        });

        const maxVal = Math.max(
          1,
          ...monthsList.map(m => Math.max(m.income, m.expense))
        );

        // ترقية مقياس الرسم إلى 160px بدلاً من 100px لاستغلال الفراغ الرأسي للكرت بكفاءة
        const normalized = monthsList.map((m) => ({
          month: m.name,
          incomePercent: Math.max(8, Math.round((m.income / maxVal) * 160)),
          expensePercent: Math.max(8, Math.round((m.expense / maxVal) * 160)),
          realIncome: m.income,
          realExpense: m.expense
        }));

        setChartData(normalized);
      } catch (err) {
        console.error("Error aggregating performance chart data:", err);
      } finally {
        setLoading(false);
      }
    }

    aggregateAnnualFinancialData();
  }, []);

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800;900&display=swap');
        
        .font-alexandria {
          font-family: 'Alexandria', Arial, sans-serif !important;
          letter-spacing: normal !important;
        }
      `}</style>

      <div dir="rtl" className="h-full bg-[#07132a] border border-[#1f2d4d] rounded-2xl p-5 overflow-hidden transition-all duration-300 hover:border-[#D4AF37]/35 shadow-2xl font-alexandria">
        
        {/* ترويسة الكارت الفاخرة - تم ضبط التموضع ليبدأ من اليمين RTL مع دمج أيقونة Lucide */}
        <div className="flex items-center gap-3 mb-6 justify-start border-b border-[#D4AF37] pb-3 bg-[#0b1b3d] p-3 rounded-xl select-none">
          <TrendingUp className="w-5 h-5 text-[#D4AF37] shrink-0 animate-pulse" />
          <h2 className="text-[#D4AF37] text-sm font-bold">
            الإيرادات والمصروفات السنوية بالخزنة
          </h2>
        </div>

        {loading ? (
          <div className="text-center text-xs text-[#F0E6D2]/45 py-24 animate-pulse font-semibold">جاري معالجة وتجميع القيود المالية سحابياً...</div>
        ) : (
          <div className="h-[210px] flex items-end justify-between gap-1.5 px-1 md:px-4">
            {chartData.map((item) => (
              <div
                key={item.month}
                className="group relative flex flex-col items-center flex-1 transition-all duration-200"
              >
                
                {/* كارت التلميح العائم المذهب الأنيق المحدث */}
                <div className="absolute -top-14 bg-[#020B1C]/95 border border-[#D4AF37]/45 text-[#F0E6D2] text-[10px] font-bold px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-30 shadow-[0_4px_20px_rgba(0,0,0,0.8)] leading-normal">
                  الوارد: <span className="font-mono text-emerald-400">{item.realIncome.toLocaleString()}</span> ج.م | الصادر: <span className="font-mono text-[#D4AF37]">{item.realExpense.toLocaleString()}</span> ج.م
                </div>

                {/* الأعمدة المتناسقة والمسحوبة بملء الشاشة مع التوهج الناعم */}
                <div className="flex items-end gap-1 w-full justify-center">
                  <div
                    className="w-1.5 sm:w-2 bg-[#F0E6D2] rounded-t transition-all duration-300 shadow-[0_0_10px_rgba(240,230,210,0.2)] group-hover:scale-y-[1.03] group-hover:brightness-110"
                    style={{
                      height: `${item.incomePercent}px`
                    }}
                  />

                  <div
                    className="w-1.5 sm:w-2 bg-[#D4AF37] rounded-t transition-all duration-300 shadow-[0_0_10px_rgba(212,175,55,0.2)] group-hover:scale-y-[1.03] group-hover:brightness-110"
                    style={{
                      height: `${item.expensePercent}px`
                    }}
                  />
                </div>

                <span className="mt-3 text-[10px] text-gray-400 font-bold select-none group-hover:text-white transition duration-150">
                  {item.month}
                </span>

              </div>
            ))}
          </div>
        )}

        {/* دبابيس المفاتيح الإيضاحية بالأسفل */}
        <div className="flex justify-center gap-6 mt-5 text-xs select-none">
          
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-[#F0E6D2] rounded-sm shadow-[0_0_6px_rgba(240,230,210,0.3)]" />
            <span className="text-[#F0E6D2]/75 font-semibold">الإيرادات (الوارد)</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-[#D4AF37] rounded-sm shadow-[0_0_6px_rgba(212,175,55,0.3)]" />
            <span className="text-[#F0E6D2]/75 font-semibold">المصروفات (الصادر)</span>
          </div>

        </div>

      </div>
    </>
  );
}