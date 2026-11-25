"use client";

import { useState } from "react";
import GoldButton from "@/components/ui/GoldButton";
import CuttingSimulator from "@/components/CRM/settings/CuttingSimulator";
import LinearCuttingSimulator from "@/components/CRM/settings/LinearCuttingSimulator";

// تاب محاكي القص: بلاط وألواح (قص ثنائي الأبعاد) أو أطوال (قص أحادي الأبعاد)
export default function CuttingTab() {
  const [mode, setMode] = useState<"2d" | "1d">("2d");
  return (
    <div className="space-y-5" dir="rtl">
      <div className="grid grid-cols-2 gap-2">
        <GoldButton toggle size="fill" active={mode === "2d"} onClick={() => setMode("2d")}>بلاط وألواح (2D)</GoldButton>
        <GoldButton toggle size="fill" active={mode === "1d"} onClick={() => setMode("1d")}>أطوال (1D)</GoldButton>
      </div>
      {mode === "2d" ? <CuttingSimulator /> : <LinearCuttingSimulator />}
    </div>
  );
}