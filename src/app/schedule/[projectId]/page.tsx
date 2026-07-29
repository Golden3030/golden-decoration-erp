"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { generateProjectSchedule } from "@/lib/generateProjectSchedule";
import { Loader2, CalendarDays, CheckCircle2, XCircle, PlayCircle, Send, ArrowRight } from "lucide-react";

interface Phase {
  id: string;
  category_key: string;
  phase_name: string;
  sort_order: number;
  engineer_id: string | null;
  subcontractor_id: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  status: string;
  review_notes: string | null;
}

const statusLabels: { [key: string]: { label: string; color: string } } = {
  not_started: { label: "لم تبدأ", color: "bg-gray-500/10 text-gray-300 border-gray-500/30" },
  in_progress: { label: "جاري التنفيذ", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  submitted_for_review: { label: "في انتظار مراجعة المهندس", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  needs_revision: { label: "يحتاج تعديل", color: "bg-red-500/10 text-red-400 border-red-500/30" },
  approved: { label: "معتمدة ✅", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
};

export default function ProjectSchedulePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [userRole, setUserRole] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [revisionNoteFor, setRevisionNoteFor] = useState<string | null>(null);
  const [revisionNoteText, setRevisionNoteText] = useState("");

  const canReview = ["admin", "manager", "engineer"].includes(userRole);
  const canOperate = ["admin", "manager", "engineer", "procurement"].includes(userRole);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
        if (profile) setUserRole(String(profile.role).toLowerCase());
      }

      const [projRes, phasesRes, usersRes, subsRes] = await Promise.all([
        supabase.from("projects").select("project_name, project_code, area, is_compound").eq("id", projectId).single(),
        supabase.from("project_schedule_phases").select("*").eq("project_id", projectId).order("sort_order", { ascending: true }),
        supabase.from("users").select("id, name, role").in("role", ["engineer", "admin", "manager"]),
        supabase.from("subcontractors").select("id, name, specialty"),
      ]);

      setProject(projRes.data);
      setPhases(phasesRes.data || []);
      setEngineers(usersRes.data || []);
      setSubcontractors(subsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) loadAll();
  }, [projectId, loadAll]);

  async function handleGenerate() {
    setGenerating(true);
    setErrorMsg("");
    try {
      const res = await generateProjectSchedule(projectId);
      if (res.success) await loadAll();
    } catch (err: any) {
      setErrorMsg(err.message || "حصل خطأ أثناء توليد الجدول.");
    } finally {
      setGenerating(false);
    }
  }

  async function assignPeople(phaseId: string, field: "engineer_id" | "subcontractor_id", value: string) {
    await supabase.from("project_schedule_phases").update({ [field]: value || null, updated_at: new Date().toISOString() }).eq("id", phaseId);
    setPhases((prev) => prev.map((p) => (p.id === phaseId ? { ...p, [field]: value || null } : p)));
  }

  async function logAction(phaseId: string, action: string, notes?: string) {
    await supabase.from("schedule_phase_logs").insert({ phase_id: phaseId, action, notes: notes || null, actor_id: currentUserId || null });
  }

  async function startPhase(phase: Phase) {
    await supabase
      .from("project_schedule_phases")
      .update({ status: "in_progress", actual_start_date: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() })
      .eq("id", phase.id);
    await logAction(phase.id, "started");
    loadAll();
  }

  async function submitForReview(phase: Phase) {
    await supabase.from("project_schedule_phases").update({ status: "submitted_for_review", updated_at: new Date().toISOString() }).eq("id", phase.id);
    await logAction(phase.id, "submitted");
    loadAll();
  }

  async function approvePhase(phase: Phase) {
    await supabase
      .from("project_schedule_phases")
      .update({ status: "approved", actual_end_date: new Date().toISOString().slice(0, 10), review_notes: null, updated_at: new Date().toISOString() })
      .eq("id", phase.id);
    await logAction(phase.id, "approved");
    loadAll();
  }

  async function rejectPhase(phase: Phase) {
    if (!revisionNoteText.trim()) return;
    await supabase
      .from("project_schedule_phases")
      .update({ status: "needs_revision", review_notes: revisionNoteText, updated_at: new Date().toISOString() })
      .eq("id", phase.id);
    await logAction(phase.id, "rejected", revisionNoteText);
    setRevisionNoteFor(null);
    setRevisionNoteText("");
    loadAll();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020B1C]">
        <Loader2 className="animate-spin text-[#D4AF37] w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020B1C] text-white p-6 md:p-10" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-[#D4AF37] text-sm mb-6 hover:opacity-80 cursor:pointer">
          <ArrowRight size={16} /> رجوع لتفاصيل المشروع
        </button>

        <div className="flex items-center gap-3 mb-2">
          <CalendarDays className="text-[#D4AF37]" />
          <h1 className="text-2xl font-bold">الجدول الزمني — {project?.project_name || "مشروع"}</h1>
        </div>
        <p className="text-[#8AA1C9] text-sm mb-8">
          {project?.project_code} · المساحة {project?.area} م² {project?.is_compound ? "· داخل كمبوند" : ""}
        </p>

        {phases.length === 0 ? (
          <div className="rounded-2xl border border-[#243556] bg-[#0A1730] p-10 text-center">
            <p className="text-[#8AA1C9] mb-5">لا يوجد جدول زمني لهذا المشروع. هيتولد تلقائياً من بنود المقايسة المعتمدة.</p>
            {errorMsg && <p className="text-red-400 text-sm mb-4">{errorMsg}</p>}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-6 py-3 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border border-[#D4AF37] hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] transition-all disabled:opacity-50 cursor:pointer"
            >
              {generating ? <Loader2 className="animate-spin w-4 h-4 inline" /> : "⚡ توليد الجدول الزمني تلقائياً"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {phases.map((phase) => {
              const st = statusLabels[phase.status] || statusLabels.not_started;
              const suggestedSubs = subcontractors
                .slice()
                .sort((a, b) => (a.specialty === phase.category_key ? -1 : 1) - (b.specialty === phase.category_key ? -1 : 1));

              return (
                <div key={phase.id} className="rounded-xl border border-[#243556] bg-[#0A1730] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <h3 className="font-bold text-[#F0E6D2]">{phase.phase_name}</h3>
                    <span className={`text-xs px-3 py-1 rounded-full border ${st.color}`}>{st.label}</span>
                  </div>

                  <div className="grid md:grid-cols-4 gap-3 text-sm mb-3">
                    <div>
                      <label className="text-[#8AA1C9] text-xs block mb-1">مهندس الموقع المسؤول</label>
                      <select
                        value={phase.engineer_id || ""}
                        onChange={(e) => assignPeople(phase.id, "engineer_id", e.target.value)}
                        disabled={!canOperate}
                        className="w-full h-9 rounded-lg bg-[#020B1C] border border-[#243556] px-2 text-xs"
                      >
                        <option value="">— اختر —</option>
                        {engineers.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[#8AA1C9] text-xs block mb-1">المقاول المنفذ</label>
                      <select
                        value={phase.subcontractor_id || ""}
                        onChange={(e) => assignPeople(phase.id, "subcontractor_id", e.target.value)}
                        disabled={!canOperate}
                        className="w-full h-9 rounded-lg bg-[#020B1C] border border-[#243556] px-2 text-xs"
                      >
                        <option value="">— اختر —</option>
                        {suggestedSubs.map((s) => <option key={s.id} value={s.id}>{s.name}{s.specialty === phase.category_key ? " ⭐" : ""}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[#8AA1C9] text-xs block mb-1">بداية مخططة</label>
                      <p className="h-9 flex items-center px-2 text-xs text-white">{phase.planned_start_date}</p>
                    </div>
                    <div>
                      <label className="text-[#8AA1C9] text-xs block mb-1">نهاية مخططة</label>
                      <p className="h-9 flex items-center px-2 text-xs text-white">{phase.planned_end_date}</p>
                    </div>
                  </div>

                  {phase.review_notes && phase.status === "needs_revision" && (
                    <div className="text-xs text-red-300 bg-red-500/5 border border-red-500/20 rounded-lg p-2 mb-3">
                      ملاحظات المهندس: {phase.review_notes}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {canOperate && (phase.status === "not_started" || phase.status === "needs_revision") && (
                      <button onClick={() => startPhase(phase)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20">
                        <PlayCircle size={14} /> بدء التنفيذ
                      </button>
                    )}
                    {canOperate && phase.status === "in_progress" && (
                      <button onClick={() => submitForReview(phase)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20">
                        <Send size={14} /> إرسال للمراجعة
                      </button>
                    )}
                    {canReview && phase.status === "submitted_for_review" && (
                      <>
                        <button onClick={() => approvePhase(phase)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20">
                          <CheckCircle2 size={14} /> اعتماد
                        </button>
                        {revisionNoteFor === phase.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={revisionNoteText}
                              onChange={(e) => setRevisionNoteText(e.target.value)}
                              placeholder="اكتب ملاحظة التعديل..."
                              className="h-8 rounded-lg bg-[#020B1C] border border-red-500/30 px-2 text-xs"
                            />
                            <button onClick={() => rejectPhase(phase)} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40">تأكيد الرفض</button>
                          </div>
                        ) : (
                          <button onClick={() => setRevisionNoteFor(phase.id)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20">
                            <XCircle size={14} /> رفض مع ملاحظة
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
