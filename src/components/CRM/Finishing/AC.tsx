"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from "../context/CRMContext";
import { supabase } from '@/lib/supabaseClient'; 
import TabActivationBanner from './TabActivationBanner'; // 👈 استدعاء المكون الموحد المشترك للـ 13 تابة
import { 
  Zap, 
  Plus, 
  Minus, 
  Star, 
  DollarSign, 
  FileText, 
  Check, 
  ChevronDown, 
  ClipboardList, 
  Settings2, 
  Package,
  CheckCircle2,
  Lock,
  Home
} from 'lucide-react';

interface ACTabProps {
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
  base_rate: number; 
}

const DEFAULT_ACCESSORY_SPLIT: Record<string, { materials: number; labor: number }> = {
  drain: { materials: 500, labor: 300 },       
  bracket: { materials: 400, labor: 200 },     
  chiseling: { materials: 100, labor: 400 }    
};

export default function ACTab({ projectId }: ACTabProps) {
  const { crmData, updateBulkFinishingSection } = useCRM();

  const [dbSpecs, setDbSpecs] = useState<DBSpecification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // حالة واجهة المستخدم المحلية لتتبع الكارت المفتوح حالياً للتخصيص
  const [expandedSpaceId, setExpandedSpaceId] = useState<string | null>(null);
  
  // مرجع برامجي لمنع التحديث غير المتزامن وحظر الـ Infinite Loop في الـ context الأب
  const isLocalChange = useRef(false);

  // الكائن الموحد للتحكم في الحالة البرمجية الفاخرة والآمنة
  const [state, setState] = useState({
    enabled: true,
    rates: {} as Record<string, number>,
    spacesConfig: {} as Record<string, { enabled: boolean; type: string; area: number }>,
    hasDrain: true,
    hasBracket: true,
    hasChiseling: true,
    notes: ''
  });

  // حالة وسيطة لإدخال النصوص لمنع إرسال طلبات متعددة مع كل حرف يكتبه المستخدم
  const [notesInput, setNotesInput] = useState<string>('');

  const totalUnitArea = Number(crmData?.project?.area || 100);

  // حساب وجلب الغرف والقطع المتوفرة بالمشروع حيوياً مع دمج وحظر الجاردن الذكي والليفنج
  const getDynamicACRoomsList = () => {
    const list: Array<{ id: string; name: string; areaSize: number }> = [];
    const customAreasValues = crmData?.finishing?.areas?.values || {};
    
    const project = crmData?.project || {};
    const bedroomsVal = Number(project.roomsCount || 2);
    const receptionsVal = Number(project.receptionsCount || 1);
    const livingVal = Number(project.livingCount || 0);

    // 1. توليد حصر الريسبشنات المعتمد مع سحب المساحة الجارية
    for (let i = 1; i <= receptionsVal; i++) {
      const key = receptionsVal === 1 ? 'الريسبشن الرئيسى' : `الريسبشن - قطعة ${i}`;
      const label = receptionsVal === 1 ? 'الريسبشن الرئيسي للوحدة' : `الريسبشن - قطعة ${i}`;
      const savedSize = customAreasValues[key];
      list.push({
        id: `ac_area_${key.replace(/\s+/g, '_')}`,
        name: label,
        areaSize: savedSize ? Number(savedSize) : (i === 1 ? 30 : 20)
      });
    }

    // 2. توليد حصر غرف النوم وغرف الأطفال بدقة متناهية مطابقة للمساحات
    for (let i = 1; i <= bedroomsVal; i++) {
      const key = i === 1 ? 'غرفة النوم الرئيسية' : `غرفة الأطفال ${i - 1}`;
      const label = i === 1 ? 'غرفة النوم الرئيسية (الماستر)' : `غرفة الأطفال ${i - 1}`;
      const savedSize = customAreasValues[key];
      list.push({
        id: `ac_area_${key.replace(/\s+/g, '_')}`,
        name: label,
        areaSize: savedSize ? Number(savedSize) : (i === 1 ? 20 : i === 2 ? 12 : 10)
      });
    }

    // 3. توليد وحقن غرف المعيشة (الليفنج) بالأسماء الصحيحة المتطابقة
    for (let i = 1; i <= livingVal; i++) {
      const key = livingVal === 1 ? 'الليفنج الرئيسي' : `الليفنج - قطعة ${i}`;
      const label = livingVal === 1 ? 'غرفة المعيشة الرئيسية (ليفنج)' : `غرفة المعيشة (ليفنج) - قطعة ${i}`;
      const savedSize = customAreasValues[key];
      list.push({
        id: `ac_area_${key.replace(/\s+/g, '_')}`,
        name: label,
        areaSize: savedSize ? Number(savedSize) : 18
      });
    }

    // 4. الحديقة / الجاردن المفتوحة (تدرج حركياً فقط في حال وجود جاردن فعلي بالوحدة)
    const hasGardenInProject = !!(project.gardenExist && Number(project.gardenArea) > 0);
    const gardenAreaInAreas = Number(customAreasValues["الحديقة / الجاردن"] || 0);
    const hasGardenInAreas = gardenAreaInAreas > 0;

    if (hasGardenInProject || hasGardenInAreas) {
      const gardenArea = gardenAreaInAreas || Number(project.gardenArea || 30);
      list.push({
        id: `ac_garden`,
        name: "الحديقة / الجاردن المفتوحة (اللاندسكيب)",
        areaSize: gardenArea
      });
    }

    return list;
  };

  const activeRoomsList = getDynamicACRoomsList();

  // جلب البيانات الأساسية من مكتبة المواصفات
  useEffect(() => {
    const fetchACSpecs = async () => {
      try {
        setLoading(true);
        const { data } = await supabase
          .from('specifications_library')
          .select('*')
          .eq('category', 'ac');

        if (data) {
          setDbSpecs(data as DBSpecification[]);
        }
      } catch (err) {
        console.error("خطأ جلب مكتبة مواصفات التكييف:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchACSpecs();
  }, []);

  // دمج وتحميل البيانات المحفوظة من الـ CRM
  useEffect(() => {
    if (dbSpecs && dbSpecs.length > 0 && activeRoomsList && activeRoomsList.length > 0) {
      const defaultTypeCode = dbSpecs[0]?.code || '';
      const initialConfig: Record<string, { enabled: boolean; type: string; area: number }> = {};
      
      activeRoomsList.forEach((area) => {
        initialConfig[area.id] = {
          enabled: false, 
          type: defaultTypeCode,
          area: area.areaSize || 15
        };
      });

      const acContext = crmData?.finishing?.ac || {};
      
      const loadedRates: Record<string, number> = {};
      
      dbSpecs.forEach(spec => {
        loadedRates[spec.code] = Number(spec.base_rate || 0);
      });

      loadedRates['drain_materials'] = DEFAULT_ACCESSORY_SPLIT.drain.materials;
      loadedRates['drain_labor'] = DEFAULT_ACCESSORY_SPLIT.drain.labor;

      loadedRates['bracket_materials'] = DEFAULT_ACCESSORY_SPLIT.bracket.materials;
      loadedRates['bracket_labor'] = DEFAULT_ACCESSORY_SPLIT.bracket.labor;

      loadedRates['chiseling_materials'] = DEFAULT_ACCESSORY_SPLIT.chiseling.materials;
      loadedRates['chiseling_labor'] = DEFAULT_ACCESSORY_SPLIT.chiseling.labor;

      if (acContext.rates) {
        Object.keys(acContext.rates).forEach(key => {
          loadedRates[key] = Number(acContext.rates[key]);
        });
      }

      if (acContext.spacesConfig) {
        const savedSpaces = acContext.spacesConfig;
        Object.keys(initialConfig).forEach((key) => {
          if (savedSpaces[key]) {
            initialConfig[key] = savedSpaces[key];
          }
        });
      }

      isLocalChange.current = false;
      setState({
        enabled: acContext.enabled ?? true,
        notes: acContext.notes ?? '',
        hasDrain: acContext.hasDrain ?? true,
        hasBracket: acContext.hasBracket ?? true,
        hasChiseling: acContext.hasChiseling ?? true,
        rates: loadedRates,
        spacesConfig: initialConfig
      });
      setNotesInput(acContext.notes ?? '');
    }
  }, [crmData?.project, crmData?.finishing?.areas?.values, dbSpecs]);

  // تحديث وحفظ البيانات تلقائياً في قاعدة البيانات فور تغيير الـ state
  useEffect(() => {
    if (isLocalChange.current) {
      updateBulkFinishingSection('ac', state);
      isLocalChange.current = false;
    }
  }, [state]);

  // الدالة البرمجية لتحديث الحالة المحلية مع التزامن الفوري
  const updateStateAndSave = (updater: (prev: typeof state) => Partial<typeof state>) => {
    setIsSaving(true);
    isLocalChange.current = true;
    setState(prev => {
      const updates = updater(prev);
      return { ...prev, ...updates };
    });
    setIsSaving(false);
  };

  const handleSpaceConfigChange = (spaceId: string, enabled: boolean, type: string, area?: number) => {
    updateStateAndSave(prev => {
      const existing = prev.spacesConfig[spaceId];
      return {
        spacesConfig: {
          ...prev.spacesConfig,
          [spaceId]: { enabled, type, area: area !== undefined ? area : (existing?.area ?? 15) }
        }
      };
    });
  };

  const handleRateAdjustment = (rateKey: string, step: number) => {
    updateStateAndSave(prev => {
      const currentPrice = prev.rates[rateKey] ?? 0;
      const nextPrice = Math.max(0, currentPrice + step);
      return {
        rates: {
          ...prev.rates,
          [rateKey]: nextPrice
        }
      };
    });
  };

  const getExpandedSpaceSteps = (spaceId: string): string[] => {
    const config = state.spacesConfig[spaceId];
    if (!config) return [];
    const activeSpaceType = config.type;

    const found = dbSpecs.find(s => s.code === activeSpaceType);
    return found ? found.steps : [];
  };

  // العمليات الحسابية لبنود التأسيس والكماليات المفتوحة
  const totalACPoints = Object.values(state.spacesConfig).filter(item => item.enabled).length;

  const totalACBaseCost = Object.entries(state.spacesConfig).reduce((sum, [id, config]) => {
    if (!config.enabled) return sum;
    const rate = state.rates[config.type] ?? 0;
    const area = config.area ?? 15;
    return sum + (area * rate);
  }, 0);

  const drainMat = state.rates.drain_materials ?? DEFAULT_ACCESSORY_SPLIT.drain.materials;
  const drainLab = state.rates.drain_labor ?? DEFAULT_ACCESSORY_SPLIT.drain.labor;
  
  const bracketMat = state.rates.bracket_materials ?? DEFAULT_ACCESSORY_SPLIT.bracket.materials;
  const bracketLab = state.rates.bracket_labor ?? DEFAULT_ACCESSORY_SPLIT.bracket.labor;

  const chiselMat = state.rates.chiseling_materials ?? DEFAULT_ACCESSORY_SPLIT.chiseling.materials;
  const chiselLab = state.rates.chiseling_labor ?? DEFAULT_ACCESSORY_SPLIT.chiseling.labor;

  const totalDrainCost = state.hasDrain ? (totalACPoints * (drainMat + drainLab)) : 0;
  const totalBracketCost = state.hasBracket ? (totalACPoints * (bracketMat + bracketLab)) : 0;
  const totalChiselingCost = state.hasChiseling ? (totalACPoints * (chiselMat + chiselLab)) : 0;

  const totalAccessoriesCost = totalDrainCost + totalBracketCost + totalChiselingCost;
  const totalACEstimate = totalACBaseCost + totalAccessoriesCost;

  // رندرة وتصفية الكروت النشطة فقط المحددة ببوابة الاختيار العلوية لتقليل زحام الواجهة
  const enabledRooms = activeRoomsList.filter(area => {
    const config = state.spacesConfig[area.id];
    return config && config.enabled;
  });

  if (loading) {
    return (
      <div className="p-12 text-center text-[#D4AF37] font-bold text-lg animate-pulse">
        جاري جلب البنود والأسعار المعتمدة من شاشة الخامات سحابياً...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-base font-alexandria" dir="rtl">
      
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800;900&display=swap');
        
        .font-alexandria {
          font-family: 'Alexandria', Arial, sans-serif !important;
          letter-spacing: normal !important;
        }
      `}</style>

      {/* 🌟 تم استدعاء المكون الموحد الفاخر والرشيق بسطر برمجي واحد ومطابقته لجميع التابات */}
      <TabActivationBanner 
        title="منظومة أعمال تأسيس ومواسير التكييف"
        subtitle="AC Installation ERP System"
        icon={Zap}
        enabled={state.enabled}
        onToggle={() => { updateStateAndSave(prev => ({ enabled: !prev.enabled })); }}
      />

      {state.enabled && (
        <div className="space-y-6 animate-fade-in">

          {/* 🌳 بوابة تحديد الغرف والمساحات المفتوحة المستوردة (Checklist Selector) لتخصيص نقاط التكييف بدقة */}
          <div className="p-6 rounded-3xl bg-[#07132a] border border-[#D4AF37]/20 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#1f2d4d] pb-3 select-none">
              <ClipboardList className="w-5 h-5 text-[#D4AF37]" />
              <h4 className="text-sm font-black text-[#D4AF37]">بوابة تحديد الغرف والمساحات المشمولة بتأسيس التكييف (المساحات النشطة)</h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 select-none">
              {activeRoomsList.map((area) => {
                const config = state.spacesConfig[area.id] || { enabled: false, type: dbSpecs[0]?.code || '', area: area.areaSize || 15 };
                return (
                  <button
                    key={`ac-chk-room-${area.id}`}
                    type="button"
                    onClick={() => {
                      const nextEnabled = !config.enabled;
                      handleSpaceConfigChange(area.id, nextEnabled, config.type, config.area);
                    }}
                    className={`p-3 rounded-xl border-2 transition-all duration-300 flex items-center justify-between gap-3 text-right cursor-pointer text-xs font-bold leading-normal ${
                      config.enabled 
                        ? 'bg-black border-[#D4AF37] text-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.2)]' 
                        : 'bg-[#020B1C]/60 border-[#1f2d4d] text-gray-500 hover:border-[#D4AF37]/30 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{area.name}</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                      config.enabled ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-gray-500 bg-transparent'
                    }`}>
                      {config.enabled && <Check className="w-2.5 h-2.5 text-[#020B1C] stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* لوحة تحرير أسعار ومصنعيات التأسيس - بتصميم فاخر وعدادات مذهبة حصرية */}
          <div className="p-6 rounded-3xl bg-[#07132a] border border-[#1f2d4d] space-y-6">
            <div className="border-b border-[#1f2d4d] pb-4 flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
                <Settings2 className="w-6 h-6" />
              </div>
              <div className="text-right">
                <h4 className="text-lg font-black text-[#D4AF37]">لوحة تحرير وموازنة أسعار ومصنعيات تأسيس النحاس</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  الأسعار القياسية المعتمدة بمكتبة التوصيفات الفنية للتمديد
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {dbSpecs.map((spec, idx) => {
                const currentPrice = state.rates[spec.code] ?? Number(spec.base_rate || 0);
                return (
                  <div 
                    key={spec.uuid || spec.code || `ac-rate-ctrl-${idx}`}
                    className="p-5 rounded-2xl border border-[#1f2d4d] bg-[#020B1C]/40 hover:border-[#D4AF37]/40 hover:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all duration-300 flex flex-col justify-between gap-4"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="text-right">
                        <span className="text-sm font-bold text-[#F0E6D2] block">{spec.spec_name}</span>
                        <p className="text-[11px] text-gray-500 mt-2 leading-relaxed line-clamp-2">
                          {spec.description || 'توصيف فني معتمد بمكتبة الخامات السحابية للمشروع.'}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] flex-shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-[#1f2d4d]/60 pt-3">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">سعر المتر المعتمد</span>
                      
                      {/* عداد مالي مذهب للتحكم الفوري بالأسعار مع الإنقاص الأحمر التحذيري */}
                      <div className="flex items-center gap-3 select-none">
                        <button
                          type="button"
                          onClick={() => handleRateAdjustment(spec.code, 100)}
                          className="w-8 h-8 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black flex items-center justify-center font-bold cursor-pointer transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <span className="text-lg font-black text-[#D4AF37] font-mono min-w-[80px] text-center">
                          {currentPrice.toLocaleString()}
                          <span className="text-xs text-gray-500 font-normal mr-1">ج.م</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRateAdjustment(spec.code, -100)}
                          className="w-8 h-8 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center font-bold cursor-pointer transition-all"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* فضاءات وتخصيص نقاط الغرف والصالات المفعلة فقط */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 p-1 border-r-4 border-[#D4AF37] mr-2">
              <span className="text-base">💎</span>
              <h4 className="text-base font-black text-[#F0E6D2]">تعديل أمتار النحاس وتخصيص الباقات للمساحات المفعلة:</h4>
            </div>

            <div className="space-y-3">
              {enabledRooms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {enabledRooms.map((area: any) => {
                    const config = state.spacesConfig[area.id];
                    const isExpanded = expandedSpaceId === area.id;
                    const currentRate = state.rates[config.type] ?? 0;
                    
                    return (
                      <div 
                        key={area.id}
                        className="p-5 rounded-2xl border border-[#D4AF37] bg-gradient-to-r from-[#07132a] to-[#D4AF37]/5 shadow-[0_0_15px_rgba(212,175,55,0.06)] hover:border-[#D4AF37] transition-all duration-300 flex flex-col justify-between space-y-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-full bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                              <Home className="w-5 h-5" />
                            </div>
                            <div className="text-right">
                              {/* 🌟 تم تلوين اسم الغرفة بالذهب الإمبراطوري وزيادة التباعد الرأسي وتلوين الفاصل بالذهبي */}
                              <h5 className="text-sm text-[#D4AF37] font-black leading-tight">{area.name}</h5>
                              <p className="text-[10px] text-[#F0E6D2]/60 mt-3.5 font-bold">
                                المقترحة بالمساحات: {area.areaSize} م² — {config.area} متر × {currentRate.toLocaleString('en-US')} ج.م = {((config.area ?? 15) * currentRate).toLocaleString('en-US')} ج.م
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* العداد المذهب h-11 مع خط الفاصل المطلي بالذهب الإمبراطوري */}
                        <div className="pt-3 border-t border-[#D4AF37]/30 flex items-center justify-between gap-2.5">
                          <button
                            type="button"
                            onClick={() => setExpandedSpaceId(isExpanded ? null : area.id)}
                            className="px-2.5 py-1.5 rounded bg-black/60 border border-[#D4AF37]/45 text-[10px] font-black text-[#D4AF37] hover:border-[#D4AF37] flex items-center gap-1 cursor-pointer"
                          >
                            <span>تخصيص الخامات</span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>

                          <div className="flex items-center justify-center gap-2.5 bg-[#020B1C] border border-[#1f2d4d] rounded-xl px-2 py-1 select-none h-11" dir="ltr">
                            <button
                              type="button"
                              onClick={() => handleSpaceConfigChange(area.id, true, config.type, (config.area ?? 15) + 1)}
                              className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-black text-[#D4AF37] font-mono min-w-[20px] text-center">{config.area ?? 15}</span>
                            <button
                              type="button"
                              onClick={() => handleSpaceConfigChange(area.id, true, config.type, Math.max(1, (config.area ?? 15) - 1))}
                              className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                            >
                              <Minus size={12} className="stroke-[3]" />
                            </button>
                            <span className="text-[10px] text-gray-500 font-bold px-1 select-none">متر</span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="pt-3 border-t border-[#1f2d4d]/60 space-y-3 animate-fade-in">
                            <div className="space-y-1 text-right">
                              <span className="text-[10px] text-gray-500 font-semibold block">اختر نوع وتوصيف مواسير النحاس:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {dbSpecs.map((spec, specIdx) => {
                                  const optionRate = state.rates[spec.code] ?? Number(spec.base_rate || 0);
                                  return (
                                    <button
                                      key={`${spec.uuid || spec.code}-opt-${specIdx}`}
                                      type="button"
                                      onClick={() => handleSpaceConfigChange(area.id, true, spec.code, config.area)}
                                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all border cursor-pointer ${
                                        config.type === spec.code ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#D4AF37]' : 'bg-[#020B1C] border-[#1f2d4d] text-gray-400'
                                      }`}
                                    >
                                      {spec.spec_name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {getExpandedSpaceSteps(area.id).length > 0 && (
                              <div className="p-2.5 rounded bg-[#020B1C] border border-[#1f2d4d]/60 space-y-1.5 text-right">
                                <span className="text-[10px] text-[#D4AF37] font-bold block flex items-center gap-1 select-none">
                                  <ClipboardList className="w-3.5 h-3.5 text-[#D4AF37]" />
                                  خطوات الفحص والاستلام الفني للغرفة:
                                </span>
                                <div className="space-y-1 text-right">
                                  {getExpandedSpaceSteps(area.id).map((stepText, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-1.5 bg-[#07132a] border border-[#1f2d4d]/40 rounded text-right gap-2">
                                      <p className="text-[10px] text-[#F0E6D2]/80 leading-normal flex-1">{stepText}</p>
                                      <div className="w-4 h-4 rounded-full bg-black/60 border border-[#D4AF37] text-[#D4AF37] flex items-center justify-center font-bold text-[8px] shrink-0">{idx + 1}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center text-[#F0E6D2]/45 text-xs font-semibold border-2 border-dashed border-[#1f2d4d] rounded-xl bg-[#020B1C]/40 select-none">
                  ⚠️ يرجى تفعيل واختيار الغرف المطلوب تمديد تكييفات لها من بوابة التحديد بالأعلى أولاً.
                </div>
              )}
            </div>
          </div>

          {/* حزمة الكماليات وخدمات التأسيس التكميلية */}
          <div className="p-6 rounded-2xl bg-[#07132a] border border-[#1f2d4d] space-y-4">
            <div className="border-b border-[#1f2d4d] pb-3 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
                <Star className="w-5 h-5" />
              </div>
              <div className="text-right">
                <h4 className="text-lg font-bold text-[#D4AF37]">حزمة الخدمات التكميلية وكماليات تأسيس التكييف المزدوجة</h4>
                <p className="text-xs text-gray-400 mt-0.5">الكماليات والإكسسوارات تحتسب تراكمياً ومفككة حسب نوعية البند لـ {totalACPoints} نقاط نشطة</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* 1. كارت تأسيس شبكة صرف مياه تكييف */}
              <div 
                onClick={() => {
                  updateStateAndSave(prev => ({ hasDrain: !prev.hasDrain }));
                }}
                className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                  state.hasDrain 
                    ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_12px_rgba(212,175,55,0.05)]' 
                    : 'border-[#1f2d4d] bg-[#020B1C]/40 hover:border-[#D4AF37]/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-right">
                    <span className="text-sm font-bold text-[#F0E6D2] block">تأسيس شبكة صرف مياه التكييف</span>
                    <span className="text-[11px] text-[#D4AF37] block mt-0.5 font-semibold">
                      إجمالي الفئة: {((drainMat + drainLab) * totalACPoints).toLocaleString('en-US')} ج.م
                    </span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    state.hasDrain ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-gray-500 bg-transparent'
                  }`}>
                    {state.hasDrain && <Check className="w-3 h-3 text-[#020B1C] stroke-[3]" />}
                  </div>
                </div>

                {state.hasDrain && (
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#1f2d4d]/60">
                    <div className="flex flex-col items-center p-2 rounded-lg bg-[#020B1C]/60 border border-[#1f2d4d]/40">
                      <span className="text-[10px] text-gray-400 font-semibold mb-1">الخامات</span>
                      
                      {/* عداد خامات صرف التكييف الفاخر الموحد */}
                      <div className="flex items-center gap-3 select-none" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleRateAdjustment('drain_materials', 50)}
                          className="w-8 h-8 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black flex items-center justify-center font-bold cursor-pointer transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-bold text-[#D4AF37] font-mono min-w-[40px] text-center">
                          {drainMat}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRateAdjustment('drain_materials', -50)}
                          className="w-8 h-8 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center font-bold cursor-pointer transition-all"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col items-center p-2 rounded-lg bg-[#020B1C]/60 border border-[#1f2d4d]/40">
                      <span className="text-[10px] text-gray-400 font-semibold mb-1">المصنعية</span>
                      
                      {/* عداد مصنعية صرف التكييف الفاخر الموحد */}
                      <div className="flex items-center gap-3 select-none" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleRateAdjustment('drain_labor', 50)}
                          className="w-8 h-8 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black flex items-center justify-center font-bold cursor-pointer transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-bold text-[#D4AF37] font-mono min-w-[40px] text-center">
                          {drainLab}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRateAdjustment('drain_labor', -50)}
                          className="w-8 h-8 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center font-bold cursor-pointer transition-all"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. كارت حامل خارجي للوحدات (كابولي) */}
              <div 
                onClick={() => {
                  updateStateAndSave(prev => ({ hasBracket: !prev.hasBracket }));
                }}
                className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                  state.hasBracket 
                    ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_12px_rgba(212,175,55,0.05)]' 
                    : 'border-[#1f2d4d] bg-[#020B1C]/40 hover:border-[#D4AF37]/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-right">
                    <span className="text-sm font-bold text-[#F0E6D2] block">حامل خارجي للوحدات (كابولي)</span>
                    <span className="text-[11px] text-[#D4AF37] block mt-0.5 font-semibold">
                      إجمالي الفئة: {((bracketMat + bracketLab) * totalACPoints).toLocaleString('en-US')} ج.م
                    </span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    state.hasBracket ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-gray-500 bg-transparent'
                  }`}>
                    {state.hasBracket && <Check className="w-3 h-3 text-[#020B1C] stroke-[3]" />}
                  </div>
                </div>

                {state.hasBracket && (
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#1f2d4d]/60">
                    <div className="flex flex-col items-center p-2 rounded-lg bg-[#020B1C]/60 border border-[#1f2d4d]/40">
                      <span className="text-[10px] text-gray-400 font-semibold mb-1">الخامات</span>
                      
                      {/* عداد خامات الكوابيل الفاخر الموحد */}
                      <div className="flex items-center gap-3 select-none" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleRateAdjustment('bracket_materials', 50)}
                          className="w-8 h-8 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black flex items-center justify-center font-bold cursor-pointer transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-bold text-[#D4AF37] font-mono min-w-[40px] text-center">
                          {bracketMat}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRateAdjustment('bracket_materials', -50)}
                          className="w-8 h-8 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center font-bold cursor-pointer transition-all"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col items-center p-2 rounded-lg bg-[#020B1C]/60 border border-[#1f2d4d]/40">
                      <span className="text-[10px] text-gray-400 font-semibold mb-1">المصنعية</span>
                      
                      {/* عداد مصنعية الكوابيل الفاخر الموحد */}
                      <div className="flex items-center gap-3 select-none" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleRateAdjustment('bracket_labor', 50)}
                          className="w-8 h-8 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black flex items-center justify-center font-bold cursor-pointer transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-bold text-[#D4AF37] font-mono min-w-[40px] text-center">
                          {bracketLab}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRateAdjustment('bracket_labor', -50)}
                          className="w-8 h-8 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center font-bold cursor-pointer transition-all"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. كارت أعمال الشق والترميم للمسارات */}
              <div 
                onClick={() => {
                  updateStateAndSave(prev => ({ hasChiseling: !prev.hasChiseling }));
                }}
                className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                  state.hasChiseling 
                    ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_12px_rgba(212,175,55,0.05)]' 
                    : 'border-[#1f2d4d] bg-[#020B1C]/40 hover:border-[#D4AF37]/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-right">
                    <span className="text-sm font-bold text-[#F0E6D2] block">أعمال الشق والترميم للمسارات</span>
                    <span className="text-[11px] text-[#D4AF37] block mt-0.5 font-semibold">
                      إجمالي الفئة: {((chiselMat + chiselLab) * totalACPoints).toLocaleString('en-US')} ج.م
                    </span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    state.hasChiseling ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-gray-500 bg-transparent'
                  }`}>
                    {state.hasChiseling && <Check className="w-3 h-3 text-[#020B1C] stroke-[3]" />}
                  </div>
                </div>

                {state.hasChiseling && (
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#1f2d4d]/60">
                    <div className="flex flex-col items-center p-2 rounded-lg bg-[#020B1C]/60 border border-[#1f2d4d]/40">
                      <span className="text-[10px] text-gray-400 font-semibold mb-1">الخامات</span>
                      
                      {/* عداد خامات التفتيح والترميم الفاخر الموحد */}
                      <div className="flex items-center gap-3 select-none" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleRateAdjustment('chiseling_materials', 50)}
                          className="w-8 h-8 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black flex items-center justify-center font-bold cursor-pointer transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-bold text-[#D4AF37] font-mono min-w-[40px] text-center">
                          {chiselMat}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRateAdjustment('chiseling_materials', -50)}
                          className="w-8 h-8 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center font-bold cursor-pointer transition-all"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col items-center p-2 rounded-lg bg-[#020B1C]/60 border border-[#1f2d4d]/40">
                      <span className="text-[10px] text-gray-400 font-semibold mb-1">المصنعية</span>
                      
                      {/* عداد مصنعية التفتيح والترميم الفاخر الموحد */}
                      <div className="flex items-center gap-3 select-none" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleRateAdjustment('chiseling_labor', 50)}
                          className="w-8 h-8 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black flex items-center justify-center font-bold cursor-pointer transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-bold text-[#D4AF37] font-mono min-w-[40px] text-center">
                          {chiselLab}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRateAdjustment('chiseling_labor', -50)}
                          className="w-8 h-8 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center font-bold cursor-pointer transition-all"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* صندوق الملاحظات النصية المدمج */}
          <div className="p-5 rounded-xl bg-[#07132a] border border-[#1f2d4d] space-y-2">
            <div className="flex items-center gap-2 text-[#D4AF37] border-b border-[#1f2d4d] pb-1.5">
              <FileText className="w-4 h-4" />
              <h4 className="text-sm font-bold">اتفاقات وبنود مخصصة لأعمال وتمديدات التكييفات (ملاحظات العقد):</h4>
            </div>
            <textarea
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              onBlur={() => {
                updateStateAndSave(prev => ({ notes: notesInput }));
              }}
              placeholder="اكتب هنا أي تفاصيل مخصصة، نوع عزل أرموفليكس لمواسير النحاس، أقطار تمديد الصرف الأبيض الشريف، أو ماركات حوامل مستثناء تم الاتفاق عليها مع العميل لحفظها مباشرة بالعقد..."
              className="w-full h-20 p-3 rounded-lg bg-[#020B1C] border border-[#1f2d4d] hover:border-[#D4AF37]/50 focus:border-[#D4AF37] text-[#F0E6D2] placeholder-gray-500 outline-none transition-all resize-none text-sm leading-relaxed"
            />
            <div className="flex justify-between items-center text-[10px] text-gray-500 px-1">
              <span>يتم الحفظ تلقائياً بمجرد الخروج من حقل الكتابة</span>
              <span>حالة الاتصال: متصل وسحابي</span>
            </div>
          </div>

          {/* كارت الملخص المالي النهائي المدمج والفخم */}
          <div className="p-5 rounded-xl bg-[#020B1C] border border-[#D4AF37]/30 shadow-[0_0_20px_rgba(212,175,55,0.05)] flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[#D4AF37]" />
            <div className="space-y-1 text-center sm:text-right pr-1">
              <h4 className="text-lg font-bold text-[#D4AF37]">الملخص المالي المعتمد لبند تمديد نحاس وتأسيس التكييفات:</h4>
              <p className="text-xs text-gray-400 font-normal leading-relaxed max-w-2xl">
                عدد نقاط التأسيس المفعّلة ({totalACPoints} نقاط).
                tتشتمل على تكلفة التأسيس الأساسي محسوبة على أساس عدد أمتار كل غرفة × سعر المتر المعتمد ({totalACBaseCost.toLocaleString('en-US')} ج.م)
                بالإضافة إلى إجمالي تكلفة الكماليات والخدمات المساعدة ({totalAccessoriesCost.toLocaleString('en-US')} ج.م) مفككة إلى خامات ومصنعيات.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-[#07132a] px-6 py-4 rounded-lg border border-[#1f2d4d]">
              <div className="p-1.5 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
                <DollarSign className="w-6 h-6" />
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-500 block font-semibold">إجمالي التأسيس والكماليات:</span>
                <span className="text-2xl font-black text-[#F0E6D2] font-mono">
                  {totalACEstimate.toLocaleString('en-US')} <span className="text-xs font-normal">ج.م</span>
                </span>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}