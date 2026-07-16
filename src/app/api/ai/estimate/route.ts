import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { projectId, ceilingLocation } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: "يرجى تحديد المشروع أولاً لحساب كميات الخامات." }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    // 1. جلب بيانات المشروع التفصيلية
    const { data: project, error: projError } = await supabaseAdmin
      .from("projects")
      .select("*, customers(name)")
      .eq("id", projectId)
      .single();

    if (projError || !project) throw projError || new Error("المشروع غير موجود.");

    // 2. جلب معاملات الحصر الهندسية المحدثة 
    const { data: dbCoefficients } = await supabaseAdmin
      .from("work_item_analysis")
      .select("work_item_id, notes, consumption_qty");

    const getCoeff = (notesKeyword: string, defaultVal: number): number => {
      const match = (dbCoefficients || []).find((c: any) =>
        String(c.notes || "").includes(notesKeyword)
      );
      return match ? Number(match.consumption_qty) : defaultVal;
    };

    // إجراء الحسابات الهندسية الدقيقة بناءً على مساحة ومواصفات العقد
    const area = Number(project.area || 120);
    const wallArea = area * 3;

    // أ. المحارة
    const sandPlasterCoeff = getCoeff("رمل", 0.025);
    const cementPlasterCoeff = getCoeff("أسمنت", 0.1625);
    const plasterSand = (wallArea * sandPlasterCoeff).toFixed(1);
    const plasterCement = (wallArea * cementPlasterCoeff).toFixed(2);

    // ب. الدهانات
    const puttyCoeff = getCoeff("معجون", 0.200);
    const primerCoeff = getCoeff("بطانة", 0.037);
    const finishCoeff = getCoeff("دهان نهائي", 0.037);
    const paintPutty = Math.ceil(wallArea * puttyCoeff / 3);
    const paintPrimer = Math.ceil(wallArea * primerCoeff / 3);
    const paintFinish = Math.ceil(wallArea * finishCoeff / 3);

    // ج. الأرضيات والسيراميك والردم
    const ceramicFloorCoeff = getCoeff("سيراميك أرضيات", 1.050);
    const boardFloorCoeff = getCoeff("وزرة", 0.400);
    const sandFloorCoeff = getCoeff("رمل ردم", 0.100);
    const cementFloorCoeff = getCoeff("أسمنت تركيب", 0.250);
    const floorCeramic = Math.ceil(area * ceramicFloorCoeff);
    const floorBaseboard = Math.ceil(area * boardFloorCoeff);
    const floorSand = (area * sandFloorCoeff).toFixed(1);
    const floorCement = Math.ceil(area * cementFloorCoeff);

    // د. حسابات السقف المعلق والجبس بورد الإنشائي بناءً على المنطقة المختارة
    let ceilingArea = 0;
    if (ceilingLocation === "all") ceilingArea = area;
    else if (ceilingLocation === "reception") ceilingArea = Math.ceil(area * 0.4);
    else if (ceilingLocation === "rooms") ceilingArea = Math.ceil(area * 0.6);

    const ceilingBoards = Math.ceil(ceilingArea / 2.88);
    const ceilingAngles = Math.ceil(ceilingArea * 1.2);
    const ceilingOmegas = Math.ceil(ceilingArea * 1.5);
    const ceilingPutty = (ceilingArea * 0.25).toFixed(1);

    // هندسة الأوامر (Prompt Engineering) لتغليق كشوف الحصر بصيغة ملكية
    const estimatePrompt = `
      You are Golden Decoration AI BOQ Estimating Engineer.
      You generate weekly material quantity takeoff reports.
      Today's date is Monday, June 22, 2026.

      Here is the calculated raw engineering takeoff data for project: (${project.project_name}) owned by customer (${project.customers?.name || "عام"}):
      - Apartment Area: ${area} m²
      - Plastering Wall Area: ${wallArea} m²
      - Required Plaster Sand: ${plasterSand} m³ (Coefficient: ${sandPlasterCoeff})
      - Required Plaster Cement: ${plasterCement} Tons (Coefficient: ${cementPlasterCoeff})
      - Required Paint Putty Bags: ${paintPutty} Bags (Coefficient: ${puttyCoeff})
      - Required Paint Primer Buckets: ${paintPrimer} Buckets (Coefficient: ${primerCoeff})
      - Required Paint Final Coat Buckets: ${paintFinish} Buckets (Coefficient: ${finishCoeff})
      - Required Floor Ceramics: ${floorCeramic} m² (Coefficient: ${ceramicFloorCoeff})
      - Required Skirting: ${floorBaseboard} meters (Coefficient: ${boardFloorCoeff})
      - Required Flooring Sand Bed: ${floorSand} m³ (Coefficient: ${sandFloorCoeff})
      - Required Tile Installation Cement: ${floorCement} Bags (Coefficient: ${cementFloorCoeff})
      - Selected Suspended Ceiling Location: ${ceilingLocation === "all" ? "الشقة كلها" : ceilingLocation === "reception" ? "الريسبشن فقط" : ceilingLocation === "rooms" ? "الغرف فقط" : "لا يوجد سقف معلق"}
      - Calculated Ceiling Area: ${ceilingArea} m²
      - Required Gypsum Boards (ألواح جبسيوم بورد): ${ceilingBoards} Sheets
      - Required Iron Angles (زوايا صاج): ${ceilingAngles} Meters
      - Required Omega Profiles (أوميجا صاج): ${ceilingOmegas} Meters
      - Required Joint Putty (معجون فواصل جبس): ${ceilingPutty} Kg

      Formulate a highly professional, authoritative, and stunning Quantity Takeoff & Material Estimation Report (تقرير حصر وتفريد المواد الإنشائية المعتمد) in Egyptian Arabic.
      Include:
      1. Dynamic introductory statement addressed to Islam Mohamed.
      2. Structured tables displaying the calculated material needs including Plastering, Painting, Flooring, and the newly added Suspended Ceiling (الأسقف المعلقة والجبس بورد).
      3. Detailed, realistic explanations of how these numbers were computed based on the coefficients.
      4. Professional site storage, dampness prevention, and material handling recommendations in Egyptian Arabic.

      Respond ONLY in Egyptian Arabic in a highly structured, beautiful format using clean markdown, tables, and icons (📐).
    `;

    let responseText = "";

    try {
      // المحاولة الأولى: استخدام خادم جوجل جيميناي المستقر
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("مفتاح جيميناي غير معرّف.");

      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

      const result = await model.generateContent(estimatePrompt);
      responseText = result.response.text();
    } catch (geminiError: any) {
      console.warn("Gemini service failed, switching to OpenRouter Llama 3.3...", geminiError);

      // تجاوز الفشل الفوري: التحويل التلقائي المباشر لـ OpenRouter لثبات واستقرار تامين
      const apiKeyOpenRouter = process.env.OPENROUTER_API_KEY;
      if (!apiKeyOpenRouter) {
        throw new Error("عذراً، خوادم جيميناي مشغولة حالياً ومفتاح الأمان للاحتياطي OPENROUTER_API_KEY غير معرّف في البيئة لتشغيل البديل.");
      }

      // اتصال مباشر موحد متوافق بالكامل مع واجهة OpenAI مع تمرير متطلبات الهيدر الإلزامية لـ OpenRouter
      const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKeyOpenRouter}`,
          "HTTP-Referer": "http://localhost:3000", // مطلوب لتعريف التطبيق في المنصة
          "X-Title": "Golden Decoration ERP"
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct:free", // استدعاء نموذج لاما 3.3 العملاق والنشط بالكامل على المنصة
          messages: [{ role: "user", content: estimatePrompt }]
        })
      });

      if (!orResponse.ok) {
        const errorData = await orResponse.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "فشلت خوادم OpenRouter البديلة في الاستجابة أيضاً.");
      }

      const orData = await orResponse.json();
      responseText = orData.choices[0].message.content;
    }

    return NextResponse.json({ analysis: responseText });
  } catch (error: any) {
    console.error("Error in Estimate AI Route:", error);
    return NextResponse.json({ error: "فشلت خوادم حساب الكميات للذكاء الاصطناعي في الاستجابة بالكامل: " + error.message }, { status: 500 });
  }
}