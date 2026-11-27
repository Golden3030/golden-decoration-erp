// حاسبة العزل الأسمنتي للأرضيات (زي سيكا توب سيل 107): مساحة الأرضية + رفع العزل على الحوائط (وزرة)، وعدد المجموعات وشريط الفايبر.
// المجموعة بتتخلط كاملة (بودرة + سائل) ولا تتقسم، فعدد المجموعات بيتقرّب لأعلى.
// دوال بحتة. الأطوال بالمتر.

export interface InsulationRoom {
  name: string;
  widthM: number;
  lengthM: number;
}

export interface InsulationInput {
  rooms: InsulationRoom[];
  upturnCm: number;          // ارتفاع رفع العزل على الحوائط (20 إلى 30 سم)
  doorWidthM: number;        // عرض الباب المخصوم من محيط كل غرفة (صفر = من غير خصم)
  coveragePerKitM2: number;  // تغطية المجموعة (10 م² على وجهين حسب نشرة المنتج)
  powderKg: number;          // وزن البودرة في المجموعة (20)
  liquidKg: number;          // وزن السائل في المجموعة (5)
  shareKits: boolean;        // الغرف بتتعزل في نفس اليوم وبتتشارك المجموعات
  meshRollM: number;         // طول لفة شريط الفايبر (10 م)
  meshExtraM: number;        // زيادة شريط حوالين المواسير والبيبات (م)
}

export interface InsulationRoomResult {
  name: string;
  floorM2: number;
  perimeterM: number;        // المحيط بعد خصم الباب
  upturnM2: number;
  totalM2: number;
  kitsAlone: number;         // لو الغرفة لوحدها
}

export interface InsulationResult {
  rooms: InsulationRoomResult[];
  floorM2: number;
  upturnM2: number;
  totalM2: number;
  kits: number;              // المجموعات المطلوبة (بحسب مشاركة المجموعات)
  kitsShared: number;
  kitsSeparate: number;      // كل غرفة لوحدها
  capacityM2: number;        // تغطية المجموعات المشتراة
  utilizationPct: number;    // نسبة استهلاك المجموعات
  spareM2: number;
  powderKg: number;
  liquidKg: number;
  totalKg: number;
  meshM: number;
  meshRolls: number;
  warnings: string[];
}

const ceilKits = (area: number, coverage: number) => (area <= 0 ? 0 : Math.ceil(area / coverage - 1e-9));

export function computeInsulation(inp: InsulationInput): InsulationResult {
  const warnings: string[] = [];
  const upturnM = inp.upturnCm / 100;
  const rooms: InsulationRoomResult[] = inp.rooms
    .filter((r) => r.widthM > 0 && r.lengthM > 0)
    .map((r) => {
      const floorM2 = r.widthM * r.lengthM;
      const perimeterM = Math.max(0, 2 * (r.widthM + r.lengthM) - Math.max(0, inp.doorWidthM));
      const upturnM2 = perimeterM * upturnM;
      const totalM2 = floorM2 + upturnM2;
      return { name: r.name, floorM2, perimeterM, upturnM2, totalM2, kitsAlone: ceilKits(totalM2, inp.coveragePerKitM2) };
    });

  const floorM2 = rooms.reduce((s, r) => s + r.floorM2, 0);
  const upturnM2 = rooms.reduce((s, r) => s + r.upturnM2, 0);
  const totalM2 = floorM2 + upturnM2;
  const kitsShared = ceilKits(totalM2, inp.coveragePerKitM2);
  const kitsSeparate = rooms.reduce((s, r) => s + r.kitsAlone, 0);
  const kits = inp.shareKits ? kitsShared : kitsSeparate;
  const capacityM2 = kits * inp.coveragePerKitM2;
  const utilizationPct = capacityM2 > 0 ? (totalM2 / capacityM2) * 100 : 0;
  const meshM = rooms.reduce((s, r) => s + r.perimeterM, 0) + Math.max(0, inp.meshExtraM);
  const meshRolls = meshM > 0 && inp.meshRollM > 0 ? Math.ceil(meshM / inp.meshRollM - 1e-9) : 0;

  if (rooms.length === 0) warnings.push("أضف غرفة واحدة على الأقل بأبعادها.");
  if (kits > 0 && utilizationPct > 90) {
    warnings.push(`المساحة (${totalM2.toFixed(1)} م²) قريبة من تغطية ${kits === 1 ? "المجموعة" : "المجموعات"} (${capacityM2.toFixed(1)} م²). لو الاستهلاك الفعلي أعلى من ${inp.coveragePerKitM2} م² للمجموعة (الأسطح الخشنة بتستهلك أكتر) هتحتاج مجموعة زيادة.`);
  }
  if (inp.shareKits && kitsSeparate > kitsShared) {
    warnings.push(`مشاركة المجموعات بتوفر ${kitsSeparate - kitsShared} مجموعة عن عزل كل غرفة لوحدها، بشرط تخلط وتدهن الغرف في نفس الجلسة (المجموعة المخلوطة وقتها محدود).`);
  }

  return {
    rooms, floorM2, upturnM2, totalM2, kits, kitsShared, kitsSeparate, capacityM2, utilizationPct,
    spareM2: Math.max(0, capacityM2 - totalM2),
    powderKg: kits * inp.powderKg,
    liquidKg: kits * inp.liquidKg,
    totalKg: kits * (inp.powderKg + inp.liquidKg),
    meshM, meshRolls, warnings
  };
}