import { supabase } from "@/lib/supabaseClient";

const COMPOUND_BUFFER_DAYS = 2; // أيام إضافية على أول مرحلة لو المشروع داخل كمبوند (إجراءات دخول/تصاريح)

/**
 * بتولد الجدول الزمني لمشروع معين تلقائياً بناءً على:
 * 1. الأصناف (categories) الموجودة فعلياً في المقايسة المعتمدة للمشروع (مش قايمة ثابتة)
 * 2. مساحة الشقة (كل صنف له معدل أيام/100م² قابل للتعديل من schedule_duration_rules)
 * 3. هل المشروع داخل كمبوند (بيضيف أيام Buffer على أول مرحلة)
 *
 * بترجع { success, message } أو بترمي خطأ لو حصلت مشكلة.
 */
export async function generateProjectSchedule(projectId: string) {
  // 1) هل فيه جدول موجود بالفعل؟ (منع التوليد المزدوج بالغلط)
  const { data: existingPhases } = await supabase
    .from("project_schedule_phases")
    .select("id")
    .eq("project_id", projectId)
    .limit(1);

  if (existingPhases && existingPhases.length > 0) {
    throw new Error("فيه جدول زمني موجود بالفعل لهذا المشروع. لو عايز تعيد التوليد، لازم تمسح الجدول الحالي الأول.");
  }

  // 2) جلب بيانات المشروع (المساحة + هل كمبوند + تاريخ بداية مقترح)
  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .select("area, is_compound, estimate_date")
    .eq("id", projectId)
    .single();

  if (projectErr || !project) throw new Error("تعذر العثور على بيانات المشروع.");

  const area = Number(project.area || 100);

  // 3) جلب أصناف المقايسة المعتمدة الفعلية لهذا المشروع (المصدر الحقيقي لـ"محتاج إيه ولا لأ")
  const { data: header } = await supabase
    .from("estimate_headers")
    .select("id")
    .eq("project_id", projectId)
    .eq("status", "نهائية")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!header) {
    throw new Error("لازم مقايسة معتمدة (نهائية) الأول قبل توليد الجدول الزمني.");
  }

  const { data: items } = await supabase
    .from("estimate_items")
    .select("category")
    .eq("estimate_id", header.id);

  const usedCategories = Array.from(new Set((items || []).map((i: any) => i.category).filter(Boolean)));

  if (usedCategories.length === 0) {
    throw new Error("المقايسة المعتمدة مفيهاش أي بنود، مش هينفع نولد جدول زمني.");
  }

  // 4) جلب قواعد المدة لكل صنف مستخدم فعلياً
  const { data: rules } = await supabase
    .from("schedule_duration_rules")
    .select("*")
    .in("category_key", usedCategories)
    .order("sort_order", { ascending: true });

  if (!rules || rules.length === 0) {
    throw new Error("مفيش قواعد مدة معرّفة للأصناف دي. راجع جدول schedule_duration_rules.");
  }

  // 5) حساب التواريخ تسلسلياً
  const startBase = project.estimate_date ? new Date(project.estimate_date) : new Date();
  let cursor = new Date(startBase);

  const phasesToInsert = rules.map((rule: any, idx: number) => {
    const rawDays = Math.ceil((area / 100) * Number(rule.days_per_100sqm));
    const days = Math.max(rule.min_days, rawDays);

    // إضافة أيام الكمبوند على أول مرحلة بس (وقت الدخول والتصاريح بيتكرر مرة واحدة مش كل مرحلة)
    if (idx === 0 && project.is_compound) {
      cursor.setDate(cursor.getDate() + COMPOUND_BUFFER_DAYS);
    }

    const plannedStart = new Date(cursor);
    const plannedEnd = new Date(cursor);
    plannedEnd.setDate(plannedEnd.getDate() + days);
    cursor = new Date(plannedEnd);

    return {
      project_id: projectId,
      category_key: rule.category_key,
      phase_name: rule.category_label,
      sort_order: rule.sort_order,
      status: "not_started",
      planned_start_date: plannedStart.toISOString().slice(0, 10),
      planned_end_date: plannedEnd.toISOString().slice(0, 10),
    };
  });

  const { error: insertErr } = await supabase.from("project_schedule_phases").insert(phasesToInsert);
  if (insertErr) throw new Error("فشل حفظ الجدول الزمني: " + insertErr.message);

  return { success: true, message: `تم توليد ${phasesToInsert.length} مرحلة بنجاح.` };
}
