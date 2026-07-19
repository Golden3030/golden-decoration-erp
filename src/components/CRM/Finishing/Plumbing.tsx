"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useCRM } from "../context/CRMContext";
import { supabase } from '@/lib/supabaseClient'; 
import TabActivationBanner from './TabActivationBanner'; // 👈 استدعاء المكون المشترك الموحد للأجهزة اللمسية للشركة
import { 
  Droplets, 
  Plus, 
  Minus, 
  Trash2, 
  Truck,
  HardHat,
  ChevronDown,
  DollarSign,
  CheckCircle2,
  Settings2
} from 'lucide-react';

interface DBProduct {
  id: string;
  product_name: string;
  company?: string;
  unit: string;
  price: number;
}

interface PlumbingLineItem {
  id: string;
  product_id: string;  
  company: string;     
  name: string;        
  unit: string;
  quantity: number;
  rate: number;        
}

type ListKey = 'concealedRoughIn' | 'concealedFinishing' | 'regularRoughIn' | 'regularFinishing';

export default function PlumbingTab({ projectId }: { projectId: string }) {
  const { crmData, updateBulkFinishingSection } = useCRM();
  const [dbProducts, setDbProducts] = useState<DBProduct[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // مرجع لمنع تعارض الحفظ وحظر الـ Infinite Loops أثناء مزامنة البيانات سحابياً
  const isLocalChange = useRef(false);

  // حالة موحدة لجميع حقول السباكة لضمان التزامن ومنع تعارض البيانات
  const [state, setState] = useState({
    enabled: true,
    activeSystem: 'concealed' as 'concealed' | 'regular' | null,
    acDrainCount: 0,
    acDrainLaborRate: 150,
    terraceDrainCount: 0,
    terraceDrainLaborRate: 150,
    hasACDrainage: false,
    hasTerraceDrain: false,
    hasIndependentWaterLine: false,
    laborLumpSum: 8500,
    transportationRate: 1000,
    independentWaterLineRate: 1500,
    independentWaterLineCount: 1, // 👈 عداد عدد خطوط المياه الصاعدة
    concealedRoughIn: [] as PlumbingLineItem[],
    concealedFinishing: [] as PlumbingLineItem[],
    regularRoughIn: [] as PlumbingLineItem[],
    regularFinishing: [] as PlumbingLineItem[]
  });

  // 🌟 دالة توليد البنود الـ 5 التأسيسية المائية المعتمدة والقيائية حركياً لملء الجدول تلقائياً
  const generateDefaultRoughIn = (): PlumbingLineItem[] => [
    { id: "pl-def-1", product_id: "", company: "الشريف", name: "مواسير مياه بولي بروبلين (PPR) معتمدة 3/4 بوصة", unit: "متر", quantity: 15, rate: 180 },
    { id: "pl-def-2", product_id: "", company: "الشريف", name: "كوع بسن نحاس 3/4 بوصة معتمد", unit: "قطعة", quantity: 12, rate: 95 },
    { id: "pl-def-3", product_id: "", company: "الشريف", name: "تي شيرت نحاس مشترك 3/4 بوصة", unit: "قطعة", quantity: 8, rate: 120 },
    { id: "pl-def-4", product_id: "", company: "الشريف", name: "محبس دفن نحاسي معتمد صلب", unit: "قطعة", quantity: 2, rate: 650 },
    { id: "pl-def-5", product_id: "", company: "الشريف", name: "غراء ومواد لصق وتثبيت مواسير ألمانية", unit: "علبة", quantity: 3, rate: 150 }
  ];

  // دالة توليد بنود تشطيب السباكة الفاخرة المبدئية
  const generateDefaultFinishing = (): PlumbingLineItem[] => [
    { id: "pl-def-f1", product_id: "", company: "جروهي", name: "خلاط مياه دفن ملوكي فاخر", unit: "طقم", quantity: 1, rate: 7500 },
    { id: "pl-def-f2", product_id: "", company: "يديال ستاندرد", name: "مرحاض معلق ومخفي (كونسيلد) ذكي", unit: "طقم", quantity: 1, rate: 8500 }
  ];

  // جلب مكتبة المنتجات من قاعدة البيانات لربط الكومبوبوكس
  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase.from('products_library').select('*').eq('category', 'plumbing');
      if (data) setDbProducts(data);
    };
    fetchProducts();
  }, []);

  // تحميل البيانات المحفوظة مسبقاً من الـ CRM عند تحميل الصفحة لأول مرة
  useEffect(() => {
    if (crmData?.finishing?.plumbing) {
      const ctx = crmData.finishing.plumbing;
      isLocalChange.current = false;

      // حقن ومزامنة البنود الـ 5 التأسيسية حركياً عند عدم وجود بنود مسبقة بالجدول لمنع المظهر الفارغ
      const roughInList = ctx.concealedRoughIn && ctx.concealedRoughIn.length > 0 
        ? ctx.concealedRoughIn 
        : generateDefaultRoughIn();

      const finishingList = ctx.concealedFinishing && ctx.concealedFinishing.length > 0 
        ? ctx.concealedFinishing 
        : generateDefaultFinishing();

      const regRoughInList = ctx.regularRoughIn && ctx.regularRoughIn.length > 0 
        ? ctx.regularRoughIn 
        : generateDefaultRoughIn();

      const regFinishingList = ctx.regularFinishing && ctx.regularFinishing.length > 0 
        ? ctx.regularFinishing 
        : generateDefaultFinishing();

      setState({
        enabled: ctx.enabled ?? true,
        activeSystem: ctx.activeSystem ?? 'concealed',
        acDrainCount: ctx.acDrainCount ?? 0,
        acDrainLaborRate: ctx.acDrainLaborRate ?? 150,
        terraceDrainCount: ctx.terraceDrainCount ?? 0,
        terraceDrainLaborRate: ctx.terraceDrainLaborRate ?? 150,
        hasACDrainage: ctx.hasACDrainage ?? false,
        hasTerraceDrain: ctx.hasTerraceDrain ?? false,
        hasIndependentWaterLine: ctx.hasIndependentWaterLine ?? false,
        laborLumpSum: ctx.laborLumpSum ?? 8500,
        transportationRate: ctx.transportationRate ?? 1000,
        independentWaterLineRate: ctx.independentWaterLineRate ?? 1500,
        independentWaterLineCount: ctx.independentWaterLineCount ?? 1, 
        concealedRoughIn: roughInList,
        concealedFinishing: finishingList,
        regularRoughIn: regRoughInList,
        regularFinishing: regFinishingList
      });
    }
  }, [crmData?.finishing?.plumbing]);

  // المزامنة التلقائية والآمنة مع السياق الأب بعد اكتمال الرندر تماماً
  useEffect(() => {
    if (isLocalChange.current) {
      updateBulkFinishingSection('plumbing', state);
      isLocalChange.current = false; 
    }
  }, [state]);

  // دالة تحديث الحالة المحلية بأمان تام
  const updateStateAndSave = (updater: (prev: typeof state) => Partial<typeof state>) => {
    setIsSaving(true);
    isLocalChange.current = true; 
    setState(prev => {
      const updates = updater(prev);
      return { ...prev, ...updates };
    });
    setIsSaving(false);
  };

  // العمليات على الجداول مع الحفظ الفوري والآمن
  const addItem = (key: ListKey) => {
    const newItem = { id: `pl-${Date.now()}`, product_id: '', company: '', name: '', unit: 'قطعة', quantity: 1, rate: 0 };
    updateStateAndSave(prev => {
      const list = prev[key] || [];
      return { [key]: [...list, newItem] };
    });
  };

  const removeItem = (key: ListKey, id: string) => {
    updateStateAndSave(prev => {
      const list = prev[key] || [];
      return { [key]: list.filter(i => i.id !== id) };
    });
  };

  const editItem = (key: ListKey, id: string, fields: Partial<PlumbingLineItem>) => {
    updateStateAndSave(prev => {
      const list = prev[key] || [];
      const updated = list.map(i => i.id === id ? { ...i, ...fields } : i);
      return { [key]: updated };
    });
  };

  // حساب التكلفة الإجمالية بشكل خارجي لسرعة الرندر ومنع البطء
  const totalCost = (state.activeSystem === 'concealed' 
    ? (state.concealedRoughIn.reduce((s, i) => s + (i.rate * i.quantity), 0) + state.concealedFinishing.reduce((s, i) => s + (i.rate * i.quantity), 0))
    : (state.regularRoughIn.reduce((s, i) => s + (i.rate * i.quantity), 0) + state.regularFinishing.reduce((s, i) => s + (i.rate * i.quantity), 0))
  ) 
  + state.laborLumpSum 
  + state.transportationRate 
  + (state.hasACDrainage ? state.acDrainCount * state.acDrainLaborRate : 0) 
  + (state.hasTerraceDrain ? state.terraceDrainCount * state.terraceDrainLaborRate : 0) 
  + (state.hasIndependentWaterLine ? state.independentWaterLineCount * state.independentWaterLineRate : 0); 

  const renderMaterialTable = (items: PlumbingLineItem[], key: ListKey) => (
    <div className="w-full bg-[#07132a] border border-[#D4AF37] rounded-2xl overflow-hidden shadow-2xl">
      {/* تم موازنة الرؤوس لتناسب التصميم البصري الجديد للكمبوبوكس */}
      <div className="grid grid-cols-12 bg-[#020B1C] p-4 border-b border-[#D4AF37] text-[#D4AF37] font-medium text-center text-xs md:text-sm select-none">
        <div className="col-span-4 text-right pr-4 font-medium">اسم البند والتوصيف المعتمد </div>
        <div className="col-span-2 font-medium">الشركة المنتجة</div>
        <div className="col-span-2 font-medium">الكمية المطلوبة</div>
        <div className="col-span-2 font-medium">سعر الوحدة</div>
        <div className="col-span-1 font-medium">إلاجمالي</div>
        <div className="col-span-1 font-medium">حذف</div>
      </div>

      <div className="divide-y divide-[#1f2d4d]/40">
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-12 p-3.5 items-center text-center text-white bg-[#07132a] hover:bg-[#020B1C]/40 transition-all duration-200">
            
            {/* اسم البند: كومبوبوكس كامل من المخزن */}
            <div className="col-span-4 text-right pr-4 flex flex-col gap-1.5 w-full">
              <div className="relative">
                <select
                  value={item.product_id}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "custom") {
                      editItem(key, item.id, { product_id: "", name: "", company: "", rate: 0 });
                    } else {
                      const p = dbProducts.find(x => x.id === val);
                      editItem(key, item.id, { 
                        product_id: val, 
                        name: p?.product_name || '', 
                        rate: p?.price || 0, 
                        company: p?.company || '' 
                      });
                    }
                  }}
                  className="w-full h-9 bg-[#020B1C] border border-[#1f2d4d] rounded-xl px-3 text-xs text-[#F0E6D2] font-bold appearance-none outline-none focus:border-[#D4AF37] cursor-pointer"
                >
                  <option value="">-- اختر الخامة --</option>
                  {dbProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.product_name} {p.company ? `(${p.company})` : ''}
                    </option>
                  ))}
                  <option value="custom">✍️ كتابة بند يدوي مخصص...</option>
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D4AF37] pointer-events-none" />
              </div>
              
              {!item.product_id && (
                <input 
                  type="text" 
                  value={item.name} 
                  placeholder="اكتب اسم البند اليدوي وتوصيفه هنا..."
                  onChange={(e) => editItem(key, item.id, { name: e.target.value })}
                  className="w-full h-9 bg-[#020B1C]/80 border border-[#1f2d4d]/60 rounded-xl px-3 text-xs text-[#F0E6D2] outline-none focus:border-[#D4AF37]"
                />
              )}
            </div>

            {/* الشركة المنتجة */}
            <div className="col-span-2 px-2 text-center select-none">
              {item.product_id ? (
                <span className="px-2.5 py-1.5 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-xs text-[#F0E6D2] font-semibold block truncate">
                  {item.company || "—"}
                </span>
              ) : (
                <input 
                  type="text" 
                  value={item.company} 
                  placeholder="الشركة المصنعة..."
                  onChange={(e) => editItem(key, item.id, { company: e.target.value })}
                  className="w-full h-9 bg-[#020B1C] border border-[#1f2d4d] rounded-xl text-center text-xs text-[#F0E6D2] outline-none focus:border-[#D4AF37]"
                />
              )}
            </div>

            {/* العداد الحركي الفخم للكمية */}
            <div className="col-span-2 flex justify-center items-center gap-2 select-none" dir="ltr">
              <button onClick={() => editItem(key, item.id, { quantity: item.quantity + 1 })} className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] font-bold text-xs flex items-center justify-center cursor-pointer font-sans">+</button>
              <span className="text-sm font-black text-white font-mono min-w-[25px]">{item.quantity}</span>
              <button onClick={() => editItem(key, item.id, { quantity: Math.max(0, item.quantity - 1) })} className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer font-sans">-</button>
            </div>

            {/* 🌟 سعر الوحدة المعتمد: تم تحويله بالكامل إلى عداد تفاعلي h-11 مطابق لمكون التهوية والشفاطات */}
            <div className="col-span-2 flex justify-center items-center select-none">
              <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2.5 w-32" onClick={(e) => e.stopPropagation()}>
                <button 
                  type="button" 
                  onClick={() => editItem(key, item.id, { rate: (item.rate || 0) + 100 })}
                  className="w-5 h-5 rounded bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] font-bold text-xs flex items-center justify-center cursor-pointer transition-all active:scale-95"
                >
                  +
                </button>
                <div className="flex items-center justify-center font-mono">
                  <input 
                    type="number" 
                    value={item.rate} 
                    onChange={(e) => editItem(key, item.id, { rate: Number(e.target.value) })}
                    className="w-14 bg-transparent text-[#D4AF37] text-xs font-black outline-none text-center focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[9px] text-gray-500 font-bold mr-0.5">ج</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => editItem(key, item.id, { rate: Math.max(0, (item.rate || 0) - 100) })}
                  className="w-5 h-5 rounded bg-[#020B1C] border border-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white font-bold text-xs flex items-center justify-center cursor-pointer transition-all active:scale-95"
                >
                  -
                </button>
              </div>
            </div>

            <div className="col-span-1 font-black text-xs md:text-sm text-[#D4AF37] font-mono">
              {(item.quantity * item.rate).toLocaleString()}
            </div>
            
            <div className="col-span-1 flex justify-center select-none">
              <button onClick={() => removeItem(key, item.id)} className="text-red-500/40 hover:text-red-500 p-2 transition-all cursor-pointer">
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-3 bg-[#020B1C]/50 flex justify-end border-t border-[#1f2d4d]/40 select-none">
        <button onClick={() => addItem(key)} className="flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 text-[#D4AF37] text-[10px] font-black hover:bg-[#D4AF37] hover:text-black transition-all cursor-pointer font-alexandria">
          <Plus className="w-3.5 h-3.5" />
          <span>إضافة بند</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 font-alexandria" dir="rtl">
      
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800;900&display=swap');
        
        .font-alexandria {
          font-family: 'Alexandria', Arial, sans-serif !important;
          letter-spacing: normal !important;
        }
      `}</style>

      {/* استدعاء شريط التفعيل المنزلق الموحد */}
      <TabActivationBanner 
        title="منظومة السباكة والشبكات المائية الفاخرة"
        subtitle="PLUMBING & SANITARY NETWORKS SYSTEM"
        icon={Droplets}
        enabled={state.enabled}
        onToggle={() => { updateStateAndSave(prev => ({ enabled: !prev.enabled })); }}
      />

      <div className={`space-y-8 transition-all duration-500 ${state.enabled ? 'opacity-100 pointer-events-auto' : 'opacity-25 pointer-events-none filter grayscale'}`}>

        {/* الكروت الفاخرة لاختيار نوع شبكة التأسيس */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-alexandria select-none">
          {/* كارت النظام المدفون كونسيلد */}
          <div
            onClick={() => { updateStateAndSave(() => ({ activeSystem: 'concealed' })); }}
            className={`p-6 rounded-[2rem] border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[140px] select-none ${
              state.activeSystem === 'concealed'
                ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_25px_rgba(212,175,55,0.15)]'
                : 'border-[#1f2d4d] bg-[#07132a] opacity-60 hover:opacity-100 hover:border-[#D4AF37]/35'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="text-right pl-4">
                <h5 className={`text-md font-black ${state.activeSystem === 'concealed' ? 'text-[#D4AF37]' : 'text-[#F0E6D2]'}`}>
                  نظام التأسيس المدفون (كونسيلد)
                </h5>
                <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                  نظام تأسيس داخلي ذو كفاءة متميزة يعتمد على الأجهزة المدفونة للحصول على مظهر عصري فاخر ومساحة استغلال ممتازة.
                </p>
              </div>
              <div className={`p-2.5 rounded-xl transition-colors ${state.activeSystem === 'concealed' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-[#020B1C] text-gray-500'}`}>
                <Settings2 className="w-5 h-5" />
              </div>
            </div>
            <div className="flex justify-end items-center mt-4">
              <span className={`text-[10px] font-bold px-4 py-1 rounded-full border transition-all ${
                state.activeSystem === 'concealed'
                  ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_10px_rgba(212,175,55,0.1)]'
                  : 'border-[#1f2d4d] text-gray-500 bg-transparent'
              }`}>
                {state.activeSystem === 'concealed' ? 'تم اختيار النظام' : 'اضغط للتفعيل'}
              </span>
            </div>
          </div>

          {/* كارت النظام الظاهر العادي */}
          <div
            onClick={() => { updateStateAndSave(() => ({ activeSystem: 'regular' })); }}
            className={`p-6 rounded-[2rem] border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[140px] select-none ${
              state.activeSystem === 'regular'
                ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_25px_rgba(212,175,55,0.15)]'
                : 'border-[#1f2d4d] bg-[#07132a] opacity-60 hover:opacity-100 hover:border-[#D4AF37]/35'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="text-right pl-4">
                <h5 className={`text-md font-black ${state.activeSystem === 'regular' ? 'text-[#D4AF37]' : 'text-[#F0E6D2]'}`}>
                  نظام التأسيس (العادي)
                </h5>
                <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                  نظام كلاسيكي آمن وسهل التعديل والصيانة السريعة، مناسب لكافة المساحات بتكلفة تشغيل اقتصادية ومباشرة.
                </p>
              </div>
              <div className={`p-2.5 rounded-xl transition-colors ${state.activeSystem === 'regular' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-[#020B1C] text-gray-500'}`}>
                <Droplets className="w-5 h-5" />
              </div>
            </div>
            <div className="flex justify-end items-center mt-4">
              <span className={`text-[10px] font-bold px-4 py-1 rounded-full border transition-all ${
                state.activeSystem === 'regular'
                  ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_10px_rgba(212,175,55,0.1)]'
                  : 'border-[#1f2d4d] text-gray-500 bg-transparent'
              }`}>
                {state.activeSystem === 'regular' ? 'تم اختيار النظام' : 'اضغط للتفعيل'}
              </span>
            </div>
          </div>
        </div>
        
        {/* كروت كماليات وتفريعات الصرف والشبكات الصاعدة */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-alexandria select-none">
          
          {/* الكارت 1: شبكة صرف التكييف */}
          <div onClick={() => { updateStateAndSave(prev => ({ hasACDrainage: !prev.hasACDrainage })); }}
            className={`p-6 rounded-[1.8rem] border-2 transition-all cursor-pointer flex flex-col justify-between h-[180px] ${state.hasACDrainage ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_25px_rgba(212,175,55,0.15)]' : 'border-[#1f2d4d] bg-[#07132a]'}`}>
            <div className="flex items-center justify-between border-b border-[#1f2d4d]/30 pb-2">
              <span className="text-sm font-black text-[#D4AF37]">صرف تكييف مستقل</span>
              {state.hasACDrainage && <CheckCircle2 className="w-5 h-5 text-[#D4AF37] animate-pulse" />}
            </div>
            <div 
              className={`flex items-center justify-between gap-3 transition-all duration-300 ${state.hasACDrainage ? 'opacity-100 pointer-events-auto' : 'opacity-20 pointer-events-none'}`} 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-white font-bold leading-none">عدد النقاط</span>
                <div className="flex items-center justify-between bg-[#020B1C] px-2 py-1 rounded-xl border border-[#1f2d4d] h-11 w-full">
                  <button onClick={() => { if (state.hasACDrainage) updateStateAndSave(prev => ({ acDrainCount: prev.acDrainCount + 1 })); }} className="w-5 h-5 rounded-full bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs flex items-center justify-center cursor-pointer font-sans">+</button>
                  <span className="text-sm font-black text-[#D4AF37] font-mono">{state.acDrainCount}</span>
                  <button onClick={() => { if (state.hasACDrainage) updateStateAndSave(prev => ({ acDrainCount: Math.max(0, prev.acDrainCount - 1) })); }} className="w-5 h-5 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer font-sans">-</button>
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-white font-bold leading-none">كلفة النقطة</span>
                <div className="flex items-center justify-between bg-[#020B1C] px-2 py-1 rounded-xl border border-[#1f2d4d] h-11 w-full">
                  <button onClick={() => { if (state.hasACDrainage) updateStateAndSave(prev => ({ acDrainLaborRate: prev.acDrainLaborRate + 50 })); }} className="w-5 h-5 rounded-full bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs flex items-center justify-center cursor-pointer font-sans">+</button>
                  <span className="text-xs font-black text-[#D4AF37] font-mono">{state.acDrainLaborRate}</span>
                  <button onClick={() => { if (state.hasACDrainage) updateStateAndSave(prev => ({ acDrainLaborRate: Math.max(0, prev.acDrainLaborRate - 50) })); }} className="w-5 h-5 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer font-sans">-</button>
                </div>
              </div>
            </div>
          </div>

          {/* الكارت 2: صرف تراس وبلكونة مستقل */}
          <div onClick={() => { updateStateAndSave(prev => ({ hasTerraceDrain: !prev.hasTerraceDrain })); }}
            className={`p-6 rounded-[1.8rem] border-2 transition-all cursor-pointer flex flex-col justify-between h-[180px] ${state.hasTerraceDrain ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_25px_rgba(212,175,55,0.15)]' : 'border-[#1f2d4d] bg-[#07132a]'}`}>
            <div className="flex items-center justify-between border-b border-[#1f2d4d]/30 pb-2">
              <span className="text-sm font-black text-[#D4AF37]">صرف بلكونة وتراس</span>
              {state.hasTerraceDrain && <CheckCircle2 className="w-5 h-5 text-[#D4AF37] animate-pulse" />}
            </div>
            <div 
              className={`flex items-center justify-between gap-3 transition-all duration-300 ${state.hasTerraceDrain ? 'opacity-100 pointer-events-auto' : 'opacity-20 pointer-events-none'}`} 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-white font-bold leading-none">عدد النقاط</span>
                <div className="flex items-center justify-between bg-[#020B1C] px-2 py-1 rounded-xl border border-[#1f2d4d] h-11 w-full">
                  <button onClick={() => { if (state.hasTerraceDrain) updateStateAndSave(prev => ({ terraceDrainCount: prev.terraceDrainCount + 1 })); }} className="w-5 h-5 rounded-full bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer font-sans">+</button>
                  <span className="text-sm font-black text-[#D4AF37] font-mono">{state.terraceDrainCount}</span>
                  <button onClick={() => { if (state.hasTerraceDrain) updateStateAndSave(prev => ({ terraceDrainCount: Math.max(0, prev.terraceDrainCount - 1) })); }} className="w-5 h-5 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer font-sans">-</button>
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-white font-bold leading-none">كلفة النقطة</span>
                <div className="flex items-center justify-between bg-[#020B1C] px-2 py-1 rounded-xl border border-[#1f2d4d] h-11 w-full">
                  <button onClick={() => { if (state.hasTerraceDrain) updateStateAndSave(prev => ({ terraceDrainLaborRate: prev.terraceDrainLaborRate + 50 })); }} className="w-5 h-5 rounded-full bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs flex items-center justify-center cursor-pointer font-sans">+</button>
                  <span className="text-xs font-black text-[#D4AF37] font-mono">{state.terraceDrainLaborRate}</span>
                  <button onClick={() => { if (state.hasTerraceDrain) updateStateAndSave(prev => ({ terraceDrainLaborRate: Math.max(0, prev.terraceDrainLaborRate - 50) })); }} className="w-5 h-5 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer font-sans">-</button>
                </div>
              </div>
            </div>
          </div>

          {/* الكارت 3: خط مياه صاعد مستقل للوحدة */}
          <div onClick={() => { updateStateAndSave(prev => ({ hasIndependentWaterLine: !prev.hasIndependentWaterLine })); }}
            className={`p-6 rounded-[1.8rem] border-2 transition-all cursor-pointer flex flex-col justify-between h-[180px] ${state.hasIndependentWaterLine ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_25px_rgba(212,175,55,0.15)]' : 'border-[#1f2d4d] bg-[#07132a]'}`}>
            <div className="flex items-center justify-between border-b border-[#1f2d4d]/30 pb-2">
              <span className="text-base font-black text-[#D4AF37]">خط صاعد مستقل للوحدة</span>
              {state.hasIndependentWaterLine && <CheckCircle2 className="w-5 h-5 text-[#D4AF37] animate-pulse" />}
            </div>
            <div 
              className={`flex items-center justify-between gap-3 transition-all duration-300 ${state.hasIndependentWaterLine ? 'opacity-100 pointer-events-auto' : 'opacity-20 pointer-events-none'}`} 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-white font-bold leading-none">عدد الخطوط</span>
                <div className="flex items-center justify-between bg-[#020B1C] px-2 py-1 rounded-xl border border-[#1f2d4d] h-11 w-full">
                  <button onClick={() => { if (state.hasIndependentWaterLine) updateStateAndSave(prev => ({ independentWaterLineCount: prev.independentWaterLineCount + 1 })); }} className="w-5 h-5 rounded-full bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs flex items-center justify-center cursor-pointer font-sans">+</button>
                  <span className="text-sm font-black text-[#D4AF37] font-mono">{state.independentWaterLineCount}</span>
                  <button onClick={() => { if (state.hasIndependentWaterLine) updateStateAndSave(prev => ({ independentWaterLineCount: Math.max(1, prev.independentWaterLineCount - 1) })); }} className="w-5 h-5 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer font-sans">-</button>
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-white font-bold leading-none">تكلفة الخط</span>
                <div className="flex items-center justify-between bg-[#020B1C] px-2 py-1 rounded-xl border border-[#1f2d4d] h-11 w-full">
                  <button onClick={() => { if (state.hasIndependentWaterLine) updateStateAndSave(prev => ({ independentWaterLineRate: prev.independentWaterLineRate + 100 })); }} className="w-5 h-5 rounded-full bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs flex items-center justify-center cursor-pointer font-sans">+</button>
                  <span className="text-xs font-black text-[#D4AF37] font-mono">{state.independentWaterLineRate}</span>
                  <button onClick={() => { if (state.hasIndependentWaterLine) updateStateAndSave(prev => ({ independentWaterLineRate: Math.max(0, prev.independentWaterLineRate - 100) })); }} className="w-5 h-5 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer font-sans">-</button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* حصر خامات ومكونات السباكة */}
        <div className="space-y-6">
          <h4 className="text-lg text-[#D4AF37] font-bold block pr-2">خامات ومستلزمات مرحلة التأسيس :</h4>
          {renderMaterialTable(state.activeSystem === 'concealed' ? state.concealedRoughIn : state.regularRoughIn, state.activeSystem === 'concealed' ? 'concealedRoughIn' : 'regularRoughIn')}
          
          <h4 className="text-lg text-[#D4AF37] font-bold block pr-2">خامات ومستلزمات مرحلة التشطيب (القطع الصحية):</h4>
          {renderMaterialTable(state.activeSystem === 'concealed' ? state.concealedFinishing : state.regularFinishing, state.activeSystem === 'concealed' ? 'concealedFinishing' : 'regularFinishing')}
        </div>

        {/* مصنعيات ولوجستيات أعمال السباكة */}
        <div className="flex flex-col md:flex-row gap-6 font-alexandria select-none">
          
          {/* كلفة مصنعيات السباكة الإجمالية */}
          <div className="flex-1 p-5 rounded-[1.8rem] bg-[#07132a] border border-[#1f2d4d]/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]"><HardHat className="w-6 h-6" /></div>
              <span className="text-sm font-bold text-[#F0E6D2]">تكلفة المصنعيات </span>
            </div>
            <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-44">
              <button onClick={() => { updateStateAndSave(prev => ({ laborLumpSum: prev.laborLumpSum + 500 })); }} className="w-7 h-7 rounded-lg bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
              <span className="text-base font-black text-[#D4AF37] font-mono min-w-[90px] text-center">{state.laborLumpSum.toLocaleString()}</span>
              <button onClick={() => { updateStateAndSave(prev => ({ laborLumpSum: Math.max(0, prev.laborLumpSum - 500) })); }} className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
            </div>
          </div>

          {/* كارت النقل اللوجستي والتشوين */}
          <div className="flex-1 p-5 rounded-[1.8rem] bg-[#07132a] border border-[#1f2d4d]/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]"><Truck className="w-6 h-6" /></div>
              <span className="text-sm font-bold text-[#F0E6D2]">تكلفة النقل والتشوين </span>
            </div>
            <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-44">
              <button onClick={() => { updateStateAndSave(prev => ({ transportationRate: prev.transportationRate + 100 })); }} className="w-7 h-7 rounded-lg bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-sans">+</button>
              <span className="text-lg font-black text-[#D4AF37] font-mono min-w-[90px] text-center">{state.transportationRate.toLocaleString()}</span>
              <button onClick={() => { updateStateAndSave(prev => ({ transportationRate: Math.max(0, prev.transportationRate - 100) })); }} className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-sans">-</button>
            </div>
          </div>
        </div>

        {/* كارت الملخص المالي الإجمالي بعد تكبيره وتفخيمه */}
       <div className="p-5 rounded-xl bg-[#020B1C] border border-[#D4AF37]/30 shadow-[0_0_20px_rgba(212,175,55,0.05)] flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden font-alexandria">
          <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[#D4AF37]" />
          <div className="space-y-1 text-center sm:text-right pr-1 select-none">
            <h4 className="text-lg font-bold text-[#D4AF37]">الملخص المالي النهائي المعتمد لأعمال السباكة والشبكات بالـ BOQ:</h4>
            <p className="text-xs text-white font-normal leading-relaxed max-w-2xl text-right">
              الاحتساب التلقائي اللحظي يمثل: مجموع كلفة خامات التأسيس المائية والتوريدات الصحية ({totalCost.toLocaleString('en-US')} ج.م) شاملاً مصنعيات التركيب الكاملة، اللوجستيات وتشوين النقل، بالإضافة إلى صرف التكييف المستقل وصرف التراس وخط الصاعد المعتمد.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#07132a] px-6 py-4 rounded-lg border border-[#1f2d4d]">
                     <div className="p-1.5 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
                       <DollarSign className="w-6 h-6" />
                     </div>
                     <div className="text-right">
              <span className="text-[10px] text-white block font-semibold text-right">إجمالي تكلفة أعمال السباكة:</span>
               <span className="text-2xl font-black text-[#D4AF37] font-mono">
                {totalCost.toLocaleString('en-US')} <span className="text-xs font-normal">ج.م</span>
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}