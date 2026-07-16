"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";
import { isOnline, addToOfflineQueue } from "@/lib/offline-sync";
import { Save, Trash2, Edit3, PlusCircle, Calendar } from "lucide-react";

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
    // 🌟 حل المشكلة: إرجاع وسم التوجيه dir="rtl" إلى الـ main الرئيسي لضمان ثبات السايدبار الأيمن بالكامل
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
          
          <div className="border-b border-[#243556] pb-5 select-none">
            <h1 className="text-4xl md:text-5xl font-extrabold text-[#D4AF37] tracking-wide">الملاحظات والمهام السريعة</h1>
            <p className="text-gray-300 text-base mt-2 font-bold">دوّن مهامك اليومية والملاحظات الفنية للمواقع حياً مع ميزتي التعديل والحذف والعمل دون اتصال.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="bg-[#07132a] border border-[#243556] rounded-2xl p-6 space-y-4 h-fit shadow-xl">
              {editingId ? (
                <>
                  <h3 className="text-[#D4AF37] font-black text-lg border-b border-[#1f2d4d] pb-2 select-none">📝 تعديل وتحرير الملاحظة</h3>
                  <div className="space-y-4 text-sm md:text-base font-bold">
                    <input
                      type="text"
                      placeholder="تعديل العنوان..."
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full h-12 bg-[#020B1C] border border-[#243556] text-white p-3 rounded-lg text-sm outline-none font-bold focus:border-[#D4AF37]"
                    />
                    <textarea
                      placeholder="تعديل المحتوى والتفاصيل..."
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={4}
                      className="w-full bg-[#020B1C] border border-[#243556] text-white p-3 rounded-lg text-sm outline-none font-bold resize-none focus:border-[#D4AF37]"
                    />
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full h-12 bg-[#020B1C] border border-[#243556] text-[#D4AF37] p-3 rounded-lg text-sm outline-none font-mono font-bold focus:border-[#D4AF37]"
                    />
                    <div className="flex gap-2.5 select-none">
                      <button
                        onClick={handleUpdateNote}
                        className="flex-1 bg-gradient-to-r from-[#10B981] to-[#34D399] hover:opacity-90 text-[#020B1C] font-black py-3.5 px-5 rounded-full text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-300 shadow-md"
                      >
                        <span>حفظ التعديل</span>
                        <Save className="w-4 h-4 text-[#020B1C]" />
                      </button>
                      
                      <button
                        onClick={() => setEditingId(null)}
                        className="bg-transparent border-2 border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white font-black py-3.5 px-6 rounded-full text-sm cursor-pointer transition-all duration-300"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-[#D4AF37] font-black text-lg border-b border-[#1f2d4d] pb-2 select-none">➕ إضافة مهمة جديدة</h3>
                  <div className="space-y-4 text-sm md:text-base font-bold">
                    <input
                      type="text"
                      placeholder="عنوان المهمة..."
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full h-12 bg-[#020B1C] border border-[#243556] text-white p-3 rounded-lg text-sm outline-none focus:border-[#D4AF37] font-bold"
                    />
                    <textarea
                      placeholder="محتوى الملاحظة والتفاصيل..."
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      rows={4}
                      className="w-full bg-[#020B1C] border border-[#243556] text-white p-3 rounded-lg text-sm outline-none focus:border-[#D4AF37] font-bold resize-none"
                    />
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full h-12 bg-[#020B1C] border border-[#243556] text-white p-3 rounded-lg text-sm outline-none focus:border-[#D4AF37] font-mono font-bold"
                    />
                    <button
                      onClick={handleAddNote}
                      className="w-full royal-gradient-btn text-[#020B1C] font-black py-4 px-6 rounded-full text-base flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 shadow-md"
                    >
                      <span>حفظ الملاحظة</span>
                      <PlusCircle className="w-5 h-5 text-[#020B1C]" />
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
                      <div 
                        key={n.id} 
                        className={`bg-[#07132a] border rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 shadow-lg ${
                          editingId === n.id ? "border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.25)]" : "border-[#1f2d4d] hover:border-[#D4AF37]/30"
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-start gap-4 select-none">
                            <h4 className="text-[#D4AF37] font-black text-lg truncate max-w-[200px]">{n.title}</h4>
                            {n.is_offline && (
                              <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-bold whitespace-nowrap">غير متزامن</span>
                            )}
                          </div>
                          <p className="text-[#F0E6D2] text-sm leading-relaxed whitespace-pre-wrap font-bold">{n.content}</p>
                        </div>

                        <div className="mt-5 pt-3 border-t border-[#1f2d4d]/60 flex justify-between items-center select-none">
                          {n.due_date ? (
                            <span className={`text-xs font-bold flex items-center gap-1 ${isOverdue ? "text-rose-400" : "text-gray-400"}`}>
                              <Calendar className="w-3.5 h-3.5" />
                              {n.due_date}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">بدون تاريخ استحقاق</span>
                          )}

                          <div className="flex gap-4">
                            <button
                              onClick={() => startEditing(n)}
                              className="text-[#D4AF37] hover:underline font-black text-sm flex items-center gap-1 cursor-pointer transition select-none"
                              title="تعديل الملاحظة"
                            >
                              <Edit3 className="w-4 h-4" />
                              <span>تعديل</span>
                            </button>
                            <button
                              onClick={() => handleDeleteNote(n.id)}
                              className="text-rose-500 hover:text-rose-400 font-bold text-sm flex items-center gap-1 cursor-pointer transition select-none"
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
                <div className="p-12 text-center text-gray-500 text-sm font-black bg-[#07132a] border-2 border-dashed border-[#1f2d4d] rounded-2xl select-none">
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