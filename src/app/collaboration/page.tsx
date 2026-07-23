"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  Trash2,
  Edit2,
  Eraser,
  ImageIcon
} from "lucide-react";

interface StaffMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  attachment_url: string;
  attachment_name: string;
  created_at: string;
  is_read: boolean;
  sender?: { name: string; role: string };
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

export default function CollaborationPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  
  const [chatType, setChatType] = useState<"group" | "private">("group");
  const [selectedUserId, setSelectedUserId] = useState(""); 

  const [newMessage, setNewMessage] = useState("");
  const [fileBase64, setFileBase64] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [groupUnreadCount, setGroupUnreadCount] = useState(0);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    document.title = "Golden Decoration ERP - مركز التعاون والاتصال";
    initCollaboration();
  }, []);

  async function initCollaboration() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data: usersData } = await supabase
        .from("users")
        .select("id, name, role")
        .order("name", { ascending: true });

      setUsers(usersData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const loadGroupUnreadCount = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const lastReadGroup = localStorage.getItem(`last_read_group_${currentUserId}`) || new Date(0).toISOString();
      const { data, error } = await supabase
        .from("staff_messages")
        .select("id")
        .is("recipient_id", null)
        .neq("sender_id", currentUserId)
        .gt("created_at", lastReadGroup);

      if (!error && data) {
        setGroupUnreadCount(data.length);
      }
    } catch (e) {
      console.error("Error loading group unread count:", e);
    }
  }, [currentUserId]);

  const loadUnreadCounts = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const { data, error } = await supabase
        .from("staff_messages")
        .select("sender_id")
        .eq("recipient_id", currentUserId)
        .eq("is_read", false);

      if (!error && data) {
        const counts: Record<string, number> = {};
        data.forEach((msg: any) => {
          counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
        });
        setUnreadCounts(counts);
      }
    } catch (e) {
      console.error("Error loading unread counts:", e);
    }
  }, [currentUserId]);

  const loadMessages = useCallback(async () => {
    if (!currentUserId) return;
    try {
      let query = supabase
        .from("staff_messages")
        .select(`
          *,
          sender:users!staff_messages_sender_id_fkey(name, role)
        `)
        .order("created_at", { ascending: true });

      if (chatType === "private" && selectedUserId) {
        query = query
          .in("sender_id", [currentUserId, selectedUserId])
          .in("recipient_id", [currentUserId, selectedUserId]);
      } else {
        query = query.is("recipient_id", null);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error("[PostgREST Chat Error] Detailed:", error);
      } else {
        setMessages(data || []);
      }
    } catch (e) {
      console.error("Error loading chat messages:", e);
    }
  }, [chatType, selectedUserId, currentUserId]);

  const markMessagesAsRead = useCallback(async (senderId: string) => {
    if (!currentUserId || !senderId) return;
    try {
      const { error } = await supabase
        .from("staff_messages")
        .update({ is_read: true })
        .eq("sender_id", senderId)
        .eq("recipient_id", currentUserId)
        .eq("is_read", false);

      if (!error) {
        setUnreadCounts(prev => {
          const updated = { ...prev };
          delete updated[senderId];
          return updated;
        });
      }
    } catch (e) {
      console.error("Error marking messages as read:", e);
    }
  }, [currentUserId]);

  const handleTriggerEdit = (msg: StaffMessage) => {
    setEditingMessageId(msg.id);
    setNewMessage(msg.message.replace(" (معدلة)", ""));
  };

  useEffect(() => {
    loadMessages();
    loadUnreadCounts();
    loadGroupUnreadCount();

    if (chatType === "group" && currentUserId) {
      localStorage.setItem(`last_read_group_${currentUserId}`, new Date().toISOString());
      setGroupUnreadCount(0);
    }

    if (chatType === "private" && selectedUserId) {
      markMessagesAsRead(selectedUserId);
    }
  }, [chatType, selectedUserId, currentUserId, loadMessages, loadUnreadCounts, loadGroupUnreadCount, markMessagesAsRead]);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel("staff_messages_realtime_global")
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "staff_messages" 
        },
        () => {
          loadMessages();
          loadUnreadCounts();
          loadGroupUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, loadMessages, loadUnreadCounts, loadGroupUnreadCount]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function handleFileChange(e: any) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("تنبيه: حجم الملف يتجاوز 2 ميجا بايت لتوفير باقات الموبايل.");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleSendMessage() {
    if (!newMessage.trim() && !fileBase64) return;

    setSending(true);
    const payload = {
      sender_id: currentUserId,
      recipient_id: chatType === "private" ? selectedUserId : null,
      message: newMessage,
      attachment_url: fileBase64 || null,
      attachment_name: fileName || null,
      is_read: false
    };

    try {
      if (isOnline()) {
        if (editingMessageId) {
          const { error } = await supabase
            .from("staff_messages")
            .update({ message: `${newMessage} (معدلة)` })
            .eq("id", editingMessageId);

          if (error) throw error;
          setEditingMessageId(null);
        } else {
          const { error } = await supabase
            .from("staff_messages")
            .insert([payload]);

          if (error) throw error;
        }

        await loadMessages();
      } else {
        alert("⚠️ تعذر الإرسال أو التعديل لعدم توفر اتصال بالإنترنت حالياً.");
      }

      setNewMessage("");
      setFileBase64("");
      setFileName("");
    } catch (err: any) {
      alert("خطأ أثناء الإرسال: " + err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleClearChat() {
    const confirmClear = window.confirm(
      chatType === "group" 
        ? "🚨 هل أنت متأكد من تنظيف كافة رسائل الجروب العام؟ (هذا الإجراء متاح لمدير النظام فقط)" 
        : "هل أنت متأكد من مسح وتنظيف محادثتك الخاصة بالكامل؟"
    );
    if (!confirmClear) return;

    try {
      if (chatType === "group") {
        const currentUserRole = users.find(u => u.id === currentUserId)?.role;
        if (currentUserRole !== "admin") {
          alert("عذراً، تنظيف الجروب العام متاح فقط لمدير النظام 👑.");
          return;
        }
        
        const { error } = await supabase
          .from("staff_messages")
          .delete()
          .is("recipient_id", null);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("staff_messages")
          .delete()
          .in("sender_id", [currentUserId, selectedUserId])
          .in("recipient_id", [currentUserId, selectedUserId]);

        if (error) throw error;
      }

      setMessages([]);
      alert("🧹 تم تنظيف وتطهير المحادثة بنجاح!");
    } catch (err: any) {
      alert("حدث خطأ أثناء تنظيف المحادثة: " + err.message);
    }
  }

  const totalPrivateUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  return (
    <main className="min-h-screen bg-[#020B1C] relative overflow-hidden font-alexandria" dir="rtl">
      <Sidebar />
      
      {/* 🛠️ ورقة التنسيق الموحدة للدفتر العام - محصورة لحماية السايدبار والهيدر */}
      <style dangerouslySetInnerHTML={{ __html: `
        ::-webkit-scrollbar { width: 4px !important; height: 6px !important; }
        ::-webkit-scrollbar-track { background: #020B1C !important; }
        ::-webkit-scrollbar-thumb { background: #D4AF37 !important; border-radius: 9999px !important; }
        ::-webkit-scrollbar-thumb:hover { background: #AA7C11 !important; }

        ::-webkit-scrollbar-horizontal,
        .overflow-x-auto::-webkit-scrollbar { display: none !important; height: 0px !important; }
        .overflow-x-auto { scrollbar-width: none !important; -ms-overflow-style: none !important; overflow-x: auto !important; }

        .overflow-y-auto { 
          -ms-overflow-style: auto !important; 
          overflow-y: auto !important; 
        }
      `}} />

      {/* تفعيل جدار الحماية وعزل الإزاحة الجانبية الميدانية */}
      <section className="w-full lg:pr-56 m-0 min-h-screen flex flex-col z-10 relative">
        <Header />
        
        <div className="p-4 md:p-8 space-y-6 text-right flex-1 flex flex-col justify-between animate-fade-in">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#D4AF37]/20 pb-5 select-none">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[#D4AF37] flex items-center gap-2">
                <span>التعاون والتواصل الداخلي</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-pulse" />
              </h1>
              <p className="text-white text-xs mt-2">جروب عام مشترك للفريق للتقارير والوسائط، أو مراسلات سرية مباشرة لسلامة التنسيق.</p>
            </div>

            {/* الأزرار التناوبية للتبديل بتصميم الكبسولة المذهبة الميتاليكية الفخمة */}
            <div className="bg-[#07132a] border border-[#D4AF37]/35 p-1.5 rounded-2xl flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setChatType("group");
                  setSelectedUserId("");
                }}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all duration-300 cursor-pointer flex items-center gap-2 relative ${
                  chatType === "group" 
                    ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.35)] scale-[1.02]" 
                    : "bg-transparent border border-transparent text-[#F0E6D2] hover:border-[#D4AF37]/20"
                }`}
              >
                <span>👥 مجموعة عمل الفريق</span>
                {groupUnreadCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-black font-black text-[10px] flex items-center justify-center animate-bounce shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                    {groupUnreadCount}
                  </span>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => setChatType("private")}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all duration-300 cursor-pointer flex items-center gap-2 relative ${
                  chatType === "private" 
                    ? "bg-black border border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.35)] scale-[1.02]" 
                    : "bg-transparent border border-transparent text-[#F0E6D2] hover:border-[#D4AF37]/20"
                }`}
              >
                <span>💬 رسالة خاصة</span>
                {totalPrivateUnread > 0 && (
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-black font-black text-[10px] flex items-center justify-center animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                    {totalPrivateUnread}
                  </span>
                )}
              </button>
            </div>
          </div>

          {chatType === "group" ? (
            /* وضع مجموعة عمل الفريق مدمج بإطار شفاف رقيق وموحد */
            <div className="bg-[#07132a] border-2 border-[#D4AF37] rounded-[2rem] flex flex-col h-[600px] overflow-hidden shadow-2xl animate-fade-in relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
              
              <div className="p-4 bg-[#D4AF37]/20 border-b border-[#D4AF37] select-none flex justify-between items-center z-10">
                <span className="text-[#D4AF37] font-bold text-xs md:text-sm">📢 قناة الدردشة العامة لشركة جولدن ديكوريشن</span>
                
                {/* تنظيف الجروب العام لمدير النظام فقط */}
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-500/60 text-rose-400 hover:bg-red-500 hover:text-[#020B1C] text-xs font-bold transition-all duration-300 cursor-pointer"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>تنظيف الجروب العام</span>
                </button>
              </div>

              {/* حاوية الشات */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#020B1C]/35 ai-chat-scroll z-10">
                {messages.length > 0 ? (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === currentUserId;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? "justify-start" : "justify-end"} animate-fade-in`}>
                        <div className={`p-4 rounded-2xl max-w-md space-y-1.5 shadow-md relative group ${
                          isMe 
                            ? "bg-gradient-to-r from-[#C9A45D] to-[#F0E6D2] text-[#020B1C] font-semibold rounded-tr-none border border-[#D4AF37]/20" 
                            : "bg-[#0b1b3d] border border-[#1f2d4d] text-[#F0E6D2] rounded-tl-none"
                        }`}>
                          
                          {isMe && (
                            <button
                              type="button"
                              onClick={() => handleTriggerEdit(msg)}
                              className="absolute left-2.5 top-2.5 opacity-80 hover:opacity-100 hover:scale-110 text-[#020B1C] bg-[#020B1C]/10 hover:bg-[#020B1C]/25 p-1.5 rounded-full transition-all z-10 cursor-pointer"
                              title="تعديل الرسالة"
                            >
                              <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                          )}

                          {/* 🏷️ ترقية خط أسماء الموظفين مع إبراز الأقسام */}
                          <span className={`text-[10px] font-black block border-b pb-0.5 mb-1 opacity-80 ${isMe ? "border-black/10 text-black" : "border-white/10 text-[#D4AF37]"}`}>
                            👤 {isMe ? "أنت" : `${msg.sender?.name || "عضو بالفريق"} - ${msg.sender?.role ? (roleLabels[msg.sender.role] || msg.sender.role) : "عضو بالفريق"}`}
                          </span>
                          
                          <p className="text-xs md:text-sm font-bold leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                          
                          {msg.attachment_url && (
                            <div className="mt-2 pt-2 border-t border-white/10 text-[10px] space-y-2">
                              {msg.attachment_name?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) && (
                                <img 
                                  src={msg.attachment_url} 
                                  alt="Attached Media" 
                                  onClick={() => setLightboxImage(msg.attachment_url)}
                                  className="max-h-48 rounded-lg border border-white/10 shadow cursor-zoom-in hover:opacity-90 transition" 
                                />
                              )}
                              <div className="flex items-center gap-1">
                                📎 <a href={msg.attachment_url} download={msg.attachment_name} className="underline font-bold cursor-pointer hover:text-[#D4AF37] transition">تحميل المرفق: {msg.attachment_name}</a>
                              </div>
                            </div>
                          )}
                          <span className="text-[9px] block text-left opacity-70 font-mono font-bold mt-1">
                            {new Date(msg.created_at).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-20 text-gray-500 text-xs select-none font-bold">لا توجد رسائل مسجلة بهذه القناة العامة بعد. ابدأ المحادثة وأرسل المرفق الأول الآن!</div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* شريط الإرسال الذكي */}
              <div className="p-4 border-t border-[#1f2d4d] bg-[#07132a] flex items-center gap-3 select-none z-10">
                <input
                  type="text"
                  placeholder={editingMessageId ? "تعديل رسالتك المكتوبة حالياً..." : "اكتب رسالة جماعية للفريق..."}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1 h-11 bg-[#020B1C] border border-[#243556] text-[#F0E6D2] p-3 rounded-xl text-xs outline-none focus:border-[#D4AF37] font-semibold"
                />
                 {/* 🌟 تحديث وإعادة هيكلة زرار الإرسال للدستور البصري الحركي الموحد */}
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={sending}
                  className="px-6 h-11 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.03] active:scale-95 transition-all duration-300 cursor-pointer text-xs font-bold flex items-center justify-center gap-1.5 select-none relative overflow-hidden disabled:opacity-50"
                >
                  {sending ? "جاري الإرسال..." : editingMessageId ? "تعديل الرسالة ✏️" : "إرسال 🚀"}
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
                </button>

                {editingMessageId && (
                  <button 
                    type="button"
                    onClick={() => { setEditingMessageId(null); setNewMessage(""); }}
                    className="text-xs text-rose-400 hover:underline px-2"
                  >
                    إلغاء التعديل
                  </button>
                )}

                <label className="bg-[#1f2d4d] hover:bg-[#243556] text-[#D4AF37] px-4 py-3 h-11 flex items-center rounded-xl text-xs md:text-sm cursor-pointer font-black transition whitespace-nowrap select-none border border-[#D4AF37]/20">
                  📁 {fileName ? "تغيير المرفق" : " "}
                  <input type="file" onChange={handleFileChange} className="hidden" />
                </label>

               
              </div>
            </div>
          ) : (
            /* وضع الرسائل الخاصة مدمج بالإطارات الشفافة الرقيقة */
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-1 h-[600px] animate-fade-in relative">
              
              {/* القائمة اليمنى للموظفين */}
              <div className="bg-[#07132a] border-2 border-[#D4AF37] rounded-[2rem] p-4 overflow-y-auto space-y-2 select-none ai-chat-scroll shadow-2xl relative">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-full blur-xl pointer-events-none" />
                <h3 className="text-[#D4AF37] font-bold text-xs md:text-sm border-b border-[#D4AF37] pb-2 mb-3">👥  موظفين الشركة</h3>
                {loading ? (
                  <div className="text-center text-gray-500 text-xs py-10 animate-pulse">جاري جلب الموظفين...</div>
                ) : (
                  users.filter(u => u.id !== currentUserId).map((user) => {
                    const unreadCount = unreadCounts[user.id] || 0;
                    return (
                      <div
                        key={user.id}
                        onClick={() => setSelectedUserId(user.id)}
                        className={`p-3 rounded-xl cursor-pointer transition text-xs flex justify-between items-center border ${
                          selectedUserId === user.id 
                            ? "bg-gradient-to-r from-[#C9A45D] via-[#F0E6D2] to-[#D4AF37] text-black font-black shadow-lg shadow-[#D4AF37]/15 border-[#D4AF37]" 
                            : "bg-[#020B1C] text-white hover:bg-[#0B1B38] border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-black font-black text-[10px] flex items-center justify-center animate-bounce shadow-[0_0_12px_rgba(16,185,129,0.5)]">
                              {unreadCount}
                            </span>
                          )}
                          <span className="font-bold text-xs">{user.name}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${selectedUserId === user.id ? "bg-black/10 text-black" : "bg-[#D4AF37]/10 text-[#D4AF37]"}`}>
                          {roleLabels[user.role] || user.role}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* صندوق عرض الرسائل الخاصة مدمج بالإطارات الشفافة */}
              <div className="lg:col-span-3 bg-[#07132a] border-2 border-[#D4AF37] rounded-[2rem] flex flex-col overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
                {selectedUserId ? (
                  <>
                    <div className="p-4 bg-[#D4AF37]/20 border-b border-[#D4AF37]/20 select-none flex justify-between items-center z-10">
                      <span className="text-[#D4AF37] font-bold text-xs md:text-sm">💬 محادثة خاصة متبادلة</span>
                      
                      <button
                        type="button"
                        onClick={handleClearChat}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-500/60 text-rose-400 hover:bg-red-500 hover:text-[#020B1C] text-xs font-bold transition-all duration-300 cursor-pointer"
                      >
                        <Eraser className="w-3.5 h-3.5" />
                        <span>مسح المحادثة الخاصة</span>
                      </button>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#020B1C]/35 ai-chat-scroll z-10">
                      {messages.map((log) => {
                        const isMe = log.sender_id === currentUserId;
                        return (
                          <div key={log.id} className={`flex ${isMe ? "justify-start" : "justify-end"} animate-fade-in`}>
                            <div className={`p-4 rounded-2xl max-w-md space-y-1.5 relative group ${
                              isMe 
                                ? "bg-gradient-to-r from-[#C9A45D] to-[#F0E6D2] text-black font-semibold rounded-tr-none border border-[#D4AF37]/20 shadow-md" 
                                : "bg-[#0b1b3d] border border-[#1f2d4d] text-[#F0E6D2] rounded-tl-none shadow-md"
                            }`}>
                              
                              {isMe && (
                                <button
                                  type="button"
                                  onClick={() => handleTriggerEdit(log)}
                                  className="absolute left-0.5 top-0.5 opacity-80 hover:opacity-100 hover:scale-110 text-[#020B1C] bg-[#020B1C]/10 hover:bg-[#020B1C]/25 p-1.5 rounded-full transition-all z-10"
                                  title="تعديل الرسالة"
                                >
                                  <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>
                              )}

                              <p className="text-xs md:text-sm font-bold leading-relaxed whitespace-pre-wrap">{log.message}</p>
                              
                              {log.attachment_url && (
                                <div className="mt-2 pt-2 border-t border-white/10 text-[10px] space-y-2">
                                  {log.attachment_name?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) && (
                                    <img 
                                      src={log.attachment_url} 
                                      alt="Attached Media" 
                                      onClick={() => setLightboxImage(log.attachment_url)}
                                      className="max-h-48 rounded-lg border border-white/10 shadow cursor-zoom-in hover:opacity-90 transition" 
                                    />
                                  )}
                                  <div className="flex items-center gap-1">
                                    📎 <a href={log.attachment_url} download={log.attachment_name} className="underline font-bold cursor-pointer hover:text-[#D4AF37] transition">تحميل المرفق: {log.attachment_name}</a>
                                  </div>
                                </div>
                              )}
                              <span className="text-[9px] block text-left opacity-70 font-mono font-bold mt-1">
                                {new Date(log.created_at).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* شريط الإرسال الخاص */}
                    <div className="p-4 border-t border-[#1f2d4d] bg-[#07132a] flex items-center gap-3 z-10">
                      <input
                        type="text"
                        placeholder={editingMessageId ? "تعديل رسالتك المكتوبة حالياً..." : "اكتب رسالة خاصة للموظف..."}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                        className="flex-1 h-11 bg-[#020B1C] border border-[#243556] text-[#F0E6D2] p-3 rounded-xl text-xs outline-none focus:border-[#D4AF37] font-semibold"
                      />
                      {/* 🌟 تم هنا تصحيح الخطأ الإملائي بحقن دالة handleFileChange بدلاً من المفقودة لتفادي انهيار بناء المنظومة كلياً */}
                      <button
                        type="button"
                        onClick={handleSendMessage}
                        disabled={sending}
                        className="px-6 h-11 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.03] active:scale-95 transition-all duration-300 cursor-pointer text-xs font-black flex items-center justify-center gap-1.5 select-none relative overflow-hidden disabled:opacity-50"
                      >
                        {sending ? "جاري الإرسال..." : editingMessageId ? "تعديل الرسالة ✏️" : "إرسال 🚀"}
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
                      </button>

                      {editingMessageId && (
                        <button 
                          type="button"
                          onClick={() => { setEditingMessageId(null); setNewMessage(""); }}
                          className="text-xs text-rose-400 hover:underline px-2 cursor-pointer font-bold"
                        >
                          إلغاء التعديل
                        </button>
                      )}
                      
                      <label className="bg-[#1f2d4d] hover:bg-[#243556] text-[#F0E6D2] px-4 py-3 h-11 flex items-center rounded-xl text-xs md:text-sm cursor-pointer font-black transition whitespace-nowrap select-none border border-[#D4AF37]/20">
                        📁 {fileName ? "تغيير المرفق" : " "}
                        <input type="file" onChange={handleFileChange} className="hidden" />
                      </label>

                      
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col justify-center items-center text-gray-500 text-xs p-6 select-none font-bold text-center gap-2 z-10">
                    <span>💬 الرجاء تحديد أحد الزملاء من القائمة اليمنى للبدء في مراسلته وتداول المستندات الخاصة.</span>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </section>

      {/* النافذة المنبثقة لعرض الصورة الكبيرة */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 cursor-pointer animate-fade-in"
        >
          <button 
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 border border-slate-500 text-[#D4AF37] hover:text-red-400 hover:border-red-500/30 transition-all flex items-center justify-center font-bold text-lg cursor-pointer z-50"
          >
            <X className="w-5 h-5" />
          </button>
          <img 
            src={lightboxImage} 
            alt="Fullscreen Preview" 
            className="max-w-full max-h-[85vh] rounded-2xl border border-[#D4AF37]/20 object-contain shadow-[0_0_50px_rgba(212,175,55,0.25)]" 
          />
        </div>
      )}

    </main>
  );
}