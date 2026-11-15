import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isFinishLevel } from "@/lib/finishLevels";

// مسار عام (بدون تسجيل دخول) لحاسبة التكاليف: يرجّع أسعار المتر ومدد التنفيذ فقط من جدول الإعدادات.
// لا يرجّع أي بيانات أخرى، والنتيجة تُخزَّن مؤقتاً دقيقة واحدة لتخفيف الضغط على قاعدة البيانات.

export async function GET() {
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );
    const { data, error } = await db
      .from("quick_estimate_prices")
      .select("level, min_price_per_m2, max_price_per_m2, min_days_per_100m2, max_days_per_100m2");
    if (error) throw error;

    const levels: Record<string, {
      minPricePerM2: number;
      maxPricePerM2: number;
      minDaysPer100m2: number | null;
      maxDaysPer100m2: number | null;
    }> = {};

    (data || []).forEach((r: any) => {
      const min = Number(r.min_price_per_m2);
      const max = Number(r.max_price_per_m2);
      if (!isFinishLevel(r.level) || !(min > 0) || !(max >= min)) return; // مستوى غير مضبوط
      const dmin = Number(r.min_days_per_100m2);
      const dmax = Number(r.max_days_per_100m2);
      const hasDays = dmin > 0 && dmax >= dmin;
      levels[r.level] = {
        minPricePerM2: min,
        maxPricePerM2: max,
        minDaysPer100m2: hasDays ? dmin : null,
        maxDaysPer100m2: hasDays ? dmax : null
      };
    });

    return NextResponse.json(
      { levels },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (error) {
    console.error("Public pricing error:", error);
    return NextResponse.json({ levels: {} }); // الحاسبة تستخدم الاحتياطي المؤقت
  }
}