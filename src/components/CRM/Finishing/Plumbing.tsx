"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from "../context/CRMContext";
import { supabase } from '@/lib/supabaseClient'; 
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
  Lock,
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

  // مرجع لتحديد ما إذا كان التغيير محلي من المستخدم لمنع الحلقات المفرغة والحفظ العشوائي
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
    concealedRoughIn: [] as PlumbingLineItem[],
    concealedFinishing: [] as PlumbingLineItem[],
    regularRoughIn: [] as PlumbingLineItem[],
    regularFinishing: [] as PlumbingLineItem[]
  });

  // جلب مكتبة المنتجات من قاعدة البيانات
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
      // نضع المرجع false لأن البيانات قادمة من السيرفر وليست تعديلاً جديداً من المستخدم
      isLocalChange.current = false;
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
        concealedRoughIn: ctx.concealedRoughIn || [],
        concealedFinishing: ctx.concealedFinishing || [],
        regularRoughIn: ctx.regularRoughIn || [],
        regularFinishing: ctx.regularFinishing || []
      });
    }
  }, [crmData?.finishing?.plumbing]);

  // المزامنة التلقائية والآمنة مع السياق الأب بعد اكتمال الرندر تماماً
  useEffect(() => {
    if (isLocalChange.current) {
      updateBulkFinishingSection('plumbing', state);
      isLocalChange.current = false; // إعادة ضبط المرجع بعد اكتمال الحفظ
    }
  }, [state]);

  // دالة تحديث الحالة المحلية بأمان تام
  const updateStateAndSave = (updater: (prev: typeof state) => Partial<typeof state>) => {
    setIsSaving(true);
    isLocalChange.current = true; // الإشارة إلى أن هذا التغيير قام به المستخدم ويجب حفظه فوراً
    setState(prev => {
      const updates = updater(prev);
      return { ...prev, ...updates };
    });
    setIsSaving(false);
  };

  // العمليات على الجداول مع الحفظ الفوري والآمن
  const addItem = (key: ListKey) => {
    const newItem = { id: `pl-${Date.now()}`, product_id: '', company: 'اختر المنتج', name: '', unit: 'قطعة', quantity: 1, rate: 0 };
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
  + (state.hasIndependentWaterLine ? state.independentWaterLineRate : 0);

  const renderMaterialTable = (items: PlumbingLineItem[], key: ListKey) => (
    <div className="w-full bg-[#07132a] border border-[#1f2d4d] rounded-[1.5rem] overflow-hidden shadow-2xl">
      <div className="grid grid-cols-12 bg-[#020B1C] p-4 border-b border-[#1f2d4d] text-[#D4AF37] font-black text-center text-sm">
        <div className="col-span-3 text-right pr-4">اسم الشركة المصنعة</div>
        <div className="col-span-3">المنتج الفعلي بالمخزن</div>
        <div className="col-span-2">الكمية المطلوبة</div>
        <div className="col-span-2">سعر الوحدة</div>
        <div className="col-span-1">إجمالي التكلفة</div>
        <div className="col-span-1">حذف</div>
      </div>

      <div className="divide-y divide-[#1f2d4d]">
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-12 p-3 items-center text-center text-white bg-[#07132a] hover:bg-[#020B1C]/50 transition-all">
            <div className="col-span-3 text-right pr-4 font-bold text-sm text-[#F0E6D2]">{item.company || 'غير محدد'}</div>
            <div className="col-span-3 px-2">
              <div className="relative">
                <select
                  value={item.product_id}
                  onChange={(e) => {
                    const p = dbProducts.find(x => x.id === e.target.value);
                    editItem(key, item.id, { 
                      product_id: e.target.value, 
                      name: p?.product_name, 
                      rate: p?.price, 
                      company: p?.company || 'شركة معتمدة' 
                    });
                  }}
                  className="w-full h-9 bg-[#020B1C] border border-[#1f2d4d] rounded-xl px-3 text-[11px] text-[#F0E6D2] font-bold appearance-none outline-none focus:border-[#D4AF37]"
                >
                  <option value="">-- اختر المنتج --</option>
                  {dbProducts.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D4AF37]" />
              </div>
            </div>
            <div className="col-span-2 flex justify-center items-center gap-2" dir="ltr">
              <button onClick={() => editItem(key, item.id, { quantity: item.quantity + 1 })} className="w-6 h-6 rounded bg-[#020B1C] text-[#D4AF37] font-bold text-sm">+</button>
              <span className="text-base font-black min-w-[25px]">{item.quantity}</span>
              <button onClick={() => editItem(key, item.id, { quantity: Math.max(0, item.quantity - 1) })} className="w-6 h-6 rounded bg-[#020B1C] text-[#D4AF37] font-bold text-sm">-</button>
            </div>
            <div className="col-span-2 font-black text-sm text-[#F0E6D2]">
              {(item.rate || 0).toLocaleString()} <span className="text-[9px] text-gray-500">ج.م</span>
            </div>
            <div className="col-span-1 font-black text-base text-[#D4AF37]">
              {(item.quantity * item.rate).toLocaleString()}
            </div>
            <div className="col-span-1 flex justify-center">
              <button onClick={() => removeItem(key, item.id)} className="text-red-500/40 hover:text-red-500 p-2 transition-all">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-3 bg-[#020B1C]/50 flex justify-end border-t border-[#1f2d4d]">
        <button onClick={() => addItem(key)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-[11px] font-bold hover:bg-[#D4AF37] hover:text-black transition-all">
          <Plus className="w-3.5 h-3.5" />
          <span>إضافة بند توريد</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8" dir="rtl">
      {/* الكارت الرئيسي لتفعيل/إغلاق القسم بالكامل - تفاعلي يدعم الماوس اليد والإضاءة الفاخرة */}
      <div 
        onClick={() => { updateStateAndSave(prev => ({ enabled: !prev.enabled })); }}
        className={`p-6 rounded-[2.5rem] border transition-all duration-500 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl cursor-pointer select-none ${
          state.enabled 
            ? 'bg-[#07132a] border-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.15)] hover:shadow-[0_0_40px_rgba(212,175,55,0.25)]' 
            : 'bg-[#07132a]/40 border-[#1f2d4d] hover:border-gray-600'
        }`}
      >
        <div className="flex items-center gap-4 pr-2">
          <div className={`p-5 rounded-2xl transition-all duration-500 ${state.enabled ? 'bg-[#D4AF37] text-black shadow-[0_0_30px_rgba(212,175,55,0.4)]' : 'bg-[#020B1C] text-gray-600'}`}>
            <Droplets className="w-10 h-10" />
          </div>
          <div className="text-right">
            <h4 className="text-xl font-black text-[#F0E6D2]">منظومة السباكة والشبكات</h4>
            <p className="text-[11px] text-gray-400 mt-1 uppercase font-bold tracking-widest leading-none">Plumbing ERP System</p>
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

      <div className={`space-y-8 transition-all duration-500 ${state.enabled ? 'opacity-100' : 'opacity-10 pointer-events-none'}`}>

        {/* الكروت الفاخرة لاختيار نظام السباكة (مدفون / ظاهر) مع الماوس يد والوهج المضيء الهادئ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* كارت النظام المدفون */}
          <div
            onClick={() => { updateStateAndSave(() => ({ activeSystem: 'concealed' })); }}
            className={`p-6 rounded-[2rem] border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[140px] select-none ${
              state.activeSystem === 'concealed'
                ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_25px_rgba(212,175,55,0.15)]'
                : 'border-[#1f2d4d] bg-[#07132a] opacity-60 hover:opacity-100 hover:border-[#1f2d4d]/80'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="text-right pl-4">
                <h5 className={`text-lg font-black ${state.activeSystem === 'concealed' ? 'text-[#D4AF37]' : 'text-[#F0E6D2]'}`}>
                  نظام مدفون (كونسيلد)
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
              <span className={`text-[11px] font-bold px-4 py-1 rounded-full border transition-all ${
                state.activeSystem === 'concealed'
                  ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_10px_rgba(212,175,55,0.1)]'
                  : 'border-[#1f2d4d] text-gray-500 bg-transparent'
              }`}>
                {state.activeSystem === 'concealed' ? 'تم اختيار النظام' : 'اضغط للتفعيل'}
              </span>
            </div>
          </div>

          {/* كارت النظام الظاهر */}
          <div
            onClick={() => { updateStateAndSave(() => ({ activeSystem: 'regular' })); }}
            className={`p-6 rounded-[2rem] border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[140px] select-none ${
              state.activeSystem === 'regular'
                ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_25px_rgba(212,175,55,0.15)]'
                : 'border-[#1f2d4d] bg-[#07132a] opacity-60 hover:opacity-100 hover:border-[#1f2d4d]/80'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="text-right pl-4">
                <h5 className={`text-lg font-black ${state.activeSystem === 'regular' ? 'text-[#D4AF37]' : 'text-[#F0E6D2]'}`}>
                  نظام ظاهر (عادي)
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
              <span className={`text-[11px] font-bold px-4 py-1 rounded-full border transition-all ${
                state.activeSystem === 'regular'
                  ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_10px_rgba(212,175,55,0.1)]'
                  : 'border-[#1f2d4d] text-gray-500 bg-transparent'
              }`}>
                {state.activeSystem === 'regular' ? 'تم اختيار النظام' : 'اضغط للتفعيل'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div onClick={() => { updateStateAndSave(prev => ({ hasACDrainage: !prev.hasACDrainage })); }}
            className={`p-5 rounded-[1.8rem] border-2 transition-all cursor-pointer space-y-4 ${state.hasACDrainage ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_25px_rgba(212,175,55,0.15)]' : 'border-[#1f2d4d] bg-[#07132a]'}`}>
            <div className="flex items-center justify-between border-b border-[#1f2d4d] pb-2">
              <span className="text-base font-black text-[#F0E6D2]">صرف تكييف:</span>
              {state.hasACDrainage && <CheckCircle2 className="w-5 h-5 text-[#D4AF37]" />}
            </div>
            <div className="space-y-3" onClick={e => e.stopPropagation()}>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-500 font-bold">عدد الغرف / النقاط</span>
                <div className="flex items-center gap-6 bg-[#020B1C] px-4 py-2 rounded-xl border border-[#1f2d4d]">
                  <button onClick={() => { updateStateAndSave(prev => ({ acDrainCount: prev.acDrainCount + 1 })); }} className="text-[#D4AF37] text-xl font-bold">+</button>
                  <span className="text-lg font-black text-[#D4AF37] font-mono w-6 text-center">{state.acDrainCount}</span>
                  <button onClick={() => { updateStateAndSave(prev => ({ acDrainCount: Math.max(0, prev.acDrainCount - 1) })); }} className="text-[#D4AF37] text-xl font-bold">-</button>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-500 font-bold">تكلفة المصنعية (للنقطة)</span>
                <div className="flex items-center gap-6 bg-[#020B1C] px-4 py-2 rounded-xl border border-[#1f2d4d]">
                  <button onClick={() => { updateStateAndSave(prev => ({ acDrainLaborRate: prev.acDrainLaborRate + 50 })); }} className="text-[#D4AF37] text-xl font-bold">+</button>
                  <span className="text-base font-black text-[#D4AF37] font-mono min-w-[50px] text-center">{state.acDrainLaborRate}</span>
                  <button onClick={() => { updateStateAndSave(prev => ({ acDrainLaborRate: Math.max(0, prev.acDrainLaborRate - 50) })); }} className="text-[#D4AF37] text-xl font-bold">-</button>
                </div>
              </div>
            </div>
          </div>

          <div onClick={() => { updateStateAndSave(prev => ({ hasTerraceDrain: !prev.hasTerraceDrain })); }}
            className={`p-5 rounded-[1.8rem] border-2 transition-all cursor-pointer space-y-4 ${state.hasTerraceDrain ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_25px_rgba(212,175,55,0.15)]' : 'border-[#1f2d4d] bg-[#07132a]'}`}>
            <div className="flex items-center justify-between border-b border-[#1f2d4d] pb-2">
              <span className="text-base font-black text-[#F0E6D2]">صرف بلكونة:</span>
              {state.hasTerraceDrain && <CheckCircle2 className="w-5 h-5 text-[#D4AF37]" />}
            </div>
            <div className="space-y-3" onClick={e => e.stopPropagation()}>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-500 font-bold">عدد النقاط</span>
                <div className="flex items-center gap-6 bg-[#020B1C] px-4 py-2 rounded-xl border border-[#1f2d4d]">
                  <button onClick={() => { updateStateAndSave(prev => ({ terraceDrainCount: prev.terraceDrainCount + 1 })); }} className="text-[#D4AF37] text-xl font-bold">+</button>
                  <span className="text-lg font-black text-[#D4AF37] font-mono w-6 text-center">{state.terraceDrainCount}</span>
                  <button onClick={() => { updateStateAndSave(prev => ({ terraceDrainCount: Math.max(0, prev.terraceDrainCount - 1) })); }} className="text-[#D4AF37] text-xl font-bold">-</button>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-500 font-bold">تكلفة المصنعية (للنقطة)</span>
                <div className="flex items-center gap-6 bg-[#020B1C] px-4 py-2 rounded-xl border border-[#1f2d4d]">
                  <button onClick={() => { updateStateAndSave(prev => ({ terraceDrainLaborRate: prev.terraceDrainLaborRate + 50 })); }} className="text-[#D4AF37] text-xl font-bold">+</button>
                  <span className="text-base font-black text-[#D4AF37] font-mono min-w-[50px] text-center">{state.terraceDrainLaborRate}</span>
                  <button onClick={() => { updateStateAndSave(prev => ({ terraceDrainLaborRate: Math.max(0, prev.terraceDrainLaborRate - 50) })); }} className="text-[#D4AF37] text-xl font-bold">-</button>
                </div>
              </div>
            </div>
          </div>

          <div onClick={() => { updateStateAndSave(prev => ({ hasIndependentWaterLine: !prev.hasIndependentWaterLine })); }}
            className={`p-5 rounded-[1.8rem] border-2 transition-all cursor-pointer space-y-4 ${state.hasIndependentWaterLine ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_25px_rgba(212,175,55,0.15)]' : 'border-[#1f2d4d] bg-[#07132a]'}`}>
            <div className="flex items-center justify-between border-b border-[#1f2d4d] pb-2">
              <span className="text-base font-black text-[#F0E6D2]">خط مياه مستقل:</span>
              {state.hasIndependentWaterLine && <CheckCircle2 className="w-5 h-5 text-[#D4AF37]" />}
            </div>
            <div className="flex items-center justify-center py-6">
              <Droplets className={`w-14 h-14 ${state.hasIndependentWaterLine ? 'text-[#D4AF37] animate-bounce' : 'text-gray-800'}`} />
            </div>
            <div className="flex flex-col items-center gap-2 mt-2 pt-3 border-t border-[#1f2d4d]/20" onClick={e => e.stopPropagation()}>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">كلفة تأسيس الخط (مقطوعية)</span>
              <div className="flex items-center gap-4 bg-[#020B1C] px-4 py-1.5 rounded-xl border border-[#1f2d4d]/60 hover:border-[#D4AF37]/40 transition-all shadow-inner">
                <button 
                  type="button"
                  onClick={() => { 
                    updateStateAndSave(prev => ({ independentWaterLineRate: prev.independentWaterLineRate + 100 }));
                  }} 
                  className="text-[#D4AF37] font-bold text-xl hover:scale-110 active:scale-95 transition-transform"
                >
                  +
                </button>
                <span className="text-xl font-black text-[#D4AF37] font-mono min-w-[75px] text-center tracking-tighter">
                  {state.independentWaterLineRate.toLocaleString()}
                </span>
                <button 
                  type="button"
                  onClick={() => { 
                    updateStateAndSave(prev => ({ independentWaterLineRate: Math.max(0, prev.independentWaterLineRate - 100) }));
                  }} 
                  className="text-[#D4AF37] font-bold text-xl hover:scale-110 active:scale-95 transition-transform"
                >
                  -
                </button>
                <span className="text-[9px] text-gray-600 font-bold mr-1 uppercase">ج.م</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-base font-black text-[#D4AF37] mr-4 flex items-center gap-2">خامات التأسيس:</h4>
          {renderMaterialTable(state.activeSystem === 'concealed' ? state.concealedRoughIn : state.regularRoughIn, state.activeSystem === 'concealed' ? 'concealedRoughIn' : 'regularRoughIn')}
          
          <h4 className="text-base font-black text-[#D4AF37] mr-4 flex items-center gap-2">خامات التشطيب:</h4>
          {renderMaterialTable(state.activeSystem === 'concealed' ? state.concealedFinishing : state.regularFinishing, state.activeSystem === 'concealed' ? 'concealedFinishing' : 'regularFinishing')}
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 p-5 rounded-[1.8rem] bg-[#07132a] border border-[#1f2d4d] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]"><HardHat className="w-6 h-6" /></div>
              <span className="text-base font-bold text-[#F0E6D2]">كلفة المصنعيات</span>
            </div>
            <div className="flex items-center gap-4 bg-[#020B1C] px-4 py-2 rounded-2xl border border-[#1f2d4d]">
              <button onClick={() => { updateStateAndSave(prev => ({ laborLumpSum: prev.laborLumpSum + 500 })); }} className="text-[#D4AF37] font-bold text-xl">+</button>
              <span className="text-lg font-black text-[#D4AF37] font-mono min-w-[90px] text-center">{state.laborLumpSum.toLocaleString()}</span>
              <button onClick={() => { updateStateAndSave(prev => ({ laborLumpSum: Math.max(0, prev.laborLumpSum - 500) })); }} className="text-[#D4AF37] font-bold text-xl">-</button>
            </div>
          </div>

          <div className="flex-1 p-5 rounded-[1.8rem] bg-[#07132a] border border-[#1f2d4d] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]"><Truck className="w-6 h-6" /></div>
              <span className="text-base font-bold text-[#F0E6D2]">النقل والتشوين</span>
            </div>
            <div className="flex items-center gap-4 bg-[#020B1C] px-4 py-2 rounded-2xl border border-[#1f2d4d]">
              <button onClick={() => { updateStateAndSave(prev => ({ transportationRate: prev.transportationRate + 100 })); }} className="text-[#D4AF37] font-bold text-xl">+</button>
              <span className="text-lg font-black text-[#D4AF37] font-mono min-w-[90px] text-center">{state.transportationRate.toLocaleString()}</span>
              <button onClick={() => { updateStateAndSave(prev => ({ transportationRate: Math.max(0, prev.transportationRate - 100) })); }} className="text-[#D4AF37] font-bold text-xl">-</button>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-[2.5rem] bg-[#020B1C] border-2 border-[#D4AF37]/40 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_50px_rgba(212,175,55,0.15)]">
          <div className="text-right">
            <h4 className="text-2xl font-black text-[#D4AF37]">إجمالي السباكة</h4>
            <p className="text-[10px] text-gray-500 font-bold mt-1 tracking-widest uppercase">Estimated Total Cost</p>
          </div>
          <div className="flex items-center gap-6 bg-[#07132a] px-8 py-5 rounded-3xl border border-[#D4AF37]/10">
            <DollarSign className="w-8 h-8 text-[#D4AF37]" />
            <span className="text-4xl font-black text-[#F0E6D2] tracking-tighter">
              {totalCost.toLocaleString()} 
              <span className="text-lg font-normal mr-2 text-[#D4AF37]">ج.م</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}