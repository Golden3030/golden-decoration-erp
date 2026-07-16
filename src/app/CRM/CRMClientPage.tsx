"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

import CRMSearch from "@/components/CRM/CRMSearch";
import CustomerInfo from "@/components/CRM/CustomerInfo";
import ProjectInfo from "@/components/CRM/ProjectInfo";
import FinishingTabs from "@/components/CRM/FinishingTabs";
import { useCRM, DEFAULT_FINISHING_SCHEMA } from "@/components/CRM/context/CRMContext";
import { supabase } from "@/lib/supabaseClient";
import { isOnline, addToOfflineQueue } from "@/lib/offline-sync";
import { Plus, Minus, UserPlus, Search } from "lucide-react";

interface CustomerLog {
  id: string;
  interaction_type: string;
  text: string;
  feedback: string;
  next_follow_up_date: string;
  created_at: string;
  sender_name?: string;
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

export default function CRMPage() {
  const router = useRouter();
  const { crmData, setCRMData, loadProjectData, saveEstimateSnapshot, isLocked } = useCRM();

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addMobile, setAddMobile] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addAddress, setAddAddress] = useState("");
  const [addAssignedTo, setAddAssignedTo] = useState("");
  const [addStatus, setAddStatus] = useState("جديد");

  const [customersList, setCustomersList] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const [userRole, setUserRole] = useState<string>("sales");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [salesStaff, setSalesStaff] = useState<any[]>([]); 
  const [selectedSalesFilter, setSelectedSalesFilter] = useState<string>("all");

  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [followUpType, setFollowUpType] = useState("مكالمة هاتفية");
  const [followUpFeedback, setFollowUpFeedback] = useState("");
  const [followUpNextDate, setFollowUpNextDate] = useState("");
  const [customerLogs, setCustomerLogs] = useState<CustomerLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [visibleLogsCount, setVisibleLogsCount] = useState<number>(5);

  const [selectedCustomerProjects, setSelectedCustomerProjects] = useState<any[]>([]);

  const isManager = ["admin", "owner", "manager", "sales_manager"].includes(userRole.toLowerCase());

  useEffect(() => {
    document.title = "Golden Decoration ERP - الـ CRM وسجل بيانات العملاء والمتابعات";
    loadAllCRMData();
  }, []);

  async function loadAllCRMData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }
      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      const roleKey = String(profile?.role || "").toLowerCase();
      setUserRole(roleKey); 

      let customerQuery = supabase.from("customers").select("*");

      if (roleKey === "sales") {
        customerQuery = customerQuery.eq("assigned_to", user.id);
      } else {
        const { data: staff } = await supabase
          .from("users")
          .select("id, name")
          .eq("role", "sales")
          .order("name", { ascending: true });
        setSalesStaff(staff || []);
      }

      const [custRes, projRes] = await Promise.all([
        customerQuery.order("created_at", { ascending: false }),
        supabase.from("projects").select("*")
      ]);

      if (custRes.error) throw custRes.error;
      if (projRes.error) throw projRes.error;

      setCustomersList(custRes.data || []);
      setProjectsList(projRes.data || []);

    } catch (err: any) {
      console.error("Error loading CRM data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleInsertNewCustomer() {
    if (!addName || !addMobile) {
      alert("الرجاء إدخال اسم العميل ورقم المحمول لإتمام عملية التسجيل.");
      return;
    }

    setSaving(true);
    const assignedRepId = isManager ? (addAssignedTo || null) : currentUserId;
    const generatedCustomerCode = "CUST-" + Math.floor(1000 + Math.random() * 9000);

    const payload = {
      customer_code: generatedCustomerCode,
      name: addName,
      mobile: addMobile,
      phone: addPhone || null,
      email: addEmail || null,
      address: addAddress || null,
      status: addStatus,
      assigned_to: assignedRepId
    };

    try {
      if (isOnline()) {
        const { error } = await supabase
          .from("customers")
          .insert([payload]);

        if (error) throw error;

        if (assignedRepId && assignedRepId !== currentUserId) {
          await supabase.from("notifications").insert({
            title: "توزيع وإسناد عملاء جدد",
            message: `📈 تم إسناد العميل الجديد (${addName}) لمتابعتك الفورية من قبل مدير المبيعات.`,
            type: "sales",
            link: "/CRM"
          });
        }

        alert("✅ تم تسجيل وإسناد العميل الجديد وتحديث الـ CRM بنجاح!");
      } else {
        addToOfflineQueue("customers", "INSERT", payload);
        alert("⚠️ تم حفظ العميل محلياً مؤقتاً لعدم وجود إنترنت؛ وسيتم توزيعه ومزامنته تلقائياً فور عودة الشبكة.");
      }

      setIsAddCustomerOpen(false);
      setAddName("");
      setAddMobile("");
      setAddPhone("");
      setAddEmail("");
      setAddAddress("");
      setAddAssignedTo("");
      setAddStatus("جديد");

      await loadAllCRMData();
    } catch (err: any) {
      alert("حدث خطأ أثناء تسجيل العميل: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function advanceWorkflowStage(projectId: string, newStage: string, notifyRole: string, message: string) {
    try {
      setSaving(true);
      const { error: stageError } = await supabase
        .from("projects")
        .update({ workflow_stage: newStage })
        .eq("id", projectId);
      if (stageError) throw stageError;

      let customerStatus = "";
      if (newStage === "needs_estimate") {
        customerStatus = "قيد انتظار المقايسة";
      } else if (newStage === "initial_ready") {
        customerStatus = "تم اصدار المقايسة المبدئية";
      }

      if (customerStatus && crmData.customer?.customerCode) {
        const { data: custData } = await supabase
          .from("customers")
          .select("id")
          .eq("customer_code", crmData.customer.customerCode)
          .single();

        if (custData) {
          const { error: custError } = await supabase
            .from("customers")
            .update({ status: customerStatus })
            .eq("id", custData.id);
          if (custError) throw custError;
        }
      }

      const { error: notifyError } = await supabase
        .from("notifications")
        .insert({
          title: "تحديث مرحلة العمل",
          message,
          type: notifyRole === "engineer" ? "engineer_task" : "sales",
          target_role: notifyRole,
          project_id: projectId
        });
      if (notifyError) console.error("تعذر إرسال الإشعار:", notifyError.message);

      setCRMData((prev: any) => ({
        ...prev,
        customer: {
          ...prev.customer,
          status: customerStatus || prev.customer.status
        },
        project: { ...prev.project, workflow_stage: newStage }
      }));

      await loadAllCRMData();
    } catch (err: any) {
      console.error("خطأ في تحديث مرحلة سير العمل والعميل الموحد:", err);
      alert("حدث خطأ أثناء تحديث حالة المقايسة: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveProject() {
    if (!crmData.customer?.customerCode) {
      alert("يرجى تحديد واختيار عميل من الجدول بالأعلى أولاً لتأسيس المشروع له.");
      return;
    }

    setSaving(true);
    try {
      const { data: custData } = await supabase
        .from("customers")
        .select("id")
        .eq("customer_code", crmData.customer.customerCode)
        .single();

      if (!custData) throw new Error("فشل العثور على معرّف العميل المستهدف بالسحابة.");

      const generatedProjCode = crmData.project?.projectCode || "P-" + Math.floor(1000 + Math.random() * 9000);
      const generatedEstNum = crmData.project?.estimateNumber || "EST-" + Math.floor(1000 + Math.random() * 9000);

      const payload = {
        customer_id: custData.id,
        project_name: crmData.project?.projectName || `مشروع العميل ${crmData.customer.name}`,
        project_code: generatedProjCode,
        location: crmData.project?.location || "",
        unit_type: crmData.project?.unitType || "شقة",
        area: Number(crmData.project?.area || 0),
        finishing_level: crmData.project?.finishingLevel || "اقتصادى (لوكس)",
        unit_status: crmData.project?.unitStatus || "معلق / قيد الانتظار",
        unit_address: crmData.project?.unitAddress || "",
        estimate_date: crmData.project?.estimateDate || null,
        receptions_count: Number(crmData.project?.receptionsCount || 1),
        rooms_count: Number(crmData.project?.roomsCount || 2),
        bathrooms_count: Number(crmData.project?.bathroomsCount || 1),
        kitchens_count: Number(crmData.project?.kitchensCount || 1),
        balconies_count: Number(crmData.project?.balconiesCount || 1),
        living_count: Number(crmData.project?.livingCount || 1),
        corridors_count: Number(crmData.project?.corridorsCount || 0),
        garden_exist: !!crmData.project?.gardenExist,
        garden_area: Number(crmData.project?.gardenArea || 0)
      };

      if (isOnline()) {
        let error = null;

        if (crmData.project?.id && !crmData.project.id.startsWith("d19b7d8d") && !crmData.project.id.startsWith("new")) {
          const { error: updateErr } = await supabase
            .from("projects")
            .update(payload)
            .eq("id", crmData.project.id);
          error = updateErr;
        } else {
          const projectPayload = {
            ...payload,
            workflow_stage: null 
          };
          const { data: newProj, error: insertErr } = await supabase
            .from("projects")
            .insert([projectPayload])
            .select("id")
            .single();
          
          error = insertErr;

          if (newProj && !error) {
            const activeProjId = (newProj as any).id;

            setCRMData((prev: any) => ({
              ...prev,
              project: {
                ...prev.project,
                id: activeProjId,
                projectCode: generatedProjCode,
                estimateNumber: generatedEstNum,
                workflow_stage: null 
              }
            }));

            const { data: updatedProjs, error: projsError } = await supabase
              .from("projects")
              .select("*")
              .eq("customer_id", custData.id);

            if (!projsError && updatedProjs) {
              setSelectedCustomerProjects(updatedProjs);
            }
          }
        }

        if (error) throw error;
        alert("✅ تم حفظ بيانات ومواصفات المشروع بقاعدة البيانات!");
      } else {
        const offlinePayload = {
          ...payload,
          id: crmData.project?.id || null
        };
        addToOfflineQueue("projects", crmData.project?.id ? "UPDATE" : "INSERT", offlinePayload);
        alert("⚠️ تم حفظ ميزانية المشروع محلياً مؤقتاً؛ سيتم مزامنتها تلقائياً فور توفر الإنترنت.");
      }

      await loadAllCRMData();
    } catch (err: any) {
      console.error("Save Project Error:", err);
      alert("حدث خطأ أثناء حفظ المشروع: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!crmData.customer?.customerCode) return;
    loadCustomerTimelineLogs();
    setVisibleLogsCount(5); 
  }, [crmData.customer?.customerCode]);

  async function loadCustomerTimelineLogs() {
    setLoadingLogs(true);
    try {
      const { data: custData } = await supabase
        .from("customers")
        .select("id")
        .eq("customer_code", crmData.customer.customerCode)
        .single();

      if (custData) {
        const { data: logs, error } = await supabase
          .from("customer_logs")
          .select("*")
          .eq("customer_id", custData.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setCustomerLogs(logs || []);
      }
    } catch (e) {
      console.error("Error loading timeline logs:", e);
    } finally {
      setLoadingLogs(false);
    }
  }

  async function handleSelectCustomerFromGrid(customer: any) {
    try {
      const { data: projs, error } = await supabase
        .from("projects")
        .select("*")
        .eq("customer_id", customer.id);

      if (error) throw error;

      const customerProjectsList = projs || [];
      setSelectedCustomerProjects(customerProjectsList);

      const activeProject = customerProjectsList.length > 0 ? customerProjectsList[0] : null;

      setCRMData((prev: any) => ({
        ...prev,
        customer: {
          name: customer.name,
          mobile: customer.mobile,
          customerCode: customer.customer_code,
          phone: customer.phone || "",
          address: customer.address || "",
          email: customer.email || "",
          status: customer.status
        },
        project: activeProject ? {
          id: activeProject.id,
          projectName: activeProject.project_name,
          projectCode: activeProject.project_code,
          location: activeProject.location,
          unitType: activeProject.unit_type,
          unitStatus: activeProject.unit_status,
          unitAddress: activeProject.unit_address,
          estimateDate: activeProject.estimate_date,
          finishingLevel: activeProject.finishing_level,
          area: activeProject.area,
          planUrl: activeProject.plan_url,
          workflow_stage: activeProject.workflow_stage || "",
          receptionsCount: Number(activeProject.receptions_count || 1),
          roomsCount: Number(activeProject.rooms_count || 2),
          bathroomsCount: Number(activeProject.bathrooms_count || 1),
          kitchensCount: Number(activeProject.kitchens_count || 1),
          balconies_count: Number(activeProject.balconies_count || 1),
          livingCount: Number(activeProject.living_count || 1),
          corridorsCount: Number(activeProject.corridors_count || 0),
          gardenExist: !!activeProject.garden_exist,
          gardenArea: Number(activeProject.garden_area || 0)
        } : null,
        estimate: {
          number: "EST-0001",
          date: "",
          status: "مبدئية",
          convertedFromInitial: false,
          materialsCost: 0,
          laborCost: 0,
          engineeringPercentage: 15,
          engineeringValue: 0,
          total: 0,
          items: []
        },
        finishing: JSON.parse(JSON.stringify(DEFAULT_FINISHING_SCHEMA))
      }));

      if (activeProject) {
        await loadProjectData(activeProject.id);
      }
    } catch (err) {
      console.error("Error selecting customer from grid:", err);
    }
  }

  async function handleSwitchActiveProject(projectId: string) {
    const selectedProj = selectedCustomerProjects.find(p => p.id === projectId);
    if (!selectedProj) return;

    setSaving(true);
    try {
      setCRMData((prev: any) => ({
        ...prev,
        project: {
          id: selectedProj.id,
          projectName: selectedProj.project_name,
          projectCode: selectedProj.project_code,
          location: selectedProj.location,
          unitType: selectedProj.unit_type,
          unitStatus: selectedProj.unit_status,
          unitAddress: selectedProj.unit_address,
          estimateDate: selectedProj.estimate_date,
          finishingLevel: selectedProj.finishing_level,
          area: selectedProj.area,
          planUrl: selectedProj.plan_url,
          workflow_stage: selectedProj.workflow_stage || "",
          receptionsCount: Number(selectedProj.receptions_count || 1),
          roomsCount: Number(selectedProj.rooms_count || 2),
          bathroomsCount: Number(selectedProj.bathrooms_count || 1),
          kitchensCount: Number(selectedProj.kitchens_count || 1),
          balconies_count: Number(selectedProj.balconies_count || 1),
          livingCount: Number(selectedProj.living_count || 1),
          corridorsCount: Number(selectedProj.corridors_count || 0),
          gardenExist: !!selectedProj.garden_exist,
          gardenArea: Number(selectedProj.garden_area || 0)
        },
        estimate: {
          number: "EST-0001",
          date: "",
          status: "مبدئية",
          convertedFromInitial: false,
          materialsCost: 0,
          laborCost: 0,
          engineeringPercentage: 15,
          engineeringValue: 0,
          total: 0,
          items: []
        },
        finishing: JSON.parse(JSON.stringify(DEFAULT_FINISHING_SCHEMA))
      }));

      await loadProjectData(selectedProj.id);
    } catch (err) {
      console.error("Error switching active project:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveFollowUp() {
    if (!followUpFeedback) {
      alert("الرجاء إدخال تفاصيل المتابعة والمكالمة أولاً.");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: custData } = await supabase
        .from("customers")
        .select("id")
        .eq("customer_code", crmData.customer.customerCode)
        .single();

      if (!custData) throw new Error("فشل العثور على معرّف العميل بقاعدة البيانات.");

      const directStatusText = `[حالة العميل الموثقة: ${crmData.customer.status || "جديد"}] - ${followUpFeedback}`;

      const payload = {
        customer_id: custData.id,
        sales_rep_id: user?.id || null,
        interaction_type: followUpType,
        feedback: directStatusText,
        next_follow_up_date: followUpNextDate || null
      };

      if (isOnline()) {
        const { error: logError } = await supabase
          .from("customer_logs")
          .insert([payload]);

        if (logError) throw logError;

        const { error: custUpdateError } = await supabase
          .from("customers")
          .update({ status: "متابعة مستمرة" })
          .eq("id", custData.id);

        if (custUpdateError) throw custUpdateError;

        alert("✅ تم حفظ المتابعة التاريخية بنجاح وتحديث حالة العميل بالسيستم!");
      } else {
        addToOfflineQueue("customer_logs", "INSERT", payload);
        alert("⚠️ تم حفظ المتابعة محلياً؛ سيتم المزامنة وتغيير حالة العميل فور توفر الشبكة.");
      }

      setIsFollowUpOpen(false);
      setFollowUpFeedback("");
      setFollowUpNextDate("");
      
      await Promise.all([
        loadAllCRMData(),
        loadCustomerTimelineLogs()
      ]);

    } catch (err: any) {
      alert("حدث خطأ أثناء حفظ المتابعة: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  function setQuickFollowUpDate(days: number) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, "0");
    const dd = String(targetDate.getDate()).padStart(2, "0");
    setFollowUpNextDate(`${yyyy}-${mm}-${dd}`);
  }

  const getNormalizedStatus = (status: string) => {
    const s = String(status || "").trim();
    if (s === "جديد" || s === "new") return "جديد";
    if (s === "متابعة" || s === "متابعة مستمرة" || s === "تم إصدار المقايسة" || s === "follow_up") return "متابعة";
    if (s === "تم التعاقد" || s === "contracted") return "تم التعاقد";
    if (s === "مؤجل" || s === "postponed") return "مؤجل";
    if (s === "ملغي" || s === "cancelled" || s === "closed") return "ملغي";
    return "جديد";
  };

  const baseFilteredCustomers = customersList.filter((c: any) => {
    if (isManager && selectedSalesFilter !== "all") {
      return c.assigned_to === selectedSalesFilter;
    }
    return true;
  });

  const countAll = baseFilteredCustomers.length;
  const countNew = baseFilteredCustomers.filter((c: any) => getNormalizedStatus(c.status) === "جديد").length;
  const countFollow = baseFilteredCustomers.filter((c: any) => getNormalizedStatus(c.status) === "متابعة").length;
  const countContracted = baseFilteredCustomers.filter((c: any) => getNormalizedStatus(c.status) === "تم التعاقد").length;
  const countInProgress = projectsList.filter((p: any) => p.status === "active").length;
  const countPostponed = baseFilteredCustomers.filter((c: any) => getNormalizedStatus(c.status) === "مؤجل").length;
  const countCancelled = baseFilteredCustomers.filter((c: any) => getNormalizedStatus(c.status) === "ملغي").length;
  const countNeedsEstimate = projectsList.filter((p: any) => p.workflow_stage === "needs_estimate").length;

  const cards = [
    { id: "all", name: "كل العملاء", count: countAll, icon: "👥" },
    { id: "needs_estimate", name: "بانتظار التسعير", count: countNeedsEstimate, icon: "⏳" },
    { id: "جديد", name: "العملاء الجدد", count: countNew, icon: "✨" },
    { id: "متابعة", name: "متابعة مستمرة", count: countFollow, icon: "📞" },
    { id: "تم التعاقد", name: "تم التعاقد", count: countContracted, icon: "✍️" },
    { id: "active", name: "جاري التنفيذ", count: countInProgress, icon: "🏗️" },
    { id: "مؤجل", name: "مؤقت مؤجل", count: countPostponed, icon: "⏳" },
    { id: "ملغي", name: "ملغي / مغلق", count: countCancelled, icon: "✕" }
  ];

  const filteredCustomers = baseFilteredCustomers.filter((c: any) => {
    if (selectedStatus === "all") return true;

    const customerIdClean = String(c.id || "").trim().toLowerCase();

    if (selectedStatus === "active") {
      return projectsList.some((p: any) => {
        const projectCustIdClean = String(p.customer_id || "").trim().toLowerCase();
        return projectCustIdClean === customerIdClean && p.status === "active";
      });
    }

    if (selectedStatus === "needs_estimate") {
      return projectsList.some((p: any) => {
        const projectCustIdClean = String(p.customer_id || "").trim().toLowerCase();
        return projectCustIdClean === customerIdClean && p.workflow_stage === "needs_estimate";
      });
    }

    return getNormalizedStatus(c.status) === selectedStatus;
  });

  const isProjectSelected = !!crmData.customer?.name;

  return (
    <main className="min-h-screen bg-[#020B1C] relative overflow-hidden font-alexandria" dir="rtl">
      
      {/* 🛠️ ورقة أنماط الخط الملكي الموحد والتمرير */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;700;900&display=swap');

        *:not(code, pre, .font-mono, [class*="font-mono"]) {
          font-family: 'Alexandria', Arial, sans-serif !important;
          letter-spacing: normal !important;
        }

        ::-webkit-scrollbar { width: 6px !important; height: 6px !important; }
        ::-webkit-scrollbar-track { background: #020B1C !important; }
        ::-webkit-scrollbar-thumb { background: #D4AF37 !important; border-radius: 9999px !important; }
        ::-webkit-scrollbar-thumb:hover { background: #D4AF37 !important; }

        ::-webkit-scrollbar-horizontal,
        .overflow-x-auto::-webkit-scrollbar { display: none !important; height: 0px !important; }
        .overflow-x-auto { scrollbar-width: none !important; -ms-overflow-style: none !important; overflow-x: auto !important; }
      `}} />

      <Sidebar />
      <section className="flex-1 flex flex-col lg:pr-56 m-0">
        <Header />
        
        <div className="p-4 md:p-8 space-y-6 text-right">
          <div className="flex justify-between items-center border-b border-[#D4AF37]/20 pb-5 select-none">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[#D4AF37] flex items-center gap-2.5">
                <span>بيانات العملاء والمشاريع والـ CRM</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-ping" />
              </h1>
              <p className="text-white text-xs mt-2">فرز فوري لتدفق صفقات المبيعات، ومزامنة مرحلة التشطيبات والمواصفات الميدانية.</p>
            </div>
          </div>

          {isSearchOpen && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in select-none">
              <div className="bg-[#07132a] border border-[#D4AF37]/50 rounded-3xl p-6 md:p-8 w-full max-w-4xl shadow-2xl relative space-y-4">
                <div className="flex justify-between items-center border-b border-[#243556] pb-3 mb-4 select-none">
                  <h3 className="text-[#D4AF37] font-bold text-lg flex items-center gap-1.5">
                    📂 أداة البحث الموحد للمشاريع والعملاء
                  </h3>
                  <button 
                    onClick={() => setIsSearchOpen(false)}
                    className="text-gray-400 hover:text-rose-500 font-bold text-sm cursor-pointer transition"
                  >
                    ✕ إغلاق
                  </button>
                </div>
                <CRMSearch onClose={() => setIsSearchOpen(false)} />
              </div>
            </div>
          )}

          {isAddCustomerOpen && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in select-none">
              <div className="bg-[#07132a] border border-[#D4AF37]/50 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl relative space-y-4 text-right text-white">
                <div className="flex justify-between items-center border-b border-[#243556] pb-3 mb-4">
                  <h3 className="text-[#D4AF37] font-black text-lg flex items-center gap-1.5">
                    ➕ نموذج إضافة عميل جديد للـ CRM
                  </h3>
                  <button 
                    onClick={() => setIsAddCustomerOpen(false)}
                    className="text-gray-400 hover:text-rose-500 font-bold text-sm cursor-pointer transition"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4 text-sm font-semibold">
                  <div>
                    <label className="block text-[#D4AF37] font-bold text-[11px] mb-1.5">اسم العميل *</label>
                    <input
                      type="text"
                      placeholder="الاسم الثلاثي للعميل"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      className="w-full h-11 rounded-lg bg-[#020B1C] border border-[#243556]/30 text-white px-3.5 outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#D4AF37] font-bold text-[11px] mb-1.5 whitespace-nowrap">رقم الأرضي (اختياري)</label>
                      <input
                        type="text"
                        placeholder="رقم آخر إن وجد"
                        value={addPhone}
                        onChange={(e) => setAddPhone(e.target.value)}
                        className="w-full h-11 rounded-lg bg-[#020B1C] border border-[#243556]/30 text-white px-3.5 outline-none font-mono focus:border-[#D4AF37]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#D4AF37] font-bold text-[11px] mb-1.5 whitespace-nowrap">رقم الموبايل والواتساب *</label>
                      <input
                        type="text"
                        placeholder="010xxxxxxxx"
                        value={addMobile}
                        onChange={(e) => setAddMobile(e.target.value)}
                        className="w-full h-11 rounded-lg bg-[#020B1C] border border-[#243556]/30 text-white px-3.5 outline-none font-mono focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#D4AF37] font-bold text-[11px] mb-1.5">العنوان الجاري بالتفصيل</label>
                    <input
                      type="text"
                      placeholder="مثال: التجمع الخامس - النرجس"
                      value={addAddress}
                      onChange={(e) => setAddAddress(e.target.value)}
                      className="w-full h-11 rounded-lg bg-[#020B1C] border border-[#243556]/30 text-white px-3.5 outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#D4AF37] font-bold text-[11px] mb-1.5">البريد الإلكتروني للعميل</label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      className="w-full h-11 rounded-lg bg-[#020B1C] border border-[#243556]/30 text-white px-3.5 outline-none font-mono focus:border-[#D4AF37]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#D4AF37] font-bold text-[11px] mb-1.5 whitespace-nowrap">توزيع وإسناد العميل</label>
                      {isManager ? (
                        <select
                          value={addAssignedTo}
                          onChange={(e) => setAddAssignedTo(e.target.value)}
                          className="w-full h-11 rounded-lg bg-[#020B1C] border border-[#243556]/30 text-[#D4AF37] font-bold px-3 outline-none cursor-pointer text-xs focus:border-[#D4AF37]"
                        >
                          <option value="">-- عام (بدون موظف محدد) --</option>
                          {salesStaff.map(staff => (
                            <option key={staff.id} value={staff.id}>{staff.name}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value="إسناد تلقائي لحسابك الشخصي"
                          disabled
                          className="w-full h-11 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-gray-500 px-3 outline-none text-center font-bold text-xs"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-[#D4AF37] font-bold text-[11px] mb-1.5 whitespace-nowrap">حالة العميل المبدئية *</label>
                      <select
                        value={addStatus}
                        onChange={(e) => setAddStatus(e.target.value)}
                        className="w-full h-11 rounded-lg bg-[#020B1C] border border-[#243556]/30 text-[#D4AF37] font-bold px-3 outline-none cursor-pointer text-xs focus:border-[#D4AF37]"
                      >
                        <option value="جديد">جديد</option>
                        <option value="متابعة مستمرة">متابعة مستمرة</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#243556]">
                  {/* صياغة الأزرار اللمسية المذهبة بالكامل */}
                  <button
                    onClick={handleInsertNewCustomer}
                    disabled={saving}
                    className="bg-black/60 hover:bg-[#D4AF37] border border-[#D4AF37] text-[#D4AF37] hover:text-[#020B1C] py-3.5 px-8 rounded-xl text-xs font-black shadow-[0_0_12px_rgba(212,175,55,0.25)] hover:shadow-[0_0_20px_rgba(212,175,55,0.55)] cursor-pointer transition-all duration-300 disabled:opacity-50"
                  >
                    {saving ? "جاري الحفظ..." : "💾 تسجيل العميل بالـ CRM"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {isManager && (
            <div className="bg-[#07132a] border border-[#D4AF37]/15 p-4 rounded-2xl flex items-center gap-3">
              <label className="text-gray-300 text-sm whitespace-nowrap">تصفية بحسب مسؤول المبيعات:</label>
              <select
                value={selectedSalesFilter}
                onChange={(e) => setSelectedSalesFilter(e.target.value)}
                className="bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] rounded-xl text-sm p-2.5 outline-none cursor-pointer focus:border-[#D4AF37]"
              >
                <option value="all">رؤية كافة موظفين المبيعات (الكل)</option>
                {salesStaff.map(staff => (
                  <option key={staff.id} value={staff.id}>{staff.name}</option>
                ))}
              </select>
            </div>
          )}

          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4 select-none">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-[#07132a]/60 border border-[#D4AF37]/15 h-28 flex flex-col justify-between animate-pulse">
                    <div className="w-8 h-8 bg-[#020B1C] rounded-lg" />
                    <div className="space-y-2 mt-3">
                      <div className="h-3 w-16 bg-[#020B1C] rounded" />
                      <div className="h-5 w-10 bg-[#020B1C] rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4 select-none">
                {cards.map((card) => {
                  const isCurrent = selectedStatus === card.id;
                  return (
                    <div
                      key={card.id}
                      onClick={() => setSelectedStatus(card.id)}
                      className={`p-4 rounded-2xl bg-[#07132a] border transition-all duration-300 transform hover:translate-y-[-4px] hover:shadow-2xl flex flex-col justify-between cursor-pointer select-none ${
                        isCurrent 
                          ? "border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.25)] bg-[#0b1b3d]" 
                          : "border-[#D4AF37]/15 hover:border-[#D4AF37]/45"
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-2xl select-none">{card.icon}</span>
                        <span className="text-white text-xl font-extrabold font-mono tracking-tight">
                          {card.count.toLocaleString('en-US')}
                        </span>
                      </div>
                      <div className="mt-3 text-right">
                        <p className="text-[#D4AF37] text-xs font-black whitespace-nowrap">{card.name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-[#07132a] border border-[#D4AF37] rounded-2xl overflow-hidden shadow-2xl transition duration-300">
                <div className="p-4 border-b border-[#D4AF37] bg-[#0b1b3d] flex justify-between items-center select-none">
                  {/* تم تعديل لون عنوان الصندوق الرئيسي للذهب الإمبراطوري #D4AF37 */}
                  <h3 className="text-[#D4AF37] font-black text-xs md:text-sm">
                    نتائج التصفية والفرز الجاري للعملاء والمبيعات ({filteredCustomers.length})
                  </h3>

                  <div className="flex items-center gap-3">
                    {/* تعديل زر تسجيل العميل ليصبح أيقونة برونزية مذهبة مضيئة دائرية فقط */}
                    <button
                      type="button"
                      onClick={() => setIsAddCustomerOpen(true)}
                      className="w-11 h-11 rounded-xl bg-black/60 border-2 border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] flex items-center justify-center cursor-pointer transition-all duration-300 hover:translate-y-[-2px] shadow-[0_0_10px_rgba(212,175,55,0.15)] hover:shadow-[0_0_20px_rgba(212,175,55,0.45)] shrink-0"
                      title="تسجيل عميل جديد بالـ CRM"
                    >
                      <UserPlus size={16} strokeWidth={2.2} />
                    </button>

                    {/* تعديل زر البحث والاستعلام ليصبح أيقونة مضيئة باللون الأخضر النيون المعتمد */}
                    <button
                      type="button"
                      onClick={() => setIsSearchOpen(true)}
                      className="w-11 h-11 rounded-xl bg-black/60 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500 hover:text-black flex items-center justify-center cursor-pointer transition-all duration-300 hover:translate-y-[-2px] shadow-[0_0_10px_rgba(16,185,129,0.15)] hover:shadow-[0_0_20px_rgba(16,185,129,0.45)] shrink-0"
                      title="البحث السحابي والاستعلام الشامل"
                    >
                      <Search size={16} strokeWidth={2.2} />
                    </button>
                  </div>
                </div>
                
                <div className="overflow-x-auto max-h-56 overflow-y-auto pr-1">
                  {filteredCustomers.length > 0 ? (
                    <table className="w-full text-right table-auto min-w-[750px]">
                      {/* تفتيت وحذف كلاس الـ font-black وصياغة الرؤوس بخط Alexandria المتوسط النعومة text-[11px] */}
                      <thead className="bg-[#0B1B38] text-[#D4AF37] font-bold border-b border-[#D4AF37] sticky top-0 z-10 select-none text-[13px]">
                        <tr className="whitespace-nowrap">
                          <th className="py-2.5 px-3.5 font-bold">كود العميل</th>
                          <th className="py-2.5 px-3.5 font-bold">اسم العميل </th>
                          <th className="py-2.5 px-3.5 font-bold">رقم الموبايل </th>
                          <th className="py-2.5 px-3.5 font-bold">العنوان بالكامل</th>
                          <th className="py-2.5 px-3.5 font-bold">البريد الإلكتروني</th>
                          <th className="py-2.5 px-3.5 text-center font-bold">حالة العميل بالـ CRM</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1f2d4d]/40">
                        {filteredCustomers.map((c: any) => {
                          const isSelected = crmData.customer?.customerCode === c.customer_code;
                          return (
                            <tr
                              key={c.id}
                              onClick={() => handleSelectCustomerFromGrid(c)}
                              className={`border-t border-[#D4AF37]/15 hover:bg-[#0B1B38] text-white text-xs md:text-sm cursor-pointer transition whitespace-nowrap ${
                                isSelected ? "bg-[#0b1b3d]/60 border-r-4 border-r-[#D4AF37] pr-2.5 pl-3" : ""
                              }`}
                            >
                              <td className="py-2.5 px-3.5 font-mono text-[#D4AF37] font-bold">{c.customer_code}</td>
                              <td className="py-2.5 px-3.5 font-mono text-white">{c.name}</td>
                              <td className="py-2.5 px-3.5 font-mono text-white">
                                {userRole === "engineer" ? "📞 [بيانات محجوبة]" : c.mobile}
                              </td>
                              <td className="py-2.5 px-3.5 text-[#D4AF37] font-bold">{c.address || "-"}</td>
                              <td className="py-2.5 px-3.5 font-mono text-white">{c.email || "-"}</td>
                              <td className="py-2.5 px-3.5 text-center">
                                <span className={`px-2.5 py-0.5 rounded text-[10px] font-black ${
                                  c.status === "تم التعاقد" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 animate-pulse" : "bg-brown-500/200 text-green-400"
                                }`}>{c.status || "جديد"}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center text-gray-500 text-sm">لا يوجد عملاء يطابقون هذه الفئة حالياً في قاعدة البيانات.</div>
                  )}
                </div>
              </div>
            </>
          )}

          {isProjectSelected && !loading ? (
            <div className="transition-all duration-300 space-y-6">
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8 items-stretch font-bold text-white text-right">
                <div className="border border-[#1f2d4d] rounded-2xl overflow-hidden shadow-2xl">
                  <CustomerInfo 
                    userRole={userRole} 
                    handleSaveCustomer={async () => {
                      setSaving(true);
                      try {
                        const { data: custData } = await supabase
                          .from("customers")
                          .select("id")
                          .eq("customer_code", crmData.customer.customerCode)
                          .single();

                        if (!custData) throw new Error("فشل العثور على بيانات العميل.");

                        if (crmData.customer.status === "تم التعاقد") {
                          const confirmFreeze = window.confirm(
                            "⚠️ تجميد المقايسة والـ 14 تابة بالكامل وتحويلها إلى وضع القراءة فقط (🔒 Locked) رسمياً.\n\nهل تريد تأكيد التجميد والتعاقد رسميًا؟"
                          );
                          if (!confirmFreeze) {
                            setSaving(false);
                            return;
                          }

                          if (crmData.estimate?.items && crmData.project?.id) {
                            await saveEstimateSnapshot(crmData.estimate.items, crmData.estimate.total);
                          }

                          if (crmData.project?.id) {
                            await supabase
                              .from("projects")
                              .update({ 
                                workflow_stage: "final",
                                unit_status: "جاري التنفيذ الميداني" 
                              })
                              .eq("id", crmData.project.id);
                          }
                        }

                        const { error } = await supabase
                          .from("customers")
                          .update({
                            name: crmData.customer.name,
                            mobile: crmData.customer.mobile,
                            phone: crmData.customer.phone || null,
                            email: crmData.customer.email || null,
                            address: crmData.customer.address || null,
                            status: crmData.customer.status
                          })
                          .eq("id", custData.id);

                        if (error) throw error;
                        
                        alert("✅ تم تحديث بيانات العميل وتفعيل بروتوكول التجميد التعاقدي بنجاح!");
                        await loadAllCRMData();
                        if (crmData.project?.id) {
                          await loadProjectData(crmData.project.id);
                        }
                      } catch (e: any) {
                        alert("فشل حفظ بيانات العميل: " + e.message);
                      } finally {
                        setSaving(false);
                      }
                    }}
                    saving={saving}
                  />
                </div>
                
                <div className="border border-[#1f2d4d] rounded-2xl overflow-hidden shadow-2xl">
                  <ProjectInfo 
                    customerProjects={selectedCustomerProjects}
                    handleSwitchActiveProject={handleSwitchActiveProject}
                    handleSaveProject={handleSaveProject}
                    saving={saving}
                    advanceWorkflowStage={advanceWorkflowStage}
                  />
                </div>
              </div>

              <div className="bg-[#07132a] border border-[#1f2d4d] rounded-2xl p-6 shadow-2xl space-y-5">
                <p className="text-[#D4AF37] font-black flex items-center gap-2 text-xl border-b border-[#243556] pb-3 select-none">
                  <svg className="w-6 h-6 stroke-current fill-none stroke-[2] animate-pulse" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <rect x="9" y="9" width="6" height="6" rx="1" />
                    <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
                  </svg>
                  <span>حصر وتوزيع وتفاصيل الغرف والمساحات الميدانية للوحدة</span>
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 w-full">
                  <RoomCounterWrapper label="عدد الريسبشن" value={crmData.project?.receptionsCount || 0} field="receptionsCount" />
                  <RoomCounterWrapper label="عدد الغرف" value={crmData.project?.roomsCount || 0} field="roomsCount" />
                  <RoomCounterWrapper label="عدد المطابخ" value={crmData.project?.kitchensCount || 0} field="kitchensCount" />
                  <RoomCounterWrapper label="عدد الحمامات" value={crmData.project?.bathroomsCount || 0} field="bathroomsCount" />
                  <RoomCounterWrapper label="البلكونات" value={crmData.project?.balconiesCount || 0} field="balconiesCount" />
                  <RoomCounterWrapper label="قطع Living" value={crmData.project?.livingCount || 0} field="livingCount" />
                  <RoomCounterWrapper label="الممرات والطرقات" value={crmData.project?.corridorsCount || 0} field="corridorsCount" />
                </div>

                <div className="border border-[#1f2d4d] rounded-2xl p-5 bg-[#0b1b3d]/40 shadow-xl space-y-4">
                  <div className="flex items-center justify-between gap-4 select-none">
                    <div className="text-right flex-1">
                      <h4 className="text-[#F0E6D2] text-sm font-black">باقة الحديقة المفتوحة للوحدة (جاردن)</h4>
                      <p className="text-gray-400 text-xs mt-1">تخصيص مسطحات اللاندسكيب للوحدات الأرضية أو الدوبلكس بالمقايسة المعتمدة للشركة:</p>
                    </div>
                    <div className="w-10 h-12 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#020B1C] border border-[#1f2d4d] flex items-center justify-between h-11 gap-4">
                    <div className="flex items-center gap-3 bg-[#07132a] border border-[#1f2d4d] px-3 py-1 rounded-lg shadow-inner h-8 select-none" dir="ltr">
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={() => {
                          const currentArea = Number(crmData.project?.gardenArea || 0);
                          const calculated = Math.max(0, currentArea - 5);
                          setCRMData((prev: any) => ({
                            ...prev,
                            project: { 
                              ...(prev.project || {}), 
                              gardenArea: calculated,
                              gardenExist: calculated > 0
                            }
                          }));
                        }}
                        className="w-6 h-6 bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white rounded-full flex items-center justify-center font-bold text-sm cursor-pointer transition active:scale-90 disabled:opacity-40"
                      >
                        <Minus size={12} className="stroke-[3]" />
                      </button>
                      
                      <span className="text-[#D4AF37] font-black font-mono text-sm min-w-[24px] text-center">
                        {crmData.project?.gardenArea || 0}
                      </span>
                      
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={() => {
                          const currentArea = Number(crmData.project?.gardenArea || 0);
                          const calculated = currentArea + 5;
                          setCRMData((prev: any) => ({
                            ...prev,
                            project: { 
                              ...(prev.project || {}), 
                              gardenArea: calculated,
                              gardenExist: true
                            }
                          }));
                        }}
                        className="w-6 h-6 bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] rounded-full flex items-center justify-center font-bold text-sm cursor-pointer transition active:scale-90 disabled:opacity-40"
                      >
                        <Plus size={12} className="stroke-[3]" />
                      </button>
                      <span className="text-gray-500 text-[10px] font-bold mr-1">م²</span>
                    </div>

                    <span className="text-white font-bold text-xs select-none">مساحة الجاردن المخططة بالموقع</span>
                  </div>
                </div>

              </div>

              {userRole !== "engineer" && (
                <div className="bg-[#07132a] border border-[#1f2d4d] rounded-2xl p-6 space-y-4 shadow-2xl animate-fade-in">
                  <div className="flex justify-between items-center border-b border-[#243556] pb-3 select-none">
                    <h3 className="text-[#D4AF37] font-black text-2xl flex items-center gap-2">
                      <span>📞 سجل المحادثات والمتابعة التاريخية للعميل</span>
                    </h3>
                    <button
                      onClick={() => setIsFollowUpOpen(true)}
                      className="text-[#D4AF37] hover:text-[#F0E6D2] active:scale-90 transition duration-150 cursor-pointer shrink-0 p-1 block"
                    >
                      <svg className="w-8 h-8 stroke-current fill-none stroke-[2.5]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                    {loadingLogs ? (
                      <p className="text-center text-gray-500 text-sm animate-pulse">جاري سحب سجل المحادثات...</p>
                    ) : customerLogs.length > 0 ? (
                      <>
                        {customerLogs.slice(0, visibleLogsCount).map((log) => (
                          <div key={log.id} className="bg-[#020B1C] border border-[#1f2d4d] p-4 rounded-xl space-y-2 relative transition hover:border-[#D4AF37]/30 shadow-inner">
                            <div className="flex justify-between items-center text-xs text-gray-500 border-b border-[#1f2d4d] pb-1">
                              <span className="font-bold text-[#D4AF37]">◀ {log.interaction_type}</span>
                              <span className="font-mono">{new Date(log.created_at).toLocaleDateString("ar-EG")} {new Date(log.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                            <p className="text-white text-sm leading-relaxed font-bold whitespace-pre-wrap">{log.feedback}</p>
                            {log.next_follow_up_date && (
                              <div className="text-xs text-amber-400 font-bold pt-1 border-t border-[#1f2d4d]/30 flex justify-between">
                                <span>📅 موعد الاتصال القادم:</span>
                                <span className="font-mono">{log.next_follow_up_date}</span>
                              </div>
                            )}
                          </div>
                        ))}

                        {customerLogs.length > visibleLogsCount && (
                          <button
                            type="button"
                            onClick={() => setVisibleLogsCount(prev => prev + 10)}
                            className="w-full py-3 bg-[#020B1C] border border-[#243556] text-[#D4AF37] hover:border-[#D4AF37] hover:text-white font-extrabold text-xs rounded-xl transition cursor-pointer text-center"
                          >
                            🔽 عرض المزيد من المتابعات السابقة ({customerLogs.length - visibleLogsCount} متبقية)
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="p-8 text-center text-gray-500 text-sm bg-[#020B1C]/50 rounded-xl border border-dashed border-[#1f2d4d]">
                        لا توجد متابعة مسجلة لهذا العميل من قبل.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(userRole === "engineer" || userRole === "admin" || userRole === "owner" || userRole === "manager") ? (
                <div className="mt-8">
                  <FinishingTabs />
                </div>
              ) : (
                <div className="mt-8 p-12 border-2 border-dashed border-[#1f2d4d] rounded-2xl text-center">
                  <p className="text-[#F0E6D2] text-lg font-bold mb-2">📐 مواصفات التشطيب وإعداد المقايسة من اختصاص فريق المهندسين</p>
                </div>
              )}

            </div>
          ) : (
            !loading && (
              <div className="mt-12 p-12 border-2 border-dashed border-[#1f2d4d] rounded-2xl text-center select-none bg-[#07132a]">
                <p className="text-[#F0E6D2] text-lg font-bold mb-2">مرحباً بك في برنامج Golden Decoration ERP لإدارة الديكور الذكي</p>
              </div>
            )
          )}

          {isFollowUpOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-right animate-fade-in select-none">
              <div className="bg-[#07132a] border border-[#D4AF37]/50 rounded-3xl p-6 w-full max-w-md shadow-2xl relative space-y-4 text-white">
                <div className="flex justify-between items-center border-b border-[#243556] pb-3">
                  <h4 className="text-[#D4AF37] font-black text-lg">📞 تسجيل مكالمة ومتابعة جديدة للعميل</h4>
                  <button onClick={() => setIsFollowUpOpen(false)} className="text-gray-400 hover:text-rose-500 font-bold text-sm cursor-pointer">✕</button>
                </div>

                <div className="space-y-4 text-sm font-bold">
                  <div>
                    <label className="block text-[#D4AF37] font-black mb-1.5">نوعية الاتصال والمتابعة</label>
                    <select
                      value={followUpType}
                      onChange={(e) => setFollowUpType(e.target.value)}
                      className="w-full h-11 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] font-bold px-3 outline-none focus:border-[#D4AF37]"
                    >
                      <option value="مكالمة هاتفية">📞 مكالمة هاتفية صادر</option>
                      <option value="محادثة واتساب">💬 محادثة واتساب</option>
                      <option value="مقابلة بموقع العميل">📍 مقابلة بموقع العميل</option>
                      <option value="اجتماع بمقر الشركة">🏢 اجتماع بمقر الشركة</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#D4AF37] font-black mb-1.5">تفاصيل المحادثة والاتفاق التاريخي *</label>
                    <textarea
                      rows={3}
                      placeholder="ملخص الاتصال التاريخي..."
                      value={followUpFeedback}
                      onChange={(e) => setFollowUpFeedback(e.target.value)}
                      className="w-full rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-white p-3 outline-none text-right font-medium focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#D4AF37] font-black mb-1.5">موعد المكالمة / المتابعة القادمة</label>
                    <input
                      type="date"
                      value={followUpNextDate}
                      onChange={(e) => setFollowUpNextDate(e.target.value)}
                      className="w-full h-11 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] font-bold px-3 outline-none font-mono focus:border-[#D4AF37]"
                    />

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setQuickFollowUpDate(1)}
                        className="px-3 py-1.5 bg-[#020B1C] border border-[#243556] text-xs font-black text-[#D4AF37] hover:border-[#D4AF37] rounded-lg transition active:scale-95 cursor-pointer"
                      >
                        ⏳ غداً
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickFollowUpDate(3)}
                        className="px-3 py-1.5 bg-[#020B1C] border border-[#243556] text-xs font-black text-[#D4AF37] hover:border-[#D4AF37] rounded-lg transition active:scale-95 cursor-pointer"
                      >
                        ⏳ بعد 3 أيام
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickFollowUpDate(7)}
                        className="px-3 py-1.5 bg-[#020B1C] border border-[#243556] text-xs font-black text-[#D4AF37] hover:border-[#D4AF37] rounded-lg transition active:scale-95 cursor-pointer"
                      >
                        ⏳ بعد أسبوع
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#243556]">
                  {/* صياغة الأزرار اللمسية المذهبة بالكامل */}
                  <button
                    type="button"
                    onClick={handleSaveFollowUp}
                    disabled={saving}
                    className="w-full bg-black/60 hover:bg-[#D4AF37] border-2 border-[#D4AF37] text-[#D4AF37] hover:text-[#020B1C] font-black py-4 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(212,175,55,0.25)] hover:shadow-[0_0_25px_rgba(212,175,55,0.45)] hover:translate-y-[-2px] text-sm cursor-pointer disabled:opacity-50"
                  >
                    {saving ? "جاري الحفظ والمزامنة..." : "💾 حفظ المتابعة التاريخية للعميل"}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </section>
    </main>
  );

  function RoomCounterWrapper({ label, value, field }: { label: string, value: number, field: string }) {
    return (
      <div className="flex flex-row items-center justify-between bg-[#020B1C] border border-[#1f2d4d] px-3.5 rounded-xl transition-all hover:border-[#D4AF37]/35 shadow-inner group w-full h-11 select-none font-alexandria">
        
        <label className="text-white font-bold text-xs select-none truncate pr-1 group-hover:text-[#F0E6D2] cursor-pointer">
          {label}
        </label>
        
        <div className="flex items-center gap-2.5" dir="ltr">
          {/* عدادات رشيقة مطابقة للمانيفستو بارتفاع h-11 وأزرار دائرية مذهبة ونبيذية */}
          <button
            type="button"
            disabled={isLocked}
            onClick={() => {
              if (isLocked) return;
              setCRMData((prev: any) => ({
                ...prev,
                project: { ...(prev.project || {}), [field]: Math.max(0, value - 1) }
              }));
            }}
            className="w-6 h-6 flex items-center justify-center bg-[#9B1C1C]/25 border border-[#9B1C1C]/60 hover:bg-[#9B1C1C] text-[#ff6b6b] hover:text-white rounded-full transition cursor-pointer active:scale-90 font-bold select-none disabled:opacity-40"
          >
            <Minus size={12} className="stroke-[3]" />
          </button>
          
          <span className="text-sm font-black text-[#D4AF37] font-mono min-w-[16px] text-center select-none">
            {value}
          </span>
          
          <button
            type="button"
            disabled={isLocked}
            onClick={() => {
              if (isLocked) return;
              setCRMData((prev: any) => ({
                ...prev,
                project: { ...(prev.project || {}), [field]: value + 1 }
              }));
            }}
            className="w-6 h-6 flex items-center justify-center bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] rounded-full transition cursor-pointer active:scale-90 font-bold select-none disabled:opacity-40"
          >
            <Plus size={12} className="stroke-[3]" />
          </button>
        </div>

      </div>
    );
  }
}