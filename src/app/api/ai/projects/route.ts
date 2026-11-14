import { withGeminiFallback } from "@/lib/aiConfig";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { analyzeTasks, tasksToMarkdown } from "@/lib/pmAnalysis";

// يرفع الحد الأقصى لزمن تنفيذ الدالة على Vercel لمنع انقطاع الاتصال أثناء تحليل المهام
export const maxDuration = 60;

export async function GET() {
  try {
    // هذا API داخلي لفريق العمل فقط
    const supabaseAuth = await createServerClient();
    const { data: { user }, error: authCheckError } = await supabaseAuth.auth.getUser();
    if (authCheckError || !user) {
      return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً." }, { status: 401 });
    }
    const { data: requesterProfile } = await supabaseAuth.from("users").select("role").eq("id", user.id).single();
    if (!requesterProfile || requesterProfile.role === "client") {
      return NextResponse.json({ error: "غير مصرح لك بهذا الإجراء." }, { status: 403 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    // 1. المهام الحقيقية فقط من قاعدة البيانات (بدون أي بيانات بديلة مختلقة)
    const { data: tasks, error: dbError } = await supabaseAdmin
      .from("tasks")
      .select("id, title, assigned_to, status, due_date, projects ( project_name, location )");
    if (dbError) throw dbError;

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        analysis:
          "## لا توجد مهام مسجلة\n> لا توجد أي مهام مسجلة في النظام حالياً، فلا يمكن تحليل التأخيرات. سجّل مهام المشاريع (المهمة، المهندس المسؤول، تاريخ الاستحقاق) ثم أعد تشغيل مدير المشاريع."
      });
    }

    // 2. تحليل التأخيرات بالكود
    const analysis = analyzeTasks(tasks);
    const tableMd = tasksToMarkdown(analysis);

    // 3. الذكاء الاصطناعي يقترح الحلول بناءً على النتائج فقط
    let aiText = "";
    if (analysis.delayed.length > 0 || analysis.dueSoon.length > 0) {
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("مفتاح جيميناي غير معرّف.");
        const genAI = new GoogleGenerativeAI(apiKey);
        const prompt = `
You are the AI Project Manager of Golden Decoration, an Egyptian interior finishing contractor.
The delays below were calculated by the system from live data. NEVER change, add, or invent any task, name, date, or number. Do NOT repeat the tables.
Write in clear Egyptian Arabic, concise and practical, as markdown with exactly these three sections:

## أولويات المتابعة
A numbered list of at most 5 items: which delayed tasks or projects the manager must follow up first and why (use the project, task, engineer and days late from the data).

## إجراءات تصحيحية مقترحة
3 to 5 short realistic corrective actions for the delays and for the tasks due soon (for example reallocating work, adding a crew, confirming material delivery).

## تحذيرات التسليم
1 to 3 short bullets about projects at risk of missing delivery dates, only if the data supports it.

Today: ${analysis.today}
Delayed tasks by project: ${JSON.stringify(analysis.byProject)}
Delayed tasks by engineer: ${JSON.stringify(analysis.byEngineer)}
Top delayed tasks: ${JSON.stringify(analysis.delayed.slice(0, 12))}
Tasks due within 3 days: ${JSON.stringify(analysis.dueSoon.slice(0, 8))}
`;
        const result = await withGeminiFallback(async (modelName) => {
          const model = genAI.getGenerativeModel({ model: modelName });
          return await model.generateContent(prompt);
        });
        aiText = result.response.text().trim();
      } catch (geminiError: any) {
        console.error("Gemini API error:", geminiError);
        aiText = "> تعذّر توليد التوصيات الذكية حالياً. جداول التأخيرات أعلاه محسوبة بالكامل وصالحة للاستخدام.";
      }
    }

    return NextResponse.json({ analysis: tableMd + aiText });
  } catch (error: any) {
    console.error("Error in PM AI Route:", error);
    return NextResponse.json({ error: "فشل تحليل المهام: " + error.message }, { status: 500 });
  }
}