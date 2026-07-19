"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from "../context/CRMContext";
import { supabase } from '@/lib/supabaseClient'; 
import TabActivationBanner from './TabActivationBanner'; // 👈 استدعاء المكون المشترك الموحد للأجهزة اللمسية للشركة
import { 
  Layers, 
  FileText, 
  Lock, 
  Key, 
  DollarSign, 
  Plus, 
  Minus, 
  PlusCircle, 
  Trash2, 
  RefreshCw,
  CheckCircle2,
  Check
} from 'lucide-react';

interface DoorsTabProps {
  projectId: string;
}

interface CustomWoodenWork {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  rate: number;
}

interface DoorSpecificationItem {
  uuid: string;
  code: string;
  spec_name: string;
  category: string;
  base_rate: number;
  quantity: number;
  custom_rate?: number; 
}

export default function DoorsTab({ projectId }: DoorsTabProps) {
  const { crmData, updateBulkFinishingSection } = useCRM();

  const project = crmData?.project || {};
  const estimatedDefaultDoors = Number(project.roomsCount || 2) + Number(project.bathroomsCount || 1);

  const [doorSpecs, setDbSpecs] = useState<DoorSpecificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const isLocalChange = useRef(false);

  const [state, setState] = useState({
    enabled: true,
    doorSpecs: [] as DoorSpecificationItem[],
    accessoriesRates: {
      framePrice: 800,              
      architravePrice: 450,         
      hingePrice: 120,              
      handlePrice: 500,             
      lockPrice: 650,               
      installationLaborPrice: 600   
    },
    hasFrames: true,
    hasArchitraves: true,
    hasHinges: true,
    hasHandles: true,
    hasLocks: true,
    hasInstallationLabor: true,
    customWorks: [] as CustomWoodenWork[],
    notes: ''
  });

  const [notesInput, setNotesInput] = useState<string>('');

  const FALLBACK_SPECS: DoorSpecificationItem[] = [
    { uuid: "db-01", code: "DR-01", spec_name: "ابواب جاهزة تركي PVC", category: "doors", base_rate: 5500, quantity: estimatedDefaultDoors },
    { uuid: "db-02", code: "DR-02", spec_name: "ابواب عمولة كبس قشرة ارو", category: "doors", base_rate: 7500, quantity: 0 },
    { uuid: "db-03", code: "DR-03", spec_name: "باب خشب طبيعي عمولة زان او ارو", category: "doors", base_rate: 15000, quantity: 1 }, 
    { uuid: "db-04", code: "DR-04", spec_name: "باب خشب طبيعي عمولة ارو", category: "doors", base_rate: 20000, quantity: 0 }
  ];

  const isMainDoorSpec = (specName: string): boolean => {
    const name = specName.toLowerCase();
    return (
      name.includes('شقة') || 
      name.includes('مصفح') || 
      name.includes('طبيعي') || 
      name.includes('رئيسي') ||
      name.includes('زان') ||
      name.includes('أرو') && !name.includes('قشرة')
    );
  };

  useEffect(() => {
    const fetchSpecifications = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('specifications_library')
          .select('*')
          .eq('category', 'doors');

        if (error) throw error;

        if (data && data.length > 0) {
          const mappedSpecs: DoorSpecificationItem[] = data.map((item: any, index: number) => {
            const isMain = isMainDoorSpec(item.spec_name);
            return {
              uuid: item.uuid || item.id,
              code: item.code || `DR-0${index + 1}`,
              spec_name: item.spec_name,
              category: item.category,
              base_rate: Number(item.base_rate || 5000),
              quantity: isMain ? (index === 2 ? 1 : 0) : (index === 0 ? estimatedDefaultDoors : 0),
            };
          });
          setDbSpecs(mappedSpecs);
        } else {
          setDbSpecs(FALLBACK_SPECS);
        }
      } catch (err) {
        console.error("عثرة أثناء جلب الأبواب:", err);
        setDbSpecs(FALLBACK_SPECS);
      } finally {
        setLoading(false);
      }
    };

    fetchSpecifications();
  }, [crmData?.project?.roomsCount]);

  useEffect(() => {
    if (crmData && crmData.finishing && crmData.finishing.doors) {
      const savedDoors = crmData.finishing.doors;

      const specsList = savedDoors.doorSpecs && Array.isArray(savedDoors.doorSpecs) && savedDoors.doorSpecs.length > 0
        ? savedDoors.doorSpecs
        : (doorSpecs.length > 0 ? doorSpecs : FALLBACK_SPECS);

      isLocalChange.current = false;
      setState({
        enabled: savedDoors.enabled ?? true,
        doorSpecs: specsList,
        accessoriesRates: {
          framePrice: savedDoors.accessoriesRates?.framePrice ?? 800,
          architravePrice: savedDoors.accessoriesRates?.architravePrice ?? 450,
          hingePrice: savedDoors.accessoriesRates?.hingePrice ?? 120,
          handlePrice: savedDoors.accessoriesRates?.handlePrice ?? 500,
          lockPrice: savedDoors.accessoriesRates?.lockPrice ?? 650,
          installationLaborPrice: savedDoors.accessoriesRates?.installationLaborPrice ?? 600
        },
        hasFrames: savedDoors.hasFrames ?? true,
        hasArchitraves: savedDoors.hasArchitraves ?? true,
        hasHinges: savedDoors.hasHinges ?? true,
        hasHandles: savedDoors.hasHandles ?? true,
        hasLocks: savedDoors.hasLocks ?? true,
        hasInstallationLabor: savedDoors.hasInstallationLabor ?? true,
        customWorks: savedDoors.customWorks || [],
        notes: savedDoors.notes ?? ''
      });
      setNotesInput(savedDoors.notes ?? '');
    }
  }, [crmData?.finishing?.doors?.enabled, doorSpecs]);

  useEffect(() => {
    if (isLocalChange.current) {
      updateBulkFinishingSection('doors', state);
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

  const handleQuantityChange = (uuid: string, action: 'increment' | 'decrement') => {
    updateStateAndSave(prev => {
      const updated = prev.doorSpecs.map(item => {
        if (item.uuid === uuid) {
          const currentQty = item.quantity || 0;
          const newQty = action === 'increment' ? currentQty + 1 : Math.max(0, currentQty - 1);
          return { ...item, quantity: newQty };
        }
        return item;
      });
      return { doorSpecs: updated };
    });
  };

  const handlePriceOverride = (uuid: string, value: number) => {
    updateStateAndSave(prev => {
      const updated = prev.doorSpecs.map(item => {
        if (item.uuid === uuid) {
          return { ...item, custom_rate: value };
        }
        return item;
      });
      return { doorSpecs: updated };
    });
  };

  const handleAccessoryRateChange = (key: keyof typeof state.accessoriesRates, value: number) => {
    updateStateAndSave(prev => ({
      accessoriesRates: {
        ...prev.accessoriesRates,
        [key]: value
      }
    }));
  };

  const handleAddCustomWork = () => {
    const newWork: CustomWoodenWork = {
      id: `custom-wood-${Date.now()}`,
      name: 'بند أعمال خشبية مخصص (تجليد / ديكور)',
      quantity: 1,
      unit: 'عدد',
      rate: 1000
    };
    updateStateAndSave(prev => ({
      customWorks: [...prev.customWorks, newWork]
    }));
  };

  const handleCustomWorkEdit = (id: string, fields: Partial<CustomWoodenWork>) => {
    updateStateAndSave(prev => ({
      customWorks: prev.customWorks.map(item => item.id === id ? { ...item, ...fields } : item)
    }));
  };

  const handleRemoveCustomWork = (id: string) => {
    updateStateAndSave(prev => ({
      customWorks: prev.customWorks.filter(item => item.id !== id)
    }));
  };

  const handleNotesBlur = async () => {
    updateStateAndSave(prev => ({ notes: notesInput }));
  };

  const mainEntranceDoors = state.doorSpecs.filter(item => isMainDoorSpec(item.spec_name));
  const internalRoomDoors = state.doorSpecs.filter(item => !isMainDoorSpec(item.spec_name));

  const totalActiveDoorsCount = state.enabled ? state.doorSpecs.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0;

  const totalBaseDoorsCost = state.enabled 
    ? state.doorSpecs.reduce((sum, item) => {
        const activeRate = item.custom_rate !== undefined ? item.custom_rate : item.base_rate;
        return sum + ((item.quantity || 0) * activeRate);
      }, 0)
    : 0;

  const totalFramesCost = state.enabled && state.hasFrames ? (totalActiveDoorsCount * (state.accessoriesRates.framePrice ?? 800)) : 0;
  const totalArchitravesCost = state.enabled && state.hasArchitraves ? (totalActiveDoorsCount * (state.accessoriesRates.architravePrice ?? 450)) : 0;
  
  const totalHingesCount = totalActiveDoorsCount * 3;
  const totalHingesCost = state.enabled && state.hasHinges ? (totalHingesCount * (state.accessoriesRates.hingePrice ?? 120)) : 0;

  const totalHandlesCost = state.enabled && state.hasHandles ? (totalActiveDoorsCount * (state.accessoriesRates.handlePrice ?? 500)) : 0;
  const totalLocksCost = state.enabled && state.hasLocks ? (totalActiveDoorsCount * (state.accessoriesRates.lockPrice ?? 650)) : 0;
  
  const totalInstallationLaborCost = state.enabled && state.hasInstallationLabor ? (totalActiveDoorsCount * (state.accessoriesRates.installationLaborPrice ?? 600)) : 0;

  const totalAccessoriesCost = totalFramesCost + totalArchitravesCost + totalHingesCost + totalHandlesCost + totalLocksCost + totalInstallationLaborCost;

  const totalCustomWorksCost = state.enabled 
    ? state.customWorks.reduce((sum, item) => sum + ((item.quantity || 0) * (item.rate || 0)), 0)
    : 0;

  const grandTotalEstimate = state.enabled ? (totalBaseDoorsCost + totalAccessoriesCost + totalCustomWorksCost) : 0;

  return (
    <div className="space-y-8 select-none text-right font-alexandria" dir="rtl">

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800;900&display=swap');
        
        .font-alexandria {
          font-family: 'Alexandria', Arial, sans-serif !important;
          letter-spacing: normal !important;
        }
      `}</style>

      {/* استدعاء شريط التفعيل المنزلق اللمسي الموحد للشركة */}
      <TabActivationBanner 
        title="منظومة الأبواب وإكسسواراتها وتجاليد الخشب"
        subtitle="DOORS & WOODEN ACCESSORIES SYSTEM"
        icon={Key}
        enabled={state.enabled}
        onToggle={() => { updateStateAndSave(prev => ({ enabled: !prev.enabled })); }}
      />

      <div className={`space-y-8 transition-opacity duration-300 ${state.enabled ? 'opacity-100' : 'opacity-25 pointer-events-none filter grayscale'}`}>
        
        {/* أبواب المداخل الرئيسية */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[#D4AF37] pb-2 text-[#D4AF37]">
            <Lock className="w-5 h-5 animate-pulse" />
            <h4 className="text-lg text-[#D4AF37]">أولاً: أبواب الشقة والمدخل الرئيسية :</h4>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12 bg-[#07132a] rounded-2xl border border-[#1f2d4d] gap-3 text-[#D4AF37]">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm font-semibold">جاري حصر أبواب المدخل الرئيسية...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {mainEntranceDoors.map((item) => {
                const activeRate = item.custom_rate !== undefined ? item.custom_rate : item.base_rate;
                const totalItemCost = (item.quantity || 0) * activeRate;

                return (
                  <div 
                    key={item.uuid}
                    className="p-6 rounded-3xl border border-[#1f2d4d] bg-[#07132a] flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:border-[#D4AF37]/50 shadow-[0_0_15px_rgba(31,45,77,0.2)]"
                  >
                    <div className="space-y-1 w-full md:flex-1 text-center md:text-right">
                      <div className="flex flex-col sm:flex-row items-center gap-2">
                        <h5 className="text-ms font-black text-[#D4AF37]">{item.spec_name}</h5>
                      </div>
                      <p className="text-xs text-white mt-1">توصيف معتمد لمدخل الوحدة بمكتبة الشركة</p>

                      {/* عداد تكلفت الباب ليتطابق بكسلياً بالدواير الرشيقة w-6 h-6 وارتفاع h-11 مع دستور الـ ERP */}
                      <div className="flex items-center gap-2 mt-4 justify-center md:justify-start" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs text-gray-400 font-bold select-none">سعر الباب:</span>
                        <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-44" dir="ltr">
                          <button 
                            type="button" 
                            disabled={!state.enabled}
                            onClick={() => handlePriceOverride(item.uuid, Math.max(0, activeRate - 100))}
                            className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                          >
                            <Minus size={12} className="stroke-[3]" />
                          </button>
                          <div className="flex items-center justify-center font-mono">
                            <input 
                              type="number"
                              disabled={!state.enabled}
                              value={activeRate}
                              onChange={(e) => handlePriceOverride(item.uuid, Number(e.target.value))}
                              className="w-16 bg-transparent text-white text-sm font-black outline-none text-center focus:border-transparent font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-[10px] text-gray-500 font-bold mr-1">ج.م</span>
                          </div>
                          <button 
                            type="button" 
                            disabled={!state.enabled}
                            onClick={() => handlePriceOverride(item.uuid, activeRate + 100)}
                            className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                          >
                            <Plus size={12} className="stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-3 border-t md:border-t-0 md:border-r border-[#1f2d4d]/60 pt-3 md:pt-0 md:pr-6 min-w-[140px] w-full md:w-auto">
                      {/* عداد الكمية للباب الرئيسي */}
                       <span className="text-[10px] text-white block font-bold mt-1.5"> الكمية:</span>
                      <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none min-w-[120px]" dir="ltr" onClick={(e) => e.stopPropagation()}>
                        <button 
                          type="button" 
                          disabled={!state.enabled}
                          onClick={() => handleQuantityChange(item.uuid, 'decrement')}
                          className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                        >
                          
                          <Minus size={12} className="stroke-[3]" />
                        </button>
                        
                        <span className="text-sm font-black text-white font-mono">{item.quantity || 0}</span>
                        <button 
                          type="button" 
                          disabled={!state.enabled}
                          onClick={() => handleQuantityChange(item.uuid, 'increment')}
                          className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                        >
                          <Plus size={12} className="stroke-[3]" />
                        </button>
                      </div>
                      <div className="text-center select-none">
                        <span className="text-[10px] text-gray-500 block font-bold">التكلفة الاجمالية:</span>
                        <span className="text-base font-black text-[#D4AF37] font-mono">{totalItemCost.toLocaleString('en-US')} ج.م</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* الأبواب الداخلية للغرف */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[#D4AF37] pb-2 text-[#D4AF37]">
            <Layers className="w-5 h-5 animate-pulse" />
            <h4 className="text-1g font-bold">ثانياً: الأبواب الخشبية الداخلية للغرف والحمامات :</h4>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12 bg-[#07132a] rounded-2xl border border-[#1f2d4d] gap-3 text-[#D4AF37]">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm font-semibold">جاري حصر الأبواب الداخلية...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {internalRoomDoors.map((item) => {
                const activeRate = item.custom_rate !== undefined ? item.custom_rate : item.base_rate;
                const totalItemCost = (item.quantity || 0) * activeRate;

                return (
                  <div 
                    key={item.uuid}
                    className="p-6 rounded-3xl border border-[#1f2d4d] bg-[#07132a] flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:border-[#D4AF37]/50 shadow-[0_0_15px_rgba(31,45,77,0.2)]"
                  >
                    <div className="space-y-1 w-full md:flex-1 text-center md:text-right">
                      <div className="flex flex-col sm:flex-row items-center gap-2">
                        <h5 className="text-ms font-black text-[#D4AF37]">{item.spec_name}</h5>
                      </div>
                      <p className="text-xs text-white mt-1">توصيف معتمد للغرف، الطرقات والحمامات بالموقع</p>

                      {/* عداد تكلفت الباب الداخلي ليتطابق بكسلياً بالدواير الرشيقة w-6 h-6 وارتفاع h-11 مع دستور الـ ERP */}
                      <div className="flex items-center gap-2 mt-4 justify-center md:justify-start" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs text-gray-400 font-bold select-none">سعر الباب:</span>
                        <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-44" dir="ltr">
                          <button 
                            type="button" 
                            disabled={!state.enabled}
                            onClick={() => handlePriceOverride(item.uuid, Math.max(0, activeRate - 500))}
                            className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                          >
                            <Minus size={12} className="stroke-[3]" />
                          </button>
                          <div className="flex items-center justify-center font-mono">
                            <input 
                              type="number"
                              disabled={!state.enabled}
                              value={activeRate}
                              onChange={(e) => handlePriceOverride(item.uuid, Number(e.target.value))}
                              className="w-16 bg-transparent text-white text-sm font-black outline-none text-center focus:border-transparent font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-[10px] text-gray-500 font-bold mr-1">ج.م</span>
                          </div>
                          <button 
                            type="button" 
                            disabled={!state.enabled}
                            onClick={() => handlePriceOverride(item.uuid, activeRate + 500)}
                            className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                          >
                            <Plus size={12} className="stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-3 border-t md:border-t-0 md:border-r border-[#1f2d4d]/60 pt-3 md:pt-0 md:pr-6 min-w-[140px] w-full md:w-auto">
                      {/* عداد الكمية للغرف */}
                      <span className="text-[10px] text-white block font-bold mt-1.5"> الكمية:</span>
                      <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none min-w-[120px]" dir="ltr" onClick={(e) => e.stopPropagation()}>
                        <button 
                          type="button" 
                          disabled={!state.enabled}
                          onClick={() => handleQuantityChange(item.uuid, 'decrement')}
                          className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                        >
                          <Minus size={12} className="stroke-[3]" />
                        </button>
                        <span className="text-sm font-black text-white font-mono">{item.quantity || 0}</span>
                        <button 
                          type="button" 
                          disabled={!state.enabled}
                          onClick={() => handleQuantityChange(item.uuid, 'increment')}
                          className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                        >
                          <Plus size={12} className="stroke-[3]" />
                        </button>
                      </div>
                      <div className="text-center select-none">
                        <span className="text-[10px] text-gray-500 block font-bold"> التكلفة الاجمالية:</span>
                        <span className="text-base font-black text-[#D4AF37] font-mono">{totalItemCost.toLocaleString('en-US')} ج.م</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 🌟 إعادة تصميم كروت الكماليات الـ 6 (النجارة والإكسسوارات) لصفوف أفقية متناسقة تمنع التداخل (Stealth Horizontal List) */}
        <div className="p-6 rounded-3xl bg-[#07132a] border border-[#D4AF37] space-y-6">
          <div className="border-b border-[#1f2d4d] pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
              <Lock className="w-6 h-6 animate-pulse" />
            </div>
            <div className="text-right">
              <h4 className="text-lg font-black text-[#D4AF37]">الإكسسوارات وكماليات ومصنعيات الأبواب:</h4>
              <p className="text-xs text-white mt-1">
                انقر على أي قيد لادراجة بالمقايسة وتعديل قيمته :
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. كارت مصنعية تركيب الأبواب والنجارة */}
            <div 
              onClick={() => {
                if (!state.enabled) return;
                const nextVal = !state.hasInstallationLabor;
                updateStateAndSave(prev => ({ hasInstallationLabor: nextVal }));
              }}
              className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer select-none flex items-center justify-between gap-4 ${
                state.hasInstallationLabor && state.enabled
                  ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_12px_rgba(212,175,55,0.05)] opacity-100' 
                  : 'border-[#1f2d4d] bg-[#020B1C]/40 opacity-40 hover:opacity-70'
              }`}
            >
              <div className="flex items-center gap-3 text-right">
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                  state.hasInstallationLabor && state.enabled ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-gray-500'
                }`}>
                  {state.hasInstallationLabor && state.enabled && <Check className="w-3 h-3 text-[#020B1C] stroke-[3]" />}
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-[#F0E6D2] block ">مصنعية تركيب الأبواب والنجارة</span>
                  <span className="text-[10px] text-gray-400 block mt-1">المصنعية التقديرية لـ {totalActiveDoorsCount} أبواب بالمشروع</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-40" dir="ltr" onClick={(e) => e.stopPropagation()}>
                  <button 
                    type="button"
                    disabled={!state.hasInstallationLabor || !state.enabled}
                    onClick={() => handleAccessoryRateChange('installationLaborPrice', Math.max(0, (state.accessoriesRates.installationLaborPrice ?? 600) - 50))}
                    className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                  >
                    <Minus size={12} className="stroke-[3]" />
                  </button>
                  <span className="text-xs font-bold text-white font-mono">{(state.accessoriesRates.installationLaborPrice ?? 600)} <span className="text-[8px] text-gray-500">ج.م</span></span>
                  <button 
                    type="button"
                    disabled={!state.hasInstallationLabor || !state.enabled}
                    onClick={() => handleAccessoryRateChange('installationLaborPrice', (state.accessoriesRates.installationLaborPrice ?? 600) + 50)}
                    className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                  >
                    <Plus size={12} className="stroke-[3]" />
                  </button>
                </div>

                <div className="text-left min-w-[100px] border-r border-[#1f2d4d]/40 pr-4 hidden sm:block">
                  <span className="text-[9px] text-gray-500 block">التكلفة:</span>
                  <span className="text-sm font-black text-[#D4AF37] font-mono">{totalInstallationLaborCost.toLocaleString('en-US')} ج.م</span>
                </div>
              </div>
            </div>

            {/* 2. كارت المفصلات التفاعلي */}
            <div 
              onClick={() => {
                if (!state.enabled) return;
                const nextVal = !state.hasHinges;
                updateStateAndSave(prev => ({ hasHinges: nextVal }));
              }}
              className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer select-none flex items-center justify-between gap-4 ${
                state.hasHinges && state.enabled
                  ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_12px_rgba(212,175,55,0.05)] opacity-100' 
                  : 'border-[#1f2d4d] bg-[#020B1C]/40 opacity-40 hover:opacity-70'
              }`}
            >
              <div className="flex items-center gap-3 text-right">
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                  state.hasHinges && state.enabled ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-gray-500'
                }`}>
                  {state.hasHinges && state.enabled && <Check className="w-3 h-3 text-[#020B1C] stroke-[3]" />}
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-[#F0E6D2] block">المفصلات</span>
                  <span className="text-[10px] text-gray-400 block mt-1">العدد: {totalHingesCount} المفصلات</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-40" dir="ltr" onClick={(e) => e.stopPropagation()}>
                  <button 
                    type="button"
                    disabled={!state.hasHinges || !state.enabled}
                    onClick={() => handleAccessoryRateChange('hingePrice', Math.max(0, (state.accessoriesRates.hingePrice ?? 120) - 10))}
                    className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                  >
                    <Minus size={12} className="stroke-[3]" />
                  </button>
                  <span className="text-xs font-bold text-white font-mono">{(state.accessoriesRates.hingePrice ?? 120)} <span className="text-[8px] text-gray-500">ج.م</span></span>
                  <button 
                    type="button"
                    disabled={!state.hasHinges || !state.enabled}
                    onClick={() => handleAccessoryRateChange('hingePrice', (state.accessoriesRates.hingePrice ?? 120) + 10)}
                    className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                  >
                    <Plus size={12} className="stroke-[3]" />
                  </button>
                </div>

                <div className="text-left min-w-[100px] border-r border-[#1f2d4d]/40 pr-4 hidden sm:block">
                  <span className="text-[9px] text-gray-500 block">التكلفة:</span>
                  <span className="text-sm font-black text-[#D4AF37] font-mono">{totalHingesCost.toLocaleString('en-US')} ج.م</span>
                </div>
              </div>
            </div>

            {/* 3. كارت حلوق خشبية */}
            <div 
              onClick={() => {
                if (!state.enabled) return;
                const nextVal = !state.hasFrames;
                updateStateAndSave(prev => ({ hasFrames: nextVal }));
              }}
              className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer select-none flex items-center justify-between gap-4 ${
                state.hasFrames && state.enabled
                  ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_12px_rgba(212,175,55,0.05)] opacity-100' 
                  : 'border-[#1f2d4d] bg-[#020B1C]/40 opacity-40 hover:opacity-70'
              }`}
            >
              <div className="flex items-center gap-3 text-right">
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                  state.hasFrames && state.enabled ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-gray-500'
                }`}>
                  {state.hasFrames && state.enabled && <Check className="w-3 h-3 text-[#020B1C] stroke-[3]" />}
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-[#F0E6D2] block">حلوق خشب  </span>
                  <span className="text-[10px] text-gray-400 block mt-1">حلق عمق 2 بوصة لـ {totalActiveDoorsCount} أبواب</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-40" dir="ltr" onClick={(e) => e.stopPropagation()}>
                  <button 
                    type="button"
                    disabled={!state.hasFrames || !state.enabled}
                    onClick={() => handleAccessoryRateChange('framePrice', Math.max(0, (state.accessoriesRates.framePrice ?? 800) - 50))}
                    className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                  >
                    <Minus size={12} className="stroke-[3]" />
                  </button>
                  <span className="text-xs font-bold text-white font-mono">{(state.accessoriesRates.framePrice ?? 800)} <span className="text-[8px] text-gray-500">ج.م</span></span>
                  <button 
                    type="button"
                    disabled={!state.hasFrames || !state.enabled}
                    onClick={() => handleAccessoryRateChange('framePrice', (state.accessoriesRates.framePrice ?? 800) + 50)}
                    className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                  >
                    <Plus size={12} className="stroke-[3]" />
                  </button>
                </div>

                <div className="text-left min-w-[100px] border-r border-[#1f2d4d]/40 pr-4 hidden sm:block">
                  <span className="text-[9px] text-gray-500 block">التكلفة:</span>
                  <span className="text-sm font-black text-[#D4AF37] font-mono">{totalFramesCost.toLocaleString('en-US')} ج.م</span>
                </div>
              </div>
            </div>

            {/* 4. كارت البرور لإنهاء الحلوق */}
            <div 
              onClick={() => {
                if (!state.enabled) return;
                const nextVal = !state.hasArchitraves;
                updateStateAndSave(prev => ({ hasArchitraves: nextVal }));
              }}
              className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer select-none flex items-center justify-between gap-4 ${
                state.hasArchitraves && state.enabled
                  ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_12px_rgba(212,175,55,0.05)] opacity-100' 
                  : 'border-[#1f2d4d] bg-[#020B1C]/40 opacity-40 hover:opacity-70'
              }`}
            >
              <div className="flex items-center gap-3 text-right">
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                  state.hasArchitraves && state.enabled ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-gray-500'
                }`}>
                  {state.hasArchitraves && state.enabled && <Check className="w-3 h-3 text-[#020B1C] stroke-[3]" />}
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-[#F0E6D2] block">برور تغطية الحلوق للوجهين</span>
                  <span className="text-[10px] text-gray-400 block mt-1">تجليد محيط حلق الباب لـ {totalActiveDoorsCount} أبواب</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-40" dir="ltr" onClick={(e) => e.stopPropagation()}>
                  <button 
                    type="button"
                    disabled={!state.hasArchitraves || !state.enabled}
                    onClick={() => handleAccessoryRateChange('architravePrice', Math.max(0, (state.accessoriesRates.architravePrice ?? 450) - 50))}
                    className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                  >
                    <Minus size={12} className="stroke-[3]" />
                  </button>
                  <span className="text-xs font-bold text-white font-mono">{(state.accessoriesRates.architravePrice ?? 450)} <span className="text-[8px] text-gray-500">ج.م</span></span>
                  <button 
                    type="button"
                    disabled={!state.hasArchitraves || !state.enabled}
                    onClick={() => handleAccessoryRateChange('architravePrice', (state.accessoriesRates.architravePrice ?? 450) + 50)}
                    className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                  >
                    <Plus size={12} className="stroke-[3]" />
                  </button>
                </div>

                <div className="text-left min-w-[100px] border-r border-[#1f2d4d]/40 pr-4 hidden sm:block">
                  <span className="text-[9px] text-gray-500 block">التكلفة:</span>
                  <span className="text-sm font-black text-[#D4AF37] font-mono">{totalArchitravesCost.toLocaleString('en-US')} ج.م</span>
                </div>
              </div>
            </div>

            {/* 5. كارت الأكر والمقابض الفاخرة */}
            <div 
              onClick={() => {
                if (!state.enabled) return;
                const nextVal = !state.hasHandles;
                updateStateAndSave(prev => ({ hasHandles: nextVal }));
              }}
              className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer select-none flex items-center justify-between gap-4 ${
                state.hasHandles && state.enabled
                  ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_12px_rgba(212,175,55,0.05)] opacity-100' 
                  : 'border-[#1f2d4d] bg-[#020B1C]/40 opacity-40 hover:opacity-70'
              }`}
            >
              <div className="flex items-center gap-3 text-right">
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                  state.hasHandles && state.enabled ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-gray-500'
                }`}>
                  {state.hasHandles && state.enabled && <Check className="w-3 h-3 text-[#020B1C] stroke-[3]" />}
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-[#F0E6D2] block">أكر ومقابض </span>
                  <span className="text-[10px] text-gray-400 block mt-1">مقبض تركي مقاوم للصدأ لـ {totalActiveDoorsCount} أبواب</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-40" dir="ltr" onClick={(e) => e.stopPropagation()}>
                  <button 
                    type="button"
                    disabled={!state.hasHandles || !state.enabled}
                    onClick={() => handleAccessoryRateChange('handlePrice', Math.max(0, (state.accessoriesRates.handlePrice ?? 500) - 50))}
                    className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                  >
                    <Minus size={12} className="stroke-[3]" />
                  </button>
                  <span className="text-xs font-bold text-white font-mono">{(state.accessoriesRates.handlePrice ?? 500)} <span className="text-[8px] text-gray-500">ج.م</span></span>
                  <button 
                    type="button"
                    disabled={!state.hasHandles || !state.enabled}
                    onClick={() => handleAccessoryRateChange('handlePrice', (state.accessoriesRates.handlePrice ?? 500) + 50)}
                    className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                  >
                    <Plus size={12} className="stroke-[3]" />
                  </button>
                </div>

                <div className="text-left min-w-[100px] border-r border-[#1f2d4d]/40 pr-4 hidden sm:block">
                  <span className="text-[9px] text-gray-500 block">التكلفة:</span>
                  <span className="text-sm font-black text-[#D4AF37] font-mono">{totalHandlesCost.toLocaleString('en-US')} ج.م</span>
                </div>
              </div>
            </div>

            {/* 6. كارت كوالين النحاس الإيطالي */}
            <div 
              onClick={() => {
                if (!state.enabled) return;
                const nextVal = !state.hasLocks;
                updateStateAndSave(prev => ({ hasLocks: nextVal }));
              }}
              className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer select-none flex items-center justify-between gap-4 ${
                state.hasLocks && state.enabled
                  ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_12px_rgba(212,175,55,0.05)] opacity-100' 
                  : 'border-[#1f2d4d] bg-[#020B1C]/40 opacity-40 hover:opacity-70'
              }`}
            >
              <div className="flex items-center gap-3 text-right">
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                  state.hasLocks && state.enabled ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-gray-500'
                }`}>
                  {state.hasLocks && state.enabled && <Check className="w-3 h-3 text-[#020B1C] stroke-[3]" />}
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-[#F0E6D2] block">كوالين</span>
                  <span className="text-[10px] text-gray-400 block mt-1">كالون أمان كمبيوتر إيطالي لـ {totalActiveDoorsCount} أبواب</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-40" dir="ltr" onClick={(e) => e.stopPropagation()}>
                  <button 
                    type="button"
                    disabled={!state.hasLocks || !state.enabled}
                    onClick={() => handleAccessoryRateChange('lockPrice', Math.max(0, (state.accessoriesRates.lockPrice ?? 650) - 50))}
                    className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                  >
                    <Minus size={12} className="stroke-[3]" />
                  </button>
                  <span className="text-xs font-bold text-white font-mono">{(state.accessoriesRates.lockPrice ?? 650)} <span className="text-[8px] text-gray-500">ج.م</span></span>
                  <button 
                    type="button"
                    disabled={!state.hasLocks || !state.enabled}
                    onClick={() => handleAccessoryRateChange('lockPrice', (state.accessoriesRates.lockPrice ?? 650) + 50)}
                    className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                  >
                    <Plus size={12} className="stroke-[3]" />
                  </button>
                </div>

                <div className="text-left min-w-[100px] border-r border-[#1f2d4d]/40 pr-4 hidden sm:block">
                  <span className="text-[9px] text-gray-500 block">التكلفة:</span>
                  <span className="text-sm font-black text-[#D4AF37] font-mono">{totalLocksCost.toLocaleString('en-US')} ج.م</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* التجاليد الخشبية والأعمال المخصصة */}
        <div className="p-6 rounded-3xl bg-[#07132a] border border-[#D4AF37] space-y-4">

          <div className="border-b border-[#D4AF37] pb-4 flex items-center gap-3 p-2 rounded-lg text-[#D4AF37]">
            <Layers className="w-5 h-5 animate-pulse text-ms font-bold" />
            <h4 className="text-lg font-black text-[#D4AF37]">التجاليد الخشبية والأعمال المخصصة الإضافية بالوحدة:</h4>
          </div>
          <button
            type="button"
            disabled={!state.enabled}
            onClick={handleAddCustomWork}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 text-sm font-bold transition-all cursor-pointer font-alexandria"
          >
            <PlusCircle className="w-5 h-5" />
            <span>إضافة بند نجارة أو تجليد مخصص جديد</span>
          </button>

          {state.customWorks.length === 0 ? (
            <div className="text-center p-6 bg-[#020B1C]/40 rounded-xl border border-[#1f2d4d]/40 text-right select-none">
              <p className="text-xs text-gray-500">لا توجد أعمال تجاليد أو غرف ملابس مخصصة مضافة حالياً بمقايسة هذا العميل</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {state.customWorks.map((work) => (
                <div 
                  key={work.id}
                  className="p-5 rounded-3xl border border-[#1f2d4d] bg-[#020B1C]/40 hover:border-[#D4AF37]/50 shadow-md hover:shadow-[0_0_25px_rgba(212,175,55,0.06)] transition-all duration-300 flex flex-col justify-between gap-4 text-right"
                >
                  <div className="flex justify-between items-center border-b border-[#1f2d4d]/30 pb-3">
                    <div className="flex items-center gap-2 flex-1 pl-2 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#D4AF37]/10 text-[#D4AF37] font-semibold border border-[#D4AF37]/20 flex-shrink-0 font-mono">
                        بند مخصص
                      </span>
                      <input 
                        type="text"
                        disabled={!state.enabled}
                        value={work.name ?? ''}
                        onChange={(e) => handleCustomWorkEdit(work.id, { name: e.target.value })}
                        placeholder="مثال: تجليد حائط خشب أرو مسطح..."
                        className="bg-transparent border-b border-transparent hover:border-[#D4AF37]/30 focus:border-[#D4AF37] text-ms text-[#D4AF37] placeholder-gray-400 outline-none transition-all w-full"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomWork(work.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer flex-shrink-0"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                    
                    {/* تعديل عداد كميات التجاليد الخشبية المخصصة */}
                    <div className="space-y-1 text-right">
                      <span className="text-ms text-gray-500 block mb-1 select-none">الكمية المطلوبة:</span>
                      <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none" dir="ltr">
                        <button
                          type="button"
                          disabled={!state.enabled}
                          onClick={() => handleCustomWorkEdit(work.id, { quantity: Math.max(1, (work.quantity ?? 1) - 1) })}
                          className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                        >
                          <Minus size={12} className="stroke-[3]" />
                        </button>
                        <span className="text-xs font-black text-[#D4AF37] font-mono">{work.quantity ?? 1}</span>
                        <button
                          type="button"
                          disabled={!state.enabled}
                          onClick={() => handleCustomWorkEdit(work.id, { quantity: (work.quantity ?? 1) + 1 })}
                          className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                        >
                          <Plus size={12} className="stroke-[3]" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 text-right">
                      <span className="text-xs text-gray-500 font-bold block mb-1 select-none">وحدة القياس:</span>
                      <select
                        disabled={!state.enabled}
                        value={work.unit ?? 'عدد'}
                        onChange={(e) => handleCustomWorkEdit(work.id, { unit: e.target.value })}
                        className="w-full h-11 px-3 rounded-xl bg-[#07132a] border border-[#1f2d4d] focus:border-[#D4AF37] text-sm text-[#F0E6D2] font-bold outline-none cursor-pointer"
                      >
                        <option value="عدد" className="bg-[#020B1C] text-white">عدد / قطعة</option>
                        <option value="م٢" className="bg-[#020B1C] text-white">متر مسطح (م²)</option>
                        <option value="م.ط" className="bg-[#020B1C] text-white">متر طولي (م.ط)</option>
                        <option value="مقطوعية" className="bg-[#020B1C] text-white">مقطوعية ثابتة</option>
                      </select>
                    </div>

                    {/* تعديل عداد مالي لتعديل سعر فئة التجاليد المخصصة */}
                    <div className="space-y-1 text-right">
                      <span className="text-xs text-gray-500 font-bold block mb-1 select-none">سعر الفئة للوحدة:</span>
                      <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none hover:border-[#D4AF37]/30 transition-all" dir="ltr">
                        <button
                          type="button"
                          disabled={!state.enabled}
                          onClick={() => handleCustomWorkEdit(work.id, { rate: Math.max(0, (work.rate ?? 0) - 500) })}
                          className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                        >
                          <Minus size={12} className="stroke-[3]" />
                        </button>
                        <div className="flex items-center justify-center font-mono">
                          <input 
                            type="number"
                            disabled={!state.enabled}
                            value={work.rate ?? 0}
                            onChange={(e) => handleCustomWorkEdit(work.id, { rate: Number(e.target.value) })}
                            className="w-16 bg-transparent text-white text-sm font-black outline-none text-center focus:border-transparent font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="text-[10px] text-gray-500 font-bold mr-1">ج.م</span>
                        </div>
                        <button
                          type="button"
                          disabled={!state.enabled}
                          onClick={() => handleCustomWorkEdit(work.id, { rate: (work.rate ?? 0) + 500 })}
                          className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                        >
                          <Plus size={12} className="stroke-[3]" />
                        </button>
                      </div>
                    </div>

                  </div>

                  <div className="border-t border-[#1f2d4d]/30 pt-3 flex items-center justify-between mt-2 select-none text-right">
                    <span className="text-xs text-white font-bold">إجمالي تكلفة هذا البند:</span>
                    <span className="text-xl font-black text-[#D4AF37] font-mono">
                      {((work.quantity ?? 1) * (work.rate ?? 0)).toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <div className="p-6 rounded-2xl bg-[#07132a] border border-[#D4AF37] space-y-3">
        <div className="flex items-center gap-2 text-[#D4AF37] border-b border-[#D4AF37] pb-2 text-right">
          <FileText className="w-5 h-5" />
          <h4 className="text-lg font-black text-[#D4AF37]">اتفاقات وبنود مخصصة لنجارة الأبواب :</h4>
        </div>
        <textarea
          value={notesInput}
          disabled={!state.enabled}
          onChange={(e) => setNotesInput(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="اكتب هنا أي تفاصيل مخصصة، نوع ورسمة حفر زجاج الأبواب، مواصفات حلوق الزان، أو ماركات مقابض مستثناة تم الاتفاق عليها مع العميل لحفظها مباشرة بالعقد..."
          className="w-full h-24 p-4 rounded-xl bg-[#020B1C] border border-[#1f2d4d] hover:border-[#D4AF37]/50 focus:border-[#D4AF37] text-[#F0E6D2] placeholder-gray-500 outline-none transition-all resize-none text-base leading-relaxed text-right"
        />
        <div className="flex justify-between items-center text-xs text-gray-500 px-1">
          <span>يتم الحفظ تلقائياً بمجرد الخروج من حقل الكتابة</span>
          <span>حالة الاتصال: متصل </span>
        </div>
      </div>

      {/* كشف الملخص المالي للبند ليطابق كلياً نمط التكييف المعتمد */}
      <div className="p-5 rounded-xl bg-[#020B1C] border border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.05)] flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[#D4AF37]" />
        
        <div className="space-y-1 text-center sm:text-right pr-1 select-none">
          <h4 className="text-lg font-bold text-[#D4AF37]">كشف الملخص المالي للبند (المقايسة الحالية للأبواب والنجارة):</h4>
          <p className="text-xs text-white font-normal leading-relaxed max-w-2xl text-right">البيانات الإجمالية والكماليات والمفصلات المحصورة يتم ترحيلها لحسابات المقايسة الكلية للعميل المقدرة ({grandTotalEstimate.toLocaleString('en-US')} ج.م).</p>
        </div>

        <div className="flex items-center gap-3 bg-[#07132a] px-6 py-4 rounded-lg border border-[#1f2d4d]">
          <div className="p-1.5 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
            <DollarSign className="w-6 h-6" />
          </div>
          <div className="text-right">
            <span className="text-[10px] text-white block font-semibold">إجمالي تكلفة البند المقدرة:</span>
            <span className="text-2xl font-black text-[#D4AF37] font-mono">
              {grandTotalEstimate.toLocaleString('en-US')} <span className="text-xs font-normal">ج.م</span>
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}