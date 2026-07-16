"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";
import { isOnline, addToOfflineQueue } from "@/lib/offline-sync";
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
  Trash2
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
    // 🌟 حل المشكلة: إرجاع وسم التوجيه dir="rtl" إلى الـ main الرئيسي لضمان ثبات السايدبار الأيمن بالكامل وتكامل الشاشة كلياً
    <main className="min-h-screen bg-[#020B1C] relative overflow-hidden" dir="rtl">
      <Sidebar />
      
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

      <section className="w-full lg:pr-56 m-0 min-h-screen flex flex-col">
        <Header />
        <div className="p-4 md:p-8 space-y-6 text-right font-sans">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1f2d4d] pb-5">
            <div>
              <h1 className="text-4xl font-extrabold text-[#D4AF37] tracking-wide">جدار صلاحيات الموظفين والعملاء</h1>
              <p className="text-slate-300 text-sm mt-1.5 leading-relaxed font-bold">إسناد الأدوار القيادية وتفعيل الرقابة الأمنية وعزل الخزينة والعملاء بالتطابق مع جدار حماية الصلاحيات الموحد.</p>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="royal-gradient-btn text-black font-black px-6 py-3 rounded-full text-xs md:text-sm flex items-center gap-2 cursor-pointer flex-shrink-0"
            >
              <UserPlus className="w-4 h-4 stroke-[3]" />
              <span>إضافة موظف جديد حيوياً</span>
            </button>
          </div>

          <div className="flex flex-col space-y-6">
            
            <div className="bg-[#07132a] border-2 border-[#1f2d4d] rounded-2xl overflow-hidden shadow-2xl flex flex-col w-full">
              <div className="p-4 border-b border-[#243556] bg-[#0b1b3d]/60 select-none">
                <h3 className="text-[#D4AF37] font-black text-sm">سجل الموظفين والعملاء النشطين بالسيستم ({usersList.length})</h3>
              </div>
              
              <div className="overflow-x-auto w-full max-w-full">
                <table className="w-full text-right text-xs md:text-sm text-[#F0E6D2] min-w-[800px] table-auto font-bold">
                  <thead className="bg-[#0b1d3d] text-[#D4AF37] font-black border-b border-[#1f2d4d]">
                    <tr className="whitespace-nowrap select-none">
                      <th className="p-4">اسم الموظف / العميل</th>
                      <th className="p-4">البريد الإلكتروني</th>
                      <th className="p-4 font-bold text-[#D4AF37]">الرتبة والوظيفة</th>
                      <th className="p-4 text-center">رؤية التقارير</th>
                      <th className="p-4 text-center">تعديل الأسعار</th>
                      <th className="p-4 text-center text-rose-400">حذف السجلات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f2d4d]/60">
                    {usersList.map((u) => (
                      <tr
                        key={u.id}
                        onClick={() => handleSelectUser(u)}
                        className={`hover:bg-[#020B1C]/50 transition duration-150 cursor-pointer whitespace-nowrap ${
                          selectedUser?.id === u.id ? "bg-[#0b1b3d]/50 border-r-4 border-r-[#D4AF37]" : ""
                        }`}
                      >
                        <td className="p-4 font-black text-slate-100 text-sm md:text-base">{u.name}</td>
                        <td className="p-4 font-mono text-slate-400 text-xs md:text-sm">{u.email}</td>
                        <td className="p-4 text-[#D4AF37] font-bold">
                          {roleLabels[u.role] || u.role}
                        </td>
                        <td className="p-4 text-center font-bold">
                          {u.permissions?.can_view_reports ? (
                            <span className="text-emerald-400 bg-emerald-950/20 px-2.5 py-1 rounded border border-emerald-500/10 text-xs font-bold select-none">✅ نعم</span>
                          ) : (
                            <span className="text-slate-500 text-xs font-bold select-none">❌ لا</span>
                          )}
                        </td>
                        <td className="p-4 text-center font-bold">
                          {u.permissions?.can_edit_prices ? (
                            <span className="text-emerald-400 bg-emerald-950/20 px-2.5 py-1 rounded border border-emerald-500/10 text-xs font-bold select-none">✅ نعم</span>
                          ) : (
                            <span className="text-slate-500 text-xs font-bold select-none">❌ لا</span>
                          )}
                        </td>
                        <td className="p-4 text-center font-bold text-rose-400">
                          {u.permissions?.can_delete_records ? (
                            <span className="text-rose-400 bg-rose-950/20 px-2.5 py-1 rounded border border-rose-500/10 text-xs font-bold select-none">✅ نعم</span>
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
              <div className="bg-[#07132a] border-2 border-[#D4AF37]/50 rounded-[2rem] p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden w-full">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
                
                <div className="border-b border-[#1f2d4d] pb-3.5 select-none">
                  <h3 className="text-[#D4AF37] font-black text-base flex items-center gap-1.5">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    تعديل مصفوفة أمان وصلاحيات الموظف: <span className="text-white font-black">{selectedUser.name}</span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">تحديد الدور وصلاحيات القراءة والكتابة الدقيقة حيوياً بالـ RLS بالأسفل</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start text-sm">
                  
                  <div className="space-y-3 bg-[#020B1C]/40 p-4 rounded-2xl border border-[#1f2d4d]/60">
                    <span className="block text-xs text-[#D4AF37] font-bold">الرتبة والوظيفة التنظيمية:</span>
                    <p className="text-[11px] text-gray-500 leading-relaxed mb-2">اختر الرتبة الإدارية لتحديد الصلاحيات الهيكلية للموظف بالسيستم:</p>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] font-black px-3 outline-none cursor-pointer focus:border-[#D4AF37] text-xs md:text-sm"
                    >
                      <option value="admin">مدير النظام 👑</option>
                      <option value="manager">مدير الحسابات والتشغيل 💵</option>
                      <option value="sales_manager">مدير مبيعات (CRM) 📊</option>
                      <option value="sales">موظف مبيعات (سيلز) 📈</option>
                      <option value="procurement">موظف مشتريات ومخازن 📦</option>
                      <option value="engineer">مهندس الموقع الميداني 🏗️</option>
                    </select>
                  </div>

                  <div className="space-y-3 bg-[#020B1C]/40 p-4 rounded-2xl border border-[#1f2d4d]/60">
                    <span className="block text-xs text-[#D4AF37] font-bold">جدار الأمان والتحكم الصلاحي:</span>
                    
                    <label className="flex items-center justify-between p-2.5 bg-[#020B1C] border border-[#1f2d4d] rounded-xl cursor-pointer hover:border-[#D4AF37]/20 transition-all select-none">
                      <span className="font-bold text-xs text-slate-200">قراءة التقارير والتحليلات المالية</span>
                      <input
                        type="checkbox"
                        checked={canViewReports}
                        onChange={(e) => setCanViewReports(e.target.checked)}
                        className="w-5 h-5 rounded border-[#1f2d4d] bg-[#020B1C] text-[#D4AF37] focus:ring-0 accent-[#D4AF37] cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-[#020B1C] border border-[#1f2d4d] rounded-xl cursor-pointer hover:border-[#D4AF37]/20 transition-all select-none">
                      <span className="font-bold text-xs text-slate-200">تعديل أسعار الخامات والمقايسات</span>
                      <input
                        type="checkbox"
                        checked={canEditPrices}
                        onChange={(e) => setCanEditPrices(e.target.checked)}
                        className="w-5 h-5 rounded border-[#1f2d4d] bg-[#020B1C] text-[#D4AF37] focus:ring-0 accent-[#D4AF37] cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-[#020B1C] border border-[#1f2d4d] rounded-xl cursor-pointer hover:border-red-500/20 transition-all select-none">
                      <span className="font-bold text-xs text-rose-400">حذف السجلات والعملاء والمنتجات</span>
                      <input
                        type="checkbox"
                        checked={canDeleteRecords}
                        onChange={(e) => setCanDeleteRecords(e.target.checked)}
                        className="w-5 h-5 rounded border-[#1f2d4d] bg-[#020B1C] text-[#D4AF37] focus:ring-0 accent-[#D4AF37] cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="space-y-3 bg-[#020B1C]/40 p-4 rounded-2xl border border-[#1f2d4d]/60 flex flex-col justify-center h-full">
                    <span className="block text-xs text-[#D4AF37] font-bold mb-1 select-none">إجراءات الحفظ والإدارة:</span>
                    
                    <button
                      onClick={handleSavePermissions}
                      disabled={saving}
                      className="w-full h-12 royal-gradient-btn text-black font-black rounded-full text-xs md:text-sm flex items-center justify-center gap-2"
                    >
                      💾 حفظ مصفوفة الأمان والصلاحيات
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteUser}
                      disabled={saving}
                      className="w-full h-11 bg-transparent border-2 border-red-500/30 text-rose-400 rounded-full font-black text-xs md:text-sm hover:bg-red-500 hover:text-[#020B1C] transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      حذف حساب الموظف نهائياً
                    </button>
                  </div>

                </div>
              </div>
            ) : (
              <div className="bg-[#07132a] border border-dashed border-[#D4AF37]/30 rounded-[1.5rem] p-6 text-center text-slate-400 text-sm font-bold select-none leading-relaxed shadow-lg">
                📢 انقر على سطر أي موظف أو عميل في الجدول أعلاه لمعاينة مصفوفة الأمان الخاصة به وتعديل صلاحياته حيوياً هنا بالأسفل.
              </div>
            )}

          </div>

        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#07132a] border-2 border-[#D4AF37]/50 rounded-[2rem] w-full max-w-lg shadow-[0_0_50px_rgba(212,175,55,0.15)] overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
            
            <div className="border-b border-[#1f2d4d] p-5 flex justify-between items-center bg-[#020B1C]/60 rounded-t-[2rem]">
              <h3 className="text-lg font-black text-[#D4AF37] flex items-center gap-2 select-none">
                <UserPlus className="w-5 h-5 stroke-[2.5]" />
                إنشاء حساب موظف / فني جديد سحابياً
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] hover:text-red-400 hover:border-red-500/20 transition-all flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-5 text-right font-bold" dir="rtl">
              
              <div>
                <label className="block text-slate-300 text-xs font-bold mb-2">اسم الموظف بالكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: م. أحمد الجارحي"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-white px-4 outline-none text-sm font-semibold focus:border-[#D4AF37] placeholder-slate-600 transition-all"
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
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-white px-4 outline-none text-sm font-semibold focus:border-[#D4AF37] placeholder-slate-600 transition-all font-mono"
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
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-white px-4 outline-none text-sm font-semibold focus:border-[#D4AF37] placeholder-slate-600 transition-all font-mono"
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
                      className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-white px-4 outline-none text-sm font-semibold focus:border-[#D4AF37] placeholder-slate-600 transition-all font-mono"
                    />
                    
                    <label className="absolute left-3 top-3 flex items-center gap-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showPassword}
                        onChange={(e) => setShowPassword(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-[#1f2d4d] bg-[#020B1C] text-[#D4AF37] focus:ring-0 accent-[#D4AF37] cursor-pointer"
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
                    className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] font-black px-3 outline-none cursor-pointer focus:border-[#D4AF37] text-sm"
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
                  className="w-1/3 h-11 bg-transparent border-2 border-[#1f2d4d] text-[#D4AF37] rounded-full font-black text-xs md:text-sm hover:bg-[#1f2d4d]/40 transition-all duration-300 cursor-pointer flex items-center justify-center"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingNewUser}
                  className="w-2/3 h-11 royal-gradient-btn text-black font-black rounded-full text-xs md:text-sm flex items-center justify-center gap-1.5"
                >
                  {savingNewUser ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>جاري تشفير الحساب...</span>
                    </>
                  ) : (
                    "💾 إنشاء حساب الموظف"
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </main>
  );
}