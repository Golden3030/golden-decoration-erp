"use client";

import { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";
import { isOnline, addToOfflineQueue } from "@/lib/offline-sync";
import { Download, Plus, Trash2, Edit3, Layers, FileText, CheckCircle, Search, RefreshCw, Sparkles } from "lucide-react";

interface ProductItem {
  id: string;
  code: string;
  category: string;
  subcategory: string;
  company: string;
  product_name: string;
  unit: string;
  price: number;
}

interface SpecItem {
  id: string;
  code: string;
  spec_name: string;
  description: string;
  category: string;
  icon: string;
  steps: string[];
  base_rate?: number; 
}

const categoryKeys: { [key: string]: string } = {
  "دهانات": "paint",
  "أعمال المحارة": "plaster",
  "أعمال محارة": "plaster",
  "أرضيات": "flooring",
  "سباكة وتغذية": "plumbing",
  "كهرباء وإضاءة": "electricity",
  "أسقف معلقة": "ceiling",
  "أعمال التهوية والشفاطات": "ventilation"
};

const subcategoryKeys: { [key: string]: string } = {
  "سيلر": "sealer",
  "معجون": "putty",
  "بطانة": "primer",
  "دهان حوائط": "wallPaint",
  "دهان أسقف": "ceilingPaint",
  "عزل مائي": "insulation",
  "مواسير تغذية": "supply_pipes",
  "مواسير صرف": "drain_pipes",
  "محابس": "valves",
  "أدوات صحية": "sanitary",
  "خلاطات": "faucets",
  "بانيو": "bathtub",
  "كابينة شاور": "shower_cabin",
  "علب ماجيك": "boxes",
  "خراطيم": "hoses",
  "أسلاك": "wires",
  "لوحة": "panel",
  "مفاتيح وبرايز": "switches",
  "سبوت لايت": "sockets",
  "قواطع": "breakers",
  "أرضيات ريسبشن": "reception",
  "أرضيات غرف": "rooms",
  "أرضيات مطبخ": "kitchen",
  "أرضيات حمامات": "baths",
  "حوائط مطبخ": "kitchen_walls",
  "حوائط حمامات": "baths_walls",
  "اضاءة": "lighting",
  "أسمنت": "cement",
  "رمل": "sand",
  "إكسسوارات محارة": "plaster_accessories",
  "قطع خاصة وكماليات": "plumbing_fittings",
  "شاسيهات ووشوش": "electricity_accessories",
  "ملونات": "paint_accessories",
  "مواد لاصقة وسقاية": "flooring_accessories",
  "بلاور": "blower",
  "جريلة": "grille",
  "هواية": "vent_cover",
  "وصلة ماسورة": "pipe_connector",
  "فلكسبل": "flexible_hose",
  "مشترك": "t_junction",
  "مسامير ولاصق وقفايز": "fasteners",
  "فوم": "foam",
  "كور": "core_drilling",
  "إيجار مولد فتح الكور": "generator",
  "تركيب الشفاطات": "installation",
  "مادة السقية": "grouting" 
};

const specCategoryLabels: { [key: string]: string } = {
  plaster: "أعمال المحارة",
  ceiling: "الأسقف المعلقة والجبس بورد",
  doors: "أعمال الأبواب والنجارة",
  aluminum: "الشبابيك والألوميتال",
  ac: "أعمال التكييف والتمديدات",
  ventilation: "أعمال التهوية والشفاطات"
};

export default function ItemsMaterialsPage() {
  const [activeTab, setActiveTab] = useState<"products" | "specs">("products");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [specs, setSpecs] = useState<SpecItem[]>([]);

  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [selectedSpec, setSelectedSpec] = useState<SpecItem | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const [pCategory, setPCategory] = useState("دهانات");
  const [pSubcategory, setPSubcategory] = useState("سيلر"); 
  const [pCompany, setPCompany] = useState("");
  const [pName, setPName] = useState("");
  const [pUnit, setPUnit] = useState("بستلة");
  const [pPrice, setPPrice] = useState<number | "">("");

  const [sName, setSName] = useState("");
  const [sDesc, setSDesc] = useState("");
  const [sCategory, setSCategory] = useState("plaster");
  const [sIcon, setSIcon] = useState("📐");
  const [sStepsText, setSStepsText] = useState(""); 
  const [sBaseRate, setSBaseRate] = useState<number | "">(""); 

  function clearForm() {
    setSelectedProduct(null);
    setSelectedSpec(null);
    setPCompany("");
    setPName("");
    setPPrice("");
    setSName("");
    setSDesc("");
    setSCategory("plaster");
    setSIcon("📐");
    setSStepsText("");
    setSBaseRate("");
    setSearchQuery("");
  }

  useEffect(() => {
    document.title = "إدارة البنود والخامات | Golden Decoration";
  }, []);

  useEffect(() => {
    loadLibraryData();
    clearForm();
  }, [activeTab]);

  useEffect(() => {
    if (pCategory === "دهانات") setPSubcategory("سيلر");
    else if (pCategory === "سباكة وتغذية") setPSubcategory("عزل مائي");
    else if (pCategory === "أعمال التهوية والشفاطات") setPSubcategory("بلاور"); 
    else if (pCategory === "كهرباء وإضاءة") setPSubcategory("علب ماجيك");
    else if (pCategory === "أرضيات") setPSubcategory("أرضيات ريسبشن");
    else if (pCategory === "أعمال المحارة" || pCategory === "أعمال محارة") setPSubcategory("أسمنت");
  }, [pCategory]);

  async function loadLibraryData() {
    setLoading(true);
    try {
      if (activeTab === "products") {
        const { data, error } = await supabase
          .from("products_library")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setProducts(data || []);
      } else {
        const { data, error } = await supabase
          .from("specifications_library")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        
        const formattedSpecs = (data || []).map((s: any) => ({
          ...s,
          steps: Array.isArray(s.steps) ? s.steps : JSON.parse(s.steps || "[]")
        }));
        setSpecs(formattedSpecs);
      }
    } catch (err: any) {
      console.error("Database loading error:", err.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = useMemo(() => {
    let result = products;

    const targetCatDbKey = categoryKeys[pCategory];
    if (targetCatDbKey) {
      result = result.filter(p => p.category === targetCatDbKey);
    } else {
      result = [];
    }

    const targetSubcatDbKey = subcategoryKeys[pSubcategory];
    if (targetSubcatDbKey) {
      result = result.filter(p => p.subcategory === targetSubcatDbKey);
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return result;
    return result.filter(p => 
      String(p.product_name || "").toLowerCase().includes(q) ||
      String(p.code || "").toLowerCase().includes(q) ||
      String(p.company || "").toLowerCase().includes(q) ||
      String(p.category || "").toLowerCase().includes(q)
    );
  }, [products, pCategory, pSubcategory, searchQuery]);

  const filteredSpecs = useMemo(() => {
    let result = specs;

    if (sCategory) {
      result = result.filter(s => s.category === sCategory);
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return result;
    return result.filter(s => 
      String(s.spec_name || "").toLowerCase().includes(q) ||
      String(s.code || "").toLowerCase().includes(q) ||
      String(s.description || "").toLowerCase().includes(q)
    );
  }, [specs, sCategory, searchQuery]);

  const handleExportProductsToExcel = () => {
    const headers = ["التصنيف الإنشائي", "الشركة المصنعة", "اسم المنتج الخادم", "وحدة الحساب", "سعر الوحدة ج.م"];
    const rows = filteredProducts.map(p => [
      p.category, p.company || "-", p.product_name, p.unit, p.price
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "مكتبة_الخامات_والأسعار_المعتمدة.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  function selectProductRow(p: ProductItem) {
    setSelectedProduct(p);
    const matchedCategory = Object.keys(categoryKeys).find(k => categoryKeys[k] === p.category) || "دهانات";
    const matchedSubcategory = Object.keys(subcategoryKeys).find(k => subcategoryKeys[k] === p.subcategory) || "سيلر";
    setPCategory(matchedCategory);
    setPSubcategory(matchedSubcategory);
    setPCompany(p.company || "");
    setPName(p.product_name || "");
    setPUnit(p.unit || "بستلة");
    setPPrice(p.price || "");
  }

  function selectSpecCard(s: SpecItem) {
    setSelectedSpec(s);
    setSName(s.spec_name || "");
    setSDesc(s.description || "");
    setSCategory(s.category || "plaster");
    setSIcon(s.icon || "📐");
    setSStepsText((s.steps || []).join("\n"));
    setSBaseRate(s.base_rate || ""); 
  }

  const parseStepsTextToArray = (text: string): string[] => {
    return text.split("\n").map(line => line.trim()).filter(Boolean);
  };

  async function handleAddProduct() {
    if (!pName || pPrice === "") {
      alert("الرجاء إدخال اسم المنتج، والسعر بشكل صحيح للعملية.");
      return;
    }

    setSaving(true);
    const payload = {
      category: categoryKeys[pCategory] || "paint",
      subcategory: subcategoryKeys[pSubcategory] || pSubcategory, 
      company: pCompany || null,
      product_name: pName,
      unit: pUnit,
      price: Number(pPrice)
    };

    try {
      if (isOnline()) {
        const { error } = await supabase
          .from("products_library")
          .insert([payload]);

        if (error) throw error;

        await supabase.from("notifications").insert({
          title: "تسجيل خامة جديدة",
          message: `📦 تم إدراج خامة مالية جديدة بمكتبة الأسعار المعتمدة: (${pName}) تصنيف (${pCategory}) بسعر رسمي (${pPrice} ج.م / ${pUnit}).`,
          type: "procurement",
          link: "/products"
        });

        alert("✅ تم إدراج المنتج وتوليد الكود التلقائي له بنجاح سحابياً!");
      } else {
        addToOfflineQueue("products_library", "INSERT", payload);
        alert("⚠️ تم حفظ المنتج محلياً؛ سيتم مزامنته فور توفر الإنترنت.");
      }
      clearForm();
      await loadLibraryData();
    } catch (err: any) {
      alert("خطأ أثناء إدراج المنتج: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateProduct() {
    if (!selectedProduct) return;
    if (!pName || pPrice === "") {
      alert("الرجاء إدخال اسم المنتج، والسعر بشكل صحيح.");
      return;
    }

    setSaving(true);
    const payload = {
      category: categoryKeys[pCategory] || "paint",
      subcategory: subcategoryKeys[pSubcategory] || pSubcategory,
      company: pCompany || null,
      product_name: pName,
      unit: pUnit,
      price: Number(pPrice)
    };

    try {
      if (isOnline()) {
        const { error } = await supabase
          .from("products_library")
          .update(payload)
          .eq("id", selectedProduct.id);

        if (error) throw error;

        await supabase.from("notifications").insert({
          title: "تحديث خامة بمكتبة الأسعار",
          message: `✏️ تم تعديل وتحديث بيانات وتسعير الخامة: (${pName}) لتصبح بسعر رسمي معتمد (${pPrice} ج.م / ${pUnit}).`,
          type: "procurement",
          link: "/products"
        });

        alert("✅ تم تحديث وتعديل بيانات المنتج بنجاح بالسحابة!");
      } else {
        const offlinePayload = { ...payload, id: selectedProduct.id };
        addToOfflineQueue("products_library", "UPDATE", offlinePayload);
        alert("⚠️ تم حفظ التعديلات محلياً؛ سيتم المزامنة التلقائية فور توفر الشبكة.");
      }
      clearForm();
      await loadLibraryData();
    } catch (err: any) {
      alert("خطأ أثناء تحديث المنتج: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProduct() {
    if (!selectedProduct) return;
    const confirmDelete = window.confirm(`هل أنت متأكد من حذف المنتج (${selectedProduct.product_name}) نهائياً من أرشيف أسعار الشركة؟`);
    if (!confirmDelete) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("products_library")
        .delete()
        .eq("id", selectedProduct.id);

      if (error) throw error;

      await supabase.from("notifications").insert({
        title: "حذف خامة من المكتبة",
        message: `🚨 تم إزالة وإلغاء الخامة المالية: (${selectedProduct.product_name}) نهائياً من أرشيف أسعار المشتريات للشركة.`,
        type: "procurement",
        link: "/products"
      });

      alert("🗑️ تم إزالة وحذف المنتج بنجاح من مكتبة الخامات!");
      clearForm();
      await loadLibraryData();
    } catch (err: any) {
      alert("حدث خطأ أثناء الحذف: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSpec() {
    if (!sName || !sDesc || sBaseRate === "") {
      alert("الرجاء إدخال اسم المواصفة ووصفها التفصيلي وسعر المتر كاملاً.");
      return;
    }

    setSaving(true);
    const stepsArray = parseStepsTextToArray(sStepsText);

    const payload = {
      spec_name: sName,
      description: sDesc,
      category: sCategory,
      icon: sIcon,
      steps: stepsArray,
      base_rate: Number(sBaseRate)
    };

    try {
      if (isOnline()) {
        const { error } = await supabase
          .from("specifications_library")
          .insert([payload]);

        if (error) throw error;

        await supabase.from("notifications").insert({
          title: "تسجيل مواصفة إنشائية جديدة",
          message: `📄 تم توثيق وتأصيل مواصفة فنية جديدة بالدليل الإنشائي العام للشركة: (${sName}) بسعر مصنعية (${sBaseRate} ج.م / م²).`,
          type: "procurement",
          link: "/products"
        });

        alert("✅ تم تسجيل التوصيف الفني بمكتبة المواصفات بنجاح!");
      } else {
        addToOfflineQueue("specifications_library", "INSERT", payload);
        alert("⚠️ تم حفظ المواصفة محلياً؛ سيتم تسجيلها فور عودة الاتصال.");
      }
      clearForm();
      await loadLibraryData();
    } catch (err: any) {
      alert("خطأ أثناء تسجيل المواصفة: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateSpec() {
    if (!selectedSpec) return;
    if (!sName || !sDesc || sBaseRate === "") {
      alert("الرجاء إدخال اسم المواصفة ووصفها بالتفصيل وسعر المتر.");
      return;
    }

    setSaving(true);
    const stepsArray = parseStepsTextToArray(sStepsText);

    const payload = {
      spec_name: sName,
      description: sDesc,
      category: sCategory,
      icon: sIcon,
      steps: stepsArray,
      base_rate: Number(sBaseRate)
    };

    try {
      if (isOnline()) {
        const { error } = await supabase
          .from("specifications_library")
          .update(payload)
          .eq("id", selectedSpec.id);

        if (error) throw error;

        await supabase.from("notifications").insert({
          title: "تعديل مواصفة إنشائية بمكتبة الأسعار",
          message: `✏️ تم تحديث وتعديل التوصيف الفني الإنشائي للمواصفة القياسية المعتمدة: (${sName}) بسعر مصنعية جديد (${sBaseRate} ج.م / م²).`,
          type: "procurement",
          link: "/products"
        });

        alert("✅ تم حفظ وتعديل التوصيف الفني بالمكتبة بنجاح!");
      } else {
        const offlinePayload = { ...payload, id: selectedSpec.id };
        addToOfflineQueue("specifications_library", "UPDATE", offlinePayload);
        alert("⚠️ تم حفظ التعديلات الفنية محلياً؛ ستزامن فور عودة الإنترنت.");
      }
      clearForm();
      await loadLibraryData();
    } catch (err: any) {
      alert("حدث خطأ أثناء تعديل المواصفة: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSpec() {
    if (!selectedSpec) return;
    const confirmDelete = window.confirm(`هل أنت متأكد من حذف المواصفة الفنية (${selectedSpec.spec_name}) نهائياً من الأرشيف؟`);
    if (!confirmDelete) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("specifications_library")
        .delete()
        .eq("id", selectedSpec.id);

      if (error) throw error;

      await supabase.from("notifications").insert({
        title: "حذف مواصفة من الأرشيف",
        message: `🚨 تم إزالة وحذف المواصفة الفنية المعتمدة: (${selectedSpec.spec_name}) نهائياً من الأرشيف الإنشائي للشركة.`,
        type: "procurement",
        link: "/products"
      });

      alert("🗑️ تم حذف وإزالة التوصيف الفني بنجاح من مكتبة المواصفات!");
      clearForm();
      await loadLibraryData();
    } catch (err: any) {
      alert("حدث خطأ أثناء محاولة الحذف: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    // 🌟 حل المشكلة: إرجاع وسم التوجيه dir="rtl" إلى الـ main الرئيسي لضمان ثبات السايدبار الأيمن بالكامل وتكامل الشاشة كلياً
    <main className="min-h-screen flex bg-[#020B1C] relative overflow-hidden" dir="rtl">
      <Sidebar />
    
      <section className="w-full lg:pr-56 m-0 min-h-screen flex flex-col">
        <Header />
        <div className="p-4 md:p-8 space-y-8 text-right font-sans">
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-[#1f2d4d] pb-6 gap-4 select-none">
            <div>
              <div className="flex items-center gap-2 text-[#D4AF37] mb-1">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <span className="text-xs md:text-sm uppercase tracking-wider font-bold">بوابة الإدارة المركزية للأسعار</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-[#D4AF37] drop-shadow-sm">إدارة البنود والخامات</h1>
              <p className="text-slate-300 text-sm md:text-base mt-2 max-w-2xl leading-relaxed font-bold">
                تنسيق وهيكلة مكتبة المنتجات المالية وتأصيل مكتبة التوصيفات الإنشائية وبنود الاستلام للمقايسات.
              </p>
            </div>

            <div className="bg-[#07132a] border-2 border-[#1f2d4d] p-1.5 rounded-full flex gap-2 select-none w-full lg:w-auto shadow-inner">
              <button
                onClick={() => {
                  setActiveTab("products");
                  clearForm();
                }}
                className={`flex-1 lg:flex-none px-6 py-3 rounded-full font-black text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "products" 
                    ? "royal-gradient-btn text-black shadow-lg" 
                    : "text-slate-400 hover:text-white hover:bg-[#122242]/40"
                }`}
              >
                <Layers className="w-4 h-4" />
                📦 مكتبة المنتجات والخامات
              </button>
              <button
                onClick={() => {
                  setActiveTab("specs");
                  clearForm();
                }}
                className={`flex-1 lg:flex-none px-6 py-3 rounded-full font-black text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "specs" 
                    ? "royal-gradient-btn text-black shadow-lg" 
                    : "text-slate-400 hover:text-white hover:bg-[#122242]/40"
                }`}
              >
                <FileText className="w-4 h-4" />
                📄 مكتبة المواصفات والتوصيف
              </button>
            </div>
          </div>

          {activeTab === "products" ? (
            <div className="space-y-8 animate-fade-in">
              
              <div className="bg-[#07132a] border-2 border-[#D4AF37]/50 rounded-[2rem] overflow-hidden shadow-2xl">
                
                <div className="p-5 border-b border-[#1f2d4d] bg-[#0b1b3d]/60 flex flex-col lg:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="text-[#D4AF37] font-extrabold text-base md:text-lg flex items-center gap-2 select-none">
                      <span>📦</span> قائمة البنود والخامات المسجلة بالمنظومة ({filteredProducts.length})
                    </h3>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto select-none">
                    <div className="relative w-full sm:w-72">
                      <input
                        type="text"
                        placeholder="ابحث باسم المنتج، كود، مصنع..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-11 rounded-full bg-[#020B1C] border border-[#1f2d4d] text-[#F0E6D2] pr-11 pl-4 text-xs md:text-sm font-bold outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all cursor-pointer placeholder-slate-500"
                      />
                      <Search className="absolute right-4 top-3.5 text-[#D4AF37] w-4 h-4" />
                    </div>

                    <div className="relative group w-full sm:w-auto">
                      <button
                        onClick={handleExportProductsToExcel}
                        className="w-full sm:w-auto text-[#020B1C] font-black py-3 px-6 rounded-full text-xs md:text-sm cursor-pointer flex items-center justify-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#F1E5C6] hover:shadow-[0_4px_15px_rgba(212,175,55,0.2)] active:scale-95 transition-all"
                      >
                        <Download className="w-4 h-4" />
                        <span>تصدير لإكسيل</span>
                      </button>
                      <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                        <div className="bg-[#07132a] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2 px-4 rounded-xl shadow-2xl relative">
                          📥 تحميل وتصدير الجدول بالكامل كشيت Excel CSV فوري لجهازك
                          <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#07132a] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 md:p-0">
                  {loading ? (
                    <div className="p-16 text-center text-[#D4AF37] animate-pulse text-base font-bold">جاري تحميل المنتجات المالية...</div>
                  ) : filteredProducts.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
                        {filteredProducts.map((p) => {
                          const matchedSub = Object.keys(subcategoryKeys).find(k => subcategoryKeys[k] === p.subcategory) || p.subcategory;
                          return (
                            <div
                              key={p.id}
                              onClick={() => selectProductRow(p)}
                              className={`bg-[#020B1C] border rounded-2xl p-5 space-y-4 cursor-pointer transition-all duration-300 ${
                                selectedProduct?.id === p.id 
                                  ? "border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.15)] bg-[#0b1b3d]/40" 
                                  : "border-[#1f2d4d] hover:border-[#D4AF37]/30"
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-mono text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-1 rounded-md font-bold">
                                  {p.code}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {p.company || "-"}
                                </span>
                              </div>
                              <h4 className="text-base md:text-lg font-black text-slate-100 line-clamp-2 leading-relaxed">{p.product_name}</h4>
                              <div className="flex justify-between items-center text-sm text-slate-200 border-t border-[#1f2d4d]/60 pt-3">
                                <div>
                                  <span className="text-slate-500">الفئة: </span>
                                  <span className="text-[#D4AF37] font-bold">{matchedSub}</span>
                                </div>
                                <div className="text-left">
                                  <span className="text-emerald-400 font-mono font-black text-base md:text-lg block">{Number(p.price).toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م</span>
                                  <span className="text-xs text-slate-500 block">لكل {p.unit}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="hidden md:block overflow-x-auto max-h-[320px] overflow-y-auto">
                        <table className="w-full text-right text-base text-white">
                          <thead className="bg-[#0b1d3d] text-[#D4AF37] sticky top-0 z-10 select-none">
                            <tr>
                              <th className="p-4 border-b border-[#1f2d4d] text-base font-black">الكود</th>
                              <th className="p-4 border-b border-[#1f2d4d] text-base font-black">التصنيف</th>
                              <th className="p-4 border-b border-[#1f2d4d] font-black text-[#D4AF37]">الصنف الفرعي</th>
                              <th className="p-4 border-b border-[#1f2d4d] text-base font-black">المصنع / الشركة</th>
                              <th className="p-4 border-b border-[#1f2d4d] text-base font-black">اسم المنتج الخادم</th>
                              <th className="p-4 border-b border-[#1f2d4d] text-base font-black">وحدة الحساب</th>
                              <th className="p-4 border-b border-[#1f2d4d] text-left text-base font-black">سعر الوحدة الافتراضي</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1f2d4d]/60">
                            {filteredProducts.map((p) => {
                              const matchedSub = Object.keys(subcategoryKeys).find(k => subcategoryKeys[k] === p.subcategory) || p.subcategory;
                              return (
                                <tr
                                  key={p.id}
                                  onClick={() => selectProductRow(p)}
                                  className={`hover:bg-[#020B1C]/50 cursor-pointer transition-all duration-200 ${
                                    selectedProduct?.id === p.id ? "bg-[#0b1b3d]/60 border-r-4 border-r-[#D4AF37] text-white font-medium pl-3" : ""
                                  }`}
                                >
                                  <td className="p-4 font-mono text-[#D4AF37] font-black">
                                    <span className="bg-[#D4AF37]/10 px-3 py-1.5 rounded-md border border-[#D4AF37]/20">
                                      {p.code}
                                    </span>
                                  </td>
                                  <td className="p-4 text-slate-200 font-bold">{p.category}</td>
                                  <td className="p-4 text-[#D4AF37] font-black">{matchedSub}</td>
                                  <td className="p-4 text-slate-300 font-bold">{p.company || "-"}</td>
                                  <td className="p-4 font-black text-slate-100 text-lg">{p.product_name}</td>
                                  <td className="p-4 text-slate-200 font-bold">{p.unit}</td>
                                  <td className="p-4 text-left font-mono text-emerald-400 font-black text-lg">
                                    <span className="bg-emerald-950/20 border border-emerald-500/20 px-4 py-2 rounded-xl">
                                      {Number(p.price).toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="p-16 text-center text-slate-500 text-base font-bold select-none">
                      لا توجد خامات مسجلة تطابق شروط البحث لهذا القسم المالي المختار.
                    </div>
                  )}
                </div>

              </div>

              <div className="bg-[#07132a] border-2 border-[#1f2d4d] rounded-[2rem] p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
                
                <h3 className="text-[#D4AF37] font-black text-xl md:text-2xl flex items-center gap-2 border-b border-[#1f2d4d] pb-3.5 select-none">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] inline-block animate-ping" />
                  {selectedProduct ? "📝 تعديل وتحرير بيانات الخامة المعتمدة" : "➕ إضافة منتج / خامة مالية جديدة"}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm md:text-base font-bold">
                  
                  <div>
                    <label className="block text-[#D4AF37] mb-2.5 font-bold flex items-center gap-1.5 select-none">التصنيف الإنشائي *</label>
                    <select
                      value={pCategory}
                      onChange={(e) => setPCategory(e.target.value)}
                      className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-white px-3 text-base font-bold outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all cursor-pointer"
                    >
                      <option>دهانات</option>
                      <option>أعمال المحارة</option>
                      <option>أرضيات</option>
                      <option>سباكة وتغذية</option>
                      <option>كهرباء وإضاءة</option>
                      <option>أعمال التهوية والشفاطات</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#D4AF37] mb-2.5 font-bold flex items-center gap-1.5 select-none">الصنف الفرعي للبند *</label>
                    <select
                      value={pSubcategory}
                      onChange={(e) => setPSubcategory(e.target.value)}
                      className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] text-base font-black px-3 outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all cursor-pointer"
                    >
                      {pCategory === "دهانات" && (
                        <>
                          <option>سيلر</option>
                          <option>معجون</option>
                          <option>بطانة</option>
                          <option>دهان حوائط</option>
                          <option>دهان أسقف</option>
                        </>
                      )}
                      {(pCategory === "أعمال المحارة" || pCategory === "أعمال محارة") && (
                        <>
                          <option>أسمنت</option>
                          <option>رمل</option>
                          <option>إكسسوارات محارة</option>
                        </>
                      )}
                      {pCategory === "سباكة وتغذية" && (
                        <>
                          <option>عزل مائي</option>
                          <option>مواسير تغذية</option>
                          <option>مواسير صرف</option>
                          <option>محابس</option>
                          <option>أدوات صحية</option>
                          <option>خلاطات</option>
                          <option>بانيو</option>
                          <option>كابينة شاور</option>
                          <option>قطع خاصة وكماليات</option> 
                        </>
                      )}
                      {pCategory === "كهرباء وإضاءة" && (
                        <>
                          <option>علب ماجيك</option>
                          <option>خراطيم</option>
                          <option>أسلاك</option>
                          <option>لوحة</option>
                          <option>مفاتيح وبرايز</option>
                          <option>سبوت لايت</option>
                          <option>قواطع</option>
                          <option>شاسيهات ووشوش</option>
                          <option>اضاءة</option>
                        </>
                      )}
                      {pCategory === "أرضيات" && (
                        <>
                          <option>أرضيات ريسبشن</option>
                          <option>أرضيات غرف</option>
                          <option>أرضيات مطبخ</option>
                          <option>أرضيات حمامات</option>
                          <option>حوائط مطبخ</option>
                          <option>حوائط حمامات</option>
                          <option>مادة السقية</option> 
                        </>
                      )}
                      {pCategory === "أعمال التهوية والشفاطات" && (
                        <>
                          <option>بلاور</option>
                          <option>جريلة</option>
                          <option>هواية</option>
                          <option>وصلة ماسورة</option>
                          <option>فلكسبل</option>
                          <option>مشترك</option>
                          <option>مسامير ولاصق وقفايز</option>
                          <option>فوم</option>
                          <option>كور</option>
                          <option>إيجار مولد فتح الكور</option>
                          <option>تركيب الشفاطات</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#D4AF37] mb-2.5 font-bold flex items-center gap-1.5 select-none">الشركة المصنعة</label>
                    <input
                      type="text"
                      placeholder="مثال: لافارج / السويدي"
                      value={pCompany || ""}
                      onChange={(e) => setPCompany(e.target.value)}
                      className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-white px-4 text-base font-bold outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[#D4AF37] mb-2.5 font-bold flex items-center gap-1.5 select-none">اسم المنتج الخادم *</label>
                    <input
                      type="text"
                      placeholder="مثال: شكارة أسمنت لافارج"
                      value={pName || ""}
                      onChange={(e) => setPName(e.target.value)}
                      className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-white px-4 text-base font-bold outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[#D4AF37] mb-2.5 font-bold flex items-center gap-1.5 select-none">الوحدة الإدارية *</label>
                    <select
                      value={pUnit}
                      onChange={(e) => setPUnit(e.target.value)}
                      className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-white px-3 text-base font-bold outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all cursor-pointer"
                    >
                      <option>بستلة</option>
                      <option>م²</option>
                      <option>م³</option>
                      <option>طن</option>
                      <option>لفة</option>
                      <option>قطعة</option>
                      <option>متر طولى</option>
                      <option>شکارة</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#D4AF37] mb-2.5 font-bold flex items-center gap-1.5 select-none">سعر الوحدة الافتراضي *</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={pPrice || ""}
                      onChange={(e) => setPPrice(e.target.value !== "" ? Number(e.target.value) : "")}
                      className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-emerald-400 text-base font-black px-4 outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all font-mono text-left text-base"
                    />
                  </div>

                </div>
                
                <div className="flex flex-wrap justify-end gap-4 pt-5 border-t border-[#1f2d4d]/60 select-none">
                  
                  <div className="relative group">
                    <button
                      onClick={clearForm}
                      className="bg-transparent border-2 border-[#D4AF37]/80 text-[#D4AF37] px-6 py-3.5 rounded-full font-black text-sm cursor-pointer hover:bg-gradient-to-r hover:from-[#D4AF37] hover:to-[#F1E5C6] hover:text-[#020B1C] transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>تهيئة الحقول</span>
                    </button>
                    <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                      <div className="bg-[#07132a] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2 px-4 rounded-xl shadow-2xl relative">
                        🔄 تفريغ حقول النموذج وتحضير استمارة الإضافة كـ (جديد)
                        <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#07132a] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                      </div>
                    </div>
                  </div>

                  {selectedProduct ? (
                    <>
                      <div className="relative group">
                        <button
                          onClick={handleUpdateProduct}
                          disabled={saving}
                          className="royal-gradient-btn text-black px-8 py-3.5 rounded-full font-black text-sm flex items-center justify-center gap-2"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>{saving ? "جاري الحفظ..." : "حفظ التعديلات"}</span>
                        </button>
                        <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                          <div className="bg-[#07132a] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2 px-4 rounded-xl shadow-2xl relative">
                            💾 حفظ وحفظ التعديلات الطارئة على سعر أو توصيف الخامة الحالية بالسيرفر
                            <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#07132a] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                          </div>
                        </div>
                      </div>

                      <div className="relative group">
                        <button
                          onClick={handleDeleteProduct}
                          disabled={saving}
                          className="bg-red-950/40 border border-red-500/30 hover:bg-red-600 hover:text-white text-red-400 px-8 py-3.5 rounded-full font-black text-sm cursor-pointer transition-all duration-300 flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>حذف الخامة</span>
                        </button>
                        <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                          <div className="bg-[#07132a] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2 px-4 rounded-xl shadow-2xl relative">
                            🚨 حذف وإزالة الخامة الحالية نهائياً من أرشيف أسعار المشتريات للشركة
                            <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#07132a] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="relative group">
                      <button
                        onClick={handleAddProduct}
                        disabled={saving}
                        className="royal-gradient-btn text-black px-8 py-3.5 rounded-full font-black text-sm flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>{saving ? "جاري الإدراج..." : "إدراج المنتج بالمكتبة"}</span>
                      </button>
                      <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                        <div className="bg-[#07132a] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2 px-4 rounded-xl shadow-2xl relative">
                          💾 إضافة وإدراج كارت الخامة الجديدة في قاعدة أسعار المشتريات السحابية للشركة
                          <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#07132a] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="space-y-8 animate-fade-in">
              
              <div className="bg-[#07132a] border-2 border-[#D4AF37]/50 rounded-[2rem] overflow-hidden shadow-2xl">
                
                <div className="p-5 border-b border-[#1f2d4d] bg-[#0b1b3d]/60 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <h3 className="text-[#F0E6D2] font-extrabold text-base md:text-lg flex items-center gap-2 select-none">
                    <span>📐</span> مكتبة المواصفات الفنية المعتمدة ({filteredSpecs.length})
                  </h3>
                  
                  <div className="relative w-full sm:w-72 select-none">
                    <input
                      type="text"
                      placeholder="ابحث باسم المواصفة، كود، توصيف..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-11 rounded-full bg-[#020B1C] border border-[#1f2d4d] text-white pr-10 pl-4 text-sm font-bold outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder-slate-500"
                    />
                    <Search className="absolute right-4 top-3.5 text-[#D4AF37] w-4 h-4" />
                  </div>
                </div>

                <div className="p-4 md:p-6">
                  {loading ? (
                    <div className="text-center text-[#D4AF37] animate-pulse text-base py-16 font-bold">جاري تحميل مكتبة التوصيفات...</div>
                  ) : filteredSpecs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[420px] overflow-y-auto pr-1">
                      {filteredSpecs.map((s, idx) => (
                        <div
                          key={s.id || idx}
                          onClick={() => selectSpecCard(s)}
                          className={`border rounded-2xl p-6 space-y-4 cursor-pointer transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                            selectedSpec?.id === s.id 
                              ? "bg-[#0b1b3d]/50 border-r-4 border-r-[#D4AF37] border-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.15)] scale-[1.01]" 
                              : "bg-[#020B1C] border-[#1f2d4d] hover:border-[#D4AF37]/30"
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="flex justify-between items-start gap-2 border-b border-[#1f2d4d]/60 pb-3 select-none">
                              <div>
                                <span className="text-2xl ml-2">{s.icon || "📐"}</span>
                                <h4 className="text-[#D4AF37] font-black text-lg inline-block">{s.spec_name}</h4>
                              </div>
                              <span className="text-xs text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-3 py-1 rounded-full font-bold">
                                {specCategoryLabels[s.category] || s.category}
                              </span>
                            </div>
                            
                            <p className="text-slate-200 text-sm md:text-base leading-relaxed whitespace-pre-wrap line-clamp-4 font-bold">
                              {s.description}
                            </p>
                          </div>
                          
                          <div className="space-y-4 pt-4 border-t border-[#1f2d4d]/40">
                            <div className="flex justify-between items-center text-sm text-slate-300 py-1.5 bg-[#07132a]/40 p-3 rounded-xl border border-[#1f2d4d]/30 select-none">
                              <span>سعر متر المصنعية المعتمد:</span>
                              <span className="text-emerald-400 font-extrabold font-mono text-base md:text-lg bg-emerald-950/35 px-3 py-1 rounded">
                                {s.base_rate || 0} ج.م / م²
                              </span>
                            </div>

                            {s.steps && s.steps.length > 0 && (
                              <div className="bg-[#020B1C]/80 border border-amber-500/10 rounded-xl p-4 space-y-2 text-xs md:text-sm font-bold">
                                <p className="text-amber-500 font-bold flex items-center gap-1.5">
                                  <span>📋</span> خطوات الاستلام الفنية ({s.steps.length}):
                                </p>
                                <ul className="list-disc list-inside text-slate-300 space-y-1.5 pr-2">
                                  {s.steps.slice(0, 2).map((step, sIdx) => (
                                    <li key={sIdx} className="truncate">{step}</li>
                                  ))}
                                  {s.steps.length > 2 && (
                                    <li className="list-none text-xs text-[#D4AF37] font-bold mt-1.5">
                                      + {s.steps.length - 2} خطوات فنية أخرى للرقابة الإنشائية
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}

                            <span className="text-xs text-[#D4AF37] underline block select-none text-left font-black">
                              انقر لمعاينة أو تعديل التوصيف الفني ✏️
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-slate-500 text-base font-bold py-16">
                      لا توجد توصيفات فنية تطابق الفئة المحددة حالياً في السجل.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#07132a] border-2 border-[#1f2d4d] rounded-[2rem] p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
                
                <h3 className="text-[#D4AF37] font-black text-xl md:text-2xl flex items-center gap-2 border-b border-[#1f2d4d] pb-3.5 select-none">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] inline-block animate-ping" />
                  {selectedSpec ? "📝 تعديل وتحرير كارت المواصفة الفنية المفتوحة" : "➕ تسجيل بند وتوصيف فني جديد للمقايسات"}
                </h3>

                <div className="space-y-6 text-base">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    
                    <div>
                      <label className="block text-[#D4AF37] mb-2.5 font-bold flex items-center gap-1.5 select-none">التصنيف الإنشائي للبند *</label>
                      <select
                        value={sCategory}
                        onChange={(e) => setSCategory(e.target.value)}
                        className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] font-black px-3 outline-none cursor-pointer focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all text-base"
                      >
                        <option value="plaster">🧱 أعمال المحارة </option>
                        <option value="ceiling">📐 الأسقف المعلقة والجبس بورد</option>
                        <option value="doors">🚪 أعمال الأبواب والنجارة</option>
                        <option value="aluminum">⚙️ الشبابيك والألوميتال</option>
                        <option value="ac">❄️ أعمال التكييف والتمديدات</option>
                        <option value="ventilation">🌀 أعمال التهوية والشفاطات</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#D4AF37] mb-2.5 font-bold flex items-center gap-1.5 select-none">أيقونة الكارت الرمزية *</label>
                      <select
                        value={sIcon}
                        onChange={(e) => setSIcon(e.target.value)}
                        className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-white px-3 outline-none cursor-pointer focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all text-base"
                      >
                        <option>📐</option>
                        <option>🧱</option>
                        <option>🎯</option>
                        <option>🚪</option>
                        <option>❄️</option>
                        <option>⚙️</option>
                        <option>📄</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#D4AF37] mb-2.5 font-bold flex items-center gap-1.5 select-none">اسم المواصفة الرئيسي المعتمد *</label>
                      <input
                        type="text"
                        placeholder="مثال: محارة بؤج وأوتار قياسية"
                        value={sName || ""}
                        onChange={(e) => setSName(e.target.value)}
                        className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-white px-4 text-base font-bold outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder-slate-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[#D4AF37] mb-2.5 font-bold flex items-center gap-1.5 select-none">سعر المتر الافتراضي للمصنعية *</label>
                      <input
                        type="number"
                        placeholder="مثال: 80"
                        value={sBaseRate || ""}
                        onChange={(e) => setSBaseRate(e.target.value !== "" ? Number(e.target.value) : "")}
                        className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-emerald-400 font-black px-4 outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all font-mono text-left text-base"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#D4AF37] mb-2.5 font-bold flex items-center gap-1.5 select-none">التوصيف الفني الإنشائي التفصيلي (للعميل) *</label>
                    <textarea
                      rows={4}
                      placeholder="اكتب التوصيف الفني الكامل للبند، شامل جودة الخامات والتأسيس بدقة..."
                      value={sDesc || ""}
                      onChange={(e) => setSDesc(e.target.value)}
                      className="w-full bg-[#020B1C] border border-[#1f2d4d] text-slate-100 p-4 rounded-xl outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all leading-relaxed placeholder-slate-500 text-base font-medium resize-none"
                    />
                  </div>

                  <div className="bg-[#020B1C] p-5 rounded-2xl border border-dashed border-[#D4AF37]/30 space-y-3 select-none">
                    <label className="block text-[#D4AF37] font-black text-sm md:text-base flex items-center gap-1.5 select-none">
                      <span>📋</span> بنود وخطوات استلام المواصفة الفنية (كل بند في سطر مستقل) *
                    </label>
                    <textarea
                      rows={5}
                      placeholder="اكتب هنا خطوات استلام البند بالموقع لتوليد التكت التفاعلي بتبويبات الـ CRM...&#10;الخطوة الأولى: غسيل وتنظيف الحوائط كلياً.&#10;الخطوة الثانية: تثبيت سلك الشبك الفاصل..."
                      value={sStepsText}
                      onChange={(e) => setSStepsText(e.target.value)}
                      className="w-full bg-[#07132a] border border-[#1f2d4d] text-slate-100 p-4 rounded-xl outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all font-sans text-sm md:text-base leading-relaxed placeholder-slate-600 font-medium resize-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-4 pt-5 border-t border-[#1f2d4d]/60 select-none">
                  
                  <div className="relative group">
                    <button
                      onClick={clearForm}
                      className="bg-transparent border-2 border-[#D4AF37]/80 text-[#D4AF37] px-6 py-3.5 rounded-full font-black text-sm cursor-pointer hover:bg-gradient-to-r hover:from-[#D4AF37] hover:to-[#F1E5C6] hover:text-[#020B1C] transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>تهيئة لجديد</span>
                    </button>
                    <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                      <div className="bg-[#07132a] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2 px-4 rounded-xl shadow-2xl relative">
                        🔄 تفريغ حقول النموذج وتحضير استمارة الإضافة كـ (جديد)
                        <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#07132a] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                      </div>
                    </div>
                  </div>

                  {selectedSpec ? (
                    <>
                      <div className="relative group">
                        <button
                          onClick={handleUpdateSpec}
                          disabled={saving}
                          className="royal-gradient-btn text-black px-8 py-3.5 rounded-full font-black text-sm flex items-center justify-center gap-2"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>{saving ? "جاري الحفظ..." : "حفظ التعديلات الفنية"}</span>
                        </button>
                        <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                          <div className="bg-[#07132a] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2 px-4 rounded-xl shadow-2xl relative">
                            💾 تحديث وحفظ التعديلات الطارئة على التوصيف الفني القياسي للبند بالسيرفر
                            <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#07132a] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                          </div>
                        </div>
                      </div>

                      <div className="relative group">
                        <button
                          onClick={handleDeleteSpec}
                          disabled={saving}
                          className="bg-red-950/40 border border-red-500/30 hover:bg-red-600 hover:text-white text-red-400 px-8 py-3.5 rounded-full font-black text-sm cursor-pointer transition-all duration-300 flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>حذف المواصفة</span>
                        </button>
                        <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                          <div className="bg-[#07132a] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2 px-4 rounded-xl shadow-2xl relative">
                            🚨 إزالة وحذف المواصفة الحالية نهائياً من سجل تفريد البنود للشركة
                            <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#07132a] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="relative group">
                      <button
                        onClick={handleAddSpec}
                        disabled={saving}
                        className="royal-gradient-btn text-black px-8 py-3.5 rounded-full font-black text-sm flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>{saving ? "جاري التسجيل..." : "تسجيل التوصيف الفني"}</span>
                      </button>
                      <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in whitespace-nowrap">
                        <div className="bg-[#07132a] border border-[#D4AF37] text-[#F0E6D2] text-[10px] font-black py-2 px-4 rounded-xl shadow-2xl relative">
                          💾 إضافة وإدراج التوصيف الهندسي لبنود العقد والأكواد الفنية للاستلام بالسيرفر
                          <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-[#07132a] border-r border-b border-[#D4AF37] rotate-45 -mt-1" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      </section>
    </main>
  );
}