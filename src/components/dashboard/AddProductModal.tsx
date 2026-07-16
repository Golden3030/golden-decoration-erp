"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AddProductModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("electricity"); // الافتراضي كهرباء
  const [unit, setUnit] = useState("لفة");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [loading, setLoading] = useState(false);

  // وظيفة حفظ المنتج أو الخامة الجديدة في Supabase
  async function handleSaveProduct() {
    if (!name || !category || !unit || !purchasePrice || !sellingPrice) {
      alert("يرجى ملء كافة الحقول الإلزامية لتسجيل المنتج الجديد.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("materials")
        .insert({
          name: name,
          category: category,
          unit: unit,
          purchase_price: Number(purchasePrice),
          selling_price: Number(sellingPrice)
        });

      if (error) throw error;

      alert(`✅ تم تسجيل الخامة الجديدة: (${name}) بنجاح داخل قاعدة البيانات، وستظهر فوراً في جداول المقايسة!`);
      onClose();
    } catch (err: any) {
      console.error("Save Product Error:", err);
      alert("حدث خطأ أثناء تسجيل المنتج: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const categoriesList = [
    { label: "أعمال المحارة ", val: "plaster" },
    { label: "أعمال الدهانات والنقاشة", val: "paint" },
    { label: "أعمال الأرضيات والسيراميك", val: "flooring" },
    { label: "أعمال الجبس والأسقف", val: "ceiling" },
    { label: "أعمال الأبواب الخشبية", val: "doors" },
    { label: "أعمال الشبابيك والألوميتال", val: "aluminum" },
    { label: "أعمال التأسيس والكهرباء", val: "electricity" },
    { label: "أعمال الصحي والسباكة", val: "plumbing" },
    { label: "أعمال التكييفات وتمديد الفريون", val: "ac" },
    { label: "أعمال الديكورات الجمالية", val: "decorations" }
  ];

  return (
    <div dir="rtl" className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300">
      
      <div className="bg-[#07132a] border border-[#F0E6D2] rounded-2xl p-8 w-full max-w-lg text-right relative mx-4 space-y-6 shadow-2xl">
        
        <div className="border-b border-[#243556] pb-4 flex justify-between items-center">
          <h2 className="text-[#F0E6D2] text-2xl font-bold">إضافة خامة / منتج جديد للتسعير</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white font-bold text-2xl cursor-pointer">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-white text-sm mb-2 font-bold">اسم البند / الخامة تفصيلياً *</label>
            <input
              type="text"
              placeholder="مثال: سلك سويدي 6 مم"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-12 text-base rounded-xl bg-[#020B1C] border border-[#243556] text-white px-4 outline-none focus:border-[#F0E6D2]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white text-sm mb-2 font-bold">القسم التابع له *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-12 text-base rounded-xl bg-[#020B1C] border border-[#243556] text-white px-3 outline-none"
              >
                {categoriesList.map((c) => (
                  <option key={c.val} value={c.val}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white text-sm mb-2 font-bold">وحدة القياس *</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full h-12 text-base rounded-xl bg-[#020B1C] border border-[#243556] text-white px-3 outline-none"
              >
                <option>متر</option>
                <option>متر طولي</option>
                <option>م²</option>
                <option>لفة</option>
                <option>علبة</option>
                <option>شكارة</option>
                <option>بستلة</option>
                <option>باب</option>
                <option>طقم</option>
                <option>مقطوعية</option>
              </select>
            </div>
            <div>
              <label className="block text-white text-sm mb-2 font-bold">سعر الشراء للشركة *</label>
              <input
                type="number"
                placeholder="السعر الفعلي للشركة"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full h-12 text-base rounded-xl bg-[#020B1C] border border-[#243556] text-white px-4 outline-none focus:border-[#F0E6D2]"
              />
            </div>
            <div>
              <label className="block text-white text-sm mb-2 font-bold text-[#D4AF37]">سعر البيع للعميل *</label>
              <input
                type="number"
                placeholder="السعر المعتمد للمقايسة"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full h-12 text-base rounded-xl bg-[#020B1C] border border-[#243556] text-white px-4 outline-none focus:border-[#F0E6D2]"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-5 border-t border-[#243556]">
          <button
            onClick={onClose}
            className="bg-transparent border border-[#243556] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#152542] cursor-pointer transition text-base"
          >
            إلغاء
          </button>
          <button
            onClick={handleSaveProduct}
            disabled={loading}
            className="bg-[#c9a227] text-black px-8 py-3 rounded-xl font-bold hover:bg-[#F0E6D2] cursor-pointer transition disabled:opacity-50 text-base"
          >
            {loading ? "جاري الحفظ والرفع..." : "💾 حفظ وتسجيل الخامة"}
          </button>
        </div>

      </div>

    </div>
  );
}