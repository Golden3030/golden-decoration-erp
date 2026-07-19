"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  FileText, 
  Check, 
  ChevronDown, 
  ClipboardList, 
  Home,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface CeilingTabProps {
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

interface DynamicRoomItem {
  id: string;
  name: string;
  areaSize: number;
}

export default function CeilingTab({ projectId }: CeilingTabProps) {
  const { crmData, updateBulkFinishingSection } = useCRM();

  const [dbSpecs, setDbSpecs] = useState<DBSpecification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [expandedSpaceId, setExpandedSpaceId] = useState<string | null>(null);

  const isLocalChange = useRef(false);

  const [state, setState] = useState({
    enabled: true,
    spacesConfig: {} as Record<string, { enabled: boolean; area: number; type: string }>,
    magneticTrack: 0,
    ledProfile: 0,
    shadowGap: 0,
    shadowGapLight: 0,
    notes: ''
  });

  const [notesInput, setNotesInput] = useState<string>('');

  const MAGNETIC_TRACK_RATE = 1500; 
  const LED_PROFILE_RATE = 350;     
  const SHADOW_GAP_RATE = 120;      
  const SHADOW_GAP_LIGHT_RATE = 240;

  const project = crmData?.project || {};
  const totalUnitArea = Number(project.area || 100);

  const CEILING_OPTIONS = useMemo(() => {
    if (!dbSpecs || dbSpecs.length === 0) {
      return [
        { code: 'flat_gypsum', title: 'سقف فلات مستوي', price: 220 },
        { code: 'light_pocket', title: 'فلات مع بيت نور / بيت ستارة', price: 280 },
        { code: 'decorative_cnc', title: 'أسقف ديكورية / سقف مشدود', price: 550 }
      ];
    }
    return dbSpecs.map(spec => ({
      code: spec.uuid || spec.code,
      title: spec.spec_name,
      price: Number(spec.base_rate) || 0
    }));
  }, [dbSpecs]);

  const defaultOptionCode = useMemo(() => {
    return CEILING_OPTIONS[0]?.code || 'light_pocket';
  }, [CEILING_OPTIONS]);

  const getDynamicRoomsList = useCallback((): DynamicRoomItem[] => {
    const list: DynamicRoomItem[] = [];
    const customValues = crmData?.finishing?.areas?.values || {};

    const bedroomsVal = Number(project.roomsCount || 2);
    const bathroomsVal = Number(project.bathroomsCount || 1);
    const receptionsVal = Number(project.receptionsCount || 1);
    const kitchensVal = Number(project.kitchensCount || 1);
    const balconiesVal = Number(project.balconiesCount || 1);
    const livingVal = Number(project.livingCount || 1);

    for (let i = 1; i <= receptionsVal; i++) {
      const key = receptionsVal === 1 ? 'الريسبشن الرئيسى' : `الريسبشن - قطعة ${i}`;
      const size = Number(customValues[key] || (i === 1 ? 30 : 20));
      list.push({ id: `custom_area_${key.replace(/\s+/g, '_')}`, name: key, areaSize: size });
    }

    for (let i = 1; i <= bedroomsVal; i++) {
      const key = i === 1 ? 'غرفة النوم الرئيسية' : `غرفة الأطفال ${i - 1}`;
      const size = Number(customValues[key] || (i === 1 ? 20 : i === 2 ? 12 : 10));
      list.push({ id: `custom_area_${key.replace(/\s+/g, '_')}`, name: key, areaSize: size });
    }

    for (let i = 1; i <= kitchensVal; i++) {
      const key = kitchensVal === 1 ? 'المطبخ الرئيسي' : `المطبخ الفرعي ${i}`;
      const size = Number(customValues[key] || 10);
      list.push({ id: `custom_area_${key.replace(/\s+/g, '_')}`, name: key, areaSize: size });
    }

    for (let i = 1; i <= bathroomsVal; i++) {
      const key = i === 1 ? 'الحمام الرئيسي' : i === 2 ? 'حمام ضيوف' : `الحمام الفرعي ${i}`;
      const size = Number(customValues[key] || (i === 1 ? 6 : 4));
      list.push({ id: `custom_area_${key.replace(/\s+/g, '_')}`, name: key, areaSize: size });
    }

    for (let i = 1; i <= balconiesVal; i++) {
      const key = balconiesVal === 1 ? 'البلكونة الرئيسية' : `البلكونة الفرعية ${i}`;
      const size = Number(customValues[key] || 5);
      list.push({ id: `custom_area_${key.replace(/\s+/g, '_')}`, name: key, areaSize: size });
    }

    for (let i = 1; i <= livingVal; i++) {
      const key = livingVal === 1 ? 'الليفنج الرئيسي' : `الليفنج - قطعة ${i}`;
      const size = Number(customValues[key] || 18);
      list.push({ id: `custom_area_${key.replace(/\s+/g, '_')}`, name: key, areaSize: size });
    }

    const hasCorridors = !!(
      (customValues["الطرقة الرئيسية"] && Number(customValues["الطرقة الرئيسية"]) > 0) || 
      (customValues["الطرقة الفرعية"] && Number(customValues["الطرقة الفرعية"]) > 0)
    );
    if (hasCorridors) {
      if (customValues["الطرقة الرئيسية"] && Number(customValues["الطرقة الرئيسية"]) > 0) {
        list.push({ id: `custom_area_الطرقة_الرئيسية`, name: "الطرقة الرئيسية", areaSize: Number(customValues["الطرقة الرئيسية"]) });
      }
      if (customValues["الطرقة الفرعية"] && Number(customValues["الطرقة الفرعية"]) > 0) {
        list.push({ id: `custom_area_الطرقة_الفرعية`, name: "الطرقة الفرعية", areaSize: Number(customValues["الطرقة الفرعية"]) });
      }
    }

    const hasGarden = !!(customValues["الحديقة / الجاردن"] && Number(customValues["الحديقة / الجاردن"]) > 0);
    if (hasGarden) {
      list.push({ id: `custom_area_الحديقة_/_الجاردن`, name: "الحديقة / الجاردن", areaSize: Number(customValues["الحديقة / الجاردن"]) });
    }

    return list;
  }, [crmData, project]);

  const activeRoomsList = useMemo(() => getDynamicRoomsList(), [getDynamicRoomsList]);

  useEffect(() => {
    const fetchCeilingSpecs = async () => {
      try {
        setLoading(true);
        const { data } = await supabase
          .from('specifications_library')
          .select('*')
          .eq('category', 'ceiling');

        if (data) setDbSpecs(data);
      } catch (err) {
        console.error("Error fetching specifications:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCeilingSpecs();
  }, []);

  useEffect(() => {
    if (activeRoomsList && activeRoomsList.length > 0) {
      const initialConfig: Record<string, { enabled: boolean; area: number; type: string }> = {};
      
      activeRoomsList.forEach((area: DynamicRoomItem) => {
        initialConfig[area.id] = {
          enabled: false, 
          area: area.areaSize || 15,
          type: defaultOptionCode
        };
      });

      const ceilingContext = crmData?.finishing?.ceiling || {};
      
      const savedSpaces = ceilingContext.spacesConfig || {};
      Object.keys(initialConfig).forEach((key) => {
        if (savedSpaces[key]) {
          initialConfig[key] = savedSpaces[key];
        } else {
          const matchedArea = activeRoomsList.find((a: DynamicRoomItem) => a.id === key);
          if (matchedArea) {
            initialConfig[key].area = matchedArea.areaSize;
          }
        }
      });

      isLocalChange.current = false;
      setState({
        enabled: ceilingContext.enabled ?? true,
        spacesConfig: initialConfig,
        magneticTrack: ceilingContext.magneticTrack ?? 0,
        ledProfile: ceilingContext.ledProfile ?? 0,
        shadowGap: ceilingContext.shadowGap ?? 0,
        shadowGapLight: ceilingContext.shadowGapLight ?? 0,
        notes: ceilingContext.notes ?? ''
      });
      setNotesInput(ceilingContext.notes ?? '');
    } else {
      isLocalChange.current = false;
      setState(prev => ({ ...prev, spacesConfig: {} }));
    }
  }, [crmData?.project, crmData?.finishing?.areas?.values, dbSpecs, activeRoomsList, defaultOptionCode]);

  useEffect(() => {
    if (isLocalChange.current) {
      updateBulkFinishingSection('ceiling', state);
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

  const handleSpaceConfigChange = (
    spaceId: string, 
    enabled: boolean, 
    area: number, 
    type: string
  ) => {
    updateStateAndSave(prev => ({
      spacesConfig: {
        ...prev.spacesConfig,
        [spaceId]: { enabled, area, type }
      }
    }));
  };

  const handleAccessoriesChange = (
    mTrack: number, 
    lProfile: number, 
    sGap: number, 
    sGapLight: number
  ) => {
    updateStateAndSave(prev => ({
      magneticTrack: mTrack,
      ledProfile: lProfile,
      shadowGap: sGap,
      shadowGapLight: sGapLight
    }));
  };

  const getExpandedSpaceSteps = (spaceId: string): string[] => {
    const config = state.spacesConfig[spaceId];
    if (!config) return [];
    const activeSpaceType = config.type;

    if (!dbSpecs || dbSpecs.length === 0) return [];
    
    const found = dbSpecs.find(s => s.code === activeSpaceType || s.uuid === activeSpaceType);
    return found ? found.steps : [];
  };

  const totalCeilingCost = useMemo(() => {
    return Object.entries(state.spacesConfig).reduce((sum, [id, config]) => {
      if (!config.enabled) return sum;
      const option = CEILING_OPTIONS.find(o => o.code === config.type);
      const rate = option ? option.price : 0;
      return sum + (config.area * rate);
    }, 0);
  }, [state.spacesConfig, CEILING_OPTIONS]);

  const totalAccessoriesCost = 
    (state.magneticTrack * MAGNETIC_TRACK_RATE) + 
    (state.ledProfile * LED_PROFILE_RATE) + 
    (state.shadowGap * SHADOW_GAP_RATE) + 
    (state.shadowGapLight * SHADOW_GAP_LIGHT_RATE);

  const totalCeilingEstimate = totalCeilingCost + totalAccessoriesCost;

  const totalCeilingArea = Object.values(state.spacesConfig).reduce((sum, item) => {
    return sum + (item.enabled ? item.area : 0);
  }, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        <p className="text-lg text-[#F0E6D2]">جاري مزامنة وبناء خريطة الأسقف الحركية لمساحات العميل...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in select-none font-alexandria text-right" dir="rtl">
      
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800;900&display=swap');
        
        .font-alexandria {
          font-family: 'Alexandria', Arial, sans-serif !important;
          letter-spacing: normal !important;
        }
      `}</style>

      {/* 🌟 تم استدعاء البار المنزلق اللمسي الموحد (TabActivationBanner) كبديل للبار الضخم القديم */}
      <TabActivationBanner 
        title="منظومة الأسقف المعلقة وأعمال الجبس بورد الحرة"
        subtitle="CEILING & GYPSUM BOARD SYSTEM"
        icon={Home}
        enabled={state.enabled}
        onToggle={() => { updateStateAndSave(prev => ({ enabled: !prev.enabled })); }}
      />

      <div className={`space-y-8 transition-opacity duration-300 ${state.enabled ? 'opacity-100' : 'opacity-25 pointer-events-none filter grayscale'}`}>

        <div className="space-y-4">
          <div className="flex items-center gap-2 p-2 border-r-4 border-[#D4AF37]">
            <Layers className="w-5 h-5 text-[#D4AF37] shrink-0" />
            <h4 className="text-xl font-bold text-[#D4AF37]">حصر اعمال السقف والجبس بورد:</h4>
          </div>

          <div className="space-y-4">
            {activeRoomsList && activeRoomsList.length > 0 ? (
              activeRoomsList.map((area: any) => {
                const config = state.spacesConfig[area.id] || { enabled: false, area: area.areaSize || 15, type: defaultOptionCode };
                const isExpanded = expandedSpaceId === area.id;
                
                return (
                  <div 
                    key={area.id}
                    onClick={() => {
                      const nextEnabled = !config.enabled;
                      handleSpaceConfigChange(area.id, nextEnabled, config.area, config.type);
                      if (!nextEnabled && isExpanded) setExpandedSpaceId(null);
                    }}
                    className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer select-none ${
                      config.enabled 
                        ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_15px_rgba(212,175,55,0.06)] hover:shadow-[0_0_25px_rgba(212,175,55,0.1)]' 
                        : 'border-[#1f2d4d] bg-[#020B1C]/40 hover:border-[#D4AF37]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4 text-center sm:text-right">
                        <div className={`p-3 rounded-full ${config.enabled ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.2)]' : 'bg-[#1f2d4d] text-[#D4AF37]'}`}>
                          <Home className="w-5 h-5" />
                        </div>
                        <div className="text-right">
                          <h5 className="text-md font-black text-[#D4AF37]">{area.name}</h5>
                          <p className="text-xs text-gray-500 mt-1">المساحة المحصورة للفراغ: {area.areaSize} م²</p>
                          <p className="text-xs text-white mt-0.5">الباقة المخصصة: {dbSpecs.find(o => o.uuid === config.type || o.code === config.type)?.spec_name || 'سقف فلات مستوي'} — {config.area} م²</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        
                        {/* 🎯 تعديل عداد مسطح الجبس بورد ليتطابق بكسلياً بالدواير الرشيقة w-6 h-6 وارتفاع h-11 مع دستور الـ ERP */}
                        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                          <span className="text-xs text-gray-400 font-bold block select-none">مسطح الجبس بورد:</span>
                          <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none min-w-[130px]" dir="ltr">
                            <button 
                              type="button" 
                              onClick={() => handleSpaceConfigChange(area.id, true, Math.max(0, config.area - 1), config.type)} 
                              className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-sm transition active:scale-90"
                            >
                              <Minus size={12} className="stroke-[3]" />
                            </button>
                            <span className="text-sm font-black text-[#D4AF37] font-mono min-w-[32px] text-center">{config.area} م²</span>
                            <button 
                              type="button" 
                              onClick={() => handleSpaceConfigChange(area.id, true, config.area + 1, config.type)} 
                              className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-sm transition active:scale-90"
                            >
                              <Plus size={12} className="stroke-[3]" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {config.enabled && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation(); 
                                setExpandedSpaceId(isExpanded ? null : area.id);
                              }}
                              className="px-2.5 py-1.5 rounded bg-black/60 border border-[#D4AF37]/45 text-[10px] font-black text-[#D4AF37] hover:border-[#D4AF37] flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>تخصيص الخامات</span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          )}

                          <div
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all min-w-[100px] text-center ${
                              config.enabled ? 'bg-[#D4AF37] text-[#020B1C]' : 'bg-[#1f2d4d] text-[#F0E6D2] border border-[#1f2d4d]'
                            }`}
                          >
                            {config.enabled ? 'مفعل بالمقايسة' : 'إدراج البند'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {config.enabled && isExpanded && (
                      <div 
                        onClick={(e) => e.stopPropagation()} 
                        className="mt-6 pt-6 border-t border-[#1f2d4d] space-y-6 animate-fade-in"
                      >
                        
                        <div className="space-y-2">
                          <span className="text-xs text-gray-500 font-semibold block text-right">اختر نوع سقف الجبس بورد لـ ({area.name}):</span>
                          <div className="flex flex-wrap gap-1.5 justify-start">
                            {dbSpecs.map((spec, specIdx) => {
                              const optionRate = CEILING_OPTIONS_MAP[spec.code] ?? spec.base_rate ?? 0;
                              return (
                                <button
                                  key={`${spec.uuid || spec.code}-opt-${specIdx}`}
                                  type="button"
                                  onClick={() => handleSpaceConfigChange(area.id, true, config.area, spec.code)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                    config.type === spec.code ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#D4AF37]' : 'bg-[#020B1C] border-[#1f2d4d] text-gray-400'
                                  }`}
                                >
                                  {spec.spec_name} ({optionRate} ج.م / م²)
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
              })
            ) : (
              <div className="p-8 rounded-2xl bg-[#020B1C] border border-[#1f2d4d] border-dashed text-center">
                <p className="text-lg text-gray-400 font-medium font-alexandria">لم يتم إدخال أو تفعيل أي غرف في المساحات بعد.</p>
                <p className="text-xs text-gray-500 mt-2 font-alexandria">يرجى تسجيل مساحات الوحدة "توزيع المساحات والـ Areas" أولاً لتظهر تلقائياً هنا.</p>
              </div>
            )}
          </div>
        </div>

        {/* 🎯 تعديل عدادات الأمتار الطولية للكماليات لتطابق بكسلياً بالدواير الرشيقة w-6 h-6 وارتفاع h-10 مع دستور الـ ERP */}
        <div className="p-8 rounded-3xl bg-gradient-to-br from-[#07132a] via-[#020B1C] to-[#07132a] border border-[#D4AF37] space-y-6">
          <div className="border-b border-[#D4AF37] pb-4 text-right select-none">
            <h4 className="text-xl font-bold text-[#D4AF37]">ادراج كماليات الإضاءة والإكسسوارات للأسقف:</h4>
            <p className="text-xs text-white mt-1">عناصر حصرية تدعم حوار المبيعات الترويجي وتثبت دقة حصر المقايسة والـ BOQ بالمتر الطولي</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* ماجنتك تراك */}
            <div className="p-5 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex flex-col justify-between min-h-[160px] space-y-4 shadow-md hover:border-[#D4AF37]/30 transition-all">
              <div className="text-right select-none font-bold">
                <span className="text-sm text-[#F0E6D2] block">ماجنتك تراك (Magnetic Track)</span>
                <span className="text-xs text-gray-500 mt-1 block font-semibold">التأسيس والمسار: {MAGNETIC_TRACK_RATE} ج.م / م.ط</span>
              </div>
              <div className="flex items-center justify-between border-t border-[#1f2d4d]/40 pt-3" dir="rtl">
                <span className="text-xs text-gray-400 font-semibold select-none">الكمية:</span>
                <div className="flex items-center bg-[#07132a] border border-[#1f2d4d] rounded-xl h-10 px-2 select-none" dir="ltr">
                  <button 
                    type="button" 
                    onClick={() => handleAccessoriesChange(Math.max(0, state.magneticTrack - 1), state.ledProfile, state.shadowGap, state.shadowGapLight)} 
                    className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                  >
                    <Minus size={12} className="stroke-[3]" />
                  </button>
                  <span className="text-sm font-black text-[#D4AF37] font-mono min-w-[20px] text-center">
                    {state.magneticTrack}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => handleAccessoriesChange(state.magneticTrack + 1, state.ledProfile, state.shadowGap, state.shadowGapLight)} 
                    className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                  >
                    <Plus size={12} className="stroke-[3]" />
                  </button>
                </div>
              </div>
            </div>

            {/* ليد بروفايل مدمج */}
            <div className="p-5 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex flex-col justify-between min-h-[160px] space-y-4 shadow-md hover:border-[#D4AF37]/30 transition-all">
              <div className="text-right select-none font-bold">
                <span className="text-sm text-[#F0E6D2] block">ليد بروفايل مدمج (Led Profile)</span>
                <span className="text-xs text-gray-500 mt-1 block font-semibold">التوريد والتركيب واللصق: {LED_PROFILE_RATE} ج.م /  م.ط</span>
              </div>
              <div className="flex items-center justify-between border-t border-[#1f2d4d]/40 pt-3" dir="rtl">
                <span className="text-xs text-gray-400 font-semibold select-none">الكمية:</span>
                <div className="flex items-center bg-[#07132a] border border-[#1f2d4d] rounded-xl h-10 px-2 select-none" dir="ltr">
                  <button 
                    type="button" 
                    onClick={() => handleAccessoriesChange(state.magneticTrack, Math.max(0, state.ledProfile - 1), state.shadowGap, state.shadowGapLight)} 
                    className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                  >
                    <Minus size={12} className="stroke-[3]" />
                  </button>
                  <span className="text-sm font-black text-[#D4AF37] font-mono min-w-[20px] text-center">
                    {state.ledProfile}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => handleAccessoriesChange(state.magneticTrack, state.ledProfile + 1, state.shadowGap, state.shadowGapLight)} 
                    className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                  >
                    <Plus size={12} className="stroke-[3]" />
                  </button>
                </div>
              </div>
            </div>

            {/* شادوجاب عادية */}
            <div className="p-5 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] hover:border-[#D4AF37]/30 transition-all flex flex-col justify-between min-h-[160px] space-y-4 shadow-md">
              <div className="text-right select-none font-bold">
                <span className="text-sm text-[#F0E6D2] block">شادوجاب عادية (Shadow Gap)</span>
                <span className="text-xs text-gray-500 mt-1 block font-semibold">فصل جداري مضاد للتشقق: {SHADOW_GAP_RATE} ج.م / م.ط</span>
              </div>
              <div className="flex items-center justify-between border-t border-[#1f2d4d]/40 pt-3" dir="rtl">
                <span className="text-xs text-gray-400 font-semibold select-none">الكمية:</span>
                <div className="flex items-center bg-[#07132a] border border-[#1f2d4d] rounded-xl h-10 px-2 select-none" dir="ltr">
                  <button 
                    type="button" 
                    onClick={() => handleAccessoriesChange(state.magneticTrack, state.ledProfile, Math.max(0, state.shadowGap - 2), state.shadowGapLight)} 
                    className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                  >
                    <Minus size={12} className="stroke-[3]" />
                  </button>
                  <span className="text-sm font-bold text-[#D4AF37] font-mono min-w-[24px] text-center">
                    {state.shadowGap}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => handleAccessoriesChange(state.magneticTrack, state.ledProfile, state.shadowGap + 2, state.shadowGapLight)} 
                    className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                  >
                    <Plus size={12} className="stroke-[3]" />
                  </button>
                </div>
              </div>
            </div>

            {/* شادوجاب ليد عائمة */}
            <div className="p-5 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] hover:border-[#D4AF37]/30 transition-all flex flex-col justify-between min-h-[160px] space-y-4 shadow-md">
              <div className="text-right select-none font-bold">
                <span className="text-sm text-[#F0E6D2] block">شادوجاب ليد عائمة (Shadow Gap Light)</span>
                <span className="text-xs text-gray-500 mt-1 block font-semibold">مجرى وفراغ الإنارة الأسفل: {SHADOW_GAP_LIGHT_RATE} ج.م / م.ط</span>
              </div>
              <div className="flex items-center justify-between border-t border-[#1f2d4d]/40 pt-3" dir="rtl">
                <span className="text-xs text-gray-400 font-semibold select-none">الكمية:</span>
                <div className="flex items-center bg-[#07132a] border border-[#1f2d4d] rounded-xl h-10 px-2 select-none" dir="ltr">
                  <button 
                    type="button" 
                    onClick={() => handleAccessoriesChange(state.magneticTrack, state.ledProfile, state.shadowGap, Math.max(0, state.shadowGapLight - 2))} 
                    className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                  >
                    <Minus size={12} className="stroke-[3]" />
                  </button>
                  <span className="text-sm font-bold text-[#D4AF37] font-mono min-w-[24px] text-center">
                    {state.shadowGapLight}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => handleAccessoriesChange(state.magneticTrack, state.ledProfile, state.shadowGap, state.shadowGapLight + 2)} 
                    className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                  >
                    <Plus size={12} className="stroke-[3]" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#07132a] border border-[#D4AF37] space-y-3">
          <div className="flex items-center gap-2 text-[#D4AF37] border-b border-[#D4AF37] pb-2 text-right">
            <FileText className="w-5 h-5" />
            <h4 className="text-xl font-bold text-[#D4AF37]">اتفاقات وبنود مخصصة للجبس بورد والأسقف المعلقة :</h4>
          </div>
          <textarea
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            onBlur={() => {
              updateStateAndSave(prev => ({ notes: notesInput }));
            }}
            placeholder="اكتب هنا أي تفاصيل، إضافات فتحات إنارة مخصصة، زوايا ظل، أو مواصفات صاج مستثناة تم الاتفاق عليها مع العميل لحفظها مباشرة بالعقد..."
            className="w-full h-24 p-4 rounded-xl bg-[#020B1C] border border-[#1f2d4d] hover:border-[#D4AF37]/50 focus:border-[#D4AF37] text-[#F0E6D2] placeholder-gray-500 outline-none transition-all resize-none text-base leading-relaxed text-right"
          />
          <div className="flex justify-between items-center text-xs text-gray-500 px-1 select-none">
            <span>يتم الحفظ تلقائياً بمجرد الخروج من حقل الكتابة</span>
            <span>حالة الاتصال: متصل </span>
          </div>
        </div>

        {/* 🌟 تم إعادة تصميم كارت الملخص المالي والتقدير المالي الإجمالي لبند الأسقف والجبس بورد ليطابق تماًاماً نمط التكييف والألوميتال المعتمد */}
        <div className="p-5 rounded-xl bg-[#020B1C] border border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.05)] flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[#D4AF37]" />
          
          <div className="space-y-1 text-center sm:text-right pr-1">
            <h4 className="text-lg font-bold text-[#D4AF37]">الملخص المالي المعتمد لبند الأسقف المعلقة والجبس بورد:</h4>
            <p className="text-xs text-white font-normal leading-relaxed max-w-2xl text-right">
              الحساب الإجمالي لبند الأسقف المفعّلة  ({totalCeilingArea} م²) ضرب التوصيف  لكل غرفة + تكلفة الأمتار المحصورة للكماليات والإكسسوارات الإجمالية ({totalAccessoriesCost.toLocaleString('en-US')} ج.م).
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#07132a] px-6 py-4 rounded-lg border border-[#1f2d4d]">
            <div className="p-1.5 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="text-right">
              <span className="text-[10px] text-white block">إجمالي التكلفة المقدرة للأسقف:</span>
              <span className="text-2xl font-black text-[#D4AF37] font-mono">
                {totalCeilingEstimate.toLocaleString('en-US')} <span className="text-xs font-normal">ج.م</span>
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

const CEILING_OPTIONS_MAP: Record<string, number> = {
  flat_gypsum: 220,
  light_pocket: 280,
  decorative_cnc: 550
};