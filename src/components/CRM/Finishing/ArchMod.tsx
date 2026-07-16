"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from "../context/CRMContext";
import { 
  Plus, 
  Minus, 
  ArrowLeftRight, 
  FileText, 
  Truck, 
  HardHat, 
  Ruler,
  CheckCircle2,
  Lock
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
    <div dir="rtl" className="space-y-8 text-right font-sans">
      
      <div 
        onClick={() => { updateStateAndSave(prev => ({ enabled: !prev.enabled })); }}
        className={`p-6 rounded-[2.5rem] border transition-all duration-500 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl cursor-pointer select-none ${
          state.enabled 
            ? 'bg-[#07132a] border-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.15)] hover:shadow-[0_0_40px_rgba(212,175,55,0.25)]' 
            : 'bg-[#07132a]/40 border-[#1f2d4d] hover:border-gray-600'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`p-5 rounded-2xl transition-all duration-500 ${state.enabled ? 'bg-[#D4AF37] text-black shadow-[0_0_30px_rgba(212,175,55,0.4)]' : 'bg-[#020B1C] text-gray-600'}`}>
            <ArrowLeftRight className="w-10 h-10" />
          </div>
          <div className="text-right">
            <h3 className="text-xl font-bold text-[#D4AF37]">أعمال التعديل المعماري الفنية</h3>
            <p className="text-[11px] text-gray-400 mt-1 uppercase font-bold tracking-widest leading-none">Architectural Modifications & Demolition Management</p>
          </div>
        </div>

        <div
          className={`px-10 py-3 rounded-2xl border-2 font-black text-base transition-all duration-300 flex items-center gap-3 ${
            state.enabled 
              ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.1)]' 
              : 'bg-[#020B1C] border-[#1f2d4d] text-gray-500'
          }`}
        >
          {state.enabled ? <CheckCircle2 className="w-6 h-6 text-[#D4AF37]" /> : <Lock className="w-5 h-5 text-gray-500" />}
          {state.enabled ? 'القسم مفعل' : 'القسم مقفل'}
        </div>
      </div>

      {state.enabled && (
        <div className="space-y-8 animate-fade-in">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* الكارت 1: مساحة التعديلات التقديرية */}
            <div className="p-6 rounded-2xl border border-[#1f2d4d] bg-[#020B1C]/40 hover:border-[#D4AF37]/40 hover:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all duration-300 flex flex-col justify-between min-h-[160px] group">
              <div className="flex items-center justify-between border-b border-[#1f2d4d]/60 pb-3 select-none">
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
                   <span className="text-sm font-black text-[#D4AF37] font-mono">{state.demolitionQty}</span>
                   <span className="text-[10px] text-gray-500 font-bold mr-1">متر </span>
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
              <div className="flex items-center justify-between border-b border-[#1f2d4d]/60 pb-3 select-none">
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
                   <span className="text-[10px] text-gray-500 font-bold mr-1">ج.م</span>
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
              <div className="flex items-center justify-between border-b border-[#1f2d4d]/60 pb-3 select-none">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#D4AF37] group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-[#D4AF37]">تكاليف النقل والتشوين</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-[9px] font-bold">مقطوعية</span>
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
                   <span className="text-[10px] text-gray-500 font-bold mr-1">ج.م</span>
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

          <div className="p-6 rounded-2xl bg-[#07132a] border border-[#1f2d4d] space-y-4">
            <div className="flex items-center gap-2 text-[#D4AF37] border-b border-[#1f2d4d]/60 pb-3 select-none">
              <FileText className="w-5 h-5" />
              <h4 className="text-[13px] font-bold">ملاحظات وبنود مخصصة للتعديلات المعمارية (اتفاقيات العقد):</h4>
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
              <span>حالة الاتصال: متصل وسحابي</span>
            </div>
          </div>

          <div className="p-7 rounded-3xl bg-[#020B1C] border border-[#1f2d4d] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden mt-6 shadow-2xl">
            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.4)]" />
            
            <div className="text-right flex-1 pr-6 order-2 md:order-1 select-none">
              <h4 className="text-[22px] font-bold text-[#D4AF37] mb-2 tracking-tight">خلاصة أعمال الهدم واللوجستيات:</h4>
              <p className="text-[13.5px] text-[#F0E6D2] opacity-80 leading-loose max-w-2xl font-light">
                تقدير كلي شامل {state.demolitionQty} أمتار طولي هدم حوائط، موزعة على تكلفة فنية مقطوعية بقيمة <span className="font-bold underline">({state.demolitionLab.toLocaleString()} ج.م)</span> وتكاليف لوجستية للتنظيف والتشوين مقطوعية بقيمة <span className="font-bold underline">({state.demolitionMat.toLocaleString()} ج.م)</span>.
              </p>
            </div>

            <div className="flex items-center gap-8 bg-[#07132a] px-10 py-6 rounded-3xl border border-[#1f2d4d] w-full md:w-auto justify-between md:justify-start order-1 md:order-2 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
              <div className="text-center md:text-right min-w-[120px] select-none">
                <span className="text-[12px] text-gray-500 block font-bold mb-1 opacity-90 uppercase tracking-tighter">الإجمالي المعتمد:</span>
                <span className="text-[48px] font-black text-[#D4AF37] block leading-none tracking-tight font-mono">
                  {totalDemoCost.toLocaleString('en-US')}
                </span>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[#020B1C] border border-[#1f2d4d] flex items-center justify-center shadow-lg transform transition-transform hover:scale-105">
                <span className="text-[24px] font-black text-[#D4AF37]">$</span>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}