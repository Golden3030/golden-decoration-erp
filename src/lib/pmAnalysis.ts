// تحليل المهام والتأخيرات بالكود: مقارنة تواريخ الاستحقاق بتاريخ اليوم (بتوقيت القاهرة).
// الذكاء الاصطناعي لا يحسب التأخيرات، بل يقترح الحلول بناءً على النتائج هنا.

const DONE_STATUSES = ["completed", "done", "مكتمل", "مكتملة", "تم", "منتهي", "منتهية"];

export interface DelayedTask {
  project: string;
  location: string;
  title: string;
  engineer: string;
  dueDate: string;
  daysLate: number;
}

export interface TaskAnalysis {
  today: string;
  total: number;
  done: number;
  active: number;
  noDueDate: number;
  delayed: DelayedTask[];
  dueSoon: { project: string; title: string; engineer: string; dueDate: string; daysLeft: number }[];
  byEngineer: { engineer: string; delayedCount: number; maxDaysLate: number }[];
  byProject: { project: string; delayedCount: number; maxDaysLate: number }[];
}

const cairoToday = (d: Date = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(d);

function dateOnly(v: any): string | null {
  const m = String(v ?? "").match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function dayDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / 86400000);
}

export function analyzeTasks(tasks: any[], now: Date = new Date()): TaskAnalysis {
  const today = cairoToday(now);
  const delayed: DelayedTask[] = [];
  const dueSoon: TaskAnalysis["dueSoon"] = [];
  let done = 0;
  let noDueDate = 0;

  for (const t of tasks) {
    const status = String(t.status || "").toLowerCase().trim();
    const isDone = DONE_STATUSES.includes(status);
    if (isDone) { done++; continue; }

    const due = dateOnly(t.due_date);
    const project = String(t.projects?.project_name || "مشروع غير محدد");
    const engineer = String(t.assigned_to || "غير معيّن");
    if (!due) { noDueDate++; continue; }

    const late = dayDiff(today, due);
    if (late > 0) {
      delayed.push({ project, location: String(t.projects?.location || ""), title: String(t.title || "-"), engineer, dueDate: due, daysLate: late });
    } else if (late >= -3) {
      dueSoon.push({ project, title: String(t.title || "-"), engineer, dueDate: due, daysLeft: -late });
    }
  }

  delayed.sort((a, b) => b.daysLate - a.daysLate);

  const group = <K extends string>(key: (d: DelayedTask) => string) => {
    const map = new Map<string, { count: number; max: number }>();
    delayed.forEach((d) => {
      const k = key(d);
      const e = map.get(k) || { count: 0, max: 0 };
      e.count++;
      e.max = Math.max(e.max, d.daysLate);
      map.set(k, e);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count);
  };

  return {
    today,
    total: tasks.length,
    done,
    active: tasks.length - done,
    noDueDate,
    delayed,
    dueSoon: dueSoon.sort((a, b) => a.daysLeft - b.daysLeft),
    byEngineer: group((d) => d.engineer).map(([engineer, e]) => ({ engineer, delayedCount: e.count, maxDaysLate: e.max })),
    byProject: group((d) => d.project).map(([project, e]) => ({ project, delayedCount: e.count, maxDaysLate: e.max }))
  };
}

const cell = (v: any) => String(v ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").trim() || "-";

export function tasksToMarkdown(a: TaskAnalysis): string {
  let md =
    `## ملخص المهام\n| البيان | العدد |\n|---|---|\n` +
    `| إجمالي المهام المسجلة | ${a.total} |\n` +
    `| المهام المكتملة | ${a.done} |\n` +
    `| المهام الجارية أو المعلقة | ${a.active} |\n` +
    `| المهام المتأخرة عن موعدها | ${a.delayed.length} |\n` +
    `| مهام تستحق خلال 3 أيام | ${a.dueSoon.length} |\n` +
    (a.noDueDate > 0 ? `| مهام غير مكتملة بدون تاريخ استحقاق | ${a.noDueDate} |\n` : "") +
    `\n`;

  if (a.delayed.length === 0) {
    md += `> لا توجد مهام متأخرة اليوم (${a.today}).\n\n`;
  } else {
    md +=
      `## المهام المتأخرة (الأقدم أولاً)\n| المشروع | المهمة | المسؤول | الاستحقاق | أيام التأخير |\n|---|---|---|---|---|\n` +
      a.delayed.slice(0, 40).map((d) => `| ${cell(d.project)} | ${cell(d.title)} | ${cell(d.engineer)} | ${d.dueDate} | ${d.daysLate} |`).join("\n") +
      (a.delayed.length > 40 ? `\n\n> يظهر أقدم 40 مهمة متأخرة من أصل ${a.delayed.length}.` : "") +
      `\n\n## التأخير حسب المشروع\n| المشروع | عدد المهام المتأخرة | أقصى تأخير (يوم) |\n|---|---|---|\n` +
      a.byProject.map((p) => `| ${cell(p.project)} | ${p.delayedCount} | ${p.maxDaysLate} |`).join("\n") +
      `\n\n## التأخير حسب المهندس المسؤول\n| المهندس | عدد المهام المتأخرة | أقصى تأخير (يوم) |\n|---|---|---|\n` +
      a.byEngineer.map((e) => `| ${cell(e.engineer)} | ${e.delayedCount} | ${e.maxDaysLate} |`).join("\n") +
      `\n\n`;
  }

  if (a.dueSoon.length > 0) {
    md +=
      `## مهام تستحق خلال 3 أيام\n| المشروع | المهمة | المسؤول | الاستحقاق | المتبقي (يوم) |\n|---|---|---|---|---|\n` +
      a.dueSoon.slice(0, 20).map((d) => `| ${cell(d.project)} | ${cell(d.title)} | ${cell(d.engineer)} | ${d.dueDate} | ${d.daysLeft} |`).join("\n") +
      `\n\n`;
  }
  return md;
}