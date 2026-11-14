import { withGeminiFallback } from "@/lib/aiConfig";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// يرفع الحد الأقصى لزمن تنفيذ الدالة على Vercel لمنع انقطاع الاتصال
export const maxDuration = 60;

const CATEGORY_LABELS: Record<string, string> = {
  archMod: "التعديلات المعمارية",
  masonry: "أعمال البناء",
  plaster: "المحارة",
  paint: "الدهانات",
  flooring: "الأرضيات والسيراميك",
  ceiling: "الأسقف المعلقة",
  doors: "الأبواب",
  aluminum: "الألوميتال",
  electricity: "الكهرباء",
  plumbing: "السباكة والصحي",
  ac: "التكييف",
  decorations: "الديكورات",
  ventilation: "التهوية",
  staircase: "السلم"
};

// كلمات تُستخدم لمطابقة قسم الخامات مع تخصص المورد
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  archMod: ["هدم", "بناء", "مواد بناء"],
  masonry: ["طوب", "مواد بناء", "أسمنت", "بناء"],
  plaster: ["أسمنت", "رمل", "مواد بناء", "محارة"],
  paint: ["دهان", "معجون", "جوتن", "نقاشة"],
  flooring: ["سيراميك", "بورسلين", "أرضيات", "رخام", "بورسلان"],
  ceiling: ["جبس", "سقف", "فالس"],
  doors: ["أبواب", "باب", "خشب"],
  aluminum: ["ألوميتال", "المونيوم", "ألومنيوم", "شبابيك"],
  electricity: ["كهرباء", "كابلات", "سلك", "إنارة", "سويدي"],
  plumbing: ["سباكة", "صحي", "مواسير", "أدوات صحية"],
  ac: ["تكييف"],
  decorations: ["ديكور"],
  ventilation: ["تهوية", "شفاط"],
  staircase: ["رخام", "سلم"]
};

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS);

const num = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const fmt = (n: number) => Number(Math.round(n * 100) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });
const cell = (v: any) => String(v ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").trim() || "-";

const supplierName = (s: any) => String(s.name ?? s.company_name ?? s.supplier_name ?? "").trim();
const supplierPhone = (s: any) => String(s.phone ?? s.phone_number ?? s.mobile ?? s.contact_phone ?? "").trim();
const supplierText = (s: any) =>
  [s.name, s.company_name, s.specialty, s.category, s.supply_type, s.type, s.notes, s.description].filter(Boolean).join(" ");

export async function POST(req: Request) {
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

    const { projectId } = await req.json();
    if (!projectId) {
      return NextResponse.json({ error: "يرجى تحديد المشروع لتحليل كشوف مشترياته." }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    // 1. المشروع والمقايسة المعتمدة وبنودها والموردون
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("project_name, customers(name)")
      .eq("id", projectId)
      .maybeSingle();

    const { data: header, error: headerError } = await supabaseAdmin
      .from("estimate_headers")
      .select("id")
      .eq("project_id", projectId)
      .maybeSingle();
    if (headerError) throw headerError;

    let items: any[] = [];
    if (header) {
      const { data: dbItems } = await supabaseAdmin.from("estimate_items").select("*").eq("estimate_id", header.id);
      items = dbItems || [];
    }
    if (items.length === 0) {
      return NextResponse.json(
        { error: "لا توجد مقايسة محفوظة لهذا المشروع. أنشئ المقايسة أولاً ثم أعد تحليل المشتريات." },
        { status: 400 }
      );
    }

    const { data: suppliersData } = await supabaseAdmin.from("suppliers").select("*");
    const suppliers: any[] = suppliersData || [];

    // 2. الحساب بالكود: الخامات = البنود التي لها سعر وحدة، والمصنعيات لا تُشترى من موردين
    const materials = items.filter((i) => num(i.unit_price) > 0 && num(i.quantity) > 0);
    const laborTotal = items.reduce((s, i) => s + num(i.labor_cost), 0);
    const unpricedCount = items.filter((i) => num(i.unit_price) === 0 && num(i.labor_cost) === 0).length;

    const matchSupplier = (category: string) => {
      const keywords = CATEGORY_KEYWORDS[category] || [];
      return suppliers.find((s) => {
        const text = supplierText(s);
        return keywords.some((k) => text.includes(k));
      });
    };

    const byCategory = new Map<string, any[]>();
    materials.forEach((m) => {
      const c = String(m.category || "other");
      if (!byCategory.has(c)) byCategory.set(c, []);
      byCategory.get(c)!.push(m);
    });
    const categories = [
      ...CATEGORY_ORDER.filter((c) => byCategory.has(c)),
      ...Array.from(byCategory.keys()).filter((c) => !CATEGORY_ORDER.includes(c))
    ];

    let materialsTotal = 0;
    let withoutSupplier = 0;
    const supplierSummary = new Map<string, { phone: string; categories: Set<string>; total: number }>();
    const sections: string[] = [];
    const aiCategorySummary: { category: string; items: number; total: number; sampleItems: string[]; supplier: string }[] = [];

    for (const c of categories) {
      const label = CATEGORY_LABELS[c] || c;
      const list = byCategory.get(c)!;
      const supplier = matchSupplier(c);
      const sName = supplier ? supplierName(supplier) : "";
      const sPhone = supplier ? supplierPhone(supplier) : "";
      const supplierLabel = supplier ? `${cell(sName)}${sPhone ? " (" + cell(sPhone) + ")" : ""}` : "غير محدد";

      const rows = list.map((m) => {
        const total = num(m.quantity) * num(m.unit_price);
        return { m, total };
      });
      const catTotal = rows.reduce((s, r) => s + r.total, 0);
      materialsTotal += catTotal;

      if (supplier) {
        const key = sName || "مورد";
        const entry = supplierSummary.get(key) || { phone: sPhone, categories: new Set<string>(), total: 0 };
        entry.categories.add(label);
        entry.total += catTotal;
        supplierSummary.set(key, entry);
      } else {
        withoutSupplier += list.length;
      }

      sections.push(
        `### ${label} — إجمالي القسم: ${fmt(catTotal)} جنيه\n` +
          "| المادة | الكمية | الوحدة | سعر الوحدة | الإجمالي | المورد المقترح |\n|---|---|---|---|---|---|\n" +
          rows
            .map(
              ({ m, total }) =>
                `| ${cell(m.name || m.description)} | ${fmt(num(m.quantity))} | ${cell(m.unit)} | ${fmt(num(m.unit_price))} | ${fmt(total)} | ${supplierLabel} |`
            )
            .join("\n")
      );

      aiCategorySummary.push({
        category: label,
        items: list.length,
        total: Math.round(catTotal),
        sampleItems: list.slice(0, 4).map((m) => String(m.name || m.description || "")),
        supplier: supplier ? sName : "غير محدد"
      });
    }

    const supplierRows = Array.from(supplierSummary.entries()).sort((a, b) => b[1].total - a[1].total);

    // 3. الذكاء الاصطناعي: ترتيب الشراء والتوصيات فقط (بدون أي أرقام جديدة)
    let aiText = "";
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("مفتاح جيميناي غير معرّف.");
      const genAI = new GoogleGenerativeAI(apiKey);

      const prompt = `
You are the procurement advisor of Golden Decoration, an Egyptian finishing contractor.
The purchase list and all numbers below were calculated by the system. NEVER change, add, or invent any number, price, or supplier.
Write in clear Egyptian Arabic, short and practical, as markdown with exactly these three sections and nothing else:

## ترتيب الشراء المقترح
A numbered plan of 3 to 5 steps that says which material categories to order first and which can wait, following the normal sequence of finishing works (rough-in plumbing and electrical first, then plaster, then flooring and ceilings, then paint and doors). Use only the categories listed in the data.

## توصيات التوريد والتخزين
3 to 5 short bullets about delivery timing, site storage, and ordering contingency for the listed materials.

## ملاحظات للمشتريات
2 to 4 short bullets: mention categories that have no suggested supplier and suggest getting comparison quotes for the largest categories by value.

Project: ${project?.project_name || "-"}
Categories (JSON): ${JSON.stringify(aiCategorySummary)}
Items without a suggested supplier: ${withoutSupplier}
`;
      const result = await withGeminiFallback(async (modelName) => {
        const model = genAI.getGenerativeModel({ model: modelName });
        return await model.generateContent(prompt);
      });
      aiText = result.response.text().trim();
    } catch (geminiError: any) {
      console.error("Gemini API error:", geminiError);
      aiText = "> تعذّر توليد التوصيات الذكية حالياً. كشف الخامات أعلاه محسوب بالكامل وصالح للاستخدام.";
    }

    // 4. تجميع التقرير النهائي
    const customerName = (project as any)?.customers?.name;
    const md =
      `**المشروع:** ${cell(project?.project_name)} | **العميل:** ${cell(customerName || "عام")}\n\n` +
      `## ملخص أمر الشراء\n` +
      `| البيان | القيمة |\n|---|---|\n` +
      `| عدد بنود الخامات | ${materials.length} بند |\n` +
      `| إجمالي تكلفة الخامات المتوقعة | ${fmt(materialsTotal)} جنيه |\n` +
      `| إجمالي المصنعيات (تنفيذ فقط ولا تُشترى من موردين) | ${fmt(laborTotal)} جنيه |\n` +
      `| بنود الخامات بدون مورد مقترح | ${withoutSupplier} بند |\n\n` +
      (withoutSupplier > 0
        ? `> تنبيه: ${withoutSupplier} بند لا يوجد لها مورد مطابق في قائمة الموردين، يلزم اختيار مورد لها يدوياً.\n\n`
        : "") +
      (unpricedCount > 0
        ? `> تنبيه: ${unpricedCount} بند في المقايسة بدون سعر وحدة ولا مصنعية، راجعها قبل الشراء.\n\n`
        : "") +
      `## كشف الخامات حسب القسم\n\n` +
      sections.join("\n\n") +
      `\n\n` +
      (supplierRows.length > 0
        ? `## ملخص الموردين المقترحين\n| المورد | الهاتف | الأقسام | قيمة الطلبات |\n|---|---|---|---|\n` +
          supplierRows
            .map(([name, e]) => `| ${cell(name)} | ${cell(e.phone)} | ${cell(Array.from(e.categories).join("، "))} | ${fmt(e.total)} جنيه |`)
            .join("\n") +
          `\n\n`
        : "") +
      aiText;

    return NextResponse.json({ analysis: md });
  } catch (error: any) {
    console.error("Error in Procurement AI Route:", error);
    return NextResponse.json(
      { error: "فشل تحليل المشتريات: " + error.message },
      { status: 500 }
    );
  }
}