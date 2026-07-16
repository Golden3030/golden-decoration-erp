"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useCRM } from "../context/CRMContext";
import { supabase } from '@/lib/supabaseClient'; 
import { 
  Zap, 
  Layers, 
  Plus, 
  Minus, 
  Star, 
  DollarSign, 
  Cpu, 
  FileText, 
  Check, 
  ChevronDown, 
  ClipboardList, 
  PlusCircle, 
  Trash2,
  CheckCircle2,
  Lock,
  Home,
  Palette,
  HardHat
} from 'lucide-react';

interface PaintTabProps {
  projectId: string;
}

interface DBProduct {
  id: string;
  code: string;
  category: string;
  subcategory: string;
  company: string;
  product_name: string;
  unit: string;
  price: number;
}

interface DBSpecification {
  uuid: string;
  code: string;
  spec_name: string;
  category: string;
  base_rate: number;
}

const DEFAULT_PAINT_STATE = {
  enabled: true,
  prepActive: true,
  finishActive: true,
  decorActive: false,
  decorWallsCount: 1,
  decorWallsLaborRate: 1500, 
  selectedUndercoatCompany: 'GLC',
  selectedFinishingCompany: 'جوتن',
  selectedSealerId: '',
  selectedThermalSealerId: '',
  selectedPuttyId: '',
  selectedPrimerId: '',
  selectedWallPaintId: '',
  selectedCeilingPaintId: '',
  laborRate: 0,
  ceilingLaborRate: 0, // السعر المعدل لمصنعية الأسقف
  wallArea: 450,
  ceilingArea: 150,
  includeCeilings: true,
  sealerQtyOverride: null as number | null,
  thermalSealerQtyOverride: null as number | null,
  puttyQtyOverride: null as number | null,
  primerQtyOverride: null as number | null,
  finishPaintQtyOverride: null as number | null,
  ceilingPaintQtyOverride: null as number | null,
  notes: '',
  customProducts: [] as any[],
  customPrepProducts: [] as any[],
  disabledStandardItems: [] as string[] // لتتبع وإخفاء البنود الأساسية المستبعدة يدوياً
};

export default function PaintTab({ projectId }: PaintTabProps) {
  const { crmData, updateBulkFinishingSection } = useCRM();
  
  const totalUnitArea = Number(crmData?.project?.area || 150);

  const [dbProducts, setDbProducts] = useState<DBProduct[]>([]);
  const [dbSpecs, setDbSpecs] = useState<DBSpecification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // مرجع لمنع تعارض الحفظ وحظر الـ Infinite Loops أثناء مزامنة البيانات سحابياً
  const isLocalChange = useRef(false);

  // الحالة الموحدة الفاخرة للتحكم في منظومة أعمال الدهانات والنقاشة
  const [state, setState] = useState(DEFAULT_PAINT_STATE);

  const [quickAddProductId, setQuickAddProductId] = useState<string>('');
  const [quickAddPrepProductId, setQuickAddPrepProductId] = useState<string>(''); 
  const [notesInput, setNotesInput] = useState<string>('');

  const DECOR_WALL_FLAT_RATE = 4500; 

  // جلب البيانات والمواصفات من قاعدة البيانات سوبابيز
  useEffect(() => {
    const fetchPaintData = async () => {
      try {
        setLoading(true);
        const { data: prodData } = await supabase.from('products_library').select('*').eq('category', 'paint');
        const { data: specData } = await supabase.from('specifications_library').select('*').eq('category', 'paint');
        if (prodData) setDbProducts(prodData);
        if (specData) setDbSpecs(specData);
      } catch (error) {
        console.error("Error loading paint catalog:", error);
      } finally {
        setLoading(false);
      }
    };
    if (projectId) fetchPaintData();
  }, [projectId]);

  // اقتران ومزامنة البيانات المحفوظة مسبقاً للمشروع الحالي
  useEffect(() => {
    if (crmData?.finishing?.paint) {
      const paintContext = crmData.finishing.paint;
      
      const defaultWallArea = Math.ceil(totalUnitArea * 3);
      const defaultCeilingArea = totalUnitArea;

      isLocalChange.current = false;
      setState({
        enabled: paintContext.enabled ?? true,
        prepActive: paintContext.prepActive ?? true,
        finishActive: paintContext.finishActive ?? true,
        decorActive: paintContext.decorActive ?? false,
        decorWallsCount: paintContext.decorWallsCount ?? 1,
        decorWallsLaborRate: paintContext.decorWallsLaborRate ?? 1500,
        selectedUndercoatCompany: paintContext.selectedUndercoatCompany ?? 'GLC',
        selectedFinishingCompany: paintContext.selectedFinishingCompany ?? 'جوتن',
        selectedSealerId: paintContext.selectedSealerId ?? '',
        selectedThermalSealerId: paintContext.selectedThermalSealerId ?? '',
        selectedPuttyId: paintContext.selectedPuttyId ?? '',
        selectedPrimerId: paintContext.selectedPrimerId ?? '',
        selectedWallPaintId: paintContext.selectedWallPaintId ?? '',
        selectedCeilingPaintId: paintContext.selectedCeilingPaintId ?? '',
        laborRate: paintContext.laborRate ?? 0,
        ceilingLaborRate: paintContext.ceilingLaborRate ?? 0,
        wallArea: paintContext.wallArea ?? defaultWallArea,
        ceilingArea: paintContext.ceilingArea ?? defaultCeilingArea,
        includeCeilings: paintContext.includeCeilings ?? true,
        sealerQtyOverride: paintContext.sealerQtyOverride ?? null,
        thermalSealerQtyOverride: paintContext.thermalSealerQtyOverride ?? null,
        puttyQtyOverride: paintContext.puttyQtyOverride ?? null,
        primerQtyOverride: paintContext.primerQtyOverride ?? null,
        finishPaintQtyOverride: paintContext.finishPaintQtyOverride ?? null,
        ceilingPaintQtyOverride: paintContext.ceilingPaintQtyOverride ?? null,
        notes: paintContext.notes ?? '',
        customProducts: paintContext.customProducts || [],
        customPrepProducts: paintContext.customPrepProducts || [],
        disabledStandardItems: paintContext.disabledStandardItems || []
      });
      setNotesInput(paintContext.notes ?? '');
    }
  }, [crmData?.project, crmData?.finishing?.paint?.enabled, dbProducts]);

  // التحديث التلقائي الفوري والآمن مع قاعدة البيانات سحابياً
  useEffect(() => {
    if (isLocalChange.current) {
      updateBulkFinishingSection('paint', state);
      isLocalChange.current = false;
    }
  }, [state]);

  // دالة تحديث الحالة المحلية المتزامنة بأمان تام
  const updateStateAndSave = (updater: (prev: typeof state) => Partial<typeof state>) => {
    setIsSaving(true);
    isLocalChange.current = true;
    setState(prev => {
      const updates = updater(prev);
      return { ...prev, ...updates };
    });
    setIsSaving(false);
  };

  const handleNotesBlur = () => {
    updateStateAndSave(prev => ({ notes: notesInput }));
  };

  const handleTableMaterialSave = (subcategory: string, productId: string) => {
    const keyMap: Record<string, keyof typeof DEFAULT_PAINT_STATE> = {
      sealer: 'selectedSealerId',
      thermal_sealer: 'selectedThermalSealerId',
      putty: 'selectedPuttyId',
      primer: 'selectedPrimerId',
      wallPaint: 'selectedWallPaintId',
      ceilingPaint: 'selectedCeilingPaintId'
    };
    const stateKey = keyMap[subcategory];
    if (stateKey) {
      updateStateAndSave(() => ({ [stateKey]: productId }));
    }
  };

  // ميزة الإضافة الحركية لخامات التأسيس والتشطيب
  const handleAddCustomProduct = (prodId: string, subType: 'prep' | 'finish') => {
    if (!prodId) return;
    const product = dbProducts.find(p => p.id === prodId);
    if (!product) return;

    const newItem = {
      id: `custom-paint-${Date.now()}`,
      product_id: product.id,
      name: product.product_name,
      company: product.company,
      unit: product.unit || "بستلة",
      quantity: 1,
      price: Number(product.price || 0)
    };

    updateStateAndSave(prev => {
      if (subType === 'prep') {
        const updatedCustom = [...(prev.customPrepProducts || []), newItem];
        setQuickAddPrepProductId('');
        return { customPrepProducts: updatedCustom };
      } else {
        const updatedCustom = [...(prev.customProducts || []), newItem];
        setQuickAddProductId('');
        return { customProducts: updatedCustom };
      }
    });
  };

  // ميزة إدراج بند يدوي مخصص (مسمى حر، شركة مخصصة، سعر وكمية مخصصة)
  const handleAddManualProduct = (subType: 'prep' | 'finish') => {
    const newItem = {
      id: `manual-paint-${Date.now()}`,
      product_id: '', // فارغ يعني بند يدوي حر بالكامل
      name: subType === 'prep' ? 'معجون حوائط خارجي ممتاز' : 'بستلة ألوان قطيفة ناعمة مخصصة',
      company: 'شركة مخصصة',
      unit: 'بستلة',
      quantity: 1,
      price: subType === 'prep' ? 450 : 2500
    };

    updateStateAndSave(prev => {
      if (subType === 'prep') {
        return { customPrepProducts: [...(prev.customPrepProducts || []), newItem] };
      } else {
        return { customProducts: [...(prev.customProducts || []), newItem] };
      }
    });
  };

  // معالجة تعديل أي حقل بداخل البنود الحرة واليدوية
  const handleEditCustomProductField = (itemId: string, field: string, value: any, subType: 'prep' | 'finish') => {
    updateStateAndSave(prev => {
      const arrayKey = subType === 'prep' ? 'customPrepProducts' : 'customProducts';
      const updatedCustom = (prev[arrayKey] || []).map((item: any) => {
        if (item.id === itemId) return { ...item, [field]: value };
        return item;
      });
      return { [arrayKey]: updatedCustom };
    });
  };

  // حذف بند مخصص يدوياً
  const handleRemoveCustomProduct = (itemId: string, subType: 'prep' | 'finish') => {
    updateStateAndSave(prev => {
      const arrayKey = subType === 'prep' ? 'customPrepProducts' : 'customProducts';
      const updatedCustom = (prev[arrayKey] || []).filter((item: any) => item.id !== itemId);
      return { [arrayKey]: updatedCustom };
    });
  };

  // ميزة استبعاد وحذف بند أساسي قياسي من المقايسة وتصفير كلفته
  const handleRemoveStandardItem = (key: string) => {
    updateStateAndSave(prev => {
      const updatedDisabled = prev.disabledStandardItems.includes(key)
        ? prev.disabledStandardItems
        : [...prev.disabledStandardItems, key];
      return { disabledStandardItems: updatedDisabled };
    });
  };

  // ميزة استعادة البند المستبعد وإعادة إدراجه بالمقايسة حياً
  const handleRestoreStandardItem = (key: string) => {
    updateStateAndSave(prev => ({
      disabledStandardItems: prev.disabledStandardItems.filter(x => x !== key)
    }));
  };

  // المسميات العربية القياسية لتنظيم شريط الاستعادة السفلي
  const getStandardItemLabel = (key: string): string => {
    const labels: Record<string, string> = {
      sealer: 'سيلر مائي عازل',
      thermal_sealer: 'سيلر حراري رطوبة',
      putty: 'معجون الحوائط الأكريليك',
      primer: 'بطانة التأسيس القياسية',
      wallPaint: 'دهان جدران التشطيب وجوتن',
      ceilingPaint: 'دهان تشطيب الأسقف وجهين'
    };
    return labels[key] || 'بند أساسي';
  };

  const undercoatCompanies = Array.from(new Set(dbProducts.filter(p => p.subcategory === 'sealer' || p.subcategory === 'thermal_sealer' || p.subcategory === 'putty' || p.subcategory === 'primer').map(p => p.company).filter(Boolean)));
  const finishingCompanies = Array.from(new Set(dbProducts.filter(p => p.subcategory === 'wallPaint' || p.subcategory === 'ceilingPaint').map(p => p.company).filter(Boolean)));

  const finalUndercoatCompanies = undercoatCompanies.length > 0 ? undercoatCompanies : ["GLC", "سايبس", "سيبس"];
  const finalFinishingCompanies = finishingCompanies.length > 0 ? finishingCompanies : ["جوتن", "GLC", "الجزيرة"];

  const availableSealers = dbProducts.filter(p => p.company === state.selectedUndercoatCompany && p.subcategory === 'sealer');
  const availableThermalSealers = dbProducts.filter(p => p.company === state.selectedUndercoatCompany && (p.subcategory === 'thermal_sealer' || p.subcategory === 'sealer_thermal'));
  const availablePutties = dbProducts.filter(p => p.company === state.selectedUndercoatCompany && p.subcategory === 'putty');
  const availablePrimers = dbProducts.filter(p => p.company === state.selectedUndercoatCompany && p.subcategory === 'primer');
  const availableWallPaints = dbProducts.filter(p => p.company === state.selectedFinishingCompany && p.subcategory === 'wallPaint');
  const availableCeilingPaints = dbProducts.filter(p => p.company === state.selectedUndercoatCompany && p.subcategory === 'primer');

  const activeSealer = availableSealers.find(p => p.id === state.selectedSealerId) || availableSealers[0];
  const activeThermalSealer = availableThermalSealers.find(p => p.id === state.selectedThermalSealerId) || availableThermalSealers[0];
  const activePutty = availablePutties.find(p => p.id === state.selectedPuttyId) || availablePutties[0];
  const activePrimer = availablePrimers.find(p => p.id === state.selectedPrimerId) || availablePrimers[0];
  const activeWallPaint = availableWallPaints.find(p => p.id === state.selectedWallPaintId) || availableWallPaints[0];
  const activeCeilingPaint = availableCeilingPaints.find(p => p.id === state.selectedCeilingPaintId) || activePrimer;

  const matchedSpec = dbSpecs.find(s => s.spec_name.includes(state.selectedFinishingCompany)) || dbSpecs.find(s => s.code.includes(state.selectedFinishingCompany));
  const specBaseRate = matchedSpec?.base_rate || (state.selectedFinishingCompany === 'جوتن' ? 60 : 45);

  const activeRate = state.laborRate > 0 ? state.laborRate : specBaseRate;

  const totalPrepArea = state.wallArea + (state.includeCeilings ? state.ceilingArea : 0);

  const defaultSealerQty = Math.ceil((totalPrepArea * 0.0033));       
  const defaultThermalSealerQty = Math.ceil((totalPrepArea * 0.0033));  
  const defaultPuttyQty = Math.ceil((totalPrepArea * 0.05));          
  const defaultPrimerQty = Math.ceil((totalPrepArea * 0.0033));         

  const defaultFinishPaintQty = Math.ceil((state.wallArea * 0.009));       
  const defaultCeilingPaintQty = (state.finishActive && state.includeCeilings) ? Math.ceil((state.ceilingArea * 0.0133)) : 0; 

  const sealerQty = state.sealerQtyOverride !== null ? state.sealerQtyOverride : defaultSealerQty;
  const thermalSealerQty = state.thermalSealerQtyOverride !== null ? state.thermalSealerQtyOverride : defaultThermalSealerQty;
  const puttyQty = state.puttyQtyOverride !== null ? state.puttyQtyOverride : defaultPuttyQty;
  const primerQty = state.primerQtyOverride !== null ? state.primerQtyOverride : defaultPrimerQty;
  const finishPaintQty = state.finishPaintQtyOverride !== null ? state.finishPaintQtyOverride : defaultFinishPaintQty;
  const ceilingPaintQty = state.ceilingPaintQtyOverride !== null ? state.ceilingPaintQtyOverride : defaultCeilingPaintQty;

  const sealerCost = (state.prepActive && !state.disabledStandardItems.includes('sealer')) ? (sealerQty * (activeSealer?.price || 350)) : 0;
  const thermalSealerCost = (state.prepActive && !state.disabledStandardItems.includes('thermal_sealer')) ? (thermalSealerQty * (activeThermalSealer?.price || 450)) : 0;
  const puttyCost = (state.prepActive && !state.disabledStandardItems.includes('putty')) ? (puttyQty * (activePutty?.price || 180)) : 0;
  const primerCost = (state.prepActive && !state.disabledStandardItems.includes('primer')) ? (primerQty * (activePrimer?.price || 400)) : 0;
  
  const totalCustomPrepProductsCost = (state.customPrepProducts || []).reduce((sum: number, item: any) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0);
  const calculatedPrepCost = sealerCost + thermalSealerCost + puttyCost + primerCost + totalCustomPrepProductsCost; 

  const totalFinishPaintCost = !state.disabledStandardItems.includes('wallPaint') ? (finishPaintQty * (activeWallPaint?.price || 2200)) : 0;
  const ceilingPaintCost = (state.finishActive && state.includeCeilings && !state.disabledStandardItems.includes('ceilingPaint')) ? (ceilingPaintQty * (activeCeilingPaint?.price || 400)) : 0;
  
  // ربط الأجور هندسياً: أجر مصنعية الجدران + أجر مصنعية الأسقف
  const activeCeilingLaborRateCalculated = state.ceilingLaborRate > 0 ? state.ceilingLaborRate : 35;
  const totalLaborCost = state.finishActive 
    ? (state.wallArea * activeRate) + (state.includeCeilings ? (state.ceilingArea * activeCeilingLaborRateCalculated) : 0)
    : 0;

  const calculatedFinishCost = totalFinishPaintCost + ceilingPaintCost + totalLaborCost; 

  const decorWallsLaborRate = state.decorWallsLaborRate ?? 1500;
  const calculatedDecorCost = state.decorActive ? (state.decorWallsCount * (DECOR_WALL_FLAT_RATE + decorWallsLaborRate)) : 0;

  const totalCustomProductsCost = (state.customProducts || []).reduce((sum: number, item: any) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0);

  const totalPaintEstimate = calculatedPrepCost + calculatedFinishCost + calculatedDecorCost + totalCustomProductsCost;

  return (
    <div className="space-y-8 select-none text-right font-sans" dir="rtl">

      {/* كارت التفعيل الرئيسي (On / Off) ذو الطابع الفاخر والماوس اليد المضيء */}
      <div 
        onClick={() => { updateStateAndSave(prev => ({ enabled: !prev.enabled })); }}
        className={`p-6 rounded-[2.5rem] border transition-all duration-500 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl cursor-pointer select-none ${
          state.enabled 
            ? 'bg-[#07132a] border-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.15)] hover:shadow-[0_0_40px_rgba(212,175,55,0.25)]' 
            : 'bg-[#07132a]/40 border-[#1f2d4d] hover:border-gray-600'
        }`}
      >
        <div className="flex items-center gap-4 w-full sm:w-auto pr-2">
          <div className={`p-5 rounded-2xl transition-all duration-500 flex-shrink-0 ${state.enabled ? 'bg-[#D4AF37] text-black shadow-[0_0_30px_rgba(212,175,55,0.4)]' : 'bg-[#020B1C] text-gray-600'}`}>
            <Palette className="w-10 h-10" />
          </div>
          <div className="text-right">
            <h4 className="text-xl font-black text-[#F0E6D2]">أعمال الدهانات والنقاشة الفاخرة</h4>
            <p className="text-[11px] text-gray-400 mt-1 uppercase font-bold tracking-widest leading-none">PREMIUM PAINTING & DECOR MANAGEMENT</p>
          </div>
        </div>

        <div
          className={`px-10 py-3 rounded-2xl border-2 font-black text-base transition-all duration-300 flex items-center gap-3 flex-shrink-0 ${
            state.enabled 
              ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.1)]' 
              : 'bg-[#020B1C] border-[#D4AF37]/60 text-[#D4AF37]'
          }`}
        >
          {state.enabled ? <CheckCircle2 className="w-6 h-6 text-[#D4AF37]" /> : <Lock className="w-5 h-5 text-gray-500" />}
          {state.enabled ? 'القسم مفعل' : 'القسم مقفل'}
        </div>
      </div>

      {/* حظر التفاعل وتعتيم الشاشة عند الإغلاق التام للبند */}
      <div className={`space-y-8 transition-opacity duration-300 ${state.enabled ? 'opacity-100' : 'opacity-25 pointer-events-none filter grayscale'}`}>

        {/* 1. تأسيس المعجون والبطانة */}
        <div 
          onClick={() => updateStateAndSave(prev => ({ prepActive: !prev.prepActive }))}
          className={`p-6 rounded-3xl border transition-all duration-300 cursor-pointer flex flex-col lg:flex-row items-center justify-between gap-6 ${
            state.prepActive 
              ? 'border-[#D4AF37] bg-gradient-to-r from-[#07132a] to-[#D4AF37]/5 shadow-[0_0_20px_rgba(212,175,55,0.08)] opacity-100' 
              : 'border-[#1f2d4d] bg-[#020B1C]/40 opacity-70 hover:opacity-100'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right flex-1 w-full font-bold">
            <div className={`p-4 rounded-full transition-all duration-300 ${state.prepActive ? 'bg-[#D4AF37] text-[#020B1C]' : 'bg-[#1f2d4d] text-gray-500'}`}><Layers className="w-8 h-8" /></div>
            <div className="space-y-1 w-full text-right" onClick={(e) => e.stopPropagation()}>
              <h4 className="text-xl font-bold text-[#F0E6D2]">مرحلة تأسيس المعجون والبطانة التمهيدية</h4>
              <p className="text-xs text-gray-400 leading-relaxed pt-1">تشمل صنفرة الجدران كلياً، عزل حوائط الشقة بوجه سيلر مائي عازل، وتطبيق وجهين معجون أكريليك ناعم والمصنعية</p>
              {state.prepActive && (
                <div className="flex items-center gap-2 mt-3 justify-start">
                  <span className="text-xs text-gray-500 font-semibold">براند التأسيس والمعجون المعتمد:</span>
                  <select value={state.selectedUndercoatCompany ?? 'GLC'} onChange={(e) => updateStateAndSave(prev => ({ selectedUndercoatCompany: e.target.value, selectedSealerId: '', selectedPuttyId: '', selectedPrimerId: '', selectedThermalSealerId: '' }))} className="p-2 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] text-xs font-bold outline-none cursor-pointer">{finalUndercoatCompanies.map((comp) => <option key={comp} value={comp}>{comp}</option>)}</select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. التشطيب والألوان */}
        <div 
          onClick={() => updateStateAndSave(prev => ({ finishActive: !prev.finishActive }))}
          className={`p-6 rounded-3xl border transition-all duration-300 cursor-pointer flex flex-col lg:flex-row items-center justify-between gap-6 ${
            state.finishActive 
              ? 'border-[#D4AF37] bg-gradient-to-r from-[#07132a] to-[#D4AF37]/5 shadow-[0_0_20px_rgba(212,175,55,0.08)] opacity-100' 
              : 'border-[#1f2d4d] bg-[#020B1C]/40 opacity-70 hover:opacity-100'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right flex-1 w-full">
            <div className={`p-4 rounded-full transition-all duration-300 ${state.finishActive ? 'bg-[#D4AF37] text-[#020B1C]' : 'bg-[#1f2d4d] text-gray-500'}`}><Zap className="w-8 h-8" /></div>
            <div className="space-y-1 w-full text-right" onClick={(e) => e.stopPropagation()}>
              <h4 className="text-xl font-bold text-[#F0E6D2]">مرحلة دهان الألوان والتشطيب والوجه النهائي</h4>
              <p className="text-xs text-gray-400 leading-relaxed pt-1">تطبيق وجهين دهان نهائي ملون غسيل بالكامل للحوائط والأسقف والتركيب والمصنعية وسعر المتر حياً من السيرفر:</p>
              {state.finishActive && (
                <div className="flex items-center gap-2 mt-3 justify-start">
                  <span className="text-xs text-gray-500 font-semibold">براند التشطيب الملون المعتمد:</span>
                  <select value={state.selectedFinishingCompany ?? 'جوتن'} onChange={(e) => updateStateAndSave(prev => ({ selectedFinishingCompany: e.target.value, selectedWallPaintId: '', laborRate: 0 }))} className="p-2 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] text-xs font-bold outline-none cursor-pointer">{finalFinishingCompanies.map((comp) => <option key={comp} value={comp}>{comp}</option>)}</select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* كارت إجمالي مصنعيات النقاشة والدهانات المكتمل تفاعلياً ومجهزا بالعداد الجديد */}
        {state.finishActive && (
          <div className="p-6 rounded-3xl bg-[#07132a] border border-[#D4AF37]/20 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-[#D4AF37]/40 shadow-lg transition-all duration-300 select-none">
            <div className="text-right space-y-1 flex-1 pl-4">
              <h4 className="text-lg font-bold text-[#D4AF37]">إجمالي أجور ومصنعيات دهان الجدران والأسقف بالوحدة:</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                حاصل ضرب أجر متر الحوائط ({activeRate} ج.م) في مساحة الجدران ({state.wallArea} م²) + حاصل ضرب أجر متر الأسقف ({activeCeilingLaborRateCalculated} ج.م) في مساحة أسقف الشقة ({state.includeCeilings ? state.ceilingArea : 0} م²).
              </p>
            </div>
            
            {/* أزرار عدادات مذهبة للتحكم المنفصل بالأجور يدوياً وبأقل جهد للمستخدم */}
            <div className="flex flex-wrap items-center gap-4 select-none" onClick={(e) => e.stopPropagation()}>
              
              {/* عداد مصنعية الحوائط */}
              <div className="space-y-1 text-right">
                <span className="text-[10px] text-gray-500 font-bold block mb-1">عداد مصنعية جدران:</span>
                <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-36">
                  <button 
                    type="button" 
                    onClick={() => updateStateAndSave(prev => ({ laborRate: activeRate + 5 }))}
                    className="w-7 h-7 rounded-lg bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none"
                  >
                    +
                  </button>
                  <span className="text-sm font-black text-white font-mono">{activeRate} <span className="text-[8px] text-gray-500">ج</span></span>
                  <button 
                    type="button" 
                    onClick={() => updateStateAndSave(prev => ({ laborRate: Math.max(0, activeRate - 5) }))}
                    className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none"
                  >
                    -
                  </button>
                </div>
              </div>

              {/* عداد مصنعية الأسقف المطلوب إضافته وتجهيزه */}
              <div className="space-y-1 text-right">
                <span className="text-[10px] text-gray-500 font-bold block mb-1">عداد مصنعية أسقف:</span>
                <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-36">
                  <button 
                    type="button" 
                    onClick={() => updateStateAndSave(prev => ({ ceilingLaborRate: activeCeilingLaborRateCalculated + 5 }))}
                    className="w-7 h-7 rounded-lg bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none"
                  >
                    +
                  </button>
                  <span className="text-sm font-black text-white font-mono">{activeCeilingLaborRateCalculated} <span className="text-[8px] text-gray-500">ج</span></span>
                  <button 
                    type="button" 
                    onClick={() => updateStateAndSave(prev => ({ ceilingLaborRate: Math.max(0, activeCeilingLaborRateCalculated - 5) }))}
                    className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none"
                  >
                    -
                  </button>
                </div>
              </div>

              {/* إجمالي كلفة المصنعيات المجمعة بشكل مذهب وبارز */}
              <div className="h-11 w-px bg-[#1f2d4d] hidden sm:block" />
              <div className="text-right border-r border-[#1f2d4d]/60 pr-4 min-w-[120px]">
                <span className="text-[10px] text-gray-500 block font-bold mb-1 opacity-75">مصنعيات مجمعة:</span>
                <span className="text-lg font-black text-[#D4AF37] font-mono leading-none">{totalLaborCost.toLocaleString()} <span className="text-xs font-normal text-white">ج.م</span></span>
              </div>

            </div>
          </div>
        )}

        {/* الحوائط الديكورية وأوراق الجدران */}
        <div 
          onClick={() => updateStateAndSave(prev => ({ decorActive: !prev.decorActive }))} 
          className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-6 ${state.decorActive ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_20px_rgba(212,175,55,0.08)]' : 'border-[#1f2d4d] bg-[#020B1C]/40 opacity-50'}`}
        >
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right flex-1 w-full">
            <div className={`p-4 rounded-full transition-all duration-300 ${state.decorActive ? 'bg-[#D4AF37] text-[#020B1C]' : 'bg-[#1f2d4d] text-gray-500'}`}><Star className="w-8 h-8" /></div>
            <div className="space-y-1 w-full text-right" onClick={(e) => e.stopPropagation()}>
              <h4 className="text-xl font-bold text-[#F0E6D2]">ترقية الحوائط الديكورية وأوراق الجدران والقطيفة</h4>
              <p className="text-xs text-gray-400 max-w-xl leading-relaxed">تخصيص جدران مميزة بنظام ورق الحائط المستورد، أو دهانات القطيفة المخملية، أو بديل الرخام والخشب شاملة التركيب والمواد</p>
              {state.decorActive && (
                <div className="flex flex-col sm:flex-row items-center gap-6 mt-4 justify-start select-none">
                  
                  {/* عداد أعداد الجدران الديكورية الفاخر */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-bold">عدد الجدران الديكورية:</span>
                    <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-32">
                      <button 
                        type="button" 
                        onClick={() => updateStateAndSave(prev => ({ decorWallsCount: prev.decorWallsCount + 1 }))}
                        className="w-7 h-7 rounded-lg bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none"
                      >
                        +
                      </button>
                      <span className="text-base font-black text-white font-mono">{state.decorWallsCount}</span>
                      <button 
                        type="button" 
                        onClick={() => updateStateAndSave(prev => ({ decorWallsCount: Math.max(1, prev.decorWallsCount - 1) }))}
                        className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none"
                      >
                        -
                      </button>
                    </div>
                  </div>
                  
                  {/* عداد مالي لأجر مصنعية الجدار الديكوري بالتناغم 500 جنيه */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-bold">مصنعية الجدار:</span>
                    <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-44">
                      <button 
                        type="button" 
                        onClick={() => updateStateAndSave(prev => ({ decorWallsLaborRate: prev.decorWallsLaborRate + 500 }))}
                        className="w-7 h-7 rounded-lg bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none"
                      >
                        +
                      </button>
                      <div className="flex items-center justify-center font-mono">
                        <input 
                          type="number"
                          value={state.decorWallsLaborRate}
                          onChange={(e) => updateStateAndSave(() => ({ decorWallsLaborRate: Math.max(0, Number(e.target.value)) }))}
                          className="w-16 bg-transparent text-white text-base font-black outline-none text-center focus:border-transparent"
                        />
                        <span className="text-[10px] text-gray-500 font-bold">ج.م</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => updateStateAndSave(prev => ({ decorWallsLaborRate: Math.max(0, prev.decorWallsLaborRate - 500) }))}
                        className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none"
                      >
                        -
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
          <button type="button" className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all min-w-[145px] flex items-center justify-center gap-2 cursor-pointer ${state.decorActive ? 'bg-[#D4AF37] text-[#020B1C]' : 'bg-[#1f2d4d] text-gray-500'}`}>{state.decorActive && <Check className="w-4 h-4 stroke-[3]" />}{state.decorActive ? 'مفعّل بالباقة' : 'عرض ترقية البند'}</button>
        </div>

      </div>

      {/* عدادات ومسطحات حصر المساحة التقديري للدهانات بالعدادات الفاخرة */}
      <div className="p-8 rounded-2xl bg-[#07132a] border border-[#1f2d4d] space-y-6 select-none text-right">
        
        <div className="border-b border-[#1f2d4d] pb-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]"><Cpu className="w-6 h-6" /></div>
          <div className="text-right">
            <h4 className="text-xl font-bold text-[#D4AF37]">عداد تقدير وحصر مسطحات النقاشة والدهانات بالوحدة</h4>
            <p className="text-xs text-gray-400 mt-1">يقوم النظام بضرب مساحة الشقة الإجمالية في معدل الارتفاع المعتمد لحساب مساحة النقاشة للجدران تلقائياً</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* عداد مساحة الجدران */}
          <div className="p-6 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex items-center justify-between">
            <div className="text-right">
              <span className="text-sm font-semibold text-[#F0E6D2] block">إجمالي مساحة جدران دهانات الشقة</span>
              <p className="text-xs text-gray-500 mt-1">المساحة القياسية لجدران الشقة (مساحة الشقة × 3)</p>
            </div>
            <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-36">
              <button type="button" onClick={() => updateStateAndSave(prev => ({ wallArea: prev.wallArea + 5 }))} className="w-7 h-7 rounded-lg bg-[#020B1C] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">+</button>
              <span className="text-base font-black text-white font-mono">{state.wallArea} <span className="text-[10px] text-gray-500 font-normal">م²</span></span>
              <button type="button" onClick={() => updateStateAndSave(prev => ({ wallArea: Math.max(0, prev.wallArea - 5) }))} className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">-</button>
            </div>
          </div>

          {/* عداد مساحة الأسقف */}
          <div className="p-6 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex items-center justify-between">
            <div className="text-right">
              <span className="text-sm font-semibold text-[#F0E6D2] block">إجمالي مساحة أسقف دهانات الشقة</span>
              <p className="text-xs text-gray-500 mt-1">مساحة الأسقف المعلقة المستوية بالوحدة</p>
            </div>
            <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-36">
              <button type="button" onClick={() => updateStateAndSave(prev => ({ ceilingArea: prev.ceilingArea + 5 }))} className="w-7 h-7 rounded-lg bg-[#020B1C] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">+</button>
              <span className="text-base font-black text-white font-mono">{state.ceilingArea} <span className="text-[10px] text-gray-500 font-normal">م²</span></span>
              <button type="button" onClick={() => updateStateAndSave(prev => ({ ceilingArea: Math.max(0, prev.ceilingArea - 5) }))} className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">-</button>
            </div>
          </div>
        </div>
      </div>

      {/* جدول حصر خامات التأسيس والألوان النهائية المطور بمسارات الاستبعاد والإضافة اليدوية */}
      {state.prepActive && (
        <div className="p-8 rounded-3xl bg-[#07132a] border border-[#1f2d4d] space-y-4 select-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f2d4d]/40 pb-3">
            <div className="flex items-center gap-2 text-[#D4AF37]">
              <ClipboardList className="w-6 h-6" />
              <h4 className="text-xl font-bold">أولاً: جدول حصر كميات ومواد التأسيس والتحضير الإنشائي (معجون وسيلر):</h4>
            </div>
            
            {/* إضافة خامات التأسيس - تدعم الجلب التفاعلي والإدراج اليدوي الحر */}
            <div className="flex items-center gap-2 w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
              <select value={quickAddPrepProductId} onChange={(e) => setQuickAddPrepProductId(e.target.value)} className="p-2.5 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-xs text-[#F0E6D2] font-bold outline-none cursor-pointer focus:border-[#D4AF37] min-w-[200px]">
                <option value="">-- ابحث وأضف مادة تأسيس مسجلة --</option>
                {dbProducts.filter(p => p.subcategory !== 'wallPaint' && p.subcategory !== 'ceilingPaint').map(p => (
                  <option key={p.id} value={p.id}>{p.product_name} ({p.company})</option>
                ))}
              </select>
              <button type="button" onClick={() => handleAddCustomProduct(quickAddPrepProductId, 'prep')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/20 text-xs font-bold text-[#D4AF37] transition-all cursor-pointer"><PlusCircle className="w-4 h-4" /><span>إضافة مادة من سوبابيز</span></button>
              
              {/* الميزة المطلوبة: زر إضافة خامة مخصصة يدوية خارج سوبابيز */}
              <button type="button" onClick={() => handleAddManualProduct('prep')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-bold text-amber-500 transition-all cursor-pointer"><PlusCircle className="w-4 h-4" /><span>إضافة يدوي مخصص</span></button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#1f2d4d] bg-[#020B1C]/60">
            <table className="w-full text-right text-xs text-white min-w-[700px] border-collapse">
              <thead className="bg-[#0b1b3d] text-[#F0E6D2] border-b border-[#1f2d4d] font-bold">
                <tr>
                  <th className="p-3">نوع الخامة التأسيسية</th>
                  <th className="p-3">المنتج الفعلي بالمخزن (تعديل تفاعلي)</th>
                  <th className="p-3 text-center">الكمية المطلوبة (بستلة)</th>
                  <th className="p-3 text-left">سعر البستلة</th>
                  <th className="p-3 text-left">إجمالي التكلفة</th>
                  <th className="p-3 text-center">حذف / استبعاد</th>
                </tr>
              </thead>
              <tbody>
                
                {/* سيلر الحوائط */}
                {!state.disabledStandardItems.includes('sealer') && (
                  <tr className="border-b border-[#1f2d4d]/40">
                    <td className="p-3 font-bold">سيلر مائي عازل جدران وأسقف</td>
                    <td className="p-3 font-bold text-[#D4AF37]">
                      <select value={state.selectedSealerId ?? ''} onChange={(e) => handleTableMaterialSave('sealer', e.target.value)} className="p-2 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] text-xs font-bold outline-none focus:border-[#D4AF37] cursor-pointer max-w-[250px]">
                        <option value="">-- اختر السيلر لـ {state.selectedUndercoatCompany ?? 'GLC'} --</option>
                        {availableSealers.map((p) => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                      </select>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ sealerQtyOverride: (sealerQty ?? 0) + 1 }))} className="w-6 h-6 rounded bg-[#07132a] border border-[#1f2d4d] flex items-center justify-center hover:border-[#D4AF37] font-bold text-[#D4AF37] cursor-pointer">+</button>
                        <span className="font-mono font-bold text-sm min-w-[20px] text-center">{sealerQty}</span>
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ sealerQtyOverride: Math.max(0, (sealerQty ?? 0) - 1) }))} className="w-6 h-6 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center font-bold cursor-pointer">-</button>
                      </div>
                    </td>
                    <td className="p-3 text-left font-mono">{(activeSealer?.price || 350).toLocaleString()} ج.م</td>
                    <td className="p-3 text-left font-mono text-[#D4AF37] font-bold">{sealerCost.toLocaleString('en-US')} ج.م</td>
                    <td className="p-3 text-center">
                      <button type="button" onClick={() => handleRemoveStandardItem('sealer')} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                )}

                {/* سيلر حراري رطوبة */}
                {!state.disabledStandardItems.includes('thermal_sealer') && (
                  <tr className="border-b border-[#1f2d4d]/40">
                    <td className="p-3 font-bold">سيلر حراري عازل للرطوبة والواجهات</td>
                    <td className="p-3 font-bold text-[#D4AF37]">
                      <select value={state.selectedThermalSealerId ?? ''} onChange={(e) => handleTableMaterialSave('thermal_sealer', e.target.value)} className="p-2 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] text-xs font-bold outline-none focus:border-[#D4AF37] cursor-pointer max-w-[250px]">
                        <option value="">-- اختر السيلر لـ {state.selectedUndercoatCompany ?? 'GLC'} --</option>
                        {availableThermalSealers.map((p) => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                      </select>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ thermalSealerQtyOverride: (thermalSealerQty ?? 0) + 1 }))} className="w-6 h-6 rounded bg-[#07132a] border border-[#1f2d4d] flex items-center justify-center hover:border-[#D4AF37] font-bold text-[#D4AF37] cursor-pointer">+</button>
                        <span className="font-mono font-bold text-sm min-w-[20px] text-center">{thermalSealerQty}</span>
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ thermalSealerQtyOverride: Math.max(0, (thermalSealerQty ?? 0) - 1) }))} className="w-6 h-6 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center font-bold cursor-pointer">-</button>
                      </div>
                    </td>
                    <td className="p-3 text-left font-mono">{(activeThermalSealer?.price || 450).toLocaleString()} ج.م</td>
                    <td className="p-3 text-left font-mono text-[#D4AF37] font-bold">{thermalSealerCost.toLocaleString('en-US')} ج.م</td>
                    <td className="p-3 text-center">
                      <button type="button" onClick={() => handleRemoveStandardItem('thermal_sealer')} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                )}

                {/* معجون الحوائط */}
                {!state.disabledStandardItems.includes('putty') && (
                  <tr className="border-b border-[#1f2d4d]/40">
                    <td className="p-3 font-bold">معجون حوائط داخلي متميز (3 أوجه)</td>
                    <td className="p-3 font-bold text-[#D4AF37]">
                      <select value={state.selectedPuttyId ?? ''} onChange={(e) => handleTableMaterialSave('putty', e.target.value)} className="p-2 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] text-xs font-bold outline-none focus:border-[#D4AF37] cursor-pointer max-w-[250px]">
                        <option value="">-- اختر المعجون لـ {state.selectedUndercoatCompany ?? 'GLC'} --</option>
                        {availablePutties.map((p) => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                      </select>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ puttyQtyOverride: (puttyQty ?? 0) + 1 }))} className="w-6 h-6 rounded bg-[#07132a] border border-[#1f2d4d] flex items-center justify-center hover:border-[#D4AF37] font-bold text-[#D4AF37] cursor-pointer">+</button>
                        <span className="font-mono font-bold text-sm min-w-[20px] text-center">{puttyQty}</span>
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ puttyQtyOverride: Math.max(0, (puttyQty ?? 0) - 1) }))} className="w-6 h-6 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center font-bold cursor-pointer">-</button>
                      </div>
                    </td>
                    <td className="p-3 text-left font-mono">{(activePutty?.price || 180).toLocaleString()} ج.م</td>
                    <td className="p-3 text-left font-mono text-[#D4AF37] font-bold">{puttyCost.toLocaleString('en-US')} ج.م</td>
                    <td className="p-3 text-center">
                      <button type="button" onClick={() => handleRemoveStandardItem('putty')} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                )}

                {/* بطانة التأسيس */}
                {!state.disabledStandardItems.includes('primer') && (
                  <tr className="border-b border-[#1f2d4d]/40">
                    <td className="p-3 font-bold">بيان بطانة التأسيس القياسية</td>
                    <td className="p-3 font-bold text-[#D4AF37]">
                      <select value={state.selectedPrimerId ?? ''} onChange={(e) => handleTableMaterialSave('primer', e.target.value)} className="p-2 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] text-xs font-bold outline-none focus:border-[#D4AF37] cursor-pointer max-w-[250px]">
                        <option value="">-- اختر مادة البطانة لـ {state.selectedUndercoatCompany ?? 'GLC'} --</option>
                        {availablePrimers.map((p) => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                      </select>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ primerQtyOverride: (primerQty ?? 0) + 1 }))} className="w-6 h-6 rounded bg-[#07132a] border border-[#1f2d4d] flex items-center justify-center hover:border-[#D4AF37] font-bold text-[#D4AF37] cursor-pointer">+</button>
                        <span className="font-mono font-bold text-sm min-w-[20px] text-center">{primerQty}</span>
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ primerQtyOverride: Math.max(0, (primerQty ?? 0) - 1) }))} className="w-6 h-6 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center font-bold cursor-pointer">-</button>
                      </div>
                    </td>
                    <td className="p-3 text-left font-mono">{(activePrimer?.price || 400).toLocaleString()} ج.م</td>
                    <td className="p-3 text-left font-mono text-[#D4AF37] font-bold">{primerCost.toLocaleString('en-US')} ج.م</td>
                    <td className="p-3 text-center">
                      <button type="button" onClick={() => handleRemoveStandardItem('primer')} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                )}

                {/* البنود الحرة واليدوية المضافة لجدول التأسيس */}
                {(state.customPrepProducts || []).map((item: any) => (
                  <tr key={item.id} className="border-b border-[#1f2d4d]/40 bg-[#07132a]/20">
                    <td className="p-3 font-bold text-gray-400">تأسيس مخصص مضاف</td>
                    <td className="p-3 font-bold">
                      <input type="text" value={item.name} onChange={(e) => handleEditCustomProductField(item.id, 'name', e.target.value, 'prep')} className="bg-[#020B1C] border border-[#1f2d4d] p-1.5 rounded text-xs text-white font-bold outline-none focus:border-[#D4AF37] w-full max-w-[280px]" />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => handleEditCustomProductField(item.id, 'quantity', Math.max(0, (item.quantity || 1) + 1), 'prep')} className="w-6 h-6 rounded bg-[#07132a] border border-[#1f2d4d] flex items-center justify-center hover:border-[#D4AF37] font-bold text-[#D4AF37] cursor-pointer">+</button>
                        <span className="font-mono font-bold text-sm min-w-[20px] text-center">{item.quantity}</span>
                        <button type="button" onClick={() => handleEditCustomProductField(item.id, 'quantity', Math.max(0, (item.quantity || 1) - 1), 'prep')} className="w-6 h-6 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm flex items-center justify-center cursor-pointer">-</button>
                      </div>
                    </td>
                    <td className="p-3 text-left">
                      <div className="flex items-center justify-end gap-1">
                        <input type="number" value={item.price} onChange={(e) => handleEditCustomProductField(item.id, 'price', Math.max(0, Number(e.target.value)), 'prep')} className="bg-[#020B1C] border border-[#1f2d4d] p-1 text-xs text-right text-[#D4AF37] font-bold rounded w-16 outline-none focus:border-[#D4AF37]" />
                        <span className="text-[10px] text-gray-500">ج.م</span>
                      </div>
                    </td>
                    <td className="p-3 text-left font-mono text-[#D4AF37] font-bold">{(item.quantity * item.price).toLocaleString()} ج.م</td>
                    <td className="p-3 text-center">
                      <button type="button" onClick={() => handleRemoveCustomProduct(item.id, 'prep')} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}

              </tbody>
            </table>
          </div>

          {/* شريط استعادة البنود الأساسية المستبعدة من مرحلة التأسيس */}
          {state.disabledStandardItems.some(x => ['sealer', 'thermal_sealer', 'putty', 'primer'].includes(x)) && (
            <div className="flex items-center gap-2 p-3 bg-[#020B1C]/60 rounded-xl border border-[#1f2d4d] text-right">
              <span className="text-xs text-gray-500 font-bold">إعادة إدراج خامات التأسيس المستبعدة:</span>
              <div className="flex flex-wrap gap-2">
                {state.disabledStandardItems.filter(x => ['sealer', 'thermal_sealer', 'putty', 'primer'].includes(x)).map(itemKey => (
                  <button key={itemKey} type="button" onClick={() => handleRestoreStandardItem(itemKey)} className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500 hover:text-white transition-all cursor-pointer">
                    + {getStandardItemLabel(itemKey)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* الجدول الثاني: أعمال ومواد دهانات التشطيب والألوان النهائية (يظهر فقط عند تفعيل التشطيب) */}
      {state.finishActive && (
        <div className="p-8 rounded-3xl bg-[#07132a] border border-[#1f2d4d] space-y-4 select-none">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#1f2d4d]/40 pb-3">
            <div className="flex items-center gap-2 text-[#D4AF37]">
              <Zap className="w-6 h-6 animate-pulse" />
              <h4 className="text-xl font-bold">ثانياً: جدول حصر وتنسيق دهانات التشطيب والوجه الملوّن والبنود المخصصة:</h4>
            </div>
            
            {/* قائمة الإضافة السريعة للخامات والمواد من سوبابيز */}
            <div className="flex items-center gap-2 w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
              <select value={quickAddProductId} onChange={(e) => setQuickAddProductId(e.target.value)} className="p-2.5 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-xs text-[#F0E6D2] font-bold outline-none cursor-pointer focus:border-[#D4AF37] min-w-[200px]">
                <option value="">-- اختر مادة تشطيب مسجلة --</option>
                {dbProducts.filter(p => p.subcategory === 'wallPaint' || p.subcategory === 'ceilingPaint').map(p => (
                  <option key={p.id} value={p.id}>{p.product_name} ({p.company})</option>
                ))}
              </select>
              <button type="button" onClick={() => handleAddCustomProduct(quickAddProductId, 'finish')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/20 text-xs font-bold text-[#D4AF37] transition-all cursor-pointer"><PlusCircle className="w-4 h-4" /><span>إضافة منتج</span></button>
              
              {/* الميزة المطلوبة: زر إضافة خامة مخصصة يدوية خارج سوبابيز للتشطيب */}
              <button type="button" onClick={() => handleAddManualProduct('finish')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-bold text-amber-500 transition-all cursor-pointer"><PlusCircle className="w-4 h-4" />إضافة بند<span></span></button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#1f2d4d] bg-[#020B1C]/60">
            <table className="w-full text-right text-xs text-white min-w-[700px] border-collapse">
              <thead className="bg-[#0b1b3d] text-[#F0E6D2] border-b border-[#1f2d4d] font-bold">
                <tr>
                  <th className="p-3">نوع الخامة التشطيبية</th>
                  <th className="p-3">المنتج الفعلي بالمخزن (تعديل تفاعلي)</th>
                  <th className="p-3 text-center">الكمية المطلوبة (بستلة)</th>
                  <th className="p-3 text-left">السعر الفردي</th>
                  <th className="p-3 text-left">إجمالي التكلفة</th>
                  <th className="p-3 text-center">حذف / استبعاد</th>
                </tr>
              </thead>
              <tbody>
                
                {/* دهان الجدران وجه نهائي */}
                {!state.disabledStandardItems.includes('wallPaint') && (
                  <tr className="border-b border-[#1f2d4d]/40">
                    <td className="p-3 font-bold">دهان حوائط نهائي وجهين ملون</td>
                    <td className="p-3 font-bold text-[#D4AF37]">
                      <select value={state.selectedWallPaintId ?? ''} onChange={(e) => handleTableMaterialSave('wallPaint', e.target.value)} className="p-2 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] text-xs font-bold outline-none focus:border-[#D4AF37] cursor-pointer max-w-[250px]">
                        <option value="">-- اختر دهان تشطيب لـ {state.selectedFinishingCompany ?? 'جوتن'} --</option>
                        {availableWallPaints.map((p) => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                      </select>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ finishPaintQtyOverride: (finishPaintQty ?? 0) + 1 }))} className="w-6 h-6 rounded bg-[#07132a] border border-[#1f2d4d] flex items-center justify-center hover:border-[#D4AF37] font-bold text-[#D4AF37] cursor-pointer">+</button>
                        <span className="font-mono font-bold text-sm min-w-[20px] text-center">{finishPaintQty}</span>
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ finishPaintQtyOverride: Math.max(0, (finishPaintQty ?? 0) - 1) }))} className="w-7 h-7 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">-</button>
                      </div>
                    </td>
                    <td className="p-3 text-left font-mono">{(activeWallPaint?.price || 2200).toLocaleString()} ج.م</td>
                    <td className="p-3 text-left font-mono text-[#D4AF37] font-bold">{totalFinishPaintCost.toLocaleString('en-US')} ج.م</td>
                    <td className="p-3 text-center">
                      <button type="button" onClick={() => handleRemoveStandardItem('wallPaint')} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                )}

                {/* دهان تشطيب الأسقف وجهين */}
                {state.includeCeilings && !state.disabledStandardItems.includes('ceilingPaint') && (
                  <tr className="border-b border-[#1f2d4d]/40">
                    <td className="p-3 font-bold">دهان تشطيب الأسقف وجهين ملون</td>
                    <td className="p-3 font-bold text-[#D4AF37]">
                      <select value={state.selectedCeilingPaintId ?? ''} onChange={(e) => handleTableMaterialSave('ceilingPaint', e.target.value)} className="p-2 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] text-xs font-bold outline-none focus:border-[#D4AF37] cursor-pointer max-w-[250px]">
                        <option value="">-- اختر دهان أسقف لـ {state.selectedUndercoatCompany ?? 'GLC'} --</option>
                        {availableCeilingPaints.map((p) => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                      </select>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ ceilingPaintQtyOverride: (ceilingPaintQty ?? 0) + 1 }))} className="w-7 h-7 rounded bg-[#07132a] border border-[#1f2d4d] flex items-center justify-center hover:border-[#D4AF37] font-bold text-[#D4AF37] cursor-pointer">+</button>
                        <span className="font-mono font-bold text-sm min-w-[30px] text-center">{ceilingPaintQty}</span>
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ ceilingPaintQtyOverride: Math.max(0, (ceilingPaintQty ?? 0) - 1) }))} className="w-7 h-7 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">-</button>
                      </div>
                    </td>
                    <td className="p-3 text-left font-mono">{(activeCeilingPaint?.price || 400).toLocaleString()} ج.م</td>
                    <td className="p-3 text-left font-mono text-[#D4AF37] font-bold">{ceilingPaintCost.toLocaleString('en-US')} ج.م</td>
                    <td className="p-3 text-center">
                      <button type="button" onClick={() => handleRemoveStandardItem('ceilingPaint')} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                )}

                {/* البنود الحرة واليدوية المخصصة */}
                {(state.customProducts || []).map((item: any) => (
                  <tr key={item.id} className="border-b border-[#1f2d4d]/40 bg-[#07132a]/30 hover:bg-[#07132a]/50 transition-colors">
                    <td className="p-3 font-bold text-gray-400">بند تشطيب إضافي مخصص</td>
                    <td className="p-3 font-bold">
                      <input 
                        type="text" 
                        value={item.name} 
                        onChange={(e) => handleEditCustomProductField(item.id, 'name', e.target.value, 'finish')}
                        className="bg-[#020B1C] border border-[#1f2d4d] p-1.5 rounded text-xs text-white font-bold outline-none focus:border-[#D4AF37] w-full max-w-[280px]"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => handleEditCustomProductField(item.id, 'quantity', Math.max(0, (item.quantity || 1) + 1), 'finish')} className="w-6 h-6 rounded bg-[#07132a] border border-[#1f2d4d] flex items-center justify-center hover:border-[#D4AF37] font-bold text-[#D4AF37] cursor-pointer">+</button>
                        <span className="font-mono font-bold text-sm min-w-[20px] text-center">{item.quantity}</span>
                        <button type="button" onClick={() => handleEditCustomProductField(item.id, 'quantity', Math.max(0, (item.quantity || 1) - 1), 'finish')} className="w-6 h-6 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm cursor-pointer flex items-center justify-center select-none">-</button>
                      </div>
                    </td>
                    <td className="p-3 text-left font-mono">
                      <div className="flex items-center justify-end gap-1">
                        <input 
                          type="number" 
                          value={item.price} 
                          onChange={(e) => handleEditCustomProductField(item.id, 'price', Math.max(0, Number(e.target.value)), 'finish')}
                          className="bg-[#020B1C] border border-[#1f2d4d] p-1 text-xs text-right text-[#D4AF37] font-bold rounded w-16 outline-none focus:border-[#D4AF37]"
                        />
                        <span className="text-[10px] text-gray-500">ج.م</span>
                      </div>
                    </td>
                    <td className="p-3 text-left font-mono text-emerald-400 font-bold">{(item.quantity * item.price).toLocaleString()} ج.م</td>
                    <td className="p-3 text-center">
                      <button type="button" onClick={() => handleRemoveCustomProduct(item.id, 'finish')} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}

              </tbody>
            </table>
          </div>

          {/* شريط استعادة البنود الأساسية المستبعدة من مرحلة التشطيب */}
          {state.disabledStandardItems.some(x => ['wallPaint', 'ceilingPaint'].includes(x)) && (
            <div className="flex items-center gap-2 p-3 bg-[#020B1C]/60 rounded-xl border border-[#1f2d4d] text-right">
              <span className="text-xs text-gray-500 font-bold">إعادة إدراج خامات التشطيب المستبعدة:</span>
              <div className="flex flex-wrap gap-2">
                {state.disabledStandardItems.filter(x => ['wallPaint', 'ceilingPaint'].includes(x)).map(itemKey => (
                  <button key={itemKey} type="button" onClick={() => handleRestoreStandardItem(itemKey)} className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500 hover:text-white transition-all cursor-pointer">
                    + {getStandardItemLabel(itemKey)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* صندوق الملاحظات */}
      <div className="p-6 rounded-2xl bg-[#07132a] border border-[#1f2d4d] space-y-3">
        <div className="flex items-center gap-2 text-[#D4AF37] border-b border-[#1f2d4d] pb-2 text-right">
          <FileText className="w-5 h-5" />
          <h4 className="text-base font-bold">اتفاقات وبنود مخصصة لأعمال الدهانات والنقاشة (ملاحظات العقد):</h4>
        </div>
        <textarea
          value={notesInput}
          disabled={!state.enabled}
          onChange={(e) => setNotesInput(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="اكتب هنا أي تفاصيل، درجات ألوان مخصصة، أو شروط تأسيس معجون تم الاتفاق عليها مع العميل لحفظها مباشرة بالعقد..."
          className="w-full h-24 p-4 rounded-xl bg-[#020B1C] border border-[#1f2d4d] hover:border-[#D4AF37]/50 focus:border-[#D4AF37] text-lg text-[#F0E6D2] placeholder-gray-500 outline-none transition-all resize-none text-base leading-relaxed text-right font-semibold"
        />
        <div className="flex justify-between items-center text-xs text-gray-500 px-1">
          <span>يتم الحفظ تلقائياً بمجرد الخروج من حقل الكتابة</span>
          <span>حالة الاتصال: متصل وسحابي</span>
        </div>
      </div>

      {/* كشف الإجمالي المالي لدهان الشقة المصمم مثل الكهرباء */}
      <div className="p-6 rounded-2xl bg-[#020B1C] border border-[#D4AF37]/30 shadow-[0_0_25px_rgba(212,175,55,0.06)] flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-2 bg-[#D4AF37]" />
        <div className="space-y-1 text-center sm:text-right pr-2">
          <h4 className="text-xl font-bold text-[#D4AF37]">كشف الملخص المالي لبند الدهانات والنقاشة الفنية:</h4>
          <p className="text-sm text-gray-400 font-normal leading-relaxed text-right">التسعير حركي؛ تأسيس المعجون والبطانة ({calculatedPrepCost.toLocaleString('en-US')} ج.م) + تشطيب الوجه النهائي الملون والمصنعية من السيرفر ({calculatedFinishCost.toLocaleString('en-US')} ج.م) + كلفة الحوائط الديكورية وأوراق الجدران والمصنعيات المخصصة ({calculatedDecorCost.toLocaleString('en-US')} ج.م) + الخامات الإضافية الحرة ({totalCustomProductsCost.toLocaleString('en-US')} ج.م)</p>
        </div>
        <div className="flex items-center gap-4 bg-[#07132a] px-8 py-5 rounded-xl border border-[#1f2d4d]">
          <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]"><DollarSign className="w-8 h-8 animate-pulse" /></div>
          <div className="text-right">
            <span className="text-xs text-gray-500 block font-semibold text-right">إجمالي تكلفة الدهانات المقدرة بالكامل:</span>
            <span className="text-3xl font-black text-[#F0E6D2] font-mono">{totalPaintEstimate.toLocaleString('en-US')} <span className="text-sm font-normal text-[#D4AF37]">ج.م</span></span>
          </div>
        </div>
      </div>

    </div> 
  );
}