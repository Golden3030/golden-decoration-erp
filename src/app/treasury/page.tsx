"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";
import { isOnline, addToOfflineQueue } from "@/lib/offline-sync";
// 🌟 تم تصحيح الاستيراد هنا بحقن الأيقونتين الناقصتين لتفادي انهيار بناء تجميع المنظومة نهائياً
import { 
  Plus, 
  Minus, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  Briefcase, 
  Receipt, 
  Users, 
  CheckCircle2, 
  HardHat, 
  FileText, 
  ExternalLink, 
  Calendar, 
  Percent, 
  Trash2, 
  Copy, 
  Sparkles, 
  Loader2, 
  Search,
  Landmark,
  ShieldCheck,
  PlusCircle,
  Check,
  Banknote
} from "lucide-react";

const categoryLabels: Record<string, string> = {
  customer_payment: "دفعة تشغيلية من العميل",
  supervision_fee: "أتعاب ونسبة إشراف الشركة",
  material_purchase: "شراء وتوريد خامات ومواد",
  subcontractor_labor: "مصنعيات وأجور عمالة الباطن",
  petty_cash_advance: "صرف عهدة نقدية لمهندس الموقع 👷",
  petty_cash_settled: "تسوية عهدة الموقع بالفواتير 🧾",
  administrative: "مصاريف إدارية ومقرات",
  withholding_tax_pay: "توريد مصلحة الضرائب المصرية",
  other_in: "إيرادات وأرباح أخرى",
  other_out: "مصروفات نثرية وإكراميات"
};

const methodLabels: Record<string, string> = {
  cash: "خزينة نقدية (كاش)",
  bank: "حساب بنكي للشركة",
  instapay: "إنستا باي (InstaPay)",
  vodafone_cash: "فودافون كاش"
};

const expenseCategories = [
  { key: "materials", label: "خامات ومواد أساسية" },
  { key: "labor", label: "مصنعيات وأجور" },
  { key: "shipping", label: "نقل ومون" },
  { key: "transport", label: "تنقلات ومواصلات" },
  { key: "tips", label: "إكراميات وبقشيش" },
  { key: "maintenance", label: "صيانة دورية" },
  { key: "tools", label: "أدوات وعدد تشغيل" },
  { key: "ads", label: "دعاية وإعلانات" },
  { key: "rent", label: "إيجار مقرات" },
  { key: "electricity", label: "كهرباء ومرافق" },
  { key: "internet", label: "إنترنت واتصالات" },
  { key: "others", label: "أخرى ونثريات" }
];

const specialtyLabels: Record<string, string> = {
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

export default function TreasuryPage() {
  const router = useRouter();

  // 🔒 حارس الصلاحيات الحقيقي - كانت الشاشة دي متاحة لأي حد يعرف الرابط مباشرة
  // بغض النظر عن دوره، وده كان بيسمح لغير المخوّلين يشوفوا أو حتى يسجّلوا سندات مالية فعلية
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const ALLOWED_TREASURY_ROLES = ["admin", "owner", "manager", "accountant"];

  useEffect(() => {
    async function verifyAccess() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/");
          return;
        }
        const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
        const role = String(profile?.role || "").toLowerCase();

        if (!ALLOWED_TREASURY_ROLES.includes(role)) {
          alert("⛔ ليس لديك صلاحية الوصول لشاشة إدارة المالية والحسابات.");
          router.push("/dashboard");
          return;
        }
        setIsAuthorized(true);
      } catch (err) {
        console.error("Access verification error:", err);
        router.push("/dashboard");
      } finally {
        setAuthChecked(true);
      }
    }
    verifyAccess();
  }, [router]);

  const [activeTab, setActiveTab] = useState<"overview" | "vouchers" | "ledgers" | "analysis">("overview");

  const [transactions, setTransactions] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]); 
  const [customers, setCustomers] = useState<any[]>([]); 
  const [subcontractors, setSubcontractors] = useState<any[]>([]); 
  const [engineers, setEngineers] = useState<any[]>([]); 
  const [installments, setInstallments] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [statementPartner, setStatementPartner] = useState<any | null>(null);
  const [statementType, setStatementType] = useState<"customer" | "supplier" | "subcontractor" | null>(null);

  const [voucherType, setVoucherType] = useState<"receipt" | "payment">("receipt"); 
  const [amount, setAmount] = useState<number | "">("");
  const [payMethod, setPaymentMethod] = useState("cash");
  const [projId, setProjectId] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedSubcontractorId, setSelectedSubcontractorId] = useState(""); 
  const [selectedEngineerId, setSelectedEngineerId] = useState(""); 
  const [linkedInstallmentId, setLinkedInstallmentId] = useState(""); 
  const [notes, setNotes] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState(""); 

  const [category, setCategory] = useState("customer_payment");

  const [ledgerSearchQuery, setLedgerSearchQuery] = useState("");

  const [supervisionFee, setSupervisionFee] = useState<number | "">(""); 
  const [withholdingTax, setWithholdingTax] = useState<number | "">(""); 
  const [vatAmount, setVatAmount] = useState<number | "">(""); 

  const clearForm = () => {
    setSelectedTransaction(null);
    setAmount("");
    setPaymentMethod("cash");
    setProjectId("");
    setSelectedCustomerId("");
    setSelectedSubcontractorId("");
    setSelectedEngineerId("");
    setLinkedInstallmentId("");
    setNotes("");
    setAttachmentUrl("");
    setSupervisionFee("");
    setWithholdingTax("");
    setVatAmount("");
    setCategory("customer_payment");
  };

  useEffect(() => {
    document.title = "إدارة المالية والحسابات | Golden Decoration";
  }, []);

  // 🌟 تم الحل البرمجي هنا بحقن [isAuthorized] في مصفوفة التبعيات لتنبيه مستشعر الجلب فور تفعيل الصلاحية
  useEffect(() => {
    if (!isAuthorized) return;
    loadTreasuryData();
    const unsubscribe = setupRealtimeSubscription();
    return () => {
      unsubscribe();
    };
  }, [isAuthorized]);

  useEffect(() => {
    if (!projId) {
      setInstallments([]);
      return;
    }
    async function fetchProjectInstallments() {
      const { data } = await supabase
        .from("project_installments")
        .select("*")
        .eq("project_id", projId)
        .eq("status", "pending");
      setInstallments(data || []);
    }
    fetchProjectInstallments();
  }, [projId]);

  async function loadTreasuryData() {
    setLoading(true);
    try {
      const [transRes, projRes, subsRes, custRes, usersRes] = await Promise.all([
        supabase.from("transactions").select("*, projects(project_name), subcontractors(name, specialty, contract_value), users(name)").order("created_at", { ascending: false }),
        supabase.from("projects").select("*, customers(name, customer_code)").order("project_name", { ascending: true }),
        supabase.from("subcontractors").select("*").order("name", { ascending: true }),
        supabase.from("customers").select("*").order("name", { ascending: true }),
        supabase.from("users").select("id, name, role")
      ]);

      if (transRes.error) throw transRes.error;
      if (projRes.error) throw projRes.error;
      if (subsRes.error) throw subsRes.error;
      if (custRes.error) throw custRes.error;
      if (usersRes.error) throw usersRes.error;

      setTransactions(transRes.data || []);
      setProjects(projRes.data || []);
      setSubcontractors(subsRes.data || []);
      setCustomers(custRes.data || []);
      
      const filteredEngineers = (usersRes.data || []).filter((u: any) => String(u.role).toLowerCase() === "engineer");
      setEngineers(filteredEngineers);

    } catch (err: any) {
      console.error("Error loading treasury records:", err.message);
    } finally {
      setLoading(false);
    }
  }

  function setupRealtimeSubscription() {
    const channelId = `treasury-live-ledger-pro-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => { loadTreasuryData(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }

  const financialTotals = useMemo(() => {
    let cashBalance = 0;
    let bankBalance = 0;
    let receipts = 0;
    let payments = 0;

    transactions.forEach((t) => {
      const amt = Number(t.amount || 0);
      if (t.type === "inflow") {
        receipts += amt;
        if (t.payment_method === "cash") cashBalance += amt;
        else bankBalance += amt;
      } else {
        payments += amt;
        if (t.payment_method === "cash") cashBalance -= amt;
        else bankBalance -= amt;
      }
    });

    const totalContractValues = projects.reduce((sum, p) => sum + Number(p.contract_value || 0), 0);
    const clientReceivables = Math.max(0, totalContractValues - receipts);

    const suppliersList = subcontractors.filter(s => s.status === "supplier");
    const activeSubsList = subcontractors.filter(s => s.status !== "supplier");

    const totalSuppliersPurchases = suppliersList.reduce((sum, s) => sum + Number(s.contract_value || 0), 0);
    const totalSuppliersPaid = transactions
      .filter(t => t.type === "outflow" && suppliersList.some(s => s.id === t.subcontractor_id))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const supplierPayables = Math.max(0, totalSuppliersPurchases - totalSuppliersPaid);

    const totalSubcontractorsContracts = activeSubsList.reduce((sum, s) => sum + Number(s.contract_value || 0), 0);
    const totalSubcontractorsPaid = transactions
      .filter(t => t.type === "outflow" && activeSubsList.some(s => s.id === t.subcontractor_id))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const subcontractorPayables = Math.max(0, totalSubcontractorsContracts - totalSubcontractorsPaid);

    return {
      cashBalance,
      bankBalance,
      totalReceipts: receipts,
      totalPayments: payments,
      netProfit: receipts - payments,
      clientReceivables,
      supplierPayables,
      subcontractorPayables
    };
  }, [transactions, projects, subcontractors]);

  const liquidityChannels = useMemo(() => {
    let mainCashIn = 0;
    let mainCashOut = 0;
    let bankIn = 0;
    let bankOut = 0;
    let sitePettyIn = 0;
    let sitePettyOut = 0;

    transactions.forEach(t => {
      const amt = Number(t.amount || 0);
      if (t.type === "inflow") {
        if (t.payment_method === "cash") mainCashIn += amt;
        else bankIn += amt;
      } else {
        if (t.category === "petty_cash_advance") {
          sitePettyIn += amt; 
          mainCashOut += amt;
        } else if (t.category === "petty_cash_settled") {
          sitePettyOut += amt; 
        } else {
          if (t.payment_method === "cash") mainCashOut += amt;
          else bankOut += amt;
        }
      }
    });

    return {
      main: { current: mainCashIn - mainCashOut, in: mainCashIn, out: mainCashOut },
      bank: { current: bankIn - bankOut, in: bankIn, out: bankOut },
      site: { current: sitePettyIn - sitePettyOut, in: sitePettyIn, out: sitePettyOut }
    };
  }, [transactions]);

  const partnersLedgers = useMemo(() => {
    const clients = customers.map(cust => {
      const matchedProj = projects.find(p => p.customer_id === cust.id) || {};
      const contractValue = Number(matchedProj.contract_value || 0);
      const paid = transactions
        .filter(t => t.project_id === matchedProj.id && t.type === "inflow")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const remaining = Math.max(0, contractValue - paid);
      
      const lastPaymentTx = transactions
        .filter(t => t.project_id === matchedProj.id && t.type === "inflow")
        .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      return {
        id: cust.id,
        code: cust.customer_code || "CUST-XXXX",
        projCode: matchedProj.project_code || "PROJ-XXXX",
        estimateNum: matchedProj.project_code ? `EST-${matchedProj.project_code.split("-")[1]}` : "EST-XXXX",
        name: cust.name,
        contractValue,
        paid,
        remaining,
        lastPaymentDate: lastPaymentTx ? new Date(lastPaymentTx.created_at).toLocaleDateString("en-US") : "بلا دفعات",
        status: cust.status || "جديد"
      };
    });

    const suppliers = subcontractors.filter(s => s.status === "supplier").map(sup => {
      const paid = transactions
        .filter(t => t.subcontractor_id === sup.id && t.type === "outflow")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const remaining = Math.max(0, Number(sup.contract_value || 0) - paid);
      const matchedProj = projects.find(p => p.id === sup.project_id) || {};

      return {
        id: sup.id,
        name: sup.name,
        purchases: Number(sup.contract_value || 0),
        paid,
        remaining,
        projectName: matchedProj.project_name || "توريد عام للشركة",
        notes: sup.notes || "-"
      };
    });

    const subcontractorsList = subcontractors.filter(s => s.status !== "supplier").map(sub => {
      const paid = transactions
        .filter(t => t.subcontractor_id === sub.id && t.type === "outflow")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const remaining = Math.max(0, Number(sub.contract_value || 0) - paid);
      const matchedProj = projects.find(p => p.id === sub.project_id) || {};

      return {
        id: sub.id,
        name: sub.name,
        specialty: specialtyLabels[sub.specialty] || sub.specialty,
        contractValue: Number(sub.contract_value || 0),
        paid,
        remaining,
        projectName: matchedProj.project_name || "مشروعات متعددة",
        notes: sub.notes || "-"
      };
    });

    return { clients, suppliers, subcontractorsList };
  }, [customers, projects, subcontractors, transactions]);

  const filteredLedgers = useMemo(() => {
    const q = ledgerSearchQuery.toLowerCase().trim();
    if (!q) return partnersLedgers;

    return {
      clients: partnersLedgers.clients.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)),
      suppliers: partnersLedgers.suppliers.filter(s => s.name.toLowerCase().includes(q)),
      subcontractorsList: partnersLedgers.subcontractorsList.filter(s => s.name.toLowerCase().includes(q))
    };
  }, [partnersLedgers, ledgerSearchQuery]);

  const categorizedExpenses = useMemo(() => {
    let totals: Record<string, number> = {
      materials: 0, labor: 0, shipping: 0, transport: 0, tips: 0, maintenance: 0, tools: 0, ads: 0, rent: 0, electricity: 0, internet: 0, others: 0
    };

    transactions.filter(t => t.type === "outflow").forEach(t => {
      const amt = Number(t.amount || 0);
      if (t.category === "material_purchase") totals.materials += amt;
      else if (t.category === "subcontractor_labor") totals.labor += amt;
      else if (t.category === "other_out") {
        if (String(t.notes).includes("نقل") || String(t.notes).includes("مشال")) totals.shipping += amt;
        else if (String(t.notes).includes("مواصلات") || String(t.notes).includes("بنزين")) totals.transport += amt;
        else if (String(t.notes).includes("إكرامية") || String(t.notes).includes("شاي")) totals.tips += amt;
        else totals.others += amt;
      } else if (t.category === "administrative") {
        if (String(t.notes).includes("إيجار")) totals.rent += amt;
        else if (String(t.notes).includes("كهرباء") || String(t.notes).includes("مياه")) totals.electricity += amt;
        else if (String(t.notes).includes("نت") || String(t.notes).includes("تليفون")) totals.internet += amt;
        else totals.others += amt;
      } else {
        totals.others += amt;
      }
    });

    const totalOutflow = transactions.filter(t => t.type === "outflow").reduce((sum, t) => sum + Number(t.amount || 0), 0);

    return {
      list: expenseCategories.map(cat => ({
        ...cat,
        value: totals[cat.key] || 0
      })),
      totalOutflow
    };
  }, [transactions]);

  const projectProfitsList = useMemo(() => {
    return projects.map(proj => {
      const totalContract = Number(proj.contract_value || 0);
      const totalOutflows = transactions
        .filter(t => t.project_id === proj.id && t.type === "outflow")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const netProfit = totalContract - totalOutflows;
      const profitMargin = totalContract > 0 ? Math.round((netProfit / totalContract) * 100) : 0;

      return {
        id: proj.id,
        name: proj.project_name,
        totalContract,
        totalOutflows,
        netProfit,
        profitMargin
      };
    }).filter(p => p.totalContract > 0);
  }, [projects, transactions]);

  const nextReceiptNumber = useMemo(() => {
    const count = transactions.filter(t => t.type === "inflow").length;
    return `REC-2026-${String(count + 1001).slice(1)}`;
  }, [transactions]);

  const nextPaymentNumber = useMemo(() => {
    const count = transactions.filter(t => t.type === "outflow").length;
    return `PAY-2026-${String(count + 1001).slice(1)}`;
  }, [transactions]);

  async function handleRegisterVoucher(e: React.FormEvent) {
    e.preventDefault();
    if (amount === "" || Number(amount) <= 0) {
      alert("الرجاء إدخال القيمة المالية المطلوبة لتسجيل السند المالي.");
      return;
    }

    if (voucherType === "receipt" && !selectedCustomerId) {
      alert("الرجاء تحديد العميل لربط السند بحسابه الجاري.");
      return;
    }

    if (voucherType === "payment" && category === "subcontractor_labor" && !selectedSubcontractorId) {
      alert("الرجاء تحديد مقاول الباطن المستحق للدفع لتنزيل القيمة من مستخلصاته.");
      return;
    }

    setActionLoading(true);
    try {
      const amtVal = Number(amount);
      const typeKey = voucherType === "receipt" ? "inflow" : "outflow";
      const catKey = voucherType === "receipt" ? "customer_payment" : category;

      const { data: transData, error: transErr } = await supabase
        .from("transactions")
        .insert({
          amount: amtVal,
          type: typeKey,
          category: catKey,
          payment_method: payMethod,
          project_id: projId || null,
          subcontractor_id: catKey === "subcontractor_labor" ? selectedSubcontractorId : null,
          engineer_id: (catKey === "petty_cash_advance" || catKey === "petty_cash_settled") ? selectedEngineerId : null,
          linked_installment_id: catKey === "customer_payment" && linkedInstallmentId ? linkedInstallmentId : null,
          notes: notes || null,
          description: attachmentUrl || null 
        })
        .select()
        .single();

      if (transErr) throw transErr;

      if (catKey === "customer_payment" && linkedInstallmentId && transData) {
        await supabase
          .from("project_installments")
          .update({ 
            status: "paid",
            transaction_id: transData.id
          })
          .eq("id", linkedInstallmentId);
      }

      await supabase.from("notifications").insert({
        title: voucherType === "receipt" ? "إصدار سند قبض مالي" : "إصدار سند صرف مالي",
        message: `🏛️ تم بنجاح قيد معاملة مالية بقيمة (${amtVal.toLocaleString('en-US')} ج.م) عبر (${methodLabels[payMethod]}).`,
        type: "finance",
        link: "/treasury"
      });

      alert("✅ تم تسجيل السند المالي بنجاح وإغلاق القيود والعهد المرتبطة!");
      clearForm();
      await loadTreasuryData();

    } catch (err: any) {
      alert("فشل تسجيل السند المالي: " + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);

  function selectRow(item: any) {
    setSelectedTransaction(item);
    setAmount(Number(item.amount || 0));
    setVoucherType(item.type === "inflow" ? "receipt" : "payment");
    setCategory(item.category);
    setPaymentMethod(item.payment_method);
    setProjectId(item.project_id || "");
    setSelectedSubcontractorId(item.subcontractor_id || "");
    setSelectedEngineerId(item.engineer_id || "");
    setLinkedInstallmentId(item.linked_installment_id || "");
    setNotes(item.notes || "");
  }

  const openStatementPopup = (partner: any, type: "customer" | "supplier" | "subcontractor") => {
    setStatementPartner(partner);
    setStatementType(type);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#020B1C] flex items-center justify-center text-[#D4AF37] font-black">
        جاري التحقق من الصلاحيات...
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#020B1C] relative overflow-hidden font-alexandria" dir="rtl">
      
      {/* 🛠️ ورقة التنسيق الموحدة للدفتر العام - محصورة لحماية السايدبار والهيدر */}
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
        
          
        .premium-treasury-table thead th {
          font-size: 0.75rem !important;
          font-weight: 500 !important;
          color: #D4AF37 !important;
          text-align: right !important;
          background-color: #020B1C !important;
          border-bottom: 2px solid rgba(212, 175, 55, 0.3) !important;
          padding: 14px 16px !important;
          letter-spacing: normal !important;
        }

        .premium-treasury-table tbody td {
          font-size: 0.8rem !important;
          font-weight: 400 !important;
          text-align: center !important;
          border-bottom: 1px solid rgba(212, 175, 55, 0.1) !important;
          padding: 14px 16px !important;
          letter-spacing: normal !important;
        }

        .premium-treasury-table tbody tr:hover {
          background-color: rgba(7, 19, 42, 0.8) !important;
        }
      `}} />

      <Sidebar />
      <section className="w-full lg:pr-56 min-h-screen flex flex-col">
        <Header />
        
        <div className="p-4 md:p-8 space-y-6 text-right select-none">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#D4AF37]/20 pb-5">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[#D4AF37] flex items-center gap-2">
                <span>الدفتر العام وحسابات الخزنة والعهد</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-pulse" />
              </h1>
              <p className="text-white text-xs mt-2">تسجيل السندات، مقاصة عهد المهندسين، ومطابقة حسابات الموردين والشركاء .</p>
            </div>
          </div>

          {/* 🌟 إعادة تصميم تابات التحكم العلوية بالدستور المعتمد بالبكسل */}
          <div className="flex flex-row flex-nowrap overflow-x-auto gap-2 border-b border-[#D4AF37]/20 pb-4 print:hidden select-none">
            <button 
              onClick={() => { setActiveTab("overview"); clearForm(); }}
              className={`py-2.5 px-4 text-xs flex items-center gap-1.5 rounded-xl cursor-pointer transition-all duration-300 whitespace-nowrap shrink-0 ${
                activeTab === "overview" 
                  ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.25)] font-bold scale-[1.02]" 
                  : "bg-[#07132a] border border-[#D4AF37]/10 text-[#F0E6D2] hover:border-[#D4AF37]/30 hover:text-[#F0E6D2]"
              }`}
            >
              <Coins size={14} /> 
              <span>الأرصدة وقنوات السيولة</span>
            </button>
            <button 
              onClick={() => { setActiveTab("vouchers"); clearForm(); }}
              className={`py-2.5 px-4 text-xs flex items-center gap-1.5 rounded-xl cursor-pointer transition-all duration-300 whitespace-nowrap shrink-0 ${
                activeTab === "vouchers" 
                  ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.25)] font-bold scale-[1.02]" 
                  : "bg-[#07132a] border border-[#D4AF37]/10 text-[#F0E6D2] hover:border-[#D4AF37]/30 hover:text-[#F0E6D2]"
              }`}
            >
              <Receipt size={14} /> 
              <span>تحرير سند (قبض / صرف)</span>
            </button>
            <button 
              onClick={() => { setActiveTab("ledgers"); clearForm(); }}
              className={`py-2.5 px-4 text-xs flex items-center gap-1.5 rounded-xl cursor-pointer transition-all duration-300 whitespace-nowrap shrink-0 ${
                activeTab === "ledgers" 
                  ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.25)] font-bold scale-[1.02]" 
                  : "bg-[#07132a] border border-[#D4AF37]/10 text-[#F0E6D2] hover:border-[#D4AF37]/30 hover:text-[#F0E6D2]"
              }`}
            >
              <Users size={14} /> 
              <span>كشوف الشركاء والذمم المالية</span>
            </button>
            <button 
              onClick={() => { setActiveTab("analysis"); clearForm(); }}
              className={`py-2.5 px-4 text-xs flex items-center gap-1.5 rounded-xl cursor-pointer transition-all duration-300 whitespace-nowrap shrink-0 ${
                activeTab === "analysis" 
                  ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.25)] font-bold scale-[1.02]" 
                  : "bg-[#07132a] border border-[#D4AF37]/10 text-[#F0E6D2] hover:border-[#D4AF37]/30 hover:text-[#F0E6D2]"
              }`}
            >
              <Briefcase size={14} /> 
              <span>الأرباح والمصروفات</span>
            </button>
          </div>

          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-right">
                
                <div className="p-4 rounded-[2rem] bg-[#07132a] border border-[#D4AF37]/20 flex flex-col justify-between h-24 shadow-xl">
                  <span className="text-[10px] text-gray-400 font-bold block">💵 رصيد الخزينة (كاش)</span>
                  <span className="text-sm sm:text-base font-black text-[#D4AF37] font-mono tracking-tight">
                    {financialTotals.cashBalance.toLocaleString('en-US')} ج.م
                  </span>
                </div>

                <div className="p-4 rounded-[2rem] bg-[#07132a] border border-[#D4AF37]/20 flex flex-col justify-between h-24 shadow-xl">
                  <span className="text-[10px] text-gray-400 font-bold block">🏦 رصيد الحساب البنكي</span>
                  <span className="text-sm sm:text-base font-black text-[#D4AF37] font-mono tracking-tight">
                    {financialTotals.bankBalance.toLocaleString('en-US')} ج.م
                  </span>
                </div>

                <div className="p-4 rounded-[2rem] bg-[#07132a] border border-[#D4AF37]/20 flex flex-col justify-between h-24 shadow-xl">
                  <span className="text-[10px] text-gray-400 font-bold block">📥 إجمالي المقبوضات (الوارد)</span>
                  <span className="text-sm sm:text-base font-black text-emerald-400 font-mono tracking-tight">
                    +{financialTotals.totalReceipts.toLocaleString('en-US')} ج.م
                  </span>
                </div>

                <div className="p-4 rounded-[2rem] bg-[#07132a] border border-[#D4AF37]/20 flex flex-col justify-between h-24 shadow-xl">
                  <span className="text-[10px] text-gray-400 font-bold block">📤 إجمالي المصروفات (الصادر)</span>
                  <span className="text-sm sm:text-base font-black text-rose-400 font-mono tracking-tight">
                    -{financialTotals.totalPayments.toLocaleString('en-US')} ج.م
                  </span>
                </div>

                <div className="p-4 rounded-[2rem] bg-[#07132a] border-2 border-[#D4AF37] flex flex-col justify-between h-24 shadow-md shadow-[#D4AF37]/10">
                  <span className="text-[10px] text-[#D4AF37] font-black block">🏆 صافي الأرباح للشركة</span>
                  <span className="text-sm sm:text-base font-black text-[#D4AF37] font-mono tracking-tight">
                    {financialTotals.netProfit.toLocaleString('en-US')} ج.م
                  </span>
                </div>

                <div className="p-4 rounded-[2rem] bg-[#07132a] border border-[#D4AF37]/20 flex flex-col justify-between h-24 shadow-xl">
                  <span className="text-[10px] text-gray-400 font-bold block">👥 مستحقات جارية لدى العملاء</span>
                  <span className="text-sm sm:text-base font-black text-emerald-400 font-mono tracking-tight">
                    {financialTotals.clientReceivables.toLocaleString('en-US')} ج.م
                  </span>
                </div>

                <div className="p-4 rounded-[2rem] bg-[#07132a] border border-[#D4AF37]/20 flex flex-col justify-between h-24 shadow-xl">
                  <span className="text-[10px] text-gray-400 font-bold block">📦 مستحقات آجلة للموردين</span>
                  <span className="text-sm sm:text-base font-black text-rose-400 font-mono tracking-tight">
                    {financialTotals.supplierPayables.toLocaleString('en-US')} ج.م
                  </span>
                </div>

                <div className="p-4 rounded-[2rem] bg-[#07132a] border border-[#D4AF37]/20 flex flex-col justify-between h-24 shadow-xl">
                  <span className="text-[10px] text-gray-400 font-bold block">👷 مستحقات مقاولي الباطن</span>
                  <span className="text-sm sm:text-base font-black text-rose-400 font-mono tracking-tight">
                    {financialTotals.subcontractorPayables.toLocaleString('en-US')} ج.م
                  </span>
                </div>

              </div>

              <div className="bg-[#07132a] border-2 border-[#D4AF37] rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
                <h3 className="text-[#D4AF37] font-bold text-base md:text-lg mb-4 flex items-center gap-2">
                  <Landmark size={18} />
                  <span>توزيع وهيكلة قنوات السيولة الجارية (Liquidity Channels)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-semibold text-xs">
                  
                  <div className="p-4 bg-[#020B1C]/50 rounded-2xl border border-[#D4AF37]/15 space-y-3 shadow-xl">
                    <span className="text-[#F0E6D2] text-sm font-bold block">الصندوق الرئيسي (الخزينة)</span>
                    <div className="flex justify-between">
                      <span className="text-gray-400">إجمالي الدخل:</span>
                      <span className="font-mono text-emerald-400">+{liquidityChannels.main.in.toLocaleString('en-US')} ج.م</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">إجمالي الخارج:</span>
                      <span className="font-mono text-rose-400 font-bold">-{liquidityChannels.main.out.toLocaleString('en-US')} ج.م</span>
                    </div>
                    <div className="border-t border-[#D4AF37]/10 pt-2 flex justify-between font-bold text-sm">
                      <span className="text-[#D4AF37]">السيولة الحالية:</span>
                      <span className="font-mono text-[#D4AF37]">{liquidityChannels.main.current.toLocaleString('en-US')} ج.م</span>
                    </div>
                  </div>

                  <div className="p-4 bg-[#020B1C]/50 rounded-2xl border border-[#D4AF37]/15 space-y-3 shadow-xl">
                    <span className="text-[#F0E6D2] text-sm font-bold block">صندوق الموقع (عُهد المهندسين)</span>
                    <div className="flex justify-between">
                      <span className="text-gray-400">عهد منصرفة:</span>
                      <span className="font-mono text-emerald-400">+{liquidityChannels.site.in.toLocaleString('en-US')} ج.م</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">تسويات مستلمة:</span>
                      <span className="font-mono text-rose-400">-{liquidityChannels.site.out.toLocaleString('en-US')} ج.م</span>
                    </div>
                    <div className="border-t border-[#D4AF37]/10 pt-2 flex justify-between font-bold text-sm">
                      <span className="text-[#D4AF37]">السيولة المعلقة:</span>
                      <span className="font-mono text-[#D4AF37]">{liquidityChannels.site.current.toLocaleString('en-US')} ج.م</span>
                    </div>
                  </div>

                  <div className="p-4 bg-[#020B1C]/50 rounded-2xl border border-[#D4AF37]/15 space-y-3 shadow-xl">
                    <span className="text-[#F0E6D2] text-sm font-bold block">الحساب البنكي الرسمي للشركة</span>
                    <div className="flex justify-between">
                      <span className="text-gray-400">إجمالي الدخل:</span>
                      <span className="font-mono text-emerald-400">+{liquidityChannels.bank.in.toLocaleString('en-US')} ج.م</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">إجمالي الخارج:</span>
                      <span className="font-mono text-rose-400">-{liquidityChannels.bank.out.toLocaleString('en-US')} ج.م</span>
                    </div>
                    <div className="border-t border-[#D4AF37]/10 pt-2 flex justify-between font-bold text-sm">
                      <span className="text-[#D4AF37]">السيولة الحالية:</span>
                      <span className="font-mono text-[#D4AF37]">{liquidityChannels.bank.current.toLocaleString('en-US')} ج.م</span>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {activeTab === "vouchers" && (
            <div className="bg-[#07132a] border-2 border-[#D4AF37] rounded-[2rem] p-6 space-y-6 relative overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
              <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
              
              <div className="flex items-center justify-between border-b border-[#D4AF37] pb-4">
                <h3 className="text-[#D4AF37] font-bold text-lg md:text-xl flex items-center gap-2">
                  <Sparkles className="w-5 h-5 animate-pulse text-[#D4AF37]" />
                  <span>إصدار وتحرير المعاملة المالية (سند القبض / سند الصرف)</span>
                </h3>
                
                <div className="flex items-center gap-2 bg-[#020B1C] border border-[#D4AF37]/35 rounded-xl p-1 select-none text-[10px] font-bold">
                  <button 
                    type="button"
                    onClick={() => { setVoucherType("receipt"); clearForm(); }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${voucherType === "receipt" ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-white"}`}
                  >
                    🟢 سند قبــض (وارد)
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setVoucherType("payment"); clearForm(); }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${voucherType === "payment" ? "bg-rose-600 text-white" : "text-gray-400 hover:text-white"}`}
                  >
                    🔴 سند صــرف (صادر)
                  </button>
                </div>
              </div>

              <form onSubmit={handleRegisterVoucher} className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm font-semibold text-slate-300">
                
                <div>
                  <label className="block text-[#D4AF37] mb-2 px-2">رقم السند المالي تلقائياً *</label>
                  <input
                    type="text"
                    value={voucherType === "receipt" ? nextReceiptNumber : nextPaymentNumber}
                    disabled
                    className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-gray-500 px-4 outline-none text-center font-mono font-bold text-sm animate-pulse"
                  />
                </div>

                <div>
                  <label className="block text-[#D4AF37] px-2 mb-2">تاريخ القيد والتأريخ اليومي *</label>
                  <input
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#F0E6D2] px-4 outline-none font-mono focus:border-[#D4AF37]"
                  />
                </div>

                {voucherType === "receipt" ? (
                  <div>
                    <label className="block text-[#D4AF37] px-2 mb-2">العميل المسدد للدفعة *</label>
                    <select
                      value={selectedCustomerId}
                      required
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value);
                        const matchedProj = projects.find(p => p.customer_id === e.target.value);
                        if (matchedProj) setProjectId(matchedProj.id);
                      }}
                      className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] font-bold px-3 outline-none focus:border-[#D4AF37]"
                    >
                      <option value="">-- اختر العميل من سجل الـ CRM --</option>
                      {customers.map((c: any) => (
                        <option key={c.id} value={c.id}>👤 {c.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[#D4AF37] font-black mb-2">تصنيف بنود وسندات الصرف الجارية *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-3 outline-none focus:border-[#D4AF37]"
                    >
                      <option value="material_purchase">شراء وتوريد خامات ومواد بالموقع</option>
                      <option value="subcontractor_labor">مصنعيات وأجور عمالة الباطن</option>
                      <option value="petty_cash_advance">صرف عهدة نقدية لمهندس الموقع 👷</option>
                      <option value="petty_cash_settled">تسوية عهدة الموقع بالفواتير 🧾</option>
                      <option value="administrative">مصاريف إدارية ومقرات للشركة</option>
                      <option value="other_out">مصروفات نثرية وإكراميات مفقودة</option>
                    </select>
                  </div>
                )}

                {/* 🌟 حقن معالج وسام فاصل الآلاف المحاسبي الفوري لمنع الأخطاء المليونية */}
                <div>
                  <div className="flex justify-between items-center mb-2 px-1">
                    <label className="block text-[#D4AF37] px-2">قيمة المبلغ المالي المطلوب (ج.م) *</label>
                    {amount !== "" && (
                      <span className="text-emerald-400 font-mono font-black text-xs animate-pulse">
                        {Number(amount).toLocaleString('en-US')} ج.م
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    placeholder="0.00"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value !== "" ? Number(e.target.value) : "")}
                    className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-4 outline-none focus:border-[#D4AF37] font-mono text-sm font-black"
                  />
                </div>

                <div>
                  <label className="block text-[#D4AF37] px-2 mb-2">طريقة الدفع أو الاستلام *</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] font-bold px-3 outline-none focus:border-[#D4AF37]"
                  >
                    <option value="cash">خزينة نقدية (كاش) 🏛️</option>
                    <option value="bank">حساب بنكي للشركة 🏦</option>
                    <option value="instapay">إنستا باي (InstaPay) ⚡</option>
                    <option value="vodafone_cash">فودافون كاش 📱</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#D4AF37] px-2 mb-2">📁 رابط مستند المرفق (شيك، إيصال تحويل Google Drive)</label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/..."
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-emerald-400 px-4 outline-none font-mono focus:border-[#D4AF37] text-xs"
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[#D4AF37] px-2 mb-2">مشروع موقع العمل المرتبط (مركز التكلفة للموازنة) *</label>
                  <select
                    value={projId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-3 outline-none focus:border-[#D4AF37] text-sm"
                  >
                    <option value="">-- عام لمقرات ومصاريف الشركة (بدون مشروع محدد) --</option>
                    {projects.map((p: any) => (
                      <option key={p.id} value={p.id}>🏢 {p.project_name}</option>
                    ))}
                  </select>
                </div>

                {voucherType === "receipt" && installments.length > 0 && (
                  <div className="col-span-1 md:col-span-2 bg-[#020B1C] p-4 rounded-xl border border-[#D4AF37]/25 space-y-2">
                    <label className="block text-[#D4AF37] text-xs font-black">⚙️ مقاصة الأقساط: حدد القسط المجدول لتسويته وإغلاقه في حساب العميل *</label>
                    <select
                      value={linkedInstallmentId}
                      onChange={(e) => setLinkedInstallmentId(e.target.value)}
                      className="w-full h-11 rounded-lg bg-[#07132a] border border-[#243556] text-[#F0E6D2] px-3 text-xs outline-none focus:border-[#D4AF37]"
                    >
                      <option value="">-- تسوية عامة للحساب (بدون ربط بقسط محدد) --</option>
                      {installments.map((inst: any) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.milestone_name} - القيمة المتوقعة: {Number(inst.amount).toLocaleString('en-US')} ج.م (تاريخ الاستحقاق: {inst.due_date})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {voucherType === "payment" && (category === "petty_cash_advance" || category === "petty_cash_settled") && (
                  <div className="col-span-1 md:col-span-2 bg-[#020B1C] p-4 rounded-xl border border-[#D4AF37]/25 space-y-2">
                    <label className="block text-[#D4AF37] text-xs font-black">👷 تحديد مهندس الموقع المسؤول عن العهدة النقدية للربط والتسوية *</label>
                    <select
                      value={selectedEngineerId}
                      onChange={(e) => setSelectedEngineerId(e.target.value)}
                      className="w-full h-11 rounded-lg bg-[#07132a] border border-[#243556] text-[#F0E6D2] px-3 text-xs outline-none focus:border-[#D4AF37]"
                    >
                      <option value="">-- اختر المهندس من طاقم الموقع المعتمد --</option>
                      {engineers.map((eng) => (
                        <option key={eng.id} value={eng.id}>👷 {eng.name} (مهندس موقع)</option>
                      ))}
                    </select>
                  </div>
                )}

                {voucherType === "payment" && category === "subcontractor_labor" && (
                  <div className="col-span-1 md:col-span-2 bg-[#020B1C] p-4 rounded-xl border border-[#D4AF37]/25 space-y-2">
                    <label className="block text-[#D4AF37] text-xs font-bold">👤 تحديد مقاول الباطن المستلم للدفعة النقدية *</label>
                    <select
                      value={selectedSubcontractorId}
                      onChange={(e) => setSelectedSubcontractorId(e.target.value)}
                      className="w-full h-11 rounded-lg bg-[#07132a] border border-[#243556] text-[#F0E6D2] px-3 text-xs outline-none focus:border-[#D4AF37]"
                    >
                      <option value="">-- اختر المقاول لتنزيل القيمة من ذمته ومستخلصاته بالموقع --</option>
                      {subcontractors.map((s: any) => (
                        <option key={s.id} value={s.id}>👷 {s.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[#D4AF37] px-2 mb-2">البيان المالي والشرح التفصيلي لغرض السند (ملاحظات)</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: دفعة تحت الحساب لأعمال السباكة / مستخلص المحارة لشقة الكرامة"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#243556] text-white px-4 outline-none focus:border-[#D4AF37]"
                  />
                </div>

                {/* 🌟 إعادة تنسيق الأزرار بالدستور البصري المذهب مع عواكس الإضاءة النيونية السفلى الحصرية */}
                <div className="col-span-1 md:col-span-2 flex justify-end gap-3 pt-4 border-t border-[#243556]">
                  <button 
                    type="button" 
                    onClick={clearForm}
                    className="px-6 h-12 rounded-xl bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-800 transition duration-150 cursor-pointer text-xs font-bold"
                  >
                    تفريغ الحقول
                  </button>
                  <button 
                    type="submit"
                    disabled={actionLoading}
                    className="px-8 h-12 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.03] active:scale-95 transition-all duration-300 cursor-pointer text-xs font-black flex items-center gap-2 select-none relative overflow-hidden disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <ShieldCheck size={16} />}
                    <span>تأكيد وإصدار السند المالي رسمياً</span>
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* 🌟 التبويب 3: دفاتر الأستاذ والذمم للشركاء (عملاء، موردين، مقاولي باطن) */}
          {activeTab === "ledgers" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              <div className="bg-[#07132a] border border-[#D4AF37]/20 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <span className="text-gray-200 font-bold text-xs">🔍 محرك البحث في كشوف الشركاء والمقاصة المالية للشركة</span>
                <div className="relative group w-full sm:w-80">
                  <input
                    type="text"
                    placeholder="ابحث بالاسم، الكود، الفئة أو الهاتف..."
                    value={ledgerSearchQuery}
                    onChange={(e) => setLedgerSearchQuery(e.target.value)}
                    className="w-full h-10 rounded-full bg-[#020B1C] border border-[#243556] text-white pr-10 pl-4 text-xs font-bold outline-none focus:border-[#D4AF37]"
                  />
                  <Search className="absolute right-3.5 top-3 text-[#D4AF37] w-4 h-4" />
                </div>
              </div>

              {/* 1. دفتر أستاذ كشوف العملاء */}
              <div className="bg-[#07132a] border-2 border-[#D4AF37] rounded-[2rem] overflow-hidden shadow-2xl relative flex flex-col w-full">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
                <div className="p-4 border-b border-[#D4AF37]/20 bg-[#0b1b3d]/60 flex items-center justify-between">
                  <h3 className="text-[#D4AF37] font-bold text-sm md:text-base flex items-center gap-1.5">
                    <Users size={16} />
                    <span>كشوف مديونيات وعقود العملاء الجارية بالـ CRM ({filteredLedgers.clients.length})</span>
                  </h3>
                </div>
                
                <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
                  <table className="w-full text-right table-auto premium-treasury-table">
                    <thead>
                      <tr className="whitespace-nowrap select-none ">
                        <th className="">كود العميل</th>
                        <th>كود المشروع</th>
                        <th>اسم العميل</th>
                        <th>قيمة العقد الكلي</th>
                        <th>المدفوع الفعلي</th>
                        <th>المتبقي ذمة</th>
                        <th>تاريخ آخر دفعة</th>
                        <th className="text-center">كشف الحساب</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLedgers.clients.map((c) => (
                        <tr key={c.id}>
                          <td className="font-mono text-[#D4AF37] font-medium">{c.code}</td>
                          <td className="font-mono text-slate-300">{c.projCode}</td>
                          <td className="font-medium text-slate-100">{c.name}</td>
                          <td className="font-mono text-slate-200">{(c.contractValue).toLocaleString('en-US')} ج.م</td>
                          <td className="font-mono text-emerald-400 font-medium">{(c.paid).toLocaleString('en-US')} ج.م</td>
                          <td className="font-mono text-rose-400 font-medium">{(c.remaining).toLocaleString('en-US')} ج.م</td>
                          <td className="font-mono text-slate-400 text-xs">{c.lastPaymentDate}</td>
                          <td className="text-center">
                            <button 
                              onClick={() => openStatementPopup(c, "customer")}
                              className="text-xs bg-[#020B1C] border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black px-2.5 py-1 rounded transition-all cursor-pointer font-bold"
                            >
                              📄 كشف الحساب
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. دفتر أستاذ كشوف الموردين */}
              <div className="bg-[#07132a] border-2 border-[#D4AF37] rounded-[2rem] overflow-hidden shadow-2xl relative flex flex-col w-full">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
                <div className="p-4 border-b border-[#D4AF37]/20 bg-[#0b1b3d]/60">
                  <h3 className="text-[#D4AF37] font-bold text-sm md:text-base flex items-center gap-1.5">
                    <Briefcase size={16} />
                    <span>كشوف حسابات الموردين المعتمدين والمشتريات الآجلة ({filteredLedgers.suppliers.length})</span>
                  </h3>
                </div>
                
                <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
                  <table className="w-full text-right table-auto premium-treasury-table">
                    <thead>
                      <tr className="whitespace-nowrap select-none">
                        <th>اسم المورد / الشركة</th>
                        <th>إجمالي المشتريات التراكمية</th>
                        <th>المسدد كاش</th>
                        <th>المتبقي ذمة (الآجل المستحق)</th>
                        <th>مركز التكلفة / المشروع</th>
                        <th>الملاحظات</th>
                        <th className="text-center">كشف الحساب</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLedgers.suppliers.map((s, idx) => (
                        <tr key={idx}>
                          <td className="font-medium text-slate-100">{s.name}</td>
                          <td className="font-mono text-slate-300">{(s.purchases).toLocaleString('en-US')} ج.م</td>
                          <td className="font-mono text-emerald-400 font-medium">{(s.paid).toLocaleString('en-US')} ج.م</td>
                          <td className="font-mono text-rose-400 font-medium">{(s.remaining).toLocaleString('en-US')} ج.م</td>
                          <td className="text-white font-medium">{s.projectName}</td>
                          <td className="text-gray-400 text-xs max-w-xs truncate">{s.notes}</td>
                          <td className="text-center">
                            <button 
                              onClick={() => openStatementPopup(s, "supplier")}
                              className="text-xs bg-[#020B1C] border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black px-2.5 py-1 rounded transition-all cursor-pointer font-bold"
                            >
                              📄 كشف الحساب
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. دفتر أستاذ حسابات مقاولي الباطن */}
              <div className="bg-[#07132a] border-2 border-[#D4AF37] rounded-[2rem] overflow-hidden shadow-2xl relative flex flex-col w-full">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
                <div className="p-4 border-b border-[#D4AF37]/20 bg-[#0b1b3d]/60">
                  <h3 className="text-[#D4AF37] font-bold text-sm md:text-base flex items-center gap-1.5">
                    <HardHat size={16} />
                    <span>كشوف حسابات مقاولي الباطن وعقود التشغيل ({filteredLedgers.subcontractorsList.length})</span>
                  </h3>
                </div>
                
                <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
                  <table className="w-full text-right table-auto premium-treasury-table">
                    <thead>
                      <tr className="whitespace-nowrap select-none">
                        <th>اسم المقاول </th>
                        <th>التخصص المعماري</th>
                        <th>قيمة المقاولة الإجمالية</th>
                        <th>المستخلص المسدد</th>
                        <th>المتبقي له ذمة للشركة</th>
                        <th>الموقع الحالي المستلم له</th>
                        <th className="text-center">كشف الحساب</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLedgers.subcontractorsList.map((sub) => (
                        <tr key={sub.id}>
                          <td className="font-medium text-slate-100">{sub.name}</td>
                          <td className="text-[#F0E6D2] text-xs">{sub.specialty}</td>
                          <td className="font-mono text-slate-300">{(sub.contractValue).toLocaleString('en-US')} ج.م</td>
                          <td className="font-mono text-emerald-400 font-medium">{(sub.paid).toLocaleString('en-US')} ج.م</td>
                          <td className="font-mono text-rose-400 font-medium">{(sub.remaining).toLocaleString('en-US')} ج.م</td>
                          <td className="text-white text-xs">{sub.projectName}</td>
                          <td className="text-center">
                            <button 
                              onClick={() => openStatementPopup(sub, "subcontractor")}
                              className="text-xs bg-[#020B1C] border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black px-2.5 py-1 rounded transition-all cursor-pointer font-bold"
                            >
                              📄 كشف الحساب
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {activeTab === "analysis" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
              
              <div className="lg:col-span-1 bg-[#07132a] border-2 border-[#D4AF37] rounded-[2rem] p-6 shadow-2xl relative overflow-hidden h-fit">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
                <h3 className="text-[#D4AF37] font-bold text-md md:text-md mb-4 flex items-center gap-1.5 border-b border-[#D4AF37] pb-3">
                  <Receipt size={16} />
                  <span> توزيع المصروفات </span>
                </h3>

                <div className="space-y-3 font-semibold text-xs text-slate-300">
                  {categorizedExpenses.list.map((cat: any, idx: number) => (
                    <div key={idx} className="p-3 bg-[#020B1C]/55 rounded-xl border border-[#D4AF37]/10 flex justify-between items-center transition-all hover:border-[#D4AF37]/35">
                      <span className="text-[#F0E6D2] font-bold">{cat.label}</span>
                      <span className="font-mono font-bold text-[#D4AF37]">{(cat.value).toLocaleString('en-US')} ج.م</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 bg-[#07132a] border-2 border-[#D4AF37] rounded-[2rem] p-6 shadow-2xl relative overflow-hidden h-fit">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
                <h3 className="text-[#D4AF37] font-bold text-md md:text-md mb-4 flex items-center gap-1.5 border-b border-[#D4AF37] pb-3">
                  <TrendingUp size={16} />
                  <span>الأرباح ونسب الهامش الصافي لكل مشروع</span>
                </h3>

                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-right table-auto premium-treasury-table">
                    <thead>
                      <tr className="whitespace-nowrap select-none">
                        <th>اسم المشروع وموقعه</th>
                        <th>قيمة التعاقد</th>
                        <th>صادر المصروفات</th>
                        <th>صافي الأرباح للشركة</th>
                        <th className="text-center">نسبة الربح %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectProfitsList.map((p) => {
                        const isHighProfit = p.profitMargin >= 30;
                        return (
                          <tr key={p.id}>
                            <td className="font-medium text-slate-100">{p.name}</td>
                            <td className="font-mono text-slate-200">{(p.totalContract).toLocaleString('en-US')} ج.م</td>
                            <td className="font-mono text-rose-400">{(p.totalOutflows).toLocaleString('en-US')} ج.م</td>
                            <td className="font-mono text-emerald-400 font-medium">{(p.netProfit).toLocaleString('en-US')} ج.م</td>
                            <td className="text-center">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium ${isHighProfit ? "bg-emerald-500/10 text-emerald-400" : "bg-[#C9A45D]/10 text-[#C9A45D]"}`}>
                                {p.profitMargin}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          <div className="hidden print:flex flex-col mt-12 pt-8 border-t-2 border-slate-900 text-slate-900 select-none text-xs font-black">
            <div className="flex justify-between px-6">
              <div className="text-center">
                <p className="mb-8">الاعتماد والمراجعة المالي والقانوني</p>
                <p className="border-b border-slate-400 w-32 mx-auto"></p>
              </div>
              <div className="text-center">
                <p className="mb-8">المدير العام والمالك للمجموعة</p>
                <p className="border-b border-slate-400 w-32 mx-auto"></p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 🌟 إعادة هيكلة وتصميم بوب اب كشف الحساب الرقابي بالدستور الملكي */}
      {statementPartner && statementType && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 text-white text-right select-none animate-in zoom-in duration-300">
          <div className="bg-[#07132a] border-2 border-[#D4AF37] rounded-[2rem] p-6 md:p-8 w-full max-w-2xl shadow-2xl relative space-y-6">
            
            <div className="flex justify-between items-center border-b border-[#D4AF37]/20 pb-3">
              <h3 className="text-[#D4AF37] font-black text-lg md:text-xl flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#D4AF37] animate-pulse" />
                <span>كشف الحساب المالي التفصيلي والرقابي للشركة</span>
              </h3>
              <button 
                type="button"
                onClick={() => { setStatementPartner(null); setStatementType(null); }}
                className="w-8 h-8 rounded-lg bg-red-950/40 border border-red-500/30 hover:bg-red-600 transition flex items-center justify-center font-black cursor-pointer text-white shadow-md text-sm select-none"
              >
                -
              </button>
            </div>

            <div className="space-y-4 text-xs md:text-sm font-semibold text-slate-300 max-h-[380px] overflow-y-auto pr-1">
              
              <div className="p-4 bg-[#020B1C]/50 rounded-2xl border border-[#D4AF37]/15 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 block text-[10px]">الاسم المسجل للطرف الثاني:</span>
                  <span className="text-white font-medium text-sm block mt-0.5">{statementPartner.name}</span>
                </div>
                {statementType === "customer" ? (
                  <div>
                    <span className="text-gray-400 block text-[10px]">كود العميل والمشروع الموحد:</span>
                    <span className="text-[#D4AF37] font-mono font-medium text-xs block mt-0.5">{statementPartner.code} | {statementPartner.projCode}</span>
                  </div>
                ) : (
                  <div>
                    <span className="text-gray-400 block text-[10px]">الموقع والمستهدف الميداني:</span>
                    <span className="text-[#D4AF37] font-bold text-xs block mt-0.5">{statementPartner.projectName || "عام بالشركة"}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-[#020B1C]/50 border border-[#D4AF37]/15 rounded-xl">
                  <span className="text-gray-400 block text-[10px]">إجمالي الالتزام / العقد</span>
                  <span className="text-[#F0E6D2] font-mono font-medium block mt-1">
                    {(statementType === "customer" ? statementPartner.contractValue : statementType === "supplier" ? statementPartner.purchases : statementPartner.contractValue).toLocaleString('en-US')} ج.م
                  </span>
                </div>
                <div className="p-3 bg-[#020B1C]/50 border border-[#D4AF37]/15 rounded-xl">
                  <span className="text-gray-400 block text-[10px]">المسدد كاش فعلياً</span>
                  <span className="text-emerald-400 font-mono font-medium block mt-1">
                    {(statementPartner.paid || 0).toLocaleString('en-US')} ج.م
                  </span>
                </div>
                <div className="p-3 bg-[#020B1C]/50 border border-rose-500/20 rounded-xl">
                  <span className="text-gray-400 block text-[10px]">المتبقي (الذمة المالية المعلقة)</span>
                  <span className="text-rose-400 font-mono font-medium block mt-1">
                    {(statementPartner.remaining || 0).toLocaleString('en-US')} ج.م
                  </span>
                </div>
              </div>

              <div className="border border-[#D4AF37]/20 rounded-xl overflow-hidden mt-4">
                <div className="p-2.5 bg-black/60 border-b border-[#D4AF37]/20 text-white text-xs font-black">سجل السندات المرتبطة المأرشفة في الخزينة:</div>
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full text-right premium-treasury-table">
                    <thead>
                      <tr>
                        <th className="p-2">تاريخ القيد</th>
                        <th className="p-2">طريقة الدفع</th>
                        <th className="p-2">التفصيل / البيان</th>
                        <th className="p-2 text-left">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D4AF37]/10">
                      {transactions
                        .filter(t => 
                          (statementType === "customer" && t.project_id === projects.find(p => p.customer_id === statementPartner.id)?.id) ||
                          (statementType !== "customer" && t.subcontractor_id === statementPartner.id)
                        )
                        .map((tx, idx) => (
                          <tr key={idx} className="hover:bg-[#1f2d4d]/20 text-slate-300">
                            <td className="p-2 font-mono">{new Date(tx.created_at).toLocaleDateString("ar-EG")}</td>
                            <td className="p-2">{methodLabels[tx.payment_method]}</td>
                            <td className="p-2 max-w-[140px] truncate" title={tx.notes}>{tx.notes || "-"}</td>
                            <td className={`p-2 font-mono font-medium text-left ${tx.type === "inflow" ? "text-emerald-400" : "text-rose-400"}`}>
                              {tx.type === "inflow" ? "+" : "-"}{(tx.amount || 0).toLocaleString('en-US')} ج.م
                            </td>
                          </tr>
                        ))
                      }
                      {transactions.filter(t => 
                        (statementType === "customer" && t.project_id === projects.find(p => p.customer_id === statementPartner.id)?.id) ||
                        (statementType !== "customer" && t.subcontractor_id === statementPartner.id)
                      ).length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-gray-500 font-bold">لا توجد حركات مسجلة لحساب هذا الطرف بالخزينة حالياً.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* أزرار تفاعلية مذهبة مطابقة للدستور البصري الحركي */}
            <div className="border-t border-[#D4AF37]/20 pt-4 flex justify-between items-center text-xs font-bold">
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>حسابات معتمدة ومطابقة لشركة جولدن ديكوراشن</span>
              </span>
              <button
                type="button"
                onClick={() => { setStatementPartner(null); setStatementType(null); }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_25px_rgba(212,175,55,0.35)] transition-all duration-300 cursor-pointer text-xs font-black relative overflow-hidden"
              >
                إغلاق كشف الحساب
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
              </button>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}