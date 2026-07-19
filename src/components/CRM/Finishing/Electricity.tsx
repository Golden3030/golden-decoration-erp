
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from "../context/CRMContext";
import { supabase } from '@/lib/supabaseClient'; 
import TabActivationBanner from './TabActivationBanner'; // 👈 استدعاء المكون المشترك الموحد للأجهزة اللمسية للشركة
import { 
  Zap, 
  Layers, 
  Plus, 
  Minus, 
  Star, 
  DollarSign, 
  Cpu, 
  FileText, 
  Volume2, 
  PlusCircle, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  Lock,
  Package,
  Check
} from 'lucide-react';

interface ElectricityTabProps {
  projectId: string;
}

// واجهة تعريف منتجات خامات الكهرباء المستوردة من سوبابيز
interface ElectricalProductItem {
  id: string;
  code: string;
  product_name: string;
  category: string;
  price: number;
  company?: string;      // حقل اسم الشركة المصنّعة المطلوب
  subcategory?: string;  // التصنيف الفرعي
}

// واجهة تمديد الأسلاك الديناميكية بالتأسيس
interface WireRow {
  id: string;
  wireType: string; // سلك السويدي 2مم، سلك السويدي 4مم
  quantity: number; // عدد اللفات
  rate: number;     // سعر اللفة الواحدة
}

// واجهة بنود التأسيس الحرة الإضافية
interface CustomRoughInItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  rate: number;
}

// واجهة بنود التشطيب الحرة الإضافية
interface CustomFinishingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  rate: number;
}

const FALLBACK_CABLES: ElectricalProductItem[] = [
  { id: "sw-01", code: "CB-01", product_name: "خراطيم علاء الدين وأسلاك السويدي النحاسية المعتمدة", category: "electricity", company: "السويدي", price: 200 },
  { id: "sw-02", code: "CB-02", product_name: "خراطيم مصطفى محمود وأسلاك الفنار السعودية الممتازة", category: "electricity", company: "السويدي", price: 170 }
];

const FALLBACK_OUTLETS: ElectricalProductItem[] = [
  { id: "vn-01", code: "OT-01", product_name: "لقمة مفتاح إنارة عادي بيانو", category: "electricity", company: "فينوس", price: 35 },
  { id: "vn-02", code: "OT-02", product_name: "لقمة مأخذ شاحن قوى", category: "electricity", company: "فينوس", price: 45 }
];

export default function ElectricityTab({ projectId }: ElectricityTabProps) {
  const { crmData, updateBulkFinishingSection } = useCRM();
  
  const project = crmData?.project || {};
  const totalUnitArea = Number(project.area || 100);

  // حالات البيانات الحية لمنتجات خامات الكهرباء المستوردة من سوبابيز
  const [dbCables, setDbCables] = useState<ElectricalProductItem[]>([]);
  const [dbOutlets, setDbOutlets] = useState<ElectricalProductItem[]>([]);
  const [dbProducts, setDbProducts] = useState<ElectricalProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // مرجع لمنع تعارض الحفظ وحظر الـ Infinite Loops أثناء مزامنة البيانات سحابياً
  const isLocalChange = useRef(false);

  // الحالة الموحدة الفاخرة للتحكم في منظومة الكهرباء وشبكات التأسيس والتشطيب
  const [state, setState] = useState({
    enabled: true,
    roughInActive: true,
    finishingActive: true,
    smartActive: false,
    soundActive: false,
    hasTransportation: true,
    selectedCableId: 'sw-01',
    selectedOutletId: 'vn-01',
    selectedMainPanelId: 'pa-01',
    selectedLowCurrentPanelId: 'pa-03',
    backboxCount: 150,
    floorConduitCount: 15,
    wallConduitCount: 20,
    wiresList: [] as WireRow[],
    hasMainPanel: true,
    hasLowCurrentPanel: false,
    automaticBreakerCount: 12,
    insulationTapeCount: 10,
    temporaryBulbCount: 12,
    socketTestCount: 12,
    cementSandBagCount: 5,
    customRoughInList: [] as CustomRoughInItem[],
    roughInLaborCost: 12000,
    selectedBrand: 'venus' as 'venus' | 'legrand' | 'bticino',
    switchCount: 40,
    plugCount: 50,
    plateCount: 60,
    frameCount: 60,
    blankInsertCount: 5,
    breakerFinishingCount: 12,
    acSwitchCount: 3,
    breakerFinishingRate: 120,
    heaterSwitchCount: 2,
    bellSwitchCount: 1,
    customFinishingList: [] as CustomFinishingItem[],
    finishingLaborCost: 5000,
    accessoriesRates: {
      backboxRate: 8,
      floorConduitRate: 180,
      wallConduitRate: 220,
      mainPanelRate: 1800,
      lowCurrentPanelRate: 1200,
      automaticBreakerRate: 180,
      insulationTapeRate: 15,
      temporaryBulbRate: 25,
      socketTestRate: 12,
      cementSandRate: 450,
      smartHomeFlatRate: 15000,
      soundSystemFlatRate: 8500,
      transportationPrice: 1000,
      rateSwitch: 35,
      ratePlug: 45,
      ratePlate: 25,
      rateFrame: 15,
      rateBlank: 8,
      rateBreakerFinishing: 120,
      rateAcSwitch: 120,
      rateHeaterSwitch: 120,
      rateBellSwitch: 55
    },
    lightPoints: 40,
    powerPoints: 50,
    notes: ''
  });

  // حالة وسيطة لإدخال النصوص لمنع إرسال طلبات متعددة مع كل حرف يكتبه المستخدم
  const [notesInput, setNotesInput] = useState<string>('');

  const FALLBACK_SPECS: ElectricalProductItem[] = [
    { id: "sw-01", code: "CB-01", product_name: "خراطيم علاء الدين وأسلاك السويدي النحاسية المعتمدة", category: "electricity", price: 200, company: "السويدي" },
    { id: "sw-02", code: "CB-02", product_name: "خراطيم مصطفى محمود وأسلاك الفنار السعودية الممتازة", category: "electricity", price: 170, company: "السويدي" }
  ];

  // دالة لتوليد قائمة الأسلاك المبدئية عند الحصر الأول
  const generateInitialWires = (): WireRow[] => {
    return [
      { id: "w-01", wireType: "سلك السويدي 1.5 مم", quantity: 2, rate: 1400 },
      { id: "w-02", wireType: "سلك السويدي 2 مم", quantity: 3, rate: 1800 },
      { id: "w-03", wireType: "سلك السويدي 4 مم", quantity: 1, rate: 2900 }
    ];
  };

  // 1. استعلام جلب خامات ومنتجات الكهرباء من مكتبة منتجات سوبابيز
  useEffect(() => {
    const fetchElectricalProducts = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('products_library')
          .select('*')
          .eq('category', 'electricity');

        if (error) throw error;

        if (data && data.length > 0) {
          setDbProducts(data);
          const cables = data.filter(item => item.subcategory === 'wires' || item.subcategory === 'أسلاك');
          const outlets = data.filter(item => 
            item.subcategory === 'electricity_accessories' || 
            item.subcategory === 'شاسيهات ووشوش' ||
            item.subcategory === 'switches' ||
            item.subcategory === 'مفاتيح وبرايز'
          );
          setDbCables(cables.length > 0 ? cables : FALLBACK_CABLES);
          setDbOutlets(outlets.length > 0 ? outlets : FALLBACK_OUTLETS);
        }
      } catch (err) {
        console.error("خطأ في الربط مع مكتبة الخامات:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchElectricalProducts();
  }, [crmData?.project?.totalArea]);

  // 2. مزامنة واقتران البيانات المخزنة مسبقاً للعميل حركياً وبشكل آمن كلياً
  useEffect(() => {
    if (crmData && crmData.finishing && crmData.finishing.electricity) {
      const elecContext = crmData.finishing.electricity;

      const wiresListVal = elecContext.wiresList && elecContext.wiresList.length > 0 ? elecContext.wiresList : generateInitialWires();

      isLocalChange.current = false;
      setState({
        enabled: elecContext.enabled ?? true,
        roughInActive: elecContext.roughInActive ?? true,
        finishingActive: elecContext.finishingActive ?? true,
        smartActive: elecContext.smartActive ?? false,
        soundActive: elecContext.soundActive ?? false,
        hasTransportation: elecContext.hasTransportation ?? true,
        selectedCableId: elecContext.selectedCableId ?? 'sw-01',
        selectedOutletId: elecContext.selectedOutletId ?? 'vn-01',
        selectedMainPanelId: elecContext.selectedMainPanelId ?? 'pa-01',
        selectedLowCurrentPanelId: elecContext.selectedLowCurrentPanelId ?? 'pa-03',
        backboxCount: elecContext.backboxCount ?? Math.ceil(totalUnitArea * 1.5),
        floorConduitCount: elecContext.floorConduitCount ?? Math.ceil(totalUnitArea * 0.15),
        wallConduitCount: elecContext.wallConduitCount ?? Math.ceil(totalUnitArea * 0.2),
        wiresList: wiresListVal,
        hasMainPanel: elecContext.hasMainPanel ?? true,
        hasLowCurrentPanel: elecContext.hasLowCurrentPanel ?? false,
        automaticBreakerCount: elecContext.automaticBreakerCount ?? 12,
        insulationTapeCount: elecContext.insulationTapeCount ?? 10,
        temporaryBulbCount: elecContext.temporaryBulbCount ?? 12,
        socketTestCount: elecContext.socketTestCount ?? 12,
        cementSandBagCount: elecContext.cementSandBagCount ?? 5,
        customRoughInList: elecContext.customRoughInList || [],
        roughInLaborCost: elecContext.roughInLaborCost ?? 12000,
        selectedBrand: elecContext.selectedBrand ?? 'venus',
        switchCount: elecContext.switchCount ?? Math.ceil(totalUnitArea * 0.4),
        plugCount: elecContext.plugCount ?? Math.ceil(totalUnitArea * 0.5),
        plateCount: elecContext.plateCount ?? Math.ceil(totalUnitArea * 0.6),
        frameCount: elecContext.frameCount ?? Math.ceil(totalUnitArea * 0.6),
        blankInsertCount: elecContext.blankInsertCount ?? 5,
        breakerFinishingCount: elecContext.breakerFinishingCount ?? 12,
        acSwitchCount: elecContext.acSwitchCount ?? Math.ceil(totalUnitArea * 0.03),
        breakerFinishingRate: elecContext.breakerFinishingRate ?? 120,
        heaterSwitchCount: elecContext.heaterSwitchCount ?? 2,
        bellSwitchCount: elecContext.bellSwitchCount ?? 1,
        customFinishingList: elecContext.customFinishingList || [],
        finishingLaborCost: elecContext.finishingLaborCost ?? 5000,
        accessoriesRates: {
          backboxRate: elecContext.accessoriesRates?.backboxRate ?? 8,
          floorConduitRate: elecContext.accessoriesRates?.floorConduitRate ?? 180,
          wallConduitRate: elecContext.accessoriesRates?.wallConduitRate ?? 220,
          mainPanelRate: elecContext.accessoriesRates?.mainPanelRate ?? 1800,
          lowCurrentPanelRate: elecContext.accessoriesRates?.lowCurrentPanelRate ?? 1200,
          automaticBreakerRate: elecContext.accessoriesRates?.automaticBreakerRate ?? 180,
          insulationTapeRate: elecContext.accessoriesRates?.insulationTapeRate ?? 15,
          temporaryBulbRate: elecContext.accessoriesRates?.temporaryBulbRate ?? 25,
          socketTestRate: elecContext.accessoriesRates?.socketTestRate ?? 12,
          cementSandRate: elecContext.accessoriesRates?.cementSandRate ?? 450,
          smartHomeFlatRate: elecContext.accessoriesRates?.smartHomeFlatRate ?? 15000,
          soundSystemFlatRate: elecContext.accessoriesRates?.soundSystemFlatRate ?? 8500,
          transportationPrice: elecContext.accessoriesRates?.transportationPrice ?? 1000,
          rateSwitch: elecContext.accessoriesRates?.rateSwitch ?? 35,
          ratePlug: elecContext.accessoriesRates?.ratePlug ?? 45,
          ratePlate: elecContext.accessoriesRates?.ratePlate ?? 25,
          rateFrame: elecContext.accessoriesRates?.rateFrame ?? 15,
          rateBlank: elecContext.accessoriesRates?.rateBlank ?? 8,
          rateBreakerFinishing: elecContext.accessoriesRates?.rateBreakerFinishing ?? 120,
          rateAcSwitch: elecContext.accessoriesRates?.rateAcSwitch ?? 120,
          rateHeaterSwitch: elecContext.accessoriesRates?.rateHeaterSwitch ?? 120,
          rateBellSwitch: elecContext.accessoriesRates?.rateBellSwitch ?? 55
        },
        lightPoints: elecContext.lightPoints ?? Math.ceil(totalUnitArea * 0.4),
        powerPoints: elecContext.powerPoints ?? Math.ceil(totalUnitArea * 0.5),
        notes: elecContext.notes ?? ''
      });
      setNotesInput(elecContext.notes ?? '');
    }
  }, [crmData?.finishing?.electricity?.enabled, dbProducts]);

  // المزامنة التلقائية مع السياق الأب بعد اكتمال الرندر تماماً
  useEffect(() => {
    if (isLocalChange.current) {
      updateBulkFinishingSection('electricity', state);
      isLocalChange.current = false;
    }
  }, [state]);

  // دالة تحديث الحالة المحلية المتزامنة
  const updateStateAndSave = (updater: (prev: typeof state) => Partial<typeof state>) => {
    setIsSaving(true);
    isLocalChange.current = true;
    setState(prev => {
      const updates = updater(prev);
      return { ...prev, ...updates };
    });
    setIsSaving(false);
  };

  // معالجة تعديل أسعار خامات ومصنعيات الكهرباء حياً بالمقايسة
  const handleRateChange = (key: keyof typeof state.accessoriesRates, value: number) => {
    updateStateAndSave(prev => ({
      accessoriesRates: {
        ...prev.accessoriesRates,
        [key]: Math.max(0, value)
      }
    }));
  };

  // تمديد الأسلاك الديناميكية للتأسيس
  const handleAddWireRow = () => {
    const defaultWire = dbProducts.length > 0 ? dbProducts[0] : FALLBACK_CABLES[0];
    const newWire: WireRow = {
      id: `wire-${Date.now()}`,
      wireType: defaultWire.product_name,
      quantity: 1,
      rate: defaultWire.price
    };
    updateStateAndSave(prev => ({
      wiresList: [...prev.wiresList, newWire]
    }));
  };

  const handleWireRowEdit = (id: string, fields: Partial<WireRow>) => {
    updateStateAndSave(prev => ({
      wiresList: prev.wiresList.map(row => row.id === id ? { ...row, ...fields } : row)
    }));
  };

  const handleRemoveWireRow = (id: string) => {
    updateStateAndSave(prev => ({
      wiresList: prev.wiresList.filter(row => row.id !== id)
    }));
  };

  // إضافات التأسيس الحرة للمستقبل
  const handleAddCustomRoughIn = () => {
    const newItem: CustomRoughInItem = {
      id: `rough-${Date.now()}`,
      name: "بند خامات وتأسيس إضافي",
      quantity: 1,
      unit: "قطعة",
      rate: 100
    };
    updateStateAndSave(prev => ({
      customRoughInList: [...prev.customRoughInList, newItem]
    }));
  };

  const handleCustomRoughInEdit = (id: string, fields: Partial<CustomRoughInItem>) => {
    updateStateAndSave(prev => ({
      customRoughInList: prev.customRoughInList.map(item => item.id === id ? { ...item, ...fields } : item)
    }));
  };

  const handleRemoveCustomRoughIn = (id: string) => {
    updateStateAndSave(prev => ({
      customRoughInList: prev.customRoughInList.filter(item => item.id !== id)
    }));
  };

  // إضافات التشطيب الحرة للمستقبل
  const handleAddCustomFinishing = () => {
    const newItem: CustomFinishingItem = {
      id: `fin-${Date.now()}`,
      name: "لقمة مفتاح أو اكسسوار إضافي للتشطيب",
      quantity: 1,
      unit: "قطعة",
      rate: 80
    };
    updateStateAndSave(prev => ({
      customFinishingList: [...prev.customFinishingList, newItem]
    }));
  };

  const handleCustomFinishingEdit = (id: string, fields: Partial<CustomFinishingItem>) => {
    updateStateAndSave(prev => ({
      customFinishingList: prev.customFinishingList.map(item => item.id === id ? { ...item, ...fields } : item)
    }));
  };

  const handleRemoveCustomFinishing = (id: string) => {
    updateStateAndSave(prev => ({
      customFinishingList: prev.customFinishingList.filter(item => item.id !== id)
    }));
  };

  // معالجة تغيير لوحة الكهرباء الرئيسية حركياً للبراند المختار
  const handleMainPanelChange = (id: string) => {
    const selectedProd = dbProducts.find(p => p.id === id);
    updateStateAndSave(prev => {
      const updatedRates = {
        ...prev.accessoriesRates,
        mainPanelRate: selectedProd ? selectedProd.price : prev.accessoriesRates.mainPanelRate
      };
      return {
        selectedMainPanelId: id,
        accessoriesRates: updatedRates
      };
    });
  };

  // معالجة تغيير لوحة التيار الخفيف حركياً
  const handleLowCurrentPanelChange = (id: string) => {
    const selectedProd = dbProducts.find(p => p.id === id);
    updateStateAndSave(prev => {
      const updatedRates = {
        ...prev.accessoriesRates,
        lowCurrentPanelRate: selectedProd ? selectedProd.price : prev.accessoriesRates.lowCurrentPanelRate
      };
      return {
        selectedLowCurrentPanelId: id,
        accessoriesRates: updatedRates
      };
    });
  };

  // دالة حفظ الملاحظات بحدث الـ Blur
  const handleNotesBlur = async () => {
    updateStateAndSave(prev => ({ notes: notesInput }));
  };

  // العمليات الحسابية والمالية التراكمية للبند
  const totalBackboxCost = state.backboxCount * (state.accessoriesRates.backboxRate ?? 8);
  const totalFloorConduitCost = state.floorConduitCount * (state.accessoriesRates.floorConduitRate ?? 180);
  const totalWallConduitCost = state.wallConduitCount * (state.accessoriesRates.wallConduitRate ?? 220);
  const totalWiresCost = state.wiresList.reduce((sum, item) => sum + ((item.quantity ?? 0) * (item.rate ?? 0)), 0);
  
  const mainPanelCost = state.hasMainPanel ? (state.accessoriesRates.mainPanelRate ?? 1800) : 0;
  const lowPanelCost = state.hasLowCurrentPanel ? (state.accessoriesRates.lowCurrentPanelRate ?? 1200) : 0;
  const totalBreakersCost = state.automaticBreakerCount * (state.accessoriesRates.automaticBreakerRate ?? 180);

  const totalInsulationTapeCost = state.insulationTapeCount * (state.accessoriesRates.insulationTapeRate ?? 15);
  const totalTemporaryBulbCost = state.temporaryBulbCount * (state.accessoriesRates.temporaryBulbRate ?? 25);
  const totalSocketTestCost = state.socketTestCount * (state.accessoriesRates.socketTestRate ?? 12);
  const totalCementSandCost = state.cementSandBagCount * (state.accessoriesRates.cementSandRate ?? 450);

  const totalCustomRoughInCost = state.customRoughInList.reduce((sum, item) => sum + ((item.quantity ?? 0) * (item.rate ?? 0)), 0);

  const finalRoughInCost = state.roughInActive 
    ? (totalBackboxCost + totalFloorConduitCost + totalWallConduitCost + totalWiresCost + mainPanelCost + lowPanelCost + totalBreakersCost + totalInsulationTapeCost + totalTemporaryBulbCost + totalSocketTestCost + totalCementSandCost + totalCustomRoughInCost + state.roughInLaborCost)
    : 0;

  const brandMultipliers = {
    venus: 1.0,
    bticino: 1.5,
    legrand: 2.2
  };
  const activeBrandMultiplier = brandMultipliers[state.selectedBrand] ?? 1.0;

  // أسعار لقم واكسسوارات التشطيب مع الميزان
  const rateSwitch = (state.accessoriesRates.rateSwitch ?? 35) * activeBrandMultiplier;
  const ratePlug = (state.accessoriesRates.ratePlug ?? 45) * activeBrandMultiplier;
  const ratePlate = (state.accessoriesRates.ratePlate ?? 25) * activeBrandMultiplier;
  const rateFrame = (state.accessoriesRates.rateFrame ?? 15) * activeBrandMultiplier;
  const rateBlank = (state.accessoriesRates.rateBlank ?? 8) * activeBrandMultiplier;
  const rateBreakerFinishing = (state.accessoriesRates.rateBreakerFinishing ?? 120) * activeBrandMultiplier;

  const rateAcSwitch = (state.accessoriesRates.rateAcSwitch ?? 120) * activeBrandMultiplier;
  const rateHeaterSwitch = (state.accessoriesRates.rateHeaterSwitch ?? 120) * activeBrandMultiplier;
  const rateBellSwitch = (state.accessoriesRates.rateBellSwitch ?? 55) * activeBrandMultiplier;

  const totalSwitchCost = state.switchCount * rateSwitch;
  const totalPlugCost = state.plugCount * ratePlug;
  const totalPlateCost = state.plateCount * ratePlate;
  const totalFrameCost = state.frameCount * rateFrame;
  const totalBlankCost = state.blankInsertCount * rateBlank;
  const totalBreakerFinishingCost = state.breakerFinishingCount * rateBreakerFinishing;

  const totalAcSwitchCost = state.acSwitchCount * rateAcSwitch;
  const totalHeaterSwitchCost = state.heaterSwitchCount * rateHeaterSwitch;
  const totalBellSwitchCost = state.bellSwitchCount * rateBellSwitch;

  const totalCustomFinishingCost = state.customFinishingList.reduce((sum, item) => sum + ((item.quantity ?? 0) * (item.rate ?? 0)), 0);

  const calculatedFinishingCost = state.finishingActive
    ? (totalSwitchCost + totalPlugCost + totalPlateCost + totalFrameCost + totalBlankCost + totalBreakerFinishingCost + totalAcSwitchCost + totalHeaterSwitchCost + totalBellSwitchCost + totalCustomFinishingCost + state.finishingLaborCost)
    : 0;

  const calculatedSmartHomeCost = state.smartActive ? (state.accessoriesRates.smartHomeFlatRate ?? 15000) : 0;
  const calculatedSoundSystemCost = state.soundActive ? (state.accessoriesRates.soundSystemFlatRate ?? 8500) : 0;
  const activeTransportationCost = state.enabled && state.hasTransportation ? (state.accessoriesRates.transportationPrice ?? 1000) : 0;

  const totalElectricalEstimate = state.enabled 
    ? (finalRoughInCost + calculatedFinishingCost + calculatedSmartHomeCost + calculatedSoundSystemCost + activeTransportationCost) 
    : 0;

  return (
    <div className="font-alexandria" dir="rtl"> 
    
    <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800;900&display=swap');
        
        .font-alexandria {
          font-family: 'Alexandria', Arial, sans-serif !important;
          letter-spacing: normal !important;
        }
    `}</style>
    
    <div className="space-y-8 select-none text-right font-alexandria">

      {/* 🌟 استدعاء البار المنزلق اللمسي الموحد (TabActivationBanner) كبديل للبار الضخم القديم */}
      <TabActivationBanner 
        title=" تأسيس وتشطيب شبكة الكهرباء والتحكم الذكي"
        subtitle="ELECTRICAL WIRING & NETWORKS SYSTEM"
        icon={Zap}
        enabled={state.enabled}
        onToggle={() => { updateStateAndSave(prev => ({ enabled: !prev.enabled })); }}
      />

      {/* حظر التفاعل وتعتيم الشاشة عند الإغلاق التام للبند */}
      <div className={`space-y-8 transition-opacity duration-300 ${state.enabled ? 'opacity-100' : 'opacity-25 pointer-events-none filter grayscale'}`}>

        {/* القسم الأول: مرحلة تأسيس الكهرباء (Rough-In Stage) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[#1f2d4d] pb-2 text-[#D4AF37]">
            <Layers className="w-5 h-5 animate-pulse" />
            <h4 className="text-lg font-bold text-[#D4AF37]">القسم الأول: مرحلة أعمال تأسيس الكهرباء الوحدة:</h4>
          </div>

          {/* كارت تأسيس كامل لكهرباء الشقة الملتزم تماماً بالتصميم الملكي الفاخر */}
          <div 
            onClick={() => {
              const nextVal = !state.roughInActive;
              updateStateAndSave(prev => ({ roughInActive: nextVal }));
            }}
            className={`p-6 rounded-3xl border transition-all duration-300 cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-6 ${
              state.roughInActive 
                ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_20px_rgba(212,175,55,0.08)] opacity-100' 
                : 'border-[#1f2d4d] bg-[#020B1C]/40 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex-shrink-0">
              {state.roughInActive ? (
                <div className="py-3 px-6 rounded-2xl bg-[#D4AF37] text-[#020B1C] text-base flex items-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>تفعيل التأسيس</span>
                </div>
              ) : (
                <div className="py-3 px-6 rounded-2xl bg-[#1c2844] text-[#F0E6D2] text-base border border-[#1f2d4d]">
                  <span>الغاء تفعيل التأسيس</span>
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-right space-y-1 pr-4">
              <h4 className="text-md font-bold text-[#D4AF37]">تفعيل تأسيس كهرباء الشقة بالكامل</h4>
              <p className="text-sm text-white leading-relaxed">تشمل الخراطيم والعلب الماجيك، وأسلاك السويدي المعتمدة وكل ما يخص تأسيس الكهرباء والتشوين وشاملة المصنعية</p>
            </div>

            <div className={`p-4 rounded-full flex-shrink-0 transition-all duration-300 ${state.roughInActive ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'bg-[#1f2d4d]/30 text-gray-500'}`}>
              <Layers className="w-8 h-8" />
            </div>
          </div>

          {/* لوحة حصر الخامات والأسلاك بالأمتار للتأسيس وتحرير كافة الأسعار المسجلة بقاعدة البيانات */}
          {state.roughInActive && (
            <div className="p-8 rounded-3xl bg-[#020B1C]/60 border border-[#1f2d4d] space-y-6">
              
              {/* خامات ومجاري التمديد حرة التعديل المالي بالكامل عبر عدادات الكمية والسعر الفردية */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* العلب الماجيك */}
                <div className="p-5 rounded-[2rem] bg-[#07132a] border border-[#1f2d4d] flex flex-col justify-between min-h-[190px] space-y-4 hover:border-[#D4AF37]/40 transition-all shadow-md">
                  <div className="text-right">
                    <span className="text-sm font-black text-[#D4AF37] block">العلب الماجيك</span>
                    <span className="text-xs text-white mt-1 block">علب تأسيس مفاتيح وبرايز الإنارة</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                    <div className="bg-[#020B1C] p-2 rounded-xl border border-[#1f2d4d] h-11 flex flex-col items-center justify-between gap-1 select-none">
                      <span className="text-[9px] text-gray-400 font-bold leading-none">الكمية (قطعة)</span>
                      <div className="flex items-center gap-1.5" dir="ltr">
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ backboxCount: prev.backboxCount + 5 }))} className="w-6 h-6 rounded-full bg-[#07132a] border border-[#1f2d4d] text-xs font-bold flex items-center justify-center text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] transition-all cursor-pointer font-sans">+</button>
                        <span className="text-xs font-bold text-white font-mono min-w-[20px] text-center">{state.backboxCount}</span>
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ backboxCount: Math.max(0, prev.backboxCount - 5) }))} className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90 font-sans">-</button>
                      </div>
                    </div>
                    {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                    <div className="bg-[#020B1C] p-2 rounded-xl border border-[#1f2d4d] h-11 flex flex-col items-center justify-between gap-1 select-none">
                      <span className="text-[9px] text-gray-400 font-bold leading-none">السعر (ج.م)</span>
                      <div className="flex items-center gap-1.5" dir="ltr">
                        <button type="button" onClick={() => handleRateChange('backboxRate', (state.accessoriesRates.backboxRate ?? 8) + 1)} className="w-6 h-6 rounded-full bg-[#07132a] border border-[#1f2d4d] text-xs font-bold flex items-center justify-center text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] transition-all cursor-pointer font-sans">+</button>
                        <span className="text-xs font-bold text-white font-mono min-w-[20px] text-center">{state.accessoriesRates.backboxRate}</span>
                        <button type="button" onClick={() => handleRateChange('backboxRate', Math.max(0, (state.accessoriesRates.backboxRate ?? 8) - 1))} className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90 font-sans">-</button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#1f2d4d]/40 pt-2 flex items-center justify-between text-xs text-white select-none">
                    <span>إجمالي تكلفة العلب:</span>
                    <span className="text-[#D4AF37] font-black">{totalBackboxCost.toLocaleString()} ج.م</span>
                  </div>
                </div>

                {/* خراطيم الأرضيات */}
                <div className="p-5 rounded-[2rem] bg-[#07132a] border border-[#1f2d4d] flex flex-col justify-between min-h-[190px] space-y-4 hover:border-[#D4AF37]/40 transition-all shadow-md">
                  <div className="text-right">
                    <span className="text-sm font-black text-[#D4AF37] block">خراطيم أرضيات </span>
                    <span className="text-xs text-white mt-1 block ">خراطيم تمديد أرضية مرنة</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                    <div className="bg-[#020B1C] p-2 rounded-xl border border-[#1f2d4d] h-11 flex flex-col items-center justify-between gap-1 select-none">
                      <span className="text-[9px] text-gray-400 font-bold leading-none">الكمية (لفة)</span>
                      <div className="flex items-center gap-1.5" dir="ltr">
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ floorConduitCount: prev.floorConduitCount + 1 }))} className="w-6 h-6 rounded-full bg-[#07132a] border border-[#1f2d4d] text-xs font-bold flex items-center justify-center text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] transition-all cursor-pointer font-sans">+</button>
                        <span className="text-xs font-bold text-white font-mono min-w-[20px] text-center">{state.floorConduitCount}</span>
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ floorConduitCount: Math.max(0, prev.floorConduitCount - 1) }))} className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90 font-sans">-</button>
                      </div>
                    </div>
                    {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                    <div className="bg-[#020B1C] p-2 rounded-xl border border-[#1f2d4d] h-11 flex flex-col items-center justify-between gap-1 select-none">
                      <span className="text-[9px] text-gray-400 font-bold leading-none">السعر (ج.م)</span>
                      <div className="flex items-center gap-1.5" dir="ltr">
                        <button type="button" onClick={() => handleRateChange('floorConduitRate', (state.accessoriesRates.floorConduitRate ?? 180) + 10)} className="w-6 h-6 rounded-full bg-[#07132a] border border-[#1f2d4d] text-xs font-bold flex items-center justify-center text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-all cursor-pointer font-sans">+</button>
                        <span className="text-xs font-bold text-white font-mono min-w-[20px] text-center">{state.accessoriesRates.floorConduitRate}</span>
                        <button type="button" onClick={() => handleRateChange('floorConduitRate', Math.max(0, (state.accessoriesRates.floorConduitRate ?? 180) - 10))} className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90 font-sans">-</button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#1f2d4d]/40 pt-2 flex items-center justify-between text-xs text-white select-none">
                    <span>إجمالي تكلفة خراطيم الارضيات:</span>
                    <span className="text-[#D4AF37] font-black">{totalFloorConduitCost.toLocaleString()} ج.م</span>
                  </div>
                </div>

                {/* خراطيم الحوائط */}
                <div className="p-5 rounded-[2rem] bg-[#07132a] border border-[#1f2d4d] flex flex-col justify-between min-h-[190px] space-y-4 hover:border-[#D4AF37]/40 transition-all shadow-md">
                  <div className="text-right">
                    <span className="text-sm font-black text-[#D4AF37] block">خراطيم حوائط </span>
                    <span className="text-xs text-white mt-1 block ">خراطيم حوائط وجدران مرنة</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                    <div className="bg-[#020B1C] p-2 rounded-xl border border-[#1f2d4d] h-11 flex flex-col items-center justify-between gap-1 select-none">
                      <span className="text-[9px] text-gray-400 font-bold leading-none">الكمية (لفة)</span>
                      <div className="flex items-center gap-1.5" dir="ltr">
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ wallConduitCount: prev.wallConduitCount + 1 }))} className="w-6 h-6 rounded-full bg-[#07132a] border border-[#1f2d4d] text-xs font-bold flex items-center justify-center text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-all cursor-pointer font-sans">+</button>
                        <span className="text-xs font-bold text-white font-mono min-w-[20px] text-center">{state.wallConduitCount}</span>
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ wallConduitCount: Math.max(0, prev.wallConduitCount - 1) }))} className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90 font-sans">-</button>
                      </div>
                    </div>
                    {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                    <div className="bg-[#020B1C] p-2 rounded-xl border border-[#1f2d4d] h-11 flex flex-col items-center justify-between gap-1 select-none">
                      <span className="text-[9px] text-gray-400 font-bold leading-none">السعر (ج.م)</span>
                      <div className="flex items-center gap-1.5" dir="ltr">
                        <button type="button" onClick={() => handleRateChange('wallConduitRate', (state.accessoriesRates.wallConduitRate ?? 220) + 10)} className="w-6 h-6 rounded-full bg-[#07132a] border border-[#1f2d4d] text-xs font-bold flex items-center justify-center text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-all cursor-pointer font-sans">+</button>
                        <span className="text-xs font-bold text-white font-mono min-w-[20px] text-center">{state.accessoriesRates.wallConduitRate}</span>
                        <button type="button" onClick={() => handleRateChange('wallConduitRate', Math.max(0, (state.accessoriesRates.wallConduitRate ?? 220) - 10))} className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#1f2d4d] text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs flex items-center justify-center cursor-pointer font-sans">-</button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#1f2d4d]/40 pt-2 flex items-center justify-between text-xs text-white select-none">
                    <span>إجمالي تكلفة خراطيم الحوائط:</span>
                    <span className="text-[#D4AF37] font-black">{totalWallConduitCost.toLocaleString()} ج.م</span>
                  </div>
                </div>

              </div>

              {/* جدول حصر ومفاضلة أسلاك السويدي المعتمدة */}
              <div className="p-6 rounded-2xl bg-[#07132a] border border-[#D4AF37] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D4AF37] pb-3">
                  <span className="text-lg font-bold text-[#D4AF37] block"> حصر كمية الاسلاك المطلوبة :</span>
                  <button
                    type="button"
                    onClick={handleAddWireRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/20 text-xs font-bold cursor-pointer font-alexandria"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>إضافة منتج جديد مخصص</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs text-slate-300">
                    <thead>
                      <tr className="border-b border-[#D4AF37] pb-2 text-[#D4AF37] font-bold">
                        <th className="py-2">نوع وقطر السلك</th>
                        <th className="py-2 text-center">الكمية (لفة)</th>
                        <th className="py-2 text-center">سعر اللفة</th>
                        <th className="py-2 text-center">إجمالي التكلفة</th>
                        <th className="py-2 text-center">حذف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.wiresList.map((row) => (
                        <tr key={row.id} className="border-b border-[#1f2d4d]/40 hover:bg-[#020B1C]/25 transition-colors">
                          <td className="py-3 font-semibold text-xs text-white w-[290px]">
                            <select
                              value={row.wireType}
                              onChange={(e) => handleWireRowEdit(row.id, { wireType: e.target.value })}
                              className="bg-[#020B1C] border border-[#1f2d4d] p-1 rounded-md text-white outline-none cursor-pointer focus:border-[#D4AF37]"
                            >
                              <option>سلك السويدي معتمد م مقطع 1.5 مم</option>
                              <option>سلك السويدي معتمد م مقطع 2 مم</option>
                              <option>سلك السويدي معتمد م مقطع 3 مم</option>
                              <option>سلك السويدي معتمد م مقطع 4 مم</option>
                              <option>سلك السويدي معتمد م مقطع 6 مم</option>
                              <option>سلك السويدي معتمد م مقطع 10 مم</option>
                            </select>
                          </td>
                          <td className="py-3 text-center">
                            {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                            <div className="flex items-center justify-between px-3 h-11 rounded-xl bg-[#020B1C] border border-[#1f2d4d] px-2 select-none " dir="ltr">
                              <button type="button" onClick={() => handleWireRowEdit(row.id, { quantity: row.quantity + 1 })} className="w-6 h-6 rounded-full bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] font-bold text-xs flex items-center justify-center cursor-pointer font-sans">+</button>
                              <span className="text-xs font-bold text-white font-mono">{row.quantity}</span>
                              <button type="button" onClick={() => handleWireRowEdit(row.id, { quantity: Math.max(1, row.quantity - 1) })} className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white font-bold text-xs flex items-center justify-center cursor-pointer font-sans">-</button>
                            </div>
                          </td>
                          <td className="py-3 text-center font-mono font-bold text-slate-300">
                            {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                            <div className="flex items-center justify-between px-3 h-11 rounded-xl bg-[#020B1C] border border-[#1f2d4d] px-2 select-none w-36 mx-auto" dir="ltr">
                              <button type="button" onClick={() => handleWireRowEdit(row.id, { rate: row.rate + 50 })} className="w-6 h-6 rounded-full bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] font-bold text-xs flex items-center justify-center cursor-pointer font-sans">+</button>
                              <span className="text-xs font-bold text-white font-mono">{row.rate}</span>
                              <button type="button" onClick={() => handleWireRowEdit(row.id, { rate: Math.max(0, row.rate - 50) })} className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer font-sans">-</button>
                            </div>
                          </td>
                          <td className="py-3 text-center font-mono font-black text-[#D4AF37]">{(row.quantity * row.rate).toLocaleString()} ج</td>
                          <td className="py-3 text-center">
                            <button type="button" onClick={() => handleRemoveWireRow(row.id)} className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-all cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* لوحات الكهرباء الرئيسية الحركية المعتمدة من سوبابيز فكاً لاحتكار شنايدر */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* كارت اللوحة الرئيسية حركياً بتكبير خط وتلوينه بالبني */}
                <div 
                  onClick={() => { const nextVal = !state.hasMainPanel; updateStateAndSave(prev => ({ hasMainPanel: nextVal })); }}
                  className={`p-5 rounded-[2rem] border transition-all duration-500 flex flex-col justify-between min-h-[160px] select-none ${
                    state.hasMainPanel
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_20px_rgba(212,175,55,0.08)] opacity-100' 
                      : 'border-[#1f2d4d] bg-[#020B1C]/40 opacity-40 hover:opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-[#1f2d4d]/30 pb-2">
                    <span className="text-sm font-black text-white block">لوحة الكهرباء الرئيسية</span>
                    <div className={`p-1 rounded ${state.hasMainPanel ? 'text-[#D4AF37]' : 'text-gray-500'}`}>
                      {state.hasMainPanel ? <Check className="w-4 h-4 stroke-[3]" /> : <Minus className="w-4 h-4" />}
                    </div>
                  </div>
                  
                  {state.hasMainPanel && (
                    <div className="space-y-3 mt-2" onClick={(e) => e.stopPropagation()}>
                      <select
                        disabled={!state.enabled}
                        value={state.selectedMainPanelId}
                        onChange={(e) => handleMainPanelChange(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-sm text-[#B48C34] outline-none focus:border-[#D4AF37] cursor-pointer"
                      >
                        {dbProducts.filter(p => p.subcategory === 'لوحة' || p.product_name.toLowerCase().includes('لوح')).map(prod => (
                          <option key={prod.id} value={prod.id} className="bg-[#020B1C] text-white">
                            {prod.company ? `${prod.company} - ` : ''}{prod.product_name}
                          </option>
                        ))}
                      </select>
                      
                      {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                      <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none">
                        <button type="button" onClick={() => handleRateChange('mainPanelRate', (state.accessoriesRates.mainPanelRate ?? 1800) + 100)} className="w-7 h-7 rounded-lg bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                        <span className="text-base font-black text-[#D4AF37] font-mono">{(state.accessoriesRates.mainPanelRate ?? 1800).toLocaleString()} <span className="text-[10px] text-gray-500 font-normal">ج.م</span></span>
                        <button type="button" onClick={() => handleRateChange('mainPanelRate', Math.max(0, (state.accessoriesRates.mainPanelRate ?? 1800) - 100))} className="w-7 h-7 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* كارت لوحة التيار الخفيف حركياً بتكبير خط وتلوينه بالبني */}
                <div 
                  onClick={() => { const nextVal = !state.hasLowCurrentPanel; updateStateAndSave(prev => ({ hasLowCurrentPanel: nextVal })); }}
                  className={`p-5 rounded-[2rem] border transition-all duration-300 flex flex-col justify-between min-h-[160px] select-none ${
                    state.hasLowCurrentPanel
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_20px_rgba(212,175,55,0.08)] opacity-100' 
                      : 'border-[#1f2d4d] bg-[#020B1C]/40 opacity-40 hover:opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-[#1f2d4d]/30 pb-2">
                    <span className="text-sm font-black text-white block">لوحة تيار خفيف وداتا</span>
                    <div className={`p-1 rounded ${state.hasLowCurrentPanel ? 'text-[#D4AF37]' : 'text-gray-500'}`}>
                      {state.hasLowCurrentPanel ? <Check className="w-4 h-4 stroke-[3]" /> : <Minus className="w-4 h-4" />}
                    </div>
                  </div>
                  
                  {state.hasLowCurrentPanel && (
                    <div className="space-y-3 mt-2" onClick={(e) => e.stopPropagation()}>
                      <select
                        disabled={!state.enabled}
                        value={state.selectedLowCurrentPanelId}
                        onChange={(e) => handleLowCurrentPanelChange(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-sm text-[#B48C34] outline-none focus:border-[#D4AF37] cursor-pointer"
                      >
                        {dbProducts.filter(p => p.subcategory === 'لوحة' || p.product_name.toLowerCase().includes('لوح')).map(prod => (
                          <option key={prod.id} value={prod.id} className="bg-[#020B1C] text-white">
                            {prod.company ? `${prod.company} - ` : ''}{prod.product_name}
                          </option>
                        ))}
                      </select>
                      
                      {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                      <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none">
                        <button type="button" onClick={() => handleLowCurrentPanelChange(state.selectedLowCurrentPanelId)} className="w-7 h-7 rounded-lg bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                        <span className="text-base font-black text-[#D4AF37] font-mono">{(state.accessoriesRates.lowCurrentPanelRate ?? 1200).toLocaleString()} <span className="text-[10px] text-gray-500 font-normal">ج.م</span></span>
                        <button type="button" onClick={() => handleLowCurrentPanelChange(state.selectedLowCurrentPanelId)} className="w-7 h-7 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* مفاتيح اتوماتيك عمومية مع تكبير السعر ووضع عداد فخم */}
                <div className="p-5 rounded-[2rem] bg-[#07132a] border border-[#1f2d4d] flex flex-col justify-between min-h-[160px] select-none hover:border-[#D4AF37]/40 transition-all shadow-md">
                  <div className="flex items-center justify-between border-b border-[#1f2d4d]/30 pb-2">
                    <span className="text-sm font-black text-white block">مفاتيح أوتوماتيك رئيسية</span>
                  </div>
                  
                  <div className="space-y-3 mt-1">
                    {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                    <div className="flex items-center justify-between text-right">
                      <span className="text-xs text-gray-500 font-bold">سعر المفتاح:</span>
                      <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-36">
                        <button type="button" onClick={() => handleRateChange('automaticBreakerRate', (state.accessoriesRates.automaticBreakerRate ?? 180) + 10)} className="w-6 h-6 rounded-full bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                        <span className="text-sm font-black text-[#D4AF37] font-mono">{(state.accessoriesRates.automaticBreakerRate ?? 180)} <span className="text-[8px] text-gray-500">ج.م</span></span>
                        <button type="button" onClick={() => handleRateChange('automaticBreakerRate', Math.max(0, (state.accessoriesRates.automaticBreakerRate ?? 180) - 10))} className="w-6 h-6 rounded-full bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                      </div>
                    </div>

                    {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                    <div className="flex items-center justify-between text-right">
                      <span className="text-xs text-gray-500 font-bold"> الكمية:</span>
                      <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-36">
                        <button type="button" onClick={() => { const val = state.automaticBreakerCount + 1; updateStateAndSave(prev => ({ automaticBreakerCount: val })); }} className="w-6 h-6 rounded-full bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                        <span className="text-sm font-black text-white font-mono">{state.automaticBreakerCount}</span>
                        <button type="button" onClick={() => { const val = Math.max(0, state.automaticBreakerCount - 1); updateStateAndSave(prev => ({ automaticBreakerCount: val })); }} className="w-6 h-6 rounded-full bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* بطاقات كماليات ومستلزمات التأسيس مع عدادات السعر الفردي التفاعلية الفاخرة للكماليات الأربعة */}
              <div className="p-6 rounded-2xl bg-[#07132a] border border-[#D4AF37] space-y-4 shadow-xl">
                <span className="text-lg font-bold text-[#D4AF37] block border-b border-[#D4AF37] pb-2">مستلزمات وكماليات مرحلة التأسيس ومخارج التثبيت:</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  
                  {/* شريط شكرتون عازل مع عداد السعر */}
                  <div className="p-5 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex flex-col justify-between min-h-[170px] space-y-3 hover:border-[#D4AF37]/30 transition-all shadow-sm">
                    <div className="text-right">
                      <span className="text-xs text-[#D4AF37] block">شريط شكرتون عازل</span>
                      <span className="text-[10px] text-white mt-1 block">شريط عازل للأسلاك</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                      <div className="bg-[#07132a]/60 p-2 rounded-xl h-11 flex flex-col items-center justify-between gap-1 select-none">
                        <span className="text-[9px] text-gray-400 font-bold leading-none">الكمية</span>
                        <div className="flex items-center gap-1.5" dir="ltr">
                          <button type="button" onClick={() => { const val = state.insulationTapeCount + 1; updateStateAndSave(prev => ({ insulationTapeCount: val })); }} className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#1f2d4d] text-xs font-bold flex items-center justify-center text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] transition-all cursor-pointer font-sans">+</button>
                          <span className="text-xs font-bold text-white font-mono min-w-[12px] text-center">{state.insulationTapeCount}</span>
                          <button type="button" onClick={() => { const val = Math.max(0, state.insulationTapeCount - 1); updateStateAndSave(prev => ({ insulationTapeCount: val })); }} className="w-6 h-6 rounded-full bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs flex items-center justify-center cursor-pointer font-sans">-</button>
                        </div>
                      </div>
                      {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                      <div className="bg-[#07132a]/60 p-2 rounded-xl h-11 flex flex-col items-center justify-between gap-1 select-none">
                        <span className="text-[9px] text-gray-400 font-bold leading-none">السعر (ج)</span>
                        <div className="flex items-center gap-1.5" dir="ltr">
                          <button type="button" onClick={() => handleRateChange('insulationTapeRate', (state.accessoriesRates.insulationTapeRate ?? 15) + 2)} className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#1f2d4d] text-xs font-bold flex items-center justify-center text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] transition-all cursor-pointer font-sans">+</button>
                          <span className="text-xs font-bold text-white font-mono min-w-[12px] text-center">{state.accessoriesRates.insulationTapeRate}</span>
                          <button type="button" onClick={() => handleRateChange('insulationTapeRate', Math.max(0, (state.accessoriesRates.insulationTapeRate ?? 15) - 2))} className="w-6 h-6 rounded-full bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs flex items-center justify-center cursor-pointer font-sans">-</button>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[#1f2d4d]/30 pt-1.5 flex justify-between items-center text-[12px] text-white select-none">
                      <span>الاجمالى :</span>
                      <span className="text-xs text-[#D4AF37] font-bold">{totalInsulationTapeCost.toLocaleString()} ج.م</span>
                    </div>
                  </div>

                  {/* لمبات تجريبية مع تفعيل عداد السعر */}
                  <div className="p-5 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex flex-col justify-between min-h-[170px] space-y-3 hover:border-[#D4AF37]/30 transition-all shadow-sm">
                    <div className="text-right">
                      <span className="text-xs text-[#D4AF37] block">لمبات ليد</span>
                      <span className="text-[10px] text-white mt-1 block">لمبات ليد لتجريب خطوط الإنارة</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                      <div className="bg-[#07132a]/60 p-2 rounded-xl h-11 flex flex-col items-center justify-between gap-1 select-none">
                        <span className="text-[9px] text-gray-400 font-bold leading-none">الكمية</span>
                        <div className="flex items-center gap-1.5" dir="ltr">
                          <button type="button" onClick={() => { const val = state.temporaryBulbCount + 1; updateStateAndSave(prev => ({ temporaryBulbCount: val })); }} className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#1f2d4d] text-xs font-bold flex items-center justify-center text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] transition-all cursor-pointer font-sans">+</button>
                          <span className="text-xs font-bold text-white font-mono min-w-[12px] text-center">{state.temporaryBulbCount}</span>
                          <button type="button" onClick={() => { const val = Math.max(0, state.temporaryBulbCount - 1); updateStateAndSave(prev => ({ temporaryBulbCount: val })); }} className="w-6 h-6 rounded-full bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs flex items-center justify-center cursor-pointer font-sans">-</button>
                        </div>
                      </div>
                      {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                      <div className="bg-[#07132a]/60 p-2 rounded-xl h-11 flex flex-col items-center justify-between gap-1 select-none">
                        <span className="text-[9px] text-gray-400 font-bold leading-none">السعر (ج)</span>
                        <div className="flex items-center gap-1.5" dir="ltr">
                          <button type="button" onClick={() => handleRateChange('temporaryBulbRate', (state.accessoriesRates.temporaryBulbRate ?? 25) + 5)} className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#1f2d4d] text-xs font-bold flex items-center justify-center text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] transition-all cursor-pointer font-sans">+</button>
                          <span className="text-xs font-bold text-white font-mono min-w-[12px] text-center">{state.accessoriesRates.temporaryBulbRate}</span>
                          <button type="button" onClick={() => handleRateChange('temporaryBulbRate', Math.max(0, (state.accessoriesRates.temporaryBulbRate ?? 25) - 5))} className="w-6 h-6 rounded-full bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs flex items-center justify-center cursor-pointer font-sans">-</button>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[#1f2d4d]/30 pt-1.5 flex justify-between items-center text-[12px] text-white select-none">
                      <span> الاجمالى:</span>
                      <span className="text-xs text-[#D4AF37] font-bold">{totalTemporaryBulbCost.toLocaleString()} ج.م</span>
                    </div>
                  </div>

                  {/* دوايات اختبار مع تفعيل عداد السعر */}
                  <div className="p-5 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex flex-col justify-between min-h-[170px] space-y-3 hover:border-[#D4AF37]/30 transition-all shadow-sm">
                    <div className="text-right">
                      <span className="text-xs font-bold text-[#D4AF37] block">دواية لمبات</span>
                      <span className="text-[10px] text-white mt-1 block">دوايات مؤقتة</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                      <div className="bg-[#07132a]/60 p-2 rounded-xl h-11 flex flex-col items-center justify-between gap-1 select-none">
                        <span className="text-[9px] text-gray-400 font-bold leading-none">الكمية</span>
                        <div className="flex items-center gap-1.5" dir="ltr">
                          <button type="button" onClick={() => { const val = state.socketTestCount + 1; updateStateAndSave(prev => ({ socketTestCount: val })); }} className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#1f2d4d] text-xs font-bold flex items-center justify-center text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] transition-all cursor-pointer font-sans">+</button>
                          <span className="text-xs font-bold text-white font-mono min-w-[12px] text-center">{state.socketTestCount}</span>
                          <button type="button" onClick={() => { const val = Math.max(0, state.socketTestCount - 1); updateStateAndSave(prev => ({ socketTestCount: val })); }} className="w-6 h-6 rounded-full bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs flex items-center justify-center cursor-pointer font-sans">-</button>
                        </div>
                      </div>
                      {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                      <div className="bg-[#07132a]/60 p-2 rounded-xl h-11 flex flex-col items-center justify-between gap-1 select-none">
                        <span className="text-[9px] text-gray-400 font-bold leading-none">السعر (ج)</span>
                        <div className="flex items-center gap-1.5" dir="ltr">
                          <button type="button" onClick={() => handleRateChange('socketTestRate', (state.accessoriesRates.socketTestRate ?? 12) + 2)} className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#1f2d4d] text-xs font-bold flex items-center justify-center text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] transition-all cursor-pointer font-sans">+</button>
                          <span className="text-xs font-bold text-white font-mono min-w-[12px] text-center">{state.accessoriesRates.socketTestRate}</span>
                          <button type="button" onClick={() => handleRateChange('socketTestRate', Math.max(0, (state.accessoriesRates.socketTestRate ?? 12) - 2))} className="w-6 h-6 rounded-full bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs flex items-center justify-center cursor-pointer font-sans">-</button>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[#1f2d4d]/30 pt-1.5 flex justify-between items-center text-[12px] text-white select-none">
                      <span> الاجمالى:</span>
                      <span className="text-xs text-[#D4AF37] font-bold">{totalSocketTestCost.toLocaleString()} ج.م</span>
                    </div>
                  </div>

                  {/* أسمنت ورمل للتثبيت مع عداد السعر الفردي للشكارة */}
                  <div className="p-5 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex flex-col justify-between min-h-[170px] space-y-3 hover:border-[#D4AF37]/30 transition-all shadow-sm">
                    <div className="text-right">
                      <span className="text-xs text-[#D4AF37] block">أسمنت ورمل </span>
                      <span className="text-[10px] text-white mt-1 block">أسمنت ورمل للتثبيت   </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                      <div className="bg-[#07132a]/60 p-2 rounded-xl h-11 flex flex-col items-center justify-between gap-1 select-none">
                        <span className="text-[9px] text-gray-400 font-bold leading-none">الكمية</span>
                        <div className="flex items-center gap-1.5" dir="ltr">
                          <button type="button" onClick={() => { const val = state.cementSandBagCount + 1; updateStateAndSave(prev => ({ cementSandBagCount: val })); }} className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#1f2d4d] text-xs font-bold flex items-center justify-center text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] transition-all cursor-pointer font-sans">+</button>
                          <span className="text-xs font-bold text-white font-mono min-w-[12px] text-center">{state.cementSandBagCount}</span>
                          <button type="button" onClick={() => { const val = Math.max(0, state.cementSandBagCount - 1); updateStateAndSave(prev => ({ cementSandBagCount: val })); }} className="w-6 h-6 rounded-full bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs flex items-center justify-center cursor-pointer font-sans">-</button>
                        </div>
                      </div>
                      {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                      <div className="bg-[#07132a]/60 p-2 rounded-xl h-11 flex flex-col items-center justify-between gap-1 select-none">
                        <span className="text-[9px] text-gray-400 font-bold leading-none">السعر (ج)</span>
                        <div className="flex items-center gap-1.5" dir="ltr">
                          <button type="button" onClick={() => handleRateChange('cementSandRate', (state.accessoriesRates.cementSandRate ?? 450) + 50)} className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#1f2d4d] text-xs font-bold flex items-center justify-center text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] transition-all cursor-pointer font-sans">+</button>
                          <span className="text-xs font-bold text-white font-mono min-w-[12px] text-center">{state.accessoriesRates.cementSandRate}</span>
                          <button type="button" onClick={() => handleRateChange('cementSandRate', Math.max(0, (state.accessoriesRates.cementSandRate ?? 450) - 50))} className="w-6 h-6 rounded-full bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs flex items-center justify-center cursor-pointer font-sans">-</button>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[#1f2d4d]/30 pt-1.5 flex justify-between items-center text-[12px] text-white select-none">
                      <span> الاجمالى:</span>
                      <span className="text-xs text-[#D4AF37] font-bold">{totalCementSandCost.toLocaleString()} ج.م</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* إعادة تصميم كروت الإضافة الحرة للتأسيس لتكون فاخرة */}
              <div className="p-6 rounded-2xl bg-[#07132a] border border-[#D4AF37] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D4AF37] pb-3">
                  <span className="text-lg font-bold text-[#D4AF37]">بنود وخامات تأسيس مخصصة وإضافية للعميل:</span>
                  <button type="button" onClick={handleAddCustomRoughIn} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-sm text-[#D4AF37] transition-all cursor-pointer font-alexandria">
                    <PlusCircle className="w-5 h-5" />
                    <span>إضافة بند</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {state.customRoughInList.map(item => (
                    <div key={item.id} className="p-5 rounded-3xl border border-[#1f2d4d] bg-[#020B1C]/40 hover:border-[#D4AF37]/50 shadow-md hover:shadow-[0_0_25px_rgba(212,175,55,0.06)] transition-all duration-300 flex flex-col justify-between gap-4 text-right">
                      <div className="flex justify-between items-center border-b border-[#1f2d4d]/30 pb-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-[#D4AF37]/10 text-[#D4AF37] font-semibold border border-[#D4AF37]/20">تأسيس مخصص</span>
                        <button type="button" onClick={() => handleRemoveCustomRoughIn(item.id)} className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"><Trash2 className="w-5 h-5" /></button>
                      </div>
                      <div className="space-y-3">
                        <input type="text" value={item.name} onChange={(e) => handleCustomRoughInEdit(item.id, { name: e.target.value })} className="w-full h-11 px-3 rounded-xl bg-[#07132a] border border-[#1f2d4d] text-sm text-white font-bold outline-none focus:border-[#D4AF37]" placeholder="مسمى البند مخصص..." />
                        
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <span className="text-[10px] text-gray-500 font-bold block mb-1">الكمية:</span>
                            {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                            <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-2">
                              <button type="button" onClick={() => handleCustomRoughInEdit(item.id, { quantity: (item.quantity ?? 1) + 1 })} className="text-[#D4AF37] font-bold text-sm cursor-pointer font-sans">+</button>
                              <span className="text-sm font-black text-white">{item.quantity}</span>
                              <button type="button" onClick={() => handleCustomRoughInEdit(item.id, { quantity: Math.max(1, (item.quantity ?? 1) - 1) })} className="text-red-400 font-bold text-sm cursor-pointer font-sans">-</button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] text-gray-500 font-bold block mb-1">الوحدة:</span>
                            <input type="text" value={item.unit} onChange={(e) => handleCustomRoughInEdit(item.id, { unit: e.target.value })} className="w-full h-11 px-2 bg-[#07132a] border border-[#1f2d4d] rounded-xl text-xs text-white text-center font-bold outline-none" />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] text-gray-500 font-bold block mb-1">السعر:</span>
                            {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                            <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none">
                              <button type="button" onClick={() => handleCustomRoughInEdit(item.id, { rate: (item.rate ?? 0) + 100 })} className="text-[#D4AF37] font-bold text-sm cursor-pointer font-sans">+</button>
                              <span className="text-xs font-black text-[#D4AF37] font-mono">{item.rate}</span>
                              <button type="button" onClick={() => handleCustomRoughInEdit(item.id, { rate: Math.max(0, (item.rate ?? 0) - 100) })} className="text-red-400 font-bold text-sm cursor-pointer font-sans">-</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* مصنعية أعمال تأسيس الكهرباء */}
              <div className="p-6 rounded-2xl bg-[#07132a] border border-[#D4AF37] flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
                <div className="space-y-1 text-center sm:text-right">
                  <span className="text-md font-bold text-[#D4AF37] block">إجمالي مصنعية تأسيس الكهرباء (مقطوعية)</span>
                  <p className="text-xs text-white">مصنعية الفنى للتكسير وتركيب العلب وتمديد الخراطيم والاسلاك والتأسيس بميزان ليزر</p>
                </div>
                {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-44">
                  <button type="button" onClick={() => { const v = state.roughInLaborCost + 500; updateStateAndSave(prev => ({ roughInLaborCost: v })); }} className="w-7 h-7 rounded-lg bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                  <span className="text-base font-black text-[#D4AF37] font-mono">{state.roughInLaborCost.toLocaleString()} <span className="text-[9px] text-[#D4AF37] font-normal">ج.م</span></span>
                  <button type="button" onClick={() => { const v = Math.max(0, state.roughInLaborCost - 500); updateStateAndSave(prev => ({ roughInLaborCost: v })); }} className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* القسم الثاني: مرحلة تشطيب الكهرباء (Finishing Stage) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[#D4AF37] pb-2 text-[#D4AF37]">
            <Zap className="w-5 h-5 animate-pulse" />
            <h4 className="text-lg font-bold text-[#D4AF37]">القسم الثاني: مرحلة تركيب وشوش ومفاتيح الإنارة (التشطيب):</h4>
          </div>

          <div 
            onClick={() => {
              const nextVal = !state.finishingActive;
              updateStateAndSave(prev => ({ finishingActive: nextVal }));
            }}
            className={`p-6 rounded-3xl border transition-all duration-300 cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-6 ${
              state.finishingActive 
                ? 'border-[#D4AF37] bg-gradient-to-r from-[#07132a] to-[#D4AF37]/5 shadow-[0_0_20px_rgba(212,175,55,0.08)] opacity-100' 
                : 'border-[#1f2d4d] bg-[#020B1C]/40 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex-shrink-0">
              {state.finishingActive ? (
                <div className="py-3 px-6 rounded-2xl bg-[#D4AF37] text-[#020B1C]  text-base flex items-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>تفعيل التشطيب</span>
                </div>
              ) : (
                <div className="py-3 px-6 rounded-2xl bg-[#1c2844] text-[#F0E6D2] text-base border border-[#1f2d4d]">
                  <span>الغاء تفعيل التشطيب</span>
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-right space-y-1 pr-4">
              <h4 className="text-md font-bold text-[#D4AF37]">تفعيل تشطيب كهرباء الشقة بالكامل </h4>
              <p className="text-sm text-white leading-relaxed">تشمل المفاتيح واللقم والشاسيهات والوشوش الخارجية والليد والمصنعية</p>
            </div>

            <div className={`p-4 rounded-full flex-shrink-0 transition-all duration-300 ${state.finishingActive ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'bg-[#1f2d4d]/30 text-gray-500'}`}>
              <Zap className="w-8 h-8" />
            </div>
          </div>

          {/* لوحة حصر قطع ومستلزمات التشطيب */}
          {state.finishingActive && (
            <div className="p-8 rounded-3xl bg-[#020B1C]/60 border border-[#1f2d4d] space-y-6">
              
              {/* اختيار براند منتجات التشطيب حركياً */}
              <div className="p-5 rounded-2xl bg-[#07132a] border border-[#D4AF37] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-right">
                  <span className="text-md font-bold text-[#D4AF37] block">اختيار براند الوشوش والمفاتيح للتشطيب:</span>
                  <span className="text-[10px] text-white block leading-normal pt-1">سيقوم النظام بضرب أسعار القطع بالكامل بناءً على سعر براند التشطيب المعتمد من العميل</span>
                </div>
                <div className="flex gap-2">
                   {Array.from(new Set(dbOutlets.map((o: ElectricalProductItem) => o.company).filter(Boolean))).map((brandName) => {
                    const brandStr = brandName as string;
                    return (
                    <button 
                      key={brandStr}
                      type="button" 
                      onClick={() => updateStateAndSave(prev => ({ selectedBrand: brandStr as any }))} 
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        state.selectedBrand === brandStr
                          ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#D4AF37]' 
                          : 'bg-[#020B1C] border-[#1f2d4d] text-gray-500'
                      }`}
                    >
                      {brandStr}
                    </button>
                  );})}
                </div>
              </div>

              {/* قطع التشطيب الأساسية مع فك جمود أسعارها وجعلها مرنة قابلة للتعديل يدوياً بالعدادات */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* مفاتيح إنارة عادية */}
                <div className="p-5 rounded-3xl bg-[#07132a] border border-[#1f2d4d] flex flex-col justify-between min-h-[140px] hover:border-[#D4AF37]/40 transition-all select-none">
                  <div className="flex items-center justify-between border-b border-[#1f2d4d]/30 pb-2">
                    <span className="text-sm font-black text-[#D4AF37] block">مفاتيح إنارة</span>
                  </div>
                  <div className="space-y-3 mt-1">
                    {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                    <div className="flex items-center justify-between text-right">
                      <span className="text-xs text-white font-bold">السعر :</span>
                      <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-36" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => handleRateChange('rateSwitch', (state.accessoriesRates.rateSwitch ?? 35) + 5)} className="w-6 h-6 rounded-full bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                        <span className="text-sm font-black text-[#D4AF37] font-mono">{(state.accessoriesRates.rateSwitch ?? 35)} <span className="text-[8px] text-gray-500">ج.م</span></span>
                        <button type="button" onClick={() => handleRateChange('rateSwitch', Math.max(0, (state.accessoriesRates.rateSwitch ?? 35) - 5))} className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                      </div>
                    </div>
                    {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                    <div className="flex items-center justify-between text-right">
                      <span className="text-xs text-white font-bold">الكمية:</span>
                      <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-36" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ switchCount: prev.switchCount + 1 }))} className="w-6 h-6 rounded-full bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                        <span className="text-sm font-black text-white font-mono">{state.switchCount}</span>
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ switchCount: Math.max(0, prev.switchCount - 1) }))} className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* برايز ومآخذ شواحن */}
                <div className="p-5 rounded-3xl bg-[#07132a] border border-[#1f2d4d] flex flex-col justify-between min-h-[140px] hover:border-[#D4AF37]/40 transition-all select-none">
                  <div className="flex items-center justify-between border-b border-[#1f2d4d]/30 pb-2">
                    <span className="text-sm font-black text-[#D4AF37] block">برايز</span>
                  </div>
                  <div className="space-y-3 mt-1">
                    {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                    <div className="flex items-center justify-between text-right">
                      <span className="text-xs text-white font-bold">السعر :</span>
                      <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-36" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => handleRateChange('ratePlug', (state.accessoriesRates.ratePlug ?? 45) + 5)} className="w-6 h-6 rounded-full bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                        <span className="text-sm font-black text-[#D4AF37] font-mono">{(state.accessoriesRates.ratePlug ?? 45)} <span className="text-[8px] text-gray-500">ج.م</span></span>
                        <button type="button" onClick={() => handleRateChange('ratePlug', Math.max(0, (state.accessoriesRates.ratePlug ?? 45) - 5))} className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                      </div>
                    </div>
                    {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                    <div className="flex items-center justify-between text-right">
                      <span className="text-xs text-white font-bold">الكمية:</span>
                      <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-36" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ plugCount: prev.plugCount + 1 }))} className="w-6 h-6 rounded-full bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                        <span className="text-sm font-black text-white font-mono">{state.plugCount}</span>
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ plugCount: Math.max(0, prev.plugCount - 1) }))} className="w-6 h-6 rounded-full bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* وشوش خارجية فاخرة */}
                <div className="p-5 rounded-3xl bg-[#07132a] border border-[#1f2d4d] flex flex-col justify-between min-h-[140px] hover:border-[#D4AF37]/40 transition-all select-none">
                  <div className="flex items-center justify-between border-b border-[#1f2d4d]/30 pb-2">
                    <span className="text-sm font-black text-[#D4AF37] block">وشوش خارجية</span>
                  </div>
                  <div className="space-y-3 mt-1">
                    {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                    <div className="flex items-center justify-between text-right">
                      <span className="text-xs text-white font-bold">السعر :</span>
                      <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-36" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => handleRateChange('ratePlate', (state.accessoriesRates.ratePlate ?? 25) + 5)} className="w-6 h-6 rounded-full bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                        <span className="text-sm font-black text-[#D4AF37] font-mono">{(state.accessoriesRates.ratePlate ?? 25)} <span className="text-[8px] text-gray-500">ج.م</span></span>
                        <button type="button" onClick={() => handleRateChange('ratePlate', Math.max(0, (state.accessoriesRates.ratePlate ?? 25) - 5))} className="w-6 h-6 rounded-full bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                      </div>
                    </div>
                    {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                    <div className="flex items-center justify-between text-right">
                      <span className="text-xs text-gray-500 font-bold">الكمية:</span>
                      <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-36" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ plateCount: prev.plateCount + 1 }))} className="w-6 h-6 rounded-full bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                        <span className="text-sm font-black text-white font-mono">{state.plateCount}</span>
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ plateCount: Math.max(0, prev.plateCount - 1) }))} className="w-6 h-6 rounded-full bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* شاسيهات معدنية */}
                <div className="p-5 rounded-3xl bg-[#07132a] border border-[#1f2d4d] flex flex-col justify-between min-h-[140px] hover:border-[#D4AF37]/40 transition-all select-none">
                  <div className="flex items-center justify-between border-b border-[#1f2d4d]/30 pb-2">
                    <span className="text-sm font-black text-[#D4AF37] block">شاسيهات اللقم</span>
                  </div>
                  <div className="space-y-3 mt-1">
                    {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                    <div className="flex items-center justify-between text-right">
                      <span className="text-xs text-white font-bold">السعر :</span>
                      <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-36" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => handleRateChange('rateFrame', (state.accessoriesRates.rateFrame ?? 15) + 5)} className="w-6 h-6 rounded-full bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                        <span className="text-sm font-black text-[#D4AF37] font-mono">{(state.accessoriesRates.rateFrame ?? 15)} <span className="text-[8px] text-gray-500">ج.م</span></span>
                        <button type="button" onClick={() => handleRateChange('rateFrame', Math.max(0, (state.accessoriesRates.rateFrame ?? 15) - 5))} className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90 font-sans">-</button>
                      </div>
                    </div>
                    {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                    <div className="flex items-center justify-between text-right">
                      <span className="text-xs text-white font-bold">الكمية:</span>
                      <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-36" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ frameCount: prev.frameCount + 1 }))} className="w-6 h-6 rounded-full bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                        <span className="text-sm font-black text-white font-mono">{state.frameCount}</span>
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ frameCount: Math.max(0, prev.frameCount - 1) }))} className="w-6 h-6 rounded-full bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* سدادات وشوش فارغة */}
                <div className="p-5 rounded-3xl bg-[#07132a] border border-[#1f2d4d] flex flex-col justify-between min-h-[140px] hover:border-[#D4AF37]/40 transition-all select-none">
                  <div className="flex items-center justify-between border-b border-[#1f2d4d]/30 pb-2">
                    <span className="text-sm font-black text-[#D4AF37] block">سدادات وشوش </span>
                  </div>
                  <div className="space-y-3 mt-1">
                    {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                    <div className="flex items-center justify-between text-right">
                      <span className="text-xs text-white font-bold">السعر :</span>
                      <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-36" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => handleRateChange('rateBlank', (state.accessoriesRates.rateBlank ?? 8) + 2)} className="w-6 h-6 rounded-full bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                        <span className="text-sm font-black text-[#D4AF37] font-mono">{(state.accessoriesRates.rateBlank ?? 8)} <span className="text-[8px] text-gray-500">ج.م</span></span>
                        <button type="button" onClick={() => handleRateChange('rateBlank', Math.max(0, (state.accessoriesRates.rateBlank ?? 8) - 2))} className="w-6 h-6 rounded-full bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                      </div>
                    </div>
                    {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                    <div className="flex items-center justify-between text-right">
                      <span className="text-xs text-white font-bold">الكمية:</span>
                      <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-36" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ blankInsertCount: prev.blankInsertCount + 1 }))} className="w-6 h-6 rounded-full bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                        <span className="text-sm font-black text-white font-mono">{state.blankInsertCount}</span>
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ blankInsertCount: Math.max(0, prev.blankInsertCount - 1) }))} className="w-6 h-6 rounded-full bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* لقم قواطع فرعية */}
                <div className="p-5 rounded-3xl bg-[#07132a] border border-[#1f2d4d] flex flex-col justify-between min-h-[140px] hover:border-[#D4AF37]/40 transition-all select-none">
                  <div className="flex items-center justify-between border-b border-[#1f2d4d]/30 pb-2">
                    <span className="text-sm font-black text-[#D4AF37] block">لقم قواطع </span>
                  </div>
                  <div className="space-y-3 mt-1">
                    {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                    <div className="flex items-center justify-between text-right">
                      <span className="text-xs text-white font-bold">السعر :</span>
                      <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-36" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => handleRateChange('rateBreakerFinishing', (state.accessoriesRates.rateBreakerFinishing ?? 120) + 10)} className="w-6 h-6 rounded-full bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                        <span className="text-sm font-black text-[#D4AF37] font-mono">{(state.accessoriesRates.rateBreakerFinishing ?? 120)} <span className="text-[8px] text-gray-500">ج.م</span></span>
                        <button type="button" onClick={() => handleRateChange('rateBreakerFinishing', Math.max(0, (state.accessoriesRates.rateBreakerFinishing ?? 120) - 10))} className="w-6 h-6 rounded-full bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                      </div>
                    </div>
                    {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                    <div className="flex items-center justify-between text-right">
                      <span className="text-xs text-white font-bold">الكمية:</span>
                      <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-36" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ breakerFinishingCount: prev.breakerFinishingCount + 1 }))} className="w-6 h-6 rounded-full bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                        <span className="text-sm font-black text-white font-mono">{state.breakerFinishingCount}</span>
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ breakerFinishingCount: Math.max(0, prev.breakerFinishingCount - 1) }))} className="w-6 h-6 rounded-full bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* مفاتيح القوى الثقيلة بالتشطيب */}
              <div className="p-6 rounded-2xl bg-[#07132a] border border-[#D4AF37] space-y-4">
                <span className="text-md font-bold text-[#D4AF37] block border-b border-[#D4AF37] pb-2">لقم ومفاتيح القوى والخدمات المخصصة بالوحدة:</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* مفتاح تكييف */}
                  <div className="p-5 rounded-3xl bg-[#020B1C]/50 border border-[#1f2d4d] flex flex-col justify-between min-h-[140px] hover:border-[#D4AF37]/30 transition-all">
                    <div className="flex items-center justify-between border-b border-[#1f2d4d]/30 pb-2">
                      <span className="text-sm font-black text-[#D4AF37] block">مفتاح تكييف </span>
                    </div>
                    <div className="space-y-3 mt-1">
                      {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                      <div className="flex items-center justify-between text-right">
                        <span className="text-xs text-white font-bold">السعر :</span>
                        <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-36" onClick={(e) => e.stopPropagation()}>
                          <button type="button" onClick={() => handleRateChange('rateAcSwitch', (state.accessoriesRates.rateAcSwitch ?? 120) + 5)} className="w-6 h-6 rounded bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                          <span className="text-sm font-black text-[#D4AF37] font-mono">{(state.accessoriesRates.rateAcSwitch ?? 120)} <span className="text-[8px] text-gray-500">ج.م</span></span>
                          <button type="button" onClick={() => handleRateChange('rateAcSwitch', Math.max(0, (state.accessoriesRates.rateAcSwitch ?? 120) - 5))} className="w-6 h-6 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                        </div>
                      </div>
                      {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                      <div className="flex items-center justify-between text-right">
                        <span className="text-xs text-white font-bold">الكمية:</span>
                        <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-36" onClick={(e) => e.stopPropagation()}>
                          <button type="button" onClick={() => updateStateAndSave(prev => ({ acSwitchCount: prev.acSwitchCount + 1 }))} className="w-6 h-6 rounded bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                          <span className="text-sm font-black text-white font-mono">{state.acSwitchCount}</span>
                          <button type="button" onClick={() => updateStateAndSave(prev => ({ acSwitchCount: Math.max(0, prev.acSwitchCount - 1) }))} className="w-6 h-6 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* مفتاح سخان */}
                  <div className="p-5 rounded-3xl bg-[#020B1C]/50 border border-[#1f2d4d] flex flex-col justify-between min-h-[140px] hover:border-[#D4AF37]/30 transition-all">
                    <div className="flex items-center justify-between border-b border-[#1f2d4d]/30 pb-2">
                      <span className="text-sm font-black text-[#D4AF37] block">مفتاح سخان ثنائي مضيء</span>
                    </div>
                    <div className="space-y-3 mt-1">
                      {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                      <div className="flex items-center justify-between text-right">
                        <span className="text-xs text-white font-bold">السعر :</span>
                        <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-36" onClick={(e) => e.stopPropagation()}>
                          <button type="button" onClick={() => handleRateChange('rateHeaterSwitch', (state.accessoriesRates.rateHeaterSwitch ?? 120) + 10)} className="w-6 h-6 rounded bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                          <span className="text-sm font-black text-[#D4AF37] font-mono">{(state.accessoriesRates.rateHeaterSwitch ?? 120)} <span className="text-[8px] text-gray-500">ج.م</span></span>
                          <button type="button" onClick={() => handleRateChange('rateHeaterSwitch', Math.max(0, (state.accessoriesRates.rateHeaterSwitch ?? 120) - 10))} className="w-6 h-6 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                        </div>
                      </div>
                      {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                      <div className="flex items-center justify-between text-right">
                        <span className="text-xs text-white font-bold">الكمية:</span>
                        <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-36" onClick={(e) => e.stopPropagation()}>
                          <button type="button" onClick={() => updateStateAndSave(prev => ({ heaterSwitchCount: prev.heaterSwitchCount + 1 }))} className="w-6 h-6 rounded bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                          <span className="text-sm font-black text-white font-mono">{state.heaterSwitchCount}</span>
                          <button type="button" onClick={() => updateStateAndSave(prev => ({ heaterSwitchCount: Math.max(0, prev.heaterSwitchCount - 1) }))} className="w-6 h-6 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* مفتاح جرس */}
                  <div className="p-5 rounded-3xl bg-[#020B1C]/50 border border-[#1f2d4d] flex flex-col justify-between min-h-[140px] hover:border-[#D4AF37]/30 transition-all">
                    <div className="flex items-center justify-between border-b border-[#1f2d4d]/30 pb-2">
                      <span className="text-sm font-black text-[#D4AF37] block">مفتاح جرس   </span>
                    </div>
                    <div className="space-y-3 mt-1">
                      {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                      <div className="flex items-center justify-between text-right">
                        <span className="text-xs text-white font-bold">السعر :</span>
                        <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-36" onClick={(e) => e.stopPropagation()}>
                          <button type="button" onClick={() => handleRateChange('rateBellSwitch', (state.accessoriesRates.rateBellSwitch ?? 55) + 5)} className="w-6 h-6 rounded bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                          <span className="text-sm font-black text-[#D4AF37] font-mono">{(state.accessoriesRates.rateBellSwitch ?? 55)} <span className="text-[8px] text-gray-500">ج.م</span></span>
                          <button type="button" onClick={() => handleRateChange('rateBellSwitch', Math.max(0, (state.accessoriesRates.rateBellSwitch ?? 55) - 5))} className="w-6 h-6 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                        </div>
                      </div>
                      {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                      <div className="flex items-center justify-between text-right">
                        <span className="text-xs text-white font-bold">الكمية:</span>
                        <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-36" onClick={(e) => e.stopPropagation()}>
                          <button type="button" onClick={() => updateStateAndSave(prev => ({ bellSwitchCount: prev.bellSwitchCount + 1 }))} className="w-6 h-6 rounded bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                          <span className="text-sm font-black text-white font-mono">{state.bellSwitchCount}</span>
                          <button type="button" onClick={() => updateStateAndSave(prev => ({ bellSwitchCount: Math.max(0, prev.bellSwitchCount - 1) }))} className="w-6 h-6 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* كروت الإضافة الحرة للتشطيب مستقبلاً */}
              <div className="p-6 rounded-2xl bg-[#07132a] border border-[#D4AF37] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D4AF37] pb-3">
                  <span className="text-sm font-bold text-[#D4AF37]"> إكسسوارات التشطيب المخصصة للعميل:</span>
                  <button type="button" onClick={handleAddCustomFinishing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/20 text-xs text-[#D4AF37] transition-all cursor-pointer">
                    <PlusCircle className="w-4 h-4" />
                    <span>إضافة بند </span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {state.customFinishingList.map(item => (
                    <div key={item.id} className="p-5 rounded-3xl border border-[#1f2d4d] bg-[#020B1C]/40 hover:border-[#D4AF37]/50 shadow-md hover:shadow-[0_0_25px_rgba(212,175,55,0.06)] transition-all duration-300 flex flex-col justify-between gap-4 text-right">
                      <div className="flex justify-between items-center border-b border-[#1f2d4d]/30 pb-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-[#D4AF37]/10 text-[#D4AF37] font-semibold border border-[#D4AF37]/20">تشطيب مخصص</span>
                        <button type="button" onClick={() => handleRemoveCustomFinishing(item.id)} className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"><Trash2 className="w-5 h-5" /></button>
                      </div>
                      <div className="space-y-3">
                        <input type="text" value={item.name} onChange={(e) => handleCustomFinishingEdit(item.id, { name: e.target.value })} className="w-full h-11 px-3 rounded-xl bg-[#07132a] border border-[#1f2d4d] text-sm text-white font-bold outline-none focus:border-[#D4AF37]" placeholder="مسمى البند مخصص..." />
                        
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <span className="text-[10px] text-gray-500 font-bold block mb-1">الكمية:</span>
                            {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                            <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-2">
                              <button type="button" onClick={() => handleCustomFinishingEdit(item.id, { quantity: (item.quantity ?? 1) + 1 })} className="text-[#D4AF37] font-bold text-sm cursor-pointer font-sans">+</button>
                              <span className="text-sm font-black text-white">{item.quantity}</span>
                              <button type="button" onClick={() => handleCustomFinishingEdit(item.id, { quantity: Math.max(1, (item.quantity ?? 1) - 1) })} className="text-red-400 font-bold text-sm cursor-pointer font-sans">-</button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] text-gray-500 font-bold block mb-1">الوحدة:</span>
                            <input type="text" value={item.unit} onChange={(e) => handleCustomFinishingEdit(item.id, { unit: e.target.value })} className="w-full h-11 px-2 bg-[#07132a] border border-[#1f2d4d] rounded-xl text-xs text-white text-center font-bold outline-none" />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] text-gray-500 font-bold block mb-1">السعر:</span>
                            {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                            <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none">
                              <button type="button" onClick={() => handleCustomFinishingEdit(item.id, { rate: (item.rate ?? 0) + 100 })} className="text-[#D4AF37] font-bold text-sm cursor-pointer font-sans">+</button>
                              <span className="text-xs font-black text-[#D4AF37] font-mono">{item.rate}</span>
                              <button type="button" onClick={() => handleCustomFinishingEdit(item.id, { rate: Math.max(0, (item.rate ?? 0) - 100) })} className="text-red-400 font-bold text-sm cursor-pointer font-sans">-</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* مصنعية أعمال تشطيب الكهرباء */}
              <div className="p-6 rounded-2xl bg-[#07132a] border border-[#D4AF37] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-right">
                  <span className="text-md font-bold text-[#D4AF37] block">مصنعيات تركيب لقم ووشوش واختبار الإنارة (مقطوعية)</span>
                  <p className="text-xs text-white"> مصنعية فنيين لتركيب وتوصيل وتجريب واختبار لقم وشواحن واضاءة الوحدة</p>
                </div>
                {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-44">
                  <button type="button" onClick={() => { const v = state.finishingLaborCost + 500; updateStateAndSave(prev => ({ finishingLaborCost: v })); }} className="w-7 h-7 rounded-lg bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                  <span className="text-base font-black text-[#D4AF37] font-mono">{state.finishingLaborCost.toLocaleString()} <span className="text-[9px] text-[#D4AF37] font-normal">ج.م</span></span>
                  <button type="button" onClick={() => { const v = Math.max(0, state.finishingLaborCost - 500); updateStateAndSave(prev => ({ finishingLaborCost: v })); }} className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* القسم الثالث: ترقية أنظمة التحكم الذكي (Smart Home) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[#D4AF37] pb-2 text-[#D4AF37]">
            <Star className="w-5 h-5 animate-pulse" />
            <h4 className="text-base font-bold">القسم الثالث:  أنظمة الكهرباء الذكية والتحكم عن بعد:</h4>
          </div>

          <div 
            onClick={() => {
              const nextVal = !state.smartActive;
              updateStateAndSave(prev => ({ smartActive: nextVal }));
            }}
            className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-6 ${
              state.smartActive 
                ? 'border-[#D4AF37] bg-gradient-to-r from-[#07132a] to-[#D4AF37]/5 shadow-[0_0_20px_rgba(212,175,55,0.08)] opacity-100' 
                : 'border-[#1f2d4d] bg-[#020B1C]/40 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex-shrink-0">
              {state.smartActive ? (
                <button type="button" className="py-3 px-6 rounded-2xl bg-[#D4AF37] text-[#020B1C] text-base flex items-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>تفعيل البند </span>
                </button>
              ) : (
                <button type="button" className="py-3 px-6 rounded-2xl bg-[#1c2844] text-[#F0E6D2] text-base border border-[#1f2d4d]">
                  <span>البند غير مفعل</span>
                </button>
              )}
            </div>

            <div className="flex-1 text-center sm:text-right space-y-1">
              <h4 className="text-md font-bold text-[#D4AF37]"> أنظمة التحكم الذكي (Smart Home)</h4>
              <p className="text-sm text-white leading-relaxed">تأسيس مسارات الكابلات الإضافية ولوحات التحكم الذاتية بالموقع للتحكم بالإنارة والتكييف  عن بعد</p>
              
              {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
              <div className="flex flex-wrap items-center gap-2 mt-2 justify-center sm:justify-start" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs text-white font-bold">التكلفة الاجمالية للبند:</span>
                <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-44">
                  <button type="button" onClick={() => handleRateChange('smartHomeFlatRate', (state.accessoriesRates.smartHomeFlatRate ?? 15000) + 1000)} className="w-6 h-6 rounded-full bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                  <span className="text-sm font-black text-[#D4AF37] font-mono">{(state.accessoriesRates.smartHomeFlatRate ?? 15000).toLocaleString()} <span className="text-[8px] text-gray-500">ج.م</span></span>
                  <button type="button" onClick={() => handleRateChange('smartHomeFlatRate', Math.max(0, (state.accessoriesRates.smartHomeFlatRate ?? 15000) - 1000))} className="w-6 h-6 rounded-full bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-full flex-shrink-0 transition-all duration-300 ${state.smartActive ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'bg-[#1f2d4d]/30 text-gray-500'}`}>
              <Star className="w-8 h-8 animate-pulse" />
            </div>
          </div>

          {/* كارت ترقية نظام الصوت الموزع (Sound System) */}
          <div 
            onClick={() => {
              const nextVal = !state.soundActive;
              updateStateAndSave(prev => ({ soundActive: nextVal }));
            }}
            className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-6 ${
              state.soundActive 
                ? 'border-[#D4AF37] bg-gradient-to-r from-[#07132a] to-[#D4AF37]/5 shadow-[0_0_20px_rgba(212,175,55,0.08)] opacity-100' 
                : 'border-[#1f2d4d] bg-[#020B1C]/40 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex-shrink-0">
              {state.soundActive ? (
                <div className="py-3 px-6 rounded-2xl bg-[#D4AF37] text-[#020B1C] text-base flex items-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>تفعيل البند</span>
                </div>
              ) : (
                <div className="py-3 px-6 rounded-2xl bg-[#1c2844] text-[#F0E6D2] text-base border border-[#1f2d4d]">
                  <span>البند غير مفعل</span>
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-right space-y-1 pr-4">
              <h4 className="text-md font-bold text-[#D4AF37]">ترقية أنظمة الصوت الموزع والـ (Sound System) بالوحدة</h4>
              <p className="text-sm text-white leading-relaxed">تأسيس مسارات وتمديدات مكبرات الصوت وتوزيع سماعات السقف الذكية مع أزرار تحكم مستقلة لكل غرفة والريسبشن بالكامل</p>
              
              {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
              <div className="flex flex-wrap items-center gap-2 mt-2 justify-center sm:justify-start" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs text-white font-semibold">التكلفة الاجمالية للبند:</span>
                <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-44">
                  <button type="button" onClick={() => handleRateChange('soundSystemFlatRate', (state.accessoriesRates.soundSystemFlatRate ?? 8500) + 500)} className="w-6 h-6 rounded-full bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                  <span className="text-sm font-black text-[#D4AF37] font-mono">{(state.accessoriesRates.soundSystemFlatRate ?? 8500).toLocaleString()} <span className="text-[8px] text-gray-500">ج.م</span></span>
                  <button type="button" onClick={() => handleRateChange('soundSystemFlatRate', Math.max(0, (state.accessoriesRates.soundSystemFlatRate ?? 8500) - 500))} className="w-6 h-6 rounded-full bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-full flex-shrink-0 transition-all duration-300 ${state.soundActive ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'bg-[#1f2d4d]/30 text-gray-500'}`}>
              <Volume2 className="w-8 h-8 animate-pulse" />
            </div>
          </div>

        </div>

        {/* كارت حصر وتقدير النقاط التفاعلي */}
        <div className="p-8 rounded-3xl bg-gradient-to-br from-[#07132a] via-[#020B1C] to-[#07132a] border border-[#D4AF37] space-y-6">
          
          <div className="border-b border-[#D4AF37] pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
              <Cpu className="w-6 h-6" />
            </div>
            <div className="text-right">
              <h4 className="text-xl font-bold text-[#D4AF37]">عداد تقدير وحصر نقاط ومخارج الكهرباء التفاعلي بالوحدة</h4>
              <p className="text-xs text-white mt-1">يقوم النظام بتقدير النقاط تلقائياً بناءً على مساحة الشقة، ويمكنك تعديلها لزيادة دقة المقايسة</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* نقاط الإنارة */}
            <div className="p-6 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex items-center justify-between">
              <div className="text-right">
                <span className="text-sm font-semibold text-[#F0E6D2] block">نقاط الإنارة الأساسية</span>
                <p className="text-xs text-gray-500 mt-1">عدد اللمبات الموزعة بالوحدة</p>
              </div>
              {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
              <div className="flex items-center gap-4">
                <button 
                  type="button"
                  disabled={!state.enabled}
                  onClick={() => {
                    const val = (state.lightPoints ?? 0) + 1;
                    updateStateAndSave(prev => ({ lightPoints: val }));
                  }}
                  className="w-10 h-10 rounded-xl bg-[#07132a] border border-[#1f2d4d] text-[#D4AF37] hover:border-[#D4AF37] flex items-center justify-center transition-all cursor-pointer font-sans"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <span className="text-3xl font-black text-[#D4AF37] min-w-[40px] text-center tracking-wider font-mono">
                  {state.lightPoints ?? 0}
                </span>
                <button 
                  type="button"
                  disabled={!state.enabled}
                  onClick={() => {
                    const val = Math.max(0, (state.lightPoints ?? 0) - 1);
                    updateStateAndSave(prev => ({ lightPoints: val }));
                  }}
                  className="w-10 h-10 rounded-xl bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center transition-all cursor-pointer font-sans"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* مخارج البرايز والقوى */}
            <div className="p-6 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex items-center justify-between">
              <div className="text-right">
                <span className="text-sm font-semibold text-[#F0E6D2] block">مخارج البرايز والقوى وأحمال التكييف</span>
                <p className="text-xs text-gray-500 mt-1">برايز الأجهزة الكهربائية العادية والأحمال الثقيلة</p>
              </div>
              {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
              <div className="flex items-center gap-4">
                <button 
                  type="button"
                  disabled={!state.enabled}
                  onClick={() => {
                    const val = (state.powerPoints ?? 0) + 1;
                    updateStateAndSave(prev => ({ powerPoints: val }));
                  }}
                  className="w-10 h-10 rounded-xl bg-[#07132a] border border-[#1f2d4d] text-[#D4AF37] hover:border-[#D4AF37] flex items-center justify-center transition-all cursor-pointer font-sans"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <span className="text-3xl font-black text-[#D4AF37] min-w-[40px] text-center tracking-wider font-mono">
                  {state.powerPoints ?? 0}
                </span>
                <button 
                  type="button"
                  disabled={!state.enabled}
                  onClick={() => {
                    const val = Math.max(0, (state.powerPoints ?? 0) - 1);
                    updateStateAndSave(prev => ({ powerPoints: val }));
                  }}
                  className="w-10 h-10 rounded-xl bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center transition-all cursor-pointer font-sans"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* حقل الملاحظات النصية المذهب الفاخر المربوط بـ Supabase بحدث Blur */}
      <div className="p-6 rounded-2xl bg-[#07132a] border border-[#D4AF37] space-y-3">
        <div className="flex items-center gap-2 text-[#D4AF37] border-b border-[#D4AF37] pb-2 text-right">
          <FileText className="w-5 h-5" />
          <h4 className="text-md font-bold">اتفاقات وبنود مخصصة للكهرباء :</h4>
        </div>
        <textarea
          value={notesInput}
          disabled={!state.enabled}
          onChange={(e) => setNotesInput(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="اكتب هنا أي تفاصيل، ماركات مستثناة، أو شروط مخصصة تم الاتفاق عليها مع العميل لحفظها مباشرة بالعقد..."
          className="w-full h-24 p-4 rounded-xl bg-[#020B1C] border border-[#1f2d4d] hover:border-[#D4AF37]/50 focus:border-[#D4AF37] text-lg text-[#F0E6D2] placeholder-gray-500 outline-none transition-all resize-none text-base leading-relaxed text-right"
        />
        <div className="flex justify-between items-center text-xs text-gray-500 px-1">
          <span>يتم الحفظ تلقائياً بمجرد الخروج من حقل الكتابة</span>
          <span>حالة الاتصال: متصل </span>
        </div>
      </div>

      {/* كارت الملخص المالي النهائي للبند المحدث بالكامل ليطابق تماًاماً نمط التكييف والألوميتال والأسقف المعتمد */}
      <div className="p-5 rounded-xl bg-[#020B1C] border border-[#D4AF37]/30 shadow-[0_0_20px_rgba(212,175,55,0.05)] flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[#D4AF37]" />
        
        <div className="space-y-1 text-center sm:text-right pr-1 select-none font-alexandria">
          <h4 className="text-lg font-bold text-[#D4AF37]">الملخص المالي التقديري لبند الكهرباء والشبكات بالكامل:</h4>
          <p className="text-xs text-white font-normal leading-relaxed max-w-2xl text-right">
            التسعير بالكامل؛ يشتمل على مجموع كلفة التأسيس الإجمالية ({finalRoughInCost.toLocaleString('en-US')} ج.م) وباقة تشطيب اللقم والوشوش ({calculatedFinishingCost.toLocaleString('en-US')} ج.م) شاملاً ترقيات التحكم الذكي والأنظمة الصوتية المفعّلة.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-[#07132a] px-6 py-4 rounded-lg border border-[#1f2d4d]">
          <div className="p-1.5 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
            <DollarSign className="w-6 h-6" />
          </div>
          <div className="text-right">
            <span className="text-[10px] text-[#F0E6D2] block font-semibold">إجمالي تكلفة بند الكهرباء:</span>
            <span className="text-2xl font-black text-[#D4AF37] font-mono">
              {totalElectricalEstimate.toLocaleString('en-US')} <span className="text-xs font-normal">ج.م</span>
            </span>
          </div>
        </div>
      </div>

    </div> 

    </div>
   
  );
}