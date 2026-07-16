"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";
import { isOnline, addToOfflineQueue } from "@/lib/offline-sync";
import { Plus, Minus, Calendar, Users, Clipboard, Info, CheckCircle2, Lock } from "lucide-react";

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
        classes: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
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
    <main className="min-h-screen bg-[#020B1C] relative overflow-hidden">
      <Sidebar />
      
      {/* 🌟 شفرات شريط التمرير الملكية v2.8.0 المحدثة لدعم أزرار التحكم والأسهم المخصصة يدوياً */}
      <style dangerouslySetInnerHTML={{ __html: `
        ::-webkit-scrollbar {
          width: 8px !important;
          height: 8px !important;
        }
        ::-webkit-scrollbar-track {
          background: #020B1C !important;
        }
        ::-webkit-scrollbar-thumb {
          background: #D4AF37 !important;
          border-radius: 9999px !important;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #C9A45D !important;
        }

        /* تلوين أزرار أسهم الصعود والهبوط يدوياً لضمان الفاعلية والتحكم بجداول المواعيد الممتدة */
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

        .overflow-y-auto {
          scrollbar-width: thin !important;
          scrollbar-color: #D4AF37 #020B1C !important;
        }
        
        .royal-gradient-btn {
          background: linear-gradient(90deg, #C9A45D 0%, #F0E6D2 50%, #D4AF37 100%) !important;
          color: #020B1C !important;
          font-weight: 900 !important;
          border: 1px solid #D4AF37 !important;
          box-shadow: 0 0 15px rgba(212, 175, 55, 0.2) !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .royal-gradient-btn:hover {
          transform: scale(1.02) !important;
          box-shadow: 0 0 25px rgba(212, 175, 55, 0.45) !important;
          cursor: pointer !important;
        }
      `}} />

      {/* تفعيل جدار حماية وعزل الإزاحة الجانبية الميدانية */}
      <section dir="rtl" className="w-full lg:pr-56 m-0 min-h-screen flex flex-col">
        <Header />
        <div className="p-4 md:p-8 space-y-6 text-right animate-fade-in">
          
          <div>
            {/* 🌟 تقليص حجم العنوان لتفادي التداخل ليكون متوافقاً مع الدستور الجمالي الموحد */}
            <h1 className="text-xl md:text-2xl font-black text-[#D4AF37]">إدارة الموظفين والعملاء</h1>
            {/* 🌟 تعديل لون الشرح أسفل العنوان للأبيض الصافي لتعزيز التباين البصري */}
            <p className="text-white text-xs md:text-sm mt-2">جدولة اللقاءات والمعاينات الميدانية ومنع التضارب وتنظيم أوقات الاجتماعات.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* بطاقة حجز الموعد الجديد - مع تعديل الإطار للخلفية شبه الشفافة الموحدة */}
            <div className="bg-[#07132a] border border-[#D4AF37] rounded-2xl p-6 space-y-5 h-fit shadow-xl">
              {/* 🌟 تحويل عنوان الترويسة للون البني البرونزي المعتمد `#A17A4C` */}
              <h3 className="text-[#D4AF37] font-black text-xs md:text-sm border-b border-[#D4AF37] pb-3 flex items-center gap-2 select-none">
                <span>➕</span> حجز موعد / معاينة جديدة
              </h3>
              
              <div className="space-y-4 text-xs md:text-sm font-semibold">
                <div>
                  <label className="block text-[#D4AF37] mb-1 font-bold text-[10px]">موضوع ومسمى الموعد *</label>
                  <input
                    type="text"
                    placeholder="مثال: معاينة شقة حدائق الأهرام"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-white px-4 outline-none text-xs font-bold focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder-slate-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#D4AF37] mb-1 text-[10px]">نوع ومكان اللقاء *</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full h-11 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-[#F0E6D2] px-3 outline-none cursor-pointer text-xs font-bold focus:border-[#D4AF37]"
                    >
                      <option value="site_visit">🏗️ معاينة موقع العمل (ساعتان)</option>
                      <option value="client_meeting">🤝 مقابلة عميل بالشركة (ساعة ونصف)</option>
                      <option value="internal_meeting">💼 اجتماع إدارة داخلي (ساعة)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#D4AF37] mb-1 text-[10px]">المضيف (المهندس) *</label>
                    <select
                      value={hostId}
                      onChange={(e) => setHostId(e.target.value)}
                      className="w-full h-11 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] font-black px-3 outline-none cursor-pointer text-xs focus:border-[#D4AF37]"
                    >
                      <option value="">-- اختر الموظف --</option>
                      {hosts.map(h => (
                        <option key={h.id} value={h.id}>{h.name} ({roleLabels[h.role] || h.role})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[#D4AF37] mb-1 font-bold text-[10px]">المشارك باللقاء (العميل - اختياري)</label>
                  <select
                    value={participantId}
                    onChange={(e) => setParticipantId(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-white px-3 outline-none text-xs font-bold cursor-pointer focus:border-[#D4AF37]"
                  >
                    <option value="">-- عام (بدون عميل محدد) --</option>
                    {participants.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#D4AF37] mb-1 text-[10px]">تاريخ ووقت بدء الموعد *</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] font-black px-4 outline-none font-mono text-xs focus:border-[#D4AF37]"
                  />
                </div>

                {conflictWarning && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs font-bold text-center animate-pulse select-none">
                    {conflictWarning}
                  </div>
                )}

                <div>
                  <label className="block text-[#D4AF37] mb-1 font-bold text-[10px]">أجندة الاجتماع وتفاصيل إضافية</label>
                  <textarea
                    placeholder="ملاحظات وتفاصيل التشوين بالموقع..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full h-20 bg-[#020B1C] border border-[#1f2d4d] text-slate-200 p-3 rounded-xl outline-none text-xs font-bold focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder-slate-600 resize-none"
                  />
                </div>

                <button
                  onClick={handleCreateAppointment}
                  disabled={saving || !!conflictWarning}
                  className="w-full h-11 royal-gradient-btn text-[#020B1C] font-black rounded-full text-xs cursor-pointer transition-all duration-300 flex items-center justify-center gap-2"
                >
                  {saving ? "جاري حجز الموعد..." : "💾 جدولة وحفظ الموعد المعتمد"}
                </button>
              </div>
            </div>

            {/* سجل المواعيد واللقاءات القائمة */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#07132a] border border-[#D4AF37] rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-[#D4AF37] bg-[#0b1b3d]/60 select-none">
                  {/* 🌟 تحويل عنوان ترويسة سجل المواعيد للون البني البرونزي المعتمد `#A17A4C` */}
                  <h3 className="text-[#D4AF37] font-black text-xs md:text-sm">سجل المواعيد واللقاءات القائمة والمجدولة ({appointments.length})</h3>
                </div>
                
                {/* تفعيل شريط التمرير الملكي بقنوات التنقل الذاتي والأسهم المحددة */}
                <div className="overflow-x-auto max-h-[550px] overflow-y-auto ai-chat-scroll">
                  {loading ? (
                    <div className="p-12 text-center text-slate-400 text-xs animate-pulse font-bold">جاري جلب سجل المواعيد...</div>
                  ) : appointments.length > 0 ? (
                    <table className="w-full text-right text-xs text-[#F0E6D2] min-w-[650px] font-semibold">
                      <thead className="bg-[#0b1d3d] text-[#D4AF37] sticky top-0 z-10 text-xs font-black border-b border-[#1f2d4d]/60 select-none">
                        <tr>
                          <th className="p-4 whitespace-nowrap">تاريخ الموعد</th>
                          <th className="p-4 whitespace-nowrap">التوقيت والمدة</th>
                          <th className="p-4 whitespace-nowrap">اسم اللقاء</th>
                          <th className="p-4 whitespace-nowrap">المستضيف بالشركة</th>
                          <th className="p-4 whitespace-nowrap">العميل المشارك</th>
                          <th className="p-4 text-center whitespace-nowrap">الوضعية والنشاط</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1f2d4d]/60">
                        {appointments.map((app) => {
                          // استخراج بيانات الحالة من الميثود المحوسبة تلقائياً حياً
                          const dynamicStatus = getDynamicAppointmentStatus(app);
                          return (
                            <tr key={app.id} className="hover:bg-[#020B1C]/50 transition duration-150 cursor-pointer whitespace-nowrap">
                              <td className="p-4 font-mono text-[#D4AF37] font-black">{new Date(app.start_time).toLocaleDateString("ar-EG")}</td>
                              <td className="p-4 font-mono text-slate-200 font-bold">
                                {new Date(app.start_time).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}
                                {" ⬅️ "}
                                {new Date(app.end_time).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}
                              </td>
                              <td className="p-4 font-black text-[#F0E6D2]">{app.title}</td>
                              <td className="p-4 text-slate-300 font-bold">{app.users?.name || "موظف ممسوح"}</td>
                              <td className="p-4 text-slate-300 font-bold">{app.customers?.name || "عام / بدون عميل"}</td>
                              <td className="p-4 text-center">
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