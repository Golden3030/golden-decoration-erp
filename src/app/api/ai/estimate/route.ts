import { withGeminiFallback } from "@/lib/aiConfig";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  buildQuickRooms,
  classifyRoom,
  computeTakeoff,
  quickCeilingArea,
  quickCostRange,
  type ApartmentState,
  type Coeff,
  type FinishLevel,
  type RoomKind,
  type TakeoffCoefficients,
  type TakeoffRoom
} from "@/lib/takeoffEngine";

// يضمن عدم انقطاع الاتصال على Vercel عند توليد التقارير
export const maxDuration = 60;

const LEVELS: FinishLevel[] = ["economic", "medium", "luxury"];
const LEVEL_LABELS: Record<FinishLevel, string> = { economic: "اقتصادي", medium: "متوسط", luxury: "لوكس" };
const CEILING_KINDS: RoomKind[] = ["reception", "bedroom", "corridor"];

export async function POST(request: Request) {
  try {
    // 0. هذا API داخلي لفريق العمل فقط
    const supabaseAuth = await createServerClient();
    const { data: { user }, error: authCheckError } = await supabaseAuth.auth.getUser();
    if (authCheckError || !user) {
      return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً." }, { status: 401 });
    }
    const { data: requesterProfile } = await supabaseAuth.from("users").select("role").eq("id", user.id).single();
    if (!requesterProfile || requesterProfile.role === "client") {
      return NextResponse.json({ error: "غير مصرح لك بهذا الإجراء." }, { status: 403 });
    }

    const body = await request.json();
    const mode: "project" | "quick" = body.mode === "quick" ? "quick" : "project";

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    // 1. معاملات الحصر من صفحة الإعدادات (نفس المصدر القديم، مع تمييز القيم الافتراضية)
    const { data: dbCoefficients } = await supabaseAdmin
      .from("work_item_analysis")
      .select("work_item_id, notes, consumption_qty, unit");

    const getCoeff = (keyword: string, defaultVal: number): Coeff => {
      const match = (dbCoefficients || []).find((c: any) => String(c.notes || "").includes(keyword));
      if (match && Number.isFinite(Number(match.consumption_qty))) {
        return { value: Number(match.consumption_qty), fromSettings: true, unit: match.unit || undefined };
      }
      return { value: defaultVal, fromSettings: false };
    };

    const coeffs: TakeoffCoefficients = {
      sandPlaster: getCoeff("رمل", 0.025),
      cementPlaster: getCoeff("أسمنت", 0.1625),
      putty: getCoeff("معجون", 0.2),
      primer: getCoeff("بطانة", 0.037),
      finishPaint: getCoeff("دهان نهائي", 0.037),
      ceramicFloor: getCoeff("سيراميك أرضيات", 1.05),
      baseboard: getCoeff("وزرة", 0.4),
      sandFloor: getCoeff("رمل ردم", 0.1),
      cementFloor: getCoeff("أسمنت تركيب", 0.25)
    };

    let contextLabel = "";
    let result;
    let cost: { level: string; min: number; max: number } | null = null;
    let costNote = "";

    if (mode === "project") {
      // ---------- وضع مشروع مسجل: القراءة من تاب المساحات وتاب الأسقف ----------
      const { projectId } = body;
      if (!projectId) {
        return NextResponse.json({ error: "يرجى تحديد المشروع أولاً لحساب كميات الخامات." }, { status: 400 });
      }

      const { data: project, error: projError } = await supabaseAdmin
        .from("projects")
        .select("*, customers(name)")
        .eq("id", projectId)
        .single();
      if (projError || !project) throw projError || new Error("المشروع غير موجود.");

      const { data: specs } = await supabaseAdmin
        .from("finishing_specs")
        .select("category, value")
        .eq("project_id", projectId)
        .in("category", ["areas", "ceiling"]);

      const parse = (cat: string): any => {
        const row = (specs || []).find((s: any) => s.category === cat);
        try { return row ? JSON.parse(row.value) : {}; } catch { return {}; }
      };
      const areas = parse("areas");
      const ceiling = parse("ceiling");

      const rooms: TakeoffRoom[] = Object.entries(areas.values || {})
        .map(([name, area]) => ({ name, kind: classifyRoom(name), area: Number(area) }))
        .filter((r) => Number.isFinite(r.area) && r.area > 0);

      if (rooms.length === 0) {
        return NextResponse.json(
          { error: "لم تُسجَّل مساحات الغرف لهذا المشروع. سجّلها أولاً في تاب المساحات ثم أعد الحصر." },
          { status: 400 }
        );
      }
      if (areas.apartmentState !== "brick" && areas.apartmentState !== "plastered") {
        return NextResponse.json(
          { error: "حدد حالة الشقة (على الطوب الأحمر أو على المحارة) في تاب المساحات ثم أعد الحصر." },
          { status: 400 }
        );
      }

      const ceilingArea = Object.values(ceiling.spacesConfig || {}).reduce(
        (sum: number, c: any) => sum + (c?.enabled ? Number(c.area) || 0 : 0), 0
      );

      result = computeTakeoff({
        rooms,
        state: areas.apartmentState as ApartmentState,
        ceilingHeight: areas.ceilingHeight ? Number(areas.ceilingHeight) : null,
        ceilingArea,
        coeffs,
        declaredTotalArea: Number(project.area) || undefined
      });
      contextLabel = `مشروع (${project.project_name}) للعميل (${project.customers?.name || "عام"})`;
    } else {
      // ---------- وضع التقدير السريع: عميل غير مسجل ----------
      const q = body.quick || {};
      const totalArea = Number(q.totalArea);
      if (!Number.isFinite(totalArea) || totalArea < 20 || totalArea > 1000) {
        return NextResponse.json({ error: "أدخل مساحة شقة صحيحة (بين 20 و1000 م²)." }, { status: 400 });
      }
      const clamp = (v: any, min: number, max: number, def: number) => {
        const n = Math.round(Number(v));
        return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
      };
      const state: ApartmentState = q.state === "plastered" ? "plastered" : "brick";
      const level: FinishLevel = LEVELS.includes(q.level) ? q.level : "medium";
      const ceilingKinds: RoomKind[] = (Array.isArray(q.ceilingKinds) ? q.ceilingKinds : []).filter(
        (k: any) => CEILING_KINDS.includes(k)
      );

      const rooms = buildQuickRooms({
        totalArea,
        bedrooms: clamp(q.bedrooms, 0, 8, 3),
        bathrooms: clamp(q.bathrooms, 1, 6, 2),
        receptions: clamp(q.receptions, 1, 4, 1),
        kitchens: clamp(q.kitchens, 1, 2, 1),
        ceilingKinds
      });

      result = computeTakeoff({
        rooms,
        state,
        ceilingHeight: null,
        ceilingArea: quickCeilingArea(rooms, ceilingKinds),
        coeffs
      });
      result.assumptions.unshift(
        "تقدير سريع بدون معاينة: المساحة موزعة على الغرف بأوزان تقديرية، والأرقام الفعلية قد تختلف بعد المعاينة والمقايسة."
      );
      contextLabel = `تقدير سريع لعميل غير مسجل: شقة ${totalArea} م²، ${rooms.filter(r => r.kind === "bedroom").length} غرف نوم، مستوى تشطيب ${LEVEL_LABELS[level]}`;

      const { data: priceRow } = await supabaseAdmin
        .from("quick_estimate_prices")
        .select("min_price_per_m2, max_price_per_m2")
        .eq("level", level)
        .maybeSingle();

      const minP = Number(priceRow?.min_price_per_m2 || 0);
      const maxP = Number(priceRow?.max_price_per_m2 || 0);
      if (minP > 0 && maxP >= minP) {
        const range = quickCostRange(totalArea, minP, maxP);
        cost = { level: LEVEL_LABELS[level], min: range.min, max: range.max };
      } else {
        costNote = `لم تُضبط أسعار المتر لمستوى (${LEVEL_LABELS[level]}) في صفحة الإعدادات، فتم عرض الكميات فقط.`;
      }
    }

    // 2. دور الذكاء الاصطناعي: مراجعة وشرح وصياغة، بدون تغيير أي رقم
    const dataForAI = {
      context: contextLabel,
      totals: result.totals,
      lines: result.lines.map((l) => ({ stage: l.stage, item: l.item, quantity: l.quantity, unit: l.unit, basis: l.basis })),
      assumptions: result.assumptions,
      warnings: result.warnings,
      cost
    };

    const prompt = `
You are the senior quantity-takeoff reviewer for Golden Decoration, an Egyptian finishing contractor.
The numbers below were calculated by a deterministic engine. You must NEVER change, recompute, or invent any number or quantity.
Use only the data given. Respond in Egyptian Arabic, concise and practical, in plain text (no markdown tables, no headings with #).

Data (JSON):
${JSON.stringify(dataForAI, null, 2)}

Write these sections, each starting with its title on its own line:
1) ملاحظات المراجعة: explain each warning in simple words and say what to check. If there are no warnings, say the numbers look consistent with the inputs.
2) أساس الحساب: 3 to 5 short lines explaining how the quantities were derived from the assumptions.
3) توصيات الموقع: 3 short practical tips on storage and handling of the listed materials.
${mode === "quick" ? `4) رسالة للعميل: write a short WhatsApp reply (max 6 lines) to a prospect who asked for a price. ${
  cost
    ? `Mention the estimated cost range from ${cost.min} to ${cost.max} EGP for the ${cost.level} finishing level, exactly as given.`
    : "Do not mention any price; say the team will send a price after the site visit."
} State clearly that it is a preliminary non-binding estimate pending a site visit. Put the message between the markers [[WHATSAPP]] and [[/WHATSAPP]].` : ""}
`;

    let responseText = "";
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("مفتاح جيميناي غير معرّف.");
      const genAI = new GoogleGenerativeAI(apiKey);
      const aiResult = await withGeminiFallback(async (modelName) => {
        const model = genAI.getGenerativeModel({ model: modelName });
        return await model.generateContent(prompt);
      });
      responseText = aiResult.response.text();
    } catch (geminiError: any) {
      console.error("Gemini API error:", geminiError);
      // الأرقام جاهزة حتى لو فشل الـ AI، فلا نضيّع الحصر
      responseText = "";
      result.warnings.push("تعذّر توليد الشرح الذكي حالياً، الأرقام أعلاه محسوبة بالكامل وصالحة للاستخدام. (" + (geminiError?.message || "خطأ غير معروف") + ")");
    }

    let whatsappMessage = "";
    const m = responseText.match(/\[\[WHATSAPP\]\]([\s\S]*?)\[\[\/WHATSAPP\]\]/);
    if (m) {
      whatsappMessage = m[1].trim();
      responseText = responseText.replace(m[0], "").trim();
    }

    return NextResponse.json({
      mode,
      rooms: result.rooms,
      lines: result.lines,
      totals: result.totals,
      assumptions: result.assumptions,
      warnings: result.warnings,
      cost,
      costNote,
      analysis: responseText,
      whatsappMessage
    });
  } catch (error: any) {
    console.error("Error in Estimate AI Route:", error);
    return NextResponse.json({ error: "فشل حساب الكميات: " + error.message }, { status: 500 });
  }
}