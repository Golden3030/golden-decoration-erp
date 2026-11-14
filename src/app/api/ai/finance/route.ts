import { withGeminiFallback } from "@/lib/aiConfig";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// يرفع الحد الأقصى لزمن تنفيذ الدالة على Vercel لمنع انقطاع الاتصال أثناء توليد التقارير المالية
export const maxDuration = 60;

const CATEGORY_LABELS: Record<string, string> = {
  material_purchase: "مشتريات خامات",
  subcontractor_labor: "مصنعيات مقاولي الباطن"
};

const num = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const money = (n: number) => Math.round(n).toLocaleString("en-US");
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);
const cell = (v: any) => String(v ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").trim() || "-";
const dateOf = (t: any) => {
  const raw = t.date ?? t.transaction_date ?? t.created_at;
  const d = raw ? new Date(raw) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleDateString("en-GB") : "-";
};
const noteOf = (t: any) => cell(t.description ?? t.notes ?? t.title ?? t.reference ?? "");

export async function POST(request: Request) {
  try {
    // 0. التحقق من تسجيل الدخول والصلاحية — البيانات المالية حساسة، admin/manager فقط
    const supabaseAuth = await createServerClient();
    const { data: { user }, error: authCheckError } = await supabaseAuth.auth.getUser();
    if (authCheckError || !user) {
      return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً." }, { status: 401 });
    }
    const { data: requesterProfile } = await supabaseAuth.from("users").select("role").eq("id", user.id).single();
    if (!requesterProfile || !["admin", "manager"].includes(requesterProfile.role)) {
      return NextResponse.json({ error: "غير مصرح لك بالاطلاع على البيانات المالية." }, { status: 403 });
    }

    const { projectId } = await request.json();
    if (!projectId) {
      return NextResponse.json({ error: "يرجى تحديد المشروع أولاً للتحليل المالي." }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    // 1. بيانات المشروع وقيمة العقد والحركات المالية
    const { data: project, error: projError } = await supabaseAdmin
      .from("projects")
      .select("*, customers(name)")
      .eq("id", projectId)
      .single();
    if (projError || !project) throw projError || new Error("المشروع غير موجود.");

    const { data: estimateHeader } = await supabaseAdmin
      .from("estimate_headers")
      .select("grand_total")
      .eq("project_id", projectId)
      .maybeSingle();
    const contractTotal = estimateHeader ? num(estimateHeader.grand_total) : num(project.contract_value);

    const { data: projectTransactions } = await supabaseAdmin.from("transactions").select("*").eq("project_id", projectId);
    const trans: any[] = projectTransactions || [];

    // 2. كل الحسابات بالكود
    const inflows = trans.filter((t) => t.type === "inflow");
    const outflows = trans.filter((t) => t.type === "outflow");
    const totalCollected = inflows.reduce((s, t) => s + num(t.amount), 0);
    const totalExpenses = outflows.reduce((s, t) => s + num(t.amount), 0);

    const expenseByCategory = new Map<string, number>();
    outflows.forEach((t) => {
      const key = String(t.category || "other");
      expenseByCategory.set(key, (expenseByCategory.get(key) || 0) + num(t.amount));
    });
    const expenseRows = Array.from(expenseByCategory.entries()).sort((a, b) => b[1] - a[1]);

    const netCash = totalCollected - totalExpenses;                 // صافي السيولة الحالية
    const remainingReceivable = Math.max(0, contractTotal - totalCollected);
    const projectedProfit = contractTotal - totalExpenses;          // الربح المتوقع لو اكتمل التحصيل بنفس المصروفات
    const collectionRatio = pct(totalCollected, contractTotal);
    const projectedMargin = pct(projectedProfit, contractTotal);
    const cashMargin = pct(netCash, totalCollected);

    // 3. تقييم سريع بقواعد واضحة (بدون ذكاء اصطناعي)
    const cashStatus =
      netCash >= 0
        ? `🟢 السيولة إيجابية: المحصّل أكبر من المصروف بمقدار ${money(netCash)} جنيه.`
        : `🔴 السيولة سالبة: المصروف أكبر من المحصّل بمقدار ${money(Math.abs(netCash))} جنيه.`;
    const collectionStatus =
      contractTotal <= 0
        ? "⚪ قيمة العقد غير محددة، لا يمكن حساب نسبة التحصيل."
        : collectionRatio >= 70
        ? `🟢 نسبة التحصيل ${collectionRatio}% من قيمة العقد.`
        : collectionRatio >= 40
        ? `🟡 نسبة التحصيل ${collectionRatio}% من قيمة العقد.`
        : `🔴 نسبة التحصيل ${collectionRatio}% فقط من قيمة العقد.`;
    const marginStatus =
      contractTotal <= 0
        ? "⚪ لا يمكن حساب الربحية المتوقعة بدون قيمة عقد."
        : projectedMargin >= 20
        ? `🟢 الربحية المتوقعة ${projectedMargin}% من قيمة العقد (جيدة).`
        : projectedMargin >= 10
        ? `🟡 الربحية المتوقعة ${projectedMargin}% من قيمة العقد (متوسطة).`
        : projectedMargin >= 0
        ? `🔴 الربحية المتوقعة ${projectedMargin}% من قيمة العقد (ضعيفة).`
        : `🔴 المشروع متوقع أن يحقق خسارة (${projectedMargin}% من قيمة العقد) بالمصروفات الحالية.`;

    const topExpenses = [...outflows].sort((a, b) => num(b.amount) - num(a.amount)).slice(0, 5);
    const lastInflows = [...inflows]
      .sort((a, b) => new Date(b.date ?? b.created_at ?? 0).getTime() - new Date(a.date ?? a.created_at ?? 0).getTime())
      .slice(0, 5);

    // 4. الذكاء الاصطناعي: تحليل وتوصيات فقط، يعتمد على الأرقام المحسوبة
    const facts = {
      project: project.project_name,
      contractTotal: Math.round(contractTotal),
      totalCollected: Math.round(totalCollected),
      collectionRatioPercent: collectionRatio,
      remainingReceivable: Math.round(remainingReceivable),
      totalExpenses: Math.round(totalExpenses),
      expensesByCategory: expenseRows.map(([k, v]) => ({
        category: CATEGORY_LABELS[k] || k,
        amount: Math.round(v),
        percentOfExpenses: pct(v, totalExpenses)
      })),
      netCash: Math.round(netCash),
      projectedProfit: Math.round(projectedProfit),
      projectedMarginPercent: projectedMargin
    };

    let aiText = "";
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("مفتاح جيميناي غير معرّف.");
      const genAI = new GoogleGenerativeAI(apiKey);
      const prompt = `
You are the financial analyst of Golden Decoration, an Egyptian finishing contractor, writing to the company owner.
All figures below are audited and were calculated by the system. Use them exactly as given. NEVER invent, change, or recompute numbers. Do NOT repeat the tables.
Write in clear Egyptian Arabic, concise and decisive, as markdown with exactly these three sections and nothing else:

## تحليل الوضع المالي
3 to 5 sentences: how healthy is this project financially, connecting collection, spending, and expected profit.

## المخاطر
2 to 4 short bullets about the real risks visible in these numbers (for example weak collection, a dominant expense category, thin margin). If a risk is not visible in the numbers, do not mention it.

## التوصيات التنفيذية
3 to 5 numbered, specific actions the owner can take now (collection follow-up, expense control, payment schedule), each tied to a number from the data.

Data (JSON): ${JSON.stringify(facts)}
`;
      const result = await withGeminiFallback(async (modelName) => {
        const model = genAI.getGenerativeModel({ model: modelName });
        return await model.generateContent(prompt);
      });
      aiText = result.response.text().trim();
    } catch (geminiError: any) {
      console.error("Gemini API error:", geminiError);
      aiText = "> تعذّر توليد التحليل الذكي حالياً. الأرقام والتقييم السريع أعلاه محسوبة بالكامل وصالحة للاستخدام.";
    }

    // 5. تجميع التقرير
    const customerName = (project as any).customers?.name;
    const md =
      `**المشروع:** ${cell(project.project_name)} | **العميل:** ${cell(customerName || "عام")}\n\n` +
      `## الملخص المالي\n` +
      `| البند | القيمة |\n|---|---|\n` +
      `| قيمة العقد المعتمدة | ${contractTotal > 0 ? money(contractTotal) + " جنيه" : "غير محددة"} |\n` +
      `| إجمالي المحصّل من العميل | ${money(totalCollected)} جنيه |\n` +
      `| نسبة التحصيل | ${contractTotal > 0 ? collectionRatio + "%" : "-"} |\n` +
      `| المتبقي على العميل | ${money(remainingReceivable)} جنيه |\n` +
      `| إجمالي المصروفات | ${money(totalExpenses)} جنيه |\n` +
      `| صافي السيولة الحالية (المحصّل − المصروفات) | ${money(netCash)} جنيه |\n` +
      `| الربح المتوقع عند اكتمال التحصيل (العقد − المصروفات) | ${contractTotal > 0 ? money(projectedProfit) + " جنيه" : "-"} |\n` +
      `| هامش الربح المتوقع | ${contractTotal > 0 ? projectedMargin + "%" : "-"} |\n` +
      `| هامش السيولة الحالية من المحصّل | ${totalCollected > 0 ? cashMargin + "%" : "-"} |\n\n` +
      `## التقييم السريع\n- ${cashStatus}\n- ${collectionStatus}\n- ${marginStatus}\n\n` +
      `## تفصيل المصروفات\n` +
      (expenseRows.length > 0
        ? `| نوع المصروف | المبلغ | نسبته من المصروفات |\n|---|---|---|\n` +
          expenseRows.map(([k, v]) => `| ${cell(CATEGORY_LABELS[k] || k)} | ${money(v)} جنيه | ${pct(v, totalExpenses)}% |`).join("\n") +
          `\n\n`
        : `لا توجد مصروفات مسجلة لهذا المشروع.\n\n`) +
      (topExpenses.length > 0
        ? `### أكبر 5 مصروفات\n| التاريخ | النوع | البيان | المبلغ |\n|---|---|---|---|\n` +
          topExpenses
            .map((t) => `| ${dateOf(t)} | ${cell(CATEGORY_LABELS[t.category] || t.category)} | ${noteOf(t)} | ${money(num(t.amount))} جنيه |`)
            .join("\n") +
          `\n\n`
        : "") +
      (lastInflows.length > 0
        ? `### آخر 5 دفعات محصّلة\n| التاريخ | البيان | المبلغ |\n|---|---|---|\n` +
          lastInflows.map((t) => `| ${dateOf(t)} | ${noteOf(t)} | ${money(num(t.amount))} جنيه |`).join("\n") +
          `\n\n`
        : "") +
      aiText;

    return NextResponse.json({ analysis: md });
  } catch (error: any) {
    console.error("Error in Finance AI Route:", error);
    return NextResponse.json({ error: "فشل التحليل المالي: " + error.message }, { status: 500 });
  }
}