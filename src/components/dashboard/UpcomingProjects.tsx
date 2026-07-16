"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient"; 
import { CalendarClock } from "lucide-react";

export default function UpcomingProjects() {
  const [upcomingList, setUpcomingList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // جلب المشاريع الجارية القريبة من موعد التسليم وحساب الأيام المتبقية حياً من قاعدة البيانات
  useEffect(() => {
    async function loadUpcomingProjects() {
      try {
        // تفعيل الوقت الفعلي المباشر للنظام السحابي لحساب دقيق للأيام المتبقية
        const today = new Date();

        const { data, error } = await supabase
          .from("projects")
          .select(`
            id,
            project_name,
            created_at,
            customers (
              name
            )
          `)
          .eq("status", "in_progress")
          .order("created_at", { ascending: true }) // الترتيب بتاريخ البناء
          .limit(4);

        if (error) throw error;

        // حساب الفارق الزمني بالأيام المتبقية تلقائياً برمجياً حياً
        const mapped = (data || []).map((p: any) => {
          const creationDate = new Date(p.created_at);
          // حساب تاريخ التسليم التلقائي (120 يوماً من تاريخ البناء)
          const deliveryDate = new Date(creationDate.getTime() + 120 * 24 * 60 * 60 * 1000);
          
          // حساب فارق الأيام
          const diffTime = deliveryDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          return {
            name: p.project_name,
            client: p.customers?.name || "عميل غير محدد",
            date: deliveryDate.toLocaleDateString("en-CA"),
            daysLeft: diffDays
          };
        });

        setUpcomingList(mapped);
      } catch (err: any) {
        console.error("Full Upcoming Projects Fetch Error:", JSON.stringify(err, null, 2));
      } finally {
        setLoading(false);
      }
    }

    loadUpcomingProjects();
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
        
        {/* رأس كارت المشاريع القريبة المزين بالأيقونة الفخمة وتصحيح كامل لاتجاه الـ RTL */}
        <div className="flex items-center gap-3 mb-6 justify-start border-b border-[#243556] pb-3 bg-[#0b1b3d] p-3 rounded-xl select-none">
          <CalendarClock className="w-5 h-5 text-[#D4AF37] shrink-0 animate-pulse" />
          <h2 className="text-[#D4AF37] text-sm font-bold">
            المشاريع القريبة من تاريخ التسليم
          </h2>
        </div>

        <div className="space-y-3.5">
          {loading ? (
            <div className="p-8 text-center text-[#F0E6D2]/50 text-xs font-bold flex items-center justify-center gap-3 animate-pulse">
              <span className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" />
              جاري فحص وحساب مواعيد تسليم المشاريع...
            </div>
          ) : upcomingList.length > 0 ? (
            upcomingList.map((proj, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-3.5 bg-[#020B1C] border border-[#D4AF37]/10 rounded-xl hover:border-[#D4AF37]/30 transition duration-150 cursor-pointer select-none"
              >
                <div className="text-right">
                  <p className="text-white text-xs font-black leading-relaxed">{proj.name}</p>
                  <p className="text-[#F0E6D2]/60 text-[10px] mt-1 font-semibold">العميل: {proj.client}</p>
                </div>

                {/* كبسولة الأيام المتبقية المضيئة للتنبيه بمرور الوقت مع الالتزام بالفوت الموحد */}
                <div className="text-left font-mono text-xs">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black ${
                    proj.daysLeft < 30 
                      ? "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse font-sans" 
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans"
                  }`}>
                    {proj.daysLeft < 0 ? `متأخر بـ ${Math.abs(proj.daysLeft)}` : `متبقي ${proj.daysLeft}`} يوم
                  </span>
                  <p className="text-[#F0E6D2]/40 text-[9px] mt-1.5 text-center font-bold font-alexandria select-none">تسليم {proj.date}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-[#F0E6D2]/40 text-xs font-semibold select-none">
              لا توجد مشاريع جارية قريبة من التسليم حالياً.
            </div>
          )}
        </div>

      </div>
    </>
  );
}