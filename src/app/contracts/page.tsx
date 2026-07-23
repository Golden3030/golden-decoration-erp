"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";
import { isOnline, addToOfflineQueue } from "@/lib/offline-sync";
import { 
  Trash2, 
  FileText, 
  Search, 
  Sparkles, 
  Loader2 
} from "lucide-react";

interface Contract {
  id: string;
  code: string;
  title: string;
  contract_type: string; 
  party_name: string;
  contract_url: string;
  notes?: string;
  created_at: string;
}

// FIX: تنسيق التاريخ يدويًا لحل مشكلة الـ Hydration Mismatch
function formatArchiveDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function ContractsArchivePage() {
  const router = useRouter();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // حقول نموذج إضافة مستند وعقد جديد
  const [cTitle, setCTitle] = useState("");
  const [cType, setCType] = useState("عقد عميل نهائي");
  const [cParty, setCParty] = useState("");
  const [cUrl, setCUrl] = useState("");
  const [cNotes, setCNotes] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    document.title = "أرشيف المستندات والتعاقدات | Golden Decoration";
    loadContractsData();
  }, []);

  async function loadContractsData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (err: any) {
      console.error("Error loading contracts:", err.message);
    } finally {
      document.title = "أرشيف وإدارة الوثائق والتعاقدات | Golden Decoration";
      setLoading(false);
    }
  }

  // محرك البحث اللحظي والتصفية داخل مستندات جوجل درايف بالمنظومة
  const filteredContracts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return contracts;

    return contracts.filter((c) => {
      const matchTitle = String(c.title || "").toLowerCase().includes(query);
      const matchParty = String(c.party_name || "").toLowerCase().includes(query);
      const matchCode = String(c.code || "").toLowerCase().includes(query);
      return matchTitle || matchParty || matchCode;
    });
  }, [contracts, searchQuery]);

  // إدراج وحفظ المستند الجديد سحابياً ومحلياً
  async function handleAddContract() {
    if (!cTitle.trim() || !cParty.trim() || !cUrl.trim()) {
      alert("الرجاء إدخال اسم المستند، اسم الطرف الثاني، ورابط جوجل درايف لحفظ العقد.");
      return;
    }

    setSaving(true);
    const payload = {
      title: cTitle,
      contract_type: cType,
      party_name: cParty,
      contract_url: cUrl,
      notes: cNotes || null
    };

    try {
      if (isOnline()) {
        const { error } = await supabase
          .from("contracts")
          .insert([payload]);

        if (error) throw error;

        // إشعار سحابي فوري وموثق بنظام التنبيهات
        await supabase.from("notifications").insert({
          title: "توثيق مستند رسمي جديد",
          message: `📄 تم تسجيل وتوثيق مستند رسمي بالأرشيف: (${cTitle}) تصنيف (${cType}) مع الطرف الثاني (${cParty}) والمستند متاح بـ Google Drive.`,
          type: "finance",
          link: "/contracts"
        });

        alert("✅ تم توثيق وحفظ المستند وأرشفته تلقائياً بقاعدة بيانات المنظومة!");
      } else {
        addToOfflineQueue("contracts", "INSERT", payload);
        alert("⚠️ تم حفظ مستند العقد محلياً؛ وسيتم مزامنته ونشره بالأرشيف فور توفر الإنترنت.");
      }

      setCTitle("");
      setCParty("");
      setCUrl("");
      setCNotes("");

      await loadContractsData();
    } catch (err: any) {
      alert("حدث خطأ أثناء أرشفة المستند: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // حذف مستند من الأرشيف السحابي مع التنبيه
  async function handleDeleteContract(id: string, title: string) {
    const confirmDelete = window.confirm(`هل أنت متأكد من حذف المستند (${title}) نهائياً من أرشيف الشركة؟`);
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("contracts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await supabase.from("notifications").insert({
        title: "حذف مستند من الأرشيف",
        message: `🚨 تم إزالة مستند رسمي (${title}) نهائياً من أرشيف الوثائق والتعاقدات بالشركة.`,
        type: "finance",
        link: "/contracts"
      });

      alert("🗑️ تم حذف المستند بنجاح من أرشيف قاعدة البيانات!");
      await loadContractsData();
    } catch (err: any) {
      alert("حدث خطأ أثناء محاولة الحذف: " + err.message);
    }
  }

  return (
    <main className="min-h-screen flex bg-[#020B1C] relative overflow-hidden font-alexandria" dir="rtl">
      <Sidebar />

      {/* 🛠️ جدار الحماية البصري المعتمد لتوحيد شريط التمرير بالأسهم والجدول المذهب الموحد ومنع تداخل الحروف كلياً */}
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

        /* عزل تلوين وأوزان خلايا جدول الأرشيف ومنع تسريب الـ CSS للسايدبار وهيدر المنظومة */
        .premium-contracts-table thead th {
          font-size: 0.75rem !important;
          font-weight: 500 !important;
          color: #D4AF37 !important;
          text-align: right !important;
          background-color: #020B1C !important;
          border-bottom: 2px solid rgba(212, 175, 55, 0.3) !important;
          padding: 14px 16px !important;
          letter-spacing: normal !important;
        }

        .premium-contracts-table tbody td {
          font-size: 0.8rem !important;
          font-weight: 400 !important;
          text-align: right !important;
          border-bottom: 1px solid rgba(212, 175, 55, 0.1) !important;
          padding: 14px 16px !important;
          letter-spacing: normal !important;
        }

        .premium-contracts-table tbody tr:hover {
          background-color: rgba(7, 19, 42, 0.8) !important;
        }
      `}} />

      <section className="w-full lg:pr-56 min-h-screen flex flex-col z-10 relative">
        <Header />
        <div className="p-4 md:p-8 space-y-6 text-right select-none animate-fade-in">

          <div className="border-b border-[#D4AF37]/20 pb-5">
            <h1 className="text-xl md:text-2xl font-bold text-[#D4AF37] flex items-center gap-2 select-none">
              <span>أرشيف وإدارة الوثائق والتعاقدات</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-pulse" />
            </h1>
            <p className="text-white text-xs mt-2">توثيق وأرشفة عقود الملاك، مقاولي الباطن، الشركات الموردة، وتراخيص ومستندات الشركة وحفظها على Google Drive.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* نموذج إضافة وتوثيق المستندات مدمج بإطار شفاف رقيق وموحد مع كرت ذكي بكسلياً */}
            <div className="bg-[#07132a] border-2 border-[#D4AF37] rounded-[2rem] p-6 space-y-5 h-fit shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />

              <h3 className="text-[#D4AF37] font-bold text-sm md:text-md border-b border-[#D4AF37] pb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D4AF37] animate-pulse" />
                <span>أرشفة وتوثيق مستند / عقد جديد</span>
              </h3>

              <div className="space-y-4 font-semibold text-xs">

                <div>
                  <label className="block text-[#D4AF37] font-bold px-2 text-[13px] mb-1.5">اسم الوثيقة / العقد بالتفصيل *</label>
                  <input
                    type="text"
                    placeholder="مثال: عقد تشطيب شقة التجمع عميل/ ناصر"
                    value={cTitle}
                    onChange={(e) => setCTitle(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#F0E6D2] px-4 outline-none focus:border-[#D4AF37] placeholder:text-slate-600 transition-all font-medium text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#D4AF37] mb-1.5 font-bold px-2 text-[10px] whitespace-nowrap">نوع وتصنيف التعاقد *</label>
                    <select
                      value={cType}
                      onChange={(e) => setCType(e.target.value)}
                      className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] font-black px-3 outline-none cursor-pointer focus:border-[#D4AF37] text-xs"
                    >
                      <option>عقد عميل نهائي</option>
                      <option>عقد مقاول باطن</option>
                      <option>اتفاقية شركة / مورد</option>
                      <option>عقد إيجار / تشغيل مقرات</option>
                      <option>تراخيص ومستندات حكومية</option>
                      <option>أخرى</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#D4AF37] mb-1.5 font-bold px-2 text-[10px] whitespace-nowrap">اسم الطرف الثاني للتعاقد *</label>
                    <input
                      type="text"
                      placeholder="الشركة / الشخص المسؤول"
                      value={cParty}
                      onChange={(e) => setCParty(e.target.value)}
                      className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-4 outline-none focus:border-[#D4AF37] placeholder:text-slate-600 transition-all font-medium text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#D4AF37] mb-1.5 font-bold text-[13px]">📁 رابط الملف المرفوع بـ (Google Drive) *</label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/..."
                    value={cUrl}
                    onChange={(e) => setCUrl(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-emerald-400 px-4 outline-none font-mono focus:border-[#D4AF37] placeholder:text-slate-600 transition-all text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[#D4AF37] mb-1.5 font-bold px-2 text-[13px]">ملاحظات وشروط إضافية للمستند</label>
                  <textarea
                    placeholder="شروط التعاقد، المواعيد، أو أي تفاصيل هامة..."
                    value={cNotes}
                    onChange={(e) => setCNotes(e.target.value)}
                    className="w-full h-20 bg-[#020B1C] border border-[#D4AF37]/20 text-[#F0E6D2] p-3 rounded-xl outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder-slate-600 resize-none font-medium text-xs"
                  />
                </div>

                {/* 🌟 زر الإضافة السحابية المطور بالكبسولة المذهب المستطيلة المعتمدة بالخزينة لتوحيد الرؤية */}
                <div className="relative group w-full">
                  <button
                    type="button" 
                    onClick={(e) => { e.preventDefault(); handleAddContract(); }}
                    disabled={saving}
                    className="w-full px-6 py-3 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.01] active:scale-95 transition-all duration-300 text-xs font-black flex items-center justify-center gap-1.5 select-none relative overflow-hidden disabled:opacity-40"
                  >
                    {saving ? <Loader2 className="animate-spin w-4 h-4 text-[#D4AF37]" /> : "💾 توثيق وأرشفة المستند"}
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
                  </button>
                  <div className="absolute bottom-full mb-2.5 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                    <div className="bg-[#07132a] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-bold py-1.5 px-3 rounded-lg shadow-2xl relative">
                      ⚙️ حفظ وتوثيق الوثيقة الجديدة تلقائياً في السحاب والأرشيف العام
                      <div className="absolute top-full right-1/2 translate-x-1/2 w-1.5 h-1.5 bg-[#07132a] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* كشف الأرشيف السحابي الموحد مدمج بالإطارات شبه الشفافة الفاخرة ومحمي بـ whitespace-nowrap من التداخل */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#07132a] border-2 border-[#D4AF37] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col relative w-full">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />

                <div className="p-4 border-b border-[#D4AF37] bg-[#0b1b3d]/60 flex flex-col sm:flex-row justify-between items-center gap-4 select-none">
                  <h3 className="text-[#D4AF37] font-bold text-sm md:text-md flex items-center gap-2">
                    <FileText size={18} />
                    <span>كشوف العقود والوثائق المؤرشفة بالمنظومة ({filteredContracts.length})</span>
                  </h3>

                  {/* شريط البحث المذهب المطور مع فوكس ذهبي رقيق */}
                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="ابحث باسم المستند، الطرف الثاني..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-10 rounded-full bg-[#020B1C] border border-[#D4AF37]/35 text-[#F0E6D2] pr-11 pl-4 text-xs font-bold outline-none focus:border-[#D4AF37] transition-all placeholder-slate-500"
                    />
                    <Search className="absolute right-4 top-3 text-[#D4AF37] w-4 h-4" />
                  </div>
                </div>

                {/* تفعيل التمرير مذهب الألوان وحماية الجدول من التقاطع بـ whitespace-nowrap و min-w-[850px] بالكامل */}
                <div className="overflow-x-auto w-full max-w-full max-h-[460px] overflow-y-auto ai-chat-scroll">
                  {loading ? (
                    <div className="p-12 text-center text-[#D4AF37] animate-pulse text-xs font-bold flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin" size={16} />
                      <span>جاري مزامنة وسحب مستندات جوجل درايف...</span>
                    </div>
                  ) : filteredContracts.length > 0 ? (
                    <table className="w-full text-right table-auto min-w-[850px] premium-contracts-table">
                      <thead>
                        <tr className="whitespace-nowrap">
                          <th>كود المستند</th>
                          <th>اسم العقد / المستند</th>
                          <th>نوع وتصنيف التعاقد</th>
                          <th>اسم الطرف الثاني</th>
                          <th>تاريخ الأرشفة</th>
                          <th className="text-center">فتح الملف</th>
                          <th className="text-center">إجراء الأرشيف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1f2d4d]/60">
                        {filteredContracts.map((doc) => (
                          <tr key={doc.id} className="whitespace-nowrap">
                            <td className="font-mono text-[#D4AF37] font-medium">{doc.code}</td>
                            <td className="font-black text-slate-100">{doc.title}</td>
                            <td>
                              <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-black border border-blue-500/20">
                                {doc.contract_type}
                              </span>
                            </td>
                            <td className="text-[#F0E6D2] font-bold">{doc.party_name}</td>
                            <td className="font-mono text-slate-400 text-xs">{formatArchiveDate(doc.created_at)}</td>
                            <td className="text-center">
                              {/* مديول فتح المستند في تصفيف خارجي للعميل */}
                              <a
                                href={doc.contract_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-[#34d399] hover:text-emerald-300 hover:underline font-black text-xs transition-all"
                              >
                                🔗 فتح بـ Google Drive
                              </a>
                            </td>
                            <td className="text-center">
                              {/* زر الحذف الفخم مع التولتيب وحشوة النقر التفاعلية المعتمدة بالدستور */}
                              <div className="relative group inline-block">
                                <button
                                  type="button" 
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteContract(doc.id, doc.title); }}
                                  className="text-rose-400 hover:text-rose-500 font-black text-xs transition-all cursor-pointer inline-flex items-center gap-1 hover:scale-105 active:scale-95 py-1 px-2.5 rounded-lg border border-rose-500/10 hover:bg-rose-500/5"
                                >
                                  <Trash2 size={12} />
                                  <span>حذف المستند</span>
                                </button>
                                <div className="absolute bottom-full mb-2 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                                  <div className="bg-[#07132a] border border-rose-500/30 text-rose-400 text-[9px] font-black py-1 px-2.5 rounded shadow-2xl relative">
                                    🚨 حذف المستند وإلغاء أرشيفه نهائياً
                                    <div className="absolute top-full right-1/2 translate-x-1/2 w-1.5 h-1.5 bg-[#07132a] border-r border-b border-rose-500/30 rotate-45 -mt-1" />
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-12 text-center text-slate-500 font-bold text-xs">لا توجد وثائق مسجلة فى قاعدة البيانات حالياً.</div>
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