"use client";

import { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";
import { isOnline, addToOfflineQueue } from "@/lib/offline-sync";
import { Plus, Minus, Calendar, Users, Clipboard, Info, CheckCircle2, Lock, Loader2 } from "lucide-react";

interface Appointment {
  id: string;
  title: string;
  description: string;
  appointment_type: string;
  host_id: string;
  participant_id: string;
  start_time: string;
  end_time: string;
  status: "scheduled" | "completed" | "cancelled";
  created_at: string;
  users?: { name: string; role: string };
  customers?: { name: string };
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

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [hosts, setHosts] = useState<any[]>([]); 
  const [participants, setParticipants] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("site_visit"); 
  const [hostId, setHostId] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [startTime, setStartTime] = useState("");
  
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // تعريف حالة الوقت الحالي المعتمدة هندسياً لتجنب أخطاء TypeScript ومشاكل تباين الرندر
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    document.title = "Golden Decoration ERP - جدول المواعيد واللقاءات";
    loadInitialData();

    // تحديث التوقيت الحالي برمجياً بالخلفية كل دقيقة لضمان حوسبة دقيقة للمواعيد
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!startTime || !hostId) {
      setConflictWarning(null);
      return;
    }
    checkAppointmentConflict();
  }, [startTime, hostId, type]);

  async function loadInitialData() {
    setLoading(true);
    try {
      const { data: appData, error: appError } = await supabase
        .from("appointments")
        .select(`
          *,
          users:host_id (name, role),
          customers:participant_id (name)
        `)
        .order("start_time", { ascending: true });

      if (appError) throw appError;
      setAppointments(appData || []);

      const { data: staffData } = await supabase
        .from("users")
        .select("id, name, role")
        .neq("role", "client")
        .order("name", { ascending: true });
      setHosts(staffData || []);

      const { data: custData } = await supabase
        .from("customers")
        .select("id, name")
        .order("name", { ascending: true });
      setParticipants(custData || []);

    } catch (err: any) {
      console.error("Error loading appointments:", err.message);
    } finally {
      document.title = "جدول المواعيد واللقاءات | Golden Decoration";
      setLoading(false);
    }
  }

  async function checkAppointmentConflict() {
    let durationMinutes = 60;
    if (type === "site_visit") durationMinutes = 120; 
    if (type === "internal_meeting") durationMinutes = 60; 
    if (type === "client_meeting") durationMinutes = 90; 

    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("title, start_time, end_time")
        .eq("status", "scheduled")
        .eq("host_id", hostId)
        .lt("start_time", end.toISOString())
        .gt("end_time", start.toISOString());

      if (!error && data && data.length > 0) {
        setConflictWarning(`🔴 تنبيه تداخل: هذا الموظف مشغول في هذا الوقت بموعد آخر: (${data[0].title})`);
      } else {
        setConflictWarning(null);
      }
    } catch (e) {
      console.error("Conflict checking failure:", e);
    }
  }

  async function handleAddProjectNotification(projectName: string, formattedDateTime: string) {
    try {
      await supabase.from("notifications").insert({
        title: "حجز موعد ومهمة جديدة",
        message: `📅 تم جدولة موعد جديد بالمنظومة: (${projectName}) وتكليف الطاقم الميداني بالاستعداد والتحرك بالموقع بتاريخ (${formattedSpeed(formattedSpecsDate(startTime))}).`,
        type: "site_visit",
        link: "/appointments"
      });
    } catch (e) {
      console.error("Notification trigger failure:", e);
    }
  }

  function formattedSpecsDate(dateStr: string) {
    if (!dateStr) return "";
    return new Date(dateStr);
  }

  function formattedSpeed(d: Date | string) {
    if (!d) return "";
    const dateObj = typeof d === "string" ? new Date(d) : d;
    return dateObj.toLocaleString("ar-EG", { hour: "numeric", minute: "2-digit", day: "numeric", month: "long" });
  }

  async function handleCreateAppointment() {
    if (!title || !hostId || !startTime) {
      alert("الرجاء إدخال اسم اللقاء، تحديد الموظف، ووقت بدء الموعد.");
      return;
    }

    if (conflictWarning) {
      alert("خطأ: لا يمكن حفظ الاجتماع لوجود تضارب نشط في مواعيد الموظف.");
      return;
    }

    setSaving(true);

    let durationMinutes = 60;
    if (type === "site_visit") durationMinutes = 120;
    if (type === "internal_meeting") durationMinutes = 60;
    if (type === "client_meeting") durationMinutes = 90;

    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    const payload = {
      title,
      description: description || null,
      appointment_type: type,
      host_id: hostId,
      participant_id: participantId || null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: "scheduled"
    };

    try {
      if (isOnline()) {
        const { error } = await supabase
          .from("appointments")
          .insert([payload]);

        if (error) throw error;
        
        await handleAddProjectNotification(title, startTime);
        
        alert("✅ تم جدولة وحجز الموعد بنجاح، وحفظ المهمة والتنبيه للموظف تلقائياً!");
      } else {
        addToOfflineQueue("appointments", "INSERT", payload);
        alert("⚠️ تم حفظ الموعد محلياً؛ سيتم المزامنة وتوليد التنبيهات والمهام فور عودة الاتصال.");
      }

      setTitle("");
      setDescription("");
      setHostId("");
      setParticipantId("");
      setStartTime("");
      setConflictWarning(null);

      await loadInitialData();
    } catch (err: any) {
      alert("حدث خطأ أثناء حجز الموعد: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // ميثود ديناميكية صارمة لحساب وتوليد الوضعية البصرية واللفظية للمواعيد والاجتماعات السابقة
  function getDynamicAppointmentStatus(app: Appointment) {
    if (app.status === "cancelled") {
      return {
        label: "ملغى ❌",
        classes: "bg-rose-500/10 text-rose-400 border border-rose-500/20"
      };
    }

    const appEnd = new Date(app.end_time);
    const isPast = appEnd < currentTime;

    if (app.status === "completed" || isPast) {
      const label = app.appointment_type === "site_visit" ? "معاينة سابقة 🏗️" : "اجتماع سابق 🤝";
      return {
        label,
        classes: "bg-emerald-500/10 text-[#34d399] border border-emerald-500/20"
      };
    }

    // الحالة مجدول ونشط
    const label = app.appointment_type === "site_visit" ? "معاينة نشطة 🏗️" : "اجتماع نشط 🤝";
    return {
      label,
      classes: "bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse"
    };
  }

  return (
    <main className="min-h-screen flex bg-[#020B1C] relative overflow-hidden font-alexandria" dir="rtl">
      <Sidebar />
      
      {/* 🛠️ جدار الحماية البصري الموحد وتنسيق شريط التمرير المذهب ومنع التداخل نهائياً */}
      <style dangerouslySetInnerHTML={{ __html: `
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

        /* عزل تلوين وأوزان خلايا جدول المواعيد ومنع تسريب الـ CSS للسايدبار وهيدر المنظومة */
        .premium-appointments-table thead th {
          font-size: 0.75rem !important;
          font-weight: 500 !important;
          color: #D4AF37 !important;
          text-align: right !important;
          background-color: #020B1C !important;
          border-bottom: 2px solid rgba(212, 175, 55, 0.3) !important;
          padding: 14px 16px !important;
          letter-spacing: normal !important;
        }

        .premium-appointments-table tbody td {
          font-size: 0.8rem !important;
          font-weight: 400 !important;
          text-align: right !important;
          border-bottom: 1px solid rgba(212, 175, 55, 0.1) !important;
          padding: 14px 16px !important;
          letter-spacing: normal !important;
        }

        .premium-appointments-table tbody tr:hover {
          background-color: rgba(7, 19, 42, 0.8) !important;
        }
      `}} />

      {/* تفعيل جدار حماية وعزل الإزاحة الجانبية الميدانية */}
      <section className="flex-1 flex flex-col lg:pr-56 m-0 min-h-screen">
        <Header />
        <div className="p-4 md:p-8 space-y-6 text-right select-none animate-fade-in">
          
          <div>
            <h1 className="text-xl md:text-2xl font-black text-[#D4AF37] flex items-center gap-2 select-none">
              <span>إدارة وجدولة المواعيد واللقاءات</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-pulse" />
            </h1>
            <p className="text-white text-xs mt-2">جدولة اللقاءات والمعاينات الميدانية ومنع التضارب وتنظيم أوقات الاجتماعات.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* كارت حجز الموعد الجديد المطور بالمقياس الإمبراطوري المتين بكسلياً */}
            <div className="bg-[#07132a] border-2 border-[#D4AF37] rounded-[2rem] p-6 space-y-5 h-fit shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />

              <h3 className="text-[#D4AF37] font-bold text-xs md:text-sm border-b border-[#D4AF37] pb-3 flex items-center gap-2 select-none">
                <span>➕</span> حجز موعد / معاينة جديدة
              </h3>
              
              <div className="space-y-4 text-xs md:text-sm font-semibold">
                <div>
                  <label className="block text-[#D4AF37] mb-1.5 font-bold px-2 text-[12px]">موضوع ومسمى الموعد *</label>
                  <input
                    type="text"
                    placeholder="مثال: معاينة شقة حدائق الأهرام"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#F0E6D2] px-4 outline-none text-xs font-semibold focus:border-[#D4AF37] transition-all placeholder-slate-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#D4AF37] mb-1.5 px-2 text-[11px]">نوع ومكان اللقاء *</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] px-3 outline-none cursor-pointer text-xs font-bold focus:border-[#D4AF37]"
                    >
                      <option value="site_visit">🏗️ معاينة موقع العمل (ساعتان)</option>
                      <option value="client_meeting">🤝 مقابلة عميل بالشركة (ساعة ونصف)</option>
                      <option value="internal_meeting">💼 اجتماع إدارة داخلي (ساعة)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#D4AF37] mb-1.5 text-[11px]">المضيف (المهندس) *</label>
                    <select
                      value={hostId}
                      onChange={(e) => setHostId(e.target.value)}
                      className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] font-black px-3 outline-none cursor-pointer text-xs focus:border-[#D4AF37]"
                    >
                      <option value="">-- اختر الموظف --</option>
                      {hosts.map(h => (
                        <option key={h.id} value={h.id}>{h.name} ({roleLabels[h.role] || h.role})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[#D4AF37] mb-1.5 font-bold px-2 text-[12px]">المشارك باللقاء (العميل - اختياري)</label>
                  <select
                    value={participantId}
                    onChange={(e) => setParticipantId(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-3 outline-none text-xs font-bold cursor-pointer focus:border-[#D4AF37]"
                  >
                    <option value="">-- عام (بدون عميل محدد) --</option>
                    {participants.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#D4AF37] mb-1.5 px-2 text-[12px]">تاريخ ووقت بدء الموعد *</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] font-black px-4 outline-none font-mono text-xs focus:border-[#D4AF37] animate-transition"
                  />
                </div>

                {conflictWarning && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs font-bold text-center animate-pulse select-none">
                    {conflictWarning}
                  </div>
                )}

                <div>
                  <label className="block text-[#D4AF37] mb-1.5 font-bold px-2 text-[12px]">أجندة الاجتماع وتفاصيل إضافية</label>
                  <textarea
                    placeholder="ملاحظات وتفاصيل التشوين بالموقع..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full h-20 bg-[#020B1C] border border-[#D4AF37]/20 text-slate-200 p-3 rounded-xl outline-none text-xs font-bold focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder-slate-600 resize-none"
                  />
                </div>

                {/* 🌟 ترقية زر جدولة المواعيد للنسق المستطيل الفخم المعتمد لتوحيد حركات وأفعال المنصة كلياً */}
                <button
                  type="button" 
                  onClick={(e) => { e.preventDefault(); handleCreateAppointment(); }}
                  disabled={saving || !!conflictWarning}
                  className="w-full px-6 py-3.5 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.01] active:scale-95 transition-all duration-300 text-xs font-bold flex items-center justify-center gap-1.5 select-none relative overflow-hidden disabled:opacity-40 cursor-pointer"
                >
                  {saving ? <Loader2 className="animate-spin w-4 h-4 text-[#D4AF37]" /> : <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />}
                  <span>{saving ? "جاري حجز الموعد..." : "💾 جدولة وحفظ الموعد المعتمد"}</span>
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
                </button>
              </div>
            </div>

            {/* سجل المواعيد واللقاءات القائمة */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#07132a] border-2 border-[#D4AF37] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col relative w-full">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#D4AF37] to-transparent opacity-40" />
                <div className="p-4 border-b border-[#D4AF37]/20 bg-[#0b1b3d]/60 select-none">
                  <h3 className="text-[#D4AF37] font-black text-xs md:text-sm">سجل المواعيد واللقاءات القائمة والمجدولة ({appointments.length})</h3>
                </div>
                
                {/* تفعيل التمرير مذهب الألوان وحماية الجدول من التقاطع بـ whitespace-nowrap و min-w-[850px] بالكامل */}
                <div className="overflow-x-auto max-h-[550px] overflow-y-auto ai-chat-scroll">
                  {loading ? (
                    <div className="p-12 text-center text-[#D4AF37] animate-pulse text-xs font-bold">جاري جلب سجل المواعيد...</div>
                  ) : appointments.length > 0 ? (
                    <table className="w-full text-right table-auto min-w-[850px] premium-appointments-table">
                      <thead>
                        <tr className="whitespace-nowrap select-none">
                          <th>تاريخ الموعد</th>
                          <th>التوقيت والمدة</th>
                          <th>اسم اللقاء</th>
                          <th>المستضيف بالشركة</th>
                          <th>العميل المشارك</th>
                          <th className="text-center">الوضعية والنشاط</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1f2d4d]/60 text-xs md:text-sm text-slate-100 font-semibold">
                        {appointments.map((app) => {
                          const dynamicStatus = getDynamicAppointmentStatus(app);
                          return (
                            <tr key={app.id} className="whitespace-nowrap">
                              <td className="font-mono text-[#D4AF37] font-black">{new Date(app.start_time).toLocaleDateString("ar-EG")}</td>
                              <td className="font-mono text-slate-200">
                                {new Date(app.start_time).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}
                                {" ⬅️ "}
                                {new Date(app.end_time).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}
                              </td>
                              <td className="font-black text-[#F0E6D2]">{app.title}</td>
                              <td className="text-slate-300 font-bold">{app.users?.name || "موظف ممسوح"}</td>
                              <td className="text-slate-300 font-bold">{app.customers?.name || "عام / بدون عميل"}</td>
                              <td className="text-center">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black ${dynamicStatus.classes}`}>
                                  {dynamicStatus.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-12 text-center text-slate-500 text-xs">لا توجد مواعيد قائمة أو مجدولة بالمنظومة.</div>
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