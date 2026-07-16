"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";
// 🌟 تم تأمين استيراد وظائف الأوفلاين لحل خطأ التجميع 2304 نهائياً
import { isOnline, addToOfflineQueue } from "@/lib/offline-sync";
import { 
  Download, 
  Plus, 
  Trash2, 
  Edit3, 
  Layers, 
  FileText, 
  CheckCircle, 
  Search, 
  RefreshCw, 
  Sparkles, 
  FolderCheck, 
  HardHat, 
  Phone,
  Lock,
  CheckCircle2,
  Key,
  DollarSign,
  PlusCircle
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
}

interface Project {
  id: string;
  project_name: string;
  customer_id?: string; 
}

interface Subcontractor {
  id: string;
  name: string;
  phone: string;
  specialty: string;
  project_id?: string;
  contract_value: number;
  status: string; 
  rating: number;
  created_at: string;
  start_date?: string;
  end_date?: string;
  performance_rating: string;
  contract_url?: string;
  invoice_url?: string;
  total_paid?: number;
  remaining_due?: number;
  projects?: { project_name: string };
}

const specialtyLabels: { [key: string]: string } = {
  plaster: "أعمال المحارة والترمات",
  paint: "أعمال النقاشة والدهانات",
  flooring: "أعمال الأرضيات والسيراميك",
  ceiling: "أعمال الجبس والأسقف",
  doors: "أعمال الأبواب الخشبية",
  aluminum: "أعمال الشبابيك والألوميتال",
  electricity: "أعمال التأسيس والكهرباء",
  plumbing: "أعمال الصحي والسباكة",
  ac: "أعمال التكييفات وتمديد الفريون",
  decorations: "أعمال الديكورات الجمالية",
  materials_supplier: "مورد خامات ومستلزمات عامة" 
};

const ratingLabels: { [key: string]: string } = {
  excellent: "ممتاز 🏆",
  very_good: "جيد جداً ⭐",
  good: "جيد 👍",
  acceptable: "مقبول ⚠️",
  bad: "سيء 🚨"
};

export default function SubcontractorsPage() {
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]); 
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("paint");
  const [projectId, setProjectId] = useState("");
  const [contractValue, setContractValue] = useState<number | "">("");
  const [status, setStatus] = useState("active"); 
  const [rating, setRating] = useState<number>(5);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [performanceRating, setPerformanceRating] = useState("good");

  const [contractUrl, setContractUrl] = useState("");
  const [invoiceUrl, setInvoiceUrl] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    document.title = "حسابات مقاولي الباطن والموردين | Golden Decoration";
    loadSubcontractorsData();
  }, []);

  async function loadSubcontractorsData() {
    setLoading(true);
    try {
      const { data: transData, error: transError } = await supabase
        .from("transactions")
        .select("*")
        .eq("type", "outflow");

      const [subcontractorsRes, projectsRes] = await Promise.all([
        supabase
          .from("subcontractors")
          .select("*, projects(project_name)")
          .order("created_at", { ascending: false }),
        
        supabase
          .from("projects")
          .select("id, project_name")
          .order("project_name", { ascending: true })
      ]);

      if (subcontractorsRes.error) throw subcontractorsRes.error;
      if (projectsRes.error) throw projectsRes.error;

      const rawSubs = subcontractorsRes.data || [];
      const rawTrans = transData || [];

      const mappedSubs = rawSubs.map((sub: any) => {
        const totalPaid = rawTrans
          .filter((t: any) => t.subcontractor_id === sub.id)
          .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

        const remaining = Number(sub.contract_value || 0) - totalPaid;

        return {
          ...sub,
          total_paid: totalPaid,
          remaining_due: remaining > 0 ? remaining : 0
        };
      });

      setSubcontractors(mappedSubs);
      setProjects(projectsRes.data || []);

    } catch (err: any) {
      console.error("Error loading subcontractors data:", err);
    } finally {
      setLoading(false);
    }
  }

  const activeCrewsCount = subcontractors.filter((s: any) => s.status === "active").length;
  const totalOutstandingLiabilities = subcontractors.reduce((sum: number, s: any) => sum + Number(s.remaining_due || 0), 0);
  const averageRating = subcontractors.length > 0 
    ? (subcontractors.reduce((sum: number, s: any) => sum + Number(s.rating || 5), 0) / subcontractors.length).toFixed(1)
    : "5.0";

  const filteredSubcontractors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return subcontractors;
    return subcontractors.filter(s => 
      String(s.name || "").toLowerCase().includes(q) ||
      String(s.phone || "").toLowerCase().includes(q) ||
      specialtyLabels[s.specialty]?.toLowerCase().includes(q)
    );
  }, [subcontractors, searchQuery]);

  function clearForm() {
    setSelectedSubcontractor(null);
    setName("");
    setPhone("");
    setSpecialty("paint");
    setProjectId("");
    setContractValue("");
    setStatus("active");
    setRating(5);
    setStartDate("");
    setEndDate("");
    setPerformanceRating("good");
    setContractUrl("");
    setInvoiceUrl("");
  }

  function selectRow(item: any) {
    setSelectedSubcontractor(item);
    setName(item.name || "");
    setPhone(item.phone || "");
    setSpecialty(item.specialty || "paint");
    setProjectId(item.project_id || "");
    setContractValue(item.contract_value ? Number(item.contract_value) : "");
    setStatus(item.status || "active");
    setRating(item.rating ? Number(item.rating) : 5);
    setStartDate(item.start_date || "");
    setEndDate(item.end_date || "");
    setPerformanceRating(item.performance_rating || "good");
    setContractUrl(item.contract_url || "");
    setInvoiceUrl(item.invoice_url || "");
  }

  async function handleInsert() {
    if (!name) {
      alert("يرجى إدخال اسم المقاول أو المورد لإتمام عملية التسجيل بالمكتبة.");
      return;
    }

    if (status === "active" && (!projectId || contractValue === "")) {
      alert("⚠️ قيد مالي إلزامي:\n\nالمقاول النشط بالموقع يتطلب تحديد المشروع وقيمة المقاولة لربط الدفعات والتحصيل.");
      return;
    }

    setActionLoading(true);
    const payload = {
      name,
      phone: phone || null,
      specialty,
      project_id: projectId || null, 
      contract_value: contractValue !== "" ? Number(contractValue) : 0,
      status,
      rating: Number(rating),
      start_date: startDate || null,
      end_date: endDate || null,
      performance_rating: performanceRating,
      contract_url: contractUrl || null,
      invoice_url: invoiceUrl || null
    };

    try {
      if (isOnline()) {
        const { error } = await supabase
          .from("subcontractors")
          .insert([payload]);

        if (error) throw error;

        await supabase.from("notifications").insert({
          title: status === "supplier" ? "تسجيل مورد معتمد للشركة" : "تسجيل مقاول احتياطي",
          message: `👷 تم إضافة المورد/المقاول (${name}) تخصص (${specialtyLabels[specialty]}) بنجاح في أرشيف الشركة.`,
          type: "procurement",
          link: "/subcontractors"
        });

        alert("✅ تم حفظ كارت المقاول/المورد وتحديث الأرشيف بنجاح سحابياً!");
      } else {
        addToOfflineQueue("subcontractors", "INSERT", payload);
        alert("⚠️ تم الحفظ محلياً مؤقتاً لعدم وجود إنترنت؛ وسيتم مزامنته فور عودة الاتصال.");
      }
      clearForm();
      await loadSubcontractorsData();
    } catch (err: any) {
      alert("حدث خطأ أثناء التسجيل: " + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUpdate() {
    if (!selectedSubcontractor?.id) {
      alert("يرجى اختيار مقاول أو مورد من الجدول بالأعلى أولاً للتعديل.");
      return;
    }

    setActionLoading(true);
    const payload = {
      name,
      phone: phone || null,
      specialty,
      project_id: projectId || null,
      contract_value: contractValue !== "" ? Number(contractValue) : 0,
      status,
      rating: Number(rating),
      start_date: startDate || null,
      end_date: endDate || null,
      performance_rating: performanceRating,
      contract_url: contractUrl || null,
      invoice_url: invoiceUrl || null
    };

    try {
      if (isOnline()) {
        const { error } = await supabase
          .from("subcontractors")
          .update(payload)
          .eq("id", selectedSubcontractor.id);

        if (error) throw error;
        alert("✅ تم تعديل وحفظ كارت المقاول/المورد وتقييمه الفني بالسيرفر!");
      } else {
        addToOfflineQueue("subcontractors", "UPDATE", { ...payload, id: selectedSubcontractor.id });
        alert("⚠️ تم حفظ التعديلات محلياً وسيتم تحديث السيرفر تلقائياً فور توفر الإنترنت.");
      }
      clearForm();
      await loadSubcontractorsData();
    } catch (err: any) {
      alert("حدث خطأ أثناء التعديل: " + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!selectedSubcontractor?.id) {
      alert("يرجى تحديد المقاول المراد حذفه من الجدول بالأعلى أولاً.");
      return;
    }
    if (!confirm("هل أنت متأكد من حذف هذا المقاول نهائياً؟ سيؤثر هذا على تتبع مديونيات ودفعات الصرف السابقة له.")) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("subcontractors")
        .delete()
        .eq("id", selectedSubcontractor.id);

      if (error) throw error;
      alert("🗑️ تم حذف المقاول/المورد بنجاح من قاعدة البيانات!");
      clearForm();
      await loadSubcontractorsData();
    } catch (err: any) {
      alert("حدث خطأ أثناء الحذف: " + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    // 🌟 تم فرض Alexandria كخط افتراضي وتوحيد المحاذاة والتعبئة البكسلية بالكامل
    <main className="min-h-screen bg-[#020B1C] relative overflow-hidden" dir="rtl">
      
      <style dangerouslySetInnerHTML={{__html: `
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
        
        /* جدار أمان الخط الموحد Alexandria */
        *:not(code, pre, .font-mono, [class*="font-mono"]) {
          font-family: var(--font-alexandria), system-ui, -apple-system, sans-serif !important;
          letter-spacing: normal !important;
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

      <Sidebar />
      
      <section className="w-full lg:pr-56 m-0 min-h-screen flex flex-col">
        <Header />
        <div className="p-4 md:p-8 space-y-6 text-right">
          
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-[#D4AF37] tracking-wide">إدارة المقاولين والموردين المعتمدين</h1>
            <p className="text-[#F0E6D2] text-sm md:text-base mt-2 font-bold">تسجيل مقاولي باطن، الموردين المعتمدين، جرد مستخلصاتهم المالية، وأرشيف المقاولين الاحتياطيين.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 select-none">
            <div className="p-5 rounded-2xl bg-[#07132a] border-2 border-[#D4AF37]/50 flex items-center justify-between shadow-lg">
              <div className="space-y-1">
                <span className="text-xs text-gray-400 font-bold block">إجمالي المقاولين والموردين بالأرشيف</span>
                <span className="text-2xl font-black font-mono text-[#F0E6D2]">{subcontractors.length} مسجلين</span>
              </div>
              <span className="text-2xl">👷</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#07132a] border-2 border-[#D4AF37]/50 flex items-center justify-between shadow-lg">
              <div className="space-y-1">
                <span className="text-xs text-gray-400 font-bold block">طواقم العمل النشطة ميدانياً</span>
                <span className="text-2xl font-black font-mono text-emerald-400">+{activeCrewsCount} جاريين</span>
              </div>
              <span className="text-2xl">🏗️</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#07132a] border-2 border-[#D4AF37]/50 flex items-center justify-between shadow-lg">
              <div className="space-y-1">
                <span className="text-xs text-gray-400 font-bold block">إجمالي المستحقات والذمم المعلقة</span>
                <span className="text-2xl font-black font-mono text-[#D4AF37]">{totalOutstandingLiabilities.toLocaleString('en-US')} ج.م</span>
              </div>
              <span className="text-2xl">💸</span>
            </div>
          </div>

          <div className="bg-[#07132a] border-2 border-[#D4AF37]/50 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#243556] bg-[#0b1b3d]/60 flex flex-col sm:flex-row justify-between items-center gap-4 select-none">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-[#D4AF37] font-black text-base">سجل مقاولي الباطن والشركاء مع روابط Google Drive</h3>
              </div>

              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder="ابحث باسم المقاول، الهاتف، الفئة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 rounded-xl bg-[#020B1C] border border-[#243556] text-[#F0E6D2] pr-9 pl-4 text-xs font-bold outline-none focus:border-[#D4AF37] transition-all placeholder-gray-500"
                />
                <span className="absolute right-3 top-3 text-[#D4AF37] select-none text-xs">🔍</span>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
              <table className="w-full text-right table-auto">
                <thead className="bg-[#0b1d3d] text-[#D4AF37] font-black border-b border-[#1f2d4d] select-none">
                  <tr className="whitespace-nowrap">
                    <th className="p-4">اسم المقاول / المورد</th>
                    <th className="p-4">رقم الجوال</th>
                    <th className="p-4">فئة ومجال الأعمال</th>
                    <th className="p-4">الموقع الإنشائي المستهدف</th>
                    <th className="p-4 font-mono">قيمة التعاقد</th>
                    <th className="p-4 text-center">الوضعية الحالية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2d4d]/50 text-sm md:text-base font-bold">
                  {filteredSubcontractors.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => selectRow(s)}
                      className={`border-t border-[#1f2d4d] hover:bg-[#0B1B38] text-white cursor-pointer transition whitespace-nowrap ${
                        selectedSubcontractor?.id === s.id ? "bg-[#0b1d3d]/60 border-r-4 border-r-[#D4AF37]" : ""
                      }`}
                    >
                      <td className="p-4 font-black">{s.name}</td>
                      <td className="p-4 font-mono text-gray-300">{s.phone || "غير مسجل"}</td>
                      <td className="p-4 font-bold text-[#F0E6D2]">{specialtyLabels[s.specialty] || s.specialty}</td>
                      <td className="p-4 text-gray-300 font-bold">
                        {s.status === "supplier" ? (
                          <span className="text-emerald-400 font-bold">📦 مورد معتمد للشركة</span>
                        ) : s.status === "backup" ? (
                          <span className="text-amber-400 font-bold">⏳ مقاول احتياطي (على الانتظار)</span>
                        ) : (
                          s.projects?.project_name || "غير محدد"
                        )}
                      </td>
                      <td className="p-4 font-mono font-bold text-[#D4AF37]">{(Number(s.contract_value) || 0).toLocaleString('en-US')} ج.م</td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                          s.status === "active" ? "bg-emerald-500/10 text-emerald-400" : s.status === "supplier" ? "bg-blue-500/10 text-blue-400" : "bg-gray-500/10 text-gray-400"
                        }`}>
                          {s.status === "active" && "نشط بالموقع"}
                          {s.status === "completed" && "منتهي ومسلم البند"}
                          {s.status === "backup" && "احتياطي / معلق"}
                          {s.status === "supplier" && "مورد معتمد"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-[#07132a] border-2 border-[#D4AF37]/50 rounded-[2rem] p-6 space-y-6 animate-fade-in shadow-2xl relative w-full text-base">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
            
            <h3 className="text-[#D4AF37] text-xl font-black border-b border-[#243556] pb-3 flex items-center gap-2 select-none">
              <Sparkles className="w-5 h-5 text-[#D4AF37] animate-pulse" />
              <span>تفاصيل وبيانات مقاول الباطن / المورد المحدد</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-semibold">
              
              <div>
                <label className="block text-[#D4AF37] text-sm mb-2 font-black">اسم المقاول / الورشة المعتمد *</label>
                <input
                  type="text"
                  placeholder="مثال: المعلم أحمد للنقاشة"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-12 text-sm rounded-xl bg-[#020B1C] border border-[#243556] text-white px-4 outline-none focus:border-[#D4AF37] font-bold placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-[#D4AF37] text-sm mb-2 font-black">رقم المحمول الرئيسي للتواصل</label>
                <input
                  type="text"
                  placeholder="010xxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-12 text-sm rounded-xl bg-[#020B1C] border border-[#243556] text-white px-4 outline-none focus:border-[#D4AF37] font-mono font-bold placeholder-slate-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#D4AF37] text-sm mb-2 font-black">التخصص الفني المعماري *</label>
                  <select
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full h-12 text-sm rounded-xl bg-[#020B1C] border border-[#243556] text-white px-3 outline-none cursor-pointer focus:border-[#D4AF37] font-bold"
                  >
                    {Object.entries(specialtyLabels).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#D4AF37] text-sm mb-2 font-black">إسناد وتكليف لموقع عمل</label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full h-12 text-sm rounded-xl bg-[#020B1C] border border-[#243556] text-white px-3 outline-none cursor-pointer focus:border-[#D4AF37] font-bold"
                  >
                    <option value="">-- مورد عام / مقاول احتياطي (بدون مشروع حالياً) --</option>
                    {projects.map((p: any) => (
                      <option key={p.id} value={p.id}>🏠 {p.project_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#D4AF37] text-sm mb-2 font-black">إجمالي قيمة اتفاق المقاولة (ج.م)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={contractValue}
                    onChange={(e) => setContractValue(e.target.value !== "" ? Number(e.target.value) : "")}
                    className="w-full h-12 text-sm rounded-xl bg-[#020B1C] border border-[#243556] text-[#D4AF37] px-4 outline-none focus:border-[#D4AF37] font-mono font-black placeholder-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-[#D4AF37] text-sm mb-2 font-black">الوضعية والنشاط الجاري بالموقع *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full h-12 text-sm rounded-xl bg-[#020B1C] border border-[#243556] text-white px-3 outline-none cursor-pointer focus:border-[#D4AF37] font-bold"
                  >
                    <option value="active">نشط بالموقع جاري التنفيذ</option>
                    <option value="completed">منتهي ومسلم البند</option>
                    <option value="backup">احتياطي وقيد الطلب والانتظار</option>
                    <option value="supplier">مورد خامات ومواد معتمد للشركة</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#020B1C] p-4 rounded-xl border border-dashed border-[#D4AF37]/30">
                <div>
                  <label className="block text-[#D4AF37] text-xs mb-2 font-black">📁 رابط العقد المعتمد بـ (Google Drive)</label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/..."
                    value={contractUrl}
                    onChange={(e) => setContractUrl(e.target.value)}
                    className="w-full h-10 rounded-lg bg-[#07132a] border border-[#243556] text-white px-3 outline-none focus:border-[#D4AF37] font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[#D4AF37] text-xs mb-2 font-black">📁 رابط آخر مستخلص بـ (Google Drive)</label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/..."
                    value={invoiceUrl}
                    onChange={(e) => setInvoiceUrl(e.target.value)}
                    className="w-full h-10 rounded-lg bg-[#07132a] border border-[#243556] text-white px-3 outline-none focus:border-[#D4AF37] font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 col-span-1 md:col-span-2 bg-[#020B1C] p-4 rounded-xl border border-[#1f2d4d]">
                <div>
                  <label className="block text-[#D4AF37] text-xs mb-2 font-bold">تاريخ بدء عمل المقاول بالبند</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-10 rounded-lg bg-[#07132a] border border-[#243556] text-[#F0E6D2] px-4 outline-none focus:border-[#D4AF37] text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[#D4AF37] text-xs mb-2 font-bold">تاريخ الانتهاء المتوقع للتسليم</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-10 rounded-lg bg-[#07132a] border border-[#243556] text-[#F0E6D2] px-4 outline-none focus:border-[#D4AF37] text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-[#D4AF37] text-sm mb-2 font-black">التقييم اللفظي المعتمد للجودة والالتزام الفني *</label>
                <select
                  value={performanceRating}
                  onChange={(e) => setPerformanceRating(e.target.value)}
                  className="w-full h-12 text-sm rounded-xl bg-[#020B1C] border border-[#243556] text-[#D4AF37] px-3 outline-none focus:border-[#D4AF37] font-bold"
                >
                  <option value="excellent">امتياز 🏆 (تسليم هندسي متكامل ومثالي)</option>
                  <option value="very_good">جيد جداً ⭐ (تسليم بجودة عالية مع التزام زمني ممتاز)</option>
                  <option value="good">جيد 👍 (تسليم مقبول هندسياً مع الالتزام بالتعليمات العامة)</option>
                  <option value="acceptable">مقبول ⚠️ (تسليم ببعض التعديلات والرمم المعلقة)</option>
                  <option value="bad">سيء 🚨 (عدم تسليم هندسي، تأخير زمني وتجاوز المواصفات)</option>
                </select>
              </div>

            </div>

            <div className="flex flex-wrap gap-4 pt-5 border-t border-[#243556] justify-end select-none">
              
              <div className="relative group">
                <button
                  type="button"
                  onClick={clearForm}
                  className="bg-transparent border border-gray-600 text-gray-300 px-6 py-3.5 rounded-xl font-black hover:bg-gray-800 cursor-pointer text-xs md:text-sm"
                >
                  🔄 تهيئة الحقول لجديد
                </button>
                <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                  <div className="bg-[#07132a] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2 px-4 rounded-xl shadow-2xl relative">
                    🔄 تفريغ حقول النموذج وتحضير استمارة الإضافة كـ (جديد)
                    <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#07132a] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                  </div>
                </div>
              </div>

              <div className="relative group">
                <button
                  type="button"
                  onClick={handleInsert}
                  disabled={actionLoading || !!selectedSubcontractor}
                  className={`px-8 py-3.5 rounded-xl font-black cursor-pointer text-xs md:text-sm ${
                    actionLoading || !!selectedSubcontractor
                      ? "bg-gray-800 text-gray-500 border border-transparent cursor-not-allowed opacity-40"
                      : "royal-gradient-btn text-black shadow-lg"
                  }`}
                >
                  ➕ حفظ مقاول / مورد جديد
                </button>
                <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                  <div className="bg-[#07132a] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2 px-4 rounded-xl shadow-2xl relative">
                    💾 حفظ وتثبيت كارت المقاول أو المورد المعتمد في السحابة
                    <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#07132a] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                  </div>
                </div>
              </div>

              <div className="relative group">
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={actionLoading || !selectedSubcontractor}
                  className={`px-8 py-3.5 rounded-xl font-black cursor-pointer text-xs md:text-sm ${
                    actionLoading || !selectedSubcontractor
                      ? "bg-gray-800 text-gray-500 border border-transparent cursor-not-allowed opacity-40"
                      : "royal-gradient-btn text-black shadow-lg"
                  }`}
                >
                  ✏️ حفظ التعديلات والتقييم
                </button>
                <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                  <div className="bg-[#07132a] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2 px-4 rounded-xl shadow-2xl relative">
                    💾 تحديث التقييم المهني أو عقود Google Drive للمقاول المحدد بالسيرفر
                    <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#07132a] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                  </div>
                </div>
              </div>

              <div className="relative group">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={actionLoading || !selectedSubcontractor}
                  className="bg-red-950/40 border border-red-500/30 hover:bg-red-600 hover:text-white text-red-400 px-8 py-3.5 rounded-xl font-black cursor-pointer disabled:opacity-50 text-xs md:text-sm"
                >
                  🗑️ حذف المقاول نهائياً
                </button>
                <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                  <div className="bg-[#07132a] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2 px-4 rounded-xl shadow-2xl relative">
                    🚨 حذف وإلغاء ملف المقاول أو المورد نهائياً من أرشيف الشركة
                    <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#07132a] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>
    </main>
  );
}