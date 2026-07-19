"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from "../context/CRMContext";
import { supabase } from '@/lib/supabaseClient'; 
import TabActivationBanner from '../Finishing/TabActivationBanner'; 
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
  PlusCircle, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  Lock,
  Palette,
  ClipboardList
} from 'lucide-react';

interface PaintProps {
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
  ceilingLaborRate: 0, 
  wallHeight: 3.0, // 👈 إدراج عداد الارتفاع الافتراضي كحقل أساسي بالحالة
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
  disabledStandardItems: [] as string[] 
};

export default function Paint({ projectId }: PaintProps) {
  const { crmData, updateBulkFinishingSection } = useCRM();
  
  const totalUnitArea = Number(crmData?.project?.area || 150);

  const [dbProducts, setDbProducts] = useState<DBProduct[]>([]);
  const [dbSpecs, setDbSpecs] = useState<DBSpecification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  const isLocalChange = useRef(false);

  const [state, setState] = useState(DEFAULT_PAINT_STATE);

  const [quickAddProductId, setQuickAddProductId] = useState<string>('');
  const [quickAddPrepProductId, setQuickAddPrepProductId] = useState<string>(''); 
  const [notesInput, setNotesInput] = useState<string>('');

  const DECOR_WALL_FLAT_RATE = 4500; 

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

  useEffect(() => {
    if (crmData?.finishing?.paint) {
      const paintContext = crmData.finishing.paint;
      
      const defaultHeight = paintContext.wallHeight ?? 3.0; // 👈 استخلاص الارتفاع سحابياً
      const defaultWallArea = Math.ceil(totalUnitArea * defaultHeight); // 👈 معالجة المساحة المبدئية للوحدة
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
        wallHeight: paintContext.wallHeight ?? 3.0, // 👈 تهيئة حقل الارتفاع
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

  useEffect(() => {
    if (isLocalChange.current) {
      updateBulkFinishingSection('paint', state);
      isLocalChange.current = false;
    }
  }, [state]);

  const updateStateAndSave = (updater: (prev: typeof state) => Partial<typeof state>) => {
    setIsSaving(true);
    isLocalChange.current = true;
    setState(prev => {
      const updates = updater(prev);
      return { ...prev, ...updates };
    });
    setIsSaving(false);
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

  const handleAddManualProduct = (subType: 'prep' | 'finish') => {
    const newItem = {
      id: `manual-paint-${Date.now()}`,
      product_id: '', 
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

  const handleRemoveCustomProduct = (itemId: string, subType: 'prep' | 'finish') => {
    updateStateAndSave(prev => {
      const arrayKey = subType === 'prep' ? 'customPrepProducts' : 'customProducts';
      const updatedCustom = (prev[arrayKey] || []).filter((item: any) => item.id !== itemId);
      return { [arrayKey]: updatedCustom };
    });
  };

  const handleRemoveStandardItem = (key: string) => {
    updateStateAndSave(prev => {
      const updatedDisabled = prev.disabledStandardItems.includes(key)
        ? prev.disabledStandardItems
        : [...prev.disabledStandardItems, key];
      return { disabledStandardItems: updatedDisabled };
    });
  };

  const handleRestoreStandardItem = (key: string) => {
    updateStateAndSave(prev => ({
      disabledStandardItems: prev.disabledStandardItems.filter(x => x !== key)
    }));
  };

  const handleNotesBlur = () => {
    updateStateAndSave(prev => ({ notes: notesInput }));
  };

  const getStandardItemLabel = (key: string): string => {
    const labels: Record<string, string> = {
      sealer: 'سيلر مائي عازل',
      thermal_sealer: 'سيلر حراري ',
      putty: 'معجون الحوائط ',
      primer: 'بطانة التأسيس ',
      wallPaint: 'دهان جدران التشطيب ',
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
  
  const activeCeilingLaborRateCalculated = state.ceilingLaborRate > 0 ? state.ceilingLaborRate : 35;
  const totalLaborCost = state.finishActive 
    ? (state.wallArea * activeRate) + (state.includeCeilings ? (state.ceilingArea * activeCeilingLaborRateCalculated) : 0)
    : 0;

  const calculatedFinishCost = totalFinishPaintCost + ceilingPaintCost + totalLaborCost; 

  const decorWallsLaborRate = state.decorWallsLaborRate ?? 1500;
  const calculatedDecorCost = state.decorActive ? (state.decorWallsCount * (DECOR_WALL_FLAT_RATE + decorWallsLaborRate)) : 0;

  const totalCustomProductsCost = (state.customProducts || []).reduce((sum: number, item: any) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0);

  const totalPaintEstimate = calculatedPrepCost + calculatedFinishCost + calculatedDecorCost + totalCustomProductsCost;

  if (loading) {
    return (
      <div className="p-12 text-center text-[#D4AF37] font-bold text-lg animate-pulse">
        جاري جلب البنود والأسعار المعتمدة من شاشة الخامات ...
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none text-right font-alexandria" dir="rtl">

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800;900&display=swap');
        
        .font-alexandria {
          font-family: 'Alexandria', Arial, sans-serif !important;
          letter-spacing: normal !important;
        }
      `}</style>

      <TabActivationBanner 
        title="أعمال الدهانات والنقاشة والديكورات"
        subtitle="PREMIUM PAINTING & DECOR MANAGEMENT"
        icon={Palette}
        enabled={state.enabled}
        onToggle={() => { updateStateAndSave(prev => ({ enabled: !prev.enabled })); }}
      />

      <div className={`space-y-8 transition-opacity duration-300 ${state.enabled ? 'opacity-100 font-sans' : 'opacity-25 pointer-events-none filter grayscale'}`}>

        {/* 1. كارت مرحلة تأسيس المعجون والبطانة التمهيدية - مفعل بالنقر المباشر على الكارت */}
        <div 
          onClick={() => updateStateAndSave(prev => ({ prepActive: !prev.prepActive }))}
          className={`p-6 rounded-3xl border transition-all duration-500 flex flex-col lg:flex-row items-center justify-between gap-6 cursor-pointer ${
            state.prepActive 
              ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_20px_rgba(212,175,55,0.08)] opacity-100' 
              : 'border-[#1f2d4d] bg-[#020B1C]/40 opacity-50 hover:opacity-100'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right flex-1 w-full font-bold">
            <div className={`p-4 rounded-full transition-all duration-300 ${state.prepActive ? 'bg-[#D4AF37] text-[#020B1C]' : 'bg-[#1f2d4d] text-gray-500'}`}><Layers className="w-8 h-8" /></div>
            <div className="space-y-1 w-full text-right">
              <h4 className="text-lg font-bold text-[#D4AF37] leading-relaxed">مرحلة تأسيس المعجون والبطانة التمهيدية</h4>
              <p className="text-xs text-white leading-relaxed pt-1">تشمل صنفرة الحوائط للوحدة، عزل حوائط الوحدة بوجه سيلر مائي عازل، وسحب 3 او 4 اوجة معجون ودهان البطانة</p>
              {state.prepActive && (
                <div className="flex items-center gap-2 mt-3 justify-start" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs text-gray-500 font-semibold">براند التأسيس والمعجون المعتمد:</span>
                  <select value={state.selectedUndercoatCompany ?? 'GLC'} onChange={(e) => updateStateAndSave(prev => ({ selectedUndercoatCompany: e.target.value, selectedSealerId: '', selectedPuttyId: '', selectedPrimerId: '', selectedThermalSealerId: '' }))} className="p-2 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] text-xs font-bold outline-none cursor-pointer focus:border-[#D4AF37]">{finalUndercoatCompanies.map((comp) => <option key={comp} value={comp} className="bg-[#020B1C] text-white">{comp}</option>)}</select>
                </div>
              )}
            </div>
          </div>

          {/* مؤشر ضوئي ذكي لحالة كارت التأسيس بدلاً من المفتاح السحاب المكرر */}
          <div className="flex items-center gap-3 shrink-0 select-none" onClick={(e) => e.stopPropagation()}>
            {state.prepActive ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4AF37]"></span>
                </span>
                <span className="text-[10px] font-black text-[#D4AF37] tracking-wide">التأسيس مفعل</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1f2d4d]/20 border border-[#1f2d4d]">
                <span className="h-2 w-2 rounded-full bg-gray-600" />
                <span className="text-[10px] font-bold text-gray-500 tracking-wide">غير مفعل</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. كارت مرحلة دهان الألوان والتشطيب - مفعل بالنقر المباشر على الكارت */}
        <div 
          onClick={() => updateStateAndSave(prev => ({ finishActive: !prev.finishActive }))}
          className={`p-6 rounded-3xl border transition-all duration-500 flex flex-col lg:flex-row items-center justify-between gap-6 cursor-pointer ${
            state.finishActive 
              ? 'border-[#D4AF37] bg-gradient-to-r from-[#07132a] to-[#D4AF37]/5 shadow-[0_0_20px_rgba(212,175,55,0.08)] opacity-100' 
              : 'border-[#1f2d4d] bg-[#020B1C]/40 opacity-50 hover:opacity-100'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right flex-1 w-full">
            <div className={`p-4 rounded-full transition-all duration-300 ${state.finishActive ? 'bg-[#D4AF37] text-[#020B1C]' : 'bg-[#1f2d4d] text-gray-500'}`}><Zap className="w-8 h-8" /></div>
            <div className="space-y-1 w-full text-right">
              <h4 className="text-lg font-bold text-[#D4AF37] leading-relaxed">مرحلة دهان الحوائط واختيار الألوان والتشطيب والوجه النهائي</h4>
              <p className="text-xs text-white leading-relaxed pt-1">دهان وجهين نهائي للوحدة بالكامل للحوائط والأسقف:</p>
              {state.finishActive && (
                <div className="flex items-center gap-2 mt-3 justify-start" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs text-gray-500 font-semibold">براند التشطيب النهائى المعتمد:</span>
                  <select value={state.selectedFinishingCompany ?? 'جوتن'} onChange={(e) => updateStateAndSave(prev => ({ selectedFinishingCompany: e.target.value, selectedWallPaintId: '', laborRate: 0 }))} className="p-2 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] text-xs font-bold outline-none cursor-pointer focus:border-[#D4AF37]">{finalFinishingCompanies.map((comp) => <option key={comp} value={comp} className="bg-[#020B1C] text-white">{comp}</option>)}</select>
                </div>
              )}
            </div>
          </div>

          {/* مؤشر ضوئي ذكي لحالة كارت التشطيب بدلاً من المفتاح السحاب المكرر */}
          <div className="flex items-center gap-3 shrink-0 select-none" onClick={(e) => e.stopPropagation()}>
            {state.finishActive ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4AF37]"></span>
                </span>
                <span className="text-[10px] font-black text-[#D4AF37] tracking-wide">التشطيب مفعل</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1f2d4d]/20 border border-[#1f2d4d]">
                <span className="h-2 w-2 rounded-full bg-gray-600" />
                <span className="text-[10px] font-bold text-gray-500 tracking-wide">غير مفعل</span>
              </div>
            )}
          </div>
        </div>

        {/* كارت إجمالي مصنعيات النقاشة والدهانات */}
        {state.finishActive && (
          <div className="p-6 rounded-3xl bg-[#07132a] border border-[#D4AF37] flex flex-col md:flex-row items-center justify-between gap-6 hover:border-[#D4AF37]/40 shadow-lg transition-all duration-300 select-none">
            <div className="text-right space-y-1 flex-1 pl-4">
              <h4 className="text-md font-bold text-[#D4AF37]">إجمالي مصنعيات دهان الجدران والأسقف بالوحدة:</h4>
              <p className="text-xs text-white leading-relaxed">
               مصنعية متر الحوائط ({activeRate} ج.م) في مساحة الحوائط ({state.wallArea} م²) +   مصنعية متر الأسقف ({activeCeilingLaborRateCalculated} ج.م) في مساحة أسقف الوحدة ({state.includeCeilings ? state.ceilingArea : 0} م²).
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 select-none" onClick={(e) => e.stopPropagation()}>
              
              {/* عداد مصنعية الحوائط */}
              <div className="space-y-1 text-right">
                <span className="text-[10px] text-[#D4AF37] font-bold block mb-1"> مصنعية الحوائط:</span>
                <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-36">
                  <button 
                    type="button" 
                    onClick={() => updateStateAndSave(prev => ({ laborRate: activeRate + 5 }))}
                    className="w-6 h-6 rounded-full bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none"
                  >
                    +
                  </button>
                  <span className="text-sm font-black text-white font-mono">{activeRate} <span className="text-[8px] text-gray-500 font-bold">ج</span></span>
                  <button 
                    type="button" 
                    onClick={() => updateStateAndSave(prev => ({ laborRate: Math.max(0, activeRate - 5) }))}
                    className="w-6 h-6 rounded-full bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none"
                  >
                    -
                  </button>
                </div>
              </div>

              {/* عداد مصنعية الأسقف */}
              <div className="space-y-1 text-right">
                <span className="text-[10px] text-[#D4AF37] font-bold block mb-1"> مصنعية الأسقف:</span>
                <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-36">
                  <button 
                    type="button" 
                    onClick={() => updateStateAndSave(prev => ({ ceilingLaborRate: activeCeilingLaborRateCalculated + 5 }))}
                    className="w-7 h-7 rounded-lg bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none"
                  >
                    +
                  </button>
                  <span className="text-sm font-black text-white font-mono">{activeCeilingLaborRateCalculated} <span className="text-[8px] text-gray-500 font-bold">ج</span></span>
                  <button 
                    type="button" 
                    onClick={() => updateStateAndSave(prev => ({ ceilingLaborRate: Math.max(0, activeCeilingLaborRateCalculated - 5) }))}
                    className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none"
                  >
                    -
                  </button>
                </div>
              </div>

              <div className="h-11 w-px bg-[#1f2d4d] hidden sm:block" />
              <div className="text-right border-r border-[#1f2d4d]/60 pr-4 min-w-[120px]">
                <span className="text-[10px] text-[#D4AF37] block font-bold mb-1 opacity-75">اجمالى المصنعيات:</span>
                <span className="text-lg font-black text-[#D4AF37] font-mono leading-none">{totalLaborCost.toLocaleString()} <span className="text-xs font-normal text-white">ج.م</span></span>
              </div>

            </div>
          </div>
        )}

        {/* الحوائط الديكورية وأوراق الجدران */}
        <div 
          onClick={() => updateStateAndSave(prev => ({ decorActive: !prev.decorActive }))} 
          className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-6 ${
            state.decorActive 
              ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_20px_rgba(212,175,55,0.08)]' 
              : 'border-[#1f2d4d] bg-[#020B1C]/40 opacity-50 hover:opacity-100'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right flex-1 w-full">
            <div className={`p-4 rounded-full transition-all duration-300 ${state.decorActive ? 'bg-[#D4AF37] text-[#020B1C]' : 'bg-[#1f2d4d] text-gray-500'}`}><Star className="w-8 h-8" /></div>
            
            <div className="space-y-1 w-full text-right">
              <h4 className="text-lg font-bold text-[#D4AF37]"> الحوائط الديكورية وأوراق الجدران والقطيفة</h4>
              <p className="text-xs text-white max-w-xl leading-relaxed">تخصيص جدران مميزة بنظام ورق الحائط المستورد، أو دهانات القطيفة المخملية، أو بديل الرخام والخشب شاملة التركيب والمواد</p>
              
              {state.decorActive && (
                <div 
                  className="flex flex-col sm:flex-row items-center gap-6 mt-4 justify-start select-none" 
                  onClick={(e) => e.stopPropagation()}
                >
                  
                  {/* عداد أعداد الجدران الديكورية */}
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
                  
                  {/* عداد مالي لأجر مصنعية الجدار الديكوري */}
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
          
          <button 
            type="button" 
            onClick={(e) => {
              e.stopPropagation();
              updateStateAndSave(prev => ({ decorActive: !prev.decorActive }));
            }}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all min-w-[145px] flex items-center justify-center gap-2 cursor-pointer ${
              state.decorActive ? 'bg-[#D4AF37] text-[#020B1C]' : 'bg-[#1f2d4d] text-gray-500'
            }`}
          >
            {state.decorActive && <Check className="w-4 h-4 stroke-[3]" />}
            {state.decorActive ? 'البند مفعل' : ' غير مفعل'}
          </button>
        </div>

      </div>

      {/* 🌟 عدادات تقدير وحصر المساحات المحدث مع دمج عداد ارتفاع الحائط التفاعلي */}
      <div className="p-8 rounded-2xl bg-[#07132a] border border-[#D4AF37] space-y-6 select-none text-right">
        
        <div className="border-b border-[#D4AF37] pb-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]"><Cpu className="w-6 h-6" /></div>
          <div className="text-right">
            <h4 className="text-lg font-bold text-[#D4AF37]"> حصر مسطحات النقاشة والدهانات بالوحدة</h4>
            <p className="text-xs text-white mt-1">يقوم النظام بحساب مسطح جدران الوحدة تلقائياً بناءً على المساحة الأرضية والارتفاع المدخل بمرونة تامة</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* 🌟 التعديل المطلوب: عداد ارتفاع الحائط بالوحدة (الخطوة 0.1 م) */}
          <div className="p-6 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex flex-col justify-between gap-4">
            <div className="text-right">
              <span className="text-sm font-semibold text-[#D4AF37] block">ارتفاع الحوائط بالوحدة (متر)</span>
              <p className="text-xs text-gray-300 mt-1">حدد الارتفاع وتضرب القيمة تلقائياً في مساحة الوحدة</p>
            </div>
            <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-full">
              <button 
                type="button" 
                onClick={() => {
                  const nextHeight = Number((state.wallHeight + 0.1).toFixed(1));
                  updateStateAndSave(() => ({ 
                    wallHeight: nextHeight,
                    wallArea: Math.ceil(totalUnitArea * nextHeight) // ضرب ديناميكي فوري ومباشر
                  }));
                }} 
                className="w-8 h-8 rounded-lg bg-[#020B1C] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-mono"
              >
                +
              </button>
              <span className="text-base font-black text-white font-mono">{state.wallHeight.toFixed(1)} <span className="text-[10px] text-gray-500 font-normal">م</span></span>
              <button 
                type="button" 
                onClick={() => {
                  const nextHeight = Math.max(1.0, Number((state.wallHeight - 0.1).toFixed(1)));
                  updateStateAndSave(() => ({ 
                    wallHeight: nextHeight,
                    wallArea: Math.ceil(totalUnitArea * nextHeight)
                  }));
                }} 
                className="w-8 h-8 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-mono"
              >
                -
              </button>
            </div>
          </div>

          {/* عداد مساحة الجدران الفعلي */}
          <div className="p-6 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex flex-col justify-between gap-4">
            <div className="text-right">
              <span className="text-sm font-semibold text-[#D4AF37] block">إجمالي مساحة حوائط الدهانات</span>
              <p className="text-xs text-gray-300 mt-1">المساحة الفعلية لحوائط الدهانت</p>
            </div>
            <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-full">
              <button type="button" onClick={() => updateStateAndSave(prev => ({ wallArea: prev.wallArea + 5 }))} className="w-8 h-8 rounded-lg bg-[#020B1C] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-mono">+</button>
              <span className="text-base font-black text-white font-mono">{state.wallArea} <span className="text-[10px] text-gray-500 font-normal">م²</span></span>
              <button type="button" onClick={() => updateStateAndSave(prev => ({ wallArea: Math.max(0, prev.wallArea - 5) }))} className="w-8 h-8 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-mono">-</button>
            </div>
          </div>

          {/* عداد مساحة الأسقف */}
          <div className="p-6 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex flex-col justify-between gap-4">
            <div className="text-right">
              <span className="text-sm font-semibold text-[#D4AF37] block">إجمالي مساحة أسقف الدهانات </span>
              <p className="text-xs text-gray-300 mt-1">مساحة الأسقف بالوحدة</p>
            </div>
            <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-full">
              <button type="button" onClick={() => updateStateAndSave(prev => ({ ceilingArea: prev.ceilingArea + 5 }))} className="w-8 h-8 rounded-lg bg-[#020B1C] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-mono">+</button>
              <span className="text-base font-black text-white font-mono">{state.ceilingArea} <span className="text-[10px] text-gray-500 font-normal">م²</span></span>
              <button type="button" onClick={() => updateStateAndSave(prev => ({ ceilingArea: Math.max(0, prev.ceilingArea - 5) }))} className="w-8 h-8 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-mono">-</button>
            </div>
          </div>

        </div>
      </div>

      {/* الجدول الأول: حصر خامات التأسيس */}
      {state.prepActive && (
        <div className="p-8 rounded-3xl bg-[#07132a] border border-[#D4AF37] space-y-4 select-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D4AF37] pb-3">
            <div className="flex items-center gap-2 text-[#D4AF37]">
              <ClipboardList className="w-6 h-6" />
              <h4 className="text-lg font-bold">أولاً: حصر كميات مواد التأسيس والتحضير الإشائي:</h4>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
              <select value={quickAddPrepProductId} onChange={(e) => setQuickAddPrepProductId(e.target.value)} className="p-2.5 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-xs text-[#F0E6D2] font-bold outline-none cursor-pointer focus:border-[#D4AF37] min-w-[200px]">
                <option value="">-- أضف منتج  --</option>
                {dbProducts.filter(p => p.subcategory !== 'wallPaint' && p.subcategory !== 'ceilingPaint').map(p => (
                  <option key={p.id} value={p.id}>{p.product_name} ({p.company})</option>
                ))}
              </select>
              <button type="button" onClick={() => handleAddCustomProduct(quickAddPrepProductId, 'prep')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/20 text-xs font-bold text-[#D4AF37] transition-all cursor-pointer"><PlusCircle className="w-4 h-4" /><span>إضافة منتج</span></button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#D4AF37] bg-[#020B1C]/60">
            <table className="w-full text-right text-xs text-white min-w-[700px] border-collapse">
              <thead className="bg-[#0b1b3d] text-[#D4AF37] border-b border-[#D4AF37] font-bold">
                <tr>
                  <th className="p-3">نوع الخامة </th>
                  <th className="p-3 text-center">اسم المنتج</th>
                  <th className="p-3 text-center">الكمية المطلوبة</th>
                  <th className="p-3 text-center">السعر</th>
                  <th className="p-3 text-left">إجمالي التكلفة</th>
                  <th className="p-3 text-center">حذف </th>
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
                    <td className="p-3 font-bold">سيلر حراري عازل</td>
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
                    <td className="p-3 font-bold">معجون حوائط داخلي </td>
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
                    <td className="p-3 font-bold"> بطانة التأسيس </td>
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
                    <td className="p-3 font-bold text-gray-400">بند مخصص مضاف</td>
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
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-end gap-1">
                        <input type="number" value={item.price} onChange={(e) => handleEditCustomProductField(item.id, 'price', Math.max(0, Number(e.target.value)), 'prep')} className="bg-[#020B1C] border border-[#1f2d4d] p-1 text-xs text-white text-center font-bold rounded w-16 outline-none focus:border-[#D4AF37]" />
                        <span className="text-[10px] text-gray-300">ج.م</span>
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

      {/* الجدول الثاني: دهانات التشطيب */}
      {state.finishActive && (
        <div className="p-8 rounded-3xl bg-[#07132a] border border-[#D4AF37] space-y-4 select-none">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#D4AF37] pb-3">
            <div className="flex items-center gap-2 text-[#D4AF37]">
              <Zap className="w-5 h-5 animate-pulse" />
              <h4 className="text-lg font-bold">ثانياً: كميات مواد حصر دهانات التشطيب:</h4>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
              <select value={quickAddProductId} onChange={(e) => setQuickAddProductId(e.target.value)} className="p-2.5 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-xs text-[#F0E6D2] font-bold outline-none cursor-pointer focus:border-[#D4AF37] min-w-[200px]">
                <option value="">-- اختر منتج --</option>
                {dbProducts.filter(p => p.subcategory === 'wallPaint' || p.subcategory === 'ceilingPaint').map(p => (
                  <option key={p.id} value={p.id}>{p.product_name} ({p.company})</option>
                ))}
              </select>
              <button type="button" onClick={() => handleAddCustomProduct(quickAddProductId, 'finish')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/20 text-xs font-bold text-[#D4AF37] transition-all cursor-pointer"><PlusCircle className="w-4 h-4" /><span>إضافة منتج</span></button>
              
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#D4AF37] bg-[#020B1C]/60">
            <table className="w-full text-right text-xs text-white min-w-[700px] border-collapse">
              <thead className="bg-[#0b1b3d] text-[#D4AF37] border-b border-[#D4AF37] font-bold">
                <tr>
                  <th className="p-3">نوع الخامة</th>
                  <th className="p-3">المنتج اسم </th>
                  <th className="p-3 text-center">الكمية المطلوبة</th>
                  <th className="p-3 text-center">السعر </th>
                  <th className="p-3 text-left">إجمالي التكلفة</th>
                  <th className="p-3 text-center">حذف </th>
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
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ finishPaintQtyOverride: Math.max(0, (finishPaintQty ?? 0) - 1) }))} className="w-6 h-6 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center font-bold cursor-pointer transition-all-none">-</button>
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
                          className="bg-[#020B1C] border border-[#1f2d4d] p-1 text-xs text-center text-[#D4AF37] font-bold rounded w-16 outline-none focus:border-[#D4AF37]"
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
      <div className="p-6 rounded-2xl bg-[#07132a] border border-[#D4AF37] space-y-3 font-alexandria">
        <div className="flex items-center gap-2 text-[#D4AF37] border-b border-[#D4AF37] pb-2 text-right">
          <FileText className="w-5 h-5" />
          <h4 className="text-lg font-bold">ملاحظات وشروط استلام أعمال الدهانات والنقاشة :</h4>
        </div>
        <textarea
          value={notesInput}
          disabled={!state.enabled}
          onChange={(e) => setNotesInput(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="اكتب هنا أي تفاصيل، درجات ألوان مخصصة، أو شروط تأسيس معجون تم الاتفاق عليها مع العميل لحفظها مباشرة بالعقد..."
          className="w-full h-24 p-4 rounded-xl bg-[#020B1C] border border-[#1f2d4d] hover:border-[#D4AF37]/50 focus:border-[#D4AF37] text-lg text-[#F0E6D2] placeholder-gray-500 outline-none transition-all resize-none text-base leading-relaxed text-right font-semibold"
        />
        <div className="flex justify-between items-center text-xs text-gray-500 px-1 select-none">
          <span>يتم الحفظ تلقائياً بمجرد الخروج من حقل الكتابة</span>
          <span>حالة الاتصال: متصل </span>
        </div>
      </div>

      {/* الملخص المالي النهائي للبند */}
      <div className="p-5 rounded-xl bg-[#020B1C] border border-[#D4AF37]/30 shadow-[0_0_20px_rgba(212,175,55,0.05)] flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[#D4AF37]" />
        
        <div className="space-y-1 text-center sm:text-right pr-1 select-none">
          <h4 className="text-lg font-bold text-[#D4AF37]">الملخص المالي التقديري لبند الدهانات والنقاشة الفنية:</h4>
          <p className="text-xs text-white font-normal leading-relaxed max-w-2xl text-right">
            التسعير بالكامل؛ يشتمل على مجموع كلفة التأسيس الإجمالية ({calculatedPrepCost.toLocaleString('en-US')} ج.م) وباقة تشطيب الوجه النهائي الملون والمصنعية ({calculatedFinishCost.toLocaleString('en-US')} ج.م) مضافاً إليها ترقيات الحوائط الديكورية وأوراق الجدران المفعّلة بالموقع ({calculatedDecorCost.toLocaleString('en-US')} ج.م).
          </p>
        </div>

        <div className="flex items-center gap-3 bg-[#07132a] px-6 py-4 rounded-lg border border-[#1f2d4d]">
          <div className="p-1.5 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
            <DollarSign className="w-6 h-6" />
          </div>
          <div className="text-right">
            <span className="text-[10px] text-white block font-semibold text-right">إجمالي تكلفة أعمال الدهانات:</span>
            <span className="text-2xl font-black text-[#D4AF37] font-mono">
              {totalPaintEstimate.toLocaleString('en-US')} <span className="text-xs font-normal">ج.م</span>
            </span>
          </div>
        </div>
      </div>

    </div> 
  );
}