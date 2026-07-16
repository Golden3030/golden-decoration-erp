import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: "يرجى تحديد المشروع أولاً للتحليل المالي." }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    // 1. جلب بيانات المشروع الأساسية للربط المالي
    const { data: project, error: projError } = await supabaseAdmin
      .from("projects")
      .select("*, customers(name)")
      .eq("id", projectId)
      .single();

    if (projError || !project) throw projError || new Error("المشروع غير موجود.");

    // 2. جلب إجمالي قيمة العقد المعتمد من جدول المقايسات
    const { data: estimateHeader } = await supabaseAdmin
      .from("estimate_headers")
      .select("grand_total")
      .eq("project_id", projectId)
      .maybeSingle();

    const contractTotal = estimateHeader ? Number(estimateHeader.grand_total) : Number(project.contract_value || 0);

    // 3. جلب كافة القيود والحركات المالية المرتبطة بهذا المشروع حياً من جدول الخزينة
    const { data: projectTransactions } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("project_id", projectId);

    const rawTrans = projectTransactions || [];

    // جرد الحسابات حياً بالجنيه المصري للموقع المختار
    const totalCollected = rawTrans
      .filter((t: any) => t.type === "inflow")
      .reduce((sum, t: any) => sum + Number(t.amount || 0), 0);

    const totalMaterialsCost = rawTrans
      .filter((t: any) => t.type === "outflow" && t.category === "material_purchase")
      .reduce((sum, t: any) => sum + Number(t.amount || 0), 0);

    const totalSubcontractorsLabor = rawTrans
      .filter((t: any) => t.type === "outflow" && t.category === "subcontractor_labor")
      .reduce((sum, t: any) => sum + Number(t.amount || 0), 0);

    const totalOtherOutflows = rawTrans
      .filter((t: any) => t.type === "outflow" && t.category !== "material_purchase" && t.category !== "subcontractor_labor")
      .reduce((sum, t: any) => sum + Number(t.amount || 0), 0);

    const totalExpenses = totalMaterialsCost + totalSubcontractorsLabor + totalOtherOutflows;
    const netProfit = totalCollected - totalExpenses; // السيولة المتوفرة بالخزينة من أرباح المشروع
    const remainingReceivable = contractTotal - totalCollected; // المستحقات المتبقية طرف العميل

    const profitMarginPercent = totalCollected > 0 ? ((netProfit / totalCollected) * 100).toFixed(1) : "0.0";

    // هندسة الأوامر وتلقين المساعد ببيانات الخزينة الحقيقية
    const financePrompt = `
      You are Golden Decoration AI CFO & Financial Analyst.
      You analyze project budgets, inflows, outflows, and cash-flow profitability.
      Today's date is Monday, June 22, 2026.

      Here is the audited live financial sheet for project (${project.project_name}) owned by customer (${project.customers?.name || "عام"}):
      - Total Agreed Contract Value: ${contractTotal.toLocaleString('en-US')} EGP
      - Total Collected Cash (Inflows from Client): ${totalCollected.toLocaleString('en-US')} EGP
      - Total Spent on Raw Materials (Outflow): ${totalMaterialsCost.toLocaleString('en-US')} EGP
      - Total Spent on Subcontractors & Labor (Outflow): ${totalSubcontractorsLabor.toLocaleString('en-US')} EGP
      - Total Spent on General/Other Expenses (Outflow): ${totalOtherOutflows.toLocaleString('en-US')} EGP
      - Total Project Operational Expenses: ${totalExpenses.toLocaleString('en-US')} EGP
      - Realized Net Profit (Cash in Treasury): ${netProfit.toLocaleString('en-US')} EGP
      - Outstanding Receivables (Left with Client): ${remainingReceivable.toLocaleString('en-US')} EGP
      - Project Net Profit Margin: ${profitMarginPercent}%

      Formulate a high-level, professional, and authoritative Corporate Financial Audit Report (تقرير الاستخبارات المالية وصافي ربحية المشروع) in Egyptian Arabic.
      Include:
      1. Professional introduction addressed to the board of Golden Decoration (Islam Mohamed).
      2. Clean markdown table summarizing these exact audited financial figures (No faked values, use the provided numbers!).
      3. Analytical assessment of the financial health of the site: Is the cash flow positive? Are material costs aligned with labor margins? Is the client delayed on milestones?
      4. Executive cash-flow optimization, milestone collection, and procurement budget control recommendations in Egyptian Arabic.

      Respond ONLY in Egyptian Arabic in a highly structured, beautiful format using clean markdown, tables, and icons (📊).
    `;

    let responseText = "";

    try {
      // المحاولة الأولى: استخدام خادم جوجل جيميناي المستقر
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("مفتاح جيميناي غير معرّف.");

      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

      const result = await model.generateContent(financePrompt);
      responseText = result.response.text();
    } catch (geminiError: any) {
      console.warn("Gemini finance service failed, switching to OpenRouter Llama 3.3...", geminiError);

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
          messages: [{ role: "user", content: financePrompt }]
        })
      });

      if (!orResponse.ok) {
        const errorData = await orResponse.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "فشلت خوادم الاستخبارات لـ OpenRouter البديلة في الاستجابة أيضاً.");
      }

      const orData = await orResponse.json();
      responseText = orData.choices[0].message.content;
    }

    return NextResponse.json({ analysis: responseText });
  } catch (error: any) {
    console.error("Error in Finance AI Route:", error);
    return NextResponse.json({ error: "فشلت خوادم الاستخبارات المالية للذكاء الاصطناعي في الاستجابة بالكامل: " + error.message }, { status: 500 });
  }
}