"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, ArrowRight, Package, AlertTriangle, Send } from "lucide-react";

interface MaterialRow {
  productId: string | null;
  name: string;
  unit: string;
  budgetedQty: number;   // الكمية المعتمدة بالمقايسة للعميل
  purchasedQty: number;  // اللي اتشترى فعلاً مخصص لهذا المشروع
  disbursedQty: number;  // اللي اتصرف فعلاً للموقع
  remainingQty: number;  // المتاح فعلياً = المشترى - المصروف
}

export default function ProjectMaterialsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [requestingFor, setRequestingFor] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const projRes = await supabase.from("projects").select("project_name, project_code").eq("id", projectId).single();
      setProject(projRes.data);

      // 1) آخر مقايسة معتمدة (نهائية) لهذا المشروع — دي "الحصة المتفق عليها مع العميل"
      const headerRes = await supabase
        .from("estimate_headers")
        .select("id")
        .eq("project_id", projectId)
        .eq("status", "نهائية")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!headerRes.data) {
        setMaterials([]);
        setLoading(false);
        return;
      }

      const [itemsRes, poItemsRes, disbursementsRes] = await Promise.all([
        supabase.from("estimate_items").select("*").eq("estimate_id", headerRes.data.id),
        supabase
          .from("purchase_order_items")
          .select("product_id, quantity, purchase_orders!inner(project_id, status)")
          .eq("purchase_orders.project_id", projectId)
          .eq("purchase_orders.status", "received"),
        supabase.from("material_disbursements").select("product_id, quantity_disbursed").eq("project_id", projectId),
      ]);

      const estimateItems = itemsRes.data || [];
      const poItems = poItemsRes.data || [];
      const disbursements = disbursementsRes.data || [];

      // نجمّع البنود اللي ليها منتج مرتبط فعلياً (product_id) — دي اللي نقدر نتابع رصيدها الفعلي
      const rows: MaterialRow[] = estimateItems
        .filter((it: any) => it.product_id)
        .map((it: any) => {
          const purchased = poItems
            .filter((p: any) => p.product_id === it.product_id)
            .reduce((s: number, p: any) => s + Number(p.quantity || 0), 0);
          const disbursed = disbursements
            .filter((d: any) => d.product_id === it.product_id)
            .reduce((s: number, d: any) => s + Number(d.quantity_disbursed || 0), 0);

          return {
            productId: it.product_id,
            name: it.name || it.item_name || "خامة",
            unit: it.unit || "وحدة",
            budgetedQty: Number(it.quantity || 0),
            purchasedQty: purchased,
            disbursedQty: disbursed,
            remainingQty: purchased - disbursed,
          };
        });

      setMaterials(rows);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { if (projectId) loadAll(); }, [projectId, loadAll]);

  async function requestFunding(material: MaterialRow) {
    setRequestingFor(material.name);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const suggestedQty = Math.max(0, material.budgetedQty - material.purchasedQty);

      await supabase.from("notifications").insert({
        title: "🚨 طلب صرف مبلغ لشراء خامة",
        message: `مهندس الموقع طلب صرف مبلغ لشراء (${suggestedQty || material.budgetedQty} ${material.unit}) من "${material.name}" لمشروع (${project?.project_name}) — الرصيد الحالي المتاح: ${material.remainingQty} ${material.unit} بس.`,
        type: "finance",
        target_role: "accountant",
        project_id: projectId,
        link: `/purchase-orders`,
      });

      alert("✅ تم إرسال الطلب للمحاسب بنجاح.");
    } finally {
      setRequestingFor(null);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#020B1C]"><Loader2 className="animate-spin text-[#D4AF37] w-8 h-8" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#020B1C] text-white p-6 md:p-10" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-[#D4AF37] text-sm mb-6 hover:opacity-80">
          <ArrowRight size={16} /> رجوع
        </button>

        <div className="flex items-center gap-3 mb-2">
          <Package className="text-[#D4AF37]" />
          <h1 className="text-2xl font-bold">خامات وكميات المشروع — {project?.project_name}</h1>
        </div>
        <p className="text-[#8AA1C9] text-sm mb-8">{project?.project_code} · الكميات المعتمدة بالمقايسة النهائية للعميل، والمتاح فعلياً منها لموقعك</p>

        {materials.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D4AF37]/40 bg-[#0A1730] p-10 text-center text-[#8AA1C9]">
            مفيش مقايسة معتمدة (نهائية) لهذا المشروع لسه، أو مفيش بنود مرتبطة بمنتجات من مكتبة الخامات.
          </div>
        ) : (
          <div className="space-y-3">
            {materials.map((m, idx) => {
              const isLow = m.remainingQty <= 0 || m.remainingQty < m.budgetedQty * 0.15; // أقل من 15% من المطلوب
              return (
                <div key={idx} className="rounded-xl border border-[#243556] bg-[#0A1730] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h3 className="font-bold text-[#F0E6D2]">{m.name}</h3>
                    {isLow && (
                      <span className="text-xs px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1">
                        <AlertTriangle size={12} /> رصيد منخفض
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                    <div>
                      <p className="text-[#8AA1C9] mb-1">معتمد بالمقايسة</p>
                      <p className="font-mono font-bold text-[#D4AF37]">{m.budgetedQty} {m.unit}</p>
                    </div>
                    <div>
                      <p className="text-[#8AA1C9] mb-1">اتشترى للمشروع</p>
                      <p className="font-mono font-bold text-blue-400">{m.purchasedQty} {m.unit}</p>
                    </div>
                    <div>
                      <p className="text-[#8AA1C9] mb-1">اتصرف بالفعل</p>
                      <p className="font-mono font-bold text-slate-300">{m.disbursedQty} {m.unit}</p>
                    </div>
                    <div>
                      <p className="text-[#8AA1C9] mb-1">المتاح دلوقتي</p>
                      <p className={`font-mono font-bold ${isLow ? "text-red-400" : "text-emerald-400"}`}>{m.remainingQty} {m.unit}</p>
                    </div>
                  </div>
                  {isLow && (
                    <button
                      onClick={() => requestFunding(m)}
                      disabled={requestingFor === m.name}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      {requestingFor === m.name ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Send size={14} />} اطلب صرف من المحاسب
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
