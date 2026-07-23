"use client";

import { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";
import { isOnline, addToOfflineQueue } from "@/lib/offline-sync";
// 🌟 تم الحل وتضمين استيراد أيقونة التحميل المفقودة Loader2 بالاستيراد الرئيسي هنا لتفادي انهيار المترجم كلياً
import { 
  Plus, 
  Minus, 
  CheckCircle2, 
  Lock, 
  X, 
  UserPlus, 
  Mail, 
  Phone, 
  Sparkles, 
  RefreshCw, 
  ShieldAlert,
  Trash2,
  Loader2
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  permissions: {
    can_view_reports: boolean;
    can_edit_prices: boolean;
    can_delete_records: boolean;
  };
  created_at: string;
}

const roleLabels: { [key: string]: string } = {
  admin: "مدير النظام 👑",
  manager: "مدير الحسابات والتشغيل 💵",
  sales_manager: "مدير مبيعات (CRM) 📊",
  sales: "موظف مبيعات (سيلز) 📈",
  procurement: "موظف مشتريات ومخازن 📦",
  engineer: "مهندس الموقع الميداني 🏗️",
  client: "العميل النهائي صاحب الوحدة 👤"
};

export default function UsersPermissionsPage() {
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // حقول تعديل صلاحيات المستخدم المحدد
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState("sales");
  const [canViewReports, setCanViewReports] = useState(false);
  const [canEditPrices, setCanEditPrices] = useState(false);
  const [canDeleteRecords, setCanDeleteRecords] = useState(false);

  // حالات نافذة "إضافة موظف جديد" التفاعلية المنبثقة
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savingNewUser, setSavingNewUser] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState<boolean>(false); 
  const [newMobile, setNewMobile] = useState("");
  const [newRole, setNewRole] = useState("sales");

  useEffect(() => {
    document.title = "صلاحيات المستخدمين والموظفين | Golden Decoration";
    loadUsersData();
  }, []);

  async function loadUsersData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      const formatted = (data || []).map((u: any) => {
        const defaultPerms = {
          can_view_reports: false,
          can_edit_prices: false,
          can_delete_records: false
        };

        let parsedPerms = defaultPerms;
        if (u.permissions) {
          parsedPerms = {
            ...defaultPerms,
            ...(typeof u.permissions === "string" ? JSON.parse(u.permissions) : u.permissions)
          };
        }

        return {
          id: u.id,
          name: u.name || "موظف غير مسمى",
          email: u.email || "-",
          phone: u.mobile || u.phone || "-", 
          role: u.role || "sales",
          permissions: parsedPerms,
          created_at: u.created_at
        };
      });

      setUsersList(formatted);
    } catch (err: any) {
      console.error("Error loading users list:", err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectUser(user: UserProfile) {
    if (selectedUser?.id === user.id) {
      setSelectedUser(null);
    } else {
      setSelectedUser(user);
      setSelectedRole(user.role);
      setCanViewReports(!!user.permissions?.can_view_reports);
      setCanEditPrices(!!user.permissions?.can_edit_prices);
      setCanDeleteRecords(!!user.permissions?.can_delete_records);
    }
  }

  async function handleSavePermissions() {
    if (!selectedUser) {
      alert("يرجى تحديد موظف من الجدول أولاً لحفظ صلاحياته.");
      return;
    }

    setSaving(true);
    const updatedPermissions = {
      can_view_reports: canViewReports,
      can_edit_prices: canEditPrices,
      can_delete_records: canDeleteRecords
    };

    try {
      const { error } = await supabase
        .from("users")
        .update({
          role: selectedRole,
          permissions: updatedPermissions 
        })
        .eq("id", selectedUser.id);

      if (error) throw error;

      alert(`✅ تم تحديث مصفوفة الأمان وصلاحيات الموظف (${selectedUser.name}) بنجاح!`);
      setSelectedUser(null);
      await loadUsersData();
    } catch (err: any) {
      alert("حدث خطأ أثناء تعديل جدار الصلاحيات: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteUser() {
    if (!selectedUser) return;
    
    const confirmDelete = window.confirm(`هل أنت متأكد من حذف حساب الموظف (${selectedUser.name}) نهائياً من قاعدة البيانات ونظام المصادقة العام بالشركة؟`);
    if (!confirmDelete) return;

    setSaving(true);
    try {
      let res = await fetch("/api/user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedUser.id })
      });

      if (res.status === 404) {
        res = await fetch("/api/users", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: selectedUser.id })
        });
      }

      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error("استجابة الخادم غير صالحة أثناء الحذف.");
      }

      if (!res.ok) {
        throw new Error(data.error || "فشل حذف حساب المستخدم من السيرفر.");
      }

      alert(`🗑️ تم إزالة وحذف الموظف المعتمد (${selectedUser.name}) بنجاح من المنظومة!`);
      setSelectedUser(null);
      await loadUsersData();
    } catch (err: any) {
      alert("حدث خطأ أثناء الحذف: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword || !newRole || !newMobile) {
      alert("يرجى ملء كافة الحقول الإلزامية وتوفير رقم الموبايل لتخليق الحساب.");
      return;
    }

    setSavingNewUser(true);
    try {
      let res = await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          name: newName,
          mobile: newMobile, 
          role: newRole
        })
      });

      if (res.status === 404) {
        res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: newEmail,
            password: newPassword,
            name: newName,
            mobile: newMobile,
            role: newRole
          })
        });
      }

      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error("استجابة الخادم غير صالحة. يرجى التحقق من صحة تسمية مجلد الـ API (user أو users) بملفات المشروع.");
      }

      if (!res.ok) {
        throw new Error(data.error || "فشل الملحق السحابي في إنشاء الموظف.");
      }

      alert(`✅ تم جدولة الحساب وإنشاء بروفايل الموظف المعتمد (${newName}) وتفعيل صلاحياته بنجاح!`);
      
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setShowPassword(false);
      setNewMobile("");
      setNewRole("sales");
      setIsModalOpen(false);

      await loadUsersData(); 
    } catch (err: any) {
      alert("حدث خطأ أثناء إضافة الموظف الجديد: " + err.message);
    } finally {
      setSavingNewUser(false);
    }
  }

  return (
    // 🌟 حل المشكلة: إرجاع وسم التوجيه dir="rtl" وموازاة الـ flex إلى الـ main الرئيسي لضمان ثبات السايدبار الأيمن بالكامل وتكامل الشاشة كلياً
    <main className="min-h-screen flex bg-[#020B1C] relative overflow-hidden font-alexandria" dir="rtl">
      <Sidebar />
      
      {/* 🛠️ جدار الحماية البصري الموحد وتنسيق شريط التمرير مذهب الألوان بسمك 6px لمنع التداخل والقص كلياً للـ BOQ */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* تفعيل وإظهار شريط التمرير الأفقي والرأسي بكافة الجداول بألوان ذهبية فاخرة */
        ::-webkit-scrollbar { 
          width: 6px !important; 
          height: 6px !important; 
          display: block !important;
        }
        ::-webkit-scrollbar-track { 
          background: #020B1C !important; 
        }
        ::-webkit-scrollbar-thumb { 
          background: #D4AF37 !important; 
          border-radius: 9999px !important; 
        }
        ::-webkit-scrollbar-thumb:hover { 
          background: #AA7C11 !important; 
        }

        /* إلغاء أكواد الإخفاء لضمان انسيابية التمرير بالماوس والجوال */
        .overflow-x-auto { 
          -ms-overflow-style: auto !important; 
          overflow-x: auto !important; 
        }
        
        .overflow-y-auto {
          scrollbar-width: thin !important;
          scrollbar-color: #D4AF37 #020B1C !important;
        }

        /* عزل تلوين وأوزان خلايا جدول صلاحيات الموظفين ومنع تسريب الـ CSS للسايدبار */
        .premium-users-table thead th {
          font-size: 0.75rem !important;
          font-weight: 500 !important;
          color: #D4AF37 !important;
          text-align: right !important;
          background-color: #020B1C !important;
          border-bottom: 2px solid rgba(212, 175, 55, 0.3) !important;
          padding: 14px 16px !important;
          letter-spacing: normal !important;
        }

        .premium-users-table tbody td {
          font-size: 0.8rem !important;
          font-weight: 400 !important;
          text-align: right !important;
          border-bottom: 1px solid rgba(212, 175, 55, 0.1) !important;
          padding: 14px 16px !important;
          letter-spacing: normal !important;
        }

        .premium-users-table tbody tr:hover {
          background-color: rgba(7, 19, 42, 0.8) !important;
        }
      `}} />

      <section className="flex-1 flex flex-col lg:pr-56 m-0 min-h-screen">
        <Header />
        <div className="p-4 md:p-8 space-y-6 text-right select-none animate-fade-in">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#D4AF37]/20 pb-5">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[#D4AF37] flex items-center gap-2 select-none">
                <span>جدار حماية وصلاحيات مستخدمي النظام</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-pulse" />
              </h1>
              <p className="text-white text-xs mt-2 font-semibold">إسناد الأدوار القيادية وتفعيل الرقابة الأمنية وعزل الخزينة والعملاء بالتطابق مع جدار حماية الصلاحيات الموحد.</p>
            </div>

            {/* 🌟 ترقية شكل زر إنشاء الموظف للنسق الحركي الميتاليكي المذهب مع عاكس الإضاءة النيوني السفلي */}
            <button
              type="button" 
              onClick={(e) => { e.preventDefault(); setIsModalOpen(true); }}
              className="px-6 h-11 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer text-sm font-bold flex items-center justify-center gap-1.5 select-none relative overflow-hidden flex-shrink-0"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>إضافة موظف جديد </span>
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
            </button>
          </div>

          <div className="flex flex-col space-y-6">
            
            {/* 1. جدول كشوف الموظفين المطور بالمقياس الإمبراطوري المتين بالمنصة */}
            <div className="bg-[#07132a] border-2 border-[#D4AF37] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col relative w-full">
              <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
              <div className="p-4 border-b border-[#D4AF37] bg-[#0b1b3d]/60 select-none">
                <h3 className="text-[#D4AF37] font-bold text-sm md:text-md">سجل الموظفين والعملاء المسجلين بالمنظومة ({usersList.length})</h3>
              </div>
              
              {/* تفعيل التمرير مذهب الألوان وحماية الجدول من التقاطع بـ whitespace-nowrap و min-w-[850px] بالكامل */}
              <div className="overflow-x-auto w-full max-w-full">
                <table className="w-full text-right table-auto min-w-[850px] premium-users-table">
                  <thead>
                    <tr className="whitespace-nowrap select-none">
                      <th>اسم الموظف / العميل</th>
                      <th>البريد الإلكتروني</th>
                      <th className="font-bold text-[#D4AF37]">الرتبة والوظيفة</th>
                      <th className="text-center">رؤية التقارير</th>
                      <th className="text-center">تعديل الأسعار</th>
                      <th className="text-center text-rose-400">حذف السجلات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((u) => (
                      <tr
                        key={u.id}
                        onClick={() => handleSelectUser(u)}
                        className={`cursor-pointer whitespace-nowrap transition duration-200 ${
                          selectedUser?.id === u.id ? "bg-[#0b1b3d]/50 border-r-4 border-r-[#D4AF37]" : ""
                        }`}
                      >
                        <td className="font-black text-slate-100">{u.name}</td>
                        <td className="font-mono text-slate-400 text-xs">{u.email}</td>
                        <td className="p-4 text-[#D4AF37] font-bold">
                          {roleLabels[u.role] || u.role}
                        </td>
                        <td className="text-center">
                          {u.permissions?.can_view_reports ? (
                            <span className="text-emerald-400 bg-emerald-950/20 px-2.5 py-1 rounded-lg border border-emerald-500/20 text-xs font-bold select-none">✅ نعم</span>
                          ) : (
                            <span className="text-slate-500 text-xs font-bold select-none">❌ لا</span>
                          )}
                        </td>
                        <td className="text-center">
                          {u.permissions?.can_edit_prices ? (
                            <span className="text-emerald-400 bg-emerald-950/20 px-2.5 py-1 rounded-lg border border-emerald-500/20 text-xs font-bold select-none">✅ نعم</span>
                          ) : (
                            <span className="text-slate-500 text-xs font-bold select-none">❌ لا</span>
                          )}
                        </td>
                        <td className="text-center text-rose-400">
                          {u.permissions?.can_delete_records ? (
                            <span className="text-rose-400 bg-rose-950/20 px-2.5 py-1 rounded-lg border border-rose-500/20 text-xs font-bold select-none">✅ نعم</span>
                          ) : (
                            <span className="text-slate-500 text-xs font-bold select-none">❌ لا</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedUser ? (
              <div className="bg-[#07132a] border-2 border-[#D4AF37] rounded-[2rem] p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden w-full">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
                
                <div className="border-b border-[#D4AF37] pb-3.5 select-none">
                  <h3 className="text-[#D4AF37] font-bold text-base flex items-center gap-1.5">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    تعديل مصفوفة أمان وصلاحيات الموظف: <span className="text-white font-black">{selectedUser.name}</span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">تحديد الدور وصلاحيات القراءة والكتابة الدقيقة بالـ RLS بالأسفل</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start text-xs font-semibold">
                  
                  <div className="space-y-3 bg-[#020B1C]/40 p-4 rounded-2xl border border-[#D4AF37]/15">
                    <span className="block text-xs text-[#D4AF37] font-bold">الرتبة والوظيفة التنظيمية:</span>
                    <p className="text-[11px] text-gray-500 leading-relaxed mb-2 font-medium">اختر الرتبة الإدارية لتحديد الصلاحيات الهيكلية للموظف بالسيستم:</p>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] font-black px-3 outline-none cursor-pointer focus:border-[#D4AF37]"
                    >
                      <option value="admin">مدير النظام 👑</option>
                      <option value="manager">مدير الحسابات والتشغيل 💵</option>
                      <option value="sales_manager">مدير مبيعات (CRM) 📊</option>
                      <option value="sales">موظف مبيعات (سيلز) 📈</option>
                      <option value="procurement">موظف مشتريات ومخازن 📦</option>
                      <option value="engineer">مهندس الموقع الميداني 🏗️</option>
                    </select>
                  </div>

                  <div className="space-y-3 bg-[#020B1C]/40 p-4 rounded-2xl border border-[#D4AF37]/15">
                    <span className="block text-xs text-[#D4AF37] font-bold">جدار الأمان والتحكم الصلاحي:</span>
                    
                    <label className="flex items-center justify-between p-2.5 bg-[#020B1C] border border-[#D4AF37]/15 rounded-xl cursor-pointer hover:border-[#D4AF37]/35 transition-all select-none">
                      <span className="font-bold text-xs text-slate-200">قراءة التقارير والتحليلات المالية</span>
                      <input
                        type="checkbox"
                        checked={canViewReports}
                        onChange={(e) => setCanViewReports(e.target.checked)}
                        className="w-5 h-5 rounded border-[#D4AF37]/20 bg-[#020B1C] text-[#D4AF37] focus:ring-0 accent-[#D4AF37] cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-[#020B1C] border border-[#D4AF37]/15 rounded-xl cursor-pointer hover:border-[#D4AF37]/35 transition-all select-none">
                      <span className="font-bold text-xs text-slate-200">تعديل أسعار الخامات والمقايسات</span>
                      <input
                        type="checkbox"
                        checked={canEditPrices}
                        onChange={(e) => setCanEditPrices(e.target.checked)}
                        className="w-5 h-5 rounded border-[#D4AF37]/20 bg-[#020B1C] text-[#D4AF37] focus:ring-0 accent-[#D4AF37] cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-[#020B1C] border border-[#D4AF37]/15 rounded-xl cursor-pointer hover:border-red-500/20 transition-all select-none">
                      <span className="font-bold text-xs text-rose-400">حذف السجلات والعملاء والمنتجات</span>
                      <input
                        type="checkbox"
                        checked={canDeleteRecords}
                        onChange={(e) => setCanDeleteRecords(e.target.checked)}
                        className="w-5 h-5 rounded border-[#D4AF37]/20 bg-[#020B1C] text-[#D4AF37] focus:ring-0 accent-[#D4AF37] cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="space-y-3 bg-[#020B1C]/40 p-4 rounded-2xl border border-[#D4AF37]/15 flex flex-col justify-center h-full">
                    <span className="block text-xs text-[#D4AF37] font-bold mb-1 select-none">إجراءات الحفظ والإدارة:</span>
                    
                    {/* 🌟 ترقية وتوحيد زرار حفظ مصفوفة الأمان للدستور البصري الحركي الموحد بـ عاكس الإضاءة السفلي */}
                    <button
                      type="button" 
                      onClick={(e) => { e.preventDefault(); handleSavePermissions(); }}
                      disabled={saving}
                      className="w-full px-6 h-12 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.01] active:scale-95 transition-all duration-300 text-xs font-black flex items-center justify-center gap-1.5 select-none relative overflow-hidden disabled:opacity-40 cursor-pointer"
                    >
                      {saving ? <Loader2 className="animate-spin w-4 h-4 text-[#D4AF37]" /> : <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />}
                      <span>حفظ مصفوفة الصلاحيات</span>
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteUser}
                      disabled={saving}
                      className="w-full h-11 bg-transparent border-2 border-red-500/30 text-rose-400 rounded-xl font-black text-xs md:text-sm hover:bg-red-500 hover:text-[#020B1C] transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      حذف حساب الموظف نهائياً
                    </button>
                  </div>

                </div>
              </div>
            ) : (
              <div className="bg-[#07132a] border border-dashed border-[#D4AF37]/30 rounded-[2rem] p-6 text-center text-slate-400 text-xs font-black select-none leading-relaxed shadow-lg">
                📢 انقر على سطر أي موظف أو عميل في الجدول أعلاه لمعاينة مصفوفة الأمان الخاصة به وتعديل صلاحياته حيوياً هنا بالأسفل.
              </div>
            )}

          </div>

        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          {/* ترقية زوايا مودال الموظف الجديد للمقياس الإمبراطوري المتين بالمنصة */}
          <div className="bg-[#07132a] border-2 border-[#D4AF37] rounded-[2rem] w-full max-w-lg shadow-[0_0_50px_rgba(212,175,55,0.15)] overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
            
            <div className="border-b border-[#D4AF37]/15 p-5 flex justify-between items-center bg-[#020B1C]/60 rounded-t-[2rem]">
              <h3 className="text-md font-black text-[#D4AF37] flex items-center gap-2 select-none">
                <UserPlus className="w-5 h-5 stroke-[2.5]" />
                إنشاء حساب موظف / فني جديد سحابياً
              </h3>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] hover:text-red-400 hover:border-red-500/20 transition-all flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-5 text-right font-bold text-xs" dir="rtl">
              
              <div>
                <label className="block text-slate-300 text-xs font-bold mb-2">اسم الموظف بالكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: م. أحمد الجارحي"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-white px-4 outline-none text-xs font-semibold focus:border-[#D4AF37] placeholder-slate-600 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-xs font-bold mb-2 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#D4AF37]" />
                    البريد الإلكتروني الرسمي *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@golddecoration.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-white px-4 outline-none text-xs font-semibold focus:border-[#D4AF37] placeholder-slate-600 transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-xs font-bold mb-2 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#D4AF37]" />
                    رقم الهاتف / الواتس اب *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="010XXXXXXXX"
                    value={newMobile}
                    onChange={(e) => setNewMobile(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-white px-4 outline-none text-xs font-semibold focus:border-[#D4AF37] placeholder-slate-600 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-xs font-bold mb-2">رقم المرور المؤقت للحساب *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-white px-4 outline-none text-xs font-semibold focus:border-[#D4AF37] placeholder-slate-600 transition-all font-mono"
                    />
                    
                    <label className="absolute left-3 top-3 flex items-center gap-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showPassword}
                        onChange={(e) => setShowPassword(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-[#D4AF37]/20 bg-[#020B1C] text-[#D4AF37] focus:ring-0 accent-[#D4AF37] cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-400 font-bold select-none">عرض</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 text-xs font-bold mb-2">الرتبة والوظيفة بالشركة *</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] font-black px-3 outline-none cursor-pointer focus:border-[#D4AF37] text-xs"
                  >
                    <option value="admin">مدير النظام 👑</option>
                    <option value="manager">مدير الحسابات والتشغيل 💵</option>
                    <option value="sales_manager">مدير مبيعات (CRM) 📊</option>
                    <option value="sales">موظف مبيعات (سيلز) 📈</option>
                    <option value="procurement">موظف مشتريات ومخازن 📦</option>
                    <option value="engineer">مهندس الموقع الميداني 🏗️</option>
                  </select>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl flex items-start gap-2.5 select-none">
                <ShieldAlert className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                  تحذير إداري: سيقوم النظام بتأكيد وتأصيل حساب الموظف حيوياً في نظام المصادقة الرئيسي. يرجى تزويد الموظف بكلمة المرور المسجلة فوراً ليتمكن من الدخول على لوحة التحكم.
                </p>
              </div>

              <div className="flex gap-3 pt-3 border-t border-[#1f2d4d]/60 select-none">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/3 h-11 bg-transparent border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 px-6 rounded-xl font-black text-xs hover:text-[#020B1C] hover:bg-gradient-to-r hover:from-[#D4AF37] hover:to-[#C9A45D] transition-all duration-300 cursor-pointer flex items-center justify-center"
                >
                  إلغاء
                </button>
                {/* 🌟 ترقية وتوحيد زرار تخليق الموظف السحابي للدستور البصري الحركي الموحد بـ عاكس الإضاءة السفلي */}
                <button
                  type="submit"
                  disabled={savingNewUser}
                  className="w-2/3 h-11 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.01] active:scale-95 transition-all duration-300 text-xs font-black flex items-center justify-center gap-1.5 select-none relative overflow-hidden disabled:opacity-40 cursor-pointer"
                >
                  {savingNewUser ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>جاري تشفير الحساب...</span>
                    </>
                  ) : (
                    "💾 إنشاء حساب الموظف"
                  )}
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </main>
  );
}