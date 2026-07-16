"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from "../context/CRMContext";
import { supabase } from '@/lib/supabaseClient';
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
  Droplet
} from 'lucide-react';

interface StaircaseProps {
  projectId: string;
}

const MARBLE_RATES: Record<string, number> = {
  'رخام إمبيرادور مستورد': 2500,
  'رخام كرارة تركي فاخر': 2200,
  'جرانيت أسود أسواني': 1800,
  'رخام تريستا بيج ممتاز': 1400
};

const HANDRAIL_RATES: Record<string, { mat: number; lab: number }> = {
  'حديد فورجيه فاخر': { mat: 1200, lab: 600 },
  'خشب زان طبيعي': { mat: 1500, lab: 700 },
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

      {/* كارت التفعيل الرئيسي (On / Off) ذو الطابع الفاخر والماوس اليد المضيء */}
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
            <Layers className="w-10 h-10" />
          </div>
          <div className="text-right">
            <h3 className="text-xl font-black text-[#F0E6D2]">منظومة السلم الداخلي وتكسية الدرج</h3>
            <p className="text-[11px] text-gray-400 mt-1 uppercase font-bold tracking-widest leading-none">STAIRCASE CLADDING & LOGISTICS SYSTEM</p>
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
          {state.enabled ? 'القسم مفعل' : 'القسم مقفل'}
        </div>
      </div>

      {/* تجميد بقية العناصر وخفض الشفافية عند الإغلاق التام للبند */}
      <div className={`space-y-8 transition-opacity duration-300 ${state.enabled ? 'opacity-100 pointer-events-auto' : 'opacity-25 pointer-events-none filter grayscale'}`}>

        {/* 2. الـ 3 لافتات المضيئة (Glowing dashboard stats) لبيانات الحصر */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* اللافته 1: حصر درجات السلم */}
          <div className="p-5 rounded-3xl bg-[#020B1C]/60 border border-[#D4AF37]/30 shadow-[0_0_15px_rgba(212,175,55,0.05)] flex items-center justify-between text-right">
            <div>
              <span className="text-xs text-gray-500 font-bold block mb-1">حصر درجات السلم بالوحدة:</span>
              <span className="text-2xl font-black text-[#D4AF37] font-mono">{state.stairsCount} <span className="text-xs font-normal text-white">درجة</span></span>
            </div>
            <div className="p-3 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          {/* اللافته 2: طول مسار السور (الدرابزين) */}
          <div className="p-5 rounded-3xl bg-[#020B1C]/60 border border-[#B48C34]/30 shadow-[0_0_15px_rgba(180,140,52,0.05)] flex items-center justify-between text-right">
            <div>
              <span className="text-xs text-gray-500 font-bold block mb-1">أمتار سور الدرابزين المطلوب:</span>
              <span className="text-2xl font-black text-[#B48C34] font-mono">{state.hasHandrail ? state.handrailLength : 0} <span className="text-xs font-normal text-white">م.ط</span></span>
            </div>
            <div className="p-3 rounded-xl bg-[#B48C34]/10 text-[#B48C34]">
              <Wrench className="w-6 h-6" />
            </div>
          </div>

          {/* اللافته 3: إجمالي كلفة الرخام والجرانيت المضيء بالأخضر */}
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

        {/* 3. كارت أعمال تكسية درجات السلم بالرخام المستورد والعدادات */}
        <div className="p-6 rounded-3xl bg-[#07132a] border border-[#1f2d4d] space-y-6 shadow-xl">
          <div className="border-b border-[#1f2d4d]/40 pb-4">
            <h4 className="text-lg font-black text-[#D4AF37]">أولاً: حصر وتكسية درجات السلم بالرخام والجرانيت المعتمد:</h4>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* منسدل وعداد درجات السلم */}
            <div className="lg:col-span-6 bg-[#020B1C]/60 border border-[#1f2d4d] p-5 rounded-2xl flex flex-col justify-between min-h-[145px] space-y-3">
              <div className="flex justify-between items-center text-right">
                <span className="text-xs text-gray-500 font-bold block">تحديد نوع تكسية الدرج:</span>
                <select 
                  value={state.claddingType}
                  onChange={(e) => handleCladdingTypeChange(e.target.value)}
                  className="bg-[#07132a] border border-[#1f2d4d] rounded-lg p-2 text-xs text-[#D4AF37] font-bold outline-none cursor-pointer focus:border-[#D4AF37]"
                >
                  <option value="رخام إمبيرادور مستورد">رخام إمبيرادور مستورد</option>
                  <option value="رخام كرارة تركي فاخر">رخام كرارة تركي فاخر</option>
                  <option value="جرانيت أسود أسواني">جرانيت أسود أسواني</option>
                  <option value="رخام تريستا بيج ممتاز">رخام تريستا بيج ممتاز</option>
                </select>
              </div>

              <div className="flex justify-between items-center text-right border-t border-[#1f2d4d]/40 pt-3">
                <span className="text-xs text-gray-500 font-bold">عدد الدرجات بالوحدة:</span>
                <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-36">
                  <button type="button" onClick={() => updateStateAndSave(prev => ({ stairsCount: prev.stairsCount + 1 }))} className="w-7 h-7 rounded-lg bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">+</button>
                  <span className="text-base font-black text-white font-mono">{state.stairsCount}</span>
                  <button type="button" onClick={() => updateStateAndSave(prev => ({ stairsCount: Math.max(0, prev.stairsCount - 1) }))} className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">-</button>
                </div>
              </div>
            </div>

            {/* عدادات أجر وكمية مصنعية وخامات الدرجة */}
            <div className="lg:col-span-6 bg-[#020B1C]/60 border border-[#1f2d4d] p-5 rounded-2xl flex flex-col justify-between min-h-[145px] space-y-4">
              <span className="text-sm font-bold text-[#F0E6D2] block text-right">تحرير كلفة السلم والتركيب تفاعلياً للدرجة الفردية:</span>
              
              <div className="grid grid-cols-2 gap-4">
                
                {/* عداد خامات الرخام */}
                <div className="p-3 rounded-xl bg-[#07132a] border border-[#1f2d4d]/60 flex flex-col justify-between gap-1 text-right select-none" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[10px] text-gray-500 font-bold block mb-1">تكلفة خامة الدرجة:</span>
                  <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-lg h-9 px-1.5 w-full">
                    <button type="button" onClick={() => updateStateAndSave(prev => ({ stairMatRate: prev.stairMatRate + 50 }))} className="w-5 h-5 rounded bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-[9px] flex items-center justify-center cursor-pointer">+</button>
                    <span className="text-xs font-bold text-white font-mono">{state.stairMatRate}</span>
                    <button type="button" onClick={() => updateStateAndSave(prev => ({ stairMatRate: Math.max(0, prev.stairMatRate - 50) }))} className="w-5 h-5 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-bold text-[9px] flex items-center justify-center cursor-pointer">-</button>
                  </div>
                </div>

                {/* عداد مصنعية التركيب */}
                <div className="p-3 rounded-xl bg-[#07132a] border border-[#1f2d4d]/60 flex flex-col justify-between gap-1 text-right select-none" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[10px] text-gray-500 font-bold block mb-1">مصنعية تركيب الدرجة:</span>
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

        {/* 4. كارت أعمال سور السلم والدرابزين (Handrail Card) تفاعلي بالكامل ومبدلات */}
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
                <h4 className="text-lg font-bold text-[#F0E6D2]">درابزين وسور السلم الداخلي</h4>
                <p className="text-xs text-gray-500 mt-1">توليد حركي لأمتار السور المعتمد بالخامات (حديد، رخام، خشب) لتجنب السقوط بالموقع</p>
              </div>
            </div>
            
            {/* القائمة المنسدلة لاختيار نوع السور تفاعلياً */}
            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <span className="text-xs text-gray-500 font-bold">نوع سور السلم:</span>
              <select 
                disabled={!state.hasHandrail}
                value={state.handrailType}
                onChange={(e) => handleHandrailTypeChange(e.target.value)}
                className="bg-[#020B1C] border border-[#1f2d4d] rounded-lg p-2 text-xs text-[#D4AF37] font-bold outline-none cursor-pointer focus:border-[#D4AF37]"
              >
                <option value="حديد فورجيه فاخر">حديد فورجيه فاخر ⚔️</option>
                <option value="خشب زان طبيعي">خشب زان طبيعي 🪵</option>
                <option value="رخام إمبيرادور">رخام إمبيرادور مستورد 🧱</option>
              </select>
            </div>
          </div>

          {state.hasHandrail && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4" onClick={(e) => e.stopPropagation()}>
              
              {/* عداد مسار وطول السور */}
              <div className="p-4 rounded-xl bg-[#020B1C]/60 border border-[#1f2d4d] flex flex-col justify-between min-h-[110px] space-y-2 text-right">
                <span className="text-xs font-bold text-[#F0E6D2] block">طول السور (متر طولي):</span>
                <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none hover:border-[#D4AF37]/30 transition-all">
                  <button type="button" onClick={() => updateStateAndSave(prev => ({ handrailLength: prev.handrailLength + 1 }))} className="w-7 h-7 rounded-lg bg-[#020B1C] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">+</button>
                  <span className="text-base font-black text-white font-mono">{state.handrailLength}</span>
                  <button type="button" onClick={() => updateStateAndSave(prev => ({ handrailLength: Math.max(1, prev.handrailLength - 1) }))} className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">-</button>
                </div>
              </div>

              {/* عداد سعر خامة السور */}
              <div className="p-4 rounded-xl bg-[#020B1C]/60 border border-[#1f2d4d] flex flex-col justify-between min-h-[110px] space-y-2 text-right">
                <span className="text-xs font-bold text-[#F0E6D2] block">تكلفة خامة المتر طولي:</span>
                <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none hover:border-[#D4AF37]/30 transition-all">
                  <button type="button" onClick={() => updateStateAndSave(prev => ({ handrailMatRate: prev.handrailMatRate + 50 }))} className="w-7 h-7 rounded-lg bg-[#020B1C] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">+</button>
                  <span className="text-base font-black text-white font-mono">{state.handrailMatRate} <span className="text-[10px] text-gray-500">ج</span></span>
                  <button type="button" onClick={() => updateStateAndSave(prev => ({ handrailMatRate: Math.max(0, prev.handrailMatRate - 50) }))} className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">-</button>
                </div>
              </div>

              {/* عداد مصنعية تركيب السور */}
              <div className="p-4 rounded-xl bg-[#020B1C]/60 border border-[#1f2d4d] flex flex-col justify-between min-h-[110px] space-y-2 text-right">
                <span className="text-xs font-bold text-[#F0E6D2] block">مصنعية تركيب المتر طولي:</span>
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
              <h4 className="text-xl font-bold text-[#F0E6D2]">تكاليف النقل وتشوين الرخام والدرج بالدور</h4>
              <p className="text-xs text-gray-400 mt-1">تأمين نقل الألواح والرخام وتشوينها يدوياً للأدوار لسلامة الرخام والوزرة من الخدش والكسر، حرّرها يدوياً:</p>
              
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
            <span className="text-xs text-gray-500 block font-semibold">كلفة التشوين المعتمدة:</span>
            <span className="text-2xl font-black text-[#D4AF37] font-mono">{activeTransportationCost.toLocaleString('en-US')} ج.م</span>
          </div>
        </div>

        {/* صندوق الملاحظات المذهب الفاخر المدمج */}
        <div className="p-6 rounded-2xl bg-[#07132a] border border-[#1f2d4d] space-y-3">
          <div className="flex items-center gap-2 text-[#D4AF37] border-b border-[#1f2d4d] pb-2 text-right">
            <FileText className="w-5 h-5" />
            <h4 className="text-base font-bold">اتفاقات وبنود مخصصة لأعمال وتجليد السلم الداخلي (اتفاقات العقد):</h4>
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
            <span>حالة الاتصال: متصل وسحابي</span>
          </div>
        </div>

        {/* كارت الملخص المالي النهائي الموحد الفاخر والمقتبس تماماً من كارت الكهرباء */}
        <div className="p-6 rounded-2xl bg-[#020B1C] border border-[#D4AF37]/30 shadow-[0_0_25px_rgba(212,175,55,0.06)] flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
          
          {/* تصميم مذهب جانبي يعكس الطراز الملكي الفخم لشركة جولد ديكوريشن */}
          <div className="absolute right-0 top-0 bottom-0 w-2 bg-[#D4AF37]" />

          <div className="space-y-1 text-center sm:text-right pr-2">
            <h4 className="text-xl font-bold text-[#D4AF37]">الملخص المالي التقديري لبند أعمال السلم الداخلي:</h4>
            <p className="text-sm text-gray-400">البيانات الإجمالية واللوجستيات والمون والمصنعيات وحصر أمتار الدرابزين ترحل حركياً لحسابات المقايسة الكلية للعميل</p>
          </div>

          <div className="flex items-center gap-4 bg-[#07132a] px-8 py-5 rounded-xl border border-[#1f2d4d]">
            <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
              <DollarSign className="w-8 h-8 animate-pulse" />
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 block font-semibold text-right">إجمالي تكلفة أعمال السلم المقدرة:</span>
              <span className="text-3xl font-black text-[#F0E6D2] font-mono">
                {grandTotalEstimate.toLocaleString('en-US')} <span className="text-sm font-normal text-[#D4AF37]">ج.م</span>
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}