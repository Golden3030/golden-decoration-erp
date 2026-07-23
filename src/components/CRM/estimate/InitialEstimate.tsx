"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useCRM } from "@/components/CRM/context/CRMContext";
import { supabase } from "@/lib/supabaseClient";
import EstimateHeader from "./EstimateHeader";
import EstimateTable from "./EstimateTable";
import EstimateTotals from "./EstimateTotals";
import { categoryNames } from "./EstimateTable";
import { 
  Calculator, 
  ShieldAlert, 
  Sparkles, 
  Layers
} from "lucide-react";

interface VentilationProps {
  projectId: string;
}

// واجهة تعريف منتجات التهوية والشفاطات من سوبابيز
interface VentProductItem {
  id: string;
  code: string;
  product_name: string;
  category: string;
  company: string;
  price: number;
  unit: string;
  subcategory?: string;
}

// واجهة البند الفردي لجدول الحصر التفصيلي
interface VentLineItem {
  key: string;
  label: string;
  qty: number;
  unit: string;
  price: number;
  product_id: string;  
  company: string;
  isCustom?: boolean;
}

// مصفوفة تعريب الفئات الهندسية المعتمدة محلياً
const localCategoryNames: Record<string, string> = {
  archMod: "تعديل معماري وتكسير",
  masonry: "أعمال مباني وطوب",
  plaster: "بياض محارة وترميم",
  paint: "دهانات ونقاشة",
  flooring: "أرضيات وتكسيات",
  ceiling: "أسقف معلقة وجبس بورد",
  doors: "أبواب ونجارة",
  aluminum: "قطاعات ألوميتال",
  electricity: "تأسيس وتشطيب كهرباء",
  plumbing: "تأسيس وتشطيب سباكة",
  ac: "تجهيزات تكييف وHVAC",
  waterproofing: "عزل رطوبة وحرارة",
  metalWorks: "أعمال كريتال ومعادن",
  decorations: "ديكورات وجماليات",
  ventilation: "تهوية وشفاطات"
};

// محرك التفريد الهندسي والمالي التلقائي الشامل لكافة مدخلات وأمتار التبويبات الـ 15 بالمقايسة
export function generateDetailedBOQ(crmData: any, dbMaterials: any[], dbSpecs: any[]) {
  const area = Number(crmData.project?.area || 0);
  const rooms = Number(crmData.project?.roomsCount || 0);
  const bathrooms = Number(crmData.project?.bathroomsCount || 0);
  const kitchens = Number(crmData.project?.kitchensCount || 0);
  const balconies = Number(crmData.project?.balconiesCount || 0);

  const DECOR_WALL_FLAT_RATE = 4500; 

  const generated: any[] = [];
  const finishing = crmData.finishing || {};

  // 1. أعمال التعديل المعماري والتكسير
  const archMod = finishing.archMod || {};
  if (archMod.enabled) {
    const demolitionQty = Number(archMod.demolitionQty || 0);
    const demoRates = archMod.rates || {};
    const demoLabLumpSum = Number(demoRates.demolitionLab || 0); 
    const demoMatLumpSum = Number(demoRates.demolitionMat || 0); 

    if (demoLabLumpSum > 0) {
      generated.push({
        id: "gen-arch-demo-labor",
        category: "archMod",
        name: "إجمالي مصنعية أعمال تكسير وهدم جدران قاطعة",
        unit: "مقطوعية",
        quantity: 1,
        unitPrice: 0, 
        laborCost: demoLabLumpSum, 
        description: `أعمال تكسير وهدم الجدران القديمة بالموقع (حصر هندسي وصفي: ${demolitionQty} متر طولي).`
      });
    }

    if (demoMatLumpSum > 0) {
      generated.push({
        id: "gen-arch-transport-labor",
        category: "archMod",
        name: "تكاليف نقل الأنقاض والتشوين واللوجستيات الميدانية",
        unit: "مقطوعية",
        quantity: 1,
        unitPrice: 0, 
        laborCost: demoMatLumpSum, 
        description: "أعمال تنزيل ونقل مخلفات الهدم خارج الوحدة وتجهيز الموقع وتشوين المعدات."
      });
    }
  }

  // 2. أعمال المباني والطوب
  const masonry = finishing.masonry || {};
  if (masonry.enabled) {
    const masonryRates = masonry.rates || {};
    const bricks = Number(masonry.brickCount || 0);
    const brickUnitPrice = Number(masonry.brickPrice ?? 1800); 
    if (bricks > 0) {
      generated.push({
        id: "gen-masonry-bricks",
        category: "masonry",
        name: "توريد طوب طفلي مفرغ أحمر مقاس قياسي للموقع",
        unit: "ألف طوبة",
        quantity: bricks / 1000,
        unitPrice: brickUnitPrice,
        laborCost: 0,
        description: `توريد طوب بناء أحمر مفرغ (إجمالي العدد: ${bricks} طوبة) شامل التعتيق والتشوين.`
      });
    }

    const cement = Number(masonry.cementBags || 0);
    const cementUnitPrice = Number(masonry.cementPrice ?? 200); 
    if (cement > 0) {
      generated.push({
        id: "gen-masonry-cement",
        category: "masonry",
        name: "أسمنت بورتلاندي عادي معتمد لأعمال المباني",
        unit: "شكارة",
        quantity: cement,
        unitPrice: cementUnitPrice,
        laborCost: 0,
        description: "توريد أسمنت رمادي ممتاز لاستخدامه في المونة الأسمنتية لبناء الحوائط والقواطيع."
      });
    }

    const sand = Number(masonry.sandMeters || 0);
    const sandUnitPrice = Number(masonry.sandPrice ?? 250); 
    if (sand > 0) {
      generated.push({
        id: "gen-masonry-sand",
        category: "masonry",
        name: "رمل نقي مصفى ومغسول لأعمال المباني",
        unit: "م³",
        quantity: sand,
        unitPrice: sandUnitPrice,
        laborCost: 0,
        description: "توريد رمل حرش مصفى خالي من الأملاح والشوائب لأعمال بناء الجدران."
      });
    }

    const masonryLabor = Number(masonryRates.laborLumpSum || 0);
    if (masonryLabor > 0) {
      generated.push({
        id: "gen-masonry-labor-lump",
        category: "masonry",
        name: "إجمالي مصنعيات وأجور بناء حوائط وقواطيع التقسيم",
        unit: "مقطوعية",
        quantity: 1,
        unitPrice: 0,
        laborCost: masonryLabor,
        description: "أجور بناء القواطيع الداخلية وتعديل المسطحات المعمارية شاملة الكانات الحديدية والربط الإنشائي."
      });
    }
  }

  // 3. أعمال بياض المحارة
  const plaster = finishing.plaster || {};
  if (plaster.enabled) {
    const totalPlasterArea = Number(plaster.wallArea || 0) + (plaster.includeCeilings ? Number(plaster.ceilingArea || 0) : 0);

    const PLASTER_SPEC_RATES: Record<string, number> = {
      tarbeeh_taakees: 140,
      boaj_awtar: 120,
      qada_zeraa: 100,
    };
    const PLASTER_SPEC_NAMES: Record<string, string> = {
      tarbeeh_taakees: 'تربيع وتأكيس',
      boaj_awtar: 'بؤج وأوتار',
      qada_zeraa: 'قدة وذراع',
    };

    const plasterSpecDb =
      dbSpecs.find((s: any) => s.category === 'plaster' && s.code === plaster.selectedSpecCode) ||
      dbSpecs.find((s: any) => {
        if (s.category !== 'plaster') return false;
        if (plaster.selectedSpecCode === 'qada_zeraa') return s.spec_name?.includes('قدة') || s.spec_name?.includes('ذراع');
        if (plaster.selectedSpecCode === 'boaj_awtar') return s.spec_name?.includes('بؤج') || s.spec_name?.includes('أوتار');
        if (plaster.selectedSpecCode === 'tarbeeh_taakees') return s.spec_name?.includes('تربيع') || s.spec_name?.includes('تأكيس');
        return false;
      });

    const activeLaborRate = Number(
      plasterSpecDb?.base_rate ?? PLASTER_SPEC_RATES[plaster.selectedSpecCode] ?? 120
    );
    const specName = PLASTER_SPEC_NAMES[plaster.selectedSpecCode] || "";

    if (totalPlasterArea > 0) {
      generated.push({
        id: "plaster-labor-struct",
        category: "plaster",
        name: `أعمال ومصنعيات بياض محارة (${specName})`,
        unit: "م²",
        quantity: totalPlasterArea,
        unitPrice: 0,
        laborCost: totalPlasterArea * activeLaborRate,
        description: `بياض محارة بمواصفة ${specName} بسعر متر متغير (${activeLaborRate} ج.م).`
      });
    }

    const requiredCement = Math.ceil(totalPlasterArea * 0.25);
    const requiredSand = Number((totalPlasterArea * 0.025).toFixed(2));
    
    const cementProd = dbMaterials.find(m => m.id === plaster.selectedCementId);
    const sandProd = dbMaterials.find(m => m.id === plaster.selectedSandId);

    if (requiredCement > 0) {
      generated.push({
        id: "plaster-mat-cement",
        category: "plaster",
        name: cementProd ? cementProd.product_name : "أسمنت بورتلاندي للمحارة",
        unit: "شكارة",
        quantity: requiredCement,
        unitPrice: cementProd ? Number(cementProd.price) : 200,
        laborCost: 0,
        description: "توريد أسمنت رمادي ممتاز لأعمال اللياسة والبطانة الإنشائية للغرف."
      });
    }

    if (requiredSand > 0) {
      generated.push({
        id: "plaster-mat-sand",
        category: "plaster",
        name: sandProd ? sandProd.product_name : "رمل مصفى ومغسول للمحارة",
        unit: "م³",
        quantity: requiredSand,
        unitPrice: sandProd ? Number(sandProd.price) : 250,
        laborCost: 0,
        description: "توريد رمل مصفى خالي من الأملاح والشوائب لأعمال المحارة."
      });
    }

    const accessories = [
      { id: 'mesh-metal', name: 'شبك سلك تمديد مجلفن', qty: plaster.meshMetalQty, price: plaster.meshMetalPrice, unit: 'لفة' },
      { id: 'mesh-fiber', name: 'شبك فايبر معالجة شروخ', qty: plaster.meshFiberQty, price: plaster.meshFiberPrice, unit: 'بكرة' },
      { id: 'nails', name: 'مسامير وورد تثبيت الشبك', qty: plaster.nailsBoxesQty, price: plaster.nailsBoxPrice, unit: 'علبة' }
    ];

    accessories.forEach(acc => {
      if (Number(acc.qty) > 0) {
        generated.push({
          id: `plaster-acc-${acc.id}`,
          category: "plaster",
          name: acc.name,
          unit: acc.unit,
          quantity: Number(acc.qty),
          unitPrice: Number(acc.price),
          laborCost: 0,
          description: "توريد مستلزمات وإكسسوارات تدعيم أعمال المحارة للحوائط والأسقف الميدانية."
        });
      }
    });

    const logisticsTotal = Number(plaster.waterLogisticsFlat || 0) + Number(plaster.logisticsFlat || 0);
    if (logisticsTotal > 0) {
      generated.push({
        id: "plaster-logistics-main",
        category: "plaster",
        name: "تكاليف لوجستية (مياه خلط + رفع وتشوين المون بالدور)",
        unit: "مقطوعية",
        quantity: 1,
        unitPrice: 0,
        laborCost: logisticsTotal,
        description: "تكلفة نقل وتشوين اسمنت ورمل لبند المحارة بالوحدة."
      });
    }
  } else if (plaster.isRepairsEnabled) {
    const rep = plaster.repairsData || {};
    if (Number(rep.laborCost) > 0) {
      generated.push({
        id: "plaster-rep-labor",
        category: "plaster",
        name: "مصنعية مرمات محارة وترميم الحوائط ",
        unit: "مقطوعية",
        quantity: 1,
        unitPrice: 0,
        laborCost: Number(rep.laborCost),
        description: rep.description
      });
    }
    const repairMats = [
      { name: 'أسمنت مرمات', qty: rep.repairsCementQty, price: 200, unit: 'شكارة' },
      { name: 'رمل مرمات', qty: rep.repairsSandQty, price: 250, unit: 'م³' },
      { name: 'جبس سريع', qty: rep.repairsGypsumQty, price: 120, unit: 'شكارة' }
    ];
    repairMats.forEach((m, i) => {
      if(Number(m.qty) > 0) {
        generated.push({
          id: `plaster-rep-mat-${i}`,
          category: "plaster",
          name: m.name,
          unit: m.unit,
          quantity: Number(m.qty),
          unitPrice: Number(m.price),
          laborCost: 0,
          description: "خامات ومواد موردة لأعمال الترميم والمرمات الميدانية بالجدران."
        });
      }
    });
  }

  // 4. أعمال الدهانات والنقاشة
  const paint = finishing.paint || {};
  if (paint.enabled) {
    const wallArea = Number(paint.wallArea || area * 3);
    
    const prepMaterials = paint.customPrepProducts || [];
    prepMaterials.forEach((item: any) => {
      if (item.quantity > 0) {
        generated.push({
          id: `paint-prep-${item.id}`,
          category: "paint",
          name: `${item.name} - (تأسيس: ${item.company})`,
          unit: item.unit || "بستلة",
          quantity: Number(item.quantity),
          unitPrice: Number(item.price || 0),
          laborCost: 0,
          description: `توريد خامات التأسيس والمعجون من براند ${item.company} المعتمد فنياً لتشطيب الجدران.`
        });
      }
    });

    const finishMaterials = paint.customProducts || [];
    finishMaterials.forEach((item: any) => {
      if (item.quantity > 0) {
        generated.push({
          id: `paint-finish-${item.id}`,
          category: "paint",
          name: `${item.name} - (تشطيب: ${item.company})`,
          unit: item.unit || "بستلة",
          quantity: Number(item.quantity),
          white: true,
          unitPrice: Number(item.price || 0),
          laborCost: 0,
          description: `توريد دهانات الوجه النهائي والألوان المعتمدة من شركة ${item.company} للشقة بالكامل.`
        });
      }
    });

    const activeLaborRate = Number(paint.laborRate || 45);
    if (activeLaborRate > 0) {
      generated.push({
        id: "gen-paint-labor-main",
        category: "paint",
        name: "أعمال ومصنعيات النقاشة والدهانات (جدران وأسقف الشقة بالكامل)",
        unit: "م²",
        quantity: wallArea,
        unitPrice: 0,
        laborCost: wallArea * activeLaborRate,
        description: " مصنعية الفنيين تشمل العزل والصنفرة والتلقيط والبطانة والدهان ."
      });
    }

    const decorCount = Number(paint.decorWallsCount || 0);
    if (decorCount > 0) {
      generated.push({
        id: "gen-paint-decor-walls",
        category: "paint",
        name: `ترقية حوائط ديكورية / ورق حائط / قطيفة (عدد: ${decorCount})`,
        unit: "جدار",
        quantity: decorCount,
        unitPrice: DECOR_WALL_FLAT_RATE,
        laborCost: decorCount * 1500, 
        description: "توريد وتركيب حوائط تميز (Accent Walls) بخامات ديكورية خاصة شاملة المصنعية الميدانية الفنية."
      });
    }
  }

  // 5. أعمال الأرضيات والتكسيات
  const flooring = finishing.flooring || {};
  if (flooring.enabled && flooring.items) {
    const rowKeys = [
      { key: 'reception', label: ' أرضيات الريسبشن ' },
      { key: 'rooms', label: ' أرضيات غرف النوم والمعيشة' },
      { key: 'kitchen_floor', label: ' أرضيات المطبخ الرئيسي' },
      { key: 'bathroom_floor', label: ' أرضيات الحمام الرئيسي' },
      { key: 'kitchen_walls', label: 'سيراميك جدران وحوائط المطبخ' },
      { key: 'bathroom_walls', label: 'سيراميك جدران وحوائط الحمام' },
      { key: 'skirting', label: ' الوزرة المضيئة الليد' }
    ];

    rowKeys.forEach((row) => {
      const current = flooring.items[row.key];
      if (current && current.qty > 0) {
        const prod = dbMaterials.find(p => p.id === current.product_id);
        const pName = prod ? prod.product_name : `${row.label} (${current.company})`;
        
        generated.push({
          id: `gen-flooring-${row.key}`,
          category: "flooring",
          name: pName,
          unit: row.key === 'skirting' ? "م.ط" : "م²",
          quantity: current.qty,
          unitPrice: current.price || 0,
          laborCost: 0,
          description: `توريد خامات السيراميك والبورسلين المعتمدة لموقع العميل شامل الشحن والتوصيل.`
        });
      }
    });

    if (flooring.cement_bags > 0) {
      generated.push({
        id: "gen-flooring-cement",
        category: "flooring",
        name: "أسمنت بورتلاندي ممتاز لتركيب البلاط والسيراميك",
        unit: "شكارة",
        quantity: flooring.cement_bags,
        unitPrice: 200, 
        laborCost: 0,
        description: "أسمنت معتمد للمونة الأسمنتية لاعمال الأرضيات والحوائط."
      });
    }

    if (flooring.sand_m3 > 0) {
      generated.push({
        id: "gen-flooring-sand",
        category: "flooring",
        name: "رمل لتأسيس أسفل السيراميك والبورسلين",
        unit: "م³",
        quantity: flooring.sand_m3,
        unitPrice: 250, 
        laborCost: 0,
        description: "رمل للتسوية وتأسيس ردم السيراميك لمنع الهبوط مستقبلاً."
      });
    }

    if (flooring.grout_product_id && flooring.grout_qty > 0) {
      const groutProd = dbMaterials.find(p => p.id === flooring.grout_product_id);
      generated.push({
        id: "gen-flooring-grout",
        category: "flooring",
        name: groutProd ? groutProd.product_name : "مادة سقية وترويبة فواصل السيراميك المانعة للتسريب",
        unit: "شكارة",
        quantity: flooring.grout_qty,
        unitPrice: flooring.grout_price || 0,
        laborCost: 0,
        description: "مادة ترويب فواصل الأرضيات والحوائط تمنع تسريبات المياه بالحمامات والمطابخ."
      });
    }

    const floorArea = (Number(flooring.items.reception?.qty) || 0) + 
                      (Number(flooring.items.rooms?.qty) || 0) + 
                      (Number(flooring.items.kitchen_floor?.qty) || 0) + 
                      (Number(flooring.items.bathroom_floor?.qty) || 0);

    const wallArea = (Number(flooring.items.kitchen_walls?.qty) || 0) + 
                     (Number(flooring.items.bathroom_walls?.qty) || 0);

    const skirtingQty = Number(flooring.items.skirting?.qty) || 0;

    const floorLaborRate = Number(flooring.labor?.floor_rate || 90);
    const wallLaborRate = Number(flooring.labor?.wall_rate || 110);
    const skirtingLaborRate = Number(flooring.labor?.skirting_rate || 30);

    if (floorArea > 0) {
      generated.push({
        id: "gen-flooring-labor-floor",
        category: "flooring",
        name: "مصنعية تركيب الأرضيات السيراميك اوالبورسلين ",
        unit: "م²",
        quantity: floorArea,
        unitPrice: 0,
        laborCost: floorArea * floorLaborRate,
        description: "مصنعية تركيب الأرضيات والسيراميك اوالبورسلين بالرباط المعتمد ."
      });
    }

    if (wallArea > 0) {
      generated.push({
        id: "gen-flooring-labor-walls",
        category: "flooring",
        name: "مصنعية تركيب سيراميك الحوائط والمطابخ ",
        unit: "م²",
        quantity: wallArea,
        unitPrice: 0,
        laborCost: wallArea * wallLaborRate,
        description: " مصنعية فنيين لتركيب سيراميك حوائط المطابخ والحمامات ."
      });
    }

    if (skirtingQty > 0) {
      generated.push({
        id: "gen-flooring-labor-skirting",
        category: "flooring",
        name: `مصنعية تركيب الوزرة الحائطية (${flooring.skirting_type === 'concealed_led' ? 'مخفية مضيئة ليد' : flooring.skirting_type === 'concealed' ? 'مخفية مستوية' : 'بارزة عادية'})`,
        unit: "م.ط",
        quantity: skirtingQty,
        unitPrice: 0,
        laborCost: skirtingQty * skirtingLaborRate,
        description: "مصنعات قص وتركيب الوزر ونحت الجدران لتأسيس الممر لضمان الاستواء الهندسي المستوي."
      });
    }

    const transportCost = Number(flooring.logistics?.transport || 1500);
    const cleaningCost = Number(flooring.logistics?.cleaning || 800);

    if (transportCost > 0) {
      generated.push({
        id: "gen-flooring-transport",
        category: "flooring",
        name: "تكاليف نقل وتتشوين وتنزيل السيراميك والمواد بالدور  ",
        unit: "مقطوعية",
        quantity: 1,
        unitPrice: transportCost,
        laborCost: 0,
        description: "تكلفة نقل وتشوين السيراميك للأدوار العليا ."
      });
    }

    if (cleaningCost > 0) {
      generated.push({
        id: "gen-flooring-cleaning",
        category: "flooring",
        name: "أعمال النظافة والرفع وتشوين مخلفات السيراميك بالموقع خارج الوحدة",
        unit: "مقطوعية",
        quantity: 1,
        unitPrice: cleaningCost,
        laborCost: 0,
        description: "أعمال تنظيف الموقع وتعبئة مخلفات السيراميك والأسمنت ورفعها خارج الوحدة السكنية."
      });
    }
  }

  // 6. أعمال الأسقف المعلقة والجبس بورد
  const ceiling = finishing.ceiling || {};
  if (ceiling.enabled && ceiling.spacesConfig) {
    const MAGNETIC_TRACK_RATE = 1500; 
    const LED_PROFILE_RATE = 350;     
    const SHADOW_GAP_RATE = 120;      
    const SHADOW_GAP_LIGHT_RATE = 240;

    Object.entries(ceiling.spacesConfig).forEach(([id, config]: [string, any]) => {
      if (config.enabled && config.area > 0) {
        const match = dbSpecs.find(s => s.code === config.type || s.uuid === config.type);
        const price = match ? Number(match.base_rate) : (config.type === 'flat_gypsum' ? 220 : 280);
        generated.push({
          id: `gen-ceiling-space-${id}`,
          category: "ceiling",
          name: `أعمال أسقف جبس بورد (${config.type === 'flat_gypsum' ? 'سقف فلات مستوي' : 'فلات مع بيت نور'})`,
          unit: "م²",
          quantity: config.area,
          unitPrice: price,
          laborCost: config.area * 50, 
          description: "توريد وتركيب ألواح جبس بورد كناوف سمك 12.5 مم بالقطاعات المعدنية المعتمدة صاج مجلفن."
        });
      }
    });

    if (Number(ceiling.magneticTrack) > 0) {
      generated.push({
        id: "gen-ceiling-mag-track",
        category: "ceiling",
        name: "تأسيس مسار إضاءة بالأسقف (Magnetic Track)",
        unit: "م.ط",
        quantity: Number(ceiling.magneticTrack),
        unitPrice: MAGNETIC_TRACK_RATE,
        laborCost: 0,
        description: "تأسيس صاج المجرى لتركيب مسارات الإضاءة بالأسقف."
      });
    }

    if (Number(ceiling.ledProfile) > 0) {
      generated.push({
        id: "gen-ceiling-led-profile",
        category: "ceiling",
        name: "توريد وتركيب ليد بروفايل مدمج بالأسقف الجبسية الحديثة",
        unit: "م.ط",
        quantity: Number(ceiling.ledProfile),
        unitPrice: LED_PROFILE_RATE,
        laborCost: 0,
        description: "شق وتثبيت شرائح الألمنيوم والناشر الأبيض ولصق الليد بروفايل بالأسقف ."
      });
    }

    if (Number(ceiling.shadowGap) > 0) {
      generated.push({
        id: "gen-ceiling-shadow-gap",
        category: "ceiling",
        name: "أعمال زاوية ظل فواصل الجدران بالأسقف (Shadow Gap)",
        unit: "م.ط",
        quantity: Number(ceiling.shadowGap),
        unitPrice: SHADOW_GAP_RATE,
        laborCost: 0,
        description: "زاوية ظل فواصل الأسقف والجدران تمنع حدوث أي تشققات أو تنميل بالجبس بورد المعلق."
      });
    }

    if (Number(ceiling.shadowGapLight) > 0) {
      generated.push({
        id: "gen-ceiling-shadow-gap-light",
        category: "ceiling",
        name: "زاوية ظل إنارة ليد عائمة بالأسقف (Shadow Gap Light)",
        unit: "م.ط",
        quantity: Number(ceiling.shadowGapLight),
        unitPrice: SHADOW_GAP_LIGHT_RATE,
        laborCost: 0,
        description: "زاوية ظل عائمة مخصصة لإنارة ليد مخفية ممتدة مع أطراف حوائط الوحدة بالكامل."
      });
    }
  }

  // 7. أعمال أبواب ونجارة الشقة
  const doors = finishing.doors || {};
  if (doors.enabled && doors.doorSpecs) {
    doors.doorSpecs.forEach((spec: any) => {
      if (spec.quantity > 0) {
        const activeRate = spec.custom_rate !== undefined ? spec.custom_rate : spec.base_rate;
        generated.push({
          id: `gen-doors-${spec.uuid}`,
          category: "doors",
          name: spec.spec_name,
          unit: "باب",
          quantity: spec.quantity,
          unitPrice: activeRate,
          laborCost: doors.hasInstallationLabor ? spec.quantity * (doors.accessoriesRates?.installationLaborPrice ?? 600) : 0,
          description: "توريد خامة الباب الخشبي المعتمدة باللون والإكسسوارات شامل الحلق والتركيب والدهان."
        });
      }
    });

    if (doors.customWorks && Array.isArray(doors.customWorks)) {
      doors.customWorks.forEach((work: any) => {
        if (work.quantity > 0) {
          generated.push({
            id: `gen-doors-custom-${work.id}`,
            category: "doors",
            name: work.name,
            unit: work.unit || "عدد",
            quantity: work.quantity,
            unitPrice: work.rate || 0,
            description: "بند أعمال خشبية مخصص إضافي (تجليد / ديكور خشبي) بناءً على رغبة العميل المعمارية."
          });
        }
      });
    }
  }

  // 8. أعمال قطاعات الألوميتال والشبابيك
  const aluminum = finishing.aluminum || {};
  if (aluminum.enabled && aluminum.windows) {
    const rates = aluminum.accessoriesRates || {};
    
    aluminum.windows.forEach((win: any) => {
      const areaSize = (win.width ?? 0) * (win.height ?? 0);
      const isSmall = win.roomName.includes('قلاب') || (win.width <= 0.61 && win.height <= 0.61);

      if (isSmall) {
        generated.push({
          id: `gen-aluminum-win-small-${win.id}`,
          category: "aluminum",
          name: `توريد وتركيب شباك قلاب صغير عازل بمقاس محدد (${win.roomName})`,
          unit: "فتحة شباك",
          quantity: 1,
          unitPrice: rates.smallWindowRate ?? 1500,
          laborCost: 0,
          description: "توريد وتركيب شباك قلاب صغير للحمام أو المطبخ بالقطاع ومواد التثبيت والزجاج المعتمدة."
        });
      } else if (areaSize > 0) {
        const sectorPrice = rates.sectorOverrides?.[win.sectorUuid] !== undefined
          ? rates.sectorOverrides[win.sectorUuid]
          : 4500; 

        const glassPrice = win.glassType === 'double'
          ? (rates.glassDoubleRate ?? 1200)
          : (win.glassType === 'georgia' ? (rates.glassGeorgiaRate ?? 2200) : 0);

        const screenPrice = win.screenType === 'pleated' ? (rates.screenPleatedRate ?? 800) : 0;

        generated.push({
          id: `gen-aluminum-win-large-${win.id}`,
          category: "aluminum",
          name: `${win.roomName} (${win.openingStyle === 'sliding' ? 'جرار فتح مزدوج' : 'مفصلي'})`,
          unit: "م²",
          quantity: areaSize,
          unitPrice: sectorPrice + glassPrice,
          laborCost: screenPrice, 
          description: `شباك ألوميتال دبل عازل تماماً للأتربة والضوضاء، باللون المختار من العميل: ${win.paintColor || 'أسود مطفي'}.`
        });
      }
    });

    if (aluminum.hasTransportation && (rates.transportationPrice ?? 1500) > 0) {
      generated.push({
        id: "gen-aluminum-transport",
        category: "aluminum",
        name: "تكاليف نقل وتشوين قطاعات الألوميتال والزجاج بالدور يدوياً",
        unit: "مقطوعية",
        quantity: 1,
        unitPrice: rates.transportationPrice,
        laborCost: 0,
        description: "تكلفة نقل الزجاج والقطاعات لموقع العميل     ."
      });
    }
  }

  // 9. أعمال تأسيس وتشطيب الكهرباء المعتمدة
  const electricity = finishing.electricity || {};
  if (electricity.enabled) {
    const rates = electricity.accessoriesRates || {};

    if (electricity.roughInActive) {
      if (Number(electricity.backboxCount) > 0) {
        generated.push({
          id: "gen-elec-backbox",
          category: "electricity",
          name: "علب كهرباء ماجيك للتأسيس ",
          unit: "علبة",
          quantity: Number(electricity.backboxCount),
          unitPrice: rates.backboxRate ?? 8,
          laborCost: 0,
          description: "علب ماجيك لتأسيس مخارج البرايز والمفاتيح وشبكة التيار الخفيف والوايفاي."
        });
      }

      if (Number(electricity.floorConduitCount) > 0) {
        generated.push({
          id: "gen-elec-floor-conduit",
          category: "electricity",
          name: "خراطيم أرضيات بلاستيك 16مم معتمدة ",
          unit: "لفة",
          quantity: Number(electricity.floorConduitCount),
          unitPrice: rates.floorConduitRate ?? 180,
          laborCost: 0,
          description: "خراطيم ارضيات معتمدة تمر تحت السيراميك لحفظ وتمديد الأسلاك."
        });
      }

      if (Number(electricity.wallConduitCount) > 0) {
        generated.push({
          id: "gen-elec-wall-conduit",
          category: "electricity",
          name: "خراطيم الحوائط المعتمدة  لتأسيس التمديد",
          unit: "لفة",
          quantity: Number(electricity.wallConduitCount),
          unitPrice: rates.wallConduitRate ?? 220,
          laborCost: 0,
          description: "خراطيم حوائط  معتمدة تمر بداخل الحوائط لحفظ مسار الأسلاك ."
        });
      }

      if (electricity.wiresList && Array.isArray(electricity.wiresList)) {
        electricity.wiresList.forEach((wire: any) => {
          if (wire.quantity > 0) {
            generated.push({
              id: `gen-elec-wire-${wire.id}`,
              category: "electricity",
              name: wire.wireType,
              unit: "لفة",
              quantity: wire.quantity,
              unitPrice: wire.rate,
              laborCost: 0,
              description: "أسلاك نحاسية معتمدة من براند السويدي لتغذية نقاط الإنارة والقوى والأجهزة الثقيلة."
            });
          }
        });
      }

      if (electricity.hasMainPanel && electricity.selectedMainPanelId) {
        const prod = dbMaterials.find(m => m.id === electricity.selectedMainPanelId);
        generated.push({
          id: "gen-elec-main-panel",
          category: "electricity",
          name: prod ? prod.product_name : "لوحة كهرباء رئيسية",
          unit: "علبة",
          quantity: 1,
          unitPrice: rates.mainPanelRate ?? 1800,
          laborCost: 0,
          description: "لوحة توزيع كهرباء رئيسية معتمدة  لحماية الوحدة بالكامل وأمان المطبخ."
        });
      }

      if (electricity.hasLowCurrentPanel && electricity.selectedLowCurrentPanelId) {
        const prod = dbMaterials.find(p => p.id === electricity.selectedLowCurrentPanelId);
        generated.push({
          id: "gen-elec-low-panel",
          category: "electricity",
          name: prod ? prod.product_name : "لوحة تيار خفيف وداتا ووايفاي بالوحدة ",
          unit: "علبة",
          quantity: 1,
          unitPrice: rates.lowCurrentPanelRate ?? 1200,
          laborCost: 0,
          description: "لوحة مخصصة للراوتر ووايفاي والسنترال وشبكة الداتا بالوحدة لمنع التشوه البصري للكابلات."
        });
      }

      if (Number(electricity.automaticBreakerCount) > 0) {
        generated.push({
          id: "gen-elec-breakers",
          category: "electricity",
          name: "قواطع كهربائية ومفاتيح عمومية أوتوماتيك معتمدة ",
          unit: "قاطع",
          quantity: Number(electricity.automaticBreakerCount),
          unitPrice: rates.automaticBreakerRate ?? 180,
          laborCost: 0,
          description: "مفاتيح أوتوماتيك عمومية لحماية أجهزة التكييف والإنارة والقوى."
        });
      }

      const totalRoughInLabor = Number(electricity.roughInLaborCost ?? 12000); 
      generated.push({
        id: "gen-elec-rough-labor",
        category: "electricity",
        name: " مصنعية تأسيس كهرباء الوحدة",
        unit: "مقطوعية",
        quantity: 1,
        unitPrice: 0,
        laborCost: totalRoughInLabor,
        description: "مصنعية تأسيس كهرباء الوحدة ."
      });
    }

    if (electricity.finishingActive) {
      const brandMultipliers: Record<string, number> = {
        venus: 1.0,
        bticino: 1.5,
        legrand: 2.2
      };
      const multiplier = brandMultipliers[electricity.selectedBrand] ?? 1.0;

      const rateSwitch = (rates.rateSwitch ?? 35) * multiplier;
      const ratePlug = (rates.ratePlug ?? 45) * multiplier;
      const ratePlate = (rates.ratePlate ?? 25) * multiplier;
      const rateFrame = (rates.rateFrame ?? 15) * multiplier;

      if (Number(electricity.switchCount) > 0) {
        generated.push({
          id: "gen-elec-switches",
          category: "electricity",
          name: `لقم مفاتيح إنارة عادية وتفاعل وتوصيل براند (${electricity.selectedBrand})`,
          unit: "قطعة",
          quantity: Number(electricity.switchCount),
          unitPrice: rateSwitch,
          laborCost: 0,
          description: "لقم مفاتيح إنارة كلاسيك متميزة لتشغيل مخارج الإضاءة   ."
        });
      }

      if (Number(electricity.plugCount) > 0) {
        generated.push({
          id: "gen-elec-plugs",
          category: "electricity",
          name: `لقم برايز ومآخذ شواحن وقوى مجهزة ومحمية (${electricity.selectedBrand})`,
          unit: "قطعة",
          quantity: Number(electricity.plugCount),
          unitPrice: ratePlug,
          laborCost: 0,
          description: "برايز ومآخذ كهربائية شواحن ومخارج أجهزة مخصصة للغرف والريسبشن."
        });
      }

      if (Number(electricity.plateCount) > 0) {
        generated.push({
          id: "gen-elec-plates",
          category: "electricity",
          name: `وشوش ديكورية خارجية فاخرة مذهبة للأجهزة مفردة ومزدوجة (${electricity.selectedBrand})`,
          unit: "وش",
          quantity: Number(electricity.plateCount),
          unitPrice: ratePlate,
          laborCost: 0,
          description: "وشوش خارجية باللون المعتمد لتغطية وتثبيت شاسيه الكهرباء."
        });
      }

      if (Number(electricity.frameCount) > 0) {
        generated.push({
          id: "gen-elec-frames",
          category: "electricity",
          name: `شاسيهات تثبيت لقم وشاحن معتمدة ومقاومة للصدأ (${electricity.selectedBrand})`,
          unit: "شاسيه",
          quantity: Number(electricity.frameCount),
          unitPrice: rateFrame,
          laborCost: 0,
          description: "شاسيهات داخلية لتثبيت الوشوش واللقم بداخل الععلب الماجيك المدمجة الحجم."
        });
      }

      const totalFinishingLabor = Number(electricity.finishingLaborCost ?? 5000); 
      generated.push({
        id: "gen-elec-finish-labor",
        category: "electricity",
        name: "مصنعيات تركيب لقم ووشوش واختبار شبكة الإنارة بالكامل",
        unit: "مقطوعية",
        quantity: 1,
        unitPrice: 0,
        laborCost: totalFinishingLabor,
        description: "أجور عمالة فنية لتركيب وتوصيل وتجريب واختبار لقم وشواحن وكوالين الشقة بالكامل."
      });
    }

    if (electricity.smartActive) {
      generated.push({
        id: "gen-elec-smart-flat",
        category: "electricity",
        name: "  تأسيس تحكم سمارت بالوحدة والأجهزة (Smart Home)",
        unit: " مقطوعية",
        quantity: 1,
        unitPrice: rates.smartHomeFlatRate ?? 15000,
        laborCost: 0,
        description: " تأسيس وتمديد كابلات التحكم بالإنارة والتكييف عن بعد بالمتصفح والهاتف."
      });
    }

    if (electricity.soundActive) {
      generated.push({
        id: "gen-elec-sound-flat",
        category: "electricity",
        name: " تأسيس نظام ساوند سيستم داخلي ممتد (Sound System)",
        unit: " مقطوعية",
        quantity: 1,
        unitPrice: rates.soundSystemFlatRate ?? 8500,
        laborCost: 0,
        description: "تمديد مسارات الصوت وسماعات السقف الذكية مع وحدات تحكم لجميع الغرف والصالات."
      });
    }
  }

  // 10. أعمال تأسيس السباكة والتغذية المائية والصحي
  const plumbing = finishing.plumbing || {};
  if (plumbing.enabled) {
    const activeRough = plumbing.activeSystem === 'concealed' ? (plumbing.concealedRoughIn || []) : (plumbing.regularRoughIn || []);
    const activeFinish = plumbing.activeSystem === 'concealed' ? (plumbing.concealedFinishing || []) : (plumbing.regularFinishing || []);
    const allPlumbingMaterials = [...activeRough, ...activeFinish];

    allPlumbingMaterials.forEach((item: any) => {
      if (item.quantity > 0) {
        generated.push({
          id: `pl-mat-${item.id}`,
          category: "plumbing",
          name: `${item.name} - (براند: ${item.company || 'معتمد'})`,
          unit: item.unit || "قطعة",
          quantity: Number(item.quantity),
          unitPrice: Number(item.rate || 0),
          laborCost: 0, 
          description: `توريد خامات سباكة أصلية من إنتاج شركة ${item.company || 'المصنع المعتمد'} شاملة الضمان واختبار الكبس.`
        });
      }
    });

    if (Number(plumbing.laborLumpSum) > 0) {
      generated.push({
        id: "pl-labor-main",
        category: "plumbing",
        name: "إجمالي مصنعيات تأسيس وتركيب السباكة والصحي الميدانية الكاملة",
        unit: "مقطوعية",
        quantity: 1,
        unitPrice: 0,
        laborCost: Number(plumbing.laborLumpSum),
        description: " مصنعيات شاملة تمديد الشبكات، اختبار شهادة الضمان، وتركيب الأطقم الصحية والمواسير."
      });
    }

    if (plumbing.hasACDrainage && Number(plumbing.acDrainCount) > 0) {
      generated.push({
        id: "pl-labor-ac",
        category: "plumbing",
        name: `مصنعيات تأسيس نقاط صرف تكييف بالوحدة مدمجة (عدد: ${plumbing.acDrainCount})`,
        unit: "نقطة",
        quantity: Number(plumbing.acDrainCount),
        unitPrice: 0,
        laborCost: Number(plumbing.acDrainCount) * Number(plumbing.acDrainLaborRate || 0),
        description: "تأسيس مسارات مواسير صرف التكييف المخفية وتوصيلها بأقرب نقطة صرف بالوحدة."
      });
    }

    if (plumbing.hasTerraceDrain && Number(plumbing.terraceDrainCount) > 0) {
      generated.push({
        id: "pl-labor-terrace",
        category: "plumbing",
        name: `مصنعيات تأسيس نقاط صرف تراسات وبلكونات بالوحدة (عدد: ${plumbing.terraceDrainCount})`,
        unit: "نقطة",
        quantity: Number(plumbing.terraceDrainCount),
        unitPrice: 0,
        laborCost: Number(plumbing.terraceDrainCount) * Number(plumbing.terraceDrainLaborRate || 0),
        description: "تركيب وتأسيس بيبات صرف البلكونات الخارجية وربطها على الصرف الرئيسية للوحدة."
      });
    }

    if (plumbing.hasIndependentWaterLine && Number(plumbing.independentWaterLineRate) > 0) {
      generated.push({
        id: "pl-labor-water-line",
        category: "plumbing",
        name: "مصنعية تأسيس وتمرير خط مياه مستقل تماماً للوحدة (عداد خارجي)",
        unit: "خط",
        quantity: 1,
        unitPrice: 0,
        laborCost: Number(plumbing.independentWaterLineRate),
        description: "تأسيس وتمديد خط تغذية مياه منفصل من الصاعد الرئيسي للمبنى حتى مدخل الوحدة السكنية."
      });
    }

    if (Number(plumbing.transportationRate) > 0) {
      generated.push({
        id: "pl-logistics",
        category: "plumbing",
        name: "تكاليف نقل وتشوين وتنزيل خامات السباكة بالدور الميداني الفني",
        unit: "مقطوعية",
        quantity: 1,
        unitPrice: Number(plumbing.transportationRate),
        laborCost: 0,
        description: "أعمال لوجستية تشمل شحن المواد وتفريغها وتشوينها يدوياً داخل الموقع لضمان سلامة الخامات."
      });
    }
  }

  // 11. أعمال تجهيزات التكييف وأنظمة الـ HVAC (ac)
  const ac = finishing.ac || {};
  if (ac.enabled) {
    const copperQty = Number(ac.copperQty || 0);
    const copperPrice = Number(ac.copperPrice ?? 1500);
    if (copperQty > 0) {
      generated.push({
        id: "gen-ac-copper",
        category: "ac",
        name: "توريد وتمديد مواسير نحاس جنوب أفريقي معتمد للتكييف",
        unit: "م.ط",
        quantity: copperQty,
        unitPrice: copperPrice,
        laborCost: 0,
        description: "توريد وتمديد كابلات ومواسير النحاس الجنوب أفريقي الأصلي بالأقطار المناسبة شامل العزل والتركيب."
      });
    }

    const drainQty = Number(ac.drainQty || 0);
    const drainPrice = Number(ac.drainPrice ?? 300);
    if (drainQty > 0) {
      generated.push({
        id: "gen-ac-drain",
        category: "ac",
        name: "تأسيس خطوط صرف التكييف المدفونة ومستلزماتها",
        unit: "نقطة",
        quantity: drainQty,
        unitPrice: drainPrice,
        laborCost: 0,
        description: "تأسيس مواسير صرف التكييف البلاستيكية ذات الضغط العالي وربطها مع أقرب نقطة صرف عمومية."
      });
    }

    const bracketQty = Number(ac.bracketQty || 0);
    const bracketPrice = Number(ac.bracketPrice ?? 450);
    if (bracketQty > 0) {
      generated.push({
        id: "gen-ac-bracket",
        category: "ac",
        name: "كوابيل وحوامل حديدية معالجة ضد الصدأ للوحدات الخارجية",
        unit: "كابولي",
        quantity: bracketQty,
        unitPrice: bracketPrice,
        laborCost: 0,
        description: "توريد وتركيب كوابيل حديدية ثقيلة مجلفنة ومدهونة إلكتروستاتيك لحمل الوحدات الخارجية للتكييف."
      });
    }

    const acLabor = Number(ac.laborLumpSum || 0);
    if (acLabor > 0) {
      generated.push({
        id: "gen-ac-labor",
        category: "ac",
        name: "مصنعيات تأسيس وتمديد شبكات التكييف بالموقع",
        unit: "مقطوعية",
        quantity: 1,
        unitPrice: 0,
        laborCost: acLabor,
        description: "مصنعيات دفن وتثبيت مواسير النحاس بداخل الحوائط وحفر المسارات واختبار الضغط الميداني للشبكة."
      });
    }
  }

  // 12. أعمال عزل الرطوبة والحرارة للحمامات والأسطح (waterproofing)
  const waterproofing = finishing.waterproofing || {};
  if (waterproofing.enabled) {
    const bitumenQty = Number(waterproofing.bitumenQty || 0);
    const bitumenPrice = Number(waterproofing.bitumenPrice ?? 1200);
    if (bitumenQty > 0) {
      generated.push({
        id: "gen-wp-bitumen",
        category: "waterproofing",
        name: "توريد دهان عزل بيتومين مطاطي عازل للرطوبة على البارد",
        unit: "بستلة",
        quantity: bitumenQty,
        unitPrice: bitumenPrice,
        laborCost: 0,
        description: "دهان بيتومين معتمد لعزل أرضيات الحمامات والمطابخ لحماية الهياكل الإنشائية من تسربات المياه."
      });
    }

    const membraneQty = Number(waterproofing.membraneQty || 0);
    const membranePrice = Number(waterproofing.membranePrice ?? 2500);
    if (membraneQty > 0) {
      generated.push({
        id: "gen-wp-membrane",
        category: "waterproofing",
        name: "توريد لفائف ممبرين عزل مائي سمك 4 مم معتمد",
        unit: "رول",
        quantity: membraneQty,
        unitPrice: membranePrice,
        laborCost: 0,
        description: "توريد لفائف عزل ممبرين مسلحة بالبوليستر لحماية أرضيات الحمامات والأسطح من تسريبات المياه تماماً."
      });
    }

    const cementInsulationQty = Number(waterproofing.cementInsulationQty || 0);
    const cementInsulationPrice = Number(waterproofing.cementInsulationPrice ?? 450);
    if (cementInsulationQty > 0) {
      generated.push({
        id: "gen-wp-cement",
        category: "waterproofing",
        name: "توريد مواد عزل أسمنتي كيميائي مرن (سيكا / أديبوند)",
        unit: "شكارة",
        quantity: cementInsulationQty,
        unitPrice: cementInsulationPrice,
        laborCost: 0,
        description: "عزل أسمنتي معالج ذو مرونة عالية ومقاومة فائقة لضغط المياه المباشر بالحمامات والمطابخ."
      });
    }

    const wpLabor = Number(waterproofing.laborLumpSum || 0);
    if (wpLabor > 0) {
      generated.push({
        id: "gen-wp-labor",
        category: "waterproofing",
        name: "مصنعية أعمال عزل رطوبة وحرارة واختبار الغمر بالماء",
        unit: "مقطوعية",
        quantity: 1,
        unitPrice: 0,
        laborCost: wpLabor,
        description: "أعمال تنظيف السطح، وعمل رقبة زجاجة، وتركيب العزل المائي واختباره بالغمر بالماء لمدة 48 ساعة."
      });
    }
  }

  // 13. أعمال الكريتال والمعادن والدرابزينات (metalWorks)
  const metalWorks = finishing.metalWorks || {};
  if (metalWorks.enabled) {
    const wroughtIronQty = Number(metalWorks.wroughtIronQty || 0);
    const wroughtIronPrice = Number(metalWorks.wroughtIronPrice ?? 3500);
    if (wroughtIronQty > 0) {
      generated.push({
        id: "gen-mw-wrought",
        category: "metalWorks",
        name: "تصنيع وتركيب درابزين حديد كريتال (سلالم وبلكونات)",
        unit: "م.ط",
        quantity: wroughtIronQty,
        unitPrice: wroughtIronPrice,
        laborCost: 0,
        description: "حديد كريتال بتصاميم هندسية معتمدة شامل الحام والتهيئة والدهان التأسيسي ضد الصدأ والوجه النهائي."
      });
    }

    const windowProtectionQty = Number(metalWorks.windowProtectionQty || 0);
    const windowProtectionPrice = Number(metalWorks.windowProtectionPrice ?? 1200);
    if (windowProtectionQty > 0) {
      generated.push({
        id: "gen-mw-window",
        category: "metalWorks",
        name: "شبكات حماية حديدية مصفحة للنوافذ والأبواب المعرضة للمناور",
        unit: "م²",
        quantity: windowProtectionQty,
        unitPrice: windowProtectionPrice,
        laborCost: 0,
        description: "شبك حماية حديدي ثقيل للنوافذ المطلة على مناور أو الشوارع لزيادة الأمان والسلامة بالوحدة السكنية."
      });
    }

    const mwLabor = Number(metalWorks.laborLumpSum || 0);
    if (mwLabor > 0) {
      generated.push({
        id: "gen-mw-labor",
        category: "metalWorks",
        name: "مصنعيات تركيب وأعمال لحام ودهان المعادن بالموقع",
        unit: "مقطوعية",
        quantity: 1,
        unitPrice: 0,
        laborCost: mwLabor,
        description: "مصنعيات تركيب الدرابزينات والحمايات الحديدية وصب القواعد وتعديل الفتحات ودهان الأوجه النهائية."
      });
    }
  }

  // 14. أعمال الديكورات والملحقات والجماليات
  const decorations = finishing.decorations || {};
  if (decorations.enabled && decorations.items) {
    decorations.items.forEach((item: any) => {
      if (item.enabled && item.quantity > 0) {
        generated.push({
          id: `gen-decor-${item.name}`,
          category: "decorations",
          name: item.name === "أخرى" ? (item.customName || "بند ديكور إضافي مخصص") : item.name,
          unit: "وحدة",
          quantity: item.quantity,
          unitPrice: item.price || 0,
          laborCost: 0,
          description: `توريد وتركيب الديكورات الفاخرة المحددة بموقع العميل: ${item.location || 'جاري التحديد'}.`
        });
      }
    });
  }

  // 15. أعمال التهوية والشفاطات (Ventilation)
  const ventilation = finishing.ventilation || {};
  if (ventilation.enabled && ventilation.items) {
    Object.entries(ventilation.items).forEach(([key, item]: [string, any]) => {
      if (item.qty > 0) {
        generated.push({
          id: `gen-ventilation-${key}`,
          category: "ventilation",
          name: item.label,
          unit: item.unit || "عدد",
          quantity: item.qty,
          unitPrice: item.price || 0,
          laborCost: 0,
          description: `توريد وتركيب خامات تهوية ومستلزمات شفاطات موردة لموقع العميل: براند (${item.company || "معتمد"}).`
        });
      }
    });
  }

  return generated;
}

export default function InitialEstimate() {
  const { crmData, saveEstimateSnapshot, autoSaveEstimateToDB, isHydrating } = useCRM();

  const [dbMaterials, setDbMaterials] = useState<any[]>([]);
  const [dbSpecs, setDbSpecs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 🌟 استدعاء مرجع الحفظ الذاتي المانع للتعارض
  const isSavingRef = useRef(false);

  useEffect(() => {
    const fetchLibraries = async () => {
      try {
        setLoading(true);
        const [mRes, sRes] = await Promise.all([
          supabase.from("products_library").select("*"),
          supabase.from("specifications_library").select("*")
        ]);
        if (mRes.data) setDbMaterials(mRes.data);
        if (sRes.data) setDbSpecs(sRes.data);
      } catch (err) {
        console.error("خطأ جلب بيانات المقايسة المبدئية:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLibraries();
  }, []);

  const detailedBOQ = useMemo(() => {
    if (loading || !crmData || dbMaterials.length === 0 || dbSpecs.length === 0) return [];
    return generateDetailedBOQ(crmData, dbMaterials, dbSpecs);
  }, [crmData, dbMaterials, dbSpecs, loading]);

  const calculatedTotal = useMemo(() => {
    return detailedBOQ.reduce(
      (sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)) + Number(item.laborCost || 0),
      0
    );
  }, [detailedBOQ]);

  // 🌟 دالة الحفظ التلقائي الاحتياطية الاستشفائية المباشرة بسوبابيز لحل خطأ useCRM العضوي نهائياً بالخلفية
  const localAutoSaveToDB = async (items: any[], total: number, status: string, percentage: number) => {
    const project = crmData.project || {};
    if (!project.id || String(project.id).startsWith("new") || isSavingRef.current) return;
    isSavingRef.current = true;
    try {
      // 1. مراجعة واستدعاء ترويسة المقايسة المبدئية الحالية
      const { data: existingHeader } = await supabase
        .from("estimate_headers")
        .select("id")
        .eq("project_id", project.id)
        .eq("status", status)
        .maybeSingle();

      let headerId = existingHeader?.id;

      const matTotal = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
      const labTotal = items.reduce((sum, item) => sum + Number(item.laborCost || 0), 0);

      const payloadHeader = {
        project_id: project.id,
        estimate_number: project.estimateNumber || `EST-${Math.floor(1000 + Math.random() * 9000)}`,
        status: status,
        materials_total: matTotal,
        labor_total: labTotal,
        grand_total: total,
        engineering_percentage: percentage
      };

      if (headerId) {
        await supabase
          .from("estimate_headers")
          .update(payloadHeader)
          .eq("id", headerId);
      } else {
        const { data: newHeader, error: hErr } = await supabase
          .from("estimate_headers")
          .insert([payloadHeader])
          .select("id")
          .single();
        if (hErr) throw hErr;
        headerId = newHeader.id;
      }

      if (headerId) {
        // 2. تحديث وتطهير وحقن البنود الـ BOQ التفصيلية حياً سحابياً
        await supabase
          .from("estimate_items")
          .delete()
          .eq("estimate_id", headerId);

        const itemsPayload = items.map((item, idx) => ({
          estimate_id: headerId,
          category: item.category,
          name: item.name,
          unit: item.unit || "قطعة",
          quantity: Number(item.quantity || 0),
          unit_price: Number(item.unitPrice || 0),
          labor_cost: Number(item.laborCost || 0),
          description: item.description || ""
        }));

        const { error: iErr } = await supabase
          .from("estimate_items")
          .insert(itemsPayload);
        if (iErr) throw iErr;
      }
    } catch (err) {
      console.error("Local AutoSave Fallback Error:", err);
    } finally {
      isSavingRef.current = false;
    }
  };

  useEffect(() => {
    if (detailedBOQ.length > 0 && calculatedTotal > 0 && !loading && !isHydrating) {
      const percentage = crmData.estimate?.engineeringPercentage ?? 15;
      
      // 🌟 تفعيل بروتوكول صمام الأمان لمنع تجميد الشاشة حيوياً وتوجيه الحفظ
      if (typeof autoSaveEstimateToDB === 'function') {
        autoSaveEstimateToDB(detailedBOQ, calculatedTotal, "مبدئية", percentage);
      } else {
        localAutoSaveToDB(detailedBOQ, calculatedTotal, "مبدئية", percentage);
      }
    }
  }, [detailedBOQ, calculatedTotal, loading, isHydrating, autoSaveEstimateToDB, crmData.estimate?.engineeringPercentage]);

  if (loading || isHydrating) {
    return (
      <div className="p-12 text-center text-[#D4AF37] font-bold text-lg animate-pulse">
        جاري إجراء الحسابات الهندسية وربط بنود المقايسة المبدئية حركياً...
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-8 text-right font-sans">
      <div className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-2xl bg-[#07132a] border border-[#1f2d4d] relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37] text-[#D4AF37]">
            <Calculator className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#D4AF37]">المقايسة المبدئية التفاعلية للعميل</h3>
            <p className="text-xs text-gray-400 mt-1">يتم التحديث والحفظ التلقائي في السيرفر مع كل تغيير في مواصفات التشطيب</p>
          </div>
        </div>
      </div>

      {detailedBOQ.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#020B1C] border border-[#1f2d4d] border-dashed text-center">
          <ShieldAlert className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-base text-gray-400 font-medium">لم يتم تفعيل أي بند من بنود التشطيب بعد في التابات السابقة لتوليد المقايسة.</p>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          <EstimateHeader />
          <EstimateTable items={detailedBOQ} isEditable={false} />
          {/* استدعاء المجاميع المتوافق مع الحسابات الموحدة للـ Context */}
          <EstimateTotals />
        </div>
      )}
    </div>
  );
}

// دالة داخلية لجلب أيقونات حية لجدول المقايسة
const getCategoryIconSvg = (category: string) => {
  const icons: Record<string, string> = {
    plumbing: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>`,
    electricity: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>`,
    plaster: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>`,
    paint: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>`,
    ceiling: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>`,
    flooring: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>`,
    doors: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>`,
    aluminum: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"></path></svg>`,
    archMod: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4a2 2 0 114 0v1a2 2 0 01-2 2h-1M4 11V5a2 2 0 012-2h4v8m-1 1v8m0 0H4a2 2 0 01-2-2v-4a2 2 0 012-2h4z"></path></svg>`,
    decorations: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>`,
    masonry: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2"></path></svg>`,
    ac: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v18m9-9H3m12-4l-6 8m0-8l6 8"></path></svg>`,
    waterproofing: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
    metalWorks: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>`,
    ventilation: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"></path></svg>`
  };
  return icons[category] || `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>`;
};

// 🌟 إعادة الهيكلة والتصميم الإمبراطوري الشامل لورقة المقايسة المطبوعة وبوابة العميل الخارجية
export function PrintReportLayout({
  estimateType,
  estimateId
}: {
  estimateType: string;
  estimateId?: string;
}) {
  const { crmData } = useCRM();
  const [printItems, setPrintItems] = useState<any[]>([]);
  const [loadingPrint, setLoadingPrint] = useState<boolean>(true);

  const customer = crmData.customer || {};
  const project = crmData.project || {};
  const estimate = crmData.estimate || {};

  const engineeringPercentage = estimate.engineeringPercentage ?? 15;

  useEffect(() => {
    const fetchPrintItems = async () => {
      if (!estimateId) {
        setLoadingPrint(false);
        return;
      }
      try {
        setLoadingPrint(true);
        const { data, error } = await supabase
          .from("estimate_items")
          .select("*")
          .eq("estimate_id", estimateId);
        if (error) throw error;
        setPrintItems(data || []);
      } catch (err) {
        console.error("خطأ في جلب بنود المقايسة لنسخة الطباعة:", err);
      } finally {
        setLoadingPrint(false);
      }
    };
    fetchPrintItems();
  }, [estimateId]);

  // حساب كشف الخامات والمصنعيات المفرة والمحدثة en-US
  const materialsTotal = printItems.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price ?? item.unitPrice ?? 0)), 0);
  const laborTotal = printItems.reduce((sum, item) => sum + Number(item.labor_cost ?? item.laborCost ?? 0), 0);
  const directCost = materialsTotal + laborTotal;
  const engineeringValue = directCost * (engineeringPercentage / 100);
  const grandTotal = directCost + engineeringValue;

  const formattedDate = new Date().toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const hasCategory = (cat: string) => printItems.some(item => item.category === cat);

  // صمام الأمان: إعلان الحقول البديلة دفاعياً لمنع أخطاء التجميع
  const activeFinishingLevel = project.finishingLevel || project.finishing_level || "سوبر لوكس المعتمد";
  const activeUnitAddress = project.unitAddress || project.unit_address || project.location || "الكرامة";
  const activeCustomerCode = customer.customerCode || customer.customer_code || "CUST-XXXX";

  // مديول رحلة التنفيذ الـ 17 مرحلة مع دمج التواريخ وحساب وجود البند
  const executionJourney = [
    { name: "اعتماد المقايسة", days: "1 يوم", active: true },
    { name: "المعاينة الهندسية", days: "3 أيام", active: true },
    { name: "توقيع العقد النهائي", days: "1 يوم", active: true },
    { name: "تعديل معماري وتكسير", days: "3 أيام", active: hasCategory("archMod") },
    { name: "أعمال مباني وطوب", days: "4 أيام", active: hasCategory("masonry") },
    { name: "تأسيس أعمال كهرباء", days: "7 أيام", active: hasCategory("electricity") },
    { name: "تأسيس أعمال سباكة", days: "7 أيام", active: hasCategory("plumbing") },
    { name: "تأسيس أعمال تكييف", days: "2 يوم", active: hasCategory("ac") },
    { name: "تأسيس شفاطات وتهوية", days: "2 يوم", active: hasCategory("ventilation") },
    { name: "عزل رطوبة وحرارة", days: "3 أيام", active: hasCategory("waterproofing") },
    { name: "أعمال بياض محارة", days: "10 أيام", active: hasCategory("plaster") },
    { name: "أعمال جبس بورد وأسقف", days: "5 أيام", active: hasCategory("ceiling") },
    { name: "أعمال الأرضيات والسيراميك", days: "10 أيام", active: hasCategory("flooring") },
    { name: "أعمال نجارة وتركيب أبواب", days: "3 أيام", active: hasCategory("doors") },
    { name: "أعمال ألوميتال وتركيب شبابيك", days: "3 أيام", active: hasCategory("aluminum") },
    { name: "أعمال كريتال ومعادن", days: "4 أيام", active: hasCategory("metalWorks") },
    { name: "أعمال ديكورات وتجاليد", days: "5 أيام", active: hasCategory("decorations") },
    { name: "تشطيب نهائي كهرباء", days: "3 يوم", active: hasCategory("electricity") },
    { name: "تشطيب نهائي سباكة", days: "3 يوم", active: hasCategory("plumbing") },
    { name: "أعمال دهانات وتسليم", days: "10 أيام", active: hasCategory("paint") }
  ];

  return (
    <div dir="rtl" className="bg-white text-[#020B1C] w-full min-h-screen p-10 text-xs relative select-none font-sans print:p-0 print:text-black">
      
      {/* 🛠️ جدار الحماية البصري الموحد وتنسيق شريط التمرير مذهب الألوان بسمك 6px لمنع التداخل والقص كلياً للـ BOQ المطبوعة */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* تفعيل وإظهار شريط التمرير الأفقي والرأسي بكافة الجداول بألوان ذهبية فاخرة */
        ::-webkit-scrollbar { 
          width: 6px !important; 
          height: 6px !important; 
          display: block !important;
        }
        ::-webkit-scrollbar-track { 
          background: #020B1C !important; 
        }
        ::-webkit-scrollbar-thumb { 
          background: #D4AF37 !important; 
          border-radius: 9999px !important; 
        }
        ::-webkit-scrollbar-thumb:hover { 
          background: #AA7C11 !important; 
        }

        /* إلغاء أكواد الإخفاء لضمان انسيابية التمرير بالماوس والجوال */
        .overflow-x-auto { 
          -ms-overflow-style: auto !important; 
          overflow-x: auto !important; 
        }

        /* عزل تلوين وأوزان خلايا جدول تفريد بنود المقايسة ومنع تسريب الـ CSS للسايدبار */
        .premium-public-estimate-table thead th {
          font-size: 0.75rem !important;
          font-weight: 500 !important;
          color: #D4AF37 !important;
          text-align: right !important;
          background-color: #020B1C !important;
          border-bottom: 2px solid rgba(212, 175, 55, 0.3) !important;
          padding: 14px 16px !important;
          letter-spacing: normal !important;
        }

        .premium-public-estimate-table tbody td {
          font-size: 0.8rem !important;
          font-weight: 400 !important;
          color: #020B1C !important; /* الاحتفاظ بالخطوط الداكنة لنسخة الطباعة الـ A4 البيضاء */
          text-align: right !important;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1) !important;
          padding: 14px 16px !important;
          letter-spacing: normal !important;
        }

        .premium-public-estimate-table tbody tr:hover {
          background-color: rgba(0, 0, 0, 0.02) !important;
        }
      `}} />

      {/* رأس الصفحة */}
      <div className="flex items-center justify-between border-b-4 border-[#D4AF37] pb-4 mb-5">
        <div className="w-[30%] text-right select-none">
          <img src="/logo.png" alt="Golden Decoration Logo" className="h-16 object-contain" />
        </div>
        
        <div className="w-[40%] text-center">
          <h2 className="text-xl md:text-2xl font-black text-[#0B1B38] tracking-wide">
            {estimateType}
          </h2>
          <p className="text-[10px] text-gray-500 font-bold mt-1">تاريخ الإصدار: {formattedDate}</p>
        </div>

        <div className="w-[30%] text-left select-none" style={{ direction: "ltr" }}>
          <h1 className="text-lg font-black tracking-wider text-[#0B1B38] leading-none">GOLDEN DECORATION</h1>
          <p className="text-[9px] text-[#C9A45D] font-bold uppercase tracking-widest mt-1">Art In Every Space</p>
        </div>
      </div>

      {/* كرت وجدول البيانات الأساسية للعميل متناظر بالكامل */}
      <div className="grid grid-cols-4 gap-3 bg-gray-50/70 border border-gray-200 rounded-2xl p-4 mb-4 text-[10px] font-bold">
        <div>
          <span className="text-gray-400 block font-bold">رقم المقايسة:</span>
          <span className="text-slate-900 font-mono font-black text-sm block mt-0.5">{estimate.number || "EST-M2.5"}</span>
        </div>
        <div>
          <span className="text-gray-400 block font-bold">اسم العميل المتعاقد:</span>
          <span className="text-slate-900 font-black text-xs block mt-0.5">{customer.name || "أسماء"}</span>
        </div>
        <div>
          <span className="text-gray-400 block font-bold">نوع الوحدة الإنشائية:</span>
          <span className="text-slate-900 font-bold mt-0.5">{project.unitType || project.unit_type || "شقة سكنية"}</span>
        </div>
        <div>
          <span className="text-gray-400 block font-bold">مسمى وموقع العمل:</span>
          <span className="text-[#0B1B38] font-bold block mt-0.5 truncate">{project.projectName || project.project_name || "الكرامة"}</span>
        </div>
        <div className="pt-2 border-t border-gray-200 mt-2">
          <span className="text-gray-400 block font-bold">مساحة الوحدة الفعالة:</span>
          <span className="text-slate-900 font-bold block mt-0.5">{project.area || 0} م²</span>
        </div>
        <div className="pt-2 border-t border-gray-200 mt-2">
          <span className="text-gray-400 block font-bold">مستوى التشطيب المطلوب:</span>
          <span className="text-[#C9A45D] font-black block mt-0.5">{activeFinishingLevel}</span>
        </div>
        <div className="pt-2 border-t border-gray-200 mt-2 col-span-2">
          <span className="text-gray-400 block font-bold">إجمالي مدة التنفيذ المقدرة:</span>
          <span className="text-emerald-600 font-black block mt-0.5">يتم احتسابه حركياً بناءً على مخرجات تقدم بنود الموقع</span>
        </div>
      </div>

      {/* ميزانية العميل التقديرية الإرشادية - تظهر في نسخة الطباعة فقط كـ دليل تعاقدي مالي مسجل في المقايسة المعتمدة */}
      {project.estimatedMin && project.estimatedMax && (
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 mb-6 flex justify-between items-center text-[10px] font-bold select-none">
          <span className="text-gray-500">🎯 ميزانية العميل التقديرية الإرشادية المعتمدة بالعقد المبدئي:</span>
          <span className="text-[#8b6f2a] font-mono">من {Number(project.estimatedMin).toLocaleString('en-US')} إلى {Number(project.estimatedMax).toLocaleString('en-US')} ج.م</span>
        </div>
      )}

      {/* شعار وهوية العميل */}
      <div className="text-center py-2 my-3 border-y-2 border-[#C9A45D]/25 bg-gradient-to-r from-transparent via-gray-50 to-transparent">
        <p className="text-[#C9A45D] font-black text-xs">
          الشقة بالكامل - Golden Decoration Excellence
        </p>
      </div>

      {/* جدول عرض السعر الفاخر - تم تسييل حظر التداخل وتفعيل الـ Gilded Scrollbar للأجهزة المحمولة */}
      <div className="border border-gray-200 rounded-2xl overflow-x-auto mb-8 shadow-sm">
        <table className="w-full border-collapse text-[10px] text-right min-w-[850px] premium-public-estimate-table">
          <thead>
            <tr className="bg-[#0B1B38] text-white select-none whitespace-nowrap">
              <th className="p-3.5 text-center w-8 font-black">م</th>
              <th className="p-3.5 font-black w-36">البند ومجال الأعمال</th>
              <th className="p-3.5 font-black">تفصيل ووصف التوريد والتركيب الفني المعتمد للمشروع</th>
              <th className="p-3.5 text-center w-12 font-black">الكمية</th>
              <th className="p-3.5 text-center w-12 font-black">الوحدة</th>
              <th className="p-3.5 text-center w-18 font-black">خامات</th>
              <th className="p-3.5 text-center w-18 font-black">مصنعيات</th>
              <th className="p-3.5 text-center w-24 font-black">الإجمالي (ج.م)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-[#0B1B38] font-semibold whitespace-nowrap">
            {printItems.map((item, idx) => {
              const qty = Number(item.quantity || 0);
              const uPrice = Number(item.unit_price ?? item.unitPrice ?? 0);
              const labor = Number(item.labor_cost ?? item.laborCost ?? 0);
              const rowTotal = (qty * uPrice) + labor;
              return (
                <tr key={item.id || idx} className="hover:bg-gray-50/80 transition">
                  <td className="p-3 text-center font-mono text-gray-400 font-bold">{idx + 1}</td>
                  <td className="p-3 font-black text-[#0B1B38] whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span dangerouslySetInnerHTML={{ __html: getCategoryIconSvg(item.category) }} />
                      <span>{localCategoryNames[item.category] || categoryNames[item.category] || item.category || "—"}</span>
                    </div>
                  </td>
                  <td className="p-3 text-gray-600 font-bold leading-relaxed whitespace-pre-wrap">{item.description || item.name}</td>
                  <td className="p-3 text-center font-mono font-black">{qty.toLocaleString('en-US')}</td>
                  <td className="p-3 text-center">{item.unit || "م²"}</td>
                  <td className="p-3 text-center font-mono text-gray-500">{(uPrice).toLocaleString('en-US')}</td>
                  <td className="p-3 text-center font-mono text-gray-500">{(labor).toLocaleString('en-US')}</td>
                  <td className="p-3 text-center font-mono font-black text-[#0B1B38]">{(rowTotal).toLocaleString('en-US')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* كارت وحاوية الأرصدة والمجاميع */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 text-xs font-bold items-stretch">
        
        <div className="p-3 bg-gray-50/80 border border-gray-200 rounded-xl text-center flex flex-col justify-center shadow-sm">
          <span className="text-gray-400 block text-[10px]">إجمالي الخامات والمواد الأساسية:</span>
          <span className="text-[#0B1B38] font-mono font-black text-sm block mt-1">{materialsTotal.toLocaleString('en-US')} ج.م</span>
        </div>

        <div className="p-3 bg-gray-50/80 border border-gray-200 rounded-xl text-center flex flex-col justify-center shadow-sm">
          <span className="text-gray-400 block text-[10px]">إجمالي المصنعيات والتركيبات الميدانية:</span>
          <span className="text-[#0B1B38] font-mono font-black text-sm block mt-1">{laborTotal.toLocaleString('en-US')} ج.م</span>
        </div>

        <div className="p-3 bg-gray-50/80 border border-[#D4AF37]/35 rounded-xl text-center flex flex-col justify-center shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1 h-full bg-[#D4AF37]" />
          <span className="text-gray-400 block text-[10px]">نسبة الإشراف والتشغيل ({engineeringPercentage}%):</span>
          <span className="text-[#C9A45D] font-mono font-black text-sm block mt-1">+{engineeringValue.toLocaleString('en-US')} ج.م</span>
        </div>

        <div className="p-4 bg-[#0B1B38] text-white rounded-xl text-center flex flex-col justify-center shadow-md">
          <span className="text-[10px] text-[#C9A45D] font-black block mb-0.5">الإجمالي النهائي الكلي للتعاقد:</span>
          <span className="font-mono font-black text-base text-[#D4AF37]">{grandTotal.toLocaleString('en-US')} ج.م</span>
        </div>

      </div>

      {/* رحلة التنفيذ الإنشائية المتناظرة والأيام المقدرة للبنود النشطة */}
      <div className="border border-gray-200 rounded-2xl p-5 bg-gradient-to-br from-white to-gray-50/60 mb-6 relative overflow-hidden">
        <h3 className="text-xs font-black text-[#0B1B38] border-b border-gray-200 pb-2 mb-3 flex items-center gap-1.5">
          <Layers size={14} className="text-[#C9A45D]" />
          <span>رحلة وجدول التنفيذ الإنشائي المخطط للمشروع (Stages Timeline Map):</span>
        </h3>
        
        {/* شبكة المراحل الـ 20 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-[9px] font-bold text-gray-500">
          {executionJourney.map((step, idx) => (
            <div 
              key={idx} 
              className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all duration-300 ${
                step.active 
                  ? "border-[#D4AF37] bg-[#0b1b3d]/5 text-[#0B1B38]" 
                  : "border-gray-100 bg-gray-50/30 opacity-40 line-through"
              }`}
            >
              <div className="flex items-center gap-1.5 justify-between">
                <span className="text-gray-400 font-mono text-[8px]">{idx + 1}</span>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${step.active ? "bg-[#D4AF37] animate-pulse" : "bg-gray-300"}`} />
              </div>
              <p className="mt-1 font-black text-gray-800 truncate leading-snug">{step.name}</p>
              {step.active && (
                <span className="text-[8px] text-[#C9A45D] font-mono mt-1 block">المدة: {step.days}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between border-t border-[#C9A45D] pt-4 text-[8px] text-gray-500 font-bold select-none">
        <div className="flex items-center gap-5">
          <span>📞 هاتف: 01065282534</span>
          <span>✉️ بريد: info@goldendecoration.com</span>
          <span>📍 العنوان: القاهرة - مصر</span>
        </div>
        <div>
          <span>www.goldendecoration.com — GOLDEN DECORATION ERP © 2026</span>
        </div>
      </div>

    </div>
  );
}