import { withGeminiFallback } from "@/lib/aiConfig";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { DEFAULT_FINISH_LEVEL, isFinishLevel, levelLabel, type FinishLevel } from "@/lib/finishLevels";
import { computeOption } from "@/lib/salesEstimate";
import {
  buildQuickRooms,
  classifyRoom,
  computeTakeoff,
  quickCeilingArea,
  quickCostRange,
  type ApartmentState,
  type Coeff,
  type TakeoffCoefficients,
  type TakeoffResult,
  type TakeoffRoom
} from "@/lib/takeoffEngine";
import { computeQuickBom, type BomItem, type BomMaterial, type BomRoomFactor } from "@/lib/bomEngine";

// يضمن عدم انقطاع الاتصال على Vercel عند توليد التقارير
export const maxDuration = 60;


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
    const { data: dbCoefficients, error: coeffError } = await supabaseAdmin
      .from("work_item_analysis")
      .select("*");
    if (coeffError) console.error("تعذّر قراءة معاملات work_item_analysis:", coeffError.message);

    const getCoeff = (keyword: string, defaultVal: number): Coeff => {
      const match = (dbCoefficients || []).find((c: any) => String(c.notes || "").includes(keyword));
      if (match && Number.isFinite(Number(match.consumption_qty))) {
        return { value: Number(match.consumption_qty), fromSettings: true, unit: match.unit || undefined };
      }
      return { value: defaultVal, fromSettings: false };
    };

    const coeffs: TakeoffCoefficients = {
      putty: getCoeff("معجون", 0.2),
      primer: getCoeff("بطانة", 0.037),
      finishPaint: getCoeff("دهان نهائي", 0.037),
      ceramicFloor: getCoeff("سيراميك أرضيات", 1.05),
      sandFloor: getCoeff("رمل ردم", 0.1),
      cementFloor: getCoeff("أسمنت تركيب", 0.25)
    };

    let contextLabel = "";
    let result;
    let cost: { level: string; min: number; max: number } | null = null;
    let duration: { minDays: number; maxDays: number } | null = null;
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
      const level: FinishLevel = isFinishLevel(q.level) ? q.level : DEFAULT_FINISH_LEVEL;
      const requestedCeilingRooms: string[] = (Array.isArray(q.ceilingRooms) ? q.ceilingRooms : []).map(String);

      const counts = {
        bedrooms: clamp(q.bedrooms, 0, 8, 3),
        bathrooms: clamp(q.bathrooms, 1, 6, 2),
        receptions: clamp(q.receptions, 1, 4, 1),
        kitchens: clamp(q.kitchens, 1, 2, 1),
        corridors: clamp(q.corridors, 0, 2, 1)
      };
      const rooms = buildQuickRooms({ totalArea, ...counts });
      const ceilingNames = requestedCeilingRooms.filter((n) => rooms.some((r) => r.name === n));
      const roomsTotal = rooms.reduce((s, r) => s + r.area, 0) || 1;
      const gypsumShare = ceilingNames.length > 0 ? quickCeilingArea(rooms, ceilingNames) / roomsTotal : 0;

      // معاملات الحصر الفنية من الإعدادات (نفس مصدر المحاكي)
      const [itemsRes, matsRes, facRes] = await Promise.all([
        supabaseAdmin.from("takeoff_items").select("*"),
        supabaseAdmin.from("takeoff_materials").select("*"),
        supabaseAdmin.from("takeoff_room_factors").select("*")
      ]);
      if (itemsRes.error || matsRes.error || facRes.error || !(itemsRes.data || []).length) {
        return NextResponse.json(
          { error: "جداول معاملات الحصر الفنية غير جاهزة. شغّل ملف takeoff_bom_setup.sql في Supabase أولاً." },
          { status: 400 }
        );
      }
      const bom = computeQuickBom(
        itemsRes.data as BomItem[],
        (matsRes.data as any[]).map((m) => ({ ...m, coefficient: Number(m.coefficient), pack_size: Number(m.pack_size) })) as BomMaterial[],
        (facRes.data as any[]).map((f) => ({ ...f, factor: Number(f.factor) })) as BomRoomFactor[],
        { totalArea, ...counts, state, gypsumShare }
      );

      const a = bom.areas;
      const quickResult: TakeoffResult = {
        rooms,
        lines: bom.groups.flatMap((g) =>
          g.lines.map((l) => ({ stage: g.item.name_ar, item: l.name, quantity: l.quantity, unit: l.unit, basis: l.basis }))
        ),
        assumptions: [
          "تقدير سريع بدون معاينة: الكميات من جدول المعاملات الفنية في الإعدادات، والأرقام الفعلية قد تختلف بعد المعاينة والمقايسة.",
          `المساحات مستنتجة من مساحة الشقة: حوائط ${Math.round(a.wall_area)} م²، أسقف ${Math.round(a.ceiling_area)} م²، أرضيات ${Math.round(a.floor_area)} م²، سيراميك حوائط ${Math.round(a.wall_tile_area)} م²، عزل ${Math.round(a.waterproof_area)} م²، محيط ${Math.round(a.perimeter_ml)} م.ط.`,
          state === "brick" ? "الشقة على الطوب الأحمر: أعمال المحارة محسوبة." : "الشقة على المحارة: أعمال المحارة غير محسوبة.",
          ceilingNames.length > 0
            ? "الجبس بورد محسوب في: " + ceilingNames.join("، ") + "."
            : "لا توجد أسقف جبس بورد مختارة، فلم تُحتسب خاماتها (الأسقف تُدهن كلها).",
          ...bom.info.map((x) => `${x.label}: ${x.value}`),
          bom.note
        ],
        warnings: [],
        totals: {
          floorArea: Math.round(a.floor_area * 10) / 10,
          netWallArea: Math.round(a.wall_area * 10) / 10,
          plasterArea: state === "brick" ? Math.round(a.wall_area * 10) / 10 : 0,
          paintArea: Math.round(a.paint_area * 10) / 10,
          ceilingArea: Math.round(gypsumShare * a.ceiling_area * 10) / 10
        }
      };
      result = quickResult;

      contextLabel = `تقدير سريع لعميل غير مسجل: شقة ${totalArea} م²، ${rooms.filter(r => r.kind === "bedroom").length} غرف نوم، مستوى تشطيب ${levelLabel(level)}`;

      const { data: priceRow } = await supabaseAdmin
        .from("quick_estimate_prices")
        .select("min_price_per_m2, max_price_per_m2, min_days_per_100m2, max_days_per_100m2, fixed_days_min, fixed_days_max")
        .eq("level", level)
        .maybeSingle();

      const option = computeOption(
        totalArea,
        level,
        priceRow
          ? {
              level,
              minPricePerM2: Number(priceRow.min_price_per_m2 || 0),
              maxPricePerM2: Number(priceRow.max_price_per_m2 || 0),
              minDaysPer100m2: Number(priceRow.min_days_per_100m2 || 0),
              maxDaysPer100m2: Number(priceRow.max_days_per_100m2 || 0),
              fixedDaysMin: Number(priceRow.fixed_days_min || 0),
              fixedDaysMax: Number(priceRow.fixed_days_max || 0)
            }
          : undefined
      );
      if (option.minCost !== null && option.maxCost !== null) {
        cost = { level: option.label, min: option.minCost, max: option.maxCost };
      } else {
        costNote = `لم تُضبط أسعار المتر لمستوى (${option.label}) في صفحة الإعدادات، فتم عرض الكميات فقط.`;
      }
      if (option.minDays !== null && option.maxDays !== null) {
        duration = { minDays: option.minDays, maxDays: option.maxDays };
      }
    }

    if (coeffError) {
      result.warnings.unshift("تعذّر قراءة معاملات الإعدادات (" + coeffError.message + ")، فتم استخدام القيم الافتراضية بدلاً منها.");
    }

    // 2. دور الذكاء الاصطناعي: مراجعة وشرح وصياغة، بدون تغيير أي رقم
    const dataForAI = {
      context: contextLabel,
      totals: result.totals,
      lines: result.lines.map((l) => ({ stage: l.stage, item: l.item, quantity: l.quantity, unit: l.unit, basis: l.basis })),
      assumptions: result.assumptions,
      warnings: result.warnings,
      cost,
      duration
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
} ${duration ? `Mention the expected execution time from ${duration.minDays} to ${duration.maxDays} days, exactly as given.` : ""} State clearly that it is a preliminary non-binding estimate pending a site visit. Put the message between the markers [[WHATSAPP]] and [[/WHATSAPP]].` : ""}
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
      duration,
      costNote,
      analysis: responseText,
      whatsappMessage
    });
  } catch (error: any) {
    console.error("Error in Estimate AI Route:", error);
    return NextResponse.json({ error: "فشل حساب الكميات: " + error.message }, { status: 500 });
  }
}