import { FINISH_LEVELS, levelDbValue, levelLabel, type FinishLevel } from "@/lib/finishLevels";

// حساب تقدير المبيعات: أرقام بحتة من جدول أسعار الإعدادات، بدون أي تخمين من الذكاء الاصطناعي.

export interface LevelRates {
  level: FinishLevel;
  minPricePerM2: number;
  maxPricePerM2: number;
  minDaysPer100m2: number;
  maxDaysPer100m2: number;
}

export interface SalesOption {
  level: FinishLevel;
  label: string;
  dbLevel: string;
  minCost: number | null;   // null = أسعار المستوى لم تُضبط في الإعدادات
  maxCost: number | null;
  minDays: number | null;   // null = مدة المستوى لم تُضبط
  maxDays: number | null;
}

export function computeOption(area: number, level: FinishLevel, rates?: LevelRates): SalesOption {
  const hasPrice = !!rates && rates.minPricePerM2 > 0 && rates.maxPricePerM2 >= rates.minPricePerM2;
  const hasDays = !!rates && rates.minDaysPer100m2 > 0 && rates.maxDaysPer100m2 >= rates.minDaysPer100m2;
  return {
    level,
    label: levelLabel(level),
    dbLevel: levelDbValue(level),
    minCost: hasPrice ? Math.round(area * rates!.minPricePerM2) : null,
    maxCost: hasPrice ? Math.round(area * rates!.maxPricePerM2) : null,
    minDays: hasDays ? Math.max(1, Math.round((area / 100) * rates!.minDaysPer100m2)) : null,
    maxDays: hasDays ? Math.max(1, Math.round((area / 100) * rates!.maxDaysPer100m2)) : null
  };
}

export function computeAllOptions(area: number, rates: LevelRates[]): SalesOption[] {
  return FINISH_LEVELS.map((l) => computeOption(area, l.key, rates.find((r) => r.level === l.key)));
}