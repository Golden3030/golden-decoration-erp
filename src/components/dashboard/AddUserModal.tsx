"use client";

import { useState } from "react";

interface AddUserModalProps {
  onClose: () => void;
}

export default function AddUserModal({ onClose }: AddUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState(""); // كلمة المرور المؤقتة للموظف الجديد
  const [role, setRole] = useState("sales");
  const [saving, setSaving] = useState(false);

  // دالة إرسال الطلب لـ السيرفر الخلفي للتسجيل الآمن دون تسجيل خروج المدير
  async function handleRegisterUser() {
    if (!name || !email || !password || !role) {
      alert("يرجى ملء الحقول الإلزامية وتعيين كلمة مرور مؤقتة للموظف.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          mobile,
          password,
          role
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "حدث خطأ غير معروف أثناء التسجيل.");
      }

      alert(`✅ تم تسجيل الموظف (${name}) بنجاح ومنحه صلاحية حساب (${role}) بكلمة مرورك المؤقتة المحددة!`);
      onClose();
    } catch (err: any) {
      alert("فشل تسجيل الموظف: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" dir="rtl">
      <div className="bg-[#07132a] border-2 border-[#F0E6D2] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl transition-all">
        
        {/* هيدر الشاشة */}
        <div className="border-b border-[#243556] p-5 flex justify-between items-center bg-[#0B1B38]">
          <h3 className="text-[#F0E6D2] text-lg font-bold">🔑 صلاحيات النظام وإضافة مستخدم جديد</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl font-bold cursor-pointer">✕</button>
        </div>

        {/* حقول الإدخال الفاخرة */}
        <div className="p-6 space-y-5 text-right">
          <div>
            <label className="block text-white text-xs mb-1.5 font-bold">الاسم بالكامل للموظف *</label>
            <input
              type="text"
              placeholder="الاسم الثلاثي المعتمد للشركة"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 text-xs rounded-xl bg-[#020B1C] border border-[#243556] text-white px-4 outline-none focus:border-[#F0E6D2]"
            />
          </div>

          <div>
            <label className="block text-white text-xs mb-1.5 font-bold">البريد الإلكتروني المهني *</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 text-xs rounded-xl bg-[#020B1C] border border-[#243556] text-white px-4 outline-none focus:border-[#F0E6D2]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white text-xs mb-1.5 font-bold">رقم الهاتف / الموبايل</label>
              <input
                type="text"
                placeholder="رقم للتواصل المباشر"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full h-11 text-xs rounded-xl bg-[#020B1C] border border-[#243556] text-white px-4 outline-none focus:border-[#F0E6D2]"
              />
            </div>
            <div>
              <label className="block text-[#D4AF37] text-xs mb-1.5 font-bold">كلمة المرور المؤقتة *</label>
              <input
                type="password"
                placeholder="حد أدنى 6 أحرف"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 text-xs rounded-xl bg-[#020B1C] border border-[#243556] text-[#D4AF37] px-4 outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          <div>
            <label className="block text-white text-xs mb-1.5 font-bold">تحديد الصلاحية ونوع الحساب الممنوح *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-11 text-xs rounded-xl bg-[#020B1C] border border-[#243556] text-[#D4AF37] font-bold px-3 outline-none"
            >
              <option value="sales">موظف مبيعات (CRM / مبيعات جارية)</option>
              <option value="accounts">موظف حسابات مالية (خزينة وحساب مقاولين)</option>
              <option value="procurement">موظف مشتريات (مخازن وتسعير خامات)</option>
              <option value="client">عميل نهائي (لوحة المتابعة والمستندات)</option>
            </select>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#243556]">
            <button
              onClick={onClose}
              className="bg-transparent border border-gray-600 text-gray-300 px-5 py-2 rounded-xl text-xs font-bold hover:bg-gray-800 cursor-pointer"
            >
              إلغاء الإجراء
            </button>
            <button
              onClick={handleRegisterUser}
              disabled={saving}
              className="bg-[#D4AF37] text-black px-6 py-2 rounded-xl text-xs font-bold hover:bg-[#F0E6D2] cursor-pointer disabled:opacity-50"
            >
              {saving ? "جاري منح الصلاحيات..." : "🔑 تسجيل ومنح الصلاحية"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}