"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCRM } from "../context/CRMContext";
import { supabase } from '@/lib/supabaseClient';
import TabActivationBanner from './TabActivationBanner'; // 👈 استدعاء المكون المشترك الموحد للأجهزة اللمسية للشركة
import {
  Check,
  ClipboardList,
  Layers,
  Plus,
  Minus,
  DollarSign,
  FileText,
  Notebook,
  Truck,
  Wrench,
  Droplet,
  CheckCircle2,
  PlusCircle,
  Lock,
  HardHat,
  Package
} from 'lucide-react';

interface PlasterTabProps {
  projectId: string;
}

interface DBSpecification {
  uuid: string;
  code: string;
  spec_name: string;
  category: string;
  icon: string;
  description: string;
  steps: string[]; 
  base_rate?: number; 
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

const SPEC_CARDS_CONFIG = [
  {
    code: 'tarbeeh_taakees',
    title: 'تربيع وتأكيس 📐',
    desc: 'تأسيس الحوائط وتربيع الغرف لضمان زوايا قائمة (90 درجة) بالكامل بمسار الليزر.',
    rateKey: 'tarbeehRate',
    icon: (
      <svg className="w-6 h-6 stroke-[1.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
  {
    code: 'boaj_awtar',
    title: 'بؤج وأوتار 🧪',
    desc: 'ضبط استوائية واستقامة الجدران رأسياً وأفقياً بدقة بـ الليزر قبل المحارة.',
    rateKey: 'boajRate',
    icon: (
      <svg className="w-6 h-6 stroke-[1.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
      </svg>
    ),
  },
  {
    code: 'qada_zeraa',
    title: 'قدة وذراع 🧱',
    desc: 'أعمال بياض المحارة التقليدية السريعة باستخدام القدة والألومنيوم المباشر.',
    rateKey: 'qadaRate',
    icon: (
      <svg className="w-6 h-6 stroke-[1.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
      </svg>
    ),
  },
];

const DEFAULT_PLASTER_STATE = {
  enabled: true,
  isRepairsEnabled: false,
  selectedSpecCode: 'boaj_awtar',
  wallArea: 450,
  ceilingArea: 150,
  includeCeilings: true,
  selectedCementId: '',
  selectedSandId: '',
  notes: '',
  meshMetalPrice: 180,   
  meshFiberPrice: 90,     
  nailsBoxPrice: 75,      
  waterLogisticsPrice: 150, 
  waterLogisticsQty: 0,     
  meshMetalQty: 0,          
  meshFiberQty: 0,          
  nailsBoxesQty: 0,         
  logisticsFlat: 1500,
  repairsData: {
    description: "عمل مرمات محارة وتسكير فتحات الكهرباء والسباكة ومعالجة الشروخ بالكامل بمونة الجبس السريعة.",
    laborCost: 0,
    logisticsCost: 0,
    repairsCementQty: 0,   
    repairsSandQty: 0,     
    repairsGypsumQty: 0,   
    repairsCementPrice: 200, 
    repairsSandPrice: 250,   
    repairsGypsumPrice: 120, 
    notes: ""
  }
};

export default function PlasterTab({ projectId }: PlasterTabProps) {
  const { crmData, updateBulkFinishingSection } = useCRM();

  const totalUnitArea = Number(crmData?.project?.area || 150);

  const [dbSpecs, setDbSpecs] = useState<DBSpecification[]>([]);
  const [dbProducts, setDbProducts] = useState<DBProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // مرجع لمنع تعارض الحفظ وحظر الـ Infinite Loops أثناء مزامنة البيانات سحابياً
  const isLocalChange = useRef(false);
  const didSeedDefaults = useRef(false);

  // الحالة الموحدة الفاخرة للتحكم في منظومة أعمال المحارة والترميم
  const [state, setState] = useState(DEFAULT_PLASTER_STATE);
  const [notesInput, setNotesInput] = useState<string>('');

  const SPEC_RATES: Record<string, number> = {
    tarbeeh_taakees: 140,
    boaj_awtar: 120,
    qada_zeraa: 100,
  };

  const CEMENT_BAG_FALLBACK_PRICE = 200;
  const SAND_M3_FALLBACK_PRICE = 250;

  // جلب البيانات والمواصفات من قاعدة البيانات سوبابيز
  useEffect(() => {
    const fetchLibraries = async () => {
      try {
        setLoading(true);
        const { data: specsData } = await supabase
          .from('specifications_library')
          .select('*')
          .eq('category', 'plaster');

        const { data: productsData } = await supabase
          .from('products_library')
          .select('*')
          .eq('category', 'plaster');

        if (specsData) setDbSpecs(specsData);
        if (productsData) setDbProducts(productsData);
      } catch (error) {
        console.error("خطأ أثناء جلب بيانات اعمال المحارة للحساب :", error);
      } finally {
        setLoading(false);
      }
    };
    if (projectId) fetchLibraries();
  }, [projectId]);

  // اقتران ومزامنة البيانات المخزنة مسبقاً لمشروع العميل الحالي
  useEffect(() => {
    if (crmData?.finishing?.plaster) {
      const plasterContext = crmData.finishing.plaster;
      const defaultWallArea = Math.ceil(totalUnitArea * 3);
      const defaultCeilingArea = totalUnitArea;

      isLocalChange.current = false;
      setState({
        enabled: plasterContext.enabled ?? true,
        isRepairsEnabled: plasterContext.isRepairsEnabled ?? false,
        selectedSpecCode: plasterContext.selectedSpecCode ?? 'boaj_awtar',
        wallArea: plasterContext.wallArea ?? defaultWallArea,
        ceilingArea: plasterContext.ceilingArea ?? defaultCeilingArea,
        includeCeilings: plasterContext.includeCeilings ?? true,
        selectedCementId: plasterContext.selectedCementId ?? '',
        selectedSandId: plasterContext.selectedSandId ?? '',
        notes: plasterContext.notes ?? '',
        meshMetalPrice: plasterContext.meshMetalPrice ?? 180,   
        meshFiberPrice: plasterContext.meshFiberPrice ?? 90,     
        nailsBoxPrice: plasterContext.nailsBoxPrice ?? 75,      
        waterLogisticsPrice: plasterContext.waterLogisticsPrice ?? 150,
        waterLogisticsQty: plasterContext.waterLogisticsQty ?? 0,
        meshMetalQty: plasterContext.meshMetalQty ?? 0,
        meshFiberQty: plasterContext.meshFiberQty ?? 0,
        nailsBoxesQty: plasterContext.nailsBoxesQty ?? 0,
        logisticsFlat: plasterContext.logisticsFlat ?? 1500,
        repairsData: {
          description: plasterContext.repairsData?.description ?? "عمل مرمات تسكير فتحات الكهرباء ومعالجة الشروخ بالكامل.",
          laborCost: plasterContext.repairsData?.laborCost ?? 0,
          logisticsCost: plasterContext.repairsData?.logisticsCost ?? 0,
          repairsCementQty: plasterContext.repairsData?.repairsCementQty ?? 0,   
          repairsSandQty: plasterContext.repairsData?.repairsSandQty ?? 0,     
          repairsGypsumQty: plasterContext.repairsData?.repairsGypsumQty ?? 0,   
          repairsCementPrice: plasterContext.repairsData?.repairsCementPrice ?? 200, 
          repairsSandPrice: plasterContext.repairsData?.repairsSandPrice ?? 250,   
          repairsGypsumPrice: plasterContext.repairsData?.repairsGypsumPrice ?? 120, 
          notes: plasterContext.repairsData?.notes ?? ""
        }
      });
      setNotesInput(plasterContext.notes ?? '');
    }
  }, [crmData, totalUnitArea, dbProducts]);

  // التحديث التلقائي الفوري والآمن مع قاعدة البيانات سحابياً
  useEffect(() => {
    if (isLocalChange.current) {
      updateBulkFinishingSection('plaster', state);
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

  const handleMaterialBrandSave = (subcategory: string, productId: string) => {
    updateStateAndSave(() => {
      if (subcategory === 'cement') {
        return { selectedCementId: productId };
      } else {
        return { selectedSandId: productId };
      }
    });
  };

  const togglePlasterMode = (nextVal: boolean) => {
    updateStateAndSave(prev => ({
      enabled: nextVal,
      isRepairsEnabled: nextVal ? false : prev.isRepairsEnabled
    }));
  };

  const toggleRepairsMode = (nextVal: boolean) => {
    updateStateAndSave(prev => ({
      isRepairsEnabled: nextVal,
      enabled: nextVal ? false : prev.enabled
    }));
  };

  const handleUpdateField = (field: string, value: any) => {
    updateStateAndSave(prev => ({
      [field]: value
    }));
  };

  const handleRepairsChange = (partial: Partial<typeof DEFAULT_PLASTER_STATE['repairsData']>) => {
    updateStateAndSave(prev => ({
      repairsData: {
        ...prev.repairsData,
        ...partial
      }
    }));
  };

  const activeSpec = useMemo(() => {
    if (!dbSpecs || dbSpecs.length === 0) return null;
    let found = dbSpecs.find((s) => s.code === state.selectedSpecCode);
    if (found) return found;

    if (state.selectedSpecCode === 'qada_zeraa') {
      found = dbSpecs.find((s) => s.spec_name.includes('قدة') || s.spec_name.includes('ذراع'));
    } else if (state.selectedSpecCode === 'boaj_awtar') {
      found = dbSpecs.find((s) => s.spec_name.includes('بؤج') || s.spec_name.includes('أوتار'));
    } else if (state.selectedSpecCode === 'tarbeeh_taakees') {
      found = dbSpecs.find((s) => s.spec_name.includes('تربيع') || s.spec_name.includes('تأكيس'));
    }
    return found || dbSpecs[0];
  }, [dbSpecs, state.selectedSpecCode]);

  const stepsToRender = activeSpec?.steps || [];

  const activeRate = useMemo(() => {
    return activeSpec?.base_rate ?? SPEC_RATES[state.selectedSpecCode] ?? 120;
  }, [activeSpec, state.selectedSpecCode]);

  const cementProducts = dbProducts.filter((p) => p.subcategory === 'cement' || p.subcategory === 'أسمنت');
  const sandProducts = dbProducts.filter((p) => p.subcategory === 'sand' || p.subcategory === 'رمل');

  const totalPlasterArea = state.wallArea + (state.includeCeilings ? state.ceilingArea : 0);

  const requiredCementBags = Math.ceil(totalPlasterArea * 0.25); 
  const requiredSandVolume = Number((totalPlasterArea * 0.025).toFixed(2)); 

  const activeCement = dbProducts.find((p) => p.id === state.selectedCementId) || cementProducts[0];
  const activeSand = dbProducts.find((p) => p.id === state.selectedSandId) || sandProducts[0];

  const cementPrice = activeCement?.price ?? CEMENT_BAG_FALLBACK_PRICE;
  const sandPrice = activeSand?.price ?? SAND_M3_FALLBACK_PRICE;

  const totalCementCost = requiredCementBags * cementPrice;
  const totalSandCost = requiredSandVolume * sandPrice;

  const meshMetalPrice = Number(state.meshMetalPrice ?? 180);
  const meshFiberPrice = Number(state.meshFiberPrice ?? 90);
  const nailsBoxPrice = Number(state.nailsBoxPrice ?? 75);
  const waterLogisticsPrice = Number(state.waterLogisticsPrice ?? 150);

  const totalAccessoriesCost = 
    (Number(state.meshMetalQty || 0) * meshMetalPrice) +
    (Number(state.meshFiberQty || 0) * meshFiberPrice) +
    (Number(state.nailsBoxesQty || 0) * nailsBoxPrice) +
    (Number(state.waterLogisticsQty || 0) * waterLogisticsPrice);

  const logisticsFlatCost = Number(state.logisticsFlat || 0);

  const totalMaterialsCost = totalCementCost + totalSandCost + totalAccessoriesCost;
  const totalLaborCost = totalPlasterArea * activeRate;
  const totalPlasterEstimate = totalLaborCost + totalMaterialsCost + logisticsFlatCost;

  const repairsData = state.repairsData || DEFAULT_PLASTER_STATE.repairsData;

  const repairsCementPrice = Number(repairsData.repairsCementPrice ?? cementPrice ?? 200);
  const repairsSandPrice = Number(repairsData.repairsSandPrice ?? sandPrice ?? 250);
  const repairsGypsumPrice = Number(repairsData.repairsGypsumPrice ?? 120);

  const repairsMaterialsCost = 
    (Number(repairsData.repairsCementQty || 0) * repairsCementPrice) +
    (Number(repairsData.repairsSandQty || 0) * repairsSandPrice) +
    (Number(repairsData.repairsGypsumQty || 0) * repairsGypsumPrice);

  const totalRepairsEstimate = Number(repairsData.laborCost || 0) + Number(repairsData.logisticsCost || 0) + repairsMaterialsCost;

  const isSectionActive = state.enabled || state.isRepairsEnabled;

  const toggleMainHeader = () => {
    if (isSectionActive) {
      updateStateAndSave(() => ({ enabled: false, isRepairsEnabled: false }));
    } else {
      updateStateAndSave(() => ({ enabled: true, isRepairsEnabled: false }));
    }
  };

  return (
    
    <div className="space-y-8 text-right font-alexandria p-1 select-none" dir="rtl">
      
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800;900&display=swap');
        
        .font-alexandria {
          font-family: 'Alexandria', Arial, sans-serif !important;
          letter-spacing: normal !important;
        }
      `}</style>

      {/* 🌟 تم تسييل واستدعاء كارت التفعيل اللمسي المشترك الموحد للشركة (بدون سويتش On/Off ومضاء بكامل حيز الكارت) */}
      <TabActivationBanner 
        title="أعمال المحارة والمصيص والترميم"
        subtitle="PLASTERING & REPAIR SYSTEM"
        icon={Layers}
        enabled={isSectionActive}
        onToggle={toggleMainHeader}
      />

      <div className={`space-y-8 transition-opacity duration-300 ${isSectionActive ? 'opacity-100' : 'opacity-25 pointer-events-none filter grayscale'}`}>

        {/* 2. المبدل الحصري: محارة إنشائية / مرمات وترميم */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none">
          
          {/* المحارة الإنشائية */}
          <div
            onClick={() => togglePlasterMode(!state.enabled)}
            className={`p-6 rounded-3xl border-2 transition-all duration-300 cursor-pointer flex items-center justify-between shadow-xl ${
              state.enabled ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_15px_rgba(212,175,55,0.08)]' : 'border-[#1f2d4d] bg-[#07132a] opacity-50 hover:opacity-100'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl ${state.enabled ? 'bg-[#D4AF37] text-[#020B1C]' : 'bg-[#1f2d4d] text-gray-500'}`}>
                <Layers className="w-7 h-7" />
              </div>
              <div className="text-right">
                <h4 className="text-lg font-bold text-[#D4AF37]">أعمال بياض المحارة والمصيص الإنشائية</h4>
                <p className="text-xs text-white mt-1">حساب تلقائي متكامل بالمساحات، الكماليات، المون، واللوجستيات</p>
              </div>
            </div>
            
            {/* مجرى السحب المنزلق المذهب المصقول التفاعلي الموحد */}
            <div className="flex items-center gap-3 shrink-0 select-none" onClick={(e) => e.stopPropagation()}>
              <div 
                onClick={() => togglePlasterMode(!state.enabled)}
                className={`w-12 h-6 rounded-full relative p-0.5 transition-all duration-300 cursor-pointer ${
                  state.enabled 
                    ? 'bg-[#020B1C] border border-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.15)]' 
                    : 'bg-[#020B1C]/80 border border-[#1f2d4d]'
                }`}
              >
                <div 
                  className={`w-4.5 h-4.5 rounded-full absolute top-[3px] transition-all duration-300 ${
                    state.enabled 
                      ? 'right-[25px] bg-gradient-to-r from-[#F0E6D2] via-[#C9A45D] to-[#D4AF37] shadow-[0_0_10px_#D4AF37]' 
                      : 'right-[3px] bg-gray-600'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* المرمات والترميم */}
          <div
            onClick={() => toggleRepairsMode(!state.isRepairsEnabled)}
            className={`p-6 rounded-3xl border-2 transition-all duration-300 cursor-pointer flex items-center justify-between shadow-xl ${
              state.isRepairsEnabled ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_15px_rgba(212,175,55,0.08)]' : 'border-[#1f2d4d] bg-[#07132a] opacity-50 hover:opacity-100'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl ${state.isRepairsEnabled ? 'bg-[#D4AF37] text-[#020B1C]' : 'bg-[#1f2d4d] text-gray-400'}`}>
                <Notebook className="w-7 h-7" />
              </div>
              <div className="text-right">
                <h4 className="text-lg font-bold text-[#D4AF37]"> ترميم التسكير والفتحات يدوياً (المرمات) </h4>
                <p className="text-xs text-white mt-1">تسجيل مقطوعات مصنعية الفنيين مع حصر خامات المونة والجبس للمرمات</p>
              </div>
            </div>
            
            {/* مجرى السحب المنزلق المذهب المصقول التفاعلي الموحد */}
            <div className="flex items-center gap-3 shrink-0 select-none" onClick={(e) => e.stopPropagation()}>
              <div 
                onClick={() => toggleRepairsMode(!state.isRepairsEnabled)}
                className={`w-12 h-6 rounded-full relative p-0.5 transition-all duration-300 cursor-pointer ${
                  state.isRepairsEnabled 
                    ? 'bg-[#020B1C] border border-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.15)]' 
                    : 'bg-[#020B1C]/80 border border-[#1f2d4d]'
                }`}
              >
                <div 
                  className={`w-4.5 h-4.5 rounded-full absolute top-[3px] transition-all duration-300 ${
                    state.isRepairsEnabled 
                      ? 'right-[25px] bg-gradient-to-r from-[#F0E6D2] via-[#C9A45D] to-[#D4AF37] shadow-[0_0_10px_#D4AF37]' 
                      : 'right-[3px] bg-gray-600'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. مسار أعمال المحارة الإنشائية الأساسية بياض ورميات مذهب */}
        {state.enabled && (
          <div className="space-y-8 animate-fade-in">
            {/* كروت اختيار باقة ومواصفة الاستلام */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-2 border-r-4 border-[#D4AF37] mr-2">
                <Layers className="w-5 h-5 text-[#D4AF37]" />
                <h4 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2">أولاً: حدد مواصفة ونوع أعمال المحارة المعتمدة للوحدة:</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {SPEC_CARDS_CONFIG.map((card) => {
                  const isActive = state.selectedSpecCode === card.code;
                  const specDb =
                    dbSpecs.find((s) => s.code === card.code) ||
                    dbSpecs.find((s) => s.spec_name.includes(card.title.slice(0, 4)));
                  const liveRate = specDb?.base_rate || SPEC_RATES[card.code];

                  return (
                    <div
                      key={card.code}
                      onClick={() => {
                        updateStateAndSave(prev => ({ selectedSpecCode: card.code }));
                      }}
                      className={`p-6 rounded-2xl bg-[#07132a] border transition-all duration-300 cursor-pointer flex flex-col justify-between h-[180px] relative ${
                        isActive
                          ? 'border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.15)] bg-gradient-to-b from-[#07132a] to-[#D4AF37]/5'
                          : 'border-[#1f2d4d] hover:border-[#D4AF37]/50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">{card.icon}</div>
                          <span className="text-xs bg-[#1f2d4d]/80 border border-[#D4AF37]/30 text-[#D4AF37] px-2.5 py-1 rounded-lg font-bold">
                            سعر المتر: {liveRate} ج.م
                          </span>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isActive ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-gray-500'
                          }`}
                        >
                          {isActive && <div className="w-2.5 h-2.5 rounded-full bg-[#020B1C]" />}
                        </div>
                      </div>
                      <div className="mt-2 text-right">
                        <h5 className="text-xl font-bold text-[#F0E6D2]">{card.title}</h5>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{card.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* كارت حصر وتقدير المساحات التلقائي بالعداد الفخم */}
            <div className="p-8 rounded-3xl bg-[#07132a] border border-[#D4AF37] space-y-6">
              <div className="border-b border-[#D4AF37] pb-4 text-right">
                <h4 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2">
                  <span>📐</span>  حصر وتقدير مساحات أعمال المحارة بالوحدة
                </h4>
                <p className="text-xs text-white mt-1">
                  يقوم النظام بضرب مساحة الشقة الإجمالية ({totalUnitArea} م²) في معدل حصر الجدران القياسي المعتمد (× 3)، ومساحة الأسقف القياسية (× 1) تلقائياً
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* مساحة محارة الجدران المحدّثة بـ h-11 والدواير w-6 h-6 بكسلياً طبقا للدستور */}
                <div className="p-6 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex items-center justify-between">
                  <div className="text-right">
                    <span className="text-sm font-semibold text-[#D4AF37] block">إجمالي مساحة حوائط المشروع</span>
                    <p className="text-xs text-white mt-1">المساحة القياسية لجدران الشقة (مساحة الوحدة × 3)</p>
                  </div>
                  <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-36" dir="ltr">
                    <button 
                      type="button" 
                      onClick={() => updateStateAndSave(prev => ({ wallArea: prev.wallArea + 5 }))} 
                      className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-sm transition active:scale-90"
                    >
                      <Plus size={12} className="stroke-[3]" />
                    </button>
                    <span className="text-base font-black text-white font-mono">{state.wallArea} <span className="text-[10px] text-gray-500 font-bold">م²</span></span>
                    <button 
                      type="button" 
                      onClick={() => updateStateAndSave(prev => ({ wallArea: Math.max(0, prev.wallArea - 5) }))} 
                      className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                    >
                      <Minus size={12} className="stroke-[3]" />
                    </button>
                  </div>
                </div>

                {/* مساحة محارة الأسقف المحدّثة بـ h-11 والدواير w-6 h-6 بكسلياً طبقا للدستور */}
                <div className="p-6 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex items-center justify-between">
                  <div className="text-right">
                    <span className="text-sm font-semibold text-[#D4AF37] block">إجمالي مساحة أسقف المشروع</span>
                    <p className="text-xs text-white mt-1">المساحة القياسية لأسقف الوحدة (مساحة الوحدة × 1)</p>
                  </div>
                  <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-36" dir="ltr">
                    <button 
                      type="button" 
                      onClick={() => updateStateAndSave(prev => ({ ceilingArea: prev.ceilingArea + 5 }))} 
                      className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-sm transition active:scale-90"
                    >
                      <Plus size={12} className="stroke-[3]" />
                    </button>
                    <span className="text-base font-black text-white font-mono">{state.ceilingArea} <span className="text-[10px] text-gray-500 font-bold">م²</span></span>
                    <button 
                      type="button" 
                      onClick={() => updateStateAndSave(prev => ({ ceilingArea: Math.max(0, prev.ceilingArea - 5) }))} 
                      className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                    >
                      <Minus size={12} className="stroke-[3]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* خيار إدراج محارة السقف بالباقة */}
              <div
                onClick={() => {
                  updateStateAndSave(prev => ({ includeCeilings: !prev.includeCeilings }));
                }}
                className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-4 select-none ${
                  state.includeCeilings
                    ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_15px_rgba(212,175,55,0.05)]'
                    : 'border-[#1f2d4d] bg-[#020B1C]/40 hover:border-[#D4AF37]/40'
                }`}
              >
                <div className="text-right">
                  <span className="text-base font-bold text-[#D4AF37]">إدراج واحتساب محارة الأسقف بالمقايسة الإنشائية</span>
                  <span className="text-xs text-white block mt-1 font-normal">
                    تفعيل هذا الخيار يضيف مسطح الأسقف المتري ({state.ceilingArea} م²) إلى الحساب المالي الإجمالي لبند المحارة
                  </span>
                </div>
                <button
                  type="button"
                  className={`px-5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    state.includeCeilings ? 'bg-[#D4AF37] text-[#020B1C]' : 'bg-[#1f2d4d] text-gray-500'
                  }`}
                >
                  {state.includeCeilings ? ' تم اضافة السقف' : 'اضف السقف للمقايسة'}
                </button>
              </div>
            </div>

            {/* الخطوات الفنية للاستلام الاسترشادي الهندسي مذهب العنوان */}
            <div className="p-8 rounded-3xl bg-[#07132a] border border-[#D4AF37] space-y-6 select-none">
              <div className="flex items-center gap-2 text-[#D4AF37] border-b border-[#D4AF37] pb-4 text-right">
                <ClipboardList className="w-6 h-6 animate-pulse" />
                <h4 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2">خطوات التنفيذ الفني والاستلام الهندسي للبند :</h4>
              </div>

              {stepsToRender.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
                  {stepsToRender.map((stepText, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 bg-[#020B1C]/60 border border-[#1f2d4d] rounded-2xl text-right hover:border-[#D4AF37]/30 transition-all duration-300"
                    >
                      <p className="text-sm text-[#F0E6D2] leading-relaxed flex-1 pl-4 text-right">{stepText}</p>
                      <div className="w-8 h-8 rounded-full border border-[#D4AF37] text-[#D4AF37] flex items-center justify-center font-bold flex-shrink-0 text-sm">
                        {idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4 text-sm">
                  لا توجد خطوات استلام مدخلة لهذه المواصفة بمكتبة السيرفر حالياً.
                </p>
              )}
            </div>

            {/* قسم الخامات الأساسية رمل وأسمنت بالتوهج الفاخر والواضح جداً */}
            <div className="p-8 rounded-3xl bg-[#07132a] border border-[#D4AF37] space-y-6">
              <div className="flex items-center gap-2 border-b border-[#D4AF37] pb-4 text-[#D4AF37] text-right">
                <Layers className="w-5 h-5 animate-pulse" />
                <h4 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2">ثالثاً: مون التأسيس لأعمال المحارة المعتمدة  🧪:</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* الأسمنت باللون الأخضر الصريح والفاخر */}
                <div className="p-6 rounded-3xl bg-[#020B1C]/60 border border-[#1f2d4d] flex flex-col justify-between min-h-[160px] space-y-4 hover:border-[#D4AF37]/30 transition-all text-right">
                  <div>
                    <span className="text-sm font-semibold text-[#F0E6D2] block">نوع براند الأسمنت:</span>
                    <select value={state.selectedCementId} onChange={(e) => handleMaterialBrandSave('cement', e.target.value)} className="p-2 rounded-lg bg-[#07132a] border border-[#1f2d4d] text-[#D4AF37] text-xs font-bold outline-none cursor-pointer w-full mt-2">
                      <option value="">-- اختر براند الأسمنت المعتمد --</option>
                      {cementProducts.map((p) => (
                        <option key={p.id} value={p.id} className="bg-[#020B1C] text-white">
                          {p.company} - {p.product_name} ({p.price} ج.م / {p.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  {state.selectedCementId && activeCement && (
                    <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 flex flex-col justify-center gap-1.5 animate-fade-in select-none text-right">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span> المطلوبة للمساحة ({totalPlasterArea} م²):</span>
                        <span className="text-emerald-300 font-black font-mono text-sm">
                          {requiredCementBags} شكارة ({((requiredCementBags * 50) / 1000).toFixed(2)} طن)
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-emerald-500/10 pt-1.5 mt-0.5">
                        <span className="font-bold">إجمالي تكلفة الأسمنت:</span>
                        <span className="text-emerald-400 font-black font-mono text-base">= {totalCementCost.toLocaleString('en-US')} ج.م</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* الرمل باللون الأخضر الصريح والفاخر والواضح جداً */}
                <div className="p-6 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex flex-col justify-between min-h-[160px] space-y-4 hover:border-[#D4AF37]/30 transition-all text-right">
                  <div>
                    <span className="text-sm font-semibold text-[#F0E6D2] block">مورد الرمل المعتمد:</span>
                    <select value={state.selectedSandId} onChange={(e) => handleMaterialBrandSave('sand', e.target.value)} className="p-2 rounded-lg bg-[#07132a] border border-[#1f2d4d] text-[#D4AF37] text-xs font-bold outline-none cursor-pointer w-full mt-2">
                      <option value="">-- اختر مورد الرمل  --</option>
                      {sandProducts.map((p) => (
                        <option key={p.id} value={p.id} className="bg-[#020B1C] text-white">
                          {p.company || "مورد معتمد"} - {p.product_name} ({p.price} ج.م / {p.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  {state.selectedSandId && activeSand && (
                    <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 flex flex-col justify-center gap-1.5 animate-fade-in select-none text-right">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span>الحجم المطلوب للمساحة ({totalPlasterArea} م²):</span>
                        <span className="text-emerald-300 font-black font-mono text-sm">
                          {requiredSandVolume} م³
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-emerald-500/10 pt-1.5 mt-0.5">
                        <span className="font-bold">إجمالي تكلفة الرمل :</span>
                        <span className="text-emerald-400 font-black font-mono text-base">= {totalSandCost.toLocaleString('en-US')} ج.م</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* مخزن كماليات وإكسسوارات بياض المحارة بالعداد المذهب الفاخر المحرر للأسعار والكميات بالكامل */}
            <div className="p-8 rounded-3xl bg-[#07132a] border border-[#D4AF37] space-y-6 select-none">
              <div className="border-b border-[#D4AF37] pb-4 flex items-center gap-2 text-right">
                <Wrench className="w-6 h-6 text-[#D4AF37]" />
                <h4 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2">رابعاً: الكماليات وإكسسوارات بياض المحارة المعتمدة 🛠️:</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* شبك سلك مجلفن */}
                <div className="p-4 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex flex-col justify-between min-h-[155px] space-y-2 hover:border-[#D4AF37]/40 transition-all">
                  <div className="space-y-1 text-right">
                    <span className="text-xs font-bold text-[#D4AF37] block">شبك سلك تمديد مجلفن</span>
                    
                    {/* تحرير سعر لفة السلك تفاعلياً */}
                    <div className="flex items-center gap-1 mt-1.5 justify-between" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] text-gray-500">سعر اللفة:</span>
                      <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-lg h-8 px-1 w-24">
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ meshMetalPrice: prev.meshMetalPrice + 10 }))} className="w-5 h-5 rounded bg-[#020B1C] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-[9px] flex items-center justify-center cursor-pointer">+</button>
                        <span className="text-xs font-bold text-white font-mono">{state.meshMetalPrice}</span>
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ meshMetalPrice: Math.max(0, prev.meshMetalPrice - 10) }))} className="w-5 h-5 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-bold text-[9px] flex items-center justify-center cursor-pointer">-</button>
                      </div>
                    </div>
                  </div>
                  {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                  <div className="flex items-center justify-between border-t border-[#1f2d4d]/40 pt-2" dir="rtl" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[10px] text-gray-500 font-bold">الكمية:</span>
                    <div className="flex items-center bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-1.5 gap-2 select-none" dir="ltr">
                      <button type="button" onClick={() => updateStateAndSave(prev => ({ meshMetalQty: prev.meshMetalQty + 1 }))} className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#1f2d4d] text-xs font-bold flex items-center justify-center text-[#D4AF37] cursor-pointer">+</button>
                      <span className="text-xs font-bold text-white font-mono min-w-[16px] text-center">{state.meshMetalQty || 0}</span>
                      <button type="button" onClick={() => updateStateAndSave(prev => ({ meshMetalQty: Math.max(0, prev.meshMetalQty - 1) }))} className="w-6 h-6 rounded-full bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-bold text-xs flex items-center justify-center cursor-pointer">-</button>
                    </div>
                  </div>
                </div>

                {/* شبك فايبر */}
                <div className="p-4 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex flex-col justify-between min-h-[155px] space-y-2 hover:border-[#D4AF37]/40 transition-all">
                  <div className="space-y-1 text-right">
                    <span className="text-xs font-bold text-[#D4AF37] block">شبك فايبر لمعالجة الشروخ</span>
                    
                    {/* تحرير سعر بكرة شبك الفايبر */}
                    <div className="flex items-center gap-1 mt-1.5 justify-between" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] text-gray-500">سعر البكرة:</span>
                      <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-lg h-8 px-1 w-24">
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ meshFiberPrice: prev.meshFiberPrice + 10 }))} className="w-5 h-5 rounded bg-[#020B1C] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-[9px] flex items-center justify-center cursor-pointer">+</button>
                        <span className="text-xs font-bold text-white font-mono">{state.meshFiberPrice}</span>
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ meshFiberPrice: Math.max(0, prev.meshFiberPrice - 10) }))} className="w-5 h-5 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-bold text-[9px] flex items-center justify-center cursor-pointer">-</button>
                      </div>
                    </div>
                  </div>
                  {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                  <div className="flex items-center justify-between border-t border-[#1f2d4d]/40 pt-2" dir="rtl">
                    <span className="text-[10px] text-gray-500 font-bold">العدد:</span>
                    <div className="flex items-center bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-1.5 gap-2 select-none" dir="ltr" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => updateStateAndSave(prev => ({ meshFiberQty: (prev.meshFiberQty || 0) + 1 }))} className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#1f2d4d] text-xs font-bold flex items-center justify-center text-[#D4AF37] cursor-pointer">+</button>
                      <span className="text-xs font-bold text-white font-mono min-w-[16px] text-center">{state.meshFiberQty || 0}</span>
                      <button type="button" onClick={() => updateStateAndSave(prev => ({ meshFiberQty: Math.max(0, (state.meshFiberQty || 0) - 1) }))} className="w-6 h-6 rounded-full bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs flex items-center justify-center cursor-pointer">-</button>
                    </div>
                  </div>
                </div>

                {/* مسامير وورد التثبيت */}
                <div className="p-4 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex flex-col justify-between min-h-[155px] space-y-2 hover:border-[#D4AF37]/40 transition-all">
                  <div className="space-y-1 text-right">
                    <span className="text-xs font-bold text-[#D4AF37] block">مسامير وورد تثبيت الشبك</span>
                    
                    {/* تحرير سعر علبة المسامير */}
                    <div className="flex items-center gap-1 mt-1.5 justify-between" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] text-gray-500">سعر الععلبة:</span>
                      <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-lg h-8 px-1 w-24">
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ nailsBoxPrice: prev.nailsBoxPrice + 5 }))} className="w-5 h-5 rounded bg-[#020B1C] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-[9px] flex items-center justify-center cursor-pointer">+</button>
                        <span className="text-xs font-bold text-white font-mono">{state.nailsBoxPrice}</span>
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ nailsBoxPrice: Math.max(0, prev.nailsBoxPrice - 5) }))} className="w-5 h-5 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-bold text-[9px] flex items-center justify-center cursor-pointer">-</button>
                      </div>
                    </div>
                  </div>
                  {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                  <div className="flex items-center justify-between border-t border-[#1f2d4d]/40 pt-2" dir="rtl">
                    <span className="text-[10px] text-gray-500 font-bold">العدد:</span>
                    <div className="flex items-center bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-1.5 gap-2 select-none" dir="ltr" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => updateStateAndSave(prev => ({ nailsBoxesQty: prev.nailsBoxesQty + 1 }))} className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#1f2d4d] text-xs font-bold flex items-center justify-center text-[#D4AF37] cursor-pointer">+</button>
                      <span className="text-xs font-bold text-white font-mono min-w-[16px] text-center">{state.nailsBoxesQty || 0}</span>
                      <button type="button" onClick={() => updateStateAndSave(prev => ({ nailsBoxesQty: Math.max(0, prev.nailsBoxesQty - 1) }))} className="w-6 h-6 rounded-full bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs flex items-center justify-center cursor-pointer">-</button>
                    </div>
                  </div>
                </div>

                {/* خرطوم مياه خلط المحارة - تحرير الكمية وتحرير السعر تفاعلياً بالكامل */}
                <div className="p-4 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex flex-col justify-between min-h-[155px] space-y-2 hover:border-[#D4AF37]/40 transition-all">
                  <div className="text-right space-y-1">
                    <span className="text-xs font-bold text-[#F0E6D2] block flex items-center gap-1 justify-end">
                      <Droplet className="w-3.5 h-3.5 text-[#D4AF37]" /> شراء مياه خلط المحارة
                    </span>
                    
                    {/* عداد تحرير سعر خرطوم المياه الفردي الجديد لفك الرقم الثابت القديم */}
                    <div className="flex items-center gap-1 mt-1 justify-between" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] text-gray-500">سعر الخرطوم:</span>
                      <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-lg h-8 px-1 w-24">
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ waterLogisticsPrice: prev.waterLogisticsPrice + 10 }))} className="w-5 h-5 rounded bg-[#020B1C] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-[9px] flex items-center justify-center cursor-pointer">+</button>
                        <span className="text-xs font-bold text-white font-mono">{state.waterLogisticsPrice}</span>
                        <button type="button" onClick={() => updateStateAndSave(prev => ({ waterLogisticsPrice: Math.max(0, state.waterLogisticsPrice - 10) }))} className="w-5 h-5 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-bold text-[9px] flex items-center justify-center cursor-pointer">-</button>
                      </div>
                    </div>
                  </div>
                  {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                  <div className="flex items-center justify-between border-t border-[#1f2d4d]/40 pt-2" dir="rtl" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[10px] text-gray-500 font-bold">العدد:</span>
                    <div className="flex items-center bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-1.5 gap-2 select-none" dir="ltr">
                      <button type="button" onClick={() => updateStateAndSave(prev => ({ waterLogisticsQty: prev.waterLogisticsQty + 1 }))} className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#1f2d4d] text-xs font-bold flex items-center justify-center text-[#D4AF37] cursor-pointer">+</button>
                      <span className="text-sm font-bold text-[#D4AF37] font-mono min-w-[16px] text-center">{state.waterLogisticsQty || 0}</span>
                      <button type="button" onClick={() => updateStateAndSave(prev => ({ waterLogisticsQty: Math.max(0, prev.waterLogisticsQty - 1) }))} className="w-6 h-6 rounded-full bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-xs flex items-center justify-center cursor-pointer">-</button>
                    </div>
                  </div>
                </div>

              </div>

              {/* كارت لوجستيات الرفع والتشوين الإنشائي العداد الفخم */}
              <div className="p-5 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 select-none">
                <div className="flex items-center gap-3 text-right">
                  <Truck className="w-5 h-5 text-[#D4AF37]" />
                  <div>
                    <span className="text-sm font-bold text-[#D4AF37] flex items-center gap-2">تكاليف تشوين الرمل والأسمنت  (مقطوعية)</span>
                    <span className="text-xs text-gray-500 block mt-1 leading-normal">تشمل الرفع بالعمالة اليدوية أو الأوناش لسلامة الموقع من الأضرار، حرّر تكلفتها يدويًا:</span>
                  </div>
                </div>
                {/* العداد h-11 مع الدواير w-6 h-6 بكسلياً طبقا للدستور */}
                <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-44">
                  <button type="button" onClick={() => updateStateAndSave(prev => ({ logisticsFlat: prev.logisticsFlat + 100 }))} className="w-7 h-7 rounded-lg bg-[#020B1C] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                  <span className="text-base font-black text-white font-mono">{(state.logisticsFlat || 0).toLocaleString()} <span className="text-[10px] text-gray-500 font-normal">ج</span></span>
                  <button type="button" onClick={() => updateStateAndSave(prev => ({ logisticsFlat: Math.max(0, (state.logisticsFlat || 0) - 100) }))} className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                </div>
              </div>
            </div>

            {/* صندوق الملاحظات */}
            <div className="p-6 rounded-2xl bg-[#07132a] border border-[#D4AF37] space-y-3">
              <div className="flex items-center gap-2 text-[#D4AF37] border-b border-[#D4AF37]/60 pb-2 text-right">
                <FileText className="w-5 h-5" />
                <h4 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2">ملاحظات وشروط أعمال بياض المحارة :</h4>
              </div>
              <textarea
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="اكتب مواصفات أعمال المحارة بالتحديد للعمال..."
                className="w-full h-24 p-5 rounded-2xl bg-[#020B1C] border border-[#1f2d4d] focus:border-[#D4AF37] text-lg text-[#F0E6D2] placeholder-gray-500 outline-none transition-all resize-none text-base leading-relaxed text-right font-semibold"
              />
              <div className="flex justify-between items-center text-xs text-gray-500 px-1">
                <span>يتم الحفظ تلقائياً بمجرد الخروج من حقل الكتابة</span>
                <span>حالة الاتصال: متصل </span>
              </div>
            </div>
          </div>

          
        )}

        {/* 4. مسار المرمات وتسكير الفتحات */}
        {state.isRepairsEnabled && (
          <div className="space-y-6 animate-fade-in text-right">
            <div className="p-8 rounded-3xl bg-[#07132a] border border-[#D4AF37] shadow-2xl space-y-8">
              <div className="flex items-center gap-3 text-[#D4AF37] border-b border-[#D4AF37] pb-4 text-right">
                <Notebook className="w-8 h-8 animate-pulse" />
                <h4 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2"> أعمال المرمات والترميم الفنية بالمشروع  🛠️:</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2 space-y-3 text-right">
                  <label className="text-lg text-[#D4AF37] font-bold block pr-2">توصيف المرمات المطلوبة:</label>
                  <textarea
                    value={repairsData.description}
                    onChange={(e) => handleRepairsChange({ description: e.target.value })}
                    className="w-full h-32 p-5 rounded-2xl bg-[#020B1C] border border-[#1f2d4d] text-[#F0E6D2] text-md outline-none focus:border-[#D4AF37] leading-loose shadow-inner text-right font-semibold"
                  />
                </div>

                {/* حصر خامات المرمات يدوياً بأسعار وكميات مذهبة كبيرة وعريضة الخط لسهولة قراءة المبيعات وتحرير الأسعار بالكامل */}
                <div className="md:col-span-2 p-6 rounded-3xl bg-[#020B1C]/60 border border-[#D4AF37] space-y-4">
                  <span className="text-lg font-bold text-[#D4AF37] flex items-center gap-2 border-b border-[#D4AF37] pb-2">خامات مون المرمات المطلوبة  (عدادات أسعار وكميات حرة بالكامل):</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    
                    {/* أسمنت المرمات - تحرير الكمية وتحرير سعر الشكارة يدوياً بالعداد الفخم */}
                    <div className="p-5 rounded-2xl bg-[#07132a] border border-[#1f2d4d] flex flex-col justify-between min-h-[160px] space-y-4 hover:border-[#D4AF37]/40 transition-all select-none">
                      <div className="text-right">
                        <span className="text-sm font-black text-[#D4AF37] block">أسمنت المرمات (شكارة)</span>
                        
                        {/* عداد تحرير سعر شكارة أسمنت المرمات يدوياً */}
                        <div className="flex items-center gap-1 mt-1.5 justify-between" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[11px] text-white">سعر الشكارة:</span>
                          <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-lg h-8 px-1 w-24">
                            <button type="button" onClick={() => handleRepairsChange({ repairsCementPrice: repairsCementPrice + 10 })} className="w-5 h-5 rounded bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-[9px] flex items-center justify-center cursor-pointer">+</button>
                            <span className="text-xs font-bold text-white font-mono">{repairsCementPrice}</span>
                            <button type="button" onClick={() => handleRepairsChange({ repairsCementPrice: Math.max(0, repairsCementPrice - 10) })} className="w-5 h-5 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-bold text-[9px] flex items-center justify-center cursor-pointer">-</button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-[#1f2d4d]/40 pt-3" dir="rtl" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs text-white font-semibold">الكمية:</span>
                        <div className="flex items-center bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-25" dir="ltr">
                          <button type="button" onClick={() => handleRepairsChange({ repairsCementQty: (repairsData.repairsCementQty || 0) + 1 })} className="w-7 h-7 rounded-lg bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">+</button>
                          <span className="text-base font-black text-white font-mono min-w-[24px] text-center">{repairsData.repairsCementQty || 0}</span>
                          <button type="button" onClick={() => handleRepairsChange({ repairsCementQty: Math.max(0, (repairsData.repairsCementQty || 0) - 1) })} className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">-</button>
                        </div>
                      </div>
                    </div>

                    {/* رمل المرمات - تحرير الكمية وتحرير سعر المتر يدوياً بالعداد الفخم */}
                    <div className="p-5 rounded-2xl bg-[#07132a] border border-[#1f2d4d] flex flex-col justify-between min-h-[160px] space-y-4 hover:border-[#D4AF37]/40 transition-all select-none">
                      <div className="text-right">
                        <span className="text-ms font-black text-[#D4AF37] block">رمل المرمات  (م³)</span>
                        
                        {/* عداد تحرير سعر متر رمل المرمات يدوياً */}
                        <div className="flex items-center gap-1 mt-1.5 justify-between" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[10px] text-white">سعر المتر:</span>
                          <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-lg h-8 px-1 w-24">
                            <button type="button" onClick={() => handleRepairsChange({ repairsSandPrice: repairsSandPrice + 25 })} className="w-5 h-5 rounded bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-[9px] flex items-center justify-center cursor-pointer">+</button>
                            <span className="text-xs font-bold text-white font-mono">{repairsSandPrice}</span>
                            <button type="button" onClick={() => handleRepairsChange({ repairsSandPrice: Math.max(0, repairsSandPrice - 25) })} className="w-5 h-5 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-bold text-[9px] flex items-center justify-center cursor-pointer">-</button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-[#1f2d4d]/40 pt-3" dir="rtl" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs text-white font-semibold">الكمية:</span>
                        <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 pr-2 pl-4 select-none w-30" dir="ltr">
                          <button type="button" onClick={() => handleRepairsChange({ repairsSandQty: Number(((repairsData.repairsSandQty || 0) + 0.25).toFixed(2)) })} className="w-7 h-7 rounded-lg bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">+</button>
                          <span className="text-base font-black text-white font-mono min-w-[24px] text-center">{repairsData.repairsSandQty || 0}</span>
                          <button type="button" onClick={() => handleRepairsChange({ repairsSandQty: Math.max(0, Number(((repairsData.repairsSandQty || 0) - 0.25).toFixed(2))) })} className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">-</button>
                        </div>
                      </div>
                    </div>

                    {/* جبس المرمات - تحرير الكمية وتحرير سعر الشكارة يدوياً بالعداد الفخم */}
                    <div className="p-5 rounded-2xl bg-[#07132a] border border-[#1f2d4d] flex flex-col justify-between min-h-[160px] space-y-4 hover:border-[#D4AF37]/40 transition-all select-none">
                      <div className="text-right">
                        <span className="text-sm font-black text-[#d4af37] block">جبس المرمات سريع الشك</span>
                        
                        {/* عداد تحرير سعر شكارة جبس المرمات يدوياً */}
                        <div className="flex items-center gap-1 mt-1.5 justify-between" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[11px] text-white">سعر الشكارة:</span>
                          <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-lg h-8 px-1 w-24">
                            <button type="button" onClick={() => handleRepairsChange({ repairsGypsumPrice: repairsGypsumPrice + 10 })} className="w-5 h-5 rounded bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-[9px] flex items-center justify-center cursor-pointer">+</button>
                            <span className="text-xs font-bold text-white font-mono">{repairsGypsumPrice}</span>
                            <button type="button" onClick={() => handleRepairsChange({ repairsGypsumPrice: Math.max(0, repairsGypsumPrice - 10) })} className="w-5 h-5 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-bold text-[9px] flex items-center justify-center cursor-pointer">-</button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-[#1f2d4d]/40 pt-3" dir="rtl" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs text-white font-semibold">الكمية:</span>
                        <div className="flex items-center bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-24" dir="ltr">
                          <button type="button" onClick={() => handleRepairsChange({ repairsGypsumQty: (repairsData.repairsGypsumQty || 0) + 1 })} className="w-7 h-7 rounded-lg bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">+</button>
                          <span className="text-base font-black text-white font-mono min-w-[24px] text-center">{repairsData.repairsGypsumQty || 0}</span>
                          <button type="button" onClick={() => handleRepairsChange({ repairsGypsumQty: Math.max(0, (repairsData.repairsGypsumQty || 0) - 1) })} className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">-</button>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* مصنعية المرمات */}
                <div className="p-6 rounded-2xl bg-[#020B1C] border border-[#1f2d4d] flex items-center justify-between hover:border-[#D4AF37]/40 transition-all select-none">
                  <div className="text-right">
                    <span className="text-sm font-black text-[#D4AF37] block">إجمالي أجور مصنعية المرمات </span>
                    <p className="text-xs text-white mt-2">معالجة تسكير الكهرباء ومعالجة شروخ الحوائط</p>
                  </div>
                  <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-44">
                    <button type="button" onClick={() => handleRepairsChange({ laborCost: (repairsData.laborCost || 0) + 100 })} className="w-7 h-7 rounded-lg bg-[#020B1C] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                    <span className="text-base font-black text-white font-mono">{(repairsData.laborCost || 0).toLocaleString()} <span className="text-[10px] text-gray-500 font-normal">ج</span></span>
                    <button type="button" onClick={() => handleRepairsChange({ laborCost: Math.max(0, (repairsData.laborCost || 0) - 100) })} className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                  </div>
                </div>

                {/* نقل وتشوين المرمات */}
                <div className="p-6 rounded-2xl bg-[#020B1C] border border-[#1f2d4d] flex items-center justify-between hover:border-[#D4AF37]/40 transition-all select-none">
                  <div className="text-right">
                    <span className="text-sm font-black text-[#D4AF37] block">تكاليف النقل والتشوين للمرمات </span>
                    <p className="text-xs text-white mt-1">تشوين الأسمنت والرمل والجبس بالونش أو الرفع اليدوي</p>
                  </div>
                  <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-44">
                    <button type="button" onClick={() => handleRepairsChange({ logisticsCost: (repairsData.logisticsCost || 0) + 50 })} className="w-7 h-7 rounded-lg bg-[#020B1C] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
                    <span className="text-base font-black text-white font-mono">{(repairsData.logisticsCost || 0).toLocaleString()} <span className="text-[10px] text-gray-500 font-normal">ج</span></span>
                    <button type="button" onClick={() => handleRepairsChange({ logisticsCost: Math.max(0, (repairsData.logisticsCost || 0) - 50) })} className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
                  </div>
                </div>

                {/* ملاحظات المرمات */}
                <div className="md:col-span-2 space-y-3 text-right">
                  <label className="text-lg font-bold text-[#D4AF37] border-b border-[#D4AF37] flex items-center gap-2">ملاحظات إضافية للمرمات والترميم :</label>
                  <textarea
                    value={repairsData.notes}
                    onChange={(e) => handleRepairsChange({ notes: e.target.value })}
                    className="w-full h-24 p-5 rounded-2xl bg-[#020B1C] border border-[#1f2d4d] text-[#F0E6D2] text-lg outline-none focus:border-[#D4AF37]"
                  />
                </div>

              </div>
            </div>
          </div>
        )}

        {/* 5. الملخص المالي التكيفي الموحد */}
        {/* 🌟 تم صياغة كارت الملخص المالي بالكامل ليتوافق بكسلياً مع شاشات التموضع المعتمدة للشركة */}
        <div className="p-5 rounded-xl bg-[#020B1C] border border-[#D4AF37]/30 shadow-[0_0_20px_rgba(212,175,55,0.05)] flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden font-alexandria">
          <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[#D4AF37]" />
          <div className="space-y-1 text-center sm:text-right pr-1 select-none">
            <h4 className="text-lg font-bold text-[#D4AF37]">الملخص المالي المعتمد بالـ BOQ لبند أعمال المحارة:</h4>
            <p className="text-xs text-white font-normal leading-relaxed max-w-2xl text-right">
              {state.enabled
                ? `تكامل مالي تام؛ كلفة المصنعية الإنشائية (${totalLaborCost.toLocaleString('en-US')} ج.م) لـ مساحة (${totalPlasterArea} م²) + كلفة خامات المونة والتأسيس والكماليات المحددة (${totalMaterialsCost.toLocaleString('en-US')} ج.م) + تشوين وتعتيق بالدور (${logisticsFlatCost.toLocaleString('en-US')} ج.م)`
                : state.isRepairsEnabled
                ? `نظام المرمات: كلفة مصنعيات وترميم (${(repairsData.laborCost || 0).toLocaleString('en-US')} ج.م) + كلفة خامات مون المرمات والجبس السريع (${repairsMaterialsCost.toLocaleString('en-US')} ج.م) + كلفة لوجستيات الشون ونقل المون (${(repairsData.logisticsCost || 0).toLocaleString('en-US')} ج.م)`
                : "برجاء تفعيل أحد أنظمة المحارة (إنشائي أو مرمات) لتظهر الحسابات حركياً"}
            </p>
          </div>
          <div className="flex items-center gap-3 bg-[#07132a] px-6 py-4 rounded-lg border border-[#1f2d4d]">
            <div className="p-1.5 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="text-right">
              <span className="text-[10px] text-white block font-semibold text-right">إجمالي تكلفة أعمال المحارة:</span>
              <span className="text-2xl font-black text-[#D4AF37] font-mono">
                {(state.enabled ? totalPlasterEstimate : state.isRepairsEnabled ? totalRepairsEstimate : 0).toLocaleString('en-US')}{' '}
                <span className="text-xs font-normal">ج.م</span>
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}