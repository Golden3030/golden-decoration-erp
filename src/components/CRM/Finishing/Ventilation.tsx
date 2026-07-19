"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCRM } from "../context/CRMContext";
import { supabase } from "../../../lib/supabaseClient"; 
import TabActivationBanner from './TabActivationBanner'; // 👈 استدعاء المكون المشترك الموحد للأجهزة اللمسية للشركة
import { 
  Zap, 
  Layers, 
  Plus, 
  Minus, 
  Star, 
  DollarSign, 
  Cpu, 
  FileText, 
  PlusCircle, 
  Trash2, 
  RefreshCw,
  CheckCircle2,
  Lock,
  Wind,
  HardHat,
  Truck,
  Volume2,
  ChevronDown
} from 'lucide-react';

interface VentilationProps {
  projectId: string;
}

// واجهة تعريف منتجات التهوية والشفاطات من سوبابيز
interface VentProductItem {
  id: string;
  code: string;
  product_name: string;
  category: string;
  company: string;
  price: number;
  unit: string;
  subcategory?: string;
}

// واجهة البند الفردي لجدول الحصر التفصيلي
interface VentLineItem {
  key: string;
  label: string;
  qty: number;
  unit: string;
  price: number;
  product_id: string;  // من قاعدة البيانات إذا تم ربطه
  company: string;
  isCustom?: boolean;
}

// البنود التفصيلية الافتراضية المطابقة لجدول مقايستك
const DEFAULT_VENT_ITEMS: VentLineItem[] = [
  { key: 'blower_5', label: 'بلاور (حمامات)', qty: 2, unit: 'جهاز', price: 3500, product_id: '', company: 'سمارت' },
  { key: 'grille_5', label: 'جريلة (حمامات)', qty: 3, unit: 'عدد', price: 700, product_id: '', company: 'سمارت' },
  { key: 'vent_5', label: 'هواية (حمامات)', qty: 3, unit: 'عدد', price: 300, product_id: '', company: 'سمارت' },
  { key: 'pipe_5', label: 'وصلة ماسورة (حمامات)', qty: 3, unit: 'عدد', price: 300, product_id: '', company: 'سمارت' },
  { key: 'flex_5', label: 'فلكسبل (حمامات)', qty: 1, unit: 'عدد', price: 500, product_id: '', company: 'سمارت' },
  { key: 'connector_5', label: 'مشترك (حمامات)', qty: 1, unit: 'عدد', price: 500, product_id: '', company: 'سمارت' },
  { key: 'blower_6', label: 'بلاور (المطبخ)', qty: 1, unit: 'جهاز', price: 4000, product_id: '', company: 'سمارت' },
  { key: 'grille_6', label: 'جريلة (المطبخ)', qty: 1, unit: 'عدد', price: 700, product_id: '', company: 'سمارت' },
  { key: 'vent_6', label: 'هواية (المطبخ)', qty: 1, unit: 'عدد', price: 350, product_id: '', company: 'سمارت' },
  { key: 'pipe_6', label: 'وصلة ماسورة (المطبخ)', qty: 1, unit: 'عدد', price: 350, product_id: '', company: 'سمارت' },
  { key: 'flex_6', label: 'فلكسبل (المطبخ)', qty: 1, unit: 'عدد', price: 400, product_id: '', company: 'سمارت' },
  { key: 'connector_6', label: 'مشترك (المطبخ)', qty: 1, unit: 'عدد', price: 600, product_id: '', company: 'سمارت' },
  { key: 'foam_6', label: 'فوم تثبيت وعزل (المطبخ)', qty: 1, unit: 'عبوة', price: 150, product_id: '', company: 'سمارت' },
  { key: 'core_6', label: 'كور خرسانة', qty: 1, unit: 'فتحة', price: 300, product_id: '', company: 'سمارت' },
  { key: 'core_5', label: 'كور خرسانة', qty: 3, unit: 'فتحة', price: 250, product_id: '', company: 'سمارت' },
];

export default function Ventilation({ projectId }: VentilationProps) {
  const { crmData, updateBulkFinishingSection } = useCRM();

  const [dbProducts, setDbProducts] = useState<VentProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // مرجع برامجي لمنع تعارض الحفظ وحظر الـ Infinite Loops أثناء مزامنة البيانات سحابياً
  const isLocalChange = useRef(false);

  // الحالة الموحدة الفاخرة للتحكم في منظومة التهوية والشفاطات
  const [state, setState] = useState({
    enabled: true,
    items: DEFAULT_VENT_ITEMS,
    laborCost: 4000, // أجور المصنعيات المفصولة بكارت مستقل
    notes: '',
    hasTransportation: true,
    transportationPrice: 1000
  });

  // حالة وسيطة لإدخال النصوص لمنع إرسال طلبات متعددة مع كل حرف يكتبه المستخدم
  const [notesInput, setNotesInput] = useState<string>('');

  // استعلام جلب كتالوج المنتجات حركياً من قاعدة البيانات سوبابيز
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const { data } = await supabase
          .from('products_library')
          .select('*')
          .eq('category', 'ventilation');

        if (data) {
          const mapped: VentProductItem[] = data.map(p => ({
            id: p.id,
            code: p.code,
            product_name: p.product_name,
            category: p.category,
            company: p.company || 'سمارت',
            price: Number(p.price || 0),
            unit: p.unit || 'قطعة',
            subcategory: p.subcategory
          }));
          setDbProducts(mapped);
        }
      } catch (err) {
        console.error("خطأ جلب خامات التهوية المعتمدة:", err);
      } finally {
        setLoading(false);
      }
    };
    if (projectId) fetchProducts();
  }, [projectId]);

  // اقتران ومزامنة البيانات المحفوظة مسبقاً لمشروع العميل الحالي
  useEffect(() => {
    if (crmData?.finishing?.ventilation) {
      const ventContext = crmData.finishing.ventilation;

      // تصفية آمنة لحذف بند المصنعيات القديم من الجدول في حال تحميل مشروع قديم
      const itemsList = ventContext.items && Array.isArray(ventContext.items) && ventContext.items.length > 0
        ? ventContext.items.filter((item: any) => item.key !== 'labor')
        : DEFAULT_VENT_ITEMS;

      isLocalChange.current = false;
      setState({
        enabled: ventContext.enabled ?? true,
        items: itemsList,
        laborCost: ventContext.laborCost ?? 4000,
        notes: ventContext.notes ?? '',
        hasTransportation: ventContext.hasTransportation ?? true,
        transportationPrice: ventContext.transportationPrice ?? 1000
      });
      setNotesInput(ventContext.notes ?? '');
    }
  }, [crmData]);

  // التحديث التلقائي الفوري والآمن مع قاعدة البيانات سحابياً
  useEffect(() => {
    if (isLocalChange.current) {
      updateBulkFinishingSection('ventilation', state);
      isLocalChange.current = false;
    }
  }, [state]);

  // دالة تحديث الحالة المحلية المتزامنة بأمان تام وبدون تعارض رندر
  const updateStateAndSave = (updater: (prev: typeof state) => Partial<typeof state>) => {
    setIsSaving(true);
    isLocalChange.current = true;
    setState(prev => {
      const updates = updater(prev);
      return { ...prev, ...updates };
    });
    setIsSaving(false);
  };

  // إضافة صف أو خامة تهوية مخصصة يدوياً بداخل جدول الحصر
  const handleAddCustomRow = () => {
    const uniqueKey = `custom_vent_${Date.now()}`;
    const newItem: VentLineItem = {
      key: uniqueKey,
      label: '',
      qty: 1,
      unit: 'عدد',
      price: 0,
      product_id: '',
      company: '',
      isCustom: true
    };
    updateStateAndSave(prev => ({
      items: [...prev.items, newItem]
    }));
  };

  // تعديل قيم صف فردي داخل جدول حصر مساحات النوافذ
  const handleItemRowEdit = (key: string, fields: Partial<VentLineItem>) => {
    updateStateAndSave(prev => ({
      items: prev.items.map(row => {
        if (row.key === key) {
          if (fields.product_id) {
            const product = dbProducts.find(p => p.id === fields.product_id);
            return {
              ...row,
              ...fields,
              price: product ? product.price : row.price,
              company: product ? product.company : row.company
            };
          }
          return { ...row, ...fields };
        }
        return row;
      })
    }));
  };

  // حذف صف أو خامة تهوية مخصصة بالكامل من المقايسة والـ BOQ
  const handleRemoveRow = (key: string) => {
    updateStateAndSave(prev => ({
      items: prev.items.filter(row => row.key !== key)
    }));
  };

  // دالة حفظ الملاحظات بحدث الـ Blur
  const handleNotesBlur = () => {
    updateStateAndSave(prev => ({ notes: notesInput }));
  };

  // --- العمليات الحسابية والمالية التراكمية للبند بالـ BOQ ---
  // أ. الإجمالي الفرعي للبنود والخامات مع أجور المصنعيات المفصولة
  const subtotalEstimate = state.enabled 
    ? state.items.reduce((sum, item) => sum + ((item.qty || 0) * (item.price || 0)), 0) + state.laborCost
    : 0;

  // ب. الإشراف الهندسي (15% من إجمالي البنود كما هو محدد بمقايستك)
  const supervisionEstimate = subtotalEstimate * 0.15;

  // ج. تكاليف النقل والتشوين المضاف للمقايسة
  const activeTransportationCost = state.enabled && state.hasTransportation ? state.transportationPrice : 0;

  // د. الإجمالي الكلي لبند الشفاطات والتهوية مجمعاً بالتمام والكمال
  const grandTotalEstimate = subtotalEstimate + supervisionEstimate + activeTransportationCost;

  // استخلاص الشركات المعتمدة ديناميكياً من قاعدة البيانات
  const availableCompanies = useMemo(() => {
    return Array.from(new Set(dbProducts.map(p => p.company))).filter(Boolean);
  }, [dbProducts]);

  return (
    <div className="space-y-8 select-none text-right font-alexandria max-w-5xl mx-auto w-full px-4 md:px-0" dir="rtl">

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800;900&display=swap');
        
        .font-alexandria {
          font-family: 'Alexandria', Arial, sans-serif !important;
          letter-spacing: normal !important;
        }
      `}</style>

      {/* 🌟 ضبط كارت التفعيل بالمقابية واستدعاء الراية اللمسية الموحدة للشركة */}
      <TabActivationBanner 
        title="منظومة التهوية والشفاطات الميكانيكية"
        subtitle="VENTILATION & MECHANICAL FANS SYSTEM"
        icon={Wind}
        enabled={state.enabled}
        onToggle={() => { updateStateAndSave(prev => ({ enabled: !prev.enabled })); }}
      />

      {/* حظر التفاعل وتعتيم الشاشة عند الإغلاق التام للبند */}
      <div className={`space-y-8 transition-opacity duration-300 ${state.enabled ? 'opacity-100 pointer-events-auto' : 'opacity-25 pointer-events-none filter grayscale'}`}>
        
        {/* جدول حصر خامات ومستلزمات الشفاطات بتصميم أرستقراطي مذهل */}
        <div className="bg-[#07132a] border border-[#D4AF37] p-6 rounded-[2rem] space-y-4 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D4AF37] pb-4">
            <div className="flex items-center gap-2 text-[#D4AF37]">
              <Layers className="w-6 h-6" />
              <h4 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2">تفصيل تمديد تأسيس الشفاطات والتهوية بالموقع:</h4>
            </div>
            
            {/* زر إضافة بند مخصص بتصميم ذهبي متوهج */}
            <button
              type="button"
              disabled={!state.enabled}
              onClick={handleAddCustomRow}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#D4AF37]/10 hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] border border-[#D4AF37]/30 text-xs font-black transition-all cursor-pointer shadow-md"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إضافة بند </span>
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#D4AF37]/60 bg-[#020B1C]/40">
            <table className="w-full text-right border-collapse table-auto">
              <thead>
                <tr className="bg-[#020B1C] text-[#D4AF37] text-xs font-semibold select-none border-b border-[#D4AF37]">
                  <th className="py-4 pr-6 text-right w-1/4">اسم بند التهوية والتوصيف</th>
                  <th className="py-4 text-center w-1/6">الشركة الموردة</th>
                  <th className="py-4 text-center w-1/4"> خامة كتالوج المخزن</th>
                  <th className="py-4 text-center w-1/12">الكمية</th>
                  <th className="py-4 text-center w-1/6">سعر الوحدة</th>
                  <th className="py-4 text-center w-1/12">الإجمالي</th>
                  <th className="py-4 text-center w-1/12 pl-4">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2d4d]/30">
                {state.items.map((row) => {
                  const current = row;
                  const rowProducts = dbProducts.filter(p => p.company === current.company);
                  const isCustom = row.isCustom === true;

                  return (
                    <tr key={row.key} className="hover:bg-[#020B1C]/60 transition-colors duration-200">
                      
                      {/* توصيف البند: يدعم التحرير الحر للبند اليدوي والمنوع */}
                      <td className="py-4 pr-6 text-[#F0E6D2] font-bold text-xs">
                        {isCustom ? (
                          <input 
                            type="text"
                            value={row.label}
                            onChange={(e) => handleItemRowEdit(row.key, { label: e.target.value })}
                            className="bg-transparent border-b border-[#D4AF37]/40 focus:border-[#D4AF37] outline-none text-[#F0E6D2] font-bold text-xs w-full max-w-[220px]"
                            placeholder="بند يدوي غير مسجل..."
                          />
                        ) : row.label}
                      </td>

                      {/* الشركة الموردة */}
                      <td className="py-4 text-center">
                        <div className="relative inline-block w-28 text-center select-none">
                          <select
                            value={current.company}
                            onChange={(e) => handleItemRowEdit(row.key, { company: e.target.value, product_id: '', price: 0 })}
                            className="w-full bg-[#020B1C] border border-[#1f2d4d] py-1.5 px-3 rounded-lg text-white font-bold text-[11px] appearance-none outline-none focus:border-[#D4AF37] cursor-pointer"
                          >
                            <option value="">-- اختر --</option>
                            {availableCompanies.length > 0 ? availableCompanies.map(c => <option key={c} value={c}>{c}</option>) : <option value="سمارت">سمارت</option>}
                          </select>
                          <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D4AF37] pointer-events-none" />
                        </div>
                      </td>

                      {/* المنتج المعتمد من سوبابيز */}
                      <td className="py-4 text-center">
                        <div className="relative inline-block w-48 text-center select-none">
                          <select
                            disabled={!current.company}
                            value={current.product_id}
                            onChange={(e) => handleItemRowEdit(row.key, { product_id: e.target.value })}
                            className="w-full bg-[#020B1C] border border-[#1f2d4d] py-1.5 px-3 rounded-lg text-[#B48C34] font-black text-[11px] appearance-none outline-none focus:border-[#D4AF37] cursor-pointer disabled:opacity-40"
                          >
                            <option value="">-- اختر المنتج من الكتالوج --</option>
                            {rowProducts.map(p => (
                              <option key={p.id} value={p.id}>{p.product_name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D4AF37] pointer-events-none" />
                        </div>
                      </td>

                      {/* 🌟 عداد الكمية التفاعلي الموحد بدقة h-11 الرشيقة وعناصر التحكم الدائرية */}
                      <td className="py-4 text-center select-none">
                        <div className="flex items-center justify-center gap-1.5 h-11" dir="ltr">
                          <button
                            type="button"
                            onClick={() => handleItemRowEdit(row.key, { qty: current.qty + 1 })}
                            className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] flex items-center justify-center font-bold cursor-pointer transition-all active:scale-95 text-xs font-sans"
                          >
                            +
                          </button>
                          <span className="text-sm font-black text-white font-mono min-w-[20px] text-center">{current.qty}</span>
                          <button
                            type="button"
                            onClick={() => handleItemRowEdit(row.key, { qty: Math.max(0, current.qty - 1) })}
                            className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white flex items-center justify-center font-bold cursor-pointer transition-all active:scale-95 text-xs font-sans"
                          >
                            -
                          </button>
                        </div>
                      </td>

                      {/* سعر الوحدة: حقل تفاعلي دقيق h-11 مع إمكانية الكتابة الفورية */}
                      <td className="py-4 text-center select-none">
                        <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2.5 w-32 mx-auto" onClick={(e) => e.stopPropagation()}>
                          <button 
                            type="button" 
                            onClick={() => handleItemRowEdit(row.key, { price: current.price + 100 })}
                            className="w-5 h-5 rounded bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] font-bold text-xs flex items-center justify-center cursor-pointer transition-all"
                          >
                            +
                          </button>
                          <div className="flex items-center justify-center font-mono">
                            <input 
                              type="number"
                              value={current.price}
                              onChange={(e) => handleItemRowEdit(row.key, { price: Number(e.target.value) })}
                              className="w-14 bg-transparent text-[#D4AF37] text-xs font-black outline-none text-center focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-[9px] text-gray-500 font-bold mr-0.5">ج</span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => handleItemRowEdit(row.key, { price: Math.max(0, current.price - 100) })}
                            className="w-5 h-5 rounded bg-[#020B1C] border border-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white font-bold text-xs flex items-center justify-center cursor-pointer transition-all"
                          >
                            -
                          </button>
                        </div>
                      </td>

                      {/* إجمالي التكلفة التراكمية */}
                      <td className="py-4 text-center font-black text-[#D4AF37] font-mono text-sm">
                        {(current.qty * current.price).toLocaleString()} <span className="text-[9px] text-gray-500 font-normal">ج</span>
                      </td>

                      {/* حذف السطر */}
                      <td className="py-4 text-center pl-4 select-none">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.key)}
                          className="p-2 text-red-500/40 hover:text-red-500 transition-all cursor-pointer rounded-lg hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* كارت مصنعيات تركيب وتوصيل الشفاطات المستقل */}
        <div className="p-6 rounded-[1.8rem] bg-[#07132a] border border-[#D4AF37] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl select-none">
          <div className="text-right space-y-1 flex-1 pl-4">
            <h4 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2">
              <HardHat className="w-5 h-5 text-[#D4AF37]" />
             مصنعية تركيب وتوصيل تأسيس الشفاطات وتفتيح الكور:
            </h4>
            <p className="text-xs text-white leading-normal">
              مصنعية الفنيين لفتحات الكور الخرسانية وتثبيت وتوصيل الخراطيم المرنة بالمطبخ والحمامات:
            </p>
          </div>
          
          {/* عداد مصنعية التهوية حركي ومذهب h-11 */}
          <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-44" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              onClick={() => updateStateAndSave(prev => ({ laborCost: prev.laborCost + 500 }))}
              className="w-7 h-7 rounded-lg bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-sans"
            >
              +
            </button>
            <span className="text-base font-black text-[#D4AF37] font-mono">{state.laborCost.toLocaleString()} <span className="text-[10px] text-gray-500 font-normal">ج</span></span>
            <button 
              type="button" 
              onClick={() => updateStateAndSave(prev => ({ laborCost: Math.max(0, prev.laborCost - 500) }))}
              className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none font-sans"
            >
              -
            </button>
          </div>
        </div>

        {/* كارت كماليات نقل وتشوين خامات ومراوح التهوية */}
        <div 
          onClick={() => {
            if (!state.enabled) return;
            updateStateAndSave(prev => ({ hasTransportation: !prev.hasTransportation }));
          }}
          className={`p-6 rounded-[1.8rem] border transition-all duration-300 flex flex-col sm:flex-row items-center justify-between gap-6 select-none ${
            state.enabled ? 'cursor-pointer' : 'cursor-not-allowed'
          } ${
            state.hasTransportation && state.enabled
              ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_20px_rgba(212,175,55,0.08)] opacity-100' 
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
              <h4 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2">تكاليف النقل وتشوين خامات ومراوح التهوية بالدور</h4>
              <p className="text-xs text-white mt-1">تأمين نقل الأجهزة ومراوح البلاور وتشوينها يدوياً للأدوار لسلامة الأجهزة من الخدش والكسر:</p>
              
              {/* عداد تكاليف النقل اللوجستي والتشوين h-11 */}
              <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-44">
                  <button
                    type="button"
                    disabled={!state.hasTransportation || !state.enabled}
                    onClick={() => updateStateAndSave(prev => ({ transportationPrice: prev.transportationPrice + 100 }))}
                    className="w-6 h-6 rounded bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center font-sans"
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
                    className="w-6 h-6 rounded bg-[#07132a] text-gray-400 hover:bg-red-500 hover:text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center font-sans"
                  >
                    -
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="text-center sm:text-left min-w-[145px] border-t sm:border-t-0 sm:border-r border-[#1f2d4d]/40 pt-4 sm:pt-0 sm:pr-6 w-full sm:w-auto select-none text-right">
            <span className="text-xs text-white block font-semibold">تكلفة التشوين المعتمدة:</span>
            <span className="text-xl font-black text-[#D4AF37] font-mono">{activeTransportationCost.toLocaleString('en-US')} ج.م</span>
          </div>
        </div>

        {/* صندوق الملاحظات النصية الفاخر المدمج */}
        <div className="p-6 rounded-[1.8rem] bg-[#07132a] border border-[#D4AF37] space-y-3">
          <div className="flex items-center gap-2 text-[#D4AF37] border-b border-[#D4AF37] pb-2 text-right">
            <FileText className="w-5 h-5" />
            <h4 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2">اتفاقات وبنود مخصصة لأعمال وتجليد السلم الداخلي:</h4>
          </div>
          <textarea
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="اكتب مواصفات التهوية الميكانيكية وملاحظات العقد الفنية بالتفصيل للعمال..."
            className="w-full h-24 p-4 rounded-xl bg-[#020B1C] border border-[#1f2d4d] hover:border-[#D4AF37]/50 focus:border-[#D4AF37] text-lg text-[#F0E6D2] placeholder-gray-500 outline-none transition-all resize-none text-base leading-relaxed text-right font-semibold"
          />
          <div className="flex justify-between items-center text-xs text-gray-500 px-1">
            <span>يتم الحفظ تلقائياً بمجرد الخروج من حقل الكتابة</span>
            <span>حالة الاتصال: متصل </span>
          </div>
        </div>

        {/* 🌟 كارت الملخص المالي الإجمالي بعد تكبيره وتفخيمه ليتطابق مع القوانين الأرستقراطية للنظام */}
       <div className="p-5 rounded-xl bg-[#020B1C] border border-[#D4AF37]/30 shadow-[0_0_20px_rgba(212,175,55,0.05)] flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden font-alexandria">
          <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[#D4AF37]" />
          <div className="space-y-1 text-center sm:text-right pr-1 select-none">
            <h4 className="text-lg font-bold text-[#D4AF37]">الملخص المالي النهائي المعتمد لأعمال الشفاطات والتهوية الميكانيكية بالـ BOQ:</h4>
           <p className="text-xs text-white font-normal leading-relaxed max-w-2xl text-right">
              الاحتساب التلقائي اللحظي يمثل: مجموع كلفة أعمال تمديد وتأسيس خامات الشفاطات المجمعة بقيمة قدرها ({subtotalEstimate.toLocaleString()} ج.م) مضافاً إليها كلفة **الإشراف الهندسي الفني المعتمد للشركة (15%)** بقيمة قدرها ({supervisionEstimate.toLocaleString()} ج.م) مع احتساب أجور النقل والتشوين الميداني.
            </p>
          </div>

            <div className="flex items-center gap-3 bg-[#07132a] px-6 py-4 rounded-lg border border-[#1f2d4d]">
                      <div className="p-1.5 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <div className="text-right">
              <span className="text-[10px] text-white block font-semibold text-right">إجمالي تكلفة أعمال التهوية بالكامل:</span>
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