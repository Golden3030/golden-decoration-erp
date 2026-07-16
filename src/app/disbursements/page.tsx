"use client";

import { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";
import { isOnline, addToOfflineQueue } from "@/lib/offline-sync";

interface Disbursement {
  id: string;
  project_id: string;
  product_id: string;
  quantity_disbursed: number;
  received_by: string;
  disbursed_date: string;
  notes: string;
  projects?: { project_name: string };
  products_library?: { product_name: string; unit: string };
}

export default function MaterialDisbursementsPage() {
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [budgetItems, setBudgetItems] = useState<any[]>([]); // كميات المقايسة للمشروع المختار
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // حقول نموذج صرف خامة جديد
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [qtyDisbursed, setQtyDisbursed] = useState<number | "">("");
  const [receivedBy, setReceivedBy] = useState("");
  const [disbursedDate, setDisbursedDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    document.title = "صرف الخامات للمواقع | Golden Decoration";
    loadInitialData();
  }, []);

  // الاستعلام التلقائي عن ميزانية الخامات فور اختيار المشروع لـحساب الهدر والانحراف
  useEffect(() => {
    if (!selectedProjectId) {
      setBudgetItems([]);
      return;
    }
    loadProjectBudgetQuantities(selectedProjectId);
  }, [selectedProjectId]);

  async function loadInitialData() {
    setLoading(true);
    try {
      // 1. جلب سندات الصرف مع دمج أسماء المشاريع والمنتجات المسحوبة
      const { data: disbData, error: disbError } = await supabase
        .from("material_disbursements")
        .select(`
          *,
          projects (project_name),
          products_library (product_name, unit)
        `)
        .order("created_at", { ascending: false });

      if (disbError) throw disbError;
      setDisbursements(disbData || []);

      // 2. جلب المشاريع النشطة
      const { data: projData } = await supabase
        .from("projects")
        .select("id, project_name");
      setProjects(projData || []);

      // 3. جلب منتجات مكتبة الخامات المعتمدة
      const { data: prodData } = await supabase
        .from("products_library")
        .select("id, product_name, unit");
      setProducts(prodData || []);

    } catch (err: any) {
      console.error("Error loading disbursements data:", err.message);
    } finally {
      setLoading(false);
    }
  }

  // جلب كميات البنود المعتمدة في المقايسة لمقارنتها بالمنصرف الفعلي من المخزن
  async function loadProjectBudgetQuantities(projectId: string) {
    try {
      // جلب ترويسة المقايسة المعتمدة أولاً للمشروع
      const { data: header } = await supabase
        .from("estimate_headers")
        .select("id")
        .eq("project_id", projectId)
        .eq("status", "نهائية")
        .maybeSingle();

      if (header) {
        const { data: items } = await supabase
          .from("estimate_items")
          .select("item_name, quantity, unit")
          .eq("estimate_id", header.id);
        
        setBudgetItems(items || []);
      }
    } catch (e) {
      console.error("Error fetching project budget quantities:", e);
    }
  }

  // حساب تراكمي لإجمالي المنصرف الفعلي لكل منتج داخل المشروع المختار للتحذير من التجاوز
  const currentProductStatistics = useMemo(() => {
    if (!selectedProjectId || !selectedProductId) return { budgeted: 0, actualDisbursed: 0, unit: "متر" };

    const selectedProduct = products.find(p => p.id === selectedProductId);
    const productName = selectedProduct ? selectedProduct.product_name : "";
    const productUnit = selectedProduct ? selectedProduct.unit : "وحدة";

    // جلب الكمية المعتمدة في المقايسة بمطابقة مسمى المادة المقارب
    const matchedBudgetItem = budgetItems.find(item => 
      String(item.item_name || "").includes(productName) || 
      productName.includes(String(item.item_name || ""))
    );
    const budgetedQty = matchedBudgetItem ? Number(matchedBudgetItem.quantity) : 0;

    // حساب إجمالي ما تم صرفه لهذا المنتج في هذا الموقع من كشوف الصرف السابقة
    const totalDisbursedInProject = disbursements
      .filter(d => d.project_id === selectedProjectId && d.product_id === selectedProductId)
      .reduce((sum, d) => sum + Number(d.quantity_disbursed || 0), 0);

    return {
      budgeted: budgetedQty,
      actualDisbursed: totalDisbursedInProject,
      unit: productUnit
    };
  }, [selectedProjectId, selectedProductId, budgetItems, disbursements, products]);

  // إرسال وحفظ سند الصرف للموقع مع جدار حماية الأوفلاين التلقائي
  async function handleCreateDisbursement() {
    if (!selectedProjectId || !selectedProductId || qtyDisbursed === "") {
      alert("الرجاء ملء الحقول الإجبارية (تحديد الموقع، الخامة، الكمية المنصرفة) لحفظ السند.");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        project_id: selectedProjectId,
        product_id: selectedProductId,
        quantity_disbursed: Number(qtyDisbursed),
        disbursed_by: user?.id || null,
        received_by: receivedBy || null,
        disbursed_date: disbursedDate,
        notes: notes || null
      };

      if (isOnline()) {
        const { error } = await supabase
          .from("material_disbursements")
          .insert([payload]);

        if (error) throw error;

        // إرسال إشعار فوري وتلقائي للخزينة والمخازن بحدوث سحب مواد للموقع
        const matchedProj = projects.find(p => p.id === selectedProjectId);
        const matchedProd = products.find(p => p.id === selectedProductId);
        
        await supabase.from("notifications").insert({
          title: "صرف خامات ومواد لموقع",
          message: `📦 تم صرف كمية (${qtyDisbursed} ${matchedProd?.unit || "وحدة"}) من خامة (${matchedProd?.product_name || "غير معروف"}) وتوجيهها فوراً لموقع (${matchedProj?.project_name || "موقع غير محدد"}) المستلم بالموقع (${receivedBy || "فني الموقع"}).`,
          type: "procurement",
          link: "/disbursements"
        });

        alert("✅ تم تسجيل سند صرف المواد وتحديث جرد المخزن السحابي للموقع بنجاح!");
      } else {
        addToOfflineQueue("material_disbursements", "INSERT", payload);
        alert("⚠️ تم حفظ سند الصرف محلياً لعدم توفر إنترنت؛ وسيتم مزامنته وتحديث الجرد تلقائياً فور عودة الشبكة.");
      }

      // تصفير خانات الإدخال
      setSelectedProductId("");
      setQtyDisbursed("");
      setReceivedBy("");
      setNotes("");
      
      await loadInitialData();
    } catch (err: any) {
      alert("حدث خطأ أثناء تسجيل السند: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-row-reverse bg-[#020B1C]">
      <Sidebar />
      <section dir="rtl" className="flex-1 flex flex-col mr-64">
        <Header />
        <div className="p-8 space-y-6 text-right">
          
          <div>
            <h1 className="text-3xl font-bold text-[#D4AF37]">سندات صرف الخامات والمخازن</h1>
            <p className="text-gray-400 text-sm mt-1">تتبع تداول وصرف المواد من مخازن الشركة للمواقع الميدانية ومقارنة الاستهلاك الفعلي بالمقايسة.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* لوحة تسجيل مستند صرف جديد */}
            <div className="bg-[#07132a] border border-[#243556] rounded-2xl p-6 space-y-4 h-fit">
              <h3 className="text-[#F0E6D2] font-bold text-sm border-b border-[#1f2d4d] pb-2">➕ تسجيل سند صرف خامات جديد</h3>
              <div className="space-y-3.5 text-xs">
                
                <div>
                  <label className="block text-white mb-1.5 font-bold">موقع العمل المستهدف *</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full h-11 rounded-lg bg-[#020B1C] border border-[#243556] text-white px-3 outline-none"
                  >
                    <option value="">-- اختر موقع العمل المسحوب له --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.project_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-white mb-1.5 font-bold">الخامة / المنتج المراد سحبه *</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full h-11 rounded-lg bg-[#020B1C] border border-[#243556] text-[#D4AF37] font-bold px-3 outline-none"
                  >
                    <option value="">-- اختر الخامة من مكتبة المنتجات --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.product_name} ({p.unit})</option>
                    ))}
                  </select>
                </div>

                {/* كارت كشف الانحراف ومقارنة ميزانية المتر بالمقايسة حياً */}
                {selectedProjectId && selectedProductId && (
                  <div className="bg-[#020B1C] border border-[#243556] rounded-xl p-3.5 space-y-2 select-none animate-fade-in text-[10px]">
                    <p className="text-white font-bold border-b border-[#1f2d4d] pb-1">⚖️ ميزانية الاستهلاك الفعلي للمشروع:</p>
                    <div className="flex justify-between">
                      <span className="text-gray-400">الكمية المعتمدة للعميل بالمقايسة:</span>
                      <span className="text-[#D4AF37] font-bold">{currentProductStatistics.budgeted} {currentProductStatistics.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">المنصرف الفعلي كلياً حتى الآن:</span>
                      <span className="text-white font-bold">{currentProductStatistics.actualDisbursed} {currentProductStatistics.unit}</span>
                    </div>
                    {currentProductStatistics.budgeted > 0 && currentProductStatistics.actualDisbursed >= currentProductStatistics.budgeted && (
                      <p className="text-rose-400 font-bold border-t border-rose-500/10 pt-1 text-center animate-pulse">
                        🚨 تحذير: لقد تجاوزت الموقع الحصة المتفق عليها للعميل بالمقايسة!
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-white mb-1.5 font-bold">الكمية المنصرفة والموردة فعلياً *</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="0"
                    value={qtyDisbursed}
                    onChange={(e) => setQtyDisbursed(e.target.value !== "" ? Number(e.target.value) : "")}
                    className="w-full h-11 rounded-lg bg-[#020B1C] border border-[#243556] text-white px-3 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-white mb-1.5 font-bold">المستلم الفعلي للمواد بالموقع</label>
                  <input
                    type="text"
                    placeholder="مثال: المهندس المشرف / المقاول"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    className="w-full h-11 rounded-lg bg-[#020B1C] border border-[#243556] text-white px-3 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-white mb-1.5 font-bold">تاريخ صرف وتسليم المواد</label>
                  <input
                    type="date"
                    value={disbursedDate}
                    onChange={(e) => setDisbursedDate(e.target.value)}
                    className="w-full h-11 rounded-lg bg-[#020B1C] border border-[#243556] text-white px-3 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-white mb-1.5 font-bold">ملاحظات الصرف والتشوين بالموقع</label>
                  <textarea
                    placeholder="تفاصيل التشوين بالموقع، حالة استلام المواد..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full h-20 bg-[#020B1C] border border-[#243556] text-white p-3 rounded-lg outline-none"
                  />
                </div>

                <button
                  onClick={handleCreateDisbursement}
                  disabled={saving}
                  className="w-full bg-[#D4AF37] hover:bg-[#F0E6D2] text-black font-bold py-3.5 rounded-lg text-xs cursor-pointer transition disabled:opacity-50"
                >
                  {saving ? "جاري تسجيل السند..." : "💾 تسجيل وصرف مستند الخامات"}
                </button>
              </div>
            </div>

            {/* جدول عرض كشوف وحركات صرف الخامات للمشاريع */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#07132a] border border-[#1f2d4d] rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-[#243556] bg-[#0b1b3d]">
                  <h3 className="text-[#F0E6D2] font-bold text-xs">سجل المخرجات وسندات صرف الخامات الميدانية للمواقع ({disbursements.length})</h3>
                </div>
                <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                  {loading ? (
                    <div className="p-12 text-center text-gray-400 text-sm animate-pulse">جاري جلب سجل حركات مخازن المواقع...</div>
                  ) : disbursements.length > 0 ? (
                    <table className="w-full text-right text-xs text-white">
                      <thead className="bg-[#0b1d3d] text-[#F0E6D2]">
                        <tr>
                          <th className="p-4">تاريخ الصرف</th>
                          <th className="p-4">موقع المشروع المستلم</th>
                          <th className="p-4">اسم الخامة الإنشائية</th>
                          <th className="p-4 font-mono">الكمية المنصرفة</th>
                          <th className="p-4">مستلم المواد بالموقع</th>
                          <th className="p-4">ملاحظات المستند</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1f2d4d]">
                        {disbursements.map((d) => (
                          <tr key={d.id} className="hover:bg-[#020B1C]/50 transition duration-150">
                            <td className="p-4 font-mono text-gray-400">{d.disbursed_date}</td>
                            <td className="p-4 font-bold text-[#F0E6D2]">{d.projects?.project_name || "موقع ممسوح"}</td>
                            <td className="p-4 font-bold">{d.products_library?.product_name || "خامة ممسوحة"}</td>
                            <td className="p-4 font-mono font-bold text-[#D4AF37]">{d.quantity_disbursed} {d.products_library?.unit || "وحدة"}</td>
                            <td className="p-4 text-gray-300 font-bold">{d.received_by || "مشرف الموقع"}</td>
                            <td className="p-4 text-gray-400 max-w-xs truncate">{d.notes || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-12 text-center text-gray-500 text-xs">لا توجد سندات صرف مواد للمواقع مسجلة حتى الآن.</div>
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