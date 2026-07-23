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

// FIX: تنسيق التاريخ يدويًا لحل مشكلة الـ Hydration Mismatch
function formatArchiveDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
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
      {/* 🛠️ جدار الحماية البصري المعتمد لتوحيد شريط التمرير بالأسهم والجدول المذهب الموحد لحسابات لوحة القيادة */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* تفعيل وإظهار شريط التمرير الأفقي والرأسي بكافة الجداول بألوان ذهبية فاخرة */
        ::-webkit-scrollbar { 
          width: 4px !important; 
          height: 4px !important; 
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
          -ms-overflow-style: auto !important; 
          overflow-x: auto !important; 
        }

        /* عزل تلوين وأوزان خلايا جدول المشاريع ومنع تسريب الـ CSS للسايدبار وهيدر المنظومة */
        .premium-dashboard-projects-table thead th {
          font-size: 0.80rem !important;
          font-weight: 500 !important;
          color: #D4AF37 !important;
          text-align: right !important;
          background-color: #020B1C !important;
          border-bottom: 2px solid rgba(212, 175, 55, 0.3) !important;
          padding: 14px 16px !important;
          letter-spacing: normal !important;
        }

        .premium-dashboard-projects-table tbody td {
          font-size: 0.8rem !important;
          font-weight: 400 !important;
          text-align: right !important;
          border-bottom: 1px solid rgba(212, 175, 55, 0.1) !important;
          padding: 14px 16px !important;
          letter-spacing: normal !important;
        }

        .premium-dashboard-projects-table tbody tr:hover {
          background-color: rgba(7, 19, 42, 0.8) !important;
        }
      `}} />

      <div className="mt-6 bg-[#07132a] border-2 border-[#D4AF37] rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-300">
        
        {/* ترويسة الجدول الإمبراطورية الفاخرة تزامناً مع اتجاه RTL الصحيح */}
        <div className="p-5 border-b border-[#D4AF37]/20 flex items-center gap-2.5 bg-[#D4AF37]/30">
          <Construction className="w-5 h-5 text-[#D4AF37] shrink-0 animate-pulse" />
          <h2 className="text-[#D4AF37] text-sm font-bold select-none">
            المشاريع الجارية بمواقع العمل الميدانية
          </h2>
        </div>

        {/* تفعيل التمرير مذهب الألوان وحماية الجدول من التقاطع بـ whitespace-nowrap و min-w-[850px] بالكامل */}
        <div className="overflow-x-auto w-full">
          {loading ? (
            <div className="p-16 text-center text-[#F0E6D2]/50 text-xs font-bold flex items-center justify-center gap-3">
              <span className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" />
              جاري حصر المشاريع وحساب معدلات الإنجاز الفعلي...
            </div>
          ) : projectsList.length > 0 ? (
            <table className="w-full text-right table-auto min-w-[850px] premium-dashboard-projects-table">
              <thead>
                <tr className="whitespace-nowrap select-none">
                  <th className="font-medium">المشروع</th>
                  <th className="font-medium">اسم العميل</th>
                  <th className="font-medium">نسبة الإنجاز الفعلي بالموقع</th>
                  <th className="text-center font-medium">الحالة الإدارية للتسليم</th>
                  <th className="font-medium">المستحقات المتبقية بالخارج</th>
                  <th className="text-center font-medium">الملف الفني ومخططات الـ 3D</th>
                </tr>
              </thead>

              <tbody>
                {projectsList.map((project) => (
                  <tr
                    key={project.id}
                    onClick={() => router.push("/projects")}
                    className="whitespace-nowrap"
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
                      {/* 🌟 ترقية زرار المعاينة الفنية للدستور النيوني الميتاليكي المعتمد بالخزينة لتوحيد الرؤية */}
                      <button
                        type="button" 
                        onClick={(e) => {
                          e.stopPropagation(); // منع تعارض الضغط مع انتقال السطر لـ /projects
                          router.push(`/dashboard/preview/${project.id}`);
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.15)] hover:shadow-[0_0_20px_rgba(212,175,55,0.35)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer text-xs font-black relative overflow-hidden whitespace-nowrap inline-flex items-center justify-center gap-1.5"
                      >
                        <Eye size={12} className="shrink-0" />
                        <span>معاينة الفني</span>
                        <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_4px_rgba(212,175,55,0.8)]" />
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