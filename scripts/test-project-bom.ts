// اختبار مقارنة الحصر بالمقايسة. التشغيل: npx tsx scripts/test-estimate-compare.ts
import { compareTakeoffToEstimate } from "../src/lib/estimateCompare";

let fails = 0;
const eq = (name: string, got: number | null, want: number | null, tol = 0.051) => {
  const ok = got === want || (got !== null && want !== null && Math.abs(got - want) <= tol);
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: got ${got} want ${want}`);
};
const truthy = (name: string, v: boolean) => { if (!v) fails++; console.log(`${v ? "PASS" : "FAIL"}  ${name}`); };

const g = (cat: string, m: number, l: number) => ({ item: { estimate_category: cat }, materialsCost: m, laborCost: l });
const bom: any = {
  groups: [g("plaster", 800, 200), g("paint", 300, 200), g("ceiling", 300, 100)],
  lumpLabor: [{ category: "electricity", amount: 8000 }]
};
const est = [
  { category: "plaster", quantity: "10", unit_price: "80", labor_cost: 100 },     // 800 + 100 = 900
  { category: "paint", quantity: 3, unit_price: 100, labor_cost: 0 },              // 300
  { category: "flooring", quantity: 6, unit_price: 100, labor_cost: 0 },           // 600 (غير موجودة في الحصر)
  { category: "electricity", quantity: 0, unit_price: 0, labor_cost: 7500 },
  { category: "doors", quantity: 1, unit_price: 700, labor_cost: 0 },              // خارج نطاق الحصر
  { category: "engineering_fee", quantity: 1, unit_price: 5000, labor_cost: 0 }    // لازم يتجاهل
];
const covered = ["plaster", "paint", "ceiling", "electricity", "flooring"];
const r = compareTakeoffToEstimate(bom, est, covered);
const row = (c: string) => r.rows.find((x) => x.category === c)!;

eq("plaster: takeoff 1000", row("plaster").takeoffTotal, 1000);
eq("plaster: estimate 900 (string numbers parsed)", row("plaster").estimateTotal, 900);
eq("plaster: diff +100", row("plaster").diff, 100);
eq("plaster: diff pct 11.1", row("plaster").diffPct, 11.1);
truthy("plaster within 15% = match", row("plaster").status === "match");
eq("paint: diff pct 66.7", row("paint").diffPct, 66.7);
truthy("paint beyond 15% = review", row("paint").status === "review");
truthy("flooring only in estimate = only_estimate", row("flooring").status === "only_estimate" && row("flooring").takeoffTotal === 0);
truthy("ceiling only in takeoff = only_takeoff", row("ceiling").status === "only_takeoff" && row("ceiling").diffPct === null);
eq("electricity lump counted in takeoff", row("electricity").takeoffTotal, 8000);
eq("electricity diff pct 6.7", row("electricity").diffPct, 6.7);
truthy("doors not covered by takeoff", row("doors").status === "not_covered");
truthy("engineering_fee ignored", !r.rows.some((x) => x.category === "engineering_fee"));
eq("covered takeoff total = 1000+500+400+8000", r.covered.takeoff, 9900);
eq("covered estimate total = 900+300+600+7500", r.covered.estimate, 9300);
eq("covered diff", r.covered.diff, 600);
eq("covered diff pct 6.5", r.covered.diffPct, 6.5);
eq("outside-scope estimate = doors only", r.outsideScopeEstimate, 700);
truthy("rows follow the category order of the estimate", r.rows.map((x) => x.category).join() === "plaster,paint,flooring,ceiling,doors,electricity");
truthy("notes mention price-source caveat", r.notes.some((n) => n.includes("فرق سعر")));

const none = compareTakeoffToEstimate(bom, [], covered);
truthy("no estimate items: every takeoff category is only_takeoff", none.rows.every((x) => x.status === "only_takeoff") && none.covered.diffPct === null);

console.log(fails === 0 ? "\nALL TESTS PASSED" : `\n${fails} TEST(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);