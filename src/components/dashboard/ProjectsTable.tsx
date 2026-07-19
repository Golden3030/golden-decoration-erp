"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { 
  Construction, 
  Eye, 
  AlertTriangle, 
  CheckCircle2 
} from "lucide-react";

interface ProjectTableItem {
  id: string;
  projectName: string;
  clientName: string;
  start: string;
  delivery: string;
  progress: number;
  status: string;
  contract: string;
  due: string;
}

export default function ProjectsTable() {
  const router = useRouter();
  const [projectsList, setProjectsList] = useState<ProjectTableItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLiveProjectsTable() {
      try {
        const todayStr = new Date().toLocaleDateString("en-CA"); 

        const [projectsRes, transactionsRes] = await Promise.all([
          supabase
            .from("projects")
            .select(`
              id,
              project_name,
              status,
              created_at,
              area,
              progress_percentage,
              customers (
                name
              ),
              estimate_headers (
                grand_total
              ),
              tasks (
                status,
                due_date
              )
            `)
            .order("created_at", { ascending: false }),
          
          supabase
            .from("transactions")
            .select("project_id, amount")
            .eq("type", "inflow")
        ]);

        if (projectsRes.error) throw projectsRes.error;
        if (transactionsRes.error) throw transactionsRes.error;

        const rawProjects = projectsRes.data || [];
        const rawTransactions = transactionsRes.data || [];

        const mapped = rawProjects.map((item: any) => {
          const projectTasks = item.tasks || [];
          const totalTasksCount = projectTasks.length;
          
          const completedTasksCount = projectTasks.filter((t: any) => t.status === "completed" || t.status === "done").length;
          const progressPercent = totalTasksCount > 0 
            ? Math.round((completedTasksCount / totalTasksCount) * 100) 
            : (Number(item.progress_percentage) || 0);

          const hasOverdueTasks = projectTasks.some((t: any) => t.status !== "completed" && t.due_date < todayStr);
          const projectStatus = hasOverdueTasks ? "متأخر" : "جيد";

          const contractValue = item.estimate_headers?.[0]?.grand_total || (Number(item.area || 0) * 5000);

          const totalCollectedForProject = rawTransactions
            .filter((trans: any) => trans.project_id === item.id)
            .reduce((sum: number, trans: any) => sum + Number(trans.amount || 0), 0);

          const remainingDueValue = contractValue - totalCollectedForProject;

          const creationDate = new Date(item.created_at);
          const deliveryDate = new Date(creationDate.getTime() + 120 * 24 * 60 * 60 * 1000);

          return {
            id: item.id,
            projectName: item.project_name,
            clientName: item.customers?.name || "عميل غير محدد",
            start: creationDate.toLocaleDateString("en-CA"),
            delivery: deliveryDate.toLocaleDateString("en-CA"),
            progress: progressPercent,
            status: projectStatus,
            contract: Number(contractValue).toLocaleString('en-US') + " ج.م",
            due: Number(remainingDueValue > 0 ? remainingDueValue : 0).toLocaleString('en-US') + " ج.م"
          };
        });

        setProjectsList(mapped);
      } catch (err: any) {
        console.error("Full Projects Table Fetch Error:", JSON.stringify(err, null, 2));
      } finally {
        setLoading(false);
      }
    }

    fetchLiveProjectsTable();
  }, []);

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800;900&display=swap');
        
        .font-alexandria {
          font-family: 'Alexandria', Arial, sans-serif !important;
          letter-spacing: normal !important;
        }
      `}</style>

      <div className="mt-6 bg-[#07132a] border border-[#D4AF37]/15 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 hover:border-[#D4AF37]/35 font-alexandria">
        
        {/* ترويسة الجدول الإمبراطورية الفاخرة تزامناً مع اتجاه RTL الصحيح */}
        <div className="p-5 border-b border-[#D4AF37] flex items-center gap-3 bg-[#0b1b3d]">
          <Construction className="w-5 h-5 text-[#D4AF37] shrink-0 animate-pulse" />
          <h2 className="text-[#D4AF37] text-md font-bold select-none">
            المشاريع الجارية بمواقع العمل الميدانية
          </h2>
        </div>

        <div className="overflow-x-auto w-full">
          {loading ? (
            <div className="p-16 text-center text-[#F0E6D2]/50 text-xs font-bold flex items-center justify-center gap-3">
              <span className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" />
              جاري حصر المشاريع وحساب معدلات الإنجاز الفعلي...
            </div>
          ) : projectsList.length > 0 ? (
            <table className="w-full text-right text-xs md:text-sm">
              <thead>
                {/* تم تعديل الخط ليكون font-medium وإلغاء الـ bold التراكمي نهائياً لمظهر أرستقراطي ناعم */}
                <tr className="bg-[#0B1B38]/80 text-[#F0E6D2] text-[11px] font-medium border-b border-[#243556]/40 select-none">
                  <th className="p-4 font-medium">المشروع</th>
                  <th className="p-4 font-medium">اسم العميل</th>
                  <th className="p-4 font-medium">نسبة الإنجاز الفعلي بالموقع</th>
                  <th className="p-4 font-medium text-center">الحالة الإدارية للتسليم</th>
                  <th className="p-4 font-medium">المستحقات المتبقية بالخارج</th>
                  <th className="p-4 font-medium text-center">الملف الفني ومخططات الـ 3D</th>
                </tr>
              </thead>

              <tbody>
                {projectsList.map((project) => (
                  <tr
                    key={project.id}
                    onClick={() => router.push("/projects")}
                    className="border-t border-[#1f2d4d] hover:bg-[#0b1b3d]/60 cursor-pointer transition-all duration-200 text-white"
                    title="انقر هنا للانتقال لشاشة المشاريع الإجمالية فوراً"
                  >
                    <td className="p-4 font-black text-[#F0E6D2] text-xs">{project.projectName}</td>
                    <td className="p-4 text-[#F0E6D2]/80 font-bold">{project.clientName}</td>

                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {/* خط إنجاز مذهب ذو حوايا دائرية بالكامل حماية للعين */}
                        <div className="w-28 bg-[#020B1C] rounded-full h-3 overflow-hidden p-0.5 border border-[#1f2d4d]">
                          <div
                            className="bg-[#D4AF37] h-1.5 rounded-full transition-all duration-500 shadow-[0_0_8px_#D4AF37]"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[#F0E6D2]/60 font-mono font-bold">{project.progress}%</span>
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      {project.status === "جيد" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/25 select-none">
                          <CheckCircle2 size={11} className="text-green-400 shrink-0 animate-pulse" />
                          مستقر جيد
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/25 animate-pulse select-none">
                          <AlertTriangle size={11} className="text-red-400 shrink-0" />
                          متأخر بالموقع
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-[#F0E6D2] font-black font-mono text-xs">{project.due}</td>

                    <td className="p-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // منع تعارض الضغط مع انتقال السطر لـ /projects
                          router.push(`/dashboard/preview/${project.id}`);
                        }}
                        className="bg-black/50 border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] hover:shadow-[0_0_12px_rgba(212,175,55,0.45)] py-1.5 px-3.5 rounded-xl text-[10px] font-black transition-all duration-150 cursor-pointer whitespace-nowrap inline-flex items-center justify-center gap-1.5"
                      >
                        <Eye size={12} className="shrink-0" />
                        <span>معاينة الفني</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-[#F0E6D2]/40 text-xs font-semibold select-none">
              لا توجد مشاريع جارية مسجلة بقاعدة البيانات حالياً.
            </div>
          )}
        </div>

      </div>
    </>
  );
}