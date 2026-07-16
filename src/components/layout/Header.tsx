"use client";

import { useEffect, useState, useRef } from "react"; 
import { useRouter } from "next/navigation";
import { Bell, CalendarClock, Search, LogOut, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import AddUserModal from "./AddUserModal"; 

interface NotificationItem {
  id: string;
  text: string;
  type: "sales" | "finance" | "procurement" | "tasks";
}

const roleLabels: { [key: string]: string } = {
  admin: "مدير النظام 👑",
  manager: "مدير الحسابات والتشغيل 💵",
  sales_manager: "مدير مبيعات (CRM) 📊",
  sales: "موظف مبيعات (سيلز) 📈",
  procurement: "موظف مشتريات ومخازن 📦",
  engineer: "مهندس الموقع الميداني 🏗️",
  client: "عميل نهائي 👤"
};

export default function Header() {
  const router = useRouter();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [userProfile, setUserProfile] = useState<{ name: string; role: string }>({
    name: "إسلام الكردى",
    role: "admin"
  });

  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [deletedRecords, setDeletedRecords] = useState<any[]>([]);
  const [selectedRecordDetails, setSelectedRecordDetails] = useState<any | null>(null);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null); 

  useEffect(() => {
    loadHeaderNotifications();
    fetchActiveUserProfile();
    
    const unsubscribe = setupRealtimeSubscription();
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
      if (trashRef.current && !trashRef.current.contains(target)) {
        setIsTrashOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(target)) {
        setShowSearchResults(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data: projectsData } = await supabase
          .from("projects")
          .select("id, project_name")
          .ilike("project_name", `%${searchQuery}%`)
          .limit(4);

        const { data: customersData } = await supabase
          .from("customers")
          .select("id, name")
          .ilike("name", `%${searchQuery}%`)
          .limit(4);

        const combinedResults: any[] = [];
        
        if (projectsData) {
          projectsData.forEach((p) => {
            combinedResults.push({
              id: p.id,
              title: p.project_name,
              type: "project",
              link: `/dashboard/preview/${p.id}`
            });
          });
        }

        if (customersData) {
          customersData.forEach((c) => {
            combinedResults.push({
              id: c.id,
              title: c.name,
              type: "customer",
              link: `/customers`
            });
          });
        }

        setSearchResults(combinedResults);
        setShowSearchResults(true);

      } catch (err) {
        console.error("خطأ أثناء جلب نتائج البحث المتزامن:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  async function fetchActiveUserProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("name, role")
          .eq("id", user.id)
          .single();

        if (profile) {
          const roleKey = profile.role || "sales";
          setUserProfile({
            name: profile.name || "موظف النظام",
            role: roleKey
          });

          if (["admin", "owner", "manager"].includes(roleKey.toLowerCase())) {
            loadDeletedRecords();
          }
        }
      }
    } catch (e) {
      console.warn("Could not fetch logged user profile for dynamic header:", e);
    }
  }

  async function loadDeletedRecords() {
    try {
      const { data, error } = await supabase
        .from("deleted_records")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error) {
        setDeletedRecords(data || []);
      }
    } catch (e) {
      console.error("Error loading deleted records inside header:", e);
    }
  }

  async function handleRestoreRecord(record: any) {
    const confirmRestore = window.confirm(`هل أنت متأكد من رغبتك في استعادة هذا السجل وإلغاء حذفه كلياً من جدول (${record.table_name})؟`);
    if (!confirmRestore) return;

    try {
      const { error: restoreError } = await supabase
        .from(record.table_name)
        .insert([record.deleted_data]);

      if (restoreError) throw restoreError;

      const { error: deleteError } = await supabase
        .from("deleted_records")
        .delete()
        .eq("id", record.id);

      if (deleteError) throw deleteError;

      alert("✅ تم استعادة السجل وإلغاء حذفه وإرجاعه لجدول العمل الأصلي بنجاح!");
      setSelectedRecordDetails(null);
      await loadDeletedRecords();
    } catch (err: any) {
      alert("فشل استعادة السجل: " + err.message);
    }
  }

  async function loadHeaderNotifications() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: dbNotifications, error: dbError } = await supabase
        .from("notifications")
        .select("*, notification_reads(user_id)")
        .order("created_at", { ascending: false });

      if (dbError) throw dbError;

      const unreadForMe = (dbNotifications || []).filter((n: any) => {
        const reads = n.notification_reads || [];
        return !reads.some((r: any) => r.user_id === user?.id);
      });

      const formattedDb = unreadForMe.map((n) => {
        let prefix = "🔔 ";
        if (n.type === "finance") prefix = "💳 ";
        if (n.type === "procurement") prefix = "📦 ";
        if (n.type === "tasks") prefix = "🚨 ";

        return {
          id: n.id,
          text: `${prefix}${n.message}`,
          type: n.type as any,
        };
      });

      const todayStr = new Date().toLocaleDateString("en-CA");
      let taskAlerts: NotificationItem[] = [];
      try {
        const { data: todayTasks, error: tasksError } = await supabase
          .from("tasks")
          .select("*")
          .eq("due_date", todayStr);

        if (!tasksError && todayTasks) {
          taskAlerts = todayTasks.map((task: any) => ({
            id: `task-${task.id}`,
            text: `🚨 اليوم: متبقي زيارة ومتابعة موقع (${task.title || task.name})`,
            type: "tasks",
          }));
        }
      } catch (e) {
        console.warn("Tasks table not queryable inside header yet.", e);
      }

      setNotifications([...taskAlerts, ...formattedDb]);
    } catch (err) {
      console.error("Error loading header notifications:", err);
    } finally {
      setLoading(false);
    }
  }

  function setupRealtimeSubscription() {
    const channelId = `header-live-bell-${Math.random().toString(36).slice(2, 9)}`;

    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          let prefix = "🔔 ";
          if (payload.new.type === "finance") prefix = "💳 ";
          if (payload.new.type === "procurement") prefix = "📦 ";
          if (payload.new.type === "tasks") prefix = "🚨 ";

          const newNotif: NotificationItem = {
            id: payload.new.id,
            text: `${prefix}${payload.new.message}`,
            type: payload.new.type,
          };

          setNotifications((prev) => {
            const cleanPrev = prev.filter(a => !a.id.startsWith("static-"));
            return [newNotif, ...cleanPrev];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "deleted_records" },
        () => {
          loadDeletedRecords();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async function handleMarkAllAsRead() {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const dbIds = notifications
        .filter((n) => !n.id.startsWith("task-"))
        .map((n) => n.id);

      if (dbIds.length > 0 && user) {
        const rows = dbIds.map((notification_id) => ({
          notification_id,
          user_id: user.id,
        }));

        const { error } = await supabase
          .from("notification_reads")
          .upsert(rows, { onConflict: "notification_id,user_id" });

        if (error) throw error;
      }

      setNotifications((prev) => prev.filter((n) => n.id.startsWith("task-")));
      setIsNotificationsOpen(false);
    } catch (err) {
      console.error("Error marking all read inside header:", err);
    }
  }

  async function handleDismissSingle(id: string) {
    if (id.startsWith("task-")) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("notification_reads")
        .insert({ notification_id: id, user_id: user?.id });

      if (error) throw error;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Error dismissing notification:", err);
    }
  }

  async function handleSignOut() {
    const confirmLogout = confirm("هل أنت متأكد من تسجيل الخروج من النظام وتأمين جلسة العمل؟");
    if (confirmLogout) {
      try {
        await supabase.auth.signOut();
        router.push("/");
      } catch (err) {
        console.error("خطأ أثناء تسجيل الخروج الآمن:", err);
      }
    }
  }

  const unreadCount = notifications.length;
  const isOwnerOrAdmin = ["admin", "owner", "manager"].includes(userProfile.role.toLowerCase());

  return (
    <>
      {/* حقن مباشر لتنسيقات أشرطة التمرير والنبضات الذهبية والحمراء الفاخرة للـ Header */}
      <style jsx global>{`
        /* شريط التمرير ذو الأسهم الذهبية المخصصة للقوائم المنبثقة */
        .header-dropdown-scroll::-webkit-scrollbar {
          width: 8px !important;
          height: 8px !important;
        }
        .header-dropdown-scroll::-webkit-scrollbar-track {
          background: #020B1C !important;
        }
        .header-dropdown-scroll::-webkit-scrollbar-thumb {
          background: #D4AF37 !important;
          border-radius: 9999px !important;
        }
        .header-dropdown-scroll::-webkit-scrollbar-thumb:hover {
          background: #C9A45D !important;
        }
        .header-dropdown-scroll::-webkit-scrollbar-button {
          display: block !important;
          background-color: #020B1C !important;
          height: 10px !important;
          width: 10px !important;
        }
        .header-dropdown-scroll::-webkit-scrollbar-button:vertical:decrement {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23D4AF37'><polygon points='50,20 15,80 85,80'/></svg>") !important;
          background-size: 6px !important;
          background-repeat: no-repeat !important;
          background-position: center !important;
        }
        .header-dropdown-scroll::-webkit-scrollbar-button:vertical:increment {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23D4AF37'><polygon points='15,20 85,20 50,80'/></svg>") !important;
          background-size: 6px !important;
          background-repeat: no-repeat !important;
          background-position: center !important;
        }

        /* حركية التنفس النيون الحمراء لسلة المحذوفات */
        @keyframes luxury-breath-red {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 4px rgba(239, 68, 68, 0.15), inset 0 0 2px rgba(239, 68, 68, 0.08);
            border-color: rgba(239, 68, 68, 0.4);
          }
          50% {
            transform: scale(1.04);
            box-shadow: 0 0 14px rgba(239, 68, 68, 0.45), inset 0 0 6px rgba(239, 68, 68, 0.15);
            border-color: rgba(239, 68, 68, 0.85);
          }
        }
        .luxury-breath-red-btn {
          animation: luxury-breath-red 3s infinite ease-in-out;
        }
      `}</style>

      <header
        className="h-20 border-b border-[#D4AF37] bg-[#07132a] flex items-center justify-between px-6 relative print:hidden animate-fade-in"
        dir="rtl"
      >
        {/* قطاع بيانات الموظف والملف الشخصي والاسم */}
        <div ref={profileRef} className="flex items-center gap-4 relative">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="w-11 h-11 rounded-full bg-[#020B1C] hover:scale-105 active:scale-95 transition-all flex items-center justify-center text-[#D4AF37] font-extrabold text-lg select-none cursor-pointer border border-[#D4AF37]/50 shadow-[0_4px_12px_rgba(212,175,55,0.15)]"
            title="الملف الشخصي وخيارات التحكم"
          >
            {userProfile.name.charAt(0).toUpperCase()}
          </button>

          {isProfileMenuOpen && (
            <div className="absolute right-0 top-14 w-52 bg-[#020B1C] border border-[#D4AF37]/40 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-2 z-50 animate-fade-in">
              <button
                onClick={handleSignOut}
                className="w-full text-right px-3 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg transition duration-150 flex items-center gap-2 cursor-pointer"
              >
                <LogOut size={14} />
                ✕ تسجيل الخروج الآمن
              </button>
            </div>
          )}

          <div className="text-right">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-bold text-sm">مرحباً {userProfile.name}</h3>
            </div>
            {/* تم جعل مسمى الوظيفة/الرتبة باللون الأبيض الصافي وتحسين مظهر التباين */}
            <p className="text-white text-[10px] md:text-xs mt-1 font-semibold bg-[#020B1C]/60 py-0.5 px-2 rounded border border-[#D4AF37]/10 inline-block">
              {roleLabels[userProfile.role] || "موظف بالنظام"}
            </p>
          </div>
        </div>

        {/* قطاع البحث والأدوات والتحكم */}
        <div className="flex items-center gap-5">
          {/* محرك البحث المتزامن المدعوم بالمستشعر الخارجي */}
          <div ref={searchRef} className="w-[320px] relative">
            <Search size={16} className="absolute right-4 top-3.5 text-[#D4AF37]" />
            <input
              type="text"
              placeholder="ابحث باسم مشروع أو عميل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/30 pr-11 pl-4 text-white outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/40 text-xs transition-all placeholder:text-[#F0E6D2]/40 shadow-inner animate-all"
            />

            {showSearchResults && (
              <div className="absolute top-13 right-0 w-full bg-[#020B1C] border border-[#D4AF37]/40 rounded-xl shadow-2xl p-3 z-50 max-h-64 overflow-y-auto header-dropdown-scroll">
                {isSearching ? (
                  <div className="text-center text-[11px] text-gray-400 py-3 animate-pulse">جاري فحص وتصفية البيانات...</div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-1.5">
                    {searchResults.map((res, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          router.push(res.link);
                          setShowSearchResults(false);
                          setSearchQuery("");
                        }}
                        className="w-full text-right text-xs p-2.5 rounded-lg hover:bg-[#07132a] transition duration-150 block text-white font-bold flex items-center justify-between cursor-pointer border border-transparent hover:border-[#D4AF37]/20"
                      >
                        <span className="truncate">{res.title}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${res.type === "project" ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"}`}>
                          {res.type === "project" ? "موقع" : "عميل"}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-[11px] text-gray-500 py-3">لا توجد نتائج مطابقة لاسم مشروع أو عميل.</div>
                )}
              </div>
            )}
          </div>

          {/* سلة المحذوفات الرقابية مع تفعيل النبض النيوني الأحمر للمراقبة عند امتلائها */}
          {isOwnerOrAdmin && (
            <div ref={trashRef} className="relative">
              <button
                onClick={() => {
                  setIsTrashOpen(!isTrashOpen);
                  setIsNotificationsOpen(false); 
                }}
                className={`w-10 h-10 rounded-full border text-red-500 bg-[#020B1C] flex items-center justify-center cursor-pointer hover:bg-red-500 hover:text-white transition relative shadow-[0_4px_12px_rgba(239,68,68,0.1)] ${
                  deletedRecords.length > 0 ? "luxury-breath-red-btn border-red-500/50" : "border-[#D4AF37]/30"
                }`}
                title="سلة المحذوفات والرقابة العامة"
              >
                <Trash2 size={18} />
                {deletedRecords.length > 0 && (
                  <span className="absolute -top-1 -left-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-[10px] text-white font-bold select-none shadow-[0_0_8px_#ef4444]">
                    {deletedRecords.length}
                  </span>
                )}
              </button>

              {isTrashOpen && (
                <div className="absolute top-13 left-0 w-[420px] bg-[#020B1C] border border-[#D4AF37]/40 rounded-2xl shadow-2xl p-5 z-50 text-right space-y-4 transition-all duration-300 animate-fade-in">
                  <div className="border-b border-[#D4AF37]/20 pb-3 flex justify-between items-center select-none">
                    {/* تعديل لون ترويسة العنوان للون البني البرونزي المعتمد */}
                    <span className="text-[#A17A4C] font-extrabold text-xs">سلة المحذوفات والرقابة الفنية للمواقع</span>
                    <span className="text-[10px] text-gray-500">منظومة المالك المعتمدة 👑</span>
                  </div>
                  
                  <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 header-dropdown-scroll">
                    {deletedRecords.length > 0 ? (
                      deletedRecords.map((item) => (
                        <div 
                          key={item.id}
                          className="bg-[#07132a] border border-red-500/10 hover:border-red-500/30 p-3.5 rounded-xl space-y-2 relative transition cursor-pointer"
                          onClick={() => setSelectedRecordDetails(item)}
                        >
                          <div className="flex justify-between items-center text-[10px] text-gray-500 border-b border-red-500/5 pb-1">
                            <span className="font-bold text-red-400">🚨 الحذف من: {item.table_name === "customers" ? "العملاء والـ CRM" : "مكتبة البنود"}</span>
                            <span className="font-mono">{new Date(item.created_at).toLocaleDateString("ar-EG")}</span>
                          </div>
                          <p className="text-white text-xs leading-relaxed font-bold">
                            الموظف <span className="text-[#D4AF37] font-black">{item.deleted_by_name}</span> قام بحذف سجل.
                          </p>
                          <span className="text-[9px] text-[#D4AF37] underline block font-semibold">انقر هنا لمعاينة واستعادة السجل فوراً 📂</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-500 text-xs select-none font-bold">سلة المحذوفات فارغة والرقابة المالية مستقرة تماماً.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* قطاع جرس التنبيهات مع تفعيل النبض الذهبي للتعريف بوجود إشعارات غير مقروءة */}
          <div ref={notificationsRef} className="relative">
            <button
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                setIsTrashOpen(false); 
              }}
              className={`w-10 h-10 rounded-full border bg-[#020B1C] text-[#D4AF37] flex items-center justify-center cursor-pointer hover:bg-[#D4AF37] hover:text-[#020B1C] transition relative shadow-[0_4px_12px_rgba(212,175,55,0.1)] ${
                unreadCount > 0 ? "luxury-breath-btn border-[#D4AF37]" : "border-[#D4AF37]/30"
              }`}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold select-none">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute top-13 left-0 w-[400px] bg-[#020B1C] border border-[#D4AF37]/40 rounded-2xl shadow-2xl p-5 z-50 text-right space-y-4 transition-all duration-300 animate-fade-in">
                <div className="border-b border-[#D4AF37]/20 pb-3 flex justify-between items-center select-none">
                  {/* تحويل نصوص العناوين للون البني البرونزي المعتمد */}
                  <span className="text-[#A17A4C] font-extrabold text-xs">التنبيهات الأخيرة ({unreadCount})</span>
                  {unreadCount > 0 && (
                    <span 
                      className="text-[10px] text-gray-400 cursor-pointer hover:text-white transition duration-150" 
                      onClick={handleMarkAllAsRead}
                    >
                      تعليم الكل كمقروء
                    </span>
                  )}
                </div>
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 header-dropdown-scroll">
                  {unreadCount > 0 ? (
                    notifications.map((alert) => (
                      <div 
                        key={alert.id} 
                        onClick={() => handleDismissSingle(alert.id)}
                        className="text-white text-xs font-bold border-b border-[#1f2d4d] pb-3 last:border-0 hover:text-[#D4AF37] cursor-pointer leading-relaxed transition duration-150 hover:bg-[#07132a]/40 p-2 rounded"
                        title="اضغط لوضع علامة مقروء وإخفاء التنبيه"
                      >
                        {alert.text}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500 text-xs select-none font-bold">لا توجد تنبيهات غير مقروءة حالياً.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* زر جدول المواعيد */}
          <button 
            onClick={() => router.push("/appointments")}
            className="w-10 h-10 rounded-full border border-[#D4AF37]/30 bg-[#020B1C] text-[#D4AF37] flex items-center justify-center cursor-pointer hover:bg-[#D4AF37] hover:text-[#020B1C] transition shadow-[0_4px_12px_rgba(212,175,55,0.08)]"
            title="جدول المواعيد واللقاءات الميدانية للمواقع"
          >
            <CalendarClock size={18} />
          </button>
        </div>

        {isPermissionsOpen && (
          <AddUserModal onClose={() => setIsPermissionsOpen(false)} />
        )}

        {/* كارت المعاينة التفصيلي للسجلات المحذوفة */}
        {selectedRecordDetails && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in select-none">
            <div className="bg-[#020B1C] border border-[#D4AF37]/50 rounded-3xl p-6 md:p-8 w-full max-w-xl shadow-2xl relative space-y-4 text-right text-white">
              <div className="flex justify-between items-center border-b border-[#D4AF37]/20 pb-3">
                {/* تعديل لون العنوان للون البني البرونزي المعتمد */}
                <h3 className="text-[#A17A4C] font-black text-sm flex items-center gap-1.5">
                  🔎 تفاصيل السجل المحذوف رقابياً ومعاينته
                </h3>
                <button 
                  onClick={() => setSelectedRecordDetails(null)}
                  className="text-gray-400 hover:text-rose-500 font-bold text-sm cursor-pointer transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-2 gap-4 bg-[#07132a] p-4 rounded-xl border border-[#D4AF37]/10">
                  <div>
                    <span className="text-gray-500 block text-[10px]">من قام بالحذف:</span>
                    <span className="font-bold text-[#D4AF37]">{selectedRecordDetails.deleted_by_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">تاريخ وعام الحذف:</span>
                    <span className="font-mono">{new Date(selectedRecordDetails.created_at).toLocaleDateString("ar-EG")}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500 block text-[10px]">الجدول المحذوف منه:</span>
                    <span className="font-bold text-red-400 font-mono">{selectedRecordDetails.table_name === "customers" ? "العملاء والـ CRM" : "مكتبة البنود"}</span>
                  </div>
                </div>

                <div className="bg-black p-4 rounded-xl max-h-56 overflow-y-auto border border-[#D4AF37]/15">
                  <span className="text-gray-500 block mb-2 text-[10px]">البيانات الفنية السابقة للسجل المحذوف:</span>
                  <pre className="text-emerald-400 font-mono text-[10px] whitespace-pre-wrap leading-relaxed font-bold">
                    {JSON.stringify(selectedRecordDetails.deleted_data, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#D4AF37]/20">
                <button
                  onClick={() => handleRestoreRecord(selectedRecordDetails)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs cursor-pointer transition"
                >
                  🔄 استعادة السجل وإلغاء الحذف فوراً
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}