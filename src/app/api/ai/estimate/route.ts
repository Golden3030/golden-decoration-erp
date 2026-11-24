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
  quickCeilingArea,
  type ApartmentState,
  type TakeoffResult,
  type TakeoffRoom
} from "@/lib/takeoffEngine";
import {
  computeQuickBom,
  type BomItem,
  type BomMaterial,
  type BomResult,
  type BomRoomFactor,
  type LaborConfig,
  type LaborRate,
  type PlumbingInstall,
  type PlumbingTier
} from "@/lib/bomEngine";
import { computeProjectBom } from "@/lib/projectBom";
import { compareTakeoffToEstimate } from "@/lib/estimateCompare";
import { pickEstimateHeader } from "@/lib/estimateHeader";

// يضمن عدم انقطاع الاتصال على Vercel عند توليد التقارير
export const maxDuration = 60;

// جداول الحصر الفني + المصنعيات (نفس المصدر في المحاكي والتقدير السريع والمقايسة ووضع المشروع)
async function loadBomTables(db: any): Promise<
  | { ok: true; items: BomItem[]; materials: BomMaterial[]; factors: BomRoomFactor[]; labor: LaborConfig }
  | { ok: false; error: string }
> {
  const [itemsRes, matsRes, facRes, laborRes, plumbRes] = await Promise.all([
    db.from("takeoff_items").select("*"),
    db.from("takeoff_materials").select("*"),
    db.from("takeoff_room_factors").select("*"),
    db.from("takeoff_labor").select("*"),
    db.from("takeoff_plumbing_labor").select("*")
  ]);
  if (itemsRes.error || matsRes.error || facRes.error || !(itemsRes.data || []).length) {
    return { ok: false, error: "جداول معاملات الحصر الفنية غير جاهزة. شغّل ملف takeoff_bom_setup.sql في Supabase أولاً." };
  }
  if (laborRes.error || plumbRes.error) {
    return { ok: false, error: "جداول المصنعيات غير جاهزة. شغّل ملف migrate_labor_rates.sql في Supabase أولاً." };
  }
  return {
    ok: true,
    items: itemsRes.data as BomItem[],
    materials: (matsRes.data as any[]).map((m) => ({ ...m, coefficient: Number(m.coefficient), pack_size: Number(m.pack_size), unit_price: Number(m.unit_price || 0) })) as BomMaterial[],
    factors: (facRes.data as any[]).map((f) => ({ ...f, factor: Number(f.factor) })) as BomRoomFactor[],
    labor: {
      rates: (laborRes.data as any[]).map((r) => ({ ...r, rate: Number(r.rate || 0) })) as LaborRate[],
      plumbing: (plumbRes.data as any[]).map((r) => ({ ...r, bathrooms_tier: Number(r.bathrooms_tier), price: Number(r.price || 0) })) as PlumbingTier[]
    }
  };
}

// شكل النتيجة المرسل للواجهة (للعرض وللتصدير PDF)
function bomPayload(bom: BomResult) {
  return {
    areas: bom.areas,
    groups: bom.groups.map((g) => ({
      key: g.item.key,
      name: g.item.name_ar,
      materialsCost: g.materialsCost,
      laborCost: g.laborCost,
      laborLines: g.laborLines.map((l) => ({ name: l.name, unit: l.unit, base: l.base, rate: l.rate, cost: l.cost })),
      lines: g.lines.map((l) => ({ name: l.name, quantity: l.quantity, unit: l.unit, unitPrice: l.unitPrice, cost: l.cost, basis: l.basis }))
    })),
    lump: bom.lumpLabor.map((l) => ({ name: l.name, amount: l.amount, basis: l.basis })),
    info: bom.info,
    totals: bom.totals,
    note: bom.note
  };
}

const fmtN = (n: number) => Math.round(n).toLocaleString("en-US");


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

    const plumbingInstall: PlumbingInstall | undefined =
      body.plumbingInstall === "buried" || body.plumbingInstall === "regular" ? body.plumbingInstall : undefined;

    // 1. جداول الحصر الفني والمصنعيات من الإعدادات (مصدر واحد لكل أوضاع الحصر)
    const tables = await loadBomTables(supabaseAdmin);
    if (!tables.ok) return NextResponse.json({ error: tables.error }, { status: 400 });

    let contextLabel = "";
    let result: TakeoffResult;
    let bomOut: ReturnType<typeof bomPayload> | null = null;
    let comparisonOut: any = null; // مقارنة الحصر بالمقايسة (وضع المشروع المسجل فقط)
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

      const { data: specs, error: specsError } = await supabaseAdmin
        .from("finishing_specs")
        .select("*")
        .eq("project_id", projectId)
        .in("category", ["areas", "ceiling", "masonry", "plumbing", "plaster"]);
      if (specsError) {
        return NextResponse.json({ error: "تعذّر قراءة مواصفات المشروع من قاعدة البيانات: " + specsError.message }, { status: 500 });
      }

      // لو القسم اتحفظ أكتر من مرة (حذف ثم إدراج) ممكن يفضل أكتر من صف: نقرا الأحدث، زي ما شاشة المشروع بتعرض آخر صف
      const rowTime = (r: any) => Date.parse(r.updated_at || r.created_at || "") || 0;
      const parse = (cat: string): any => {
        const rows = (specs || []).filter((s: any) => s.category === cat);
        if (rows.length === 0) return {};
        const latest = [...rows].sort((x: any, y: any) => rowTime(x) - rowTime(y))[rows.length - 1];
        try { return typeof latest.value === "string" ? JSON.parse(latest.value) : latest.value || {}; } catch { return {}; }
      };
      const areasSpec = parse("areas");
      const ceilingSpec = parse("ceiling");
      const masonrySpec = parse("masonry");
      const plumbingSpec = parse("plumbing");
      const plasterSpec = parse("plaster");

      const rooms: TakeoffRoom[] = Object.entries(areasSpec.values || {})
        .map(([name, area]) => ({ name, kind: classifyRoom(name), area: Number(area) }))
        .filter((r) => Number.isFinite(r.area) && r.area > 0);
      const ceilingSpaces = Object.entries(ceilingSpec.spacesConfig || {})
        .filter(([, c]: [string, any]) => c?.enabled && Number(c.area) > 0)
        .map(([name, c]: [string, any]) => ({
          name, area: Number(c.area), type: String(c.type || ""),
          length: Number(c.length) || undefined, width: Number(c.width) || undefined
        }));
      // مشروع مسجل: نوع التأسيس من تاب السباكة (concealed = دفن، regular = عادي) ولا يُسأل عنه
      const projectInstall: PlumbingInstall | undefined =
        plumbingSpec.activeSystem === "concealed" ? "buried" : plumbingSpec.activeSystem === "regular" ? "regular" : undefined;
      // نطاق المحارة محفوظ مع المشروع في تاب المحارة: الشقة كلها (افتراضي)، بدون الحمامات والمطبخ، أو غرف محددة
      const plasterRoomNames: string[] | undefined =
        plasterSpec.scope === "no_wet"
          ? rooms.filter((r) => r.kind !== "bathroom" && r.kind !== "kitchen").map((r) => r.name)
          : plasterSpec.scope === "custom" && Array.isArray(plasterSpec.scopeRooms)
            ? plasterSpec.scopeRooms.map((x: any) => String(x))
            : undefined;

      // نفس محرك المحاكي والتقدير السريع، بمساحات مشتقة من الغرف الفعلية (projectBom.ts)
      const pr = computeProjectBom(tables.items, tables.materials, tables.factors, tables.labor, {
        rooms,
        state: areasSpec.apartmentState === "brick" || areasSpec.apartmentState === "plastered" ? (areasSpec.apartmentState as ApartmentState) : null,
        ceilingHeight: Number(areasSpec.ceilingHeight) > 0 ? Number(areasSpec.ceilingHeight) : null,
        ceilingSpaces,
        declaredTotalArea: Number(project.area) || undefined,
        plumbingInstall: projectInstall,
        plasterRoomNames,
        plasterThicknessCm: Number(plasterSpec.plasterThicknessCm) > 0 ? Number(plasterSpec.plasterThicknessCm) : undefined,
        bricksCount: Number(masonrySpec.brickCount) > 0 ? Number(masonrySpec.brickCount) : undefined
      });
      if (!pr.ok || !pr.bom) {
        // سطر تشخيص: اللي اتقرا فعلاً من قاعدة البيانات لهذا المشروع، عشان نعرف سبب النقص بدل التخمين
        const areaRows = (specs || []).filter((x: any) => x.category === "areas").length;
        const found = `المقروء من قاعدة البيانات: صفوف المساحات ${areaRows}، غرف بمساحات ${rooms.length}، حالة الشقة ${areasSpec.apartmentState || "غير مسجلة"}، ارتفاع السقف ${areasSpec.ceilingHeight || "غير مسجل"}.`;
        return NextResponse.json({ error: "لا يمكن حساب الحصر قبل استكمال بيانات المشروع:\n- " + pr.blockers.join("\n- ") + "\n" + found }, { status: 400 });
      }
      const bom = pr.bom;
      const a = bom.areas;
      const state = areasSpec.apartmentState as ApartmentState;
      bomOut = bomPayload(bom);

      // مقارنة بالمقايسة المعتمدة للمشروع (النهائية أولاً ثم الأحدث). للمراجعة فقط، مفيش كتابة.
      const { data: headers } = await supabaseAdmin
        .from("estimate_headers").select("id, status, created_at, estimate_number").eq("project_id", projectId);
      const header = pickEstimateHeader(headers as any[] | null);
      if (!header) {
        comparisonOut = { estimate: null, message: "لا توجد مقايسة لهذا المشروع بعد، فلا توجد مقارنة." };
      } else {
        const { data: estItems } = await supabaseAdmin.from("estimate_items").select("category, quantity, unit_price, labor_cost").eq("estimate_id", header.id);
        const covered = Array.from(new Set(tables.items.filter((i) => i.is_active).map((i) => i.estimate_category || "decorations")));
        comparisonOut = {
          estimate: { number: (header as any).estimate_number || null, status: header.status || null, itemsCount: (estItems || []).length },
          ...compareTakeoffToEstimate(bom, (estItems || []) as any[], covered)
        };
      }

      result = {
        rooms: pr.derived.rooms.map((r) => ({ name: r.name, kind: r.kind, area: r.area })),
        lines: bom.groups.flatMap((g) =>
          g.lines.map((l) => ({ stage: g.item.name_ar, item: l.name, quantity: l.quantity, unit: l.unit, basis: l.basis }))
        ),
        assumptions: [
          ...pr.derived.assumptions,
          `المساحات المشتقة من الغرف: حوائط ${fmtN(a.wall_area)} م²، دهان ${fmtN(a.paint_area)} م²، أسقف ${fmtN(a.ceiling_area)} م²، أرضيات ${fmtN(a.floor_area)} م²، سيراميك حوائط ${fmtN(a.wall_tile_area)} م²، عزل ${fmtN(a.waterproof_area)} م²، وزرة وشادو جاب ${fmtN(a.perimeter_ml)} م.ط.`,
          ...bom.info.map((x) => `${x.label}: ${x.value}`),
          ...(bom.totals.grand > 0
            ? [`تكلفة الخامات والمصنعيات من جدول الحصر الفني (للمراجعة الداخلية): ${fmtN(bom.totals.grand)} جنيه (خامات ${fmtN(bom.totals.materials)} + مصنعيات ${fmtN(bom.totals.labor)})${bom.totals.unpricedLines > 0 ? `، وفيها ${bom.totals.unpricedLines} خامة بدون سعر` : ""}.`]
            : []),
          bom.note
        ],
        warnings: [
          ...pr.derived.warnings,
          ...(projectInstall ? [] : ["نوع تأسيس السباكة (دفن أو عادي) غير مسجل في تاب السباكة بالمشروع، فلم تُحسب مصنعية السباكة. اختر النظام في تاب السباكة."]),
          ...bom.warnings.filter((w) => !w.includes("نوع التأسيس"))
        ],
        totals: {
          floorArea: Math.round(a.floor_area * 10) / 10,
          netWallArea: Math.round(a.wall_area * 10) / 10,
          plasterArea: state === "brick" ? Math.round(a.wall_area * 10) / 10 : 0,
          paintArea: Math.round(a.paint_area * 10) / 10,
          ceilingArea: pr.derived.gypsum.area
        }
      };
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

      const bom = computeQuickBom(
        tables.items, tables.materials, tables.factors,
        { totalArea, ...counts, state, gypsumShare, plumbingInstall },
        tables.labor
      );
      bomOut = bomPayload(bom);

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
          ...(bom.totals.grand > 0
            ? [
                `تكلفة الخامات والمصنعيات المحسوبة من جدول الحصر الفني (للمراجعة الداخلية): ${Math.round(bom.totals.grand).toLocaleString("en-US")} جنيه (خامات ${Math.round(bom.totals.materials).toLocaleString("en-US")} + مصنعيات ${Math.round(bom.totals.labor).toLocaleString("en-US")})${bom.totals.unpricedLines > 0 ? `، وفيها ${bom.totals.unpricedLines} خامة بدون سعر` : ""}.`
              ]
            : []),
          bom.note
        ],
        warnings: [...bom.warnings],
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

    // مراجعة المقايسة بالحصر (تاب المقايسة): حصر ومقارنة فقط بدون استدعاء الذكاء الاصطناعي
    if (body.reviewOnly === true && mode === "project") {
      return NextResponse.json({ mode, reviewOnly: true, warnings: result.warnings, bom: bomOut, comparison: comparisonOut });
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
      whatsappMessage,
      bom: bomOut,
      comparison: comparisonOut
    });
  } catch (error: any) {
    console.error("Error in Estimate AI Route:", error);
    return NextResponse.json({ error: "فشل حساب الكميات: " + error.message }, { status: 500 });
  }
}