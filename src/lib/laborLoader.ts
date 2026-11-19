import { supabase } from "@/lib/supabaseClient";
import type { LaborConfig, LaborRate, PlumbingTier } from "@/lib/bomEngine";

// قراءة جداول المصنعيات (تاب المصنعيات في الإعدادات) من المتصفح، لاستخدامها في المحاكي ولوحة المقايسة
export async function fetchLaborConfig(): Promise<{ config: LaborConfig | null; error: string }> {
  const [r, p] = await Promise.all([
    supabase.from("takeoff_labor").select("*"),
    supabase.from("takeoff_plumbing_labor").select("*")
  ]);
  if (r.error || p.error) {
    return { config: null, error: "جداول المصنعيات غير جاهزة. شغّل ملف migrate_labor_rates.sql في Supabase." };
  }
  return {
    error: "",
    config: {
      rates: ((r.data || []) as any[]).map((x) => ({ ...x, rate: Number(x.rate || 0) })) as LaborRate[],
      plumbing: ((p.data || []) as any[]).map((x) => ({ ...x, bathrooms_tier: Number(x.bathrooms_tier), price: Number(x.price || 0) })) as PlumbingTier[]
    }
  };
}