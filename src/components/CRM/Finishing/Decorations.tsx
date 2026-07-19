"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from "../context/CRMContext";
import TabActivationBanner from './TabActivationBanner'; // استدعاء المكون المشترك الموحد للأجهزة اللمسية للشركة
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

  // 🌟 ترقية وتوحيد محرك استيراد الغرف ليقرأ حيوياً كافة غرف حصر المساحات بدقة تامة دون فقدان أي حقل
  const getActiveRoomsFromAreas = () => {
    const list: Array<{ name: string }> = [];
    const customAreasValues = crmData?.finishing?.areas?.values || {};

    const project = crmData?.project || {};
    const bedroomsVal = Number(project.roomsCount || 2);
    const bathroomsVal = Number(project.bathroomsCount || 1);
    const receptionsVal = Number(project.receptionsCount || 1);
    const kitchensVal = Number(project.kitchensCount || 1);
    const balconiesVal = Number(project.balconiesCount || 1);
    const livingVal = Number(project.livingCount || 0);

    // 1. الريسبشنات والقطع
    for (let i = 1; i <= receptionsVal; i++) {
      const label = receptionsVal === 1 ? 'الريسبشن الرئيسي للوحدة' : `الريسبشن - قطعة ${i}`;
      list.push({ name: label });
    }

    // 2. غرف النوم والأطفال
    for (let i = 1; i <= bedroomsVal; i++) {
      const label = i === 1 ? 'غرفة النوم الرئيسية (الماستر)' : `غرفة الأطفال ${i - 1}`;
      list.push({ name: label });
    }

    // 3. المطابخ
    for (let i = 1; i <= kitchensVal; i++) {
      const label = kitchensVal === 1 ? 'المطبخ الرئيسي' : `المطبخ الفرعي ${i}`;
      list.push({ name: label });
    }

    // 4. الحمامات (يتم إدراجها لإتاحة وضع مرايا ديكورية أو تجاليد أكليريك أسقف)
    for (let i = 1; i <= bathroomsVal; i++) {
      const label = i === 1 ? 'الحمام الرئيسي للوحدة' : i === 2 ? 'حمام ضيوف مخصص' : `الحمام الفرعي ${i}`;
      list.push({ name: label });
    }

    // 5. البلكونات والتراسات
    for (let i = 1; i <= balconiesVal; i++) {
      const label = balconiesVal === 1 ? 'البلكونة الرئيسية (التراس)' : `البلكونة الفرعية ${i}`;
      list.push({ name: label });
    }

    // 6. غرف المعيشة (الليفنج)
    for (let i = 1; i <= livingVal; i++) {
      const label = livingVal === 1 ? 'غرفة المعيشة الرئيسية (ليفنج)' : `غرفة المعيشة (ليفنج) - قطعة ${i}`;
      list.push({ name: label });
    }

    // 7. الطرقات والممرات الداخلية (في حال تفعيلها)
    const hasCorridors = !!(
      (customAreasValues["الطرقة الرئيسية"] && Number(customAreasValues["الطرقة الرئيسية"]) > 0) || 
      (customAreasValues["الطرقة الفرعية"] && Number(customAreasValues["الطرقة الفرعية"]) > 0) ||
      Number(project.corridorsCount || 0) > 0
    );
    if (hasCorridors) {
      list.push({ name: "الطرقة الرئيسية" });
      list.push({ name: "الطرقة الفرعية" });
    }

    // 8. الحديقة / الجاردن المفتوحة (في حال تفعيلها)
    const hasGarden = !!(project.gardenExist && Number(project.gardenArea || 0) > 0) || 
                      !!(customAreasValues["الحديقة / الجاردن"] && Number(customAreasValues["الحديقة / الجاردن"]) > 0);
    if (hasGarden) {
      list.push({ name: "الحديقة / الجاردن" });
    }

    return list;
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
    <div className="space-y-8 text-right select-none font-alexandria" dir="rtl">
      
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800;900&display=swap');
        
        .font-alexandria {
          font-family: 'Alexandria', Arial, sans-serif !important;
          letter-spacing: normal !important;
        }
      `}</style>

      {/* استدعاء البار المنزلق اللمسي الموحد (TabActivationBanner) كبديل للبار الضخم القديم */}
      <TabActivationBanner 
        title="البنود الجاهزة للديكورات الجمالية والملحقات"
        subtitle="DECORATIONS & ACCESSORIES ERP SYSTEM"
        icon={Star}
        enabled={state.enabled}
        onToggle={() => { updateStateAndSave(prev => ({ enabled: !prev.enabled })); }}
      />

      <div className={`space-y-8 transition-opacity duration-300 ${state.enabled ? 'opacity-100 pointer-events-auto' : 'opacity-25 pointer-events-none filter grayscale'}`}>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D4AF37] pb-2">
          <div className="flex items-center gap-2 text-[#D4AF37]">
            <Layers className="w-6 h-6 animate-pulse" />
            <h4 className="text-lg font-black text-[#D4AF37]"> تفاصيل بنود الديكورات الجمالية بالوحدة:</h4>
          </div>
          <button
            type="button"
            disabled={!state.enabled}
            onClick={handleAddCustomDecoration}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 text-sm font-bold transition-all cursor-pointer font-alexandria"
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
                      <h4 className="text-ms font-bold text-[#D4AF37]">
                        {item.name === "أخرى" ? (
                          <input
                            type="text"
                            value={item.customName ?? ""}
                            onClick={(e) => e.stopPropagation()} 
                            onChange={(e) => handleItemChange(idx, { customName: e.target.value })}
                            placeholder="اسم ديكور جديد..."
                            className="bg-transparent border-b border-[#D4AF37]/30 focus:border-[#D4AF37] outline-none text-xl font-bold text-[#D4AF37] placeholder-gray-600"
                          />
                        ) : item.name}
                      </h4>
                      
                      {/* عداد تكلفت البند ليتطابق بكسلياً بالدواير الرشيقة w-6 h-6 وارتفاع h-11 مع دستور الـ ERP */}
                      <div className="space-y-1 text-right" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] text-white font-bold block mb-1">سعر البند:</span>
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
                        
                        {/* عداد الكمية ليتطابق بكسلياً بالدواير الرشيقة w-6 h-6 وارتفاع h-11 مع دستور الـ ERP */}
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-white font-bold">الكمية:</span>
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

                        {/* منسدل اختيار الغرف المتناسق كلياً مع حصر المساحات الجاري */}
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <span className="text-sm text-white font-bold"> اختر الفراغ:</span>
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
                  <span className="text-sm text-white block font-bold">إجمالي البند:</span>
                  <span className="text-2xl font-black text-[#D4AF37] font-mono">
                    {totalCardCost.toLocaleString('en-US')}
                  </span>
                  <span className="text-xs text-[#D4AF37] mr-1">ج.م</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-6 rounded-2xl bg-[#07132a] border border-[#D4AF37] space-y-3">
          <div className="flex items-center gap-2 text-[#D4AF37] border-b border-[#D4AF37] pb-2 text-right">
            <FileText className="w-6 h-6" />
            <h4 className="text-lg font-black text-[#D4AF37]">ملاحظات وشروط استلام أعمال الديكورات :</h4>
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
            <span>حالة الاتصال: متصل </span>
          </div>
        </div>

        {/* كارت خلاصة الأعمال والملخص المالي النهائي المحدث ليطابق نمط التكييف والألوميتال والأسقف المعتمد */}
        <div className="p-5 rounded-xl bg-[#020B1C] border border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.05)] flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[#D4AF37]" />
          
          <div className="space-y-1 text-center sm:text-right pr-1 select-none font-alexandria">
            <h4 className="text-lg font-bold text-[#D4AF37]">الملخص المالي النهائي لبند الديكورات المخصصة والملحقات:</h4>
            <p className="text-xs text-white font-normal leading-relaxed max-w-2xl text-right">
              التسعير بالكامل؛ تشتمل على تكلفة بنود الديكورات الإنشائية والجمالية الجارية والمحقنة حيوياً بداخل المواقع وغرف الحصر بالوحدة السكنية والملحقات المقدرة ({totalDecorEstimate.toLocaleString('en-US')} ج.م).
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#07132a] px-6 py-4 rounded-lg border border-[#1f2d4d]">
            <div className="p-1.5 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="text-right">
              <span className="text-[10px] text-white block font-semibold">إجمالي تكلفة بند الديكورات:</span>
              <span className="text-2xl font-black text-[#D4AF37] font-mono">
                {totalDecorEstimate.toLocaleString('en-US')} <span className="text-xs font-normal">ج.م</span>
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}