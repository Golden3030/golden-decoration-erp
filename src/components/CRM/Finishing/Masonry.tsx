"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from "../context/CRMContext";
import { supabase } from '@/lib/supabaseClient'; 

import { 
  Plus, 
  Minus, 
  FileText, 
  Truck, 
  HardHat, 
  Package, 
  Layers, 
  Droplet,
  CheckCircle2,
  Lock,
  Columns,
  DollarSign
} from 'lucide-react';

interface MasonryProps { projectId: string; }

interface MasonryCardProps {
  title: string; 
  icon: React.ReactNode; 
  unit: string; 
  value: number;
  onPlus: () => void; 
  onMinus: () => void; 
  priceValue?: number;
  onPricePlus?: () => void;
  onPriceMinus?: () => void;
  isMaktouya?: boolean;
  enabled?: boolean;
}

export default function Masonry({ projectId }: MasonryProps) {
  const { crmData, updateBulkFinishingSection } = useCRM();

  const [isSaving, setIsSaving] = useState<boolean>(false);

  const isLocalChange = useRef(false);
  const didSeedDefaults = useRef(false);

  const [state, setState] = useState({
    enabled: true,
    brickCount: 1000,
    cementBags: 9,
    sandMeters: 1.25,
    brickPrice: 1800,
    cementPrice: 200,
    sandPrice: 250,
    laborLumpSum: 5000,
    logisticsCost: 1500,
    notes: ''
  });

  const [notesInput, setNotesInput] = useState<string>('');

  useEffect(() => {
    const contextData = crmData?.finishing?.masonry;
    
    if (contextData) {
      isLocalChange.current = false;
      setState({
        enabled: contextData.enabled ?? true,
        brickCount: contextData.brickCount ?? 1000,
        cementBags: contextData.cementBags ?? 9,
        sandMeters: contextData.sandMeters ?? 1.25,
        brickPrice: contextData.brickPrice ?? 1800,
        cementPrice: contextData.cementPrice ?? 200,
        sandPrice: contextData.sandPrice ?? 250,
        laborLumpSum: contextData.rates?.laborLumpSum ?? 5000,
        logisticsCost: contextData.rates?.logisticsCost ?? 1500,
        notes: contextData.notes ?? ''
      });
      setNotesInput(contextData.notes ?? '');
    } else if (crmData && !didSeedDefaults.current) {
      didSeedDefaults.current = true;
      updateBulkFinishingSection('masonry', {
        enabled: true,
        brickCount: 1000,
        cementBags: 9,
        sandMeters: 1.25,
        brickPrice: 1800,
        cementPrice: 200,
        sandPrice: 250,
        notes: '',
        rates: {
          laborLumpSum: 5000,
          logisticsCost: 1500
        }
      });
    }
  }, [crmData]);

  useEffect(() => {
    if (isLocalChange.current) {
      updateBulkFinishingSection('masonry', {
        enabled: state.enabled,
        brickCount: state.brickCount,
        cementBags: state.cementBags,
        sandMeters: state.sandMeters,
        brickPrice: state.brickPrice,
        cementPrice: state.cementPrice,
        sandPrice: state.sandPrice,
        notes: state.notes,
        rates: {
          laborLumpSum: state.laborLumpSum,
          logisticsCost: state.logisticsCost
        }
      });
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

  const handleNotesBlur = () => {
    updateStateAndSave(prev => ({ notes: notesInput }));
  };

  const totalMaterialsCost = ((state.brickCount / 1000) * state.brickPrice) + (state.cementBags * state.cementPrice) + (state.sandMeters * state.sandPrice);
  const totalFinancial = state.enabled ? (totalMaterialsCost + state.laborLumpSum + state.logisticsCost) : 0;

  return (
    <div dir="rtl" className="space-y-8 text-right font-sans select-none" id={projectId}>
      
      <div 
        onClick={() => { updateStateAndSave(prev => ({ enabled: !prev.enabled })); }}
        className={`p-6 rounded-[2.5rem] border transition-all duration-500 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl cursor-pointer select-none ${
          state.enabled 
            ? 'bg-[#07132a] border-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.15)] hover:shadow-[0_0_40px_rgba(212,175,55,0.25)]' 
            : 'bg-[#07132a]/40 border-[#1f2d4d] hover:border-gray-600'
        }`}
      >
        <div className="flex items-center gap-4 pr-2">
          <div className={`p-5 rounded-2xl transition-all duration-500 flex-shrink-0 ${state.enabled ? 'bg-[#D4AF37] text-black shadow-[0_0_30px_rgba(212,175,55,0.4)]' : 'bg-[#020B1C] text-gray-600'}`}>
            <Columns className="w-10 h-10" />
          </div>
          <div className="text-right">
            <h4 className="text-xl font-black text-[#D4AF37]">أعمال المباني</h4>

            <p className="text-[11px] text-gray-400 mt-5 uppercase font-bold tracking-widest leading-none">BRICKWORK & MATERIALS SYSTEM</p>
          </div>
        </div>

        <div
          className={`px-10 py-3 rounded-2xl border-2 font-black text-base transition-all duration-300 flex items-center gap-3 flex-shrink-0 ${
            state.enabled 
              ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.1)]' 
              : 'bg-[#020B1C] border-[#1f2d4d] text-gray-500'
          }`}
        >
          {state.enabled ? <CheckCircle2 className="w-6 h-6 text-[#D4AF37]" /> : <Lock className="w-5 h-5 text-gray-500" />}
          {state.enabled ? 'الغاء تفعيل القسم' : ' تفعيل القسم'}
        </div>
      </div>

      <div className={`space-y-8 transition-opacity duration-300 ${state.enabled ? 'opacity-100' : 'opacity-25 pointer-events-none filter grayscale'}`}>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <MasonryCard 
            title="حصر أعداد الطوب الكلي" 
            icon={<Package className="w-5 h-5"/>} 
            unit="طوبة" 
            value={state.brickCount} 
            onPlus={() => updateStateAndSave(prev => ({ brickCount: prev.brickCount + 500 }))} 
            onMinus={() => updateStateAndSave(prev => ({ brickCount: Math.max(0, prev.brickCount - 500) }))}
            priceValue={state.brickPrice}
            onPricePlus={() => updateStateAndSave(prev => ({ brickPrice: prev.brickPrice + 50 }))}
            onPriceMinus={() => updateStateAndSave(prev => ({ brickPrice: Math.max(0, prev.brickPrice - 50) }))}
            enabled={state.enabled}
          />

          <MasonryCard 
            title="حصر شكاير الأسمنت" 
            icon={<Layers className="w-5 h-5"/>} 
            unit="شكارة" 
            value={state.cementBags} 
            onPlus={() => updateStateAndSave(prev => ({ cementBags: prev.cementBags + 5 }))} 
            onMinus={() => updateStateAndSave(prev => ({ cementBags: Math.max(0, prev.cementBags - 5) }))}
            priceValue={state.cementPrice}
            onPricePlus={() => updateStateAndSave(prev => ({ cementPrice: prev.cementPrice + 10 }))}
            onPriceMinus={() => updateStateAndSave(prev => ({ cementPrice: Math.max(0, prev.cementPrice - 10) }))}
            enabled={state.enabled}
          />

          <MasonryCard 
            title="حصر أمتار الرمل الإنشائي" 
            icon={<Droplet className="w-5 h-5"/>} 
            unit="م٣" 
            value={state.sandMeters} 
            onPlus={() => updateStateAndSave(prev => ({ sandMeters: Number((prev.sandMeters + 0.25).toFixed(2)) }))} 
            onMinus={() => updateStateAndSave(prev => ({ sandMeters: Math.max(0, Number((prev.sandMeters - 0.25).toFixed(2))) }))}
            priceValue={state.sandPrice}
            onPricePlus={() => updateStateAndSave(prev => ({ sandPrice: prev.sandPrice + 25 }))}
            onPriceMinus={() => updateStateAndSave(prev => ({ sandPrice: Math.max(0, prev.sandPrice - 25) }))}
            enabled={state.enabled}
          />

          <MasonryCard 
            title="أجور مصنعية البناء" 
            icon={<HardHat className="w-5 h-5"/>} 
            unit="جنية مصري" 
            value={state.laborLumpSum} 
            onPlus={() => updateStateAndSave(prev => ({ laborLumpSum: prev.laborLumpSum + 250 }))} 
            onMinus={() => updateStateAndSave(prev => ({ laborLumpSum: Math.max(0, prev.laborLumpSum - 250) }))}
            isMaktouya 
            enabled={state.enabled}
          />

          <MasonryCard 
            title="تكاليف النقل والتشوين" 
            icon={<Truck className="w-5 h-5"/>} 
            unit="جنية مصري" 
            value={state.logisticsCost} 
            onPlus={() => updateStateAndSave(prev => ({ logisticsCost: prev.logisticsCost + 100 }))} 
            onMinus={() => updateStateAndSave(prev => ({ logisticsCost: Math.max(0, prev.logisticsCost - 100) }))}
            isMaktouya 
            enabled={state.enabled}
          />

        </div>

        <div className="p-6 rounded-2xl bg-[#07132a] border border-[#D4AF37]/20 shadow-[0_0_20px_rgba(212,175,55,0.04)] flex flex-col sm:flex-row items-center justify-between gap-6 select-none">
          <div className="text-right pr-2">
            <h4 className="text-lg font-black text-[#D4AF37]">إجمالي تكلفة المونة والخامات الأساسية:</h4>
            <p className="text-xs text-white mt-1 leading-relaxed">تشتمل على تكلفة الطوب الطفلي الإجمالي، وشكاير الأسمنت وأمتار الرمل الموردة للموقع</p>
          </div>
          <div className="flex items-center gap-4 bg-[#020B1C] px-6 py-3 rounded-2xl border border-[#1f2d4d]">
            <span className="text-xs text-gray-500 font-bold">تكلفة الخامات:</span>
            <span className="text-xl font-black text-[#D4AF37] font-mono">{totalMaterialsCost.toLocaleString()} <span className="text-sm font-normal text-[#D4AF37]">ج.م</span></span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#07132a] border border-[#1f2d4d] space-y-3">
          <div className="flex items-center gap-2 text-[#D4AF37] border-b border-[#1f2d4d]/60 pb-2 text-right">
            <FileText className="w-5 h-5" />
            <h4 className="text-base font-bold">ملاحظات وشروط استلام أعمال المباني والمونة (بنود العقد الفنية):</h4>
          </div>
          <textarea
            value={notesInput}
            disabled={!state.enabled}
            onChange={(e) => setNotesInput(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="اكتب مواصفات الطوب المستخدم (طفلي أو أسمنتي)، مواصفات تسليح المباني بالكانات الحديدية، ونسب خلط الأسمنت لكل متر رمل بالمونة..."
            className="w-full h-24 p-4 rounded-xl bg-[#020B1C] border border-[#1f2d4d] hover:border-[#D4AF37]/50 focus:border-[#D4AF37] text-lg text-[#F0E6D2] placeholder-gray-500 outline-none transition-all resize-none leading-relaxed text-right font-semibold"
          />
          <div className="flex justify-between items-center text-xs text-gray-500 px-1">
            <span>يتم الحفظ تلقائياً بمجرد الخروج من حقل الكتابة</span>
            <span>حالة الاتصال: متصل وسحابي</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#020B1C] border border-[#D4AF37]/30 shadow-[0_0_25px_rgba(212,175,55,0.06)] flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
          
          <div className="absolute right-0 top-0 bottom-0 w-2 bg-[#D4AF37]" />

          <div className="space-y-1 text-center sm:text-right pr-2">
            <h4 className="text-xl text-[#D4AF37] font-bold">الملخص المالي التقديري لبند أعمال المباني والمونة:</h4>
            <p className="text-sm text-white">البيانات الإجمالية واللوجستيات والمونة والمصنعيات المحصورة يتم ترحيلها حركياً لحسابات المقايسة الكلية للعميل</p>
          </div>

          <div className="flex items-center gap-4 bg-[#07132a] px-8 py-5 rounded-xl border border-[#1f2d4d]">
            <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
              <DollarSign className="w-8 h-8 animate-pulse" />
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 block font-semibold">إجمالي التكلفة التقديرية للبند:</span>
              <span className="text-3xl font-black text-[#D4AF37] font-mono">
                {totalFinancial.toLocaleString('en-US')} <span className="text-sm font-normal text-[#D4AF37]">ج.م</span>
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

function MasonryCard({ title, icon, unit, value, onPlus, onMinus, priceValue, onPricePlus, onPriceMinus, isMaktouya = false, enabled = true }: MasonryCardProps) {
  return (
    <div className="p-5 rounded-2xl border border-[#1f2d4d] bg-[#020B1C]/50 flex flex-col gap-4 group transition-all duration-300 hover:border-[#D4AF37]/50 hover:shadow-[0_0_25px_rgba(212,175,55,0.05)] shadow-xl text-right select-none">
      
      <div className="w-full flex items-center justify-between border-b border-[#1f2d4d]/30 pb-2">
         <div className="flex items-center gap-2">
            <div className="text-[#D4AF37]/70 group-hover:text-[#D4AF37] transition-transform group-hover:scale-110">{icon}</div>
            <span className="text-sm font-black text-[#F0E6D2] group-hover:text-[#D4AF37] transition-all leading-none">{title}</span>
         </div>
         {isMaktouya && (
            <span className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-tight">مقطوعية</span>
         )}
      </div>
      
      {/* 🎯 تعديل لعدادات الكميات ليتطابق بكسلياً بالدواير الرشيقة w-6 h-6 وارتفاع h-11 مع دستور الـ ERP */}
      <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none hover:border-[#D4AF37]/50 transition-all select-none" dir="ltr">
        <button 
          type="button"
          disabled={!enabled}
          onClick={onMinus}
          className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
        >
          <Minus size={12} className="stroke-[3]" />
        </button>
        <div className="text-center font-bold">
           <span className="text-sm font-black text-[#D4AF37] font-mono leading-none">{value.toLocaleString()}</span>
           <span className="text-[10px] text-gray-500 font-bold mr-1">{unit}</span>
        </div>
        <button 
          type="button"
          disabled={!enabled}
          onClick={onPlus}
          className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
        >
          <Plus size={12} className="stroke-[3]" />
        </button>
      </div>

      {/* 🎯 تعديل لعدادات الأسعار ليتطابق بكسلياً بالدواير الرشيقة w-6 h-6 وارتفاع h-10 مع دستور الـ ERP */}
      {priceValue !== undefined && (
        <div className="mt-1 pt-2 border-t border-[#1f2d4d]/20 flex items-center justify-between select-none">
           <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">سعر الفئة للوحدة:</span>
           <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-10 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-36" dir="ltr">
              <button 
                type="button"
                disabled={!enabled}
                onClick={onPriceMinus}
                className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
              >
                <Minus size={12} className="stroke-[3]" />
              </button>
              <span className="text-xs font-bold text-[#D4AF37] font-mono">{priceValue} <span className="text-[8px] text-gray-500">ج</span></span>
              <button 
                type="button"
                disabled={!enabled}
                onClick={onPricePlus}
                className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
              >
                <Plus size={12} className="stroke-[3]" />
              </button>
           </div>
        </div>
      )}
    </div>
  );
}