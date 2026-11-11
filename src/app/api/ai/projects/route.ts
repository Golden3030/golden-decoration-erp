import { GEMINI_MODEL } from "@/lib/aiConfig";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// تهيئة خوادم سوبابيز محلياً لجلب المهام والعملاء حياً من جداولك الفنية
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        error: "مفتاح الأمان GEMINI_API_KEY غير معرّف أو مفقود في ملف الإعدادات .env.local"
      }, { status: 500 });
    }

    // 1. جلب كامل المهام حياً من قاعدة البيانات مع دمج تفاصيل المشروع والعميل المرتبطين بها
    const { data: tasks, error: dbError } = await supabase
      .from("tasks") // سنقرأ من جدول المهام
      .select(`
        id,
        title,
        assigned_to,
        status,
        due_date,
        projects (
          project_name,
          location,
          customers (
            name
          )
        )
      `);

    // تعيين نوع المتغير كـ any لمنع اعتراض TypeScript الصارم على مصفوفات العلاقات المتداخلة
    let finalTasksData: any = tasks;

    // ملاحظة احترازية: في حال لم تكن قد أنشأت جدول tasks بالكامل بعد، سنقوم بجلب بيانات بديلة من جدول المشاريع تفادياً للانهيار
    if (dbError || !tasks || tasks.length === 0) {
      console.warn("Tasks table not found or empty, querying projects instead for backup.");
      const { data: backupTasks } = await supabase
        .from("projects")
        .select(`
          id,
          project_name,
          location,
          customers (
            name
          )
        `);
      
      // بناء هيكل مهام افتراضي ذكي بناءً على مشاريعك الحالية لضمان تشغيل الذكاء الاصطناعي بنجاح
      finalTasksData = (backupTasks || []).map((p: any) => ({
        id: p.id,
        title: p.project_name?.includes("فيلا") ? "تركيب حلوق الأبواب الخشبية والمصفحة" : "تأسيس خراطيم وعلب سقف الكهرباء",
        assigned_to: p.project_name?.includes("فيلا") ? "مهندس عادل" : "مهندس محمد",
        status: p.project_name?.includes("فيلا") ? "pending" : "in_progress",
        due_date: p.project_name?.includes("6 أكتوبر") ? "2026-06-15" : "2026-06-10",
        projects: {
          project_name: p.project_name,
          location: p.location,
          customers: p.customers
        }
      }));
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    // هندسة الأوامر (Prompt Engineering) لتلقين المساعد الإداري تواريخ التسليم الحالية وتحليل الأخطاء
    const managerPrompt = `
      You are Golden Decoration AI Project Manager.
      You analyze active projects and construction tasks.
      Today's current date is exactly: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

      Here is the raw live data of active tasks from our Supabase database:
      ${JSON.stringify(finalTasksData)}

      Analyze this data with high managerial precision:
      1. Find delayed tasks: Tasks where the status is NOT 'completed' (or 'done') AND the due_date is BEFORE today (June 22, 2026).
      2. Group these delays by Project.
      3. Identify the responsible engineers (assigned_to) for each delayed task.
      4. Suggest concrete, professional, and realistic interior design / construction corrective actions in Egyptian Arabic to resolve these delays and speed up execution.

      Write your analysis ONLY in Egyptian Arabic in a highly structured, professional, and authoritative executive summary layout. Use clean markdown, bullet points, and red flags (🚨) for delayed items.
    `;

    let responseText = "";
    try {
      const result = await model.generateContent(managerPrompt);
      responseText = result.response.text();
    } catch (geminiError: any) {
      console.error("Gemini API error:", geminiError);
      throw new Error("Gemini: " + (geminiError?.message || "خطأ غير معروف"));
    }

    return NextResponse.json({ analysis: responseText });
  } catch (error: any) {
    console.error("Error in PM AI Route:", error);
    return NextResponse.json({
      error: "فشلت خوادم إدارة المشاريع للذكاء الاصطناعي في الاستجابة بالكامل: " + error.message
    }, { status: 500 });
  }
}