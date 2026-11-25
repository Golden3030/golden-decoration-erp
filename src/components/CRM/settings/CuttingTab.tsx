"use client";

import { useState } from "react";
import GoldButton from "@/components/ui/GoldButton";
import CuttingSimulator from "@/components/CRM/settings/CuttingSimulator";
import LinearCuttingSimulator from "@/components/CRM/settings/LinearCuttingSimulator";
import GypsumCeilingCalculator from "@/components/CRM/settings/GypsumCeilingCalculator";

// تاب محاكي القص: بلاط وألواح (قص ثنائي الأبعاد) أو أطوال (قص أحادي الأبعاد)
export default function CuttingTab() {
  const [mode, setMode] = useState<"2d" | "1d" | "gypsum">("2d");
  return (
    <div className="space-y-5" dir="rtl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <GoldButton toggle size="fill" active={mode === "2d"} onClick={() => setMode("2d")}>بلاط وألواح (2D)</GoldButton>
        <GoldButton toggle size="fill" active={mode === "1d"} onClick={() => setMode("1d")}>أعواد وأطوال (1D)</GoldButton>
        <GoldButton toggle size="fill" active={mode === "gypsum"} onClick={() => setMode("gypsum")}>سقف جبس بورد فلات</GoldButton>
      </div>
      {mode === "2d" ? <CuttingSimulator /> : mode === "1d" ? <LinearCuttingSimulator /> : <GypsumCeilingCalculator />}
    </div>
  );
}