"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from "../context/CRMContext";
import { supabase } from '@/lib/supabaseClient';
import TabActivationBanner from './TabActivationBanner'; // 👈 استدعاء المكون المشترك الموحد للأجهزة اللمسية للشركة
import { 
  Plus, 
  Minus, 
  Layers, 
  FileText,
  CheckCircle2,
  Lock,
  PlusCircle,
  Wrench,
  DollarSign,
  Truck,
  Droplet,
  ChevronDown
} from 'lucide-react';

interface StaircaseProps {
  projectId: string;
}

// المكتبة المبدئية لأسعار الرخام والجرانيت
const MARBLE_RATES: Record<string, number> = {
  'رخام إمبيرادور مستورد': 2500,
  'رخام كرارة تركي فاخر': 2200,
  'جرانيت أسود أسواني': 1800,
  'رخام تريستا بيج ممتاز': 1400
};

// المكتبة المبدئية لأسعار الدرابزين مع حقن "زجاج سيكوريت فاخر" كعنصر رسمي
const HANDRAIL_RATES: Record<string, { mat: number; lab: number }> = {
  'حديد فورجيه فاخر': { mat: 1200, lab: 600 },
  'خشب زان طبيعي': { mat: 1500, lab: 700 },
  'زجاج سيكوريت فاخر': { mat: 1800, lab: 500 }, // 👈 إضافة زجاج السيكوريت بالقيم الهندسية المحددة
  'رخام إمبيرادور': { mat: 2500, lab: 1000 }
};

export default function Staircase({ projectId }: StaircaseProps) {
  const { crmData, updateBulkFinishingSection } = useCRM();

  const [loading, setLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // مرجع لمنع تعارض الحفظ وحظر الـ Infinite Loops أثناء مزامنة البيانات سحابياً
  const isLocalChange = useRef(false);

  // الحالة الموحدة الفاخرة للتحكم في منظومة السلم الداخلي وتكسية الدرج والدرابزين
  const [state, setState] = useState({
    enabled: true,
    stairsCount: 15,
    claddingType: 'رخام إمبيرادور مستورد',
    stairMatRate: 2500,
    stairLabRate: 1500,
    
    // أعمال سور السلم (الدرابزين)
    hasHandrail: true,
    handrailType: 'حديد فورجيه فاخر',
    handrailLength: 15,
    handrailMatRate: 1200,
    handrailLabRate: 600,

    // أعمال اللوجستيات والشحن
    hasTransportation: true,
    transportationPrice: 1500,

    notes: ''
  });

  // حالة وسيطة لإدخال النصوص لمنع إرسال طلبات متعددة مع كل حرف يكتبه المستخدم
  const [notesInput, setNotesInput] = useState<string>('');

  // اقتران ومزامنة البيانات المحفوظة مسبقاً للمشروع الحالي
  useEffect(() => {
    if (crmData?.finishing?.staircase) {
      const contextData = crmData.finishing.staircase;
      isLocalChange.current = false;
      setState({
        enabled: contextData.enabled ?? true,
        stairsCount: contextData.stairsCount ?? 15,
        claddingType: contextData.claddingType ?? 'رخام إمبيرادور مستورد',
        stairMatRate: contextData.rates?.stairMatRate ?? 2500,
        stairLabRate: contextData.rates?.stairLabRate ?? 1500,
        
        hasHandrail: contextData.hasHandrail ?? true,
        handrailType: contextData.handrailType ?? 'حديد فورجيه فاخر',
        handrailLength: contextData.handrailLength ?? 15,
        handrailMatRate: contextData.handrailMatRate ?? 1200,
        handrailLabRate: contextData.handrailLabRate ?? 600,

        hasTransportation: contextData.hasTransportation ?? true,
        transportationPrice: contextData.transportationPrice ?? 1500,

        notes: contextData.notes ?? ''
      });
      setNotesInput(contextData.notes ?? '');
    }
  }, [crmData]);

  // المزامنة التلقائية والآمنة مع السياق الأب بعد اكتمال الرندر تماماً
  useEffect(() => {
    if (isLocalChange.current) {
      updateBulkFinishingSection('staircase', {
        enabled: state.enabled,
        stairsCount: state.stairsCount,
        claddingType: state.claddingType,
        hasHandrail: state.hasHandrail,
        handrailType: state.handrailType,
        handrailLength: state.handrailLength,
        handrailMatRate: state.handrailMatRate,
        handrailLabRate: state.handrailLabRate,
        hasTransportation: state.hasTransportation,
        transportationPrice: state.transportationPrice,
        notes: state.notes,
        rates: {
          stairMatRate: state.stairMatRate,
          stairLabRate: state.stairLabRate
        }
      });
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

  // معالجة تغيير وتزامن أسعار رخام السلالم المعتمد
  const handleCladdingTypeChange = (type: string) => {
    const matchedRate = MARBLE_RATES[type] ?? 2500;
    updateStateAndSave(() => ({
      claddingType: type,
      stairMatRate: matchedRate
    }));
  };

  // معالجة تغيير وتزامن أسعار درابزين وسور السلالم
  const handleHandrailTypeChange = (type: string) => {
    const matchedRates = HANDRAIL_RATES[type] || { mat: 1200, lab: 600 };
    updateStateAndSave(() => ({
      handrailType: type,
      handrailMatRate: matchedRates.mat,
      handrailLabRate: matchedRates.lab
    }));
  };

  // العمليات الحسابية والمالية التراكمية للبند
  const totalStairsMaterialsCost = state.stairsCount * state.stairMatRate;
  const totalStairsLaborCost = state.stairsCount * state.stairLabRate;

  const totalHandrailMaterialsCost = state.hasHandrail ? (state.handrailLength * state.handrailMatRate) : 0;
  const totalHandrailLaborCost = state.hasHandrail ? (state.handrailLength * state.handrailLabRate) : 0;

  const activeTransportationCost = state.enabled && state.hasTransportation ? state.transportationPrice : 0;

  const grandTotalEstimate = state.enabled 
    ? (totalStairsMaterialsCost + totalStairsLaborCost + totalHandrailMaterialsCost + totalHandrailLaborCost + activeTransportationCost)
    : 0;

  return (
    <div dir="rtl" className="space-y-8 text-right font-sans select-none">

      {/* 🌟 كارت التفعيل الموحد (TabActivationBanner) الفاخر المتناسق مع منظومة السباكة والـ ERP */}
      <TabActivationBanner 
        title="اعمال السلم الداخلي وتكسية الدرج"
        subtitle="STAIRCASE CLADDING & LOGISTICS SYSTEM"
        icon={Layers}
        enabled={state.enabled}
        onToggle={() => { updateStateAndSave(prev => ({ enabled: !prev.enabled })); }}
      />

      {/* تجميد العناصر وخفض الشفافية عند الإغلاق التام للبند */}
      <div className={`space-y-8 transition-opacity duration-300 ${state.enabled ? 'opacity-100 pointer-events-auto' : 'opacity-25 pointer-events-none filter grayscale'}`}>

        {/* لافتات بيانات الحصر المضيئة */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* اللافته 1: حصر درجات السلم */}
          <div className="p-5 rounded-3xl bg-[#020B1C]/60 border border-[#D4AF37]/30 shadow-[0_0_15px_rgba(212,175,55,0.05)] flex items-center justify-between text-right">
            <div>
              <span className="text-xs text-gray-300 font-bold block mb-1">حصر درجات السلم بالوحدة:</span>
              <span className="text-2xl font-black text-[#D4AF37] font-mono">{state.stairsCount} <span className="text-xs font-normal text-white">درجة</span></span>
            </div>
            <div className="p-3 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          {/* اللافته 2: طول مسار السور (الدرابزين) */}
          <div className="p-5 rounded-3xl bg-[#020B1C]/60 border border-[#B48C34]/30 shadow-[0_0_15px_rgba(180,140,52,0.05)] flex items-center justify-between text-right">
            <div>
              <span className="text-xs text-gray-300 font-bold block mb-1">أمتار سور الدرابزين المطلوب:</span>
              <span className="text-2xl font-black text-[#B48C34] font-mono">{state.hasHandrail ? state.handrailLength : 0} <span className="text-xs font-normal text-white">م.ط</span></span>
            </div>
            <div className="p-3 rounded-xl bg-[#B48C34]/10 text-[#B48C34]">
              <Wrench className="w-6 h-6" />
            </div>
          </div>

          {/* اللافته 3: إجمالي كلفة الرخام والجرانيت */}
          <div className="p-5 rounded-3xl bg-emerald-950/20 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)] flex items-center justify-between text-right">
            <div>
              <span className="text-xs text-emerald-400 font-bold block mb-1">إجمالي خامات التجليد والدرابزين:</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {((state.stairsCount * state.stairMatRate) + (state.hasHandrail ? (state.handrailLength * state.handrailMatRate) : 0)).toLocaleString()} <span className="text-xs font-normal text-white">ج.م</span>
              </span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* كارت أعمال تكسية درجات السلم بالرخام */}
        <div className="p-6 rounded-3xl bg-[#07132a] border border-[#D4AF37] space-y-6 shadow-xl">
          <div className="border-b border-[#D4AF37] pb-4">
            <h4 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2">أولاً: حصر وتكسية درجات السلم بالرخام والجرانيت المعتمد:</h4>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* منسدل وعداد درجات السلم */}
            <div className="lg:col-span-6 bg-[#020B1C]/60 border border-[#1f2d4d] p-5 rounded-2xl flex flex-col justify-between min-h-[145px] space-y-3">
              <div className="flex justify-between items-center text-right gap-3">
                <span className="text-xs text-white font-bold block shrink-0">تحديد نوع تكسية الدرج:</span>
                <div className="flex flex-col gap-2 w-full max-w-[240px]">
                  {/* 🌟 القابلية الكاملة لإضافة نوع مخصص للرخام في المستقبل */}
                  <select 
                    value={MARBLE_RATES[state.claddingType] !== undefined ? state.claddingType : "custom"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "custom") {
                        updateStateAndSave(() => ({ claddingType: "" })); // تصفير الحقل ليقوم بكتابة الاسم يدوياً
                      } else {
                        handleCladdingTypeChange(val);
                      }
                    }}
                    className="bg-[#07132a] border border-[#1f2d4d] rounded-lg p-2 text-xs text-[#D4AF37] font-bold outline-none cursor-pointer focus:border-[#D4AF37] w-full"
                  >
                    {Object.keys(MARBLE_RATES).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                    <option value="custom">✍️ إضافة نوع مخصص...</option>
                  </select>
                  
                  {/* حقل الإضافة اليدوي المخصص للرخام في حال تفعيل الخيار مسبقاً */}
                  {!(state.claddingType in MARBLE_RATES) && (
                    <input 
                      type="text"
                      value={state.claddingType}
                      placeholder="اكتب نوع البند المخصص..."
                      onChange={(e) => updateStateAndSave(() => ({ claddingType: e.target.value }))}
                      className="bg-[#020B1C] border border-[#1f2d4d] rounded-lg p-2 text-xs text-[#F0E6D2] outline-none focus:border-[#D4AF37] w-full"
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center text-right border-t border-[#1f2d4d]/40 pt-3">
                <span className="text-xs text-white font-bold">عدد الدرجات بالوحدة:</span>
                <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-36">
                  <button type="button" onClick={() => updateStateAndSave(prev => ({ stairsCount: prev.stairsCount + 1 }))} className="w-7 h-7 rounded-lg bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">+</button>
                  <span className="text-base font-black text-white font-mono">{state.stairsCount}</span>
                  <button type="button" onClick={() => updateStateAndSave(prev => ({ stairsCount: Math.max(0, prev.stairsCount - 1) }))} className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">-</button>
                </div>
              </div>
            </div>

            {/* عدادات أجر وكمية مصنعية وخامات الدرجة */}
            <div className="lg:col-span-6 bg-[#020B1C]/60 border border-[#1f2d4d] p-5 rounded-2xl flex flex-col justify-between min-h-[145px] space-y-4">
              <span className="text-sm font-bold text-[#D4AF37] block text-right"> تكلفة السلم والتركيب للدرجة الفردية:</span>
              
              <div className="grid grid-cols-2 gap-4">
                
                {/* عداد خامات الرخام */}
                <div className="p-3 rounded-xl bg-[#07132a] border border-[#1f2d4d]/60 flex flex-col justify-between gap-1 text-right select-none" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[10px] text-white font-bold block mb-1">تكلفة خامة الدرجة:</span>
                  <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-lg h-9 px-1.5 w-full">
                    <button type="button" onClick={() => updateStateAndSave(prev => ({ stairMatRate: prev.stairMatRate + 50 }))} className="w-5 h-5 rounded bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-[9px] flex items-center justify-center cursor-pointer">+</button>
                    <span className="text-xs font-bold text-white font-mono">{state.stairMatRate}</span>
                    <button type="button" onClick={() => updateStateAndSave(prev => ({ stairMatRate: Math.max(0, prev.stairMatRate - 50) }))} className="w-5 h-5 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-bold text-[9px] flex items-center justify-center cursor-pointer">-</button>
                  </div>
                </div>

                {/* عداد مصنعية التركيب */}
                <div className="p-3 rounded-xl bg-[#07132a] border border-[#1f2d4d]/60 flex flex-col justify-between gap-1 text-right select-none" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[10px] text-white font-bold block mb-1">مصنعية تركيب الدرجة:</span>
                  <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-lg h-9 px-1.5 w-full">
                    <button type="button" onClick={() => updateStateAndSave(prev => ({ stairLabRate: prev.stairLabRate + 50 }))} className="w-5 h-5 rounded bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-[9px] flex items-center justify-center cursor-pointer">+</button>
                    <span className="text-xs font-bold text-white font-mono">{state.stairLabRate}</span>
                    <button type="button" onClick={() => updateStateAndSave(prev => ({ stairLabRate: Math.max(0, prev.stairLabRate - 50) }))} className="w-5 h-5 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-bold text-[9px] flex items-center justify-center cursor-pointer">-</button>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* كارت أعمال سور السلم والدرابزين (Handrail Card) تفاعلي بالكامل */}
        <div 
          onClick={() => {
            updateStateAndSave(prev => ({ hasHandrail: !prev.hasHandrail }));
          }}
          className={`p-6 rounded-3xl border transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[180px] select-none ${
            state.hasHandrail 
              ? 'border-[#D4AF37] bg-gradient-to-r from-[#07132a] to-[#D4AF37]/5 shadow-[0_0_15px_rgba(212,175,55,0.06)] opacity-100' 
              : 'border-[#1f2d4d] bg-[#020B1C]/40 opacity-40 hover:opacity-100'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#1f2d4d]/30 pb-4">
            <div className="flex items-center gap-4 text-right">
              <div className={`p-3 rounded-2xl ${state.hasHandrail ? 'bg-[#D4AF37] text-[#020B1C]' : 'bg-[#1f2d4d] text-gray-500'}`}>
                <Wrench className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-[#D4AF37]">درابزين وسور السلم الداخلي</h4>
                <p className="text-xs text-white mt-1">توليد حركي لأمتار السور المعتمد بالخامات (حديد، رخام، خشب، زجاج)  </p>
              </div>
            </div>
            
            {/* 🌟 القائمة المنسدلة لاختيار نوع السور تفاعلياً مع تمكين خيارات الإضافة المستقبلية */}
            <div className="flex flex-col gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 font-bold">نوع سور السلم:</span>
                <select 
                  disabled={!state.hasHandrail}
                  value={HANDRAIL_RATES[state.handrailType] !== undefined ? state.handrailType : "custom"}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "custom") {
                      updateStateAndSave(() => ({ handrailType: "" })); // تصفير الحقل للكتابة اليدوية
                    } else {
                      handleHandrailTypeChange(val);
                    }
                  }}
                  className="bg-[#020B1C] border border-[#1f2d4d] rounded-lg p-2 text-xs text-[#D4AF37] font-bold outline-none cursor-pointer focus:border-[#D4AF37]"
                >
                  {Object.keys(HANDRAIL_RATES).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                  <option value="custom">✍️ إضافة نوع مخصص...</option>
                </select>
              </div>

              {/* حقل الإدخال اليدوي المخصص لنوع السور والدرابزين مستقبلياً */}
              {state.hasHandrail && !(state.handrailType in HANDRAIL_RATES) && (
                <input 
                  type="text"
                  value={state.handrailType}
                  placeholder="اكتب نوع الدرابزين المخصص..."
                  onChange={(e) => updateStateAndSave(() => ({ handrailType: e.target.value }))}
                  className="bg-[#020B1C] border border-[#1f2d4d] rounded-lg p-2 text-xs text-[#F0E6D2] outline-none focus:border-[#D4AF37] w-full"
                />
              )}
            </div>
          </div>

          {state.hasHandrail && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4" onClick={(e) => e.stopPropagation()}>
              
              {/* عداد مسار وطول السور */}
              <div className="p-4 rounded-xl bg-[#020B1C]/60 border border-[#1f2d4d] flex flex-col justify-between min-h-[110px] space-y-2 text-right">
                <span className="text-xs font-bold text-[#D4AF37] block">طول السور (متر طولي):</span>
                <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none hover:border-[#D4AF37]/30 transition-all">
                  <button type="button" onClick={() => updateStateAndSave(prev => ({ handrailLength: prev.handrailLength + 1 }))} className="w-7 h-7 rounded-lg bg-[#020B1C] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">+</button>
                  <span className="text-base font-black text-white font-mono">{state.handrailLength}</span>
                  <button type="button" onClick={() => updateStateAndSave(prev => ({ handrailLength: Math.max(1, prev.handrailLength - 1) }))} className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">-</button>
                </div>
              </div>

              {/* عداد سعر خامة السور */}
              <div className="p-4 rounded-xl bg-[#020B1C]/60 border border-[#1f2d4d] flex flex-col justify-between min-h-[110px] space-y-2 text-right">
                <span className="text-xs font-bold text-[#D4AF37] block">تكلفة خامة المتر طولي:</span>
                <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none hover:border-[#D4AF37]/30 transition-all">
                  <button type="button" onClick={() => updateStateAndSave(prev => ({ handrailMatRate: prev.handrailMatRate + 50 }))} className="w-7 h-7 rounded-lg bg-[#020B1C] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">+</button>
                  <span className="text-base font-black text-white font-mono">{state.handrailMatRate} <span className="text-[10px] text-gray-500">ج</span></span>
                  <button type="button" onClick={() => updateStateAndSave(prev => ({ handrailMatRate: Math.max(0, prev.handrailMatRate - 50) }))} className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">-</button>
                </div>
              </div>

              {/* عداد مصنعية تركيب السور */}
              <div className="p-4 rounded-xl bg-[#020B1C]/60 border border-[#1f2d4d] flex flex-col justify-between min-h-[110px] space-y-2 text-right">
                <span className="text-xs font-bold text-[#D4AF37] block">مصنعية تركيب المتر طولي:</span>
                <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none hover:border-[#D4AF37]/30 transition-all">
                  <button type="button" onClick={() => updateStateAndSave(prev => ({ handrailLabRate: prev.handrailLabRate + 50 }))} className="w-7 h-7 rounded-lg bg-[#020B1C] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">+</button>
                  <span className="text-base font-black text-white font-mono">{state.handrailLabRate} <span className="text-[10px] text-gray-500">ج</span></span>
                  <button type="button" onClick={() => updateStateAndSave(prev => ({ handrailLabRate: Math.max(0, prev.handrailLabRate - 50) }))} className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">-</button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* كارت كماليات نقل وتشوين الرخام والجرانيت بالدور */}
        <div 
          onClick={() => {
            if (!state.enabled) return;
            updateStateAndSave(prev => ({ hasTransportation: !prev.hasTransportation }));
          }}
          className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col sm:flex-row items-center justify-between gap-6 select-none ${
            state.enabled ? 'cursor-pointer' : 'cursor-not-allowed'
          } ${
            state.hasTransportation && state.enabled
              ? 'border-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_20px_rgba(212,175,55,0.08)] opacity-100' 
              : 'border-[#1f2d4d] bg-[#020B1C]/40 opacity-40 hover:opacity-100'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-xl border transition-all duration-300 flex-shrink-0 ${
              state.hasTransportation && state.enabled ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-[#020B1C] border-[#1f2d4d] text-gray-500'
            }`}>
              <Truck className="w-8 h-8" />
            </div>
            <div className="text-right">
              <h4 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2">تكاليف النقل وتشوين الرخام والدرج بالدور</h4>
              <p className="text-xs text-white mt-1">تأمين نقل الألواح والرخام وتشوينها يدوياً للأدوار لسلامة الرخام والوزرة من الخدش والكسر :</p>
              
              {/* عداد تكاليف نقل وتشوين الرخام */}
              <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-10 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-44">
                  <button
                    type="button"
                    disabled={!state.hasTransportation || !state.enabled}
                    onClick={() => updateStateAndSave(prev => ({ transportationPrice: prev.transportationPrice + 100 }))}
                    className="w-6 h-6 rounded bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center"
                  >
                    +
                  </button>
                  <span className="text-sm font-bold text-white font-mono">
                    {state.transportationPrice.toLocaleString()} <span className="text-[9px] text-gray-500 font-normal">ج.م</span>
                  </span>
                  <button
                    type="button"
                    disabled={!state.hasTransportation || !state.enabled}
                    onClick={() => updateStateAndSave(prev => ({ transportationPrice: Math.max(0, prev.transportationPrice - 100) }))}
                    className="w-6 h-6 rounded bg-[#07132a] text-gray-400 hover:bg-red-500 hover:text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center"
                  >
                    -
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="text-center sm:text-left min-w-[145px] border-t sm:border-t-0 sm:border-r border-[#1f2d4d]/40 pt-4 sm:pt-0 sm:pr-6 w-full sm:w-auto select-none text-right">
            <span className="text-xs text-gray-300 block font-semibold">تكلفة التشوين المعتمدة:</span>
            <span className="text-2xl font-black text-[#D4AF37] font-mono">{activeTransportationCost.toLocaleString('en-US')} ج.م</span>
          </div>
        </div>

        {/* صندوق الملاحظات المذهب الفاخر المدمج */}
        <div className="p-6 rounded-2xl bg-[#07132a] border border-[#D4AF37] space-y-3">
          <div className="flex items-center gap-2 text-[#D4AF37] border-b border-[#D4AF37] pb-2 text-right">
            <FileText className="w-5 h-5" />
            <h4 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2">اتفاقات وبنود مخصصة لأعمال وتجليد السلم الداخلي :</h4>
          </div>
          <textarea
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="اكتب هنا مواصفات الدرابزين الحديد (الفورجيه) أو الزجاج السيكوريت المعتمد، شروط صب وتجهيز فخذ السلم، تفاصيل الإضاءة المخفية لدرجات السلم (شريط الليد) للعمال..."
            className="w-full h-24 p-4 rounded-xl bg-[#020B1C] border border-[#1f2d4d] hover:border-[#D4AF37]/50 focus:border-[#D4AF37] text-lg text-[#F0E6D2] placeholder-gray-500 outline-none transition-all resize-none text-base leading-relaxed text-right font-semibold"
          />
          <div className="flex justify-between items-center text-xs text-gray-500 px-1">
            <span>يتم الحفظ تلقائياً بمجرد الخروج من حقل الكتابة</span>
            <span>حالة الاتصال: متصل </span>
          </div>
        </div>

        {/* 🌟 كارت الملخص المالي النهائي بعد تكبيره وتفخيمه ليتطابق مع القوانين الأرستقراطية للنظام */}
       <div className="p-5 rounded-xl bg-[#020B1C] border border-[#D4AF37]/30 shadow-[0_0_20px_rgba(212,175,55,0.05)] flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden font-alexandria">
          <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[#D4AF37]" />
          <div className="space-y-1 text-center sm:text-right pr-1 select-none">
            <h4 className="text-lg font-bold text-[#D4AF37]">الملخص المالي النهائي المعتمد لأعمال السلم الداخلي بالـ BOQ:</h4>
            <p className="text-xs text-white font-normal leading-relaxed max-w-2xl text-right">
              الاحتساب التلقائي اللحظي يمثل: مجموع كلفة أعمال تكسية الدرج رخام/جرانيت ({totalStairsMaterialsCost + totalStairsLaborCost} ج.م) وأعمال أمتار سور السلم والدرابزين الفاخر والآمن للوحدة ({totalHandrailMaterialsCost + totalHandrailLaborCost} ج.م) شاملة أجور النقل وتشوين المواد.
            </p>
          </div>

       <div className="flex items-center gap-3 bg-[#07132a] px-6 py-4 rounded-lg border border-[#1f2d4d]">
                   <div className="p-1.5 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
                     <DollarSign className="w-6 h-6" />
                   </div>
                   <div className="text-right">
              <span className="text-[10px] text-white block font-semibold text-right">إجمالي تكلفة أعمال السلم:</span>
             <span className="text-2xl font-black text-[#D4AF37] font-mono">
                {grandTotalEstimate.toLocaleString('en-US')} <span className="text-xs font-normal">ج.م</span>
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}