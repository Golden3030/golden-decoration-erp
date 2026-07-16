"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";
import { isOnline, addToOfflineQueue } from "@/lib/offline-sync";
import { PlusCircle, Save, Plus, Minus } from "lucide-react"; 

export default function SettingsPage() {
  const [coefficients, setCoefficients] = useState<any[]>([]);
  const [workItems, setWorkItems] = useState<any[]>([]); 
  const [materials, setMaterials] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // حقول نموذج إدراج معامل هندسي جديد
  const [selectedWorkItemId, setSelectedWorkItemId] = useState("");
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [newQty, setNewQty] = useState<number | "">("");
  const [newUnit, setNewUnit] = useState("م³");
  const [newNotes, setNewNotes] = useState("");

  useEffect(() => {
    document.title = "حصر الكميــات | Golden Decoration";
    loadAllSettingsData();
  }, []);

  async function loadAllSettingsData() {
    setLoading(true);
    try {
      const { data: coeffData, error: coeffError } = await supabase
        .from("work_item_analysis")
        .select("*")
        .order("created_at", { ascending: true });

      if (coeffError) throw coeffError;
      setCoefficients(coeffData || []);

      const { data: itemsData, error: itemsError } = await supabase
        .from("work_items")
        .select("*")
        .order("item_name", { ascending: true });

      if (itemsError) throw itemsError;
      setWorkItems(itemsData || []);

      const { data: materialsData, error: matsError } = await supabase
        .from("products_library")
        .select("id, product_name, unit")
        .order("product_name", { ascending: true });

      if (matsError) throw matsError;
      setMaterials(materialsData || []);

    } catch (err: any) {
      console.error("Error loading settings:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleCoeffChange(id: string, value: string) {
    setCoefficients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, consumption_qty: value !== "" ? Number(value) : "" } : c))
    );
  }

  async function handleSaveAll() {
    const hasEmptyValue = coefficients.some((c) => c.consumption_qty === "");
    if (hasEmptyValue) {
      alert("الرجاء التأكد من إدخال قيم كافة المعاملات الهندسية.");
      return;
    }
    setSaving(true);
    try {
      const promises = coefficients.map((c) =>
        supabase
          .from("work_item_analysis")
          .update({ consumption_qty: Number(c.consumption_qty) })
          .eq("id", c.id)
      );

      await Promise.all(promises);

      alert("✅ تم حفظ وتحديث معاملات حصر الكميات الهندسية بنجاح!");
      await loadAllSettingsData();
    } catch (err: any) {
      alert("حدث خطأ أثناء حفظ التعديلات: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleInsertNewCoeff() {
    if (!selectedWorkItemId || !selectedMaterialId || newQty === "") {
      alert("يرجى اختيار بند العمل، الخامة المراد ربطها، ونسبة الاستهلاك لحفظ المعامل.");
      return;
    }

    setSaving(true);
    const payload = {
      work_item_id: selectedWorkItemId,
      material_id: selectedMaterialId,
      consumption_qty: Number(newQty),
      unit: newUnit,
      notes: newNotes || null,
      line_type: "material",
      is_optional: false
    };

    try {
      if (isOnline()) {
        const { error } = await supabase
          .from("work_item_analysis")
          .insert([payload]);

        if (error) throw error;
        alert("✅ تم تسجيل وإدراج المعامل الهندسي الجديد بنجاح بالسيستم!");
      } else {
        addToOfflineQueue("work_item_analysis", "INSERT", payload);
        alert("⚠️ تم حفظ معامل الاستهلاك محلياً بنجاح؛ وسيتم تحديث حاسبة الحصر فور توفر الإنترنت.");
      }
      
      setSelectedWorkItemId("");
      setSelectedMaterialId("");
      setNewQty("");
      setNewNotes("");
      
      await loadAllSettingsData();
    } catch (err: any) {
      alert("حدث خطأ أثناء إدراج المعامل: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  const plasterSpecs = coefficients.filter((c) => c.notes?.includes("محارة") || c.notes?.includes("رمل") || c.notes?.includes("أسمنت"));
  const paintSpecs = coefficients.filter((c) => c.notes?.includes("دهان") || c.notes?.includes("معجون") || c.notes?.includes("بطانة"));
  const floorSpecs = coefficients.filter((c) => c.notes?.includes("أرضيات") || c.notes?.includes("سيراميك") || c.notes?.includes("وزرة") || c.notes?.includes("ردم") || c.notes?.includes("تركيب البلاط"));

  return (
    // 🌟 حل المشكلة: إرجاع وسم التوجيه dir="rtl" إلى الـ main الرئيسي لضمان ثبات السايدبار الأيمن بالكامل وتكامل الشاشة كلياً
    <main className="min-h-screen bg-[#020B1C] relative overflow-hidden" dir="rtl">
      
      <style dangerouslySetInnerHTML={{__html: `
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none !important;
          margin: 0 !important;
        }
        input[type="number"] {
          -moz-appearance: textfield !important; 
        }
      `}} />

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
        .overflow-y-auto {
          scrollbar-width: thin !important;
          scrollbar-color: #D4AF37 #020B1C !important;
        }
        .royal-gradient-btn {
          background: linear-gradient(90deg, #C9A45D 0%, #F0E6D2 50%, #D4AF37 100%) !important;
          color: #020B1C !important;
          font-weight: 900 !important;
          border: 1px solid #D4AF37 !important;
          box-shadow: 0 0 15px rgba(212, 175, 55, 0.2) !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .royal-gradient-btn:hover {
          transform: scale(1.02) !important;
          box-shadow: 0 0 25px rgba(212, 175, 55, 0.45) !important;
          cursor: pointer !important;
        }
      `}} />

      <Sidebar />
      
      <section className="w-full lg:pr-56 m-0 min-h-screen flex flex-col">
        <Header />
        <div className="p-4 md:p-8 space-y-6 text-right font-sans select-none">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-[#D4AF37] tracking-wide">إعدادات النظام الفنية</h1>
            <p className="text-gray-300 text-base mt-2 font-bold">إدارة الثوابت الحسابية ومعاملات حصر الكميات الهندسية للتحكم الفوري ببنود ومقايسات الـ BOQ.</p>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-400 text-base animate-pulse font-bold">جاري جلب وتحليل الثوابت الهندسية...</div>
          ) : (
            <div className="space-y-8">
              
              <div className="bg-[#07132a] border-2 border-[#1f2d4d] rounded-2xl p-6 space-y-5 shadow-xl">
                <h3 className="text-[#D4AF37] font-black text-lg border-b border-[#243556] pb-2 select-none">➕ إضافة وإدراج معامل حصر إنشائي جديد</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm md:text-base font-bold">
                  
                  <div>
                    <label className="block text-[#D4AF37] text-sm mb-2 font-black">بند العمل الرئيسي *</label>
                    <select
                      value={selectedWorkItemId}
                      onChange={(e) => setSelectedWorkItemId(e.target.value)}
                      className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#243556] text-white px-3 text-sm outline-none cursor-pointer font-bold focus:border-[#D4AF37]"
                    >
                      <option value="">-- اختر البند الرئيسي --</option>
                      {workItems.map((item) => (
                        <option key={item.id} value={item.id}>{item.item_name} ({item.category})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#D4AF37] text-sm mb-2 font-black">الخامة المراد ربطها *</label>
                    <select
                      value={selectedMaterialId}
                      onChange={(e) => setSelectedMaterialId(e.target.value)}
                      className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#243556] text-[#D4AF37] px-3 text-sm outline-none cursor-pointer font-bold focus:border-[#D4AF37]"
                    >
                      <option value="">-- اختر المادة الخام --</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>{m.product_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#D4AF37] text-sm mb-2 font-black">معامل الاستهلاك الرقمي *</label>
                    
                    {/* 🎯 تعديل لعداد تمليط وحصر خامات التأسيس ليتطابق بكسلياً بالدواير الرشيقة w-6 h-6 وارتفاع h-11 مع دستور الـ ERP */}
                    <div className="flex items-center justify-between bg-[#020B1C] border border-[#243556] rounded-xl h-11 px-2 select-none" dir="ltr">
                      <button
                        type="button"
                        onClick={() => setNewQty(prev => {
                          const val = Number(prev) || 0;
                          return val <= 0.001 ? 0 : Number((val - 0.001).toFixed(4));
                        })}
                        className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                      >
                        <Minus size={12} className="stroke-[3]" />
                      </button>
                      
                      <div className="text-center font-black">
                        <span className="text-sm font-black text-white font-mono">{newQty}</span>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setNewQty(prev => Number(((Number(prev) || 0) + 0.001).toFixed(4)))}
                        className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                      >
                        <Plus size={12} className="stroke-[3]" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#D4AF37] text-sm mb-2 font-black">وحدة قياس المعامل *</label>
                    <select
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#243556] text-white px-3 text-sm outline-none cursor-pointer font-bold focus:border-[#D4AF37]"
                    >
                      <option>م³</option>
                      <option>طن</option>
                      <option>شكارة</option>
                      <option>بستلة</option>
                      <option>م²</option>
                      <option>م.ط</option>
                    </select>
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-[#D4AF37] text-sm mb-2 font-black">البيان والشرح (الملاحظة)</label>
                    <input
                      type="text"
                      placeholder="مثال: رمل لكل متر محارة"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#243556] text-white px-4 text-sm outline-none font-bold focus:border-[#D4AF37] placeholder-slate-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-3 select-none">
                  <button
                    onClick={handleInsertNewCoeff}
                    className="royal-gradient-btn text-[#020B1C] px-8 py-3.5 rounded-full font-black text-xs md:text-sm flex items-center justify-center gap-1.5"
                  >
                    <span>حفظ وإدراج المعامل الجديد</span>
                    <PlusCircle className="w-5 h-5 text-[#020B1C]" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-bold select-none">
                
                {/* 1. كارت معاملات المحارة */}
                <div className="bg-[#07132a] border border-[#1f2d4d] rounded-2xl p-5 space-y-4 shadow-xl">
                  <h3 className="text-[#D4AF37] font-black text-lg border-b border-[#243556] pb-2">🧱 معاملات المحارة والتأسيس</h3>
                  <div className="space-y-4 text-sm md:text-base">
                    {plasterSpecs.length > 0 ? (
                      plasterSpecs.map((c) => (
                        <div key={c.id} className="space-y-1.5">
                          <label className="block text-slate-300 text-xs font-black">{c.notes} ({c.unit || "متر"})</label>
                          <input
                            type="number"
                            step="0.0001"
                            value={c.consumption_qty}
                            onChange={(e) => handleCoeffChange(c.id, e.target.value)}
                            className="w-full h-12 rounded-lg bg-[#020B1C] border border-[#243556] text-[#D4AF37] px-3 text-sm outline-none focus:border-[#D4AF37] font-mono font-black"
                          />
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm text-center p-6 font-semibold">لا توجد معاملات مضافة للمحارة بعد.</p>
                    )}
                  </div>
                </div>

                {/* 2. كارت معاملات الدهانات */}
                <div className="bg-[#07132a] border border-[#1f2d4d] rounded-2xl p-5 space-y-4 shadow-xl">
                  <h3 className="text-[#D4AF37] font-black text-lg border-b border-[#243556] pb-2">🎨 معاملات معالجة ودهان الحوائط</h3>
                  <div className="space-y-4 text-sm md:text-base">
                    {paintSpecs.length > 0 ? (
                      paintSpecs.map((c) => (
                        <div key={c.id} className="space-y-1.5">
                          <label className="block text-slate-300 text-xs font-black">{c.notes} ({c.unit || "متر"})</label>
                          <input
                            type="number"
                            step="0.0001"
                            value={c.consumption_qty}
                            onChange={(e) => handleCoeffChange(c.id, e.target.value)}
                            className="w-full h-12 rounded-lg bg-[#020B1C] border border-[#243556] text-[#D4AF37] px-3 text-sm outline-none focus:border-[#D4AF37] font-mono font-black"
                          />
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm text-center p-6 font-semibold">لا توجد معاملات مضافة للدهانات بعد.</p>
                    )}
                  </div>
                </div>

                {/* 3. كارت معاملات الأرضيات */}
                <div className="bg-[#07132a] border border-[#1f2d4d] rounded-2xl p-5 space-y-4 shadow-xl">
                  <h3 className="text-[#D4AF37] font-black text-lg border-b border-[#243556] pb-2">📐 معاملات تكسيات وأرضيات الوحدة</h3>
                  <div className="space-y-4 text-sm md:text-base">
                    {floorSpecs.length > 0 ? (
                      floorSpecs.map((c) => (
                        <div key={c.id} className="space-y-1.5">
                          <label className="block text-slate-300 text-xs font-black">{c.notes} ({c.unit || "متر"})</label>
                          <input
                            type="number"
                            step="0.0001"
                            value={c.consumption_qty}
                            onChange={(e) => handleCoeffChange(c.id, e.target.value)}
                            className="w-full h-12 rounded-lg bg-[#020B1C] border border-[#243556] text-[#D4AF37] px-3 text-sm outline-none focus:border-[#D4AF37] font-mono font-black"
                          />
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm text-center p-6 font-semibold">لا توجد معاملات مضافة للأرضيات بعد.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-5 border-t border-[#243556] select-none">
                <button
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="royal-gradient-btn text-[#020B1C] px-10 py-4 rounded-full text-base flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{saving ? "جاري حفظ الإعدادات..." : "حفظ التعديلات الجارية مع حاسبة الحصر"}</span>
                  <Save className="w-5 h-5 text-[#020B1C]" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}