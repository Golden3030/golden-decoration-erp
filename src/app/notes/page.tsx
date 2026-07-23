"use client";

import { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";
import { isOnline, addToOfflineQueue } from "@/lib/offline-sync";
import { 
  PlusCircle, 
  Save, 
  Plus, 
  Minus, 
  Loader2, 
  Sparkles, 
  Trash2, 
  Edit3, 
  Calendar 
} from "lucide-react";

interface QuickNote {
  id: string;
  title: string;
  content: string;
  due_date: string;
  is_completed: boolean;
  is_offline?: boolean;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🌟 تم حل المشكلة: حقن وتصريح حالة الـ saving لـمنع التكرار وحماية المترجم
  const [saving, setSaving] = useState(false);
  
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  useEffect(() => {
    document.title = "الملاحظات والمهام | Golden Decoration";
    loadNotes();
  }, []);

  async function loadNotes() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("quick_notes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
      
      localStorage.setItem("golden_cached_notes", JSON.stringify(data || []));
    } catch (err) {
      console.warn("Offline Mode - Loading from local cache");
      const cached = localStorage.getItem("golden_cached_notes");
      if (cached) {
        setNotes(JSON.parse(cached));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAddNote() {
    if (!newTitle) {
      alert("الرجاء إدخال عنوان الملاحظة أولاً.");
      return;
    }

    setSaving(true); // تفعيل حارس الحفظ
    const { data: { user } } = await supabase.auth.getUser();

    const tempId = crypto.randomUUID();
    const newNote: QuickNote = {
      id: tempId,
      title: newTitle,
      content: newContent,
      due_date: newDueDate,
      is_completed: false,
    };

    setNotes((prev) => [newNote, ...prev]);

    const insertPayload = {
      id: tempId,
      user_id: user?.id || null,
      title: newTitle,
      content: newContent,
      due_date: newDueDate || null,
      is_completed: false
    };

    if (!isOnline()) {
      addToOfflineQueue("quick_notes", "INSERT", insertPayload);
      alert("⚠️ تم حفظ الملاحظة محلياً مؤقتاً لعدم وجود إنترنت، وستتم مزامنتها تلقائياً فور عودة الشبكة.");
      newNote.is_offline = true;
      setNewTitle("");
      setNewContent("");
      setNewDueDate("");
      setSaving(false); // إلغاء تجميد الزرار
      return;
    }

    try {
      const { error } = await supabase
        .from("quick_notes")
        .insert([insertPayload]);

      if (error) throw error;
      
      setNewTitle("");
      setNewContent("");
      setNewDueDate("");
      await loadNotes();
    } catch (err) {
      console.warn("Saved Locally - Will Sync when online");
      newNote.is_offline = true;
      const cached = localStorage.getItem("golden_cached_notes");
      const currentList = cached ? JSON.parse(cached) : [];
      localStorage.setItem("golden_cached_notes", JSON.stringify([newNote, ...currentList]));
    } finally {
      setSaving(false); // إلغاء تجميد الزرار
    }
  }

  function startEditing(note: QuickNote) {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditDueDate(note.due_date || "");
  }

  async function handleUpdateNote() {
    if (!editTitle) {
      alert("الرجاء إدخال عنوان الملاحظة لتحديثها.");
      return;
    }

    setSaving(true); // تفعيل حارس الحفظ
    setNotes((prev) =>
      prev.map((n) =>
        n.id === editingId
          ? { ...n, title: editTitle, content: editContent, due_date: editDueDate }
          : n
      )
    );

    try {
      const { error } = await supabase
        .from("quick_notes")
        .update({
          title: editTitle,
          content: editContent,
          due_date: editDueDate || null
        })
        .eq("id", editingId);

      if (error) throw error;

      setEditingId(null);
      await loadNotes();
      alert("✅ تم تحديث وحفظ الملاحظة بنجاح!");
    } catch (err: any) {
      alert("حدث خطأ أثناء التحديث السحابي: " + err.message);
    } finally {
      setSaving(false); // إلغاء تجميد الزرار
    }
  }

  async function handleDeleteNote(noteId: string) {
    const confirmDelete = window.confirm("هل أنت متأكد من رغبتك في حذف هذه الملاحظة نهائياً؟");
    if (!confirmDelete) return;

    setNotes((prev) => prev.filter((n) => n.id !== noteId));

    try {
      const { error } = await supabase
        .from("quick_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;

      await loadNotes();
      alert("✅ تم حذف الملاحظة بنجاح من النظام!");
    } catch (err: any) {
      alert("حدث خطأ أثناء محاولة الحذف: " + err.message);
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
          scrollbar-width: thin !important; 
          -ms-overflow-style: auto !important; 
          overflow-x: auto !important; 
        }
        
        .overflow-y-auto {
          scrollbar-width: thin !important;
          scrollbar-color: #D4AF37 #020B1C !important;
        }
      `}} />

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

      <section className="flex-1 flex flex-col lg:pr-56 m-0 min-h-screen">
        <Header />
        <div className="p-4 md:p-8 space-y-6 text-right select-none animate-fade-in">
          
          <div className="border-b border-[#D4AF37]/20 pb-5">
            <h1 className="text-xl md:text-2xl font-black text-[#D4AF37] flex items-center gap-2">
              <span>الملاحظات والمهام السريعة والميدانية</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-pulse" />
            </h1>
            <p className="text-white text-xs mt-2">سجل مهامك اليومية والملاحظات الفنية للمواقع.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* كارت حجز المهمة المطور بالمقياس الإمبراطوري المتين بكسلياً */}
            <div className="bg-[#07132a] border-2 border-[#D4AF37] rounded-[2rem] p-6 space-y-5 h-fit shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-40" />
              {editingId ? (
                <>
                  <h3 className="text-[#D4AF37] font-black text-sm border-b border-[#D4AF37]/20 pb-3 select-none flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#D4AF37] animate-pulse" />
                    <span>📝 تعديل وتحرير الملاحظة</span>
                  </h3>
                  <div className="space-y-4 text-xs font-bold text-slate-300">
                    <input
                      type="text"
                      placeholder="تعديل العنوان..."
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white p-3 text-xs outline-none font-bold focus:border-[#D4AF37]"
                    />
                    <textarea
                      placeholder="تعديل المحتوى والتفاصيل..."
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={4}
                      className="w-full bg-[#020B1C] border border-[#D4AF37]/20 text-white p-3 text-xs outline-none font-bold resize-none focus:border-[#D4AF37] leading-relaxed"
                    />
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-[#D4AF37] p-3 text-xs outline-none font-mono font-bold focus:border-[#D4AF37]"
                    />
                    <div className="flex gap-2.5 select-none">
                      {/* 🌟 ترقية وتوحيد زرار تعديل الملاحظة للدستور البصري الحركي الموحد بـ عاكس الإضاءة السفلي */}
                      <button
                        type="button" 
                        onClick={(e) => { e.preventDefault(); handleUpdateNote(); }}
                        disabled={saving}
                        className="flex-1 px-4 h-11 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.01] active:scale-95 transition-all duration-300 text-xs font-black flex items-center justify-center gap-1.5 select-none relative overflow-hidden cursor-pointer"
                      >
                        {saving ? <Loader2 className="animate-spin w-4 h-4 text-[#D4AF37]" /> : <Save className="w-4 h-4 text-[#D4AF37]" />}
                        <span>حفظ التعديل</span>
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
                      </button>
                      
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setEditingId(null); }}
                        className="bg-transparent border border-red-500/40 text-red-500 hover:bg-red-500/10 px-6 h-11 rounded-xl text-xs font-black cursor-pointer transition"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-[#D4AF37] font-bold text-sm border-b border-[#D4AF37] pb-3 select-none flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#D4AF37] animate-pulse" />
                    <span>➕ إضافة مهمة جديدة</span>
                  </h3>
                  <div className="space-y-4 text-xs font-bold text-slate-300">
                    <input
                      type="text"
                      placeholder="عنوان المهمة..."
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white p-3 text-xs outline-none focus:border-[#D4AF37] font-bold"
                    />
                    <textarea
                      placeholder="محتوى الملاحظة والتفاصيل..."
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      rows={4}
                      className="w-full bg-[#020B1C] border border-[#D4AF37]/20 text-white p-3 text-xs outline-none font-bold resize-none leading-relaxed"
                    />
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white p-3 text-xs outline-none focus:border-[#D4AF37] font-mono font-bold"
                    />
                    {/* 🌟 ترقية وتوحيد زرار حجز الملاحظة للدستور البصري الحركي الموحد بـ عاكس الإضاءة السفلي */}
                    <button
                      type="button" 
                      onClick={(e) => { e.preventDefault(); handleAddNote(); }}
                      disabled={saving}
                      className="w-full px-6 py-3.5 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.01] active:scale-95 transition-all duration-300 text-xs font-bold flex items-center justify-center gap-1.5 select-none relative overflow-hidden disabled:opacity-40 cursor-pointer"
                    >
                      {saving ? <Loader2 className="animate-spin w-4 h-4 text-[#D4AF37]" /> : <PlusCircle className="w-4 h-4 text-[#D4AF37]" />}
                      <span>حفظ الملاحظة</span>
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="lg:col-span-2 space-y-4">
              {loading ? (
                <div className="text-center py-12 text-gray-400 text-sm animate-pulse font-bold">جاري فحص الملاحظات...</div>
              ) : notes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {notes.map((n) => {
                    const isOverdue = n.due_date && new Date(n.due_date) < new Date();
                    return (
                      /* ترقية زوايا كروت المهام للمقياس الإمبراطوري المتين والحدود المذهبة */
                      <div 
                        key={n.id} 
                        className={`bg-[#07132a] border-2 rounded-[2rem] p-6 flex flex-col justify-between transition-all duration-300 shadow-2xl relative overflow-hidden ${
                          editingId === n.id ? "border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.25)] bg-[#0b1b3d]/45" : "border-[#D4AF37] hover:border-[#D4AF37]/45"
                        }`}
                      >
                        <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#C9A45D] to-transparent opacity-20" />
                        <div className="space-y-3 z-10">
                          <div className="flex justify-between items-start gap-4 select-none">
                            <h4 className="text-[#D4AF37] font-bold text-base truncate max-w-[200px]">{n.title}</h4>
                            {n.is_offline && (
                              <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-lg font-bold whitespace-nowrap border border-amber-500/20">غير متزامن</span>
                            )}
                          </div>
                          <p className="text-[#F0E6D2] text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-bold">{n.content}</p>
                        </div>

                        <div className="mt-5 pt-3 border-t border-[#1f2d4d]/60 flex justify-between items-center select-none z-10">
                          {n.due_date ? (
                            <span className={`text-xs font-bold flex items-center gap-1 ${isOverdue ? "text-rose-400 animate-pulse" : "text-gray-400"}`}>
                              <Calendar className="w-3.5 h-3.5" />
                              {n.due_date}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">بدون تاريخ استحقاق</span>
                          )}

                          <div className="flex gap-4">
                            <button
                              type="button"
                              onClick={() => startEditing(n)}
                              className="text-[#D4AF37] hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer transition select-none"
                              title="تعديل الملاحظة"
                            >
                              <Edit3 className="w-4 h-4" />
                              <span>تعديل</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteNote(n.id)}
                              className="text-rose-500 hover:text-rose-400 font-bold text-xs flex items-center gap-1 cursor-pointer transition select-none"
                              title="حذف الملاحظة"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>حذف</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500 text-xs font-black bg-[#07132a] border-2 border-dashed border-[#d4af37]/25 rounded-[2rem] select-none">
                  لا توجد مهام أو ملاحظات حالية مسجلة بالمنظومة.
                </div>
              )}
            </div>

          </div>

        </div>
      </section>
    </main>
  );
}