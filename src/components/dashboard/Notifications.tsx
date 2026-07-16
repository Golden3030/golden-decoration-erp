"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Megaphone, 
  Bell, 
  Package, 
  CreditCard, 
  AlertTriangle, 
  LineChart, 
  LucideIcon 
} from "lucide-react";

interface AlertItem {
  id: string;
  text: string;
  icon: LucideIcon; // ترقية النوع إلى مكون أيقونة Lucide لمنع تشوه أبعاد الرموز التعبيرية التقليدية
  bg: string;
  type: "sales" | "finance" | "procurement" | "tasks";
}

export default function Notifications() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveAlertsAndTasks();
    
    // تفعيل الاستماع الفوري وإلغاء الاشتراك النظيف عند مغادرة الصفحة
    const unsubscribe = setupRealtimeSubscription();
    return () => {
      unsubscribe();
    };
  }, []);

  // دالة جلب التنبيهات والمهام المجدولة اليوم مع الحماية الدفاعية من الأخطاء
  async function fetchActiveAlertsAndTasks() {
    setLoading(true);
    try {
      // 1. جلب المستخدم الحالي وكشف بطاقات قراءته الشخصية
      const { data: { user } } = await supabase.auth.getUser();

      const { data: dbNotifications, error: dbError } = await supabase
        .from("notifications")
        .select("*, notification_reads(user_id)")
        .order("created_at", { ascending: false });

      // فلترة محلية: نعرض فقط الإشعارات التي لم يقرأها هذا المستخدم بعينه
      const unreadForMe = (dbNotifications || []).filter((n: any) => {
        const reads = n.notification_reads || [];
        return !reads.some((r: any) => r.user_id === user?.id);
      });

      const parsedDbAlerts: AlertItem[] = unreadForMe.map((n) => {
        const styles = getStyleByType(n.type);
        return {
          id: n.id,
          text: n.message,
          icon: styles.icon,
          bg: styles.bg,
          type: n.type as any,
        };
      });

      // 2. جلب مهام اليوم ديناميكياً لتذكير المدير بالمواقع المطلوب زيارتها
      const todayStr = new Date().toLocaleDateString("en-CA");
      
      let taskAlerts: AlertItem[] = [];
      try {
        const { data: todayTasks, error: tasksError } = await supabase
          .from("tasks") 
          .select("*")
          .eq("due_date", todayStr);

        if (!tasksError && todayTasks) {
          taskAlerts = todayTasks.map((task: any) => ({
            id: `task-${task.id}`,
            text: `اليوم: متبقي زيارة ومتابعة موقع (${task.title || task.name})`,
            icon: AlertTriangle,
            bg: "bg-red-500/10 border-red-500/20 text-red-300 animate-pulse hover:border-red-500/50",
            type: "tasks",
          }));
        }
      } catch (e) {
        console.warn("Tasks table not queryable yet inside dashboard notifications card.", e);
      }

      // دمج التنبيهات الفورية من قاعدة البيانات مع تنبيهات مهام اليوم المجدولة
      const combined = [...taskAlerts, ...parsedDbAlerts];

      // حماية بصرية: إذا كانت قاعدة البيانات فارغة تماماً، نعرض تنبيهات تجريبية مذهبة
      if (combined.length === 0) {
        setAlerts([
          { id: "static-1", text: "لا توجد تنبيهات عاجلة اليوم. النظام يعمل بكفاءة وسرعة كاملة.", icon: Bell, bg: "bg-blue-500/10 border-blue-500/20 text-blue-300 hover:border-blue-500/50", type: "sales" },
          { id: "static-2", text: "قم باستيراد شيت إكسيل لتجربة استقبال التنبيهات السحابية الحية.", icon: Package, bg: "bg-amber-500/10 border-amber-500/20 text-amber-300 hover:border-amber-500/50", type: "procurement" }
        ]);
      } else {
        setAlerts(combined);
      }

    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }

  // تفعيل استقبال التحديثات الفورية حياً بمعرّف عشوائي فريد لمنع خطأ الـ subscribe المزدوج
  function setupRealtimeSubscription() {
    const channelId = `realtime-dashboard-alerts-${Math.random().toString(36).slice(2, 9)}`;
    
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const styles = getStyleByType(payload.new.type);
          const newAlert: AlertItem = {
            id: payload.new.id,
            text: payload.new.message,
            icon: styles.icon,
            bg: styles.bg,
            type: payload.new.type,
          };
          
          setAlerts((prev) => {
            const cleanPrev = prev.filter(a => !a.id.startsWith("static-"));
            return [newAlert, ...cleanPrev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // الضغط على التنبيه يزيله من الواجهة ويحدث حالته بقاعدة البيانات كـ "مقروء"
  async function handleDismissAlert(id: string) {
    if (id.startsWith("static-") || id.startsWith("task-")) {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("notification_reads")
        .insert({ notification_id: id, user_id: user?.id });

      if (error) throw error;
      
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Error marking alert as read:", err);
    }
  }

  // خريطة ومطابقة الهوية البصرية للأيقونات الفاخرة المعتمدة
  function getStyleByType(type: string) {
    switch (type) {
      case "sales":
        return { icon: LineChart, bg: "bg-blue-500/10 border-blue-500/20 text-blue-300 hover:border-blue-500/50" };
      case "finance":
        return { icon: CreditCard, bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:border-emerald-500/50" };
      case "procurement":
        return { icon: Package, bg: "bg-amber-500/10 border-amber-500/20 text-amber-300 hover:border-amber-500/50" };
      case "tasks":
      default:
        return { icon: AlertTriangle, bg: "bg-red-500/10 border-red-500/20 text-red-300 animate-pulse hover:border-red-500/50" };
    }
  }

  return (
    <div dir="rtl" className="h-full bg-[#07132a] border border-[#1f2d4d] rounded-2xl p-5 overflow-hidden transition-all duration-300 hover:border-[#D4AF37]/35 shadow-2xl">
      
      {/* رأس كارت التنبيهات المزين بالأيقونة الفخمة الموجهة لليمين بالكامل تزامناً مع لغة الضبط العربي */}
      <div className="flex items-center gap-3 mb-6 justify-start border-b border-[#D4AF37] pb-3 bg-[#0b1b3d] p-3 rounded-xl select-none">
        <Megaphone className="w-5 h-5 text-[#D4AF37] shrink-0 animate-pulse" />
        <h2 className="text-[#D4AF37] text-sm font-bold">
          التنبيهات الإدارية
        </h2>
      </div>

      {/* كروت التنبيهات الزجاجية الأنيقة تفاعلياً */}
      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
        {loading ? (
          <div className="p-12 text-center text-[#F0E6D2]/45 text-xs animate-pulse font-medium">جاري الاستماع للتنبيهات والمهام...</div>
        ) : alerts.length > 0 ? (
          alerts.map((alert) => {
            const IconComponent = alert.icon;
            return (
              <div
                key={alert.id}
                onClick={() => handleDismissAlert(alert.id)}
                className={`flex items-center gap-3.5 p-3.5 border rounded-xl cursor-pointer select-none transition duration-200 hover:scale-[1.01] hover:brightness-110 ${alert.bg}`}
                title="اضغط لوضع علامة مقروء وإخفاء التنبيه"
              >
                <IconComponent className="w-4 h-4 shrink-0" strokeWidth={2} />
                <p className="text-[11px] font-bold leading-relaxed">{alert.text}</p>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center text-[#F0E6D2]/40 text-xs font-semibold">
            لا توجد تنبيهات نشطة حالياً.
          </div>
        )}
      </div>

    </div>
  );
}