"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useCRM } from "@/components/CRM/context/CRMContext";
import { isOnline } from "@/lib/offline-sync";
import { Lock, X } from "lucide-react";

// استيراد مكون المبيعات الفعال الخاص بك
import SalesChat from "@/components/CRM/AI/SalesAssistant/SalesChat";

interface AIEmployee {
  id: string;
  name: string;
  role: string;
  description: string;
  status: string;
  icon: string;
  color: string;
  promptExample: string;
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

export default function AIAssistantPage() {
  const router = useRouter();
  const { crmData, setCRMData } = useCRM();

  const [activeEmployee, setActiveEmployee] = useState<AIEmployee | null>(null);
  const [chatMessage, setChatQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);

  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [visionAnalysis, setVisionAnalysis] = useState<string | null>(null);
  const [loadingVision, setLoadingVision] = useState(false);

  const [ceilingLocation, setCeilingLocation] = useState("all");
  const [userRole, setUserRole] = useState<string>("sales");

  useEffect(() => {
    document.title = "المساعدون الأذكياء | Golden Decoration";
    loadCurrentUserRole();
  }, []);

  async function loadCurrentUserRole() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      
      if (profile?.role) {
        setUserRole(profile.role.toLowerCase());
      }
    } catch (e) {
      console.error("Error loading user role for AI panel:", e);
    }
  }

  const checkCardPermission = (empId: string): boolean => {
    const role = userRole.toLowerCase();
    if (["admin", "owner", "manager"].includes(role)) return true;

    switch (empId) {
      case "design-analyzer":
        return ["sales_manager", "sales", "engineer"].includes(role);
      case "sales":
        return ["sales_manager", "sales"].includes(role);
      case "estimate":
        return ["engineer"].includes(role);
      case "pm":
        return ["engineer"].includes(role);
      case "procurement":
        return ["procurement", "engineer"].includes(role);
      case "finance":
        return ["accountant"].includes(role); // المحاسب المالي accountant
      default:
        return false;
    }
  };

  useEffect(() => {
    const isProjectNeeded = ["procurement", "estimate", "finance"].includes(activeEmployee?.id || "");
    if (!isProjectNeeded) return;

    async function fetchActiveProjects() {
      setLoadingProjects(true);
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("id, project_name, location")
          .order("project_name", { ascending: true });

        if (error) throw error;
        setProjects(data || []);
      } catch (err: any) {
        console.error("Error fetching projects list:", err);
      } finally {
        setLoadingProjects(false);
      }
    }

    fetchActiveProjects();
  }, [activeEmployee]);

  const aiEmployees: AIEmployee[] = [
    {
      id: "design-analyzer",
      name: "محلل التصاميم والديكور البصري",
      role: "AI Interior Design Analyzer",
      description: "مسؤول عن قراءة وتحليل صور التصاميم ثلاثية الأبعاد بذكاء الرؤية الحاسوبية، واستخراج ألوان الحوائط والأسقف، وتحديد خامات الأرضيات والوزر والديكورات المكتشفة بالصورة، وتقدير تكلفتها الإجمالية بناءً عليها.",
      status: "متصل - جاهز للتحليل البصري",
      icon: "🖼️",
      color: "border-[#D4AF37]/40 hover:border-[#D4AF37]/80 hover:shadow-[0_4px_20px_rgba(212,175,55,0.15)]",
      promptExample: ""
    },
    {
      id: "sales",
      name: "مساعد المبيعات الذكي",
      role: "AI Sales Assistant",
      description: "مسؤول عن الرد الفوري على استفسارات العملاء، وتقدير تكلفة التشطيبات ومدة التنفيذ التقريبية، وصياغة عروض الأسعار ورسائل الواتساب الجاهزة للإرسال.",
      status: "متصل - نشط الآن",
      icon: "💬",
      color: "border-[#D4AF37]/40 hover:border-[#D4AF37]/80 hover:shadow-[0_4px_20px_rgba(212,175,55,0.15)]",
      promptExample: "عايز أشطب شقة 120 متر سوبر لوكس بالتجمع"
    },
    {
      id: "estimate", 
      name: "مهندس التسعير وحساب الكميات",
      role: "AI BOQ Generator",
      description: "مهندس حساب كميات ذكي مخصص لتوليد وتفريد خامات الأسمنت والرمل والدهانات ومواسير السباكة والكهرباء تلقائياً بناءً على مساحات ومواصفات العقد.",
      status: "متصل - جاهز لتفريد المواد",
      icon: "📐",
      color: "border-[#D4AF37]/30 hover:border-[#D4AF37]/70 hover:shadow-[0_4px_20px_rgba(212,175,55,0.15)]",
      promptExample: "احسب خامات المحارة والدهانات لشقة مساحتها 150 متر"
    },
    {
      id: "pm",
      name: "مدير المشاريع الذكي",
      role: "AI Project Manager",
      description: "يحلل الجداول الزمنية والمهام اليومية بالمواقع ويحدد المشاريع المتأخرة والمهندسين المسؤولين عنها ويقترح حلولاً لتفادي غرامات التأخير في التسليم.",
      status: "يحلل المهام الحالية بالمواقع ",
      icon: "📋",
      color: "border-[#D4AF37]/30 hover:border-[#D4AF37]/70 hover:shadow-[0_4px_20px_rgba(212,175,55,0.15)]",
      promptExample: "ما هي المشاريع المتأخرة هذا الأسبوع وما سبب التأخير؟"
    },
    {
      id: "procurement", 
      name: "مساعد المشتريات والمخازن",
      role: "AI Procurement Assistant",
      description: "يحلل متطلبات التشغيل للمواقع الحالية والمخزون، ويصدر كشوفاً تفصيلية بالمواد والخامات المطلوب شراؤها أسبوعياً بأسعار الموردين لتفادي توقف الأعمال.",
      status: "مستعد لتحليل طلبات التوريد",
      icon: "🛒",
      color: "border-[#D4AF37]/30 hover:border-[#D4AF37]/70 hover:shadow-[0_4px_20px_rgba(212,175,55,0.15)]",
      promptExample: "ما هي الخامات والمواد المطلوب شراؤها غداً لموقع التجمع"
    },
    {
      id: "finance", 
      name: "محلل الأرباح والميزانية الذكي",
      role: "Finance Profit Intelligence",
      description: "مساعد مالي ذكي يحلل الميزانيات، المقبوضات من العملاء، مستخلصات مقاولي الباطن، المشتريات، والمصروفات النثرية ليعطيك صافي الأرباح الدقيقة للشركة.",
      status: "متصل - يحلل الخزينة والمستحقات ",
      icon: "📊",
      color: "border-[#D4AF37]/30 hover:border-[#D4AF37]/70 hover:shadow-[0_4px_20px_rgba(212,175,55,0.15)]",
      promptExample: "احسب لي صافي أرباح مشروع فيلا النرجس بعد خصم الخامات"
    }
  ];

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
      setVisionAnalysis(null);
    };
    reader.readAsDataURL(file);
  }

  async function handleAnalyzeDesignImage() {
    if (!isOnline()) {
      alert("عذراً، يتطلب تحليل الصور اتصالاً نشطاً بالإنترنت.");
      return;
    }
    if (!imagePreview) {
      alert("يرجى رفع صورة التصميم أولاً للبدء بتحليلها.");
      return;
    }
    setLoadingVision(true);
    try {
      const res = await fetch("/api/ai/design-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: imagePreview })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل المساعد البصري.");
      setVisionAnalysis(data.analysis);
    } catch (err: any) {
      alert("حدث خطأ أثناء تحليل التصميم: " + err.message);
    } finally {
      setLoadingVision(false);
    }
  }

  async function handleAuditProjects() {
    if (!isOnline()) {
      alert("عذراً، يتطلب تدقيق المشاريع اتصالاً نشطاً بالإنترنت.");
      return;
    }
    setLoadingVision(true);
    setVisionAnalysis(null);
    try {
      const res = await fetch("/api/ai/projects", { method: "GET" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل مدير المشاريع.");
      setVisionAnalysis(data.analysis);
    } catch (err: any) {
      alert("حدث خطأ أثناء فحص المشاريع: " + err.message);
    } finally {
      setLoadingVision(false);
    }
  }

  async function handleAnalyzeProcurement() {
    if (!isOnline()) {
      alert("عذراً، يتطلب جرد المشتريات اتصالاً نشطاً بالإنترنت.");
      return;
    }
    if (!selectedProjectId) {
      alert("يرجى اختيار المشروع المراد تحليل مشترياته أولاً.");
      return;
    }
    setLoadingVision(true);
    setVisionAnalysis(null);
    try {
      const res = await fetch("/api/ai/procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProjectId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل مساعد المشتريات.");
      setVisionAnalysis(data.analysis); 
    } catch (err: any) {
      alert("حدث خطأ أثناء تحليل المشتريات: " + err.message);
    } finally {
      setLoadingVision(false);
    }
  }

  async function handleAnalyzeEstimate() {
    if (!isOnline()) {
      alert("عذراً، يتطلب حصر الكميات اتصالاً نشطاً بالإنترنت.");
      return;
    }
    if (!selectedProjectId) {
      alert("يرجى اختيار المشروع المراد حساب وحصر خاماته أولاً.");
      return;
    }
    setLoadingVision(true);
    setVisionAnalysis(null);
    try {
      const res = await fetch("/api/ai/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          projectId: selectedProjectId,
          ceilingLocation: ceilingLocation 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل مهندس حساب الكميات.");
      setVisionAnalysis(data.analysis); 
    } catch (err: any) {
      alert("حدث خطأ أثناء حصر الكميات: " + err.message);
    } finally {
      setLoadingVision(false);
    }
  }

  async function handleAnalyzeFinance() {
    if (!isOnline()) {
      alert("عذراً، يتطلب التحليل المالي للأرباح اتصالاً نشطاً بالإنترنت.");
      return;
    }
    if (!selectedProjectId) {
      alert("يرجى اختيار المشروع المطلوب تحليل ميزانيته وحساب أرباحه أولاً.");
      return;
    }
    setLoadingVision(true);
    setVisionAnalysis(null);
    try {
      const res = await fetch("/api/ai/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProjectId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل المحلل المالي.");
      setVisionAnalysis(data.analysis); 
    } catch (err: any) {
      alert("حدث خطأ أثناء التحليل المالي للموقع: " + err.message);
    } finally {
      setLoadingVision(false);
    }
  }

  async function handleSendMessage() {
    if (!chatMessage.trim() || !activeEmployee) return;

    if (!isOnline()) {
      alert("عذراً، يتطلب الاتصال بالمساعد الذكي اتصالاً نشطاً بالإنترنت.");
      return;
    }

    const userText = chatMessage.trim();
    setChatQuery("");

    const userMsg = { sender: "user", text: userText };
    setChatHistory((prev) => [...prev, userMsg]);
    setLoadingChat(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: activeEmployee.id,
          message: userText,
          history: chatHistory
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الموظف الذكي.");
      const aiResponse = { sender: "ai", text: data.reply };
      setChatHistory((prev) => [...prev, aiResponse]);
    } catch (err: any) {
      const errResponse = { sender: "ai", text: `عذراً، واجهت مشكلة في الاتصال بالمساعد الذكي: ${err.message}` };
      setChatHistory((prev) => [...prev, errResponse]);
    } finally {
      setLoadingChat(false);
    }
  }

  return (
    <main className="min-h-screen flex bg-[#020B1C]">
      {/* تضمين تنسيقات شريط التمرير بالأسهم الذهبية والأنيميشن في النوافذ المنبثقة وصناديق المحادثات */}
      <style jsx global>{`
        .ai-chat-scroll::-webkit-scrollbar {
          width: 8px !important;
        }
        .ai-chat-scroll::-webkit-scrollbar-track {
          background: #020B1C !important;
        }
        .ai-chat-scroll::-webkit-scrollbar-thumb {
          background: #D4AF37 !important;
          border-radius: 9999px !important;
        }
        .ai-chat-scroll::-webkit-scrollbar-thumb:hover {
          background: #C9A45D !important;
        }
        .ai-chat-scroll::-webkit-scrollbar-button {
          display: block !important;
          background-color: #020B1C !important;
          height: 10px !important;
          width: 10px !important;
        }
        .ai-chat-scroll::-webkit-scrollbar-button:vertical:decrement {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23D4AF37'><polygon points='50,20 15,80 85,80'/></svg>") !important;
          background-size: 6px !important;
          background-repeat: no-repeat !important;
          background-position: center !important;
        }
        .ai-chat-scroll::-webkit-scrollbar-button:vertical:increment {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23D4AF37'><polygon points='15,20 85,20 50,80'/></svg>") !important;
          background-size: 6px !important;
          background-repeat: no-repeat !important;
          background-position: center !important;
        }
      `}</style>

      <Sidebar />
      <section dir="rtl" className="w-full lg:pr-56 m-0 min-h-screen flex flex-col">
        <Header />
        
        <div className="p-8 space-y-8">
          <div>
            {/* 🌟 تصغير العناوين الرئيسية للتأقلم مع شاشات الجوال كقاعدة صارمة */}
            <h1 className="text-xl md:text-2xl font-extrabold text-[#D4AF37] tracking-wide">لوحة تحكم المساعدين الأذكياء</h1>
            {/* 🌟 تحويل لون التعريف بالكامل للأبيض الصافي لتعزيز التباين */}
            <p className="text-white text-xs md:text-sm mt-2 ">مساعدون حقيقيون مدعومون بالذكاء الاصطناعي لتحليل البيانات واتخاذ القرار الفوري للشركة.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {aiEmployees.map((emp) => {
              const isAllowed = checkCardPermission(emp.id);
              return (
                <div
                  key={emp.id}
                  className={`p-6 rounded-2xl bg-[#07132a] border transition-all duration-300 transform hover:scale-[1.01] flex flex-col justify-between relative overflow-hidden ${emp.color} ${!isAllowed ? "opacity-50" : ""}`}
                >
                  {/* قفل مذهب مدمج مع مصفوفة حماية الرتب */}
                  {!isAllowed && (
                    <div className="absolute top-3 left-3 bg-rose-950/80 border border-rose-500/30 text-rose-200 text-[10px] font-black py-1 px-3 rounded-full flex items-center gap-1.5 select-none z-20">
                      <Lock size={10} /> غير مصرح لرتبتك
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-3xl select-none">{emp.icon}</span>
                      <div className="flex items-center gap-2 bg-[#020B1C] px-3 py-1 rounded-full border border-[#D4AF37]/20">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] text-emerald-400 ">{emp.status}</span>
                      </div>
                    </div>

                    <div>
                      {/* 🌟 تحويل مسميات كروت الموظفين الـ 6 للون البني البرونزي المعتمد `#A17A4C` وبمقاس أدق */}
                      <h3 className="text-[#D4AF37] text-sm md:text-base font-black">{emp.name}</h3>
                      <p className="text-gray-500 text-[10px] font-mono mt-1">{emp.role}</p>
                      <p className="text-gray-300 text-xs mt-3 leading-relaxed ">{emp.description}</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#D4AF37]">
                    <button
                      onClick={() => {
                        if (!isAllowed) return;
                        setActiveEmployee(emp);
                        setChatHistory([]);
                        setChatQuery("");
                        setImagePreview(null);
                        setVisionAnalysis(null);
                        setSelectedProjectId("");
                        setCeilingLocation("all");
                      }}
                      disabled={!isAllowed}
                      className={`w-full h-11 rounded-full text-[#020B1C] font-black text-xs md:text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                        isAllowed 
                          ? "bg-gradient-to-r from-[#D4AF37] to-[#F1E5C6] hover:from-[#B48C34] hover:to-[#E5D7B3] shadow-md hover:shadow-[#D4AF37]/15 cursor-pointer" 
                          : "bg-gray-800 text-gray-500 border border-transparent cursor-not-allowed"
                      }`}
                    >
                      {isAllowed ? "💬 استشارة الموظف الذكي" : "🔒 مغلق لعدم الصلاحية"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* نوافذ عرض الكروت الـ 6 */}
      {activeEmployee && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center z-50 transition-all duration-300 overflow-y-auto py-10 px-4">
          
          {activeEmployee.id === "sales" && (
            <div className="w-full max-w-2xl bg-[#07132a] border border-[#D4AF37]/40 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-4 bg-[#0b1d3d] border-b border-[#D4AF37]/20 flex justify-between items-center" dir="rtl">
                {/* 🌟 تحويل ترويسة العنوان داخل منبثق المبيعات للون البني البرونزي `#A17A4C` */}
                <span className="text-[#A17A4C] font-black text-xs md:text-sm">💬 مساعد المبيعات الذكي | جولد ديكوريشن</span>
                <button 
                  onClick={() => setActiveEmployee(null)} 
                  className="w-8 h-8 rounded-full bg-[#020B1C] border border-[#D4AF37] text-[#D4AF37] hover:text-red-400 hover:border-red-500/20 transition-all flex items-center justify-center font-bold text-xs cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 ai-chat-scroll">
                <SalesChat />
              </div>
            </div>
          )}

          {activeEmployee.id === "design-analyzer" && (
            <div className="w-full max-w-2xl bg-[#07132a] border border-[#D4AF37]/40 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-4 bg-[#0b1d3d] border-b border-[#D4AF37]/20 flex justify-between items-center" dir="rtl">
                {/* 🌟 تحويل الترويسة للون البني البرونزي المعتمد */}
                <span className="text-[#A17A4C] font-black text-xs md:text-sm">🖼️ محلل التصاميم والديكور البصري | جولد ديكوريشن</span>
                <button 
                  onClick={() => setActiveEmployee(null)} 
                  className="w-8 h-8 rounded-full bg-[#020B1C] border border-[#D4AF37]/30 text-[#D4AF37] hover:text-red-400 hover:border-red-500/20 transition-all flex items-center justify-center font-bold text-xs cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 ai-chat-scroll space-y-6 text-right" dir="rtl">
                <p className="text-white text-xs font-semibold">قم برفع صورة التصميم ثلاثي الأبعاد ليقوم الذكاء الاصطناعي بقراءتها وتفريد خاماتها ودرجات ألوانها وتقدير تكلفتها فوراً:</p>
                <div className="flex flex-col items-center justify-center p-6 border border-dashed border-[#D4AF37]/30 rounded-xl hover:border-[#D4AF37]/80 bg-[#020B1C] transition duration-200">
                  <input type="file" accept="image/*" id="design-image-upload" onChange={handleImageUpload} className="hidden" />
                  {imagePreview ? (
                    <div className="space-y-4 flex flex-col items-center">
                      <img src={imagePreview} alt="Preview" className="max-h-64 rounded-xl border border-[#D4AF37]/20 shadow-lg" />
                      <label htmlFor="design-image-upload" className="px-5 py-2.5 rounded-full border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-xs font-black transition-all duration-300 cursor-pointer">🔄 تغيير الصورة</label>
                    </div>
                  ) : (
                    <label htmlFor="design-image-upload" className="flex flex-col items-center justify-center cursor-pointer space-y-2 text-gray-400 hover:text-[#D4AF37] transition duration-150">
                      <span className="text-5xl select-none">📷</span>
                      <span className="text-xs font-bold">اضغط هنا واطلع على صورة التصميم</span>
                      <span className="text-[10px] text-gray-500 font-bold">يدعم صيغ JPG, PNG, WEBP</span>
                    </label>
                  )}
                </div>
                {imagePreview && !visionAnalysis && (
                  <button
                    onClick={handleAnalyzeDesignImage}
                    disabled={loadingVision}
                    className="w-full h-11 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F1E5C6] hover:from-[#B48C34] hover:to-[#E5D7B3] text-[#020B1C] font-black text-xs md:text-sm transition-all duration-300 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/15"
                  >
                    {loadingVision ? "جاري قراءة وتحليل خامات التصميم بالكامل..." : "🔍 بدء التحليل البصري واستخراج الخامات"}
                  </button>
                )}
                {visionAnalysis && (
                  <div className="bg-[#020B1C] border border-[#D4AF37]/30 rounded-xl p-5 space-y-3 transition-all duration-300 select-text">
                    <h4 className="text-[#A17A4C] font-black text-xs border-r-2 border-[#D4AF37] pr-2">📋 تقرير تحليل الديكور والخامات المستخرج:</h4>
                    <p className="text-gray-300 text-xs whitespace-pre-wrap leading-relaxed font-sans font-bold">
                      {visionAnalysis}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeEmployee.id === "pm" && (
            <div className="w-full max-w-2xl bg-[#07132a] border border-[#D4AF37]/40 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-4 bg-[#0b1d3d] border-b border-[#D4AF37]/20 flex justify-between items-center" dir="rtl">
                {/* 🌟 تحويل الترويسة للون البني البرونزي المعتمد */}
                <span className="text-[#A17A4C] font-black text-xs md:text-sm">📋 مدير المشاريع الذكي | جولد ديكوريشن</span>
                <button 
                  onClick={() => setActiveEmployee(null)} 
                  className="w-8 h-8 rounded-full bg-[#020B1C] border border-[#D4AF37]/30 text-[#D4AF37] hover:text-red-400 hover:border-red-500/20 transition-all flex items-center justify-center font-bold text-xs cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 ai-chat-scroll space-y-6 text-right" dir="rtl">
                <p className="text-white text-xs font-semibold">يقوم مدير المشاريع بالاستعلام اللحظي من قاعدة البيانات عن مهام المواقع، وتواريخ تسليمها، والمهندسين المسؤولين عنها لفلترة التأخيرات وكتابة تقرير تفصيلي بالحلول الفورية:</p>
                
                {!visionAnalysis && !loadingVision && (
                  <button
                    onClick={handleAuditProjects}
                    className="w-full h-11 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F1E5C6] hover:from-[#B48C34] hover:to-[#E5D7B3] text-[#020B1C] font-black text-xs md:text-sm transition-all duration-300 shadow-md hover:shadow-[#D4AF37]/15 cursor-pointer"
                  >
                    🔍 تشغيل الفحص الإداري وجلب التأخيرات 
                  </button>
                )}

                {loadingVision && (
                  <div className="bg-[#020B1C] border border-[#D4AF37]/20 rounded-xl p-6 text-center text-gray-400 text-xs font-bold flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" />
                    جاري جلب المهام وتحليل التأخيرات هندسياً ...
                  </div>
                )}

                {visionAnalysis && (
                  <div className="bg-[#020B1C] border border-[#D4AF37]/30 rounded-xl p-5 space-y-3 transition-all duration-300 select-text">
                    <h4 className="text-[#A17A4C] font-black text-xs border-r-2 border-[#D4AF37] pr-2">📋 تقرير تحليل المهام والتأخيرات بالمواقع:</h4>
                    <p className="text-gray-300 text-xs whitespace-pre-wrap leading-relaxed font-sans font-bold">
                      {visionAnalysis}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeEmployee.id === "procurement" && (
            <div className="w-full max-w-2xl bg-[#07132a] border border-[#D4AF37]/40 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-4 bg-[#0b1d3d] border-b border-[#D4AF37]/20 flex justify-between items-center" dir="rtl">
                {/* 🌟 تحويل الترويسة للون البني البرونزي المعتمد */}
                <span className="text-[#A17A4C] font-black text-xs md:text-sm">🛒 مساعد المشتريات والمخازن | جولد ديكوريشن</span>
                <button
                  onClick={() => {
                    setActiveEmployee(null);
                    setProjects([]);
                    setSelectedProjectId("");
                    setVisionAnalysis(null);
                  }}
                  className="w-8 h-8 rounded-full bg-[#020B1C] border border-[#D4AF37]/30 text-[#D4AF37] hover:text-red-400 hover:border-red-500/20 transition-all flex items-center justify-center text-xs cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 ai-chat-scroll space-y-6 text-right" dir="rtl">
                <p className="text-white text-xs font-semibold">يقوم مساعد المشتريات بقراءة البنود التفصيلية المضافة بالمقايسة للمشروع المحدد، ومطابقتها بالموردين المعتمدين لإصدار طلبات وجداول توريد الخامات أسبوعياً:</p>

                <div>
                  <label className="block text-xs mb-2 font-black text-[#D4AF37]">اختر المشروع لتحليل خاماته وتوريداته *</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value);
                      setVisionAnalysis(null);
                    }}
                    disabled={loadingProjects}
                    className="w-full h-11 rounded-lg bg-[#020B1C] border border-[#D4AF37]/30 text-white px-3 outline-none text-xs font-bold"
                  >
                    <option value="">{loadingProjects ? "جاري جلب المشاريع الحالية..." : "اختر المشروع التابع للعميل..."}</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.project_name} ({p.location})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProjectId && !visionAnalysis && !loadingVision && (
                  <button
                    onClick={handleAnalyzeProcurement}
                    className="w-full h-11 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F1E5C6] hover:from-[#B48C34] hover:to-[#E5D7B3] text-[#020B1C] font-black text-xs md:text-sm transition-all duration-300 shadow-md hover:shadow-[#D4AF37]/15 cursor-pointer"
                  >
                    🔍 تشغيل تحليل المشتريات وإصدار كشوف الخامات
                  </button>
                )}

                {loadingVision && (
                  <div className="bg-[#020B1C] border border-[#D4AF37]/20 rounded-xl p-6 text-center text-gray-400 text-xs font-bold flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" />
                    جاري جلب بنود المقايسة وربطها بالموردين ...
                  </div>
                )}

                {visionAnalysis && (
                  <div className="bg-[#020B1C] border border-[#D4AF37]/30 rounded-xl p-5 space-y-3 transition-all duration-300 select-text">
                    <h4 className="text-[#A17A4C] font-black text-xs border-r-2 border-[#D4AF37] pr-2">📋 كشوف طلبات التوريد والشراء الأسبوعية المقترحة:</h4>
                    <p className="text-gray-300 text-xs whitespace-pre-wrap leading-relaxed font-sans font-bold">
                      {visionAnalysis}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeEmployee.id === "estimate" && (
            <div className="w-full max-w-2xl bg-[#07132a] border border-[#D4AF37]/40 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-4 bg-[#0b1d3d] border-b border-[#D4AF37]/20 flex justify-between items-center" dir="rtl">
                {/* 🌟 تحويل الترويسة للون البني البرونزي المعتمد */}
                <span className="text-[#A17A4C] font-black text-xs md:text-sm">📐 مهندس التسعير وحساب الكميات | جولد ديكوريشن</span>
                <button
                  onClick={() => {
                    setActiveEmployee(null);
                    setProjects([]);
                    setSelectedProjectId("");
                    setVisionAnalysis(null);
                  }}
                  className="w-8 h-8 rounded-full bg-[#020B1C] border border-[#D4AF37]/30 text-[#D4AF37] hover:text-red-400 hover:border-red-500/20 transition-all flex items-center justify-center text-xs cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 ai-chat-scroll space-y-6 text-right" dir="rtl">
                <p className="text-white text-xs font-semibold">يقوم مهندس التسعير الذكي بقراءة الأبعاد الفنية للموقع وحساب وحصر إجمالي كميات الرمل والأسمنت والمعجون والدهانات والوزرات المطلوبة للتنفيذ تفصيلياً مع عرض معاملات الهلاك:</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs mb-2 font-black text-[#D4AF37]">اختر المشروع لإصدار كشف حصر خاماته بالتفصيل *</label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => {
                        setSelectedProjectId(e.target.value);
                        setVisionAnalysis(null);
                      }}
                      disabled={loadingProjects}
                      className="w-full h-11 rounded-lg bg-[#020B1C] border border-[#D4AF37]/30 text-white px-3 outline-none text-xs font-bold"
                    >
                      <option value="">{loadingProjects ? "جاري جلب المشاريع الحالية..." : "اختر المشروع التابع للعميل..."}</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.project_name} ({p.location})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs mb-2 font-black text-[#D4AF37]">تحديد موقع تركيب السقف المعلق (الجبس بورد) *</label>
                    <select
                      value={ceilingLocation}
                      onChange={(e) => {
                        setCeilingLocation(e.target.value);
                        setVisionAnalysis(null);
                      }}
                      className="w-full h-11 rounded-lg bg-[#020B1C] border border-[#D4AF37]/30 text-white px-3 outline-none text-xs font-bold"
                    >
                      <option value="all">الشقة كلها</option>
                      <option value="reception">الريسبشن فقط</option>
                      <option value="rooms">الغرف فقط</option>
                      <option value="none">لا يوجد سقف معلق</option>
                    </select>
                  </div>
                </div>

                {selectedProjectId && !visionAnalysis && !loadingVision && (
                  <button
                    onClick={handleAnalyzeEstimate}
                    className="w-full h-11 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F1E5C6] hover:from-[#B48C34] hover:to-[#E5D7B3] text-[#020B1C] font-black text-xs md:text-sm transition-all duration-300 shadow-md hover:shadow-[#D4AF37]/15 cursor-pointer"
                  >
                    🔍 تشغيل حصر الكميات وتوليد المقايسة الإنشائية
                  </button>
                )}

                {loadingVision && (
                  <div className="bg-[#020B1C] border border-[#D4AF37]/20 rounded-xl p-6 text-center text-gray-400 text-xs font-bold flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" />
                    جاري حساب المساحات وضرب المعاملات الهندسية للبنود...
                  </div>
                )}

                {visionAnalysis && (
                  <div className="bg-[#020B1C] border border-[#D4AF37]/30 rounded-xl p-5 space-y-3 transition-all duration-300 select-text">
                    <h4 className="text-[#A17A4C] font-black text-xs border-r-2 border-[#D4AF37] pr-2">📋 كشف حصر وتفريد المواد الإنشائية المتوقع للموقع:</h4>
                    <p className="text-gray-300 text-xs whitespace-pre-wrap leading-relaxed font-sans font-bold">
                      {visionAnalysis}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeEmployee.id === "finance" && (
            <div className="w-full max-w-2xl bg-[#07132a] border border-[#D4AF37]/40 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-4 bg-[#0b1d3d] border-b border-[#D4AF37]/20 flex justify-between items-center" dir="rtl">
                {/* 🌟 تحويل الترويسة للون البني البرونزي المعتمد */}
                <span className="text-[#A17A4C] font-black text-xs md:text-sm">📊 محلل الأرباح والميزانية الذكي | جولد ديكوريشن</span>
                <button
                  onClick={() => {
                    setActiveEmployee(null);
                    setProjects([]);
                    setSelectedProjectId("");
                    setVisionAnalysis(null);
                  }}
                  className="w-8 h-8 rounded-full bg-[#020B1C] border border-[#D4AF37]/30 text-[#D4AF37] hover:text-red-400 hover:border-red-500/20 transition-all flex items-center justify-center font-bold text-xs cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 ai-chat-scroll space-y-6 text-right" dir="rtl">
                <p className="text-white text-xs font-semibold">يقوم المحلل المالي بالاستعلام اللحظي من جدول الخزينة والقيود المالية، ليقوم بخصم كافة مصاريف خامات التوريد وأجور العمالة المصروفة للموقع من إجمالي المقبوضات لتحديد صافي الأرباح الدقيقة ونسبة ربحية الشركة:</p>

                <div>
                  <label className="block text-xs mb-2 font-black text-[#D4AF37]">اختر المشروع لإصدار تقريره المالي التفاعلي *</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value);
                      setVisionAnalysis(null);
                    }}
                    disabled={loadingProjects}
                    className="w-full h-11 rounded-lg bg-[#020B1C] border border-[#D4AF37]/30 text-white px-3 outline-none text-xs font-bold"
                  >
                    <option value="">{loadingProjects ? "جاري جلب المشاريع الحالية..." : "اختر المشروع التابع للعميل..."}</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.project_name} ({p.location})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProjectId && !visionAnalysis && !loadingVision && (
                  <button
                    onClick={handleAnalyzeFinance}
                    className="w-full h-11 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F1E5C6] hover:from-[#B48C34] hover:to-[#E5D7B3] text-[#020B1C] font-black text-xs md:text-sm transition-all duration-300 shadow-md hover:shadow-[#D4AF37]/15 cursor-pointer"
                  >
                    🔍 تشغيل تحليل ميزانية الموقع والأرباح الفعلية
                  </button>
                )}

                {loadingVision && (
                  <div className="bg-[#020B1C] border border-[#D4AF37]/20 rounded-xl p-6 text-center text-gray-400 text-xs font-bold flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" />
                    جاري جلب قيود الخزينة ومستخلصات الباطن وحساب صافي الهوامش...
                  </div>
                )}

                {visionAnalysis && (
                  <div className="bg-[#020B1C] border border-[#D4AF37]/30 rounded-xl p-5 space-y-3 transition-all duration-300 select-text">
                    <h4 className="text-[#A17A4C] font-black text-xs border-r-2 border-[#D4AF37] pr-2">📋 تقرير تحليل الميزانية وصافي هوامش أرباح الموقع:</h4>
                    <p className="text-gray-300 text-xs whitespace-pre-wrap leading-relaxed font-sans font-bold">
                      {visionAnalysis}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!["sales", "design-analyzer", "pm", "procurement", "estimate", "finance"].includes(activeEmployee?.id || "") && (
            <div className="bg-[#07132a] border border-[#D4AF37]/40 rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col justify-between overflow-hidden shadow-2xl mx-4">
              <div className="p-4 bg-[#0b1d3d] border-b border-[#D4AF37]/20 flex justify-between items-center" dir="rtl">
                <div className="flex items-center gap-3">
                  <span className="text-3xl select-none">{activeEmployee?.icon}</span>
                  <div className="text-right">
                    <h3 className="text-[#A17A4C] font-black text-sm">{activeEmployee?.name}</h3>
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      مستعد وجاهز للاستشارة
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveEmployee(null)} 
                  className="w-8 h-8 rounded-full bg-[#020B1C] border border-[#D4AF37]/30 text-[#D4AF37] hover:text-red-400 hover:border-red-500/20 transition-all flex items-center justify-center font-bold text-xs cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 p-6 overflow-y-auto ai-chat-scroll space-y-4 bg-[#020B1C]" dir="rtl">
                {chatHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <span className="text-5xl select-none">{activeEmployee?.icon}</span>
                    <p className="text-[#F0E6D2] font-bold">مرحباً بك! أنا مساعدك الذكي الخاص بـ {activeEmployee?.name}.</p>
                    <p className="text-gray-500 text-xs max-w-sm leading-relaxed">يمكنك سؤالي أو طلبي مباشرة، أو استخدام المثال الجاهز بالأسفل للضغط عليه وبدء التجربة فوراً!</p>
                    <button
                      onClick={() => setChatQuery(activeEmployee?.promptExample || "")}
                      className="text-xs bg-[#020B1C] border border-[#D4AF37]/30 hover:border-[#D4AF37] text-[#D4AF37] px-4 py-2.5 rounded-full transition-all duration-300 cursor-pointer"
                    >
                      💡 مثال للطلب: "{activeEmployee?.promptExample}"
                    </button>
                  </div>
                ) : (
                  chatHistory.map((msg, index) => (
                    <div key={index} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed ${
                        msg.sender === "user" ? "bg-gradient-to-r from-[#D4AF37] to-[#F1E5C6] text-[#020B1C] font-black rounded-tr-none" : "bg-[#07132a] border border-[#D4AF37]/20 text-[#F0E6D2] rounded-tl-none font-bold"
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
                {loadingChat && (
                  <div className="flex justify-start">
                    <div className="bg-[#07132a] border border-[#D4AF37]/20 text-gray-400 rounded-2xl p-4 text-[10px] font-bold flex items-center gap-2">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                      جاري التفكير وصياغة الرد...
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-[#D4AF37]/20 bg-[#0b1b3d] flex gap-3" dir="rtl">
                <input
                  type="text"
                  placeholder="اكتب استشارتك أو طلبك هنا للموظف الذكي..."
                  value={chatMessage}
                  onChange={(e) => setChatQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendMessage();
                  }}
                  className="flex-1 h-12 bg-[#020B1C] border border-[#D4AF37]/30 rounded-xl px-4 text-[#F0E6D2] font-bold outline-none focus:border-[#D4AF37] text-xs"
                />
                
                <button
                  onClick={handleSendMessage}
                  disabled={loadingChat}
                  className="bg-gradient-to-r from-[#D4AF37] to-[#F1E5C6] hover:from-[#B48C34] hover:to-[#E5D7B3] text-[#020B1C] px-6 py-3 rounded-full font-black hover:shadow-lg transition-all duration-300 text-xs disabled:opacity-50 cursor-pointer flex items-center justify-center"
                >
                  إرسال 🚀
                </button>
              </div>

            </div>
          )}
        </div>
      )}

    </main>
  );
}