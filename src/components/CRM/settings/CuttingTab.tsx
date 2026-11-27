"use client";

import { useState } from "react";
import SegmentedTabs from "@/components/ui/SegmentedTabs";
import CuttingSimulator from "@/components/CRM/settings/CuttingSimulator";
import GypsumCeilingCalculator from "@/components/CRM/settings/GypsumCeilingCalculator";
import InsulationCalculator from "@/components/CRM/settings/InsulationCalculator";
import MasonryCalculator from "@/components/CRM/settings/MasonryCalculator";

// تاب محاكي الخامات: صف بنود الحصر (كل بند له محاكيه)، وتحته الأقسام الفرعية للبند. البنود اللي لسه ما اتبنتش بتظهر "قريباً".
// أداة قص الأعواد والأطوال (LinearCuttingSimulator) متخبية دلوقتي، وترجع مع الكهرباء والسباكة.
type Module = "ceramic" | "gypsum" | "insulation" | "masonry" | "electrical" | "plumbing";
type GypsumKind = "flat" | "light_pocket";

export default function CuttingTab() {
  const [module, setModule] = useState<Module>("ceramic");
  const [gypsum, setGypsum] = useState<GypsumKind>("flat");

  return (
    <div className="space-y-4" dir="rtl">
      <SegmentedTabs
        ariaLabel="بنود محاكي الخامات"
        value={module}
        onChange={setModule}
        options={[
          { key: "ceramic", label: "السيراميك" },
          { key: "gypsum", label: "الجبس بورد" },
          { key: "insulation", label: "العزل" },
          { key: "masonry", label: "المباني" },
          { key: "electrical", label: "الكهرباء", disabled: true },
          { key: "plumbing", label: "السباكة", disabled: true }
        ]}
      />

      {module === "ceramic" && <CuttingSimulator />}

      {module === "insulation" && <InsulationCalculator />}

      {module === "masonry" && <MasonryCalculator />}

      {module === "gypsum" && (
        <div className="space-y-4">
          <SegmentedTabs
            size="sm"
            ariaLabel="نوع السقف"
            value={gypsum}
            onChange={setGypsum}
            options={[
              { key: "flat", label: "سقف فلات" },
              { key: "light_pocket", label: "بيت نور" }
            ]}
          />
          {gypsum === "flat" && <GypsumCeilingCalculator key="flat" />}
          {gypsum === "light_pocket" && <GypsumCeilingCalculator key="pocket" pocket />}
        </div>
      )}
    </div>
  );
}