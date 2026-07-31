"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, ArrowRight, Camera, Star, Trash2 } from "lucide-react";

export default function ProjectGalleryPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");

  const [photoType, setPhotoType] = useState<"before" | "after">("before");
  const [roomLocation, setRoomLocation] = useState("");
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    const [projRes, photosRes] = await Promise.all([
      supabase.from("projects").select("project_name, project_code").eq("id", projectId).single(),
      supabase.from("project_gallery_photos").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    ]);
    setProject(projRes.data);
    setPhotos(photosRes.data || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { if (projectId) loadAll(); }, [projectId, loadAll]);

  async function handleUpload() {
    if (files.length === 0) {
      alert("اختار صورة واحدة على الأقل.");
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      for (const file of files) {
        const fileName = `${projectId}/gallery-${Date.now()}-${file.name}`;
        const { error: uploadErr } = await supabase.storage.from("project-photos").upload(fileName, file);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("project-photos").getPublicUrl(fileName);

        await supabase.from("project_gallery_photos").insert({
          project_id: projectId,
          photo_url: urlData.publicUrl,
          photo_type: photoType,
          room_location: roomLocation || null,
          caption: caption || null,
          uploaded_by: user?.id || null,
        });
      }
      setRoomLocation("");
      setCaption("");
      setFiles([]);
      loadAll();
    } catch (err: any) {
      alert("حصل خطأ أثناء الرفع: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function toggleFeatured(photo: any) {
    await supabase.from("project_gallery_photos").update({ is_featured: !photo.is_featured }).eq("id", photo.id);
    loadAll();
  }

  async function deletePhoto(photo: any) {
    if (!confirm("تأكيد حذف الصورة؟")) return;
    await supabase.from("project_gallery_photos").delete().eq("id", photo.id);
    loadAll();
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#020B1C]"><Loader2 className="animate-spin text-[#D4AF37] w-8 h-8" /></div>;
  }

  const beforePhotos = photos.filter((p) => p.photo_type === "before");
  const afterPhotos = photos.filter((p) => p.photo_type === "after");

  return (
    <div className="min-h-screen bg-[#020B1C] text-white p-6 md:p-10" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-[#D4AF37] text-sm mb-6 hover:opacity-80">
          <ArrowRight size={16} /> رجوع
        </button>

        <h1 className="text-2xl font-bold mb-8">معرض قبل / بعد — {project?.project_name}</h1>

        <div className="rounded-2xl border border-[#243556] bg-[#0A1730] p-6 mb-10 space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <select value={photoType} onChange={(e) => setPhotoType(e.target.value as "before" | "after")} className="h-10 rounded-xl bg-[#020B1C] border border-[#243556] px-3 text-sm">
              <option value="before">📷 قبل التنفيذ</option>
              <option value="after">✨ بعد التنفيذ</option>
            </select>
            <input value={roomLocation} onChange={(e) => setRoomLocation(e.target.value)} placeholder="المكان (مثال: المطبخ)" className="h-10 rounded-xl bg-[#020B1C] border border-[#243556] px-3 text-sm" />
            <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="وصف مختصر (اختياري)" className="h-10 rounded-xl bg-[#020B1C] border border-[#243556] px-3 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm text-[#8AA1C9] cursor-pointer w-fit px-4 py-2 rounded-xl border border-dashed border-[#243556] hover:border-[#D4AF37]">
            <Camera size={16} /> اختيار صور ({files.length})
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
          </label>
          <button onClick={handleUpload} disabled={uploading} className="px-5 py-2 rounded-xl bg-[#D4AF37] text-[#020B1C] font-bold text-sm disabled:opacity-50">
            {uploading ? <Loader2 className="animate-spin w-4 h-4" /> : "رفع الصور"}
          </button>
        </div>

        {["before", "after"].map((type) => {
          const list = type === "before" ? beforePhotos : afterPhotos;
          return (
            <div key={type} className="mb-10">
              <h2 className="text-lg font-bold mb-4 text-[#D4AF37]">{type === "before" ? "📷 قبل التنفيذ" : "✨ بعد التنفيذ"} ({list.length})</h2>
              {list.length === 0 ? (
                <p className="text-[#8AA1C9] text-sm">مفيش صور مضافة لسه.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {list.map((p) => (
                    <div key={p.id} className="relative group rounded-xl overflow-hidden border border-[#243556]">
                      <img src={p.photo_url} alt={p.caption || ""} className="w-full h-36 object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        {p.room_location && <span className="text-xs text-white">{p.room_location}</span>}
                        <div className="flex gap-2">
                          <button onClick={() => toggleFeatured(p)} className={`p-1.5 rounded-lg ${p.is_featured ? "bg-amber-500 text-[#020B1C]" : "bg-white/10 text-white"}`}>
                            <Star size={14} fill={p.is_featured ? "currentColor" : "none"} />
                          </button>
                          <button onClick={() => deletePhoto(p)} className="p-1.5 rounded-lg bg-red-500/20 text-red-400">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {p.is_featured && <span className="absolute top-1.5 right-1.5 text-amber-400"><Star size={14} fill="currentColor" /></span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
