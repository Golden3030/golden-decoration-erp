"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from "next/navigation"; 
import Sidebar from "@/components/layout/Sidebar"; 
import Header from "@/components/layout/Header"; 
import { useCRM } from "@/components/CRM/context/CRMContext";
import { supabase } from "@/lib/supabaseClient";
import { isOnline, addToOfflineQueue } from "@/lib/offline-sync";
import { 
  FolderCheck, 
  Search, 
  Sparkles, 
  Cpu, 
  Plus, 
  Minus, 
  Check, 
  EyeOff, 
  Eye, 
  Lock, 
  User, 
  Clock, 
  CalendarDays,
  Home,
  Hourglass,
  Calendar,
  Layers,
  MapPin,
  TrendingUp,
  Receipt,
  DollarSign,
  Trash2,
  FileSignature,
  Printer,
  ChevronDown,
  Loader2 
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  mobile?: string;
  assigned_to?: string;
}

interface Project {
  id: string;
  project_code: string;
  project_name: string;
  customer_id: string;
  location: string;
  unit_type: string;
  area: number;
  finishing_level: string;
  progress_percentage: number;
  unit_status: string;
  contract_value?: number;
  start_date?: string;
  provisional_delivery_date?: string;
  final_delivery_date?: string;
  design_embed_url?: string;
  receptions_count?: number;
  rooms_count?: number;
  bathrooms_count?: number;
  kitchens_count?: number;
  balconies_count?: number;
  living_count?: number;
  unit_address?: string;
  estimate_date?: string;
  workflow_stage?: string; 
  current_stage?: string;   
  assigned_engineer_id?: string; 
  corridors_count?: number;
  garden_exist?: boolean;
  garden_area?: number;
  stages_durations?: Record<string, number>;
  stages_exclusions?: number[];
  customers?: { 
    name: string;
    assigned_to?: string; 
  };
}

const STAGES_METADATA = [
  { id: 1, name: " التعديل المعمارى" },
  { id: 2, name: "اعمال المبانى" },
  { id: 3, name: "تأسيس أعمال السباكة" },
  { id: 4, name: "تأسيس أعمال الكهرباء " },
  { id: 5, name: "أعمال المحارة والمصيص" },
  { id: 6, name: "أعمال الجبس بورد والأسقف" },
  { id: 7, name: "أعمال الأرضيات" },
  { id: 8, name: "تأسيس الدهانات والنقاشة" },
  { id: 9, name: "تركيب الأبواب والنجارة" },
  { id: 10, name: "تركيب الألوميتال والشبابيك" },
  { id: 11, name: "التشطيبات النهائية" },
  { id: 12, name: " النظافة والتسليم النهائي" }
];

export default function ProjectsPage() {
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]); 
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userRole, setUserRole] = useState<string>("sales");
  const [currentUserId, setCurrentUserId] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState("");

  // حقول نموذج الإدخال والتحرير
  const [pName, setPName] = useState("");
  const [pCode, setPCode] = useState("");
  const [pLocation, setPLocation] = useState(""); 
  const [pUnitAddress, setPUnitAddress] = useState(""); 
  const [pCustomerId, setPCustomerId] = useState("");
  const [pUnitType, setPUnitType] = useState("شقة");
  const [pArea, setPArea] = useState<number | "">("");
  const [pFinishingLevel, setPFinishingLevel] = useState("متوسط (سوبر لوكس )");
  const [pProgress, setPProgress] = useState<number>(0);
  const [pUnitStatus, setPUnitStatus] = useState("معلق / قيد الانتظار");
  const [pDesignUrl, setPDesignUrl] = useState("");
  const [pContractValue, setPContractValue] = useState<number | "">("");
  const [pAssignedEngineerId, setPCAssignedEngineerId] = useState(""); 

  // التواريخ الأساسية والجدولة الزمنية
  const [pStartDate, setPStartDate] = useState("");
  const [pProvisionalDate, setPProvisionalDate] = useState("");
  const [pFinalDate, setPFinalDate] = useState("");

  // تفاصيل مكونات الشقة الميدانية
  const [pRooms, setPRooms] = useState<number>(2);
  const [pBaths, setPBaths] = useState<number>(1);
  const [pKitchens, setPKitchens] = useState<number>(1);
  const [pBalconies, setPBalconies] = useState<number>(1);
  const [pReceptions, setPReceptions] = useState<number>(1);
  const [pLiving, setPLiving] = useState<number>(1);
  
  // الإضافات الفاخرة المطلوبة للوحدات
  const [pCorridors, setPCorridors] = useState<number>(0);
  const [pGardenExist, setPGardenExist] = useState<boolean>(false);
  const [pGardenArea, setPGardenArea] = useState<number>(0);

  // مصفوفة الأيام والاستبعاد لكل مرحلة
  const [stagesDurations, setStagesDurations] = useState<Record<string, number>>({
    "1": 5, "2": 5, "3": 10, "4": 10, "5": 15, "6": 10, "7": 15, "8": 10, "9": 5, "10": 5, "11": 5, "12": 5
  });
  const [excludedStages, setExcludedStages] = useState<number[]>([]);

  // حالات جدولة الأقساط والدفعات المخططة للمشروع المختار
  const [projectInstallments, setProjectInstallments] = useState<any[]>([]);
  const [instMilestoneName, setInstMilestoneName] = useState("دفعة مقدمة عند توقيع العقد");
  const [instPercentage, setInstPercentage] = useState<number>(30);
  const [instAmount, setInstAmount] = useState<number>(0);
  const [instDueDate, setInstDueDate] = useState("");
  const [instLinkedStageId, setInstLinkedStageId] = useState<number | "">("");
  const [addingInst, setAddingInst] = useState(false);

  useEffect(() => {
    document.title = "مشاريع ومواقع التشطيب | Golden Decoration";
    loadProjectsData();
  }, []);

  // 🌟 محرك المزامنة الحيوية الذكية عند اختيار اسم العميل من المنسدلة لملء بياناته حياً من الحاسبة أو مشروعه المعتمد
  useEffect(() => {
    if (!pCustomerId) return;
    
    const handleCustomerChangeSync = async () => {
      try {
        const targetCustomer = customers.find(c => c.id === pCustomerId);
        if (!targetCustomer) return;

        // 1. الاستعلام السحابي إذا كان لديه مشروع نشط ومعتمد سابقاً
        const { data: existingProj } = await supabase
          .from("projects")
          .select("*")
          .eq("customer_id", pCustomerId)
          .maybeSingle();

        if (existingProj) {
          setPName(existingProj.project_name || "");
          setPCode(existingProj.project_code || "");
          setPLocation(existingProj.location || "");
          setPUnitAddress(existingProj.unit_address || "");
          setPUnitType(existingProj.unit_type || "شقة");
          setPArea(existingProj.area || "");
          setPFinishingLevel(existingProj.finishing_level || "متوسط (سوبر لوكس )");
          setPProgress(existingProj.progress_percentage || 0);
          setPUnitStatus(existingProj.unit_status || "معلق / قيد الانتظار");
          setPDesignUrl(existingProj.design_embed_url || "");
          setPContractValue(existingProj.contract_value !== null ? Number(existingProj.contract_value) : "");
          setPStartDate(existingProj.start_date || "");
          setPRooms(existingProj.rooms_count ?? 2);
          setPBaths(existingProj.bathrooms_count ?? 1);
          setPKitchens(existingProj.kitchens_count ?? 1);
          setPBalconies(existingProj.balconies_count ?? 1);
          setPReceptions(existingProj.receptions_count ?? 1);
          setPLiving(existingProj.living_count ?? 1);
          setPCorridors(existingProj.corridors_count || 0);
          setPGardenExist(existingProj.garden_exist || false);
          setPGardenArea(existingProj.garden_area || 0);
          setPCAssignedEngineerId(existingProj.assigned_engineer_id || "");
          return; // الخروج مبكراً لنجاح السحب
        }

        // 2. إذا لم يكن لديه مشروع، نقوم بسحب أمتاره الجوالة وحسابات الحاسبة من طلبات الإعلانات فورياً
        if (targetCustomer.mobile) {
          const { data: reqData } = await supabase
            .from("customer_requests")
            .select("area, region, finishing_level, estimatedMin")
            .eq("phone", String(targetCustomer.mobile).trim())
            .order("created_at", { ascending: false })
            .limit(1);

          if (reqData && reqData.length > 0) {
            const req = reqData[0];
            setPName(`مشروع العميل ${targetCustomer.name}`);
            setPLocation(req.region || "");
            setPUnitAddress(req.region || "");
            setPArea(Number(req.area || 0));
            setPContractValue(Number(req.estimatedMin || 0));
            
            const level = String(req.finishing_level).trim();
            if (level.includes("ألترا") || level.includes("فاخر")) {
              setPFinishingLevel("فاخر (الترا لوكس)");
            } else if (level.includes("سوبر")) {
              setPFinishingLevel("متوسط (سوبر لوكس )");
            } else {
              setPFinishingLevel("اقتصادى (لوكس)");
            }
          }
        }
      } catch (err) {
        console.error("Error syncing customer change details:", err);
      }
    };

    handleCustomerChangeSync();
  }, [pCustomerId, customers]);

  async function loadProjectsData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profile) setUserRole(String(profile.role).toLowerCase());
      }

      const [projRes, custRes, usersRes] = await Promise.all([
        supabase.from("projects").select("*, customers(name, assigned_to)").order("created_at", { ascending: false }),
        supabase.from("customers").select("id, name, assigned_to"),
        supabase.from("users").select("id, name, role")
      ]);

      if (projRes.error) throw projRes.error;
      setProjects(projRes.data || []);
      setCustomers(custRes.data || []);
      setUsersList(usersRes.data || []); 
    } catch (err: any) {
      console.error("Error loading projects page:", err.message);
    } finally {
      setLoading(false);
    }
  }

  // جلب أقساط ودفعات المشروع المختار
  async function loadProjectInstallments(projId: string) {
    try {
      const { data, error } = await supabase
        .from("project_installments")
        .select("*")
        .eq("project_id", projId)
        .order("due_date", { ascending: true });
      if (error) throw error;
      setProjectInstallments(data || []);
    } catch (err: any) {
      console.error("Error loading project installments:", err.message);
    }
  }

  // حساب أوزان الأعمال ومطابقتها التراكمية
  const normalizedStages = useMemo(() => {
    const activeStages = STAGES_METADATA.filter(s => !excludedStages.includes(s.id));
    const totalActiveWeight = activeStages.reduce((sum, s) => {
      const w = s.id === 3 || s.id === 4 ? 10 : s.id === 5 || s.id === 7 ? 15 : s.id === 8 || s.id === 6 ? 10 : 5;
      return sum + w;
    }, 0);

    let cumulativeSum = 0;
    return STAGES_METADATA.map(stage => {
      const isExcluded = excludedStages.includes(stage.id);
      const originalWeight = stage.id === 3 || stage.id === 4 ? 10 : stage.id === 5 || stage.id === 7 ? 15 : stage.id === 8 || stage.id === 6 ? 10 : 5;
      if (isExcluded) {
        return { ...stage, isExcluded: true, adjustedWeight: 0, cumulative: cumulativeSum, duration: 0 };
      }
      const adjustedWeight = totalActiveWeight > 0 ? (originalWeight / totalActiveWeight) * 100 : 0;
      cumulativeSum += adjustedWeight;
      return {
        ...stage,
        isExcluded: false,
        adjustedWeight,
        cumulative: Math.round(cumulativeSum),
        duration: Number(stagesDurations[stage.id] || 5)
      };
    });
  }, [excludedStages, stagesDurations]);

  // مجموع أيام البنود النشطة فقط (لتحديث التواريخ حياً)
  const totalActiveDurationDays = useMemo(() => {
    return normalizedStages.reduce((sum, s) => sum + (s.isExcluded ? 0 : s.duration), 0);
  }, [normalizedStages]);

  // تحديث التواريخ التلقائية حياً عند تغيير الأيام أو تاريخ بدء العمل الفعلي
  useEffect(() => {
    if (!pStartDate) return;
    const start = new Date(pStartDate);
    const provisional = new Date(start.getTime() + totalActiveDurationDays * 24 * 60 * 60 * 1000);
    const provStr = provisional.toISOString().split("T")[0];
    setPProvisionalDate(provStr);

    const final = new Date(provisional.getTime() + 30 * 24 * 60 * 60 * 1000);
    setPFinalDate(final.toISOString().split("T")[0]);
  }, [pStartDate, totalActiveDurationDays]);

  // أتمتة حساب قيمة القسط بناءً على النسبة وإجمالي قيمة العقد المدخلة
  useEffect(() => {
    if (pContractValue) {
      setInstAmount(Math.round((instPercentage / 100) * Number(pContractValue)));
    }
  }, [instPercentage, pContractValue]);

  const currentExecutionStageLabel = useMemo(() => {
    const activeAndNotCompleted = normalizedStages.find(stage => !stage.isExcluded && pProgress < stage.cumulative);
    return activeAndNotCompleted ? activeAndNotCompleted.name : "تم التسليم النهائي بالكامل 🎉";
  }, [pProgress, normalizedStages]);

  function selectProjectRow(proj: Project) {
    setSelectedProject(proj);
    setPName(proj.project_name || "");
    setPCode(proj.project_code || "");
    setPLocation(proj.location || "");
    setPUnitAddress(proj.unit_address || ""); 
    setPCustomerId(proj.customer_id || "");
    setPUnitType(proj.unit_type || "شقة");
    setPArea(proj.area || "");
    setPFinishingLevel(proj.finishing_level || "بدون تشطيب");
    setPProgress(proj.progress_percentage || 0);
    setPUnitStatus(proj.unit_status || "معلق / قيد الانتظار");
    setPDesignUrl(proj.design_embed_url || "");
    setPContractValue(proj.contract_value !== null && proj.contract_value !== undefined ? Number(proj.contract_value) : "");
    
    setPRooms(proj.rooms_count ?? 2);
    setPBaths(proj.bathrooms_count ?? 1);
    setPKitchens(proj.kitchens_count ?? 1);
    setPBalconies(proj.balconies_count ?? 1);
    setPReceptions(proj.receptions_count ?? 1);
    setPLiving(proj.living_count ?? 1);
    
    setPCorridors(proj.corridors_count || 0);
    setPGardenExist(proj.garden_exist || false);
    setPGardenArea(proj.garden_area || 0);
    setPCAssignedEngineerId(proj.assigned_engineer_id || "");

    setPStartDate(proj.start_date || "");

    if (proj.stages_durations) {
      setStagesDurations(proj.stages_durations);
    } else {
      setStagesDurations({
        "1": 5, "2": 5, "3": 10, "4": 10, "5": 15, "6": 10, "7": 15, "8": 10, "9": 5, "10": 5, "11": 5, "12": 5
      });
    }

    if (proj.stages_exclusions) {
      setExcludedStages(proj.stages_exclusions);
    } else {
      setExcludedStages([]);
    }

    loadProjectInstallments(proj.id);
  }

  // إضافة دفعة مجدولة جديدة لقاعدة البيانات
  async function handleAddInstallment(e: React.MouseEvent) {
    e.preventDefault(); // منع إعادة التحميل
    if (!selectedProject) return;
    if (!instMilestoneName || !instAmount) {
      alert("الرجاء ملء اسم الدفعة ومبلغ الاستحقاق لتسجيل القسط المجدول.");
      return;
    }

    setAddingInst(true);
    try {
      const { error } = await supabase
        .from("project_installments")
        .insert({
          project_id: selectedProject.id,
          milestone_name: instMilestoneName,
          percentage: Number(instPercentage),
          amount: Number(instAmount),
          due_date: instDueDate || null,
          linked_stage_id: instLinkedStageId !== "" ? Number(instLinkedStageId) : null,
          status: "pending"
        });

      if (error) throw error;
      alert("✅ تم إضافة وجدولة القسط المالي الجديد للمشروع بنجاح!");
      loadProjectInstallments(selectedProject.id);

      setInstMilestoneName("قسط إنشائي جاري بالموقع");
      setInstPercentage(15);
      setInstDueDate("");
      setInstLinkedStageId("");

    } catch (err: any) {
      alert("فشل إضافة القسط: " + err.message);
    } finally {
      setAddingInst(false);
    }
  }

  // حذف قسط مجدول من جدول الخطة
  async function handleDeleteInstallment(id: string) {
    const confirmDelete = window.confirm("هل أنت متأكد من حذف هذا القسط المجدول؟ سيؤدي هذا لمسحه من بوابة العميل.");
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("project_installments")
        .delete()
        .eq("id", id);

      if (error) throw error;
      alert("🗑️ تم حذف وإلغاء القسط المالي بنجاح!");
      if (selectedProject) loadProjectInstallments(selectedProject.id);
    } catch (err: any) {
      alert("فشل حذف القسط المالي: " + err.message);
    }
  }

  const isManager = ["admin", "owner", "manager", "sales_manager"].includes(userRole);
  const canEditFullDetails = ["admin", "owner", "manager", "accountant"].includes(userRole); 
  const canEditMilestones = ["admin", "owner", "manager", "engineer"].includes(userRole);
  const canEditTechnical = ["admin", "owner", "manager", "engineer", "procurement"].includes(userRole);
  const canChangeCustomer = ["admin", "owner", "manager"].includes(userRole);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((p) => {
      const matchName = String(p.project_name || "").toLowerCase().includes(query);
      const matchCode = String(p.project_code || "").toLowerCase().includes(query);
      return matchName || matchCode;
    });
  }, [projects, searchQuery]);

  const engineersList = useMemo(() => {
    return usersList.filter(u => String(u.role).toLowerCase() === "engineer");
  }, [usersList]);

  // معالجة وحل ثغرة تعطل تجميد اسم السيلز المكتوب عبر ربط الاقتران بـ pCustomerId بدلاً من المعرّف القديم
  const currentSalesRepName = useMemo(() => {
    const custId = pCustomerId; 
    if (!custId) return "غير محدد";
    const targetCust = customers.find(c => c.id === custId);
    if (!targetCust || !targetCust.assigned_to) return "غير مسند لـ سيلز";
    const matchedRep = usersList.find(u => u.id === targetCust.assigned_to);
    return matchedRep ? matchedRep.name : "غير مسند لـ سيلز";
  }, [pCustomerId, customers, usersList]); 

  // عداد ساعة رملية متوهجة تفاعلي للزمن المتبقي
  const remainingTimeBadge = useMemo(() => {
    if (!pFinalDate) return null;
    const today = new Date();
    const delivery = new Date(pFinalDate);
    const diffDays = Math.ceil((delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 30) {
      return (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-xs shadow-lg shadow-emerald-500/5 animate-pulse">
          <Hourglass size={14} className="animate-spin text-emerald-400" />
          <span>الوقت مستقر: متبقي {diffDays} يوم للتسليم</span>
        </div>
      );
    } else if (diffDays > 0) {
      return (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#C9A45D]/10 border border-[#C9A45D]/30 text-[#C9A45D] font-black text-xs shadow-lg shadow-[#D4AF37]/5 animate-pulse">
          <Hourglass size={14} className="text-[#C9A45D]" />
          <span>اقتراب الموعد: متبقي {diffDays} يوم فقط</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-black text-xs shadow-lg animate-bounce">
          <Hourglass size={14} className="text-rose-500" />
          <span>تنبيه تأخير: تجاوز موعد العقد بـ {Math.abs(diffDays)} يوم! 🚨</span>
        </div>
      );
    }
  }, [pFinalDate]);

  async function handleUpdateProject(e: React.MouseEvent) {
    e.preventDefault(); // منع إعادة التحميل
    if (!selectedProject) return;
    if (!pStartDate) {
      alert("⚠️ شروط تعاقدية إلزامية:\n\nيجب إدخال تاريخ بدء العمل الفعلي بالموقع لتسييل المخطط الزمني.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        project_name: pName,
        location: pLocation, 
        unit_address: pUnitAddress, 
        customer_id: pCustomerId,
        unit_type: pUnitType,
        area: Number(pArea),
        finishing_level: pFinishingLevel,
        progress_percentage: Number(pProgress),
        unit_status: pUnitStatus,
        start_date: pStartDate || null,
        provisional_delivery_date: pProvisionalDate || null,
        final_delivery_date: pFinalDate || null,
        design_embed_url: pDesignUrl || null,
        contract_value: Number(pContractValue || 0), 
        current_stage: currentExecutionStageLabel,    
        assigned_engineer_id: pAssignedEngineerId || null, 
        rooms_count: Number(pRooms),
        bathrooms_count: Number(pBaths),
        kitchens_count: Number(pKitchens),
        balconies_count: Number(pBalconies),
        receptions_count: Number(pReceptions),
        living_count: Number(pLiving),
        corridors_count: Number(pCorridors),
        garden_exist: pGardenExist,
        garden_area: pGardenExist ? Number(pGardenArea) : 0,
        stages_durations: stagesDurations,
        stages_exclusions: excludedStages
      };

      if (isOnline()) {
        const { error } = await supabase
          .from("projects")
          .update(payload)
          .eq("id", selectedProject.id);

        if (error) throw error;
        alert("✅ تم تعديل وحفظ الجدول المخطط الزمني ومكونات الشقة بالموقع بنجاح!");
      } else {
        addToOfflineQueue("projects", "UPDATE", { ...payload, id: selectedProject.id });
        alert("⚠️ تم حفظ التعديلات محلياً؛ وسيتم تحديث السحاب فور عودة الإنترنت.");
      }
      loadProjectsData();
    } catch (err: any) {
      alert("خطأ أثناء الحفظ الميداني: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  const toggleStageStatus = (stageCumulative: number) => {
    if (!canEditMilestones) {
      alert("🛑 محاولة مرفوضة: تحرير واعتماد البنود الإنشائية من صلاحية مهندس الموقع أو الإدارة فقط.");
      return;
    }
    if (pProgress >= stageCumulative) {
      const prevActiveStage = [...normalizedStages]
        .reverse()
        .find(s => !s.isExcluded && s.cumulative < stageCumulative);
      setPProgress(prevActiveStage ? prevActiveStage.cumulative : 0);
    } else {
      setPProgress(stageCumulative);
    }
  };

  const toggleExcludeStage = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    e.preventDefault(); // منع إعادة التحميل
    if (!canEditMilestones) {
      alert("🛑 محاولة مرفوضة: استبعاد بنود العقد من صلاحية المهندس المشرف أو الإدارة فقط.");
      return;
    }
    setExcludedStages(prev => {
      const updated = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      setPProgress(0); 
      return updated;
    });
  };

  const handleStageDurationChange = (stageId: number, days: number) => {
    if (!canEditMilestones) return;
    setStagesDurations(prev => ({
      ...prev,
      [stageId]: Math.max(0, days)
    }));
  };

  if (userRole === "client") {
    return (
      <main className="min-h-screen bg-[#020B1C] flex items-center justify-center text-right p-8" dir="rtl">
        <div className="max-w-md w-full bg-[#07132a] border-2 border-[#D4AF37]/50 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#D4AF37]/10 to-transparent rounded-full blur-xl pointer-events-none" />
          <Lock className="text-[#D4AF37] mx-auto mb-4 animate-pulse" size={56} />
          <h3 className="font-black text-[#D4AF37] text-2xl mb-2">منطقة أمنية محظورة 🔒</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            عذراً عميلنا الكريم؛ هذه لوحة التحكم الداخلية والرقابية للمشاريع والمواقع الخاصة بمهندسي وموظفي شركة Golden Decoration.
          </p>
          <button 
            type="button"
            onClick={() => router.push("/")} 
            className="mt-6 w-full bg-gradient-to-r from-[#D4AF37] to-[#F0E6D2] text-[#020B1C] font-black py-3 rounded-xl shadow-2xl cursor-pointer"
          >
            العودة للرئيسية
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020B1C] relative overflow-hidden font-alexandria" dir="rtl">
      
      {/* هيدر الهيكل لمنع وميض وتأخر تحميل الخط البصري FOUT على شاشة المشاريع */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <Sidebar />
      
      {/* 🛠️ جدار الحماية البصري الموحد وتعديل شريط التمرير المذهب للجريل والتفاصيل */}
      <style dangerouslySetInnerHTML={{ __html: `
        ::-webkit-scrollbar { width: 6px !important; height: 6px !important; }
        ::-webkit-scrollbar-track { background: #020B1C !important; }
        ::-webkit-scrollbar-thumb { background: #D4AF37 !important; border-radius: 9999px !important; }
        ::-webkit-scrollbar-thumb:hover { background: #D4AF37 !important; }

        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none !important;
          margin: 0 !important;
        }
        input[type="number"] { -moz-appearance: textfield !important; }

        .overflow-x-auto::-webkit-scrollbar {
          display: block !important;
          height: 6px !important;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb {
          background: #D4AF37 !important;
          border-radius: 9999px !important;
        }

        th, td, h1, h2, h3, h4, h5, h6, span, p, button, label, input, select, textarea {
          font-family: 'Alexandria', Arial, sans-serif !important;
          letter-spacing: normal !important;
        }

        thead th, th {
          font-size: 0.8rem !important;
          font-weight: 900 !important;
          color: #D4AF37 !important;
          text-align: right !important;
          border-bottom: 2px solid #1f2d4d !important;
          background-color: #050914 !important;
          padding: 12px 14px !important;
        }

        tbody td, td {
          font-size: 0.75rem !important;
          font-weight: 700 !important;
          color: #F0E6D2 !important;
          text-align: right !important;
          border-bottom: 1px solid rgba(212, 175, 55, 0.15) !important;
          padding: 12px 14px !important;
        }
      `}} />

      <section className="flex-1 flex flex-col lg:pr-56 m-0">
        <Header />
        
        <div className="p-4 md:p-8 space-y-6 text-right select-none">
          
          <div>
            <h1 className="text-xl md:text-2xl font-black text-[#D4AF37] flex items-center gap-2.5">
              <span>إدارة ومتابعة مشاريع المواقع الإنشائية</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-ping" />
            </h1>
            <p className="text-white text-xs mt-2">مراقبة تواريخ التسليم التلقائية، حصر الغرف، وتحديث مرحلة التنفيذ الجارية ونسب الإنجاز التلقائية.</p>
          </div>

          {/* 1. جدول المشاريع العلوي */}
          <div className="bg-[#07132a] border border-[#D4AF37]/50 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col w-full">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
            <div className="p-4 border-b border-[#243556] bg-[#0b1b3d]/60 flex flex-col sm:flex-row justify-between items-center gap-4 select-none">
              <h3 className="text-[#D4AF37] font-bold text-sm md:text-base flex items-center gap-1.5">قائمة مشاريع التشطيب والعمل الجاري بالموقع ({filteredProjects.length})</h3>
              
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder="ابحث باسم المشروع أو كود الموقع..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-[#F0E6D2] pr-10 pl-4 text-xs font-bold outline-none focus:border-[#D4AF37] transition-all placeholder-gray-500"
                />
                <span className="absolute right-3 top-3 text-[#D4AF37] text-xs">🔍</span>
              </div>
            </div>

            {/* إتاحة شريط التمرير المذهب بالجريل */}
            <div className="overflow-x-auto max-h-[220px]">
              {loading ? (
                <div className="p-12 text-center text-[#D4AF37] text-base animate-pulse">جاري سحب المشاريع من قاعدة البيانات...</div>
              ) : filteredProjects.length > 0 ? (
                <table className="w-full text-right table-auto min-w-[850px]">
                  <thead>
                    <tr className="whitespace-nowrap select-none">
                      <th>كود المشروع</th>
                      <th>اسم المشروع</th>
                      <th>اسم العميل</th>
                      <th className="font-mono">المساحة م²</th>
                      <th>مستوى التشطيب</th>
                      <th className="text-center">مكونات الوحدة</th>
                      <th className="text-center">الحالة الإدارية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f2d4d]/50">
                    {filteredProjects.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => selectProjectRow(p)}
                        className={`hover:bg-[#0B1B38] cursor-pointer transition-all duration-200 ${
                          selectedProject?.id === p.id ? "bg-[#0b1b3d]/70 border-r-4 border-r-[#D4AF37]" : ""
                        }`}
                      >
                        <td className="font-mono text-[#D4AF37] font-black text-xs md:text-sm">{p.project_code}</td>
                        <td className="font-black text-[#B48C34]">{p.project_name}</td>
                        <td className="text-gray-200 font-bold">{p.customers?.name || "غير محدد"}</td>
                        <td className="font-mono text-white">{p.area} م²</td>
                        <td className="text-gray-200">{p.finishing_level}</td>
                        <td className="text-center text-xs text-gray-300">
                          {p.rooms_count}غ / {p.bathrooms_count}ح / {p.corridors_count}ط / {p.garden_exist ? "حديقة" : "-"}
                        </td>
                        <td className="text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                            p.unit_status === "In_progress" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}>{p.unit_status || "جديد"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-gray-400 font-bold">لا توجد مشاريع تطابق شروط البحث المدخلة.</div>
              )}
            </div>
          </div>

          {/* مخرجات وهيكلة تفاصيل المشروع المختار */}
          {selectedProject && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch w-full text-xs md:text-sm">
                
                {/* العمود الأول (يمين): كارت حقول مدخلات مواصفات الوحدة والمشروع المالي والتواريخ */}
                <div className="bg-[#07132a] border border-[#D4AF37] rounded-[2rem] p-6 shadow-2xl relative flex flex-col justify-between space-y-4">
                  
                  <div className="space-y-4">
                    <h3 className="text-[#D4AF37] font-bold text-sm md:text-base flex items-center gap-1.5 border-b border-[#D4AF37] pb-3 flex items-center gap-2 select-none">
                      <Home className="w-5 h-5" />
                      <span>المواصفات والمدخلات الفنية للمشروع</span>
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[#D4AF37] font-bold mb-2 text-[11px]">كود المشروع *</label>
                        <input type="text" value={pCode} disabled className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#243556] text-gray-500 px-3 outline-none text-center font-mono font-bold text-xs" />
                      </div>

                      <div>
                        <label className="block text-[#D4AF37] font-bold mb-2 text-[11px]">اسم المشروع *</label>
                        <input type="text" value={pName} disabled={!canEditFullDetails} onChange={(e) => setPName(e.target.value)} className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#243556] text-white px-3 outline-none focus:border-[#D4AF37] text-xs" />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[#D4AF37] font-bold mb-2 text-[11px]">عنوان المشروع بالتفصيل *</label>
                        <input type="text" placeholder="الشارع، رقم العمارة، اسم الكمبوند بالتفصيل..." value={pUnitAddress} disabled={!canEditFullDetails} onChange={(e) => setPUnitAddress(e.target.value)} className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#243556] text-white px-3 outline-none focus:border-[#D4AF37] text-xs" />
                      </div>

                      <div>
                        <label className="block text-[#D4AF37] font-bold mb-2 text-[11px]">المنطقة الجغرافية / المدينة</label>
                        <input type="text" placeholder="التجمع الخامس، الشيخ زايد، هليوبوليس..." value={pLocation} disabled={!canEditFullDetails} onChange={(e) => setPLocation(e.target.value)} className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#243556] text-white px-3 outline-none focus:border-[#D4AF37] text-xs" />
                      </div>

                      <div>
                        <label className="block text-[#D4AF37] font-bold mb-2 text-[11px]">اسم العميل المتعاقد *</label>
                        <select value={pCustomerId} disabled={!canChangeCustomer} onChange={(e) => setPCustomerId(e.target.value)} className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#243556] text-[#D4AF37] px-3 outline-none cursor-pointer focus:border-[#D4AF37] text-base">
                          <option value="">-- اختر العميل --</option>
                          {customers.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3 col-span-2">
                        <div>
                          <label className="block text-[#D4AF37] font-bold mb-2 text-[11px]">المهندس المشرف *</label>
                          <select value={pAssignedEngineerId} disabled={!canEditTechnical} onChange={(e) => setPCAssignedEngineerId(e.target.value)} className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#243556] text-[#D4AF37] px-3 outline-none cursor-pointer focus:border-[#D4AF37] text-sm">
                            <option value="">-- إسناد لمهندس المشروعات --</option>
                            {engineersList.map(eng => (
                              <option key={eng.id} value={eng.id}>👷 {eng.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[#D4AF37] font-bold mb-2 text-[11px]">مسؤول المبيعات (Sales)</label>
                          <div className="w-full h-11 rounded-xl bg-[#020B1C]/50 border border-[#243556] text-gray-300 px-3 flex items-center text-xs">
                            <User className="w-3.5 h-3.5 text-[#D4AF37] ml-1.5 shrink-0" />
                            <span className="truncate">{currentSalesRepName}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 col-span-2">
                        <div>
                          <label className="block text-[#D4AF37] font-bold mb-2 text-[11px]">تاريخ بدء العمل *</label>
                          <input type="date" required value={pStartDate} disabled={!canEditTechnical} onChange={(e) => setPStartDate(e.target.value)} className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#243556] text-[#F0E6D2] px-2 outline-none font-mono font-bold text-xs focus:border-[#D4AF37]" />
                        </div>
                        <div>
                          <label className="block text-[#D4AF37] font-bold mb-2 text-[11px]">التسليم المبدئي (تلقائي)</label>
                          <input type="date" disabled value={pProvisionalDate} className="w-full h-11 rounded-xl bg-[#020B1C]/40 border border-[#243556] text-amber-400 px-2 outline-none font-mono font-bold text-xs text-center animate-pulse" />
                        </div>
                        <div>
                          <label className="block text-[#D4AF37] font-bold mb-2 text-[11px]">التسليم النهائي (المعتمد)</label>
                          <input type="date" disabled value={pFinalDate} className="w-full h-11 rounded-xl bg-[#020B1C]/40 border border-[#243556] text-emerald-400 px-2 outline-none font-mono font-bold text-xs text-center animate-pulse" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 col-span-2">
                        <div>
                          <label className="block text-[#D4AF37] font-bold mb-2 text-[11px]">نوع الوحدة الإنشائية *</label>
                          <select value={pUnitType} disabled={!canEditFullDetails} onChange={(e) => setPUnitType(e.target.value)} className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#243556] text-white px-3 outline-none cursor-pointer focus:border-[#D4AF37] text-xs">
                            <option>شقة</option>
                            <option>فيلا</option>
                            <option>دوبلكس</option>
                            <option>محل تجاري</option>
                            <option>مكتب إداري</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[#D4AF37] font-bold mb-2 text-[11px]">المساحة الإجمالية (م²) *</label>
                          <input type="number" value={pArea} disabled={!canEditFullDetails} onChange={(e) => setPArea(e.target.value !== "" ? Number(e.target.value) : "")} className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#243556] text-white px-3 outline-none font-mono focus:border-[#D4AF37] text-xs" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 col-span-2">
                        <div>
                          <label className="block text-[#D4AF37] font-bold mb-2 text-[11px]">مستوى التشطيب المطلوب *</label>
                          <select value={pFinishingLevel} disabled={!canEditFullDetails} onChange={(e) => setPFinishingLevel(e.target.value)} className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] px-3 font-black outline-none cursor-pointer focus:border-[#D4AF37] text-xs">
                            <option>اقتصادى (لوكس)</option>
                            <option>متوسط (سوبر لوكس )</option>
                            <option>فاخر (الترا لوكس)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[#D4AF37] font-bold mb-2 text-[11px]">الحالة الإدارية للموقع *</label>
                          <select value={pUnitStatus} disabled={!canEditFullDetails} onChange={(e) => setPUnitStatus(e.target.value)} className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#243556] text-[#D4AF37] font-bold px-3 text-xs outline-none cursor-pointer focus:border-[#D4AF37]">
                            <option value="معلق / قيد الانتظار">معلق / قيد الانتظار</option>
                            <option value="In_progress">نشط / جاري العمل بالموقع</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 col-span-2">
                        <div>
                          <label className="block text-[#D4AF37] font-bold mb-2 text-[11px]">نسبة الإنجاز الفعلي بالموقع (%)</label>
                          <input type="number" min="0" max="100" value={pProgress} disabled={!canEditMilestones} onChange={(e) => setPProgress(Number(e.target.value))} className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#243556] text-white px-3 outline-none font-mono font-bold focus:border-[#D4AF37] disabled:opacity-50 text-xs" />
                        </div>
                        <div>
                          <label className="block text-[#D4AF37] font-bold mb-2 text-[11px]">رابط مجسم الـ 3D التفاعلي للمشروع</label>
                          <input type="url" placeholder="https://sketchfab.com/models/..." value={pDesignUrl} disabled={!canEditTechnical} onChange={(e) => setPDesignUrl(e.target.value)} className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#243556] text-white px-3 outline-none font-mono focus:border-[#D4AF37] disabled:opacity-50 text-xs" />
                        </div>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[#D4AF37] font-bold mb-2 text-[11px]">إجمالي القيمة المالية للعقد (ج.م)</label>
                        <input type="number" placeholder="قيمة العقد الكلية" value={pContractValue} disabled={!canEditFullDetails} onChange={(e) => setPContractValue(e.target.value !== "" ? Number(e.target.value) : "")} className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#243556] text-white px-3 outline-none font-mono font-bold focus:border-[#D4AF37] disabled:opacity-50 text-xs" />
                      </div>
                    </div>
                  </div>

                  {/* زر حفظ المشروع الفاخر والمحصن تماماً */}
                  <div className="pt-4 border-t border-[#D4AF37]/20 flex justify-end select-none">
                    <button
                      type="button" 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUpdateProject(e); }} // 👈 تم تفعيل الحصانة البرمجية للاعراض المباشر
                      disabled={saving}
                      className="px-6 py-3 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.03] active:scale-95 transition-all duration-300 cursor-pointer text-sm flex items-center justify-center gap-1.5 select-none relative overflow-hidden disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : "💾 حفظ التعديلات الإدارية للمشروع"}
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
                    </button>
                  </div>

                </div>

                {/* العمود الثاني (يسار): تجميع ودمج "عداد النسبة المئوية" و "حصر الغرف الفاخر h-11" و "الأقساط والدفعات" */}
                <div className="flex flex-col justify-between space-y-6">
                  
                  {/* كابينة الإنجاز والساعة الرملية */}
                  <div className="bg-[#07132a] border border-[#D4AF37] rounded-[2rem] p-5 flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden">
                    <div className="relative w-28 h-28 flex items-center justify-center select-none">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="56" cy="56" r="44" stroke="#1f2d4d" strokeWidth="6" fill="transparent" />
                        <circle cx="56" cy="56" r="44" stroke="#D4AF37" strokeWidth="6" fill="transparent" 
                          strokeDasharray={2 * Math.PI * 44}
                          strokeDashoffset={2 * Math.PI * 44 - (pProgress / 100) * 2 * Math.PI * 44}
                          strokeLinecap="round" className="transition-all duration-500 ease-out"
                          style={{ filter: "drop-shadow(0 0 4px rgba(212, 175, 55, 0.4))" }}
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-xl font-black font-mono text-[#F0E6D2]">{pProgress}%</span>
                        <span className="text-[9px] text-[#D4AF37] font-black uppercase">إنجاز الموقع</span>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <span className="text-[9px] text-gray-200 block font-bold mb-1">المرحلة الجارية ميدانياً:</span>
                      <span className="text-base font-black text-[#D4AF37] block leading-none">{currentExecutionStageLabel}</span>
                    </div>

                    <div className="w-full flex justify-center pt-1">{remainingTimeBadge}</div>
                  </div>

                  {/* كارت حصر الغرف الفاخر h-11 */}
                  <div className="bg-[#07132a] border border-[#D4AF37] rounded-[2rem] p-5 space-y-4 shadow-xl">
                    <p className="text-[#D4AF37] font-bold text-sm md:text-base flex items-center gap-1.5 border-b border-[#D4AF37]">
                      <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                      <span>حصر وتوزيع أعداد الغرف والمكونات الميدانية للوحدة:</span>
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-right select-none">
                      
                      {/* الغرف */}
                      <div className="bg-[#020B1C]/50 border border-[#1f2d4d]/60 rounded-xl p-2.5 flex items-center justify-between h-11 hover:border-[#D4AF37]/20 transition-all select-none">
                        <span className="text-[#F0E6D2] font-bold text-[11px]">عدد الغرف:</span>
                        <div className="flex items-center gap-1 bg-[#020B1C] border border-[#1f2d4d] rounded-lg px-1.5 h-8" dir="ltr">
                          <button type="button" disabled={!canEditFullDetails} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPRooms(prev => Math.max(0, prev - 1)); }} className="w-5 h-5 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90 select-none">-</button>
                          <span className="w-5 text-center text-[#D4AF37] font-mono font-black text-xs">{pRooms}</span>
                          <button type="button" disabled={!canEditFullDetails} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPRooms(prev => prev + 1); }} className="w-5 h-5 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90">+</button>
                        </div>
                      </div>

                      {/* ريسبشن */}
                      <div className="bg-[#020B1C]/50 border border-[#1f2d4d]/60 rounded-xl p-2.5 flex items-center justify-between h-11 hover:border-[#D4AF37]/20 transition-all select-none">
                        <span className="text-[#F0E6D2] font-bold text-[11px]">الريسبشن:</span>
                        <div className="flex items-center gap-1 bg-[#020B1C] border border-[#1f2d4d] rounded-lg px-1.5 h-8" dir="ltr">
                          <button type="button" disabled={!canEditFullDetails} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPReceptions(prev => Math.max(0, prev - 1)); }} className="w-5 h-5 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90 select-none">-</button>
                          <span className="w-5 text-center text-[#D4AF37] font-mono font-black text-xs">{pReceptions}</span>
                          <button type="button" disabled={!canEditFullDetails} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPReceptions(prev => prev + 1); }} className="w-5 h-5 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90">+</button>
                        </div>
                      </div>

                      {/* حمامات */}
                      <div className="bg-[#020B1C]/50 border border-[#1f2d4d]/60 rounded-xl p-2.5 flex items-center justify-between h-11 hover:border-[#D4AF37]/20 transition-all select-none">
                        <span className="text-[#F0E6D2] font-bold text-[11px]">الحمامات:</span>
                        <div className="flex items-center gap-1 bg-[#020B1C] border border-[#1f2d4d] rounded-lg px-1.5 h-8" dir="ltr">
                          <button type="button" disabled={!canEditFullDetails} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPBaths(prev => Math.max(0, prev - 1)); }} className="w-5 h-5 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90 select-none">-</button>
                          <span className="w-5 text-center text-[#D4AF37] font-mono font-black text-xs">{pBaths}</span>
                          <button type="button" disabled={!canEditFullDetails} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPBaths(prev => prev + 1); }} className="w-5 h-5 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90">+</button>
                        </div>
                      </div>

                      {/* مطابخ */}
                      <div className="bg-[#020B1C]/50 border border-[#1f2d4d]/60 rounded-xl p-2.5 flex items-center justify-between h-11 hover:border-[#D4AF37]/20 transition-all select-none">
                        <span className="text-[#F0E6D2] font-bold text-[11px]">المطابخ:</span>
                        <div className="flex items-center gap-1 bg-[#020B1C] border border-[#1f2d4d] rounded-lg px-1.5 h-8" dir="ltr">
                          <button type="button" disabled={!canEditFullDetails} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPKitchens(prev => Math.max(0, prev - 1)); }} className="w-5 h-5 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90 select-none">-</button>
                          <span className="w-5 text-center text-[#D4AF37] font-mono font-black text-xs">{pKitchens}</span>
                          <button type="button" disabled={!canEditFullDetails} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPKitchens(prev => prev + 1); }} className="w-5 h-5 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90">+</button>
                        </div>
                      </div>

                      {/* بلكونات */}
                      <div className="bg-[#020B1C]/50 border border-[#1f2d4d]/60 rounded-xl p-2.5 flex items-center justify-between h-11 hover:border-[#D4AF37]/20 transition-all select-none">
                        <span className="text-[#F0E6D2] font-bold text-[11px]">البلكونات:</span>
                        <div className="flex items-center gap-1 bg-[#020B1C] border border-[#1f2d4d] rounded-lg px-1.5 h-8" dir="ltr">
                          <button type="button" disabled={!canEditFullDetails} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPBalconies(prev => Math.max(0, prev - 1)); }} className="w-5 h-5 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90 select-none">-</button>
                          <span className="w-5 text-center text-[#D4AF37] font-mono font-black text-xs">{pBalconies}</span>
                          <button type="button" disabled={!canEditFullDetails} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPBalconies(prev => prev + 1); }} className="w-5 h-5 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90">+</button>
                        </div>
                      </div>

                      {/* ليفنج */}
                      <div className="bg-[#020B1C]/50 border border-[#1f2d4d]/60 rounded-xl p-2.5 flex items-center justify-between h-11 hover:border-[#D4AF37]/20 transition-all select-none">
                        <span className="text-[#F0E6D2] font-bold text-[11px]">Living:</span>
                        <div className="flex items-center gap-1 bg-[#020B1C] border border-[#1f2d4d] rounded-lg px-1.5 h-8" dir="ltr">
                          <button type="button" disabled={!canEditFullDetails} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPLiving(prev => Math.max(0, prev - 1)); }} className="w-5 h-5 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90 select-none">-</button>
                          <span className="w-5 text-center text-[#D4AF37] font-mono font-black text-xs">{pLiving}</span>
                          <button type="button" disabled={!canEditFullDetails} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPLiving(prev => prev + 1); }} className="w-5 h-5 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90">+</button>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>

              </div>

              {/* خطة وجدولة الأقساط والدفعات المالية */}
              <div className="bg-[#07132a] border border-[#D4AF37] rounded-[2rem] p-6 space-y-4 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#D4AF37] pb-3 select-none">
                  <h3 className="text-[#D4AF37] font-bold text-sm md:text-base flex items-center gap-1.5">
                    <Receipt className="w-5 h-5" />
                    <span>خطة وجدولة الدفعات والأقساط المالية المتعاقد عليها </span>
                  </h3>
                  <span className="text-[10px] bg-[#020B1C] border border-[#1f2d4d] text-emerald-400 px-3 py-1 rounded-full font-bold">
                    إجمالي العقد: {Number(pContractValue || 0).toLocaleString()} ج.م
                  </span>
                </div>

                {/* كشف الدفعات المجدولة حالياً */}
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-center text-xs">
                    <thead>
                      <tr className="bg-[#0b1d3d] text-[#D4AF37] select-none">
                        <th className="p-3">اسم الدفعة</th>
                        <th className="p-3">المرحلة الإنشائية</th>
                        <th className="p-3">النسبة من العقد %</th>
                        <th className="p-3">القيمة المستحقة (ج.م)</th>
                        <th className="p-3 text-center">تاريخ استحقاقها</th>
                        <th className="p-3 text-center">حالة السداد</th>
                        <th className="p-3 text-center">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f2d4d]/60">
                      {projectInstallments.map((inst) => {
                        const matchedStageName = STAGES_METADATA.find(s => s.id === inst.linked_stage_id)?.name || "تأسيس / عام ";
                        
                        const linkedStage = normalizedStages.find(s => s.id === inst.linked_stage_id);
                        const isOverdue = linkedStage && pProgress >= linkedStage.cumulative && inst.status === "pending";
                        
                        return (
                          <tr key={inst.id} className="hover:bg-[#020B1C]/50 transition-all text-white">
                            <td className="p-3 text-slate-100">{inst.milestone_name}</td>
                            <td className="p-3 text-[#D4AF37] font-medium">{matchedStageName}</td>
                            <td className="p-3 font-mono text-[#D4AF37]">{inst.percentage}%</td>
                            <td className="p-3 font-mono text-emerald-400">{Number(inst.amount).toLocaleString()} ج.م</td>
                            <td className="p-3 font-mono text-slate-400 text-xs">{inst.due_date || "معلق بتقدم التنفيذ"}</td>
                            <td className="p-3 text-center">
                              {inst.status === "paid" ? (
                                <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">تم السداد والمقاصة ✓</span>
                              ) : isOverdue ? (
                                <span className="px-2.5 py-1 rounded bg-red-500/10 text-rose-400 border border-red-500/20 text-[10px] animate-pulse">مستحقة للدفع فوراً 🚨</span>
                              ) : (
                                <span className="px-2.5 py-1 rounded bg-amber-500/10 text-center text-amber-400 border border-amber-500/20 text-[10px]">انتظار تقدم الموقع</span>
                              )}
                            </td>
                            <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                              <button 
                                type="button"
                                disabled={inst.status === "paid"}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteInstallment(inst.id); }} // 👈 حظر السلوك الافتراضي للمتصفح لمنع الريفريش نهائياً
                                className="p-1.5 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-gray-500 hover:text-rose-500 transition-all disabled:opacity-40 cursor-pointer"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {projectInstallments.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-500 font-bold text-xs select-none">
                            لا توجد دفعات أو أقساط مبرمجة لحساب هذا المشروع حالياً. تفضل بتوليد أول دفعة بالأسفل!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* نموذج توليد وإضافة قسط جديد لـ المشروع المختار */}
                {canEditFullDetails && (
                  <div className="p-4 bg-[#020B1C]/50 border border-[#D4AF37] rounded-2xl space-y-4">
                    <span className="text-[#D4AF37] text-xs md:text-base flex items-center gap-1.5 border-[#D4AF37] border-b border-[#D4AF37]">➕ أضف وجدول دفعة استحقاق جديدة لعقد العميل:</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-[#D4AF37] font-bold mb-2 text-[11px]">اسم مرحلة الدفعة *</label>
                        <input 
                          type="text"
                          value={instMilestoneName}
                          onChange={(e) => setInstMilestoneName(e.target.value)}
                          className="w-full h-10 rounded-lg bg-[#07132a] border border-[#243556] text-white px-3 outline-none focus:border-[#D4AF37]"
                          placeholder="مثال: قسط المحارة والسيراميك"
                        />
                      </div>
                      <div>
                        <label className="block text-[#D4AF37] font-bold mb-2 text-[11px]">النسبة % من العقد *</label>
                        <input 
                          type="number"
                          value={instPercentage}
                          onChange={(e) => setInstPercentage(Number(e.target.value))}
                          className="w-full h-10 rounded-lg bg-[#07132a] border border-[#243556] text-[#D4AF37] px-3 font-mono font-bold outline-none focus:border-[#D4AF37]"
                          min="1"
                          max="100"
                        />
                      </div>
                      <div>
                        <label className="block text-[#D4AF37] font-bold mb-2 text-[11px]">القيمة المستحقة (تلقائي)</label>
                        <div className="w-full h-10 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] flex items-center px-3 font-mono font-black">
                          {instAmount.toLocaleString()} ج.م
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[#D4AF37] font-bold mb-2 text-[11px]">تاريخ الاستحقاق المتوقع</label>
                        <input 
                          type="date"
                          value={instDueDate}
                          onChange={(e) => setInstDueDate(e.target.value)}
                          className="w-full h-10 rounded-lg bg-[#07132a] border border-[#243556] text-[#F0E6D2] px-3 font-mono outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div>
                        <label className="block text-[#D4AF37] font-bold mb-2 text-[11px]">ربط استحقاق الدفعة بانتهاء مرحلة *</label>
                        <select
                          value={instLinkedStageId}
                          onChange={(e) => setInstLinkedStageId(e.target.value !== "" ? Number(e.target.value) : "")}
                          className="w-full h-10 rounded-lg bg-[#07132a] border border-[#243556] text-[#D4AF37] px-3 font-bold outline-none focus:border-[#D4AF37] cursor-pointer"
                        >
                          <option value="">-- تسوية يدوية (غير مربوط بمرحلة محددة) --</option>
                          {STAGES_METADATA.map(s => (
                            <option key={s.id} value={s.id}>🏗️ المرحلة {s.id}: {s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button" 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAddInstallment(e); }} // 👈 حظر السلوك الافتراضي للمتصفح لمنع الريفريش نهائياً
                        disabled={addingInst}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.03] active:scale-95 transition-all duration-300 cursor-pointer text-sm flex items-center justify-center gap-1.5 select-none relative overflow-hidden disabled:opacity-50"
                      >
                        {addingInst ? "جاري جدولة القسط..." : "💾 جدولة وإضافة القسط لقائمة العميل"}
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
                      </button>
                    </div>
                  </div>
                )}

              </div>

              {/* كارت خطة العمل والمراحل الإنشائية الـ 12 */}
              <div className="bg-[#07132a] border border-[#D4AF37] rounded-[2rem] p-6 space-y-4 shadow-2xl relative w-full text-xs md:text-sm">
                <p className="text-[#D4AF37] font-black text-sm md:text-base border-b border-[#D4AF37] pb-3 flex items-center gap-2 select-none">
                  <Layers className="text-[#D4AF37] font-bold text-sm md:text-base flex items-center gap-1.5" />
                  <span>خطة العمل والمراحل الإنشائية والزمنية الـ 12 للموقع:</span>
                </p>
                
                <p className="text-white text-xs leading-relaxed select-none">
                  حدد أيام التنفيذ الفعلية تحت كل بند، أو انقر على رمز العين <span className="text-[#D4AF37]">استبعاد البند</span> لحذفه حركياً وتصفير أيامه وتعديل ميعاد التسليم المبدئي :
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {normalizedStages.map((stage) => {
                    const isCompleted = pProgress >= stage.cumulative && !stage.isExcluded;
                    const isExcluded = !!stage.isExcluded;

                    return (
                      <div
                        key={stage.id}
                        onClick={(e) => {
                          e.preventDefault(); // 👈 حظر السلوك الافتراضي للمتصفح لمنع الريفريش نهائياً
                          if (!isExcluded) toggleStageStatus(stage.cumulative);
                        }}
                        className={`p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between group ${
                          isExcluded
                            ? "border-rose-950/40 bg-rose-950/5 opacity-50 line-through decoration-rose-500/50"
                            : isCompleted
                            ? "border-[#D4AF37] bg-gradient-to-br from-[#07132a] to-[#D4AF37]/5 shadow-[0_0_12px_rgba(212,175,55,0.15)]"
                            : "border-[#1f2d4d] bg-[#020B1C]/50 hover:border-[#D4AF37]/35"
                        }`}
                      >
                        <div className="flex items-start justify-between w-full">
                          <div className="flex flex-col text-right">
                            <span className={`text-xs font-bold transition-colors duration-200 ${isExcluded ? "text-gray-500" : isCompleted ? "text-[#D4AF37]" : "text-[#D4AF37] group-hover:text-[#F0E6D2]"}`}>
                              {stage.name}
                            </span>
                            <span className="text-[9px] text-white mt-1 font-mono">
                              نسبة الاعمال: {isExcluded ? "0" : `${Math.round(stage.adjustedWeight)}%`} (تراكمي {stage.cumulative}%)
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 select-none" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              disabled={!canEditMilestones}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleExcludeStage(e, stage.id); }} // 👈 حظر السلوك الافتراضي للمتصفح لمنع الريفريش نهائياً
                              className="p-1 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-gray-400 hover:text-rose-500 transition-colors disabled:opacity-40 cursor-pointer"
                              title="استبعاد هذا البند"
                            >
                              {isExcluded ? <Eye className="w-3 h-3 text-rose-500" /> : <EyeOff className="w-3 h-3" />}
                            </button>

                            <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all duration-300 ${
                              isCompleted ? "bg-[#D4AF37] border-[#D4AF37] text-black" : "border-[#243556]"
                            }`}>
                              {isCompleted && <Check className="w-3 h-3 stroke-[4]" />}
                            </div>
                          </div>
                        </div>

                        {/* عداد مدة البند تحت كل مرحلة */}
                        {!isExcluded && (
                          <div className="mt-3 pt-2 border-t border-[#1f2d4d]/50 flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                            <span className="text-[10px] text-slate-200">المدة المتوقعة:</span>
                            
                            <div className="flex items-center gap-1 bg-[#020B1C] border border-[#1f2d4d] rounded-lg p-0.5 select-none h-8" dir="ltr">
                              <button
                                type="button"
                                disabled={!canEditMilestones}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStageDurationChange(stage.id, stage.duration - 1); }} // 👈 حظر السلوك الافتراضي للمتصفح لمنع الريفريش نهائياً
                                className="w-6 h-6 rounded bg-[#ff2a3a] hover:bg-red-700 active:scale-95 text-white font-black text-sm flex items-center justify-center cursor-pointer transition disabled:opacity-40 shadow-[0_0_4px_rgba(255,42,58,0.2)]"
                              >
                                -
                              </button>
                              <span className="w-6 text-center text-[#D4AF37] font-mono font-black text-xs">
                                {stage.duration}
                              </span>
                              <button
                                type="button"
                                disabled={!canEditMilestones}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStageDurationChange(stage.id, stage.duration + 1); }} // 👈 حظر السلوك الافتراضي للمتصفح لمنع الريفريش نهائياً
                                className="w-6 h-6 rounded border border-[#1f2d4d] bg-[#020B1C]/50 hover:border-[#D4AF37] hover:text-[#D4AF37] active:scale-95 text-white font-bold text-xs flex items-center justify-center cursor-pointer transition disabled:opacity-40"
                              >
                                +
                              </button>
                              <span className="text-[8px] text-gray-500 font-bold px-1 select-none">يوم</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* كارت الحفظ والمزامنة الإجمالي والختامي لصفحة المشاريع بالشكل الفاخر */}
              <div className="flex justify-end pt-5 border-t border-[#243556] gap-3 select-none">
                <div className="relative group">
                  <button
                    type="button" 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUpdateProject(e); }} // 👈 حظر السلوك الافتراضي للمتصفح لمنع الريفريش نهائياً
                    disabled={saving}
                    className="px-8 py-3.5 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.03] active:scale-95 transition-all duration-300 cursor-pointer text-sm flex items-center justify-center gap-1.5 select-none relative overflow-hidden disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <FolderCheck className="w-4 h-4" />}
                    <span>{saving ? "جاري حفظ وتأسيس المشروع..." : "حفظ التعديلات وجدولة الأعمال "}</span>
                    {/* عاكس الإضاءة النيوني المتوهج بقاع الزر */}
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
                  </button>

                  <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                    <div className="bg-[#07132a] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2.5 px-4 rounded-xl shadow-2xl relative">
                      💾 تحديث الجدول الزمني، أيام البنود، وتفاصيل الشقة وأقساط العميل سحابياً
                      <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#07132a] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </section>
    </main>
  );
}