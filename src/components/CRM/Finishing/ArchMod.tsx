"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from "../context/CRMContext";

import { supabase } from "@/lib/supabaseClient";
import TabActivationBanner from './TabActivationBanner'; // 👈 استدعاء المكون المشترك الموحد للأجهزة اللمسية للشركة
import { 
  Plus, 
  Minus, 
  ArrowLeftRight, 
  FileText, 
  Truck, 
  HardHat, 
  Ruler,
  CheckCircle2,
  Lock,
  DollarSign
} from 'lucide-react';

interface ArchModProps {
  projectId: string;
}

export default function ArchMod({ projectId }: ArchModProps) {
  const { crmData, updateBulkFinishingSection } = useCRM();

  const [isSaving, setIsSaving] = useState<boolean>(false);

  const isLocalChange = useRef(false);
  const didSeedDefaults = useRef(false);

  const [state, setState] = useState({
    enabled: true,
    demolitionQty: 10,
    demolitionLab: 3000,
    demolitionMat: 2000,
    notes: ''
  });

  const [notesInput, setNotesInput] = useState<string>('');

  useEffect(() => {
    const contextData = crmData?.finishing?.archMod;

    if (contextData) {
      isLocalChange.current = false;
      setState({
        enabled: contextData.enabled ?? true,
        notes: contextData.notes ?? '',
        demolitionQty: contextData.demolitionQty ?? 10,
        demolitionMat: contextData.rates?.demolitionMat ?? 2000,
        demolitionLab: contextData.rates?.demolitionLab ?? 3000
      });
      setNotesInput(contextData.notes ?? '');
    } else if (crmData && !didSeedDefaults.current) {
      didSeedDefaults.current = true;
      updateBulkFinishingSection('archMod', {
        enabled: true,
        demolitionQty: 10,
        openingsQty: 0,
        notes: '',
        rates: {
          demolitionMat: 2000,
          demolitionLab: 3000,
          openingsMat: 0,
          openingsLab: 0
        }
      });
    }
  }, [crmData]);

  useEffect(() => {
    if (isLocalChange.current) {
      updateBulkFinishingSection('archMod', {
        enabled: state.enabled,
        demolitionQty: state.demolitionQty,
        openingsQty: 0, 
        notes: state.notes,
        rates: {
          demolitionMat: state.demolitionMat,
          demolitionLab: state.demolitionLab,
          openingsMat: 0,
          openingsLab: 0
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

  const totalDemoCost = state.demolitionLab + state.demolitionMat;

  return (
    <div dir="rtl" className="space-y-8 text-right font-alexandria">
      
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800;900&display=swap');
        
        .font-alexandria {
          font-family: 'Alexandria', Arial, sans-serif !important;
          letter-spacing: normal !important;
        }
      `}</style>

      {/* 🌟 تم تسييل واستدعاء البار المنزلق اللمسي الموحد (TabActivationBanner) كبديل للبار الضخم القديم */}
      <TabActivationBanner 
        title="أعمال التعديل المعماري الفنية"
        subtitle="Architectural Modifications & Demolition Management"
        icon={ArrowLeftRight}
        enabled={state.enabled}
        onToggle={() => { updateStateAndSave(prev => ({ enabled: !prev.enabled })); }}
      />

      {state.enabled && (
        <div className="space-y-8 animate-fade-in">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* الكارت 1: مساحة التعديلات التقديرية */}
            <div className="p-6 rounded-2xl border border-[#1f2d4d] bg-[#020B1C]/40 hover:border-[#D4AF37]/40 hover:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all duration-300 flex flex-col justify-between min-h-[160px] group">
              <div className="flex items-center justify-between border-b border-[#D4AF37] pb-3 select-none">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-[#D4AF37] group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-[#D4AF37]">مساحة التعديلات التقديرية</span>
                </div>
              </div>

              {/* 🎯 تعديل عداد مساحة الهدم ليتوافق بكسلياً بارتفاع h-11 والدواير الرشيقة w-6 h-6 مع دستور الـ ERP */}
              <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none" dir="ltr">
                <button 
                  onClick={() => updateStateAndSave(prev => ({ demolitionQty: Math.max(0, prev.demolitionQty - 1) }))}
                  className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                >
                  <Minus size={12} className="stroke-[3]" />
                </button>
                <div className="text-center font-bold">
                   <span className="text-sm font-black text-[#D4AF37] font-mono min-w-[80px] text-center">
                    {state.demolitionQty}
                    <span className="text-xs text-gray-500 font-normal ml-2">متر </span>
                   </span>
                  
                </div>
                <button 
                  onClick={() => updateStateAndSave(prev => ({ demolitionQty: prev.demolitionQty + 1 }))}
                  className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                >
                  <Plus size={12} className="stroke-[3]" />
                </button>
              </div>
            </div>

            {/* الكارت 2: إجمالي مصنعية التكسير */}
            <div className="p-6 rounded-2xl border border-[#1f2d4d] bg-[#020B1C]/40 hover:border-[#D4AF37]/40 hover:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all duration-300 flex flex-col justify-between min-h-[160px] group">
              <div className="flex items-center justify-between border-b border-[#D4AF37] pb-3 select-none">
                <div className="flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-[#D4AF37] group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-[#D4AF37]">إجمالي مصنعية التكسير</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-[9px] font-bold">مقطوعية</span>
              </div>

              {/* 🎯 تعديل عداد مصنعية مقطوعية هدم ليتوافق بكسلياً بارتفاع h-11 والدواير الرشيقة w-6 h-6 مع دستور الـ ERP */}
              <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none" dir="ltr">
                <button 
                  onClick={() => updateStateAndSave(prev => ({ demolitionLab: Math.max(0, prev.demolitionLab - 500) }))}
                  className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                >
                  <Minus size={12} className="stroke-[3]" />
                </button>
                <div className="text-center font-bold">
                   <span className="text-sm font-black text-[#D4AF37] font-mono">{state.demolitionLab.toLocaleString()}</span>
                   <span className="text-xs text-gray-500 font-normal ml-2">ج.م</span>
                </div>
                <button 
                  onClick={() => updateStateAndSave(prev => ({ demolitionLab: prev.demolitionLab + 500 }))}
                  className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                >
                  <Plus size={12} className="stroke-[3]" />
                </button>
              </div>
            </div>

            {/* الكارت 3: تكاليف النقل والتشوين */}
            <div className="p-6 rounded-2xl border border-[#1f2d4d] bg-[#020B1C]/40 hover:border-[#D4AF37]/40 hover:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all duration-300 flex flex-col justify-between min-h-[160px] group">
              <div className="flex items-center justify-between border-b border-[#D4AF37] pb-3 select-none">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#D4AF37] group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-[#D4AF37]">تكاليف النقل والتشوين</span>
                </div>
                <span className=" px-2 py-0.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-[9px] font-bold">مقطوعية</span>
              </div>

              {/* 🎯 تعديل عداد تكاليف نقل وتفريغ لوجستي للأنقاض ليتوافق بكسلياً بارتفاع h-11 والدواير الرشيقة w-6 h-6 مع دستور الـ ERP */}
              <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none" dir="ltr">
                <button 
                  onClick={() => updateStateAndSave(prev => ({ demolitionMat: Math.max(0, prev.demolitionMat - 500) }))}
                  className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                >
                  <Minus size={12} className="stroke-[3]" />
                </button>
                <div className="text-center font-bold">
                   <span className="text-sm font-black text-[#D4AF37] font-mono">{state.demolitionMat.toLocaleString()}</span>
                   <span className="text-[10px] text-gray-500 font-normal ml-2">ج.م</span>
                </div>
                <button 
                  onClick={() => updateStateAndSave(prev => ({ demolitionMat: prev.demolitionMat + 500 }))}
                  className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                >
                  <Plus size={12} className="stroke-[3]" />
                </button>
              </div>
            </div>

          </div>

          <div className="p-6 rounded-2xl bg-[#07132a] border border-[#D4AF37] space-y-4">
            <div className="flex items-center gap-2 text-[#D4AF37] border-b border-[#D4AF37] pb-3 select-none">
              <FileText className="w-5 h-5" />
              <h4 className="text-lg font-bold text-[#D4AF37]">ملاحظات وبنود مخصصة للتعديلات المعمارية :</h4>
            </div>
            <textarea
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              onBlur={() => {
                updateStateAndSave(prev => ({ notes: notesInput }));
              }}
              placeholder="اكتب مواصفات الهدم، نوع المخلفات، أو مواصفات خاصة بتفريغ وتحميل الأنقاض للعمال..."
              className="w-full h-24 p-5 rounded-2xl bg-[#020B1C] border border-[#1f2d4d] hover:border-[#D4AF37]/50 focus:border-[#D4AF37] text-lg text-[#F0E6D2] placeholder-gray-600 outline-none transition-all resize-none leading-relaxed"
            />
            <div className="flex justify-between items-center text-xs text-gray-500 px-1 select-none">
              <span>يتم الحفظ تلقائياً بمجرد الخروج من حقل الكتابة</span>
              <span>حالة الاتصال: متصل </span>
            </div>
          </div>

          {/* 🌟 تم إعادة هيكلة وتطوير كارت خلاصة الأعمال والملخص المالي النهائي ليطابق كلياً نمط التكييف المعتمد بالمنظومة */}
          <div className="p-5 rounded-xl bg-[#020B1C] border border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.05)] flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[#D4AF37]" />

            <div className="space-y-1 text-center sm:text-right pr-1">
              <h4 className="text-lg font-bold text-[#D4AF37]">الملخص المالي المعتمد لبند أعمال الهدم والتعديلات المعمارية:</h4>
              <p className="text-xs text-white font-normal leading-relaxed max-w-2xl">
                تقدير كلي شامل {state.demolitionQty} أمتار طولي هدم حوائط، موزعة على تكلفة فنية مقطوعية بقيمة ({state.demolitionLab.toLocaleString()} ج.م) وتكاليف لوجستية للتنظيف والتشوين مقطوعية بقيمة ({state.demolitionMat.toLocaleString()} ج.م).
              </p>
            </div>

            <div className="flex items-center gap-3 bg-[#07132a] px-6 py-4 rounded-lg border border-[#1f2d4d]">
              <div className="p-1.5 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
                <DollarSign className="w-6 h-6" />
              </div>
              <div className="text-right">
                <span className="text-[10px] text-white block font-semibold">الإجمالي المعتمد للتعديلات:</span>
                <span className="text-2xl font-black text-[#D4AF37] font-mono">
                  {totalDemoCost.toLocaleString('en-US')} <span className="text-xs font-normal">ج.م</span>
                </span>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}