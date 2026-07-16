"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";
import { isOnline, addToOfflineQueue } from "@/lib/offline-sync";
import { Wrench, Lock, Check, CheckCircle2, Layers, HardHat, Truck, FileText, Volume2 } from "lucide-react"; 

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
    // 🌟 حل المشكلة: إرجاع وسم التوجيه dir="rtl" إلى الـ main الرئيسي لضمان ثبات السايدبار الأيمن
    <main className="min-h-screen bg-[#020B1C] relative overflow-hidden" dir="rtl">
      <Sidebar />
      
      <style dangerouslySetInnerHTML={{ __html: `
        ::-webkit-scrollbar {
          width: 6px !important;
          height: 6px !important;
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

      <section className="flex-1 flex flex-col lg:pr-56 m-0">
        <Header />
        
        <div className="p-4 md:p-8 space-y-6 text-right font-sans">
          
          <div>
            <h1 className="text-4xl font-extrabold text-[#D4AF37] tracking-wide">تذاكر الضمان وصيانة ما بعد التسليم</h1>
            <p className="text-gray-300 text-base mt-2 font-bold">تسجيل وتوزيع تذاكر الصيانة للعملاء تحت فترة الضمان والرقابة الهندسية على كفاءة أعمال التشطيب.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="bg-[#07132a] border-2 border-[#1f2d4d] rounded-2xl p-6 space-y-4 h-fit shadow-xl">
              <h3 className="text-[#D4AF37] font-black text-lg border-b border-[#1f2d4d] pb-2 select-none">➕ فتح تذكرة صيانة وضمان جديدة</h3>
              
              <div className="space-y-4 text-sm md:text-base font-bold">
                
                <div>
                  <label className="block text-[#D4AF37] mb-1.5 font-black text-sm">المشروع السكني المستهدف *</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full h-12 rounded-lg bg-[#020B1C] border border-[#243556] text-[#F0E6D2] px-3 text-sm outline-none cursor-pointer font-bold focus:border-[#D4AF37]"
                  >
                    <option value="">-- اختر موقع الشقة المسلمة --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.project_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#D4AF37] mb-1.5 font-black text-sm">الأولوية ودرجة الخطورة الفنية *</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full h-12 rounded-lg bg-[#020B1C] border border-[#243556] text-[#F0E6D2] px-3 text-sm outline-none cursor-pointer font-bold focus:border-[#D4AF37]"
                  >
                    <option value="low">منخفضة (لا توجد أضرار تعوق السكن)</option>
                    <option value="medium">متوسطة (شروخ خفيفة بالدهانات)</option>
                    <option value="urgent">عاجلة طارئة 🚨 (تسريب مياه أو انقطع كلي للكهرباء)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#D4AF37] mb-1.5 font-black text-sm">تفاصيل ووصف المشكلة بالتفصيل *</label>
                  <textarea
                    placeholder="اكتب تفاصيل المشكلة ومسار العطل ومكانه بالوحدة لسهولة فحص المهندس..."
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    rows={4}
                    className="w-full bg-[#020B1C] border border-[#243556] text-[#F0E6D2] p-3 text-sm rounded-lg outline-none font-bold resize-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#D4AF37] mb-1.5 font-black text-sm">إسناد وتكليف المهندس</label>
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full h-12 rounded-lg bg-[#020B1C] border border-[#243556] text-[#F0E6D2] font-bold px-3 text-sm outline-none cursor-pointer focus:border-[#D4AF37]"
                    >
                      <option value="">-- اختر مهندس الصيانة --</option>
                      {engineers.map((eng) => (
                        <option key={eng.id} value={eng.id}>{eng.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#D4AF37] mb-1.5 font-black text-sm">تاريخ المعاينة / الإصلاح</label>
                    <input
                      type="date"
                      value={executionDate}
                      onChange={(e) => setExecutionDate(e.target.value)}
                      className="w-full h-12 rounded-lg bg-[#020B1C] border border-[#243556] text-[#F0E6D2] px-3 text-sm outline-none font-mono font-bold focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#D4AF37] mb-1.5 font-black text-sm">الوضعية الحالية للتذكرة *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full h-12 rounded-lg bg-[#020B1C] border border-[#243556] text-[#F0E6D2] px-3 text-sm outline-none cursor-pointer font-bold focus:border-[#D4AF37]"
                  >
                    <option value="pending">قيد الانتظار والمعاينة</option>
                    <option value="scheduled">مجدولة للزيارة والإصلاح</option>
                    <option value="resolved">تم الإصلاح والمعالجة الفنية</option>
                    <option value="closed">تذكرة مغلقة نهائياً</option>
                  </select>
                </div>

                <button
                  onClick={handleCreateTicket}
                  disabled={saving}
                  className="w-full royal-gradient-btn text-[#020B1C] font-black py-4 px-6 rounded-full text-base flex items-center justify-center gap-2 cursor-pointer transition-all duration-300"
                >
                  <span>{saving ? "جاري حجز التذكرة..." : "فتح تذكرة صيانة معتمدة"}</span>
                  <Wrench className="w-5 h-5 text-[#020B1C]" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#07132a] border border-[#1f2d4d] rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-[#243556] bg-[#0b1b3d] select-none">
                  <h3 className="text-[#D4AF37] font-black text-lg">سجل طلبات وتذاكر الضمان المفتوحة والنشطة ({tickets.length})</h3>
                </div>
                
                <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                  {loading ? (
                    <div className="p-12 text-center text-gray-400 text-sm animate-pulse">جاري جلب أرشيف تذاكر الضمان...</div>
                  ) : tickets.length > 0 ? (
                    <table className="w-full text-right text-xs md:text-sm text-[#F0E6D2] min-w-[650px]">
                      <thead className="bg-[#0b1d3d] text-[#D4AF37] font-black sticky top-0 z-10 border-b border-[#1f2d4d] select-none">
                        <tr>
                          <th className="p-4 whitespace-nowrap">التاريخ</th>
                          <th className="p-4 whitespace-nowrap">موقع الشقة</th>
                          <th className="p-4 whitespace-nowrap">العميل وهاتفه</th>
                          <th className="p-4 whitespace-nowrap">تفاصيل العيب الفني</th>
                          <th className="p-4 whitespace-nowrap">المهندس المسند</th>
                          <th className="p-4 text-center whitespace-nowrap">درجة الخطورة</th>
                          <th className="p-4 text-center whitespace-nowrap">الوضعية الجارية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1f2d4d]">
                        {tickets.map((t) => (
                          <tr key={t.id} className="hover:bg-[#020B1C]/50 transition duration-150">
                            <td className="p-4 font-mono text-gray-300 whitespace-nowrap">{new Date(t.created_at).toLocaleDateString("ar-EG")}</td>
                            <td className="p-4 font-bold text-white">{t.projects?.project_name || "موقع ممسوح"}</td>
                            <td className="p-4">
                              <p className="font-bold text-white">{t.customers?.name || "عميل ممسوح"}</p>
                              <p className="font-mono text-gray-400 text-xs mt-0.5 whitespace-nowrap">{t.customers?.mobile || "-"}</p>
                            </td>
                            <td className="p-4 text-gray-200 max-w-xs truncate font-semibold" title={t.issue_description}>{t.issue_description}</td>
                            <td className="p-4 text-[#D4AF37] font-bold whitespace-nowrap">{t.users?.name || "غير مسند بعد"}</td>
                            <td className="p-4 text-center whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded text-xs font-black ${
                                t.priority === "urgent" ? "bg-red-500/10 text-red-400 animate-pulse" : t.priority === "medium" ? "bg-amber-500/10 text-amber-400" : "bg-gray-500/10 text-gray-400"
                              }`}>
                                {t.priority === "urgent" ? "عاجلة طارئة" : t.priority === "medium" ? "متوسطة" : "منخفضة"}
                              </span>
                            </td>
                            <td className="p-4 text-center whitespace-nowrap">
                              <span className={`px-3 py-1.5 rounded text-xs font-black ${
                                t.status === "resolved" || t.status === "closed" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400 animate-pulse"
                              }`}>
                                {t.status === "pending" && "تحت المعاينة"}
                                {t.status === "scheduled" && "مجدولة للإصلاح"}
                                {t.status === "resolved" && "تم المعالجة"}
                                {t.status === "closed" && "تذكرة مغلقة"}
                              </span>
                            </td>
                          </tr>
                        ))}
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