import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// تهيئة خوادم سوبابيز محلياً لجلب الخامات والموردين
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        error: "مفتاح الأمان GEMINI_API_KEY غير معرّف أو مفقود في ملف الإعدادات .env.local"
      }, { status: 500 });
    }

    const { projectId } = await req.json();

    if (!projectId) {
      return NextResponse.json({ error: "يرجى تحديد المشروع لتحليل كشوف مشترياته." }, { status: 400 });
    }

    // 1. جلب ترويسة المقايسة المعتمدة للمشروع المختار
    const { data: header, error: headerError } = await supabase
      .from("estimate_headers")
      .select("id")
      .eq("project_id", projectId)
      .maybeSingle();

    if (headerError) throw headerError;

    let items: any[] = [];
    
    if (header) {
      // 2. جلب بنود المقايسة التفصيلية (الخامات والمصنعيات) المخزنة لها حياً من الـ estimate_items
      const { data: dbItems } = await supabase
        .from("estimate_items")
        .select("*")
        .eq("estimate_id", header.id);
      
      items = dbItems || [];
    }

    // 3. جلب قائمة الموردين المعتمدين لربط الخامات بهم
    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("*");

    // هندسة الأوامر لتوجيه المساعد على فلترة المصنعيات ومطابقة الموردين بدقة
    const procurementPrompt = `
      You are Golden Decoration AI Procurement Assistant.
      You generate weekly material purchase lists and procurement orders.
      Today's current date is exactly: Monday, June 22, 2026.

      Here is the raw data of detailed materials (BOQ items) required for this active project:
      ${JSON.stringify(items)}

      Here is the list of approved suppliers in our database:
      ${JSON.stringify(suppliers)}

      Analyze the required materials:
      1. Filter out labor-only items (مصنعيات). We ONLY purchase physical materials (خامات) from suppliers!
      2. Group required materials by category (الكهرباء، الصحي والسباكة، الدهانات، الأبواب والنوافذ).
      3. Match each material with the most appropriate approved supplier from the suppliers list (E.g. matching "سلك سويدي" or "علبة ماجيك" to "شركة السويدي للكابلات والتوزيع", "سيراميك/بورسلين" to "مجموعة محجوب", "سيكا/مواسير/محابس" to "التوحيد لمنتجات السباكة", "دهان/سيلر/معجون" to "شركة دهانات جوتن").
      4. Create a clean Weekly Purchase Order Table (جدول طلبات الشراء والتوريد الأسبوعية) in Egyptian Arabic showing:
         - اسم المادة بالتفصيل (Material Name)
         - الكمية والوحدة المطلوبة (Quantity & Unit)
         - التكلفة المتوقعة للوحدة (Unit Price)
         - المورد المقترح ورقم هاتفه (Suggested Supplier & Phone)
      5. Provide professional logistics, storage, and site readiness suggestions in Egyptian Arabic.

      Respond ONLY in Egyptian Arabic in a highly structured, professional procurement order format using clean markdown, tables, and icons (🛒).
    `;

    let responseText = "";

    try {
      // المحاولة الأولى: استخدام خادم جوجل جيميناي المستقر
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
      const result = await model.generateContent(procurementPrompt);
      responseText = result.response.text();
    } catch (geminiError: any) {
      console.warn("Gemini procurement failed, switching to OpenRouter Llama 3.3...", geminiError);

      const apiKeyOpenRouter = process.env.OPENROUTER_API_KEY;
      if (!apiKeyOpenRouter) {
        throw new Error("خادم جيميناي للمشتريات تعذر اتصاله ومفتاح الأمان OPENROUTER_API_KEY غير معرّف للتشغيل البديل.");
      }

      // الترحيل الفوري والصامت لـ OpenRouter Llama 3.3 لحماية استقرار الشاشة حياً
      const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKeyOpenRouter}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Golden Decoration ERP"
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct",
          messages: [{ role: "user", content: procurementPrompt }]
        })
      });

      if (!orResponse.ok) {
        const errorData = await orResponse.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "فشلت خوادم المشتريات لـ OpenRouter البديلة في الاستجابة أيضاً.");
      }

      const orData = await orResponse.json();
      responseText = orData.choices[0].message.content;
    }

    return NextResponse.json({ analysis: responseText });
  } catch (error: any) {
    console.error("Error in Procurement AI Route:", error);
    return NextResponse.json({
      error: "فشلت خوادم المشتريات للذكاء الاصطناعي في الاستجابة بالكامل: " + error.message
    }, { status: 500 });
  }
}