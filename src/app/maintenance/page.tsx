"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";
import { isOnline, addToOfflineQueue } from "@/lib/offline-sync";
import { Wrench, Lock, Check, CheckCircle2, Layers, HardHat, Truck, FileText, Volume2, Loader2 } from "lucide-react"; 

interface MaintenanceTicket {
  id: string;
  project_id: string;
  customer_id: string;
  issue_description: string;
  priority: "low" | "medium" | "urgent";
  status: "pending" | "scheduled" | "resolved" | "closed";
  assigned_to: string;
  execution_date: string;
  created_at: string;
  projects?: { project_name: string };
  customers?: { name: string; mobile: string };
  users?: { name: string };
}

export default function MaintenancePage() {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // حقول نموذج إصدار تذكرة صيانة جديدة للضمان
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "urgent">("medium");
  const [status, setStatus] = useState<"pending" | "scheduled" | "resolved" | "closed">("pending");
  const [assignedTo, setAssignedTo] = useState("");
  const [executionDate, setExecutionDate] = useState("");

  useEffect(() => {
    document.title = "تذاكر الضمان والصيانة | Golden Decoration";
    loadMaintenanceData();
  }, []);

  async function loadMaintenanceData() {
    setLoading(true);
    try {
      const { data: ticketData, error: ticketError } = await supabase
        .from("maintenance_tickets")
        .select(`
          *,
          projects (project_name, customer_id),
          customers (name, mobile)
        `)
        .order("created_at", { ascending: false });

      if (ticketError) throw ticketError;

      const { data: projData } = await supabase
        .from("projects")
        .select("id, project_name, customer_id");
      setProjects(projData || []);

      const { data: staffData } = await supabase
        .from("users")
        .select("id, name, role");

      const filteredEngineers = (staffData || []).filter(u => 
        ["admin", "procurement", "engineer"].includes(u.role?.toLowerCase() || "")
      );
      setEngineers(filteredEngineers);

      const mappedTickets = (ticketData || []).map((t: any) => {
        const staff = (staffData || []).find((u: any) => u.id === t.assigned_to);
        return {
          ...t,
          users: staff ? { name: staff.name } : null
        };
      });

      setTickets(mappedTickets);

    } catch (err: any) {
      console.error("Error loading maintenance data:", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTicket() {
    if (!selectedProjectId || !issueDescription) {
      alert("الرجاء تحديد المشروع السكني وكتابة وصف العيب الفني بالتفصيل لحفظ تذكرة الضمان.");
      return;
    }

    const matchedProj = projects.find(p => p.id === selectedProjectId);
    if (!matchedProj) {
      alert("خطأ: فشل تحديد بيانات المشروع والعميل المربوط به.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        project_id: selectedProjectId,
        customer_id: matchedProj.customer_id,
        issue_description: issueDescription,
        priority: priority,
        status: status,
        assigned_to: assignedTo || null,
        execution_date: executionDate || null
      };

      if (isOnline()) {
        const { error } = await supabase
          .from("maintenance_tickets")
          .insert([payload]);

        if (error) throw error;

        const matchedEng = engineers.find(e => e.id === assignedTo);
        await supabase.from("notifications").insert({
          title: "إسناد تذكرة صيانة وضمان",
          message: `🛠️ تم إسناد تذكرة صيانة عاجلة بمستوى أولوية (${priority === "urgent" ? "طارئة للغاية 🚨" : "متوسطة"}) لموقع (${matchedProj.project_name}) والمهندس المتابع (${matchedEng?.name || "القسم الهندسي"}) وتاريخ التنفيذ المتوقع (${executionDate || "قيد التحديد"}).`,
          type: "tasks",
          link: "/maintenance"
        });

        alert("✅ تم تسجيل تذكرة صيانة الضمان وإرسال الإشعار الهندسي بنجاح!");
      } else {
        addToOfflineQueue("maintenance_tickets", "INSERT", payload);
        alert("⚠️ تم تسجيل التذكرة محلياً لعدم توفر إنترنت؛ وسيتم نقلها وإخطار المهندس تلقائياً فور توفر الشبكة.");
      }

      setSelectedProjectId("");
      setIssueDescription("");
      setPriority("medium");
      setStatus("pending");
      setAssignedTo("");
      setExecutionDate("");

      await loadMaintenanceData();
    } catch (err: any) {
      alert("حدث خطأ أثناء فتح التذكرة: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    // 🌟 حل المشكلة: إرجاع وسم التوجيه dir="rtl" وموازاة الـ flex إلى الـ main الرئيسي لضمان ثبات السايدبار الأيمن
    <main className="min-h-screen flex bg-[#020B1C] relative overflow-hidden font-alexandria" dir="rtl">
      <Sidebar />
      
      {/* 🛠️ جدار الحماية البصري الموحد وتنسيق شريط التمرير مذهب الألوان بسمك 6px لمنع التداخل والقص كلياً */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* تفعيل وإظهار شريط التمرير الأفقي والرأسي بكافة الجداول بألوان ذهبية فاخرة */
        ::-webkit-scrollbar { 
          width: 6px !important; 
          height: 6px !important; 
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

        /* عزل تلوين وأوزان خلايا جدول تذاكر الضمان ومنع تسريب الـ CSS للسايدبار */
        .premium-maintenance-table thead th {
          font-size: 0.75rem !important;
          font-weight: 500 !important;
          color: #D4AF37 !important;
          text-align: right !important;
          background-color: #020B1C !important;
          border-bottom: 2px solid rgba(212, 175, 55, 0.3) !important;
          padding: 14px 16px !important;
          letter-spacing: normal !important;
        }

        .premium-maintenance-table tbody td {
          font-size: 0.8rem !important;
          font-weight: 400 !important;
          text-align: right !important;
          border-bottom: 1px solid rgba(212, 175, 55, 0.1) !important;
          padding: 14px 16px !important;
          letter-spacing: normal !important;
        }

        .premium-maintenance-table tbody tr:hover {
          background-color: rgba(7, 19, 42, 0.8) !important;
        }
      `}} />

      <section className="flex-1 flex flex-col lg:pr-56 m-0 min-h-screen">
        <Header />
        
        <div className="p-4 md:p-8 space-y-6 text-right select-none animate-fade-in">
          
          <div className="border-b border-[#D4AF37]/20 pb-5">
            <h1 className="text-xl md:text-2xl font-black text-[#D4AF37] flex items-center gap-2">
              <span> الضمان وصيانة ما بعد التسليم</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-pulse" />
            </h1>
            <p className="text-white text-xs mt-2">تسجيل وتوزيع الصيانة للعملاء تحت فترة الضمان والرقابة الهندسية على كفاءة أعمال التشطيب.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* كارت حجز التذكرة الجديدة المطور بالمقياس الإمبراطوري المتين بكسلياً */}
            <div className="bg-[#07132a] border-2 border-[#D4AF37] rounded-[2rem] p-6 space-y-5 h-fit shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
              
              <h3 className="text-[#D4AF37] font-bold text-md md:text-sm border-b border-[#D4AF37]/ pb-3 flex items-center gap-2 select-none">
                <span>➕</span> تسجيل بيان صيانة وضمان جديدة
              </h3>
              
              <div className="space-y-4 text-xs font-semibold text-slate-300">
                
                <div>
                  <label className="block text-[#D4AF37] mb-1.5 font-bold px-2 text-[12px]">المشروع السكني المستهدف *</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#F0E6D2] px-3 text-xs outline-none cursor-pointer focus:border-[#D4AF37]"
                  >
                    <option value="">-- اختر موقع الشقة المسلمة --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.project_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#D4AF37] mb-1.5 font-bold px-2 text-[12px]">الأولوية ودرجة الخطورة الفنية *</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] font-bold px-3 text-xs outline-none cursor-pointer focus:border-[#D4AF37]"
                  >
                    <option value="low">منخفضة (لا توجد أضرار تعوق السكن)</option>
                    <option value="medium">متوسطة (شروخ خفيفة بالدهانات)</option>
                    <option value="urgent">عاجلة طارئة 🚨 (تسريب مياه أو انقطع كلي للكهرباء)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#D4AF37] mb-1.5 font-bold px-2 text-[12px]">تفاصيل ووصف المشكلة بالتفصيل *</label>
                  <textarea
                    placeholder="اكتب تفاصيل المشكلة ومسار العطل ومكانه بالوحدة لسهولة فحص المهندس..."
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    rows={4}
                    className="w-full h-24 bg-[#020B1C] border border-[#D4AF37]/20 text-white p-3.5 rounded-xl outline-none focus:border-[#D4AF37] resize-none font-medium text-xs leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[#D4AF37] mb-1.5 font-bold px-2 px-2 text-[12px]">إسناد وتكليف المهندس</label>
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#F0E6D2] font-bold px-3 text-xs outline-none cursor-pointer focus:border-[#D4AF37]"
                    >
                      <option value="">-- اختر مهندس الصيانة --</option>
                      {engineers.map((eng) => (
                        <option key={eng.id} value={eng.id}>{eng.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#D4AF37] mb-1.5 font-bold px-2 text-[12px]">تاريخ المعاينة / الإصلاح</label>
                    <input
                      type="date"
                      value={executionDate}
                      onChange={(e) => setExecutionDate(e.target.value)}
                      className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] font-bold px-4 outline-none font-mono focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#D4AF37] mb-1.5 font-bold px-2 text-[12px]">الوضعية الحالية للتذكرة *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] font-bold px-3 text-xs outline-none cursor-pointer focus:border-[#D4AF37]"
                  >
                    <option value="pending">قيد الانتظار والمعاينة</option>
                    <option value="scheduled">مجدولة للزيارة والإصلاح</option>
                    <option value="resolved">تم الإصلاح والمعالجة الفنية</option>
                    <option value="closed">تذكرة مغلقة نهائياً</option>
                  </select>
                </div>

                {/* 🌟 ترقية زر فتح التذكرة للنسق المستطيل الفخم المعتمد لتوحيد حركات وأفعال المنصة كلياً بـ عاكس الإضاءة السفلي */}
                <button
                  type="button" 
                  onClick={(e) => { e.preventDefault(); handleCreateTicket(); }}
                  disabled={saving}
                  className="px-6 h-11 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.01] active:scale-95 transition-all duration-300 text-xs font-black flex items-center justify-center gap-1.5 select-none relative overflow-hidden disabled:opacity-40 cursor-pointer w-full"
                >
                  {saving ? <Loader2 className="animate-spin w-4 h-4 text-[#D4AF37]" /> : <Wrench className="w-4 h-4 text-[#D4AF37]" />}
                  <span>{saving ? "جاري فتح التذكرة..." : "فتح تذكرة صيانة معتمدة"}</span>
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#07132a] border-2 border-[#D4AF37] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col relative w-full">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
                <div className="p-4 border-b border-[#D4AF37] bg-[#0b1b3d]/60 select-none">
                  <h3 className="text-[#D4AF37] font-bold text-ms md:text-sm">سجل طلبات وتذاكر الضمان المفتوحة والنشطة ({tickets.length})</h3>
                </div>
                
                {/* تفعيل التمرير مذهب الألوان وحماية الجدول من التقاطع بـ whitespace-nowrap و min-w-[850px] بالكامل */}
                <div className="overflow-x-auto max-h-[550px] overflow-y-auto ai-chat-scroll">
                  {loading ? (
                    <div className="p-12 text-center text-[#D4AF37] animate-pulse text-xs font-bold">جاري جلب أرشيف تذاكر الضمان...</div>
                  ) : tickets.length > 0 ? (
                    <table className="w-full text-right table-auto min-w-[850px] premium-maintenance-table">
                      <thead>
                        <tr className="whitespace-nowrap select-none">
                          <th>التاريخ</th>
                          <th>موقع الشقة</th>
                          <th>العميل وهاتفه</th>
                          <th>تفاصيل العيب الفني</th>
                          <th>المهندس المسند</th>
                          <th className="text-center">درجة الخطورة</th>
                          <th className="text-center">الوضعية الجارية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1f2d4d]/60 text-xs md:text-sm text-slate-100 font-semibold">
                        {tickets.map((t) => {
                          const isHighPriority = t.priority === "urgent";
                          const isCompleted = t.status === "resolved" || t.status === "closed";
                          return (
                            <tr key={t.id} className="whitespace-nowrap">
                              <td className="p-4 font-mono text-gray-400">{new Date(t.created_at).toLocaleDateString("ar-EG")}</td>
                              <td className="p-4 font-black text-white">{t.projects?.project_name || "موقع ممسوح"}</td>
                              <td className="p-4">
                                <p className="font-bold text-white">{t.customers?.name || "عميل ممسوح"}</p>
                                <p className="font-mono text-gray-400 text-xs mt-0.5">{t.customers?.mobile || "-"}</p>
                              </td>
                              <td className="p-4 text-gray-200 max-w-xs truncate" title={t.issue_description}>{t.issue_description}</td>
                              <td className="p-4 text-[#D4AF37] font-bold">{t.users?.name || "غير مسند بعد"}</td>
                              <td className="p-4 text-center">
                                <span className={`px-2.5 py-1 rounded text-xs font-black ${
                                  isHighPriority ? "bg-red-500/10 text-red-400 animate-pulse border border-red-500/20" : t.priority === "medium" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-gray-500/10 text-gray-400 border border-gray-500/10"
                                }`}>
                                  {t.priority === "urgent" ? "عاجلة طارئة 🚨" : t.priority === "medium" ? "متوسطة" : "منخفضة"}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <span className={`px-3 py-1.5 rounded text-xs font-black ${
                                  isCompleted ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse" : "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse"
                                }`}>
                                  {t.status === "pending" && "تحت المعاينة"}
                                  {t.status === "scheduled" && "مجدولة للإصلاح"}
                                  {t.status === "resolved" && "تم المعالجة"}
                                  {t.status === "closed" && "تذكرة مغلقة"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-12 text-center text-gray-500 text-sm">لا توجد بلاغات أو تذاكر صيانة وضمان مفتوحة حالياً بالمنظومة.</div>
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