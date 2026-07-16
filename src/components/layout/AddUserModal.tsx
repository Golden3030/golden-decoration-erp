"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AddUserModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("sales"); // الافتراضي موظف مبيعات
  const [loading, setLoading] = useState(false);

  // وظيفة حفظ المستخدم أو الموظف أو المحاسب الجديد في قاعدة البيانات الفعلي
  async function handleSaveUser() {
    if (!name || !email || !phone) {
      alert("يرجى ملء الحقول الإلزامية (الاسم، البريد الإلكتروني، الهاتف) لتسجيل الصلاحية.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("users")
        .insert({
          name: name,
          email: email,
          phone: phone,
          role: role
        });

      if (error) throw error;

      alert(`✅ تم تسجيل وتوثيق المستخدم الجديد بنجاح في نظام الصلاحيات لشركة جولد ديكوريشن!`);
      onClose();
    } catch (err: any) {
      console.error("Save User Error:", err);
      alert("حدث خطأ أثناء حفظ الصلاحية: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const rolesList = [
    { label: "مدير النظام", val: "admin" },
    { label: "موظف مبيعات (CRM)", val: "sales" },
    { label: "مهندس موقع (مشرف)", val: "engineer" },
    { label: "محاسب مالي", val: "accountant" },
    { label: "عميل مخصص", val: "client" }
  ];

  return (
    <div dir="rtl" className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300">
      
      <div className="bg-[#07132a] border border-[#F0E6D2] rounded-2xl p-8 w-full max-w-lg text-right relative mx-4 space-y-6 shadow-2xl">
        
        <div className="border-b border-[#243556] pb-4 flex justify-between items-center">
          <h2 className="text-[#F0E6D2] text-2xl font-bold">صلاحيات النظام وإضافة مستخدم</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white font-bold text-2xl cursor-pointer">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-white text-sm mb-2 font-bold">الاسم بالكامل *</label>
            <input
              type="text"
              placeholder="الاسم الثلاثي للموظف"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-12 text-base rounded-xl bg-[#020B1C] border border-[#243556] text-white px-4 outline-none focus:border-[#F0E6D2]"
            />
          </div>

          <div>
            <label className="block text-white text-sm mb-2 font-bold">البريد الإلكتروني *</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 text-base rounded-xl bg-[#020B1C] border border-[#243556] text-white px-4 outline-none focus:border-[#F0E6D2]"
            />
          </div>

          <div>
            <label className="block text-white text-sm mb-2 font-bold">رقم الهاتف / الموبايل *</label>
            <input
              type="text"
              placeholder="رقم الهاتف الرئيسي للتواصل"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-12 text-base rounded-xl bg-[#020B1C] border border-[#243556] text-white px-4 outline-none focus:border-[#F0E6D2]"
            />
          </div>

          <div>
            <label className="block text-white text-sm mb-2 font-bold text-[#D4AF37]">تحديد صلاحية ونوع الحساب *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-12 text-base rounded-xl bg-[#020B1C] border border-[#243556] text-white px-3 outline-none"
            >
              {rolesList.map((r) => (
                <option key={r.val} value={r.val}>
                  {r.label}
                </option>
              ))}
            </select>
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
            onClick={handleSaveUser}
            disabled={loading}
            className="bg-[#c9a227] text-black px-8 py-3 rounded-xl font-bold hover:bg-[#F0E6D2] cursor-pointer transition disabled:opacity-50 text-base"
          >
            {loading ? "جاري منح الصلاحية..." : "🔑 تسجيل ومنح الصلاحية"}
          </button>
        </div>

      </div>

    </div>
  );
}