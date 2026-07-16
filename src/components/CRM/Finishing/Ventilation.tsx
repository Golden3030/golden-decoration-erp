"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCRM } from "../context/CRMContext";
import { supabase } from "../../../lib/supabaseClient"; 
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
  Volume2
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

// البنود التفصيلية الافتراضية المطابقة لجدول مقايستك المرفق بالصورة

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

      // تصفية أمنة لحذف بند المصنعيات القديم من الجدول في حال تحميل مشروع قديم
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
      label: 'بند شفاط مخصص جديد',
      qty: 1,
      unit: 'عدد',
      price: 500,
      product_id: '',
      company: 'مورد معتمد',
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

  // ب. الإشراف الهندسي (15% من إجمالي البنود كما هو محدد بمقايستك المرفقة)
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
    /* تضييق الحاوية لتكون ملمومة ببيئة العمل مثل بقية الأجهزة والشاشات */
    <div className="space-y-8 select-none text-right font-sans max-w-5xl mx-auto w-full px-4 md:px-0" dir="rtl">

      {/* كارت التفعيل الرئيسي (On / Off) ذو الطابع الفاخر والماوس اليد المضيء */}
      <div 
        onClick={() => { updateStateAndSave(prev => ({ enabled: !prev.enabled })); }}
        className={`p-6 rounded-[2.5rem] border transition-all duration-500 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl cursor-pointer select-none ${
          state.enabled 
            ? 'bg-[#07132a] border-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.15)] hover:shadow-[0_0_40px_rgba(212,175,55,0.25)]' 
            : 'bg-[#07132a]/40 border-[#1f2d4d] hover:border-gray-600'
        }`}
      >
        <div className="flex items-center gap-4 w-full sm:w-auto pr-2">
          <div className={`p-5 rounded-2xl transition-all duration-500 flex-shrink-0 ${state.enabled ? 'bg-[#D4AF37] text-black shadow-[0_0_30px_rgba(212,175,55,0.4)]' : 'bg-[#020B1C] text-gray-600'}`}>
            <Wind className="w-10 h-10" />
          </div>
          <div className="text-right">
            <h4 className="text-xl font-black text-[#F0E6D2]">أعمال الشفاطات والتهوية الميكانيكية</h4>
            <p className="text-[11px] text-gray-400 mt-1 uppercase font-bold tracking-widest leading-none">VENTILATION & FANS SYSTEM</p>
          </div>
        </div>

        <div
          className={`px-10 py-3 rounded-2xl border-2 font-black text-base transition-all duration-300 flex items-center gap-3 flex-shrink-0 ${
            state.enabled 
              ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.1)]' 
              : 'bg-[#020B1C] border-[#D4AF37]/60 text-[#D4AF37]'
          }`}
        >
          {state.enabled ? <CheckCircle2 className="w-6 h-6 text-[#D4AF37]" /> : <Lock className="w-5 h-5 text-gray-500" />}
          {state.enabled ? 'القسم مفعل' : 'القسم مقفل'}
        </div>
      </div>

      {/* حظر التفاعل وتعتيم الشاشة عند الإغلاق التام للبند */}
      <div className={`space-y-8 transition-opacity duration-300 ${state.enabled ? 'opacity-100 pointer-events-auto' : 'opacity-25 pointer-events-none filter grayscale'}`}>
        
        {/* جدول حصر خامات الأرضيات والوزرة التفاعلي */}
        <div className="bg-[#07132a] border border-[#1f2d4d] p-6 rounded-2xl space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f2d4d]/40 pb-3">
            <div className="flex items-center gap-2 text-[#D4AF37]">
              <Layers className="w-6 h-6 animate-pulse" />
              <h4 className="text-xl font-bold text-[#F0E6D2]">جدول تفصيل بنود تمديد تأسيس الشفاطات بالمطبخ والحمامات:</h4>
            </div>
            <button
              type="button"
              disabled={!state.enabled}
              onClick={handleAddCustomRow}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 text-sm font-bold transition-all cursor-pointer"
            >
              <PlusCircle className="w-5 h-5" />
              <span>إضافة بند تهوية مخصص جديد</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            {/* حذف min-w-[1000px] لجعل حجم الجدول مضغوطاً وسريع الاستجابة بدون أي شريط تمرير */}
            <table className="w-full text-right border-collapse table-auto">
              <thead>
                <tr className="border-b border-[#1f2d4d] text-[#94a3b8] text-xs font-bold pb-2">
                  <th className="py-3 text-right pl-2 w-1/4">توصيف البند</th>
                  <th className="py-3 text-right w-1/12">الشركة الموردة</th>
                  <th className="py-3 text-right w-1/4"> المنتج</th>
                  <th className="py-3 text-center w-1/12">الكمية</th>
                  <th className="py-3 text-center w-1/6">سعر الوحدة</th>
                  <th className="py-3 text-center w-1/12">إجمالي التكلفة</th>
                  <th className="py-3 text-center w-1/12">حذف</th>
                </tr>
              </thead>
              <tbody>
                {state.items.map((row) => {
                  const current = row;
                  const rowProducts = dbProducts.filter(p => p.company === current.company);
                  const isCustom = row.isCustom === true;

                  return (
                    <tr key={row.key} className="border-b border-[#1f2d4d]/60 hover:bg-[#020B1C]/40 transition-colors duration-200">
                      <td className="py-3 text-[#F0E6D2] font-semibold text-xs pl-2">
                        {isCustom ? (
                          <input 
                            type="text"
                            value={row.label}
                            onChange={(e) => handleItemRowEdit(row.key, { label: e.target.value })}
                            className="bg-transparent border-b border-[#D4AF37]/30 focus:border-[#D4AF37] outline-none text-[#F0E6D2] font-bold text-xs w-full"
                            placeholder="اكتب اسم البند المخصص..."
                          />
                        ) : row.label}
                      </td>
                      <td className="py-3">
                        <select
                          value={current.company}
                          onChange={(e) => handleItemRowEdit(row.key, { company: e.target.value, product_id: '', price: 0 })}
                          className="bg-[#020B1C] border border-[#1f2d4d] p-1.5 rounded-lg text-white font-bold outline-none cursor-pointer focus:border-[#D4AF37] text-[11px]"
                        >
                          <option value="">-- اختر --</option>
                          {availableCompanies.length > 0 ? availableCompanies.map(c => <option key={c} value={c}>{c}</option>) : <option value="سمارت">سمارت</option>}
                        </select>
                      </td>
                      <td className="py-3">
                        <select
                          disabled={!current.company}
                          value={current.product_id}
                          onChange={(e) => handleItemRowEdit(row.key, { product_id: e.target.value })}
                          className="bg-[#020B1C] border border-[#1f2d4d] p-1.5 rounded-lg text-[#B48C34] font-black outline-none cursor-pointer focus:border-[#D4AF37] text-[11px] disabled:opacity-40 max-w-[200px]"
                        >
                          {/* تعديل نص الخيار البرمجي تلبية لطلبك الصارم */}
                          <option value="">-- اختر المنتج --</option>
                          {rowProducts.map(p => (
                            <option key={p.id} value={p.id}>{p.product_name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 text-center">
                        {/* عداد الكمية التفاعلي الفاخر المذهب مع أزرار النقصان الحمراء */}
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleItemRowEdit(row.key, { qty: current.qty + 1 })}
                            className="w-6 h-6 rounded bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black flex items-center justify-center font-bold cursor-pointer transition-all"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-bold text-[#D4AF37] font-mono min-w-[25px] text-center">{current.qty}</span>
                          <button
                            type="button"
                            onClick={() => handleItemRowEdit(row.key, { qty: Math.max(0, current.qty - 1) })}
                            className="w-6 h-6 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center font-bold cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3">
                        {/* عداد السعر تفاعلي ويدوي ثنائي الوظيفة ومذهب مع نقصان أحمر */}
                        <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-lg h-9 px-1.5 select-none w-32 mx-auto" onClick={(e) => e.stopPropagation()}>
                          <button 
                            type="button" 
                            onClick={() => handleItemRowEdit(row.key, { price: current.price + 100 })}
                            className="w-5 h-5 rounded bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none"
                          >
                            +
                          </button>
                          <div className="flex items-center justify-center font-mono">
                            <input 
                              type="number"
                              value={current.price}
                              onChange={(e) => handleItemRowEdit(row.key, { price: Number(e.target.value) })}
                              className="w-12 bg-transparent text-[#D4AF37] text-xs font-black outline-none text-center focus:border-transparent"
                            />
                            <span className="text-[9px] text-gray-500 font-bold">ج</span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => handleItemRowEdit(row.key, { price: Math.max(0, current.price - 100) })}
                            className="w-5 h-5 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center select-none"
                          >
                            -
                          </button>
                        </div>
                      </td>
                      <td className="py-3 text-center font-black text-[#D4AF37] font-mono text-sm">{(current.qty * current.price).toLocaleString()} <span className="text-[9px] text-gray-500 font-normal">ج</span></td>
                      <td className="py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.key)}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* كارت مصنعيات عمالة تركيب وتوصيل الشفاطات المستقل التفاعلي بالكامل */}
        <div className="p-6 rounded-3xl bg-[#07132a] border border-[#D4AF37]/20 flex flex-col sm:flex-row items-center justify-between gap-6 hover:border-[#D4AF37]/40 shadow-lg transition-all duration-300 select-none">
          <div className="text-right space-y-1 flex-1 pl-4">
            <h4 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2">
              <HardHat className="w-5 h-5 text-[#D4AF37]" />
              أجور مصنعية تركيب وتوصيل الشفاطات وتفتيح الكور:
            </h4>
            <p className="text-xs text-gray-400 leading-normal">
              أجور العمالة الفنية لفتح فتحات الكور الخرسانية، تمديد وتوصيل الخراطيم المرنة، وتثبيت وتجريب البلاورات بالمطبخ والحمامات بالموقع:
            </p>
          </div>
          
          {/* عداد مالي تفاعلي لضبط أجر المصنعيات المجمعة حراً بالزيادة والنقصان */}
          <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-44" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              onClick={() => updateStateAndSave(prev => ({ laborCost: prev.laborCost + 500 }))}
              className="w-7 h-7 rounded-lg bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none"
            >
              +
            </button>
            <span className="text-base font-black text-white font-mono">{state.laborCost.toLocaleString()} <span className="text-[10px] text-gray-500 font-normal">ج</span></span>
            <button 
              type="button" 
              onClick={() => updateStateAndSave(prev => ({ laborCost: Math.max(0, prev.laborCost - 500) }))}
              className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none"
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
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1zm0 0h5l4 4M5 20h14a1 1 0 001-1v-4a1 1 0 00-1-1h-5" /></svg>
            </div>
            <div className="text-right">
              <h4 className="text-xl font-bold text-[#F0E6D2]">تكاليف النقل وتشوين خامات ومراوح التهوية بالدور</h4>
              <p className="text-xs text-gray-400 mt-1">تأمين نقل الأجهزة ومراوح البلاور وتشوينها يدوياً للأدوار لسلامة الأجهزة من الخدش والكسر، حرّرها يدوياً:</p>
              
              {/* عداد تكاليف نقل وتشوين الألوميتال */}
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

        {/* صندوق الملاحظات النصية المدمج */}
        <div className="p-6 rounded-2xl bg-[#07132a] border border-[#1f2d4d] space-y-3">
          <div className="flex items-center gap-2 text-[#D4AF37] border-b border-[#1f2d4d] pb-2 text-right">
            <FileText className="w-5 h-5" />
            <h4 className="text-base font-bold">اتفاقات وبنود مخصصة لأعمال وتجليد السلم الداخلي (اتفاقات العقد):</h4>
          </div>
          <textarea
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="اكتب مواصفات الدهانات وملاحظات العقد الفنية بالتفصيل للعمال..."
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

          <div className="space-y-1 text-center sm:text-right pr-2 flex-1">
            <h4 className="text-xl font-bold text-[#D4AF37]">الملخص المالي التقديري لأعمال الشفاطات والتهوية الميكانيكية بالـ BOQ:</h4>
            <p className="text-sm text-gray-400 leading-relaxed mt-2 text-right">
              حصر مالي كامل لبنود التأسيس المجمعة بقيمة ( {subtotalEstimate.toLocaleString()} ج.م) مضافاً إليها كلفة **الإشراف الهندسي المعتمد (15%)** بقيمة قدرها ({supervisionEstimate.toLocaleString()} ج.م) مع احتساب تكاليف النقل واللوجستيات لجميع الأجهزة والبلورات.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-[#07132a] px-8 py-5 rounded-xl border border-[#1f2d4d]">
            <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
              <DollarSign className="w-8 h-8 animate-pulse" />
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 block font-semibold text-right">إجمالي تكلفة أعمال التهوية بالكامل:</span>
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