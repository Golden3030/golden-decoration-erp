"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient"; 
import TasksManagerModal from "./TasksManagerModal"; 
import { 
  Target, 
  FolderOpen, 
  Check, 
  CalendarCheck 
} from "lucide-react";

export default function Tasks() {
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // حالة التحكم لفتح وإغلاق نافذة إدارة المهام الـ CRUD المنبثقة
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  // 1. جلب أهم 4 مهام جارية وغير مكتملة من قاعدة البيانات حياً لفرزها بالداشبورد
  useEffect(() => {
    fetchActiveTasks();
  }, []);

  async function fetchActiveTasks() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status")
        .neq("status", "completed") // تصفية وعرض المهام غير المكتملة فقط بالكرت
        .order("due_date", { ascending: true })
        .limit(4); // جلب أول 4 مهام عاجلة فقط

      if (error) throw error;
      setTasksList(data || []);
    } catch (err: any) {
      console.error("Error loading active dashboard tasks:", err);
    } finally {
      setLoading(false);
    }
  }

  // 2. دالة ذكية لتحديث حالة المهمة حياً في Supabase بمجرد قيام المستخدم بالضغط عليها
  async function toggleTask(taskItem: any) {
    try {
      // بما أنها غير مكتملة، فعند الضغط عليها سنحول حالتها لـ completed
      const { error } = await supabase
        .from("tasks")
        .update({ status: "completed" })
        .eq("id", taskItem.id);

      if (error) throw error;

      // إعادة تحميل كرت المهام بالداشبورد فوراً لفرز المهام المتبقية حياً
      await fetchActiveTasks();
    } catch (err: any) {
      console.error("Error toggling task status:", err);
    }
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

      <div dir="rtl" className="h-full bg-[#07132a] border border-[#1f2d4d] rounded-2xl p-5 overflow-hidden transition-all duration-300 hover:border-[#D4AF37]/35 shadow-2xl flex flex-col justify-between font-alexandria">   
        
        {/* رأس ترويسة المهام اليومية مع إحلال أيقونات Lucide الفاخرة للتحكم الفوري */}
        <div className="flex justify-between items-center border-b border-[#243556] pb-3 mb-4 select-none">
          <div className="flex items-center gap-3 justify-start bg-[#0b1b3d] px-3.5 py-2 rounded-xl border border-[#D4AF37]/15">
            <Target className="w-5 h-5 text-[#D4AF37] shrink-0 animate-pulse" />
            <h2 className="text-[#D4AF37] text-sm font-bold">
              المهام الموقعية اليومية
            </h2>
          </div>

          {/* زر إظهار الكل الموصول الآن بنموذج الـ CRUD المنبثق بأيقونة فاخرة */}
          <button
            onClick={() => setIsManagerOpen(true)}
            className="text-[#D4AF37] hover:text-[#F0E6D2] text-[11px] font-black transition cursor-pointer flex items-center gap-1.5 select-none hover:translate-x-[-2px] duration-200"
          >
            <span>إظهار الكل</span>
            <FolderOpen size={13} className="shrink-0 text-[#D4AF37]" />
          </button>
        </div>
     
        {/* قائمة المهام التفاعلية الموصولة بـ Supabase */}
        <div className="space-y-3.5 text-white flex-1">
          {loading ? (
            <div className="p-12 text-center text-[#F0E6D2]/45 text-xs font-semibold animate-pulse">جاري جلب قائمة المهام الموقعية حياً...</div>
          ) : tasksList.length > 0 ? (
            tasksList.map((task) => (
              <div
                key={task.id}
                onClick={() => toggleTask(task)}
                className="flex items-center gap-3.5 p-3.5 bg-[#020B1C] border border-[#D4AF37]/10 rounded-xl hover:border-[#D4AF37]/45 hover:shadow-[0_4px_15px_rgba(212,175,55,0.06)] transition-all duration-200 cursor-pointer select-none group/item"
                title="اضغط لوضع علامة اكتمال وإزاحة المهمة فورا من الجدول"
              >
                {/* حلقة الاختيار الكهرومغناطيسية المحدثة للـ ERP */}
                <div className="w-5 h-5 rounded-full border border-[#D4AF37]/35 flex items-center justify-center transition-all duration-200 hover:border-[#D4AF37] hover:bg-[#D4AF37]/15 group/check shrink-0">
                  <Check className="w-3 h-3 text-transparent group-hover/item:text-[#D4AF37] transition-colors duration-150" strokeWidth={3} />
                </div>

                <span className="text-xs md:text-sm text-[#F0E6D2] font-semibold group-hover/item:text-[#D4AF37] transition-colors leading-normal truncate">
                  {task.title}
                </span>
              </div>
            ))
          ) : (
            /* في حال عدم وجود مهام - تظهر لوحة تصفير المهام بأيقونة Lucide الإنجازية المذهبة */
            <div className="p-8 text-center flex flex-col items-center justify-center gap-3.5 select-none animate-in zoom-in duration-300">
              <CalendarCheck className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)] animate-bounce" size={44} strokeWidth={1.5} />
              <p className="text-[#F0E6D2]/60 text-xs font-semibold leading-relaxed">
                كل الأعمال مكتملة! لا توجد مهام جارية اليوم.
              </p>
            </div>
          )}
        </div>

        {/* 3. رسم نافذة الـ CRUD المنبثقة لإضافة وتعديل وحفظ وحذف المهام وإعادة جلب البيانات عند الغلق */}
        {isManagerOpen && (
          <TasksManagerModal
            onClose={() => {
              setIsManagerOpen(false);
              fetchActiveTasks(); // تحديث فوري للداشبورد عند غلق شاشة الإدارة
            }}
          />
        )}

      </div>
    </>
  );
}