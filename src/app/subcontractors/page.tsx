"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useCRM } from "@/components/CRM/context/CRMContext";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
// تأمين استيراد وظائف الأوفلاين لحل خطأ التجميع 2304 نهائياً
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
  PlusCircle,
  Hourglass,
  Receipt,
  Loader2
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
    <main className="min-h-screen flex bg-[#020B1C] relative overflow-hidden" dir="rtl">
      
      {/* 🌟 هيدر الهيكل لمنع وميض وتأخر تحميل الخط البصري FOUT بسيرفرات الإنتاج */}
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
      `}} />

      <Sidebar />
      
      {/* 🌟 تم تصفير تعليمة w-full لإنهاء ثغرة القص والتمدد خارج إطار الشاشة الأيسر */}
      <section className="flex-1 flex flex-col lg:pr-56 m-0 min-h-screen">
        <Header />
        
        <div className="p-4 md:p-8 space-y-6 text-right">
          
          {/* هيدر الصفحة متناسق بكسلياً مع شاشة الـ CRM والبنود والخامات */}
          <div className="flex justify-between items-center border-b border-[#D4AF37]/20 pb-5 select-none">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[#D4AF37] flex items-center gap-2.5">
                <span>حسابات وإسناد مقاولي الباطن والموردين</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-ping" />
              </h1>
              <p className="text-white text-xs mt-2">مراقبة طواقم العمل النشطة، وجرد مستخلصاتهم المالية وأرشيف المقاولين.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 select-none text-xs md:text-sm font-bold">
            <div className="p-5 rounded-3xl bg-[#07132a] border border-[#D4AF37] flex items-center justify-between shadow-lg">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 font-bold block">إجمالي المقاولين والموردين</span>
                <span className="text-lg font-black font-mono text-[#F0E6D2]">{subcontractors.length} مسجلين</span>
              </div>
              <span className="text-2xl">👷</span>
            </div>

            <div className="p-5 rounded-3xl bg-[#07132a] border border-[#D4AF37] flex items-center justify-between shadow-lg">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 font-bold block">طواقم العمل النشطة ميدانياً</span>
                <span className="text-lg font-black font-mono text-emerald-400">+{activeCrewsCount} جاريين</span>
              </div>
              <span className="text-2xl">🏗️</span>
            </div>

            <div className="p-5 rounded-3xl bg-[#07132a] border border-[#D4AF37] flex items-center justify-between shadow-lg">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 font-bold block">إجمالي المستحقات المعلقة</span>
                <span className="text-lg font-black font-mono text-[#D4AF37]">{totalOutstandingLiabilities.toLocaleString('en-US')} ج.م</span>
              </div>
              <span className="text-2xl">💸</span>
            </div>
          </div>

          <div className="bg-[#07132a] border border-[#D4AF37] rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#D4AF37] bg-[#0b1b3d]/60 flex flex-col sm:flex-row justify-between items-center gap-4 select-none">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-[#D4AF37] font-bold text-md md:text-md">سجل مقاولي الباطن مع روابط عقود الاسناد</h3>
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
                <thead className="bg-[#0b1d3d] text-[#D4AF37] select-none text-[13px]">
                  <tr className="whitespace-nowrap">
                    <th className="p-3">اسم المقاول / المورد</th>
                    <th className="p-3 text-center">رقم الموبايل</th>
                    <th className="p-3">فئة ومجال الأعمال</th>
                    <th className="p-3">الموقع الإنشائي</th>
                    <th className="p-3 font-mono">قيمة التعاقد</th>
                    <th className="p-3 text-center">الوضعية الحالية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2d4d]/50 text-xs md:text-sm text-slate-100 font-semibold">
                  {filteredSubcontractors.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => selectRow(s)}
                      className={`border-t border-[#1f2d4d] hover:bg-[#0B1B38] text-white cursor-pointer transition whitespace-nowrap ${
                        selectedSubcontractor?.id === s.id ? "bg-[#0b1b3d]/60 border-r-4 border-r-[#D4AF37]" : ""
                      }`}
                    >
                      <td className="p-4 text-[#F0E6D2]">{s.name}</td>
                      <td className="p-4 text-gray-300  text-center">{s.phone || "غير مسجل"}</td>
                      <td className="p-4 text-[#F0E6D2]">{specialtyLabels[s.specialty] || s.specialty}</td>
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
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
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

          <div className="bg-[#07132a] border border-[#D4AF37] rounded-[2rem] p-6 space-y-5 animate-fade-in shadow-2xl relative w-full text-xs">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
            
            <h3 className="text-[#D4AF37] text-base md:text-base font-bold  border-b border-[#D4AF37] pb-3 flex items-center gap-2 select-none">
              <Sparkles className="w-5 h-5 text-[#D4AF37] shrink-0 animate-pulse" />
              <span>تفاصيل وبيانات مقاول الباطن / المورد المحدد</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-semibold text-white">
              
              <div>
                <label className="block text-[#D4AF37] mb-1.5 text-[13px] select-none px-3">اسم المقاول / المورد المعتمد *</label>
                <input
                  type="text"
                  placeholder="مثال: المعلم أحمد للنقاشة"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-4 outline-none focus:border-[#D4AF37] font-semibold text-xs placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-[#D4AF37] mb-1.5 text-[13px] select-none px-3">رقم الموبايل </label>
                <input
                  type="text"
                  placeholder="010xxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-4 outline-none focus:border-[#D4AF37] font-mono font-semibold text-xs placeholder-slate-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 col-span-1 md:col-span-2">
                <div>
                  <label className="block text-[#D4AF37] mb-1.5 text-[13px] select-none px-3">التخصص الفني المعماري *</label>
                  <select
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] px-3 font-semibold outline-none focus:border-[#D4AF37] cursor-pointer text-xs"
                  >
                    {Object.entries(specialtyLabels).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#D4AF37] mb-1.5 text-[13px] select-none px-3">إسناد وتكليف لموقع عمل</label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-3 font-semibold outline-none focus:border-[#D4AF37] cursor-pointer text-xs"
                  >
                    <option value="">-- مورد عام / مقاول احتياطي (بدون مشروع حالياً) --</option>
                    {projects.map((p: any) => (
                      <option key={p.id} value={p.id}>🏠 {p.project_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 col-span-1 md:col-span-2">
                <div>
                  <label className="block text-[#D4AF37] mb-1.5 px-3 text-[13px] select-none">إجمالي قيمة الاتفاق (ج.م)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={contractValue}
                    onChange={(e) => setContractValue(e.target.value !== "" ? Number(e.target.value) : "")}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] px-4 outline-none focus:border-[#D4AF37] font-mono font-black text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[#D4AF37] mb-1.5 text-[13px] select-none px-3">الوضعية والنشاط الجاري بالموقع *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] font-bold px-3 text-xs outline-none cursor-pointer focus:border-[#D4AF37]"
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
                  <label className="block text-[#D4AF37] text-[13px] mb-2">📁 رابط العقد المعتمد بـ (Google Drive)</label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/..."
                    value={contractUrl}
                    onChange={(e) => setContractUrl(e.target.value)}
                    className="w-full h-10 rounded-lg bg-[#07132a] border border-[#243556] text-white px-3 outline-none focus:border-[#D4AF37] font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[#D4AF37] text-[13px] mb-2">📁 رابط آخر مستخلص بـ (Google Drive)</label>
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
                  <label className="block text-[#D4AF37] text-[13px] mb-2">تاريخ بدء عمل المقاول بالبند</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-10 rounded-lg bg-[#07132a] border border-[#243556] text-[#F0E6D2] px-4 outline-none focus:border-[#D4AF37] text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[#D4AF37] text-[13px] mb-2 px-3">تاريخ الانتهاء المتوقع للتسليم</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-10 rounded-lg bg-[#07132a] border border-[#243556] text-[#F0E6D2] px-4 outline-none focus:border-[#D4AF37] text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 ">
                <label className="block text-[#D4AF37] mb-1.5 text-[13px] select-none px-3 ">التقييم اللفظي المعتمد للجودة والالتزام الفني *</label>
                <select
                  value={performanceRating}
                  onChange={(e) => setPerformanceRating(e.target.value)}
                  className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] font-bold px-3  text-xs outline-none cursor-pointer focus:border-[#D4AF37]"
                >
                  <option value="excellent">امتياز 🏆 (تسليم هندسي متكامل ومثالي)</option>
                  <option value="very_good">جيد جداً ⭐ (تسليم بجودة عالية مع التزام زمني ممتاز)</option>
                  <option value="good">جيد 👍 (تسليم مقبول هندسياً مع الالتزام بالتعليمات العامة)</option>
                  <option value="acceptable">مقبول ⚠️ (تسليم ببعض التعديلات والرمم المعلقة)</option>
                  <option value="bad">سيء 🚨 (عدم تسليم هندسي، تأخير زمني وتجاوز المواصفات)</option>
                </select>
              </div>

            </div>

            {/* 🌟 أزرار التحكم ميتاليكية فاخرة مانعة للريفريش نهائياً بتأثير الوميض والنيون السفلي المذهب */}
            <div className="flex flex-wrap gap-13 pt-4 border-t border-[#D4AF37] justify-end select-none">
              
              <div className="relative group">
                <button
                  type="button" // 👈 صمام أمان المتصفح لمنع التحديث
                  onClick={(e) => { e.preventDefault(); clearForm(); }}
                  className="px-5 h-11 rounded-xl bg-gradient-to-b from-[#0c1e3d]/40 to-[#040e20]/40 text-[#D4AF37] border border-[#D4AF37]/30 shadow-md hover:border-[#D4AF37] transition-all duration-300 text-ms cursor-pointer flex flex-row items-center justify-center gap-2 whitespace-nowrap"
                >
                  <RefreshCw className="w-4 h-4 shrink-0" />
                  <span>تهيئة الحقول لجديد</span>
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
                  type="button" // 👈 صمام أمان المتصفح لمنع التحديث
                  onClick={(e) => { e.preventDefault(); handleInsert(); }}
                  disabled={actionLoading || !!selectedSubcontractor}
                  className="px-8 h-11 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.01] active:scale-95 transition-all duration-300 text-sm cursor-pointer flex items-center justify-center gap-1.5 select-none relative overflow-hidden disabled:opacity-40"
                >
                  {actionLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>حفظ مقاول / مورد جديد</span>
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
                </button>
                <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                  <div className="bg-[#07132a] border border-[#D4AF37] text-[#F0E6D2] text-[10px] py-2 px-4 rounded-xl shadow-2xl relative">
                    💾 حفظ وتثبيت كارت المقاول أو المورد المعتمد في السحابة
                    <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#07132a] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                  </div>
                </div>
              </div>

              <div className="relative group">
                <button
                  type="button" // 👈 صمام أمان المتصفح لمنع التحديث
                  onClick={(e) => { e.preventDefault(); handleUpdate(); }}
                  disabled={actionLoading || !selectedSubcontractor}
                  className="px-8 h-11 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.01] active:scale-95 transition-all duration-300 text-sm flex items-center justify-center gap-1.5 select-none relative overflow-hidden disabled:opacity-40 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                  <span>حفظ التعديلات والتقييم</span>
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
                </button>
                <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                  <div className="bg-[#07132a] border border-[#D4AF37] text-[#F0E6D2] text-[10px] py-2 px-4 rounded-xl shadow-2xl relative">
                    💾 تحديث التقييم المهني أو عقود Google Drive للمقاول المحدد بالسيرفر
                    <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#07132a] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                  </div>
                </div>
              </div>

              <div className="relative group">
                <button
                  type="button" // 👈 صمام أمان المتصفح لمنع التحديث
                  onClick={(e) => { e.preventDefault(); handleDelete(); }}
                  disabled={actionLoading || !selectedSubcontractor}
                  className="bg-red-950/40 border border-red-500/30 hover:bg-red-600 hover:text-white text-red-400 px-8 py-3.5 rounded-xl cursor-pointer disabled:opacity-50 text-sm flex items-center gap-1.5 select-none relative overflow-hidden active:scale-95 duration-300"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>حذف المقاول نهائياً</span>
                </button>
                <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                  <div className="bg-[#07132a] border border-[#D4AF37] text-[#F0E6D2] text-[10px] py-2 px-4 rounded-xl shadow-2xl relative">
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