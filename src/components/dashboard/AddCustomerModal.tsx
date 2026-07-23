"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AddCustomerModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // وظيفة حفظ العميل الفعلي مع توليد كود العميل تلقائياً بذكاء
  async function handleSave() {
    if (!name || !mobile) {
      alert("يرجى ملء الحقول الإلزامية (اسم العميل، رقم الموبايل) لتسجيل العميل.");
      return;
    }

    setLoading(true);

    try {
      // توليد كود عميل عشوائي فريد تلقائياً (مثال: C-5829)
      const generatedCustomerCode = "C-" + Math.floor(1000 + Math.random() * 9000);

      const { error } = await supabase
        .from("customers")
        .insert({
          customer_code: generatedCustomerCode, // شحن الكود المولد تلقائياً
          name: name,
          mobile: mobile,
          phone: phone || null,
          address: address || null,
          email: email || null,
          status: "جديد"
        });

      if (error) throw error;

      alert(`✅ تم تسجيل العميل الجديد بنجاح في قاعدة البيانات الحقيقية بكود: ${generatedCustomerCode}`);
      onClose(); // إغلاق النافذة
    } catch (err: any) {
      console.error("Save Customer Error:", err);
      alert("حدث خطأ أثناء حفظ العميل: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300">
      
      {/* تم تكبير الهوامش والخطوط والبادنج بالكامل هنا لسهولة الرؤية والكتابة */}
      <div className="bg-[#07132a] border border-[#F0E6D2] rounded-2xl p-8 w-full max-w-xl text-right relative mx-4 space-y-6 shadow-2xl">
        
        <div className="border-b border-[#243556] pb-4 flex justify-between items-center">
          <h2 className="text-[#F0E6D2] text-2xl font-bold">إضافة عميل جديد</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white font-bold text-2xl cursor-pointer">✕</button>
        </div>

        {/* تنبيه بتوليد الكود التلقائي */}
        <div className="bg-[#152542] rounded-xl p-3 border border-[#1f2d4d] text-center">
          <p className="text-[#F0E6D2] text-sm">💡 ملاحظة: سيقوم النظام بتوليد كود العميل تلقائياً عند الضغط على حفظ.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-white text-sm mb-2 font-bold">اسم العميل *</label>
            <input
              type="text"
              placeholder="الاسم الثلاثي أو الثنائي"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-12 text-base rounded-xl bg-[#020B1C] border border-[#243556] text-white px-4 outline-none focus:border-[#F0E6D2]"
            />
          </div>
          <div>
            <label className="block text-white text-sm mb-2 font-bold">رقم الموبايل *</label>
            <input
              type="text"
              placeholder="رقم الموبايل "
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full h-12 text-base rounded-xl bg-[#020B1C] border border-[#243556] text-white px-4 outline-none focus:border-[#F0E6D2]"
            />
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-white text-sm mb-2 font-bold">الهاتف (اختياري)</label>
            <input
              type="text"
              placeholder="رقم موبايل اخر"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-12 text-base rounded-xl bg-[#020B1C] border border-[#243556] text-white px-4 outline-none focus:border-[#F0E6D2]"
            />
          </div>
        </div>

        <div>
          <label className="block text-white text-sm mb-2 font-bold">العنوان  (اختياري)</label>
          <input
            type="text"
            placeholder="عنوان إقامة العميل الرئيسي"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full h-12 text-base rounded-xl bg-[#020B1C] border border-[#243556] text-white px-4 outline-none focus:border-[#F0E6D2]"
          />
        </div>

        <div>
          <label className="block text-white text-sm mb-2 font-bold">البريد الإلكتروني (اختياري)</label>
          <input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 text-base rounded-xl bg-[#020B1C] border border-[#243556] text-white px-4 outline-none focus:border-[#F0E6D2]"
          />
        </div>

        <div className="flex justify-end gap-4 pt-5 border-t border-[#243556]">
          <button
            onClick={onClose}
            className="bg-transparent border border-[#243556] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#152542] cursor-pointer transition duration-150 text-base"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-[#c9a227] text-black px-8 py-3 rounded-xl font-bold hover:bg-[#F0E6D2] cursor-pointer transition duration-150 disabled:opacity-50 text-base"
          >
            {loading ? "جاري الحفظ..." : "💾 حفظ وتسجيل العميل"}
          </button>
        </div>

      </div>

    </div>
  );
}