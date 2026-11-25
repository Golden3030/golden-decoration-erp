// قص الأطوال (1D): بروفيلات الجبس بورد، الوزرة، المواسير، الخراطيم... قطع بأطوال مطلوبة تتقص من قضبان/لفات بطول ثابت.
// دوال بحتة. كل الأطوال بالمللي (أعداد صحيحة).
//
// المحاكاة (محددة): القطع من الأطول للأقصر، وكل قطعة بتروح لأصغر قضيب مفتوح يكفيها (best-fit)، ولو مفيش بنفتح قضيب جديد.
// المنشار (kerf) بيتخصم بين القطعتين بس، مش في آخر القضيب. القطعة الأطول من القضيب بتتقسّم (وصلة) لو التوصيل مسموح.

export interface LinearSpec {
  stockMm: number;       // طول القضيب أو اللفة
  kerfMm: number;        // سمك المنشار (بيتخصم بين كل قطعتين)
  minOffcutMm: number;   // أقل باقي صالح لإعادة الاستخدام
  allowSplice: boolean;  // قطعة أطول من القضيب تتوصّل من أكتر من قضيب
  shareBars: boolean;    // القطع تتشارك نفس القضيب (لو false كل قطعة قضيب لوحدها)
}

export interface PieceInput {
  name: string;
  lengthM: number;
  count: number;
}

export interface BarPlan {
  pieces: { name: string; lengthMm: number; spliced?: boolean }[];
  usedMm: number;        // مجموع أطوال القطع
  remainingMm: number;   // الباقي (بعد المنشار)
}

export interface LinearResult {
  bars: BarPlan[];
  totals: {
    requiredMm: number;       // مجموع الأطوال المطلوبة
    barsCount: number;        // قضبان هتتشترى
    purchasedMm: number;
    wasteMm: number;          // المشترى - المطلوب
    wastePct: number;         // من المشترى
    usableLeftovers: number;  // قضبان فيها باقي صالح >= أقل باقي
    leftoverMm: number;       // مجموع الباقي الصالح
    splices: number;          // عدد الوصلات
  };
  warnings: string[];
}

export function simulateLinear(spec: LinearSpec, pieces: PieceInput[]): LinearResult {
  const warnings: string[] = [];
  const stock = Math.round(spec.stockMm);
  const kerf = Math.max(0, Math.round(spec.kerfMm));
  const minOff = Math.max(0, Math.round(spec.minOffcutMm));
  const empty: LinearResult = {
    bars: [],
    totals: { requiredMm: 0, barsCount: 0, purchasedMm: 0, wasteMm: 0, wastePct: 0, usableLeftovers: 0, leftoverMm: 0, splices: 0 },
    warnings
  };
  if (!(stock > 0)) { warnings.push("طول العود غير صحيح."); return empty; }

  // فرد القطع (الكمية) وتقسيم الأطول من القضيب
  const list: { name: string; len: number; spliced: boolean }[] = [];
  let splices = 0;
  for (const p of pieces) {
    const len = Math.round(p.lengthM * 1000);
    const count = Math.max(0, Math.floor(p.count));
    if (!(len > 0) || count === 0) continue;
    for (let i = 0; i < count; i++) {
      if (len <= stock) {
        list.push({ name: p.name, len, spliced: false });
      } else if (spec.allowSplice) {
        let rest = len;
        while (rest > stock) { list.push({ name: p.name, len: stock, spliced: true }); rest -= stock; splices++; }
        if (rest > 0) list.push({ name: p.name, len: rest, spliced: true });
      } else {
        warnings.push(`القطعة "${p.name}" (${p.lengthM} م) أطول من العود (${stock / 1000} م) والتوصيل مقفول، فلم تُحسب.`);
        break;
      }
    }
  }

  list.sort((a, b) => b.len - a.len);
  const bars: { pieces: BarPlan["pieces"]; remaining: number; used: number }[] = [];
  for (const piece of list) {
    let best = -1;
    if (spec.shareBars) {
      bars.forEach((b, i) => {
        if (b.remaining >= piece.len && (best === -1 || b.remaining < bars[best].remaining)) best = i;
      });
    }
    if (best === -1) {
      bars.push({ pieces: [], remaining: stock, used: 0 });
      best = bars.length - 1;
    }
    const b = bars[best];
    b.pieces.push({ name: piece.name, lengthMm: piece.len, spliced: piece.spliced || undefined });
    b.used += piece.len;
    b.remaining -= Math.min(b.remaining, piece.len + kerf); // المنشار بين القطعتين بس: آخر قطعة بتاخد الباقي كله لو مفيش مكان للمنشار
  }

  const requiredMm = list.reduce((s, p) => s + p.len, 0);
  const purchasedMm = bars.length * stock;
  const leftovers = bars.filter((b) => b.remaining >= minOff && b.remaining > 0);
  return {
    bars: bars.map((b) => ({ pieces: b.pieces, usedMm: b.used, remainingMm: b.remaining })),
    totals: {
      requiredMm,
      barsCount: bars.length,
      purchasedMm,
      wasteMm: purchasedMm - requiredMm,
      wastePct: purchasedMm > 0 ? ((purchasedMm - requiredMm) / purchasedMm) * 100 : 0,
      usableLeftovers: leftovers.length,
      leftoverMm: leftovers.reduce((s, b) => s + b.remaining, 0),
      splices
    },
    warnings
  };
}