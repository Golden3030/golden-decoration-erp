"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { generateSequentialCode } from "@/lib/generateSequentialCode";
import { Loader2, Package, Plus, Trash2, CheckCircle2, Star } from "lucide-react";

interface POItem {
  product_id: string;
  quantity: number;
  unit_price: number;
}

export default function PurchaseOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [supplierId, setSupplierId] = useState("");
  const [poProjectId, setPoProjectId] = useState(""); // فاضي = مخزون عام مشترك، وإلا = مخصص لمشروع معين
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<POItem[]>([{ product_id: "", quantity: 0, unit_price: 0 }]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [ordersRes, suppliersRes, productsRes, projectsRes] = await Promise.all([
      supabase.from("purchase_orders").select("*, subcontractors(name, rating, specialty), projects(project_name, project_code)").order("created_at", { ascending: false }),
      supabase.from("subcontractors").select("id, name, rating, specialty").order("name"),
      supabase.from("products_library").select("id, product_name, unit, price, quantity_in_stock"),
      supabase.from("projects").select("id, project_name, project_code").order("created_at", { ascending: false }),
    ]);
    setOrders(ordersRes.data || []);
    setSuppliers((suppliersRes.data || []).sort((a: any, b: any) => (a.specialty === "materials_supplier" ? -1 : 1) - (b.specialty === "materials_supplier" ? -1 : 1)));
    setProducts(productsRes.data || []);
    setProjectsList(projectsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  function addItemRow() {
    setItems((prev) => [...prev, { product_id: "", quantity: 0, unit_price: 0 }]);
  }

  function updateItem(idx: number, field: keyof POItem, value: any) {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: value };
      if (field === "product_id") {
        const prod = products.find((p) => p.id === value);
        if (prod) updated.unit_price = Number(prod.price || 0);
      }
      return updated;
    }));
  }

  function removeItemRow(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const totalAmount = items.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.unit_price || 0), 0);

  async function handleCreateOrder() {
    if (!supplierId || items.length === 0 || items.some((it) => !it.product_id || it.quantity <= 0)) {
      alert("لازم تحدد المورد وكل صنف يكون له كمية أكبر من صفر.");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const poNumber = await generateSequentialCode("purchase_orders", "po_number", "PO");

      const { data: order, error: orderErr } = await supabase
        .from("purchase_orders")
        .insert({ po_number: poNumber, supplier_id: supplierId, project_id: poProjectId || null, status: "pending", total_amount: totalAmount, notes: notes || null, created_by: user?.id || null })
        .select()
        .single();
      if (orderErr) throw orderErr;

      const itemsPayload = items.map((it) => ({ purchase_order_id: order.id, product_id: it.product_id, quantity: it.quantity, unit_price: it.unit_price }));
      const { error: itemsErr } = await supabase.from("purchase_order_items").insert(itemsPayload);
      if (itemsErr) throw itemsErr;

      setShowForm(false);
      setSupplierId("");
      setPoProjectId("");
      setNotes("");
      setItems([{ product_id: "", quantity: 0, unit_price: 0 }]);
      loadAll();
    } catch (err: any) {
      alert("حصل خطأ: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function markAsReceived(order: any) {
    if (!confirm(`تأكيد استلام أمر الشراء ${order.po_number}؟`)) return;

    const { data: poItems } = await supabase.from("purchase_order_items").select("*").eq("purchase_order_id", order.id);

    // ✅ لو الأمر مخصص لمشروع معين، الكمية دي "رصيد مخصص للمشروع" بيتحسب مباشرة من
    // (مشتريات المشروع - مصروفات المشروع) وقت العرض، مش بتضاف للمخزون العام.
    // المخزون العام (quantity_in_stock) بيتحدث بس لو الأمر عام (project_id فاضي).
    if (!order.project_id) {
      for (const item of poItems || []) {
        const product = products.find((p) => p.id === item.product_id);
        const newStock = Number(product?.quantity_in_stock || 0) + Number(item.quantity);
        await supabase.from("products_library").update({ quantity_in_stock: newStock }).eq("id", item.product_id);
      }
    }

    await supabase.from("purchase_orders").update({ status: "received", received_at: new Date().toISOString() }).eq("id", order.id);
    await supabase.from("notifications").insert({
      title: "📥 استلام أمر شراء",
      message: order.project_id
        ? `تم استلام أمر الشراء (${order.po_number}) وإضافته كرصيد مخصص للمشروع.`
        : `تم استلام أمر الشراء (${order.po_number}) وتحديث المخزون العام تلقائياً.`,
      type: "procurement",
      link: "/purchase-orders",
    });

    loadAll();
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#020B1C]"><Loader2 className="animate-spin text-[#D4AF37] w-8 h-8" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#020B1C] text-white p-6 md:p-10" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Package className="text-[#D4AF37]" />
            <h1 className="text-2xl font-bold">أوامر الشراء والموردين</h1>
          </div>
          <button onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border border-[#D4AF37] text-sm hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]">
            <Plus size={16} /> أمر شراء جديد
          </button>
        </div>

        {showForm && (
          <div className="rounded-2xl border border-[#243556] bg-[#0A1730] p-6 mb-8">
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[#8AA1C9] text-xs block mb-1">المورد</label>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full h-10 rounded-xl bg-[#020B1C] border border-[#243556] px-3 text-sm">
                  <option value="">— اختر المورد —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.specialty === "materials_supplier" ? "⭐" : ""} {s.rating ? `(تقييم ${s.rating})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[#8AA1C9] text-xs block mb-1">لمشروع معين، ولا مخزون عام مشترك؟</label>
                <select value={poProjectId} onChange={(e) => setPoProjectId(e.target.value)} className="w-full h-10 rounded-xl bg-[#020B1C] border border-[#243556] px-3 text-sm">
                  <option value="">📦 مخزون عام مشترك (لأي مشروع)</option>
                  {projectsList.map((p) => <option key={p.id} value={p.id}>🏗️ {p.project_name} ({p.project_code})</option>)}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-[#8AA1C9] text-xs block mb-1">ملاحظات</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full h-10 rounded-xl bg-[#020B1C] border border-[#243556] px-3 text-sm" />
            </div>

            <div className="space-y-2 mb-4">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <select value={item.product_id} onChange={(e) => updateItem(idx, "product_id", e.target.value)} className="col-span-5 h-9 rounded-lg bg-[#020B1C] border border-[#243556] px-2 text-xs">
                    <option value="">— اختر الصنف —</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.product_name} ({p.unit})</option>)}
                  </select>
                  <input type="number" placeholder="الكمية" value={item.quantity || ""} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} className="col-span-3 h-9 rounded-lg bg-[#020B1C] border border-[#243556] px-2 text-xs" />
                  <input type="number" placeholder="سعر الوحدة" value={item.unit_price || ""} onChange={(e) => updateItem(idx, "unit_price", Number(e.target.value))} className="col-span-3 h-9 rounded-lg bg-[#020B1C] border border-[#243556] px-2 text-xs" />
                  <button onClick={() => removeItemRow(idx)} className="col-span-1 text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                </div>
              ))}
              <button onClick={addItemRow} className="text-xs text-[#D4AF37] flex items-center gap-1 mt-2"><Plus size={14} /> إضافة صنف</button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#243556]">
              <span className="text-[#D4AF37] font-bold">الإجمالي: {totalAmount.toLocaleString("en-US")} ج.م</span>
              <button onClick={handleCreateOrder} disabled={saving} className="px-5 py-2 rounded-xl bg-[#D4AF37] text-[#020B1C] font-bold text-sm disabled:opacity-50">
                {saving ? <Loader2 className="animate-spin w-4 h-4" /> : "حفظ أمر الشراء"}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="rounded-xl border border-[#243556] bg-[#0A1730] p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[#D4AF37] font-bold">{o.po_number}</p>
                <p className="text-xs text-[#8AA1C9] flex items-center gap-1 flex-wrap">
                  {o.subcontractors?.name || "مورد غير معروف"}
                  {o.subcontractors?.rating && <span className="flex items-center gap-0.5 text-amber-400"><Star size={12} fill="currentColor" /> {o.subcontractors.rating}</span>}
                  <span className="mx-1 text-[#243556]">·</span>
                  {o.projects ? <span className="text-blue-400">🏗️ {o.projects.project_name}</span> : <span className="text-slate-500">📦 مخزون عام</span>}
                </p>
              </div>
              <span className="text-sm font-mono">{Number(o.total_amount).toLocaleString("en-US")} ج.م</span>
              {o.status === "received" ? (
                <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 size={14} /> تم الاستلام
                </span>
              ) : (
                <button onClick={() => markAsReceived(o)} className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20">
                  تأكيد الاستلام
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
