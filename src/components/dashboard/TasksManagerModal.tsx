"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient"; 
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  ClipboardCheck 
} from "lucide-react";

export default function TasksManagerModal({ onClose }: { onClose: () => void }) {
  const [tasks, setTasks] = useState<any[]>([]); // قائمة المهام الكاملة
  const [projects, setProjects] = useState<any[]>([]); // قائمة المشاريع للربط
  const [loading, setLoading] = useState(true);

  // حقول نموذج الإضافة والتعديل للمهمة
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // حالة التحكم في التعديل (Edit Mode)
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 1. جلب المهام والمشاريع حياً عند تحميل الشاشة
  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoading(true);
    try {
      // تصحيح الاستعلام: جلب المشاريع غير المكتملة neq("status", "completed") لضمان رندرتها بالكومبوبوكس بنجاح
      const [
        { data: dbTasks, error: tasksErr },
        { data: dbProjects, error: projErr }
      ] = await Promise.all([
        supabase.from("tasks").select("*, projects(project_name)").order("due_date", { ascending: true }),
        supabase.from("projects").select("id, project_name").neq("status", "completed")
      ]);

      if (tasksErr) throw tasksErr;
      if (projErr) throw projErr;

      setTasks(dbTasks || []);
      setProjects(dbProjects || []);
    } catch (err: any) {
      console.error("Error loading tasks manager data:", err);
    } finally {
      setLoading(false);
    }
  }

  // 2. دالة الإضافة أو حفظ التعديلات للمهمة بـ Supabase (Create & Update)
  async function handleSaveTask() {
    if (!title || !assignedTo || !dueDate || !selectedProjectId) {
      alert("يرجى ملء كافة الحقول الإلزامية لتسجيل المهمة.");
      return;
    }

    setSaving(true);

    try {
      if (editTaskId) {
        // تعديل مهمة سابقة (Update)
        const { error } = await supabase
          .from("tasks")
          .update({
            project_id: selectedProjectId,
            title: title,
            assigned_to: assignedTo,
            due_date: dueDate
          })
          .eq("id", editTaskId);

        if (error) throw error;
        alert("✅ تم تعديل المهمة بنجاح!");
      } else {
        // إضافة مهمة جديدة (Create)
        const { error } = await supabase
          .from("tasks")
          .insert({
            project_id: selectedProjectId,
            title: title,
            assigned_to: assignedTo,
            due_date: dueDate,
            status: "pending"
          });

        if (error) throw error;
        alert("✅ تم تسجيل المهمة الجديدة بنجاح!");
      }

      // تفريغ الحقول وإعادة جلب البيانات
      clearForm();
      await loadInitialData();
    } catch (err: any) {
      console.error("Error saving task:", err);
      alert("حدث خطأ أثناء الحفظ: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // 3. دالة تفعيل وضع التعديل وملء الخانات بالبيانات المحددة مع تأمين دفاعي ضد قيم الـ null
  function startEdit(taskItem: any) {
    setEditTaskId(taskItem.id);
    setTitle(taskItem.title || "");
    setAssignedTo(taskItem.assigned_to || "");
    setDueDate(taskItem.due_date || "");
    setSelectedProjectId(taskItem.project_id || ""); // صمام أمان: تصفير القيمة برمجياً في حال كانت فارغة بالـ DB لمنع تسرب الـ null
  }

  // 4. دالة الحذف النهائي للمهمة من قاعدة البيانات (Delete)
  async function handleDeleteTask(taskId: string) {
    if (!confirm("هل أنت متأكد من حذف هذه المهمة نهائياً من الجداول؟")) return;

    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;
      alert("🗑️ تم حذف المهمة بنجاح!");
      await loadInitialData();
    } catch (err: any) {
      console.error("Error deleting task:", err);
      alert("حدث خطأ أثناء الحذف: " + err.message);
    }
  }

  function clearForm() {
    setEditTaskId(null);
    setTitle("");
    setAssignedTo("");
    setDueDate("");
    setSelectedProjectId("");
  }

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800;900&display=swap');
        
        .font-alexandria {
          font-family: 'Alexandria', Arial, sans-serif !important;
          letter-spacing: normal !important;
        }
      `}</style>

      <div dir="rtl" className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-start justify-center z-50 transition-all duration-300 overflow-y-auto py-10 px-4 font-alexandria">
        
        {/* صندوق المودال المخملي المذهب الفخم الموحد */}
        <div className="bg-[#07132a] border border-[#D4AF37]/50 rounded-2xl w-full max-w-2xl text-right relative mx-4 shadow-2xl p-6 space-y-6">
          
          <div className="border-b border-[#243556] pb-3 flex justify-between items-center select-none">
            {/* تم تغيير لون العنوان الملكي بالكامل إلى الذهب الإمبراطوري #D4AF37 لزيادة الفخامة */}
            <h2 className="text-[#D4AF37] text-md font-black flex items-center gap-2">
              {editTaskId ? (
                <>
                  <Edit3 size={16} className="text-[#D4AF37] animate-pulse shrink-0" />
                  <span className="text-[#D4AF37]">تعديل مهمة موقع جارية</span>
                </>
              ) : (
                <>
                  <Plus size={16} className="text-[#D4AF37] shrink-0" />
                  <span className="text-[#D4AF37]">إضافة مهمة عمل موقع جديدة</span>
                </>
              )}
            </h2>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white font-bold text-lg cursor-pointer hover:scale-110 duration-200 animate-pulse"
              title="إغلاق"
            >
              <X size={18} />
            </button>
          </div>

          {/* نموذج الإضافة والتعديل للـ Task */}
          <div className="bg-[#020B1C] border border-[#1f2d4d] rounded-2xl p-4.5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#D4AF37] text-xs mb-1.5">اسم المشروع  *</label>
                {/* تم تأمين الـ value بصمام أمان لمنع تسرب الـ null نهائياً */}
                <select
                  value={selectedProjectId || ""}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full h-11 rounded-lg bg-[#07132a] border border-[#D4AF37]/20 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/35 text-white px-3 outline-none text-xs md:text-sm font-semibold transition-all duration-200 cursor-pointer"
                >
                  <option value="">اختر المشروع...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.project_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[#D4AF37] text-xs mb-1.5">عنوان ومواصفة المهمة *</label>
                <input
                  type="text"
                  placeholder="مثال: تأسيس سباكة الحمام"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-11 rounded-lg bg-[#07132a] border border-[#D4AF37]/20 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/35 text-[#F0E6D2] px-3.5 outline-none text-xs md:text-sm font-semibold transition-all duration-200 placeholder:text-[#F0E6D2]/25"
                />
              </div>
              <div>
                <label className="block text-[#D4AF37] text-xs mb-1.5">المهندس / الفني المسؤول بالموقع *</label>
                <input
                  type="text"
                  placeholder="مثال: مهندس خالد"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full h-11 rounded-lg bg-[#07132a] border border-[#D4AF37]/20 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/35 text-[#F0E6D2] px-3.5 outline-none text-xs md:text-sm font-semibold transition-all duration-200 placeholder:text-[#F0E6D2]/25"
                />
              </div>
              <div>
                <label className="block text-[#D4AF37] text-xs mb-1.5">تاريخ التسليم المتوقع *</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-11 rounded-lg bg-[#07132a] border border-[#D4AF37]/20 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/35 text-[#F0E6D2] px-3.5 outline-none text-xs md:text-sm font-semibold transition-all duration-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 select-none">
              {editTaskId && (
                <button
                  onClick={clearForm}
                  className="bg-transparent border border-[#D4AF37]/25 text-gray-300 px-4.5 py-2.5 rounded-xl text-[10px] font-bold hover:bg-white/5 transition duration-150 cursor-pointer"
                >
                  إلغاء التعديل
                </button>
              )}
              {/* زر الإرسال والحفظ اللمسي الكهرومغناطيسي الفاخر (Glowing Capacitive Edge) */}
              <button
                onClick={handleSaveTask}
                disabled={saving}
                className="bg-black/60 hover:bg-[#D4AF37] border-2 border-[#D4AF37] text-[#D4AF37] hover:text-[#020B1C] px-6 py-2.5 rounded-xl text-[11px] font-black shadow-[0_0_12px_rgba(212,175,55,0.25)] hover:shadow-[0_0_22px_rgba(212,175,55,0.55)] transition-all duration-300 cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {saving ? (
                  <span>جاري الحفظ...</span>
                ) : editTaskId ? (
                  <>
                    <Save size={13} strokeWidth={2.5} />
                    <span>حفظ التعديلات السحابية</span>
                  </>
                ) : (
                  <>
                    <Plus size={13} strokeWidth={2.5} />
                    <span>تأكيد تسجيل المهمة</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* عرض جدول قائمة جميع المهام بـ Supabase مع إمكانية التعديل والحذف الفوري */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-r-2 border-[#D4AF37] pr-2.5 select-none mb-3">
              <ClipboardCheck size={14} className="text-[#D4AF37]" />
              {/* تم تغيير لون العنوان الفرعي للجدول إلى الذهب الإمبراطوري #D4AF37 لزيادة التجانس الفخم */}
              <h3 className="text-[#D4AF37] font-black text-xs md:text-sm">قائمة المهام المجدولة بالمواقع</h3>
            </div>
            
            {loading ? (
              <div className="p-12 text-center text-[#F0E6D2]/45 text-xs animate-pulse">جاري سحب المهام والربط بالمشاريع...</div>
            ) : tasks.length > 0 ? (
              <div className="overflow-x-auto border border-[#1f2d4d] rounded-xl max-h-60 overflow-y-auto w-full">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#0b1d3d] text-[#F0E6D2]">
                    <tr className=" text-[8px] select-none border-b border-[#1f2d4d]">
                      <th className="p-3">المشروع</th>
                      <th className="p-3 ">مواصفة المهمة</th>
                      <th className="p-3 ">المسؤول بالموقع</th>
                      <th className="p-3 ">الحالة</th>
                      <th className="p-3 ">تاريخ التسليم</th>
                      <th className="p-3 text-center">إجراءات الصيانة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr key={task.id} className="border-t border-[#1f2d4d] hover:bg-[#0B1B38] text-white">
                        <td className="p-3 text-[#F0E6D2] font-bold text-[11px]">{task.projects?.project_name || "غير محدد"}</td>
                        <td className="p-3 font-medium text-[11px]">{task.title}</td>
                        <td className="p-3 text-gray-300 font-bold">{task.assigned_to}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black select-none ${
                            task.status === "completed" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}>{task.status === "completed" ? "مكتمل" : "جاري"}</span>
                        </td>
                        <td className="p-3 text-gray-400 font-mono font-bold">{task.due_date}</td>
                        <td className="p-3">
                          <div className="flex justify-center gap-3.5 select-none">
                            <button 
                              onClick={() => startEdit(task)} 
                              className="text-[#D4AF37] hover:text-white transition duration-150 cursor-pointer"
                              title="تعديل"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button 
                              onClick={() => handleDeleteTask(task.id)} 
                              className="text-[#ff6b6b] hover:text-red-500 transition duration-150 cursor-pointer"
                              title="حذف نهائي"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-[#F0E6D2]/40 text-xs font-semibold select-none">لا توجد مهام مسجلة بالمواقع حالياً.</div>
            )}
          </div>

        </div>

      </div>
    </>
  );
}