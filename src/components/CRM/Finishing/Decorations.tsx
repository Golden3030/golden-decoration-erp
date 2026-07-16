"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from "../context/CRMContext";
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
  CheckCircle2,
  Lock,
  PlusCircle,
  LayoutGrid
} from 'lucide-react';

interface DecorationsTabProps {
  projectId: string;
}

interface DecorationItem {
  name: string;
  enabled: boolean;
  location: string;
  quantity: number;
  customName?: string;
  price: number; 
}

export default function DecorationsTab({ projectId }: DecorationsTabProps) {
  const { crmData, updateBulkFinishingSection } = useCRM();

  const [loading, setLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const isLocalChange = useRef(false);

  const [state, setState] = useState({
    enabled: true,
    items: [
      { name: "مكتبة تلفزيون", enabled: false, location: "", quantity: 1, price: 12500 },
      { name: "كرانيش مضيئة", enabled: false, location: "", quantity: 1, price: 4500 },
      { name: "كرانيش فيوتك", enabled: false, location: "", quantity: 1, price: 2500 },
      { name: "تجاليد", enabled: false, location: "", quantity: 1, price: 9500 },
      { name: "خلفية سرير", enabled: false, location: "", quantity: 1, price: 11000 },
      { name: "مرايا ديكورية", enabled: false, location: "", quantity: 1, price: 6500 },
      { name: "بانوهات", enabled: false, location: "", quantity: 1, price: 4500 }
    ] as DecorationItem[],
    notes: ''
  });

  const [notesInput, setNotesInput] = useState<string>('');

  const getActiveRoomsFromAreas = () => {
    const customAreasValues = crmData?.finishing?.areas?.values || {};
    return Object.entries(customAreasValues)
      .filter(([roomName, sizeStr]) => {
        const size = Number(sizeStr);
        return size > 0 && roomName !== "الشقة بالكامل" && roomName !== "إجمالي مساحة الغرف";
      })
      .map(([roomName]) => ({ name: roomName }));
  };

  const activeRoomsList = getActiveRoomsFromAreas();

  useEffect(() => {
    if (crmData?.finishing?.decorations) {
      const decorContext = crmData.finishing.decorations;
      
      const defaultItems = [
        { name: "مكتبة تلفزيون", enabled: false, location: "", quantity: 1, price: 12500 },
        { name: "كرانيش مضيئة", enabled: false, location: "", quantity: 1, price: 4500 },
        { name: "كرانيش فيوتك", enabled: false, location: "", quantity: 1, price: 2500 },
        { name: "تجاليد", enabled: false, location: "", quantity: 1, price: 9500 },
        { name: "خلفية سرير", enabled: false, location: "", quantity: 1, price: 11000 },
        { name: "مرايا ديكورية", enabled: false, location: "", quantity: 1, price: 6500 },
        { name: "بانوهات", enabled: false, location: "", quantity: 1, price: 4500 }
      ];

      let mergedItems = defaultItems;
      if (decorContext.items && Array.isArray(decorContext.items)) {
        mergedItems = decorContext.items.map((item: any) => ({
          ...item,
          price: item.price ?? 0,
          quantity: item.quantity ?? 1,
          location: item.location ?? "",
          customName: item.customName ?? ""
        }));
      }

      isLocalChange.current = false;
      setState({
        enabled: decorContext.enabled ?? true,
        items: mergedItems,
        notes: decorContext.notes ?? ''
      });
      setNotesInput(decorContext.notes ?? '');
    }
  }, [crmData?.project, crmData?.finishing?.areas?.values]);

  useEffect(() => {
    if (isLocalChange.current) {
      updateBulkFinishingSection('decorations', state);
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

  const handleItemChange = (index: number, fields: Partial<DecorationItem>) => {
    updateStateAndSave(prev => {
      const updatedItems = [...prev.items];
      updatedItems[index] = { ...updatedItems[index], ...fields };
      return { items: updatedItems };
    });
  };

  const handleAddCustomDecoration = () => {
    const newItem: DecorationItem = {
      name: "أخرى",
      enabled: true,
      location: "",
      quantity: 1,
      customName: "",
      price: 0
    };
    updateStateAndSave(prev => ({
      items: [...prev.items, newItem]
    }));
  };

  const totalDecorEstimate = state.enabled 
    ? state.items.reduce((sum, item) => {
        if (!item.enabled) return sum;
        return sum + ((item.price ?? 0) * (item.quantity ?? 1));
      }, 0)
    : 0;

  return (
    <div className="space-y-8 text-right select-none font-sans" dir="rtl">

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
            <Star className="w-10 h-10" />
          </div>
          <div className="text-right">
            <h3 className="text-xl font-black text-[#F0E6D2]">الحقائب الجاهزة للديكورات الجمالية والملحقات</h3>
            <p className="text-[11px] text-gray-400 mt-1 uppercase font-bold tracking-widest leading-none">DECORATIONS & ACCESSORIES ERP SYSTEM</p>
          </div>
        </div>

        <div
          className={`px-10 py-3 rounded-2xl border-2 font-black text-base transition-all duration-300 flex items-center gap-3 ${
            state.enabled 
              ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.1)]' 
              : 'bg-[#020B1C] border-[#D4AF37]/60 text-[#D4AF37]'
          }`}
        >
          {state.enabled ? <CheckCircle2 className="w-6 h-6 text-[#D4AF37]" /> : <Lock className="w-5 h-5 text-gray-500" />}
          {state.enabled ? 'القسم مفعل' : 'القسم مقفل'}
        </div>
      </div>

      <div className={`space-y-8 transition-opacity duration-300 ${state.enabled ? 'opacity-100 pointer-events-auto' : 'opacity-25 pointer-events-none filter grayscale'}`}>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f2d4d] pb-2">
          <div className="flex items-center gap-2 text-[#D4AF37]">
            <Layers className="w-6 h-6 animate-pulse" />
            <h4 className="text-xl font-bold text-[#F0E6D2]">جدول تفصيل بنود الديكورات الجمالية وحصرها بالوحدة:</h4>
          </div>
          <button
            type="button"
            disabled={!state.enabled}
            onClick={handleAddCustomDecoration}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 text-sm font-bold transition-all cursor-pointer"
          >
            <PlusCircle className="w-5 h-5" />
            <span>إضافة بند ديكور مخصص جديد</span>
          </button>
        </div>

        <div className="space-y-4">
          {state.items.map((item, idx) => {
            const qty = item.quantity ?? 1;
            const price = item.price ?? 0;
            const totalCardCost = price * qty;

            return (
              <div 
                key={item.name + idx}
                onClick={() => handleItemChange(idx, { enabled: !item.enabled })}
                className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer select-none flex flex-col md:flex-row items-center justify-between gap-6 ${
                  item.enabled 
                    ? 'border-[#D4AF37] bg-gradient-to-r from-[#07132a] to-[#D4AF37]/5 shadow-[0_0_15px_rgba(212,175,55,0.06)] hover:shadow-[0_0_25px_rgba(212,175,55,0.1)]' 
                    : 'border-[#1f2d4d] bg-[#020B1C]/40 hover:border-[#D4AF37]/30'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right flex-1 w-full">
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${item.enabled ? 'border-[#D4AF37] bg-[#D4AF37] text-[#020B1C]' : 'border-gray-500'}`}>
                      {item.enabled && <Check className="w-5 h-5 stroke-[3]" />}
                    </div>
                    <div className={`p-3 rounded-xl border ${item.enabled ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-[#1f2d4d]/30 border-[#1f2d4d] text-gray-500'}`}>
                      <LayoutGrid className="w-7 h-7" />
                    </div>
                  </div>

                  <div className="space-y-1 w-full">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <h4 className="text-xl font-bold text-[#F0E6D2]">
                        {item.name === "أخرى" ? (
                          <input
                            type="text"
                            value={item.customName ?? ""}
                            onClick={(e) => e.stopPropagation()} 
                            onChange={(e) => handleItemChange(idx, { customName: e.target.value })}
                            placeholder="اسم ديكور مخصص..."
                            className="bg-transparent border-b border-[#D4AF37]/30 focus:border-[#D4AF37] outline-none text-xl font-bold text-[#D4AF37] placeholder-gray-600"
                          />
                        ) : item.name}
                      </h4>
                      
                      {/* 🎯 تعديل لعداد تكلفت البند ليتطابق بكسلياً بالدواير الرشيقة w-6 h-6 وارتفاع h-11 مع دستور الـ ERP */}
                      <div className="space-y-1 text-right" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] text-gray-500 font-bold block mb-1">سعر البند الفردي:</span>
                        <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-44" dir="ltr">
                          <button 
                            type="button" 
                            onClick={() => handleItemChange(idx, { price: Math.max(0, price - 500), enabled: true })}
                            className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                          >
                            <Minus size={12} className="stroke-[3]" />
                          </button>
                          <div className="flex items-center justify-center font-mono">
                            <input 
                              type="number"
                              value={price}
                              onChange={(e) => handleItemChange(idx, { price: Number(e.target.value), enabled: true })}
                              className="w-16 bg-transparent text-white text-sm font-black outline-none text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-[10px] text-gray-500 font-bold mr-1">ج.م</span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => handleItemChange(idx, { price: price + 500, enabled: true })}
                            className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                          >
                            <Plus size={12} className="stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {item.enabled && (
                      <div className="flex flex-col sm:flex-row items-center gap-6 mt-4 justify-center sm:justify-start" onClick={(e) => e.stopPropagation()}>
                        
                        {/* 🎯 تعديل لعداد الكمية ليتطابق بكسلياً بالدواير الرشيقة w-6 h-6 وارتفاع h-11 مع دستور الـ ERP */}
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-400 font-bold">الكمية:</span>
                          <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none min-w-[120px]" dir="ltr">
                            <button 
                              type="button" 
                              onClick={() => handleItemChange(idx, { quantity: Math.max(1, qty - 1) })}
                              className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                            >
                              <Minus size={12} className="stroke-[3]" />
                            </button>
                            <span className="text-sm font-black text-white font-mono">{qty}</span>
                            <button 
                              type="button" 
                              onClick={() => handleItemChange(idx, { quantity: qty + 1 })}
                              className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                            >
                              <Plus size={12} className="stroke-[3]" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <span className="text-sm text-gray-400 font-bold">الموقع:</span>
                          <select
                            value={item.location ?? ""}
                            onChange={(e) => handleItemChange(idx, { location: e.target.value })}
                            className="p-2.5 rounded-xl bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] text-sm font-bold outline-none focus:border-[#D4AF37] cursor-pointer min-w-[200px]"
                          >
                            <option value="">-- اختر من غرف المساحات --</option>
                            {activeRoomsList.map((room) => (
                              <option key={room.name} value={room.name}>{room.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center sm:text-left min-w-[160px] border-t md:border-t-0 md:border-r border-[#1f2d4d] pt-4 md:pt-0 md:pr-6 w-full md:w-auto select-none">
                  <span className="text-sm text-gray-500 block font-bold">إجمالي البند:</span>
                  <span className="text-2xl font-black text-[#D4AF37] font-mono">
                    {totalCardCost.toLocaleString('en-US')}
                  </span>
                  <span className="text-xs text-[#D4AF37] mr-1">ج.م</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-6 rounded-2xl bg-[#07132a] border border-[#1f2d4d] space-y-3">
          <div className="flex items-center gap-2 text-[#D4AF37] border-b border-[#1f2d4d] pb-2 text-right">
            <FileText className="w-6 h-6" />
            <h4 className="text-lg font-bold">ملاحظات وشروط استلام أعمال الديكورات (بنود العقد الفنية):</h4>
          </div>
          <textarea
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            onBlur={() => {
              updateStateAndSave(prev => ({ notes: notesInput }));
            }}
            placeholder="اكتب مواصفات الديكورات، نوع الخشب تجاليد السويد أو الزان، خامات فيوتك، أو شروط تصنيع إضافية..."
            className="w-full h-24 p-4 rounded-xl bg-[#020B1C] border border-[#1f2d4d] hover:border-[#D4AF37]/50 focus:border-[#D4AF37] text-[#F0E6D2] placeholder-gray-500 outline-none transition-all resize-none text-base leading-relaxed text-right"
          />
          <div className="flex justify-between items-center text-xs text-gray-500 px-1">
            <span>يتم الحفظ تلقائياً بمجرد الخروج من حقل الكتابة</span>
            <span>حالة الاتصال: متصل وسحابي</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#020B1C] border border-[#D4AF37]/30 shadow-[0_0_25px_rgba(212,175,55,0.06)] flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-2 bg-[#D4AF37]" />
          <div className="space-y-1 text-center sm:text-right pr-2">
            <h4 className="text-2xl font-bold text-[#D4AF37]">الملخص المالي لبند الديكورات:</h4>
            <p className="text-sm text-gray-400">جميع الأسعار خاضعة للتعديل المباشر وترحل للمقايسة</p>
          </div>
          <div className="flex items-center gap-4 bg-[#07132a] px-10 py-6 rounded-2xl border border-[#1f2d4d]">
            <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
              <DollarSign className="w-10 h-10" />
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 block font-bold">التكلفة الإجمالية:</span>
              <span className="text-4xl font-black text-[#F0E6D2] font-mono">
                {totalDecorEstimate.toLocaleString('en-US')}
              </span>
              <span className="text-lg font-normal text-[#F0E6D2] mr-2">ج.م</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}