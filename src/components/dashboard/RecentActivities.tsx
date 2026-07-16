"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  History, 
  Users, 
  Coins, 
  Clock, 
  Bell, 
  LucideIcon 
} from "lucide-react";

interface ActivityItem {
  title: string;
  time: string;
  type: string; // تخزين مفتاح النص للنوع لضمان رندرة الأيقونة دون فقدان المراجع
}

export default function RecentActivities() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadLiveActivities() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(4);

        if (error) throw error;

        const mapped = (data || []).map((n) => {
          const now = new Date();
          const created = new Date(n.created_at);
          const diffMinutes = Math.max(1, Math.round((now.getTime() - created.getTime()) / (1000 * 60)));
          
          let timeText = `منذ ${diffMinutes} دقيقة`;
          if (diffMinutes >= 60) {
            const diffHours = Math.round(diffMinutes / 60);
            timeText = `منذ ${diffHours} ساعة`;
            if (diffHours >= 24) {
              timeText = `منذ ${Math.round(diffHours / 24)} يوم`;
            }
          }

          return {
            title: n.message || n.title,
            time: timeText,
            type: n.type || "default"
          };
        });

        setActivities(mapped);
      } catch (err) {
        console.error("Error loading recent activities:", err);
      } finally {
        setLoading(false);
      }
    }

    loadLiveActivities();
  }, []);

  // دالة حل الأيقونة الحيوية ديناميكياً أثناء رندرة الواجهة (Render-Time Resolution)
  const getIconComponent = (type: string): LucideIcon => {
    switch (type) {
      case "sales":
        return Users;
      case "finance":
        return Coins;
      case "tasks":
        return Clock;
      case "default":
      default:
        return Bell;
    }
  };

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
        
        {/* ترويسة الجدول الإمبراطورية الفاخرة مع اتجاه RTL الصحيح ورموز النخبة */}
        <div className="flex items-center gap-3 mb-6 justify-start border-b border-[#243556] pb-3 bg-[#0b1b3d] p-3 rounded-xl select-none">
          <History className="w-5 h-5 text-[#D4AF37] shrink-0 animate-pulse" />
          <h2 className="text-[#D4AF37] text-sm font-bold">
            آخر الأنشطة والعمليات والقيود المالية
          </h2>
        </div>

        {loading ? (
          <div className="text-center text-xs text-[#F0E6D2]/45 py-12 animate-pulse font-semibold">جاري جلب أحدث الأنشطة الموقعية...</div>
        ) : activities.length > 0 ? (
          <div className="relative pr-8 space-y-6">
            
            {/* المحور الرأسي النحيف لخط التايم لاين المذهب متمركز بدقة بكسلية */}
            <div className="absolute right-[13px] top-2.5 bottom-2 w-[1px] bg-[#D4AF37]/15 rounded-full" />

            {activities.map((activity, index) => {
              const IconComponent = getIconComponent(activity.type);
              return (
                <div key={index} className="relative flex items-start pr-8 group cursor-pointer select-none">
                  
                  {/* العقدة اللمسية الذهبية الفاخرة الموحدة (Single Capacitive Node) - متطابقة مركزياً بنسبة 100% فوق المحور */}
                  <div className="absolute right-0 top-1.5 w-7 h-7 rounded-full bg-[#020B1C] border border-[#D4AF37] text-[#D4AF37] flex items-center justify-center shadow-[0_0_8px_rgba(212,175,55,0.3)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_#D4AF37] z-10">
                    <IconComponent size={12} strokeWidth={2} />
                  </div>

                  <div className="text-right flex-1 pr-1">
                    <p className="text-[#F0E6D2] text-xs font-bold leading-relaxed transition duration-150 group-hover:text-[#D4AF37]">
                      {activity.title}
                    </p>
                    <p className="text-[#F0E6D2]/60 text-[10px] mt-1 font-mono font-bold">{activity.time}</p>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-[#F0E6D2]/40 text-xs font-semibold select-none">
            لا توجد عمليات حيوية مسجلة بالنظام مؤخراً.
          </div>
        )}

      </div>
    </>
  );
}