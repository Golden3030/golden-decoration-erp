"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, ArrowRight, Camera, Plus, CheckCircle2, ShieldCheck, X } from "lucide-react";

const severityConfig: { [key: string]: { label: string; color: string } } = {
  minor: { label: "بسيطة", color: "bg-slate-500/10 text-slate-300 border-slate-500/30" },
  major: { label: "متوسطة", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  critical: { label: "حرجة", color: "bg-red-500/10 text-red-400 border-red-500/30" },
};

const statusConfig: { [key: string]: { label: string; color: string } } = {
  open: { label: "مفتوحة", color: "bg-red-500/10 text-red-400 border-red-500/30" },
  in_progress: { label: "جاري الإصلاح", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  fixed: { label: "تم الإصلاح", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  verified: { label: "معتمدة ✅", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
};

export default function SnagListPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [snags, setSnags] = useState<any[]>([]);
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [roomLocation, setRoomLocation] = useState("");
  const [severity, setSeverity] = useState("minor");
  const [assignedTo, setAssignedTo] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    const [projRes, snagsRes, subsRes] = await Promise.all([
      supabase.from("projects").select("project_name, project_code").eq("id", projectId).single(),
      supabase.from("snag_items").select("*, subcontractors(name)").eq("project_id", projectId).order("created_at", { ascending: false }),
      supabase.from("subcontractors").select("id, name"),
    ]);
    setProject(projRes.data);
    setSnags(snagsRes.data || []);
    setSubcontractors(subsRes.data || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { if (projectId) loadAll(); }, [projectId, loadAll]);

  async function handleCreateSnag() {
    if (!title.trim()) {
      alert("لازم تكتب وصف الملاحظة.");
      return;
    }
    setUploading(true);
    try {
      const photoUrls: string[] = [];
      for (const file of files) {
        const fileName = `${projectId}/${Date.now()}-${file.name}`;
        const { error: uploadErr } = await supabase.storage.from("project-photos").upload(fileName, file);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("project-photos").getPublicUrl(fileName);
        photoUrls.push(urlData.publicUrl);
      }

      await supabase.from("snag_items").insert({
        project_id: projectId,
        title,
        room_location: roomLocation || null,
        severity,
        status: "open",
        photo_urls: photoUrls,
        reported_by: currentUserId || null,
        assigned_to: assignedTo || null,
      });

      setTitle("");
      setRoomLocation("");
      setSeverity("minor");
      setAssignedTo("");
      setFiles([]);
      setShowForm(false);
      loadAll();
    } catch (err: any) {
      alert("حصل خطأ أثناء الحفظ: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function updateStatus(snag: any, newStatus: string) {
    const updates: any = { status: newStatus };
    if (newStatus === "fixed") updates.fixed_at = new Date().toISOString();
    if (newStatus === "verified") {
      updates.verified_at = new Date().toISOString();
      updates.verified_by = currentUserId || null;
    }
    await supabase.from("snag_items").update(updates).eq("id", snag.id);
    loadAll();
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#020B1C]"><Loader2 className="animate-spin text-[#D4AF37] w-8 h-8" /></div>;
  }

  const openCount = snags.filter((s) => s.status === "open" || s.status === "in_progress").length;

  return (
    <div className="min-h-screen bg-[#020B1C] text-white p-6 md:p-10" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-[#D4AF37] text-sm mb-6 hover:opacity-80">
          <ArrowRight size={16} /> رجوع
        </button>

        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">قوائم ملاحظات الجودة — {project?.project_name}</h1>
          <button onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border border-[#D4AF37] text-sm">
            <Plus size={16} /> ملاحظة جديدة
          </button>
        </div>
        <p className="text-[#8AA1C9] text-sm mb-8">{openCount > 0 ? `⚠️ ${openCount} ملاحظة مفتوحة محتاجة متابعة` : "✅ مفيش ملاحظات مفتوحة حالياً"}</p>

        {showForm && (
          <div className="rounded-2xl border border-[#243556] bg-[#0A1730] p-6 mb-8 space-y-4">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="وصف الملاحظة (مثال: خدوش فى دهان الحائط الشمالي)" className="w-full h-11 rounded-xl bg-[#020B1C] border border-[#243556] px-3 text-sm" />
            <div className="grid md:grid-cols-3 gap-3">
              <input value={roomLocation} onChange={(e) => setRoomLocation(e.target.value)} placeholder="المكان (مثال: الصالة)" className="h-10 rounded-xl bg-[#020B1C] border border-[#243556] px-3 text-sm" />
              <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="h-10 rounded-xl bg-[#020B1C] border border-[#243556] px-3 text-sm">
                <option value="minor">بسيطة</option>
                <option value="major">متوسطة</option>
                <option value="critical">حرجة</option>
              </select>
              <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="h-10 rounded-xl bg-[#020B1C] border border-[#243556] px-3 text-sm">
                <option value="">تكليف مقاول (اختياري)</option>
                {subcontractors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-[#8AA1C9] cursor-pointer w-fit px-4 py-2 rounded-xl border border-dashed border-[#243556] hover:border-[#D4AF37]">
                <Camera size={16} /> إرفاق صور ({files.length})
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
              </label>
            </div>
            <button onClick={handleCreateSnag} disabled={uploading} className="px-5 py-2 rounded-xl bg-[#D4AF37] text-[#020B1C] font-bold text-sm disabled:opacity-50">
              {uploading ? <Loader2 className="animate-spin w-4 h-4" /> : "حفظ الملاحظة"}
            </button>
          </div>
        )}

        <div className="space-y-4">
          {snags.map((snag) => {
            const sev = severityConfig[snag.severity] || severityConfig.minor;
            const st = statusConfig[snag.status] || statusConfig.open;
            return (
              <div key={snag.id} className="rounded-xl border border-[#243556] bg-[#0A1730] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h3 className="font-bold text-[#F0E6D2]">{snag.title}</h3>
                  <div className="flex gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full border ${sev.color}`}>{sev.label}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full border ${st.color}`}>{st.label}</span>
                  </div>
                </div>
                <p className="text-xs text-[#8AA1C9] mb-3">
                  {snag.room_location && `📍 ${snag.room_location} · `}
                  {snag.subcontractors?.name && `👷 مكلّف: ${snag.subcontractors.name}`}
                </p>

                {snag.photo_urls?.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-3">
                    {snag.photo_urls.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="صورة الملاحظة" className="w-20 h-20 object-cover rounded-lg border border-[#243556]" />
                      </a>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {snag.status !== "fixed" && snag.status !== "verified" && (
                    <button onClick={() => updateStatus(snag, "fixed")} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20">
                      <CheckCircle2 size={14} /> تم الإصلاح
                    </button>
                  )}
                  {snag.status === "fixed" && (
                    <button onClick={() => updateStatus(snag, "verified")} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20">
                      <ShieldCheck size={14} /> اعتماد الإصلاح
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {snags.length === 0 && <p className="text-center text-[#8AA1C9] py-10">مفيش أي ملاحظات مسجلة على المشروع ده لحد دلوقتي.</p>}
        </div>
      </div>
    </div>
  );
}
