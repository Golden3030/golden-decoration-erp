"use client";

import { useState } from "react";
import SegmentedTabs from "@/components/ui/SegmentedTabs";
import CuttingSimulator from "@/components/CRM/settings/CuttingSimulator";
import GypsumCeilingCalculator from "@/components/CRM/settings/GypsumCeilingCalculator";

// تاب محاكي القص: صف بنود الحصر (كل بند له محاكيه)، وتحته الأقسام الفرعية للبند. البنود اللي لسه ما اتبنتش بتظهر "قريباً".
// أداة قص الأعواد والأطوال (LinearCuttingSimulator) متخبية دلوقتي، وترجع مع الكهرباء والسباكة.
type Module = "ceramic" | "gypsum" | "insulation" | "masonry" | "electrical" | "plumbing";
type GypsumKind = "flat" | "light_pocket";

export default function CuttingTab() {
  const [module, setModule] = useState<Module>("ceramic");
  const [gypsum, setGypsum] = useState<GypsumKind>("flat");

  return (
    <div className="space-y-4" dir="rtl">
      <SegmentedTabs
        ariaLabel="بنود محاكي القص"
        value={module}
        onChange={setModule}
        options={[
          { key: "ceramic", label: "السيراميك" },
          { key: "gypsum", label: "الجبس بورد" },
          { key: "insulation", label: "العزل", disabled: true },
          { key: "masonry", label: "المباني", disabled: true },
          { key: "electrical", label: "الكهرباء", disabled: true },
          { key: "plumbing", label: "السباكة", disabled: true }
        ]}
      />

      {module === "ceramic" && <CuttingSimulator />}

      {module === "gypsum" && (
        <div className="space-y-4">
          <SegmentedTabs
            size="sm"
            ariaLabel="نوع السقف"
            value={gypsum}
            onChange={setGypsum}
            options={[
              { key: "flat", label: "سقف فلات" },
              { key: "light_pocket", label: "بيت نور", disabled: true }
            ]}
          />
          {gypsum === "flat" && <GypsumCeilingCalculator />}
        </div>
      )}
    </div>
  );
}