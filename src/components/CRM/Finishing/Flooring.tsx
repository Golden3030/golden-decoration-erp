"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useCRM } from "../context/CRMContext";
import { supabase } from '@/lib/supabaseClient'; 

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
  Palette,
  HardHat,
  Truck,
  Sparkles,
  Wrench,
  CheckSquare,
  Square
} from 'lucide-react';

interface Product {
  id: string;
  code: string;
  category: string;
  subcategory: string;
  company: string;
  product_name: string;
  unit: string;
  price: number;
}

interface FlooringItem {
  qty: number;
  company: string;
  product_id: string;
  price: number;
}

interface FlooringState {
  enabled: boolean;
  items: { [key: string]: FlooringItem };
  customLabels: { [key: string]: string }; // لحفظ المسميات المخصصة للبنود المضافة يدوياً
  skirting_type: 'normal' | 'concealed' | 'concealed_led';
  cement_bags: number;
  sand_m3: number;
  grout_product_id: string;
  grout_price: number;
  grout_qty: number;
  accessories: {
    clips_wedges: boolean;
    pigments: boolean;
    steel_wool: boolean;
    broom: boolean;
    mop: boolean;
  };
  accessoryPrices: {
    clips_wedges: number;
    pigments: number;
    steel_wool: number;
    broom: number;
    mop: number;
  };
  labor: {
    floor_rate: number;
    wall_rate: number;
    skirting_rate: number;
  };
  logistics: {
    transport: number;
    cleaning: number;
  };
  manual_overrides: string[];
  notes: string;
}

const DEFAULT_ACCESSORY_PRICES = {
  clips_wedges: 150,
  pigments: 80,
  steel_wool: 50,
  broom: 60,
  mop: 90
};

const DEFAULT_FLOORING_STATE: FlooringState = {
  enabled: true,
  items: {
    reception: { qty: 30, company: 'كليوباترا', product_id: '', price: 180 },
    rooms: { qty: 46, company: 'كليوباترا', product_id: '', price: 180 },
    kitchen_floor: { qty: 10, company: 'كليوباترا', product_id: '', price: 160 },
    bathroom_floor: { qty: 6, company: 'كليوباترا', product_id: '', price: 160 },
    kitchen_walls: { qty: 30, company: 'كليوباترا', product_id: '', price: 150 },
    bathroom_walls: { qty: 18, company: 'كليوباترا', product_id: '', price: 150 },
    skirting: { qty: 50, company: 'كليوباترا', product_id: '', price: 80 }
  },
  customLabels: {},
  skirting_type: 'normal',
  cement_bags: 0,
  sand_m3: 0,
  grout_product_id: '',
  grout_price: 0,
  grout_qty: 0,
  accessories: {
    clips_wedges: true,
    pigments: true,
    steel_wool: true,
    broom: true,
    mop: true
  },
  accessoryPrices: {
    clips_wedges: 150,
    pigments: 80,
    steel_wool: 50,
    broom: 60,
    mop: 90
  },
  labor: {
    floor_rate: 90,
    wall_rate: 110,
    skirting_rate: 30
  },
  logistics: {
    transport: 1500,
    cleaning: 800
  },
  manual_overrides: [],
  notes: ''
};

export default function Flooring() {
  const { crmData, updateBulkFinishingSection } = useCRM();
  const projectId = crmData?.project?.id;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // مرجع برامجي لمنع تعارض الحفظ وحظر الـ Infinite Loops أثناء مزامنة البيانات سحابياً
  const isLocalChange = useRef(false);

  // الحالة الموحدة الفاخرة للتحكم في منظومة الأرضيات والسيراميك والرخام
  const [state, setState] = useState<FlooringState>(DEFAULT_FLOORING_STATE);
  const [notesInput, setNotesInput] = useState<string>('');

  const project = crmData?.project || {};
  const totalProjectArea = Number(project.area || 150);

  // حصر حركي صارم: يقرأ فقط المساحات الموزعة والمفعلة بقيم أكبر من صفر في تابة المساحات دون أي تداخل
  const getDynamicRoomsList = useCallback((): { key: string; label: string; defaultQty: number }[] => {
    const list: { key: string; label: string; defaultQty: number }[] = [];
    const customValues = crmData?.finishing?.areas?.values || {};

    const bedroomsVal = Number(project.roomsCount || 2);
    const bathroomsVal = Number(project.bathroomsCount || 1);
    const receptionsVal = Number(project.receptionsCount || 1);
    const kitchensVal = Number(project.kitchensCount || 1);
    const balconiesVal = Number(project.balconiesCount || 1);
    const livingVal = Number(project.livingCount || 1);

    // 1. أرضيات صالونات الريسبشن
    for (let i = 1; i <= receptionsVal; i++) {
      const key = receptionsVal === 1 ? 'الريسبشن الرئيسى' : `الريسبشن - قطعة ${i}`;
      const size = Number(customValues[key] || (i === 1 ? 30 : 20));
      list.push({ key: receptionsVal === 1 ? 'reception' : `floor_rec_${i}`, label: receptionsVal === 1 ? 'بلاط أرضيات الريسبشن والصالون' : `أرضية الريسبشن - قطعة ${i}`, defaultQty: size });
    }

    // 2. أرضيات غرف النوم
    for (let i = 1; i <= bedroomsVal; i++) {
      const key = i === 1 ? 'غرفة النوم الرئيسية' : `غرفة الأطفال ${i - 1}`;
      const size = Number(customValues[key] || (i === 1 ? 20 : i === 2 ? 12 : 10));
      list.push({ key: i === 1 ? 'rooms' : `floor_room_${i}`, label: i === 1 ? 'بلاط أرضيات غرف النوم والمعيشة' : `أرضية غرفة الأطفال ${i - 1}`, defaultQty: size });
    }

    // 3. أرضية وحوائط المطابخ
    for (let i = 1; i <= kitchensVal; i++) {
      const size = Number(customValues['المطبخ الرئيسي'] || 10);
      list.push({ key: `kitchen_floor`, label: 'بلاط أرضيات المطبخ الرئيسي', defaultQty: size });
      list.push({ key: `kitchen_walls`, label: 'سيراميك جدران وحوائط المطبخ', defaultQty: size * 3 });
    }

    // 4. أرضية وحوائط الحمامات
    for (let i = 1; i <= bathroomsVal; i++) {
      const size = Number(customValues['الحمام الرئيسي'] || 6);
      list.push({ key: `bathroom_floor`, label: 'بلاط أرضيات الحمام الرئيسي', defaultQty: size });
      list.push({ key: `bathroom_walls`, label: 'سيراميك جدران وحوائط الحمام', defaultQty: size * 3 });
    }

    // 5. البلكونات (التراس)
    for (let i = 1; i <= balconiesVal; i++) {
      const key = balconiesVal === 1 ? 'البلكونة الرئيسية' : `البلكونة الفرعية ${i}`;
      const size = Number(customValues[key] || 5);
      list.push({ key: `floor_balc_${i}`, label: balconiesVal === 1 ? 'أرضية البلكونة الرئيسية (التراس)' : `أرضية البلكونة الفرعية ${i}`, defaultQty: size });
    }

    // 6. غرف المعيشة (ليفنج)
    for (let i = 1; i <= livingVal; i++) {
      const key = livingVal === 1 ? 'الليفنج الرئيسي' : `الليفنج - قطعة ${i}`;
      const size = Number(customValues[key] || 18);
      list.push({ key: `floor_living_${i}`, label: livingVal === 1 ? 'أرضية الليفنج الرئيسي' : `أرضية الليفنج - قطعة ${i}`, defaultQty: size });
    }

    // 7. باقة الطرقات والممرات (تظهر في حال تفعيلها في شاشة المساحات)
    const hasCorridors = !!(
      (customValues["الطرقة الرئيسية"] && Number(customValues["الطرقة الرئيسية"]) > 0) || 
      (customValues["الطرقة الفرعية"] && Number(customValues["الطرقة الفرعية"]) > 0)
    );
    if (hasCorridors) {
      if (customValues["الطرقة الرئيسية"] && Number(customValues["الطرقة الرئيسية"]) > 0) {
        list.push({ key: `floor_corridor_main`, label: "أرضية الطرقة الرئيسية بالمنزل", defaultQty: Number(customValues["الطرقة الرئيسية"]) });
      }
      if (customValues["الطرقة الفرعية"] && Number(customValues["الطرقة الفرعية"]) > 0) {
        list.push({ key: `floor_corridor_sub`, label: "أرضية الطرقة الفرعية / الممر", defaultQty: Number(customValues["الطرقة الفرعية"]) });
      }
    }

    // 8. الحديقة الخارجية / الجاردن (تظهر في حال تفعيلها في شاشة المساحات)
    const hasGarden = !!(customValues["الحديقة / الجاردن"] && Number(customValues["الحديقة / الجاردن"]) > 0);
    if (hasGarden) {
      list.push({ key: `floor_garden`, label: "أرضية الحديقة / الجاردن الخارجية", defaultQty: Number(customValues["الحديقة / الجاردن"]) });
    }

    // حساب إجمالي الوزرة الافتراضي
    const totalFloorAreaSum = list.reduce((sum, r) => {
      const isFloor = r.key.startsWith('floor_') || r.key === 'reception' || r.key === 'rooms' || r.key === 'kitchen_floor' || r.key === 'bathroom_floor';
      const isNotGarden = r.key !== 'floor_garden';
      return (isFloor && isNotGarden) ? sum + r.defaultQty : sum;
    }, 0);
    
    list.push({ key: `skirting`, label: 'بلاط الوزرة المضيئة الليد', defaultQty: Number((totalFloorAreaSum * 0.8).toFixed(1)) });

    return list;
  }, [crmData?.finishing?.areas?.values, project]);

  const activeRoomsList = useMemo(() => getDynamicRoomsList(), [getDynamicRoomsList]);

  // جلب كتالوج المنتجات فقط من قاعدة البيانات
  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('products_library')
          .select('*')
          .eq('category', 'flooring');

        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error('Error loading flooring catalog products:', err);
      } finally {
        setLoading(false);
      }
    }
    if (projectId) loadCatalog();
  }, [projectId]);

  // مزامنة واقتران البيانات المخزنة مسبقاً لمشروع العميل الحالي
  useEffect(() => {
    if (crmData && crmData.finishing && crmData.finishing.flooring) {
      const savedFlooring = crmData.finishing.flooring;
      isLocalChange.current = false;
      setState({
        enabled: savedFlooring.enabled ?? true,
        items: savedFlooring.items || {},
        customLabels: savedFlooring.customLabels || {},
        skirting_type: savedFlooring.skirting_type ?? 'normal',
        cement_bags: savedFlooring.cement_bags ?? 0,
        sand_m3: savedFlooring.sand_m3 ?? 0,
        grout_product_id: savedFlooring.grout_product_id ?? '',
        grout_price: savedFlooring.grout_price ?? 0,
        grout_qty: savedFlooring.grout_qty ?? 0,
        accessories: savedFlooring.accessories || {
          clips_wedges: true,
          pigments: true,
          steel_wool: true,
          broom: true,
          mop: true
        },
        accessoryPrices: savedFlooring.accessoryPrices || {
          clips_wedges: 150,
          pigments: 80,
          steel_wool: 50,
          broom: 60,
          mop: 90
        },
        labor: {
          floor_rate: savedFlooring.labor?.floor_rate ?? 90,
          wall_rate: savedFlooring.labor?.wall_rate ?? 110,
          skirting_rate: savedFlooring.labor?.skirting_rate ?? 30
        },
        logistics: {
          transport: savedFlooring.logistics?.transport ?? 1500,
          cleaning: savedFlooring.logistics?.cleaning ?? 800
        },
        manual_overrides: savedFlooring.manual_overrides || [],
        notes: savedFlooring.notes ?? ''
      });
      setNotesInput(savedFlooring.notes ?? '');
    }
  }, [crmData?.finishing?.flooring?.enabled]);

  // حساب التوزيع حركياً بشكل مباشر مع السياق لمنع ضياع البيانات
  useEffect(() => {
    if (loading) return;

    const updatedItems = { ...state.items };
    let hasChanged = false;

    // حصر وتوليد تلقائي للبنود بناءً على المساحات
    activeRoomsList.forEach((room) => {
      const key = room.key;
      const calcVal = room.defaultQty;
      
      if (!state.manual_overrides.includes(key) && (!updatedItems[key] || updatedItems[key].qty !== calcVal)) {
        if (!updatedItems[key]) {
          updatedItems[key] = { qty: calcVal, company: 'كليوباترا', product_id: '', price: 180 };
        } else {
          updatedItems[key].qty = calcVal;
        }
        hasChanged = true;
      }
    });

    // احتساب مون التأسيس
    const floorArea = activeRoomsList.reduce((sum, r) => {
      const isFloor = r.key.startsWith('floor_') || r.key === 'reception' || r.key === 'rooms' || r.key === 'kitchen_floor' || r.key === 'bathroom_floor';
      return isFloor ? sum + (updatedItems[r.key]?.qty || r.defaultQty) : sum;
    }, 0);
    
    const wallArea = (updatedItems['kitchen_walls']?.qty || 0) + (updatedItems['bathroom_walls']?.qty || 0);
    const totalArea = floorArea + wallArea;

    const calculatedCement = Math.ceil(totalArea * 0.25);
    const calculatedSand = Number((totalArea * 0.04).toFixed(2));
    const calculatedGroutQty = Math.ceil(totalArea * 0.4 / 5);

    let nextCement = state.cement_bags;
    let nextSand = state.sand_m3;
    let nextGroutQty = state.grout_qty;

    if (!state.manual_overrides.includes('cement_bags') && state.cement_bags !== calculatedCement) {
      nextCement = calculatedCement;
      hasChanged = true;
    }
    if (!state.manual_overrides.includes('sand_m3') && state.sand_m3 !== calculatedSand) {
      nextSand = calculatedSand;
      hasChanged = true;
    }
    if (!state.manual_overrides.includes('grout_qty') && state.grout_qty !== calculatedGroutQty) {
      nextGroutQty = calculatedGroutQty;
      hasChanged = true;
    }

    if (hasChanged) {
      isLocalChange.current = true;
      setState(prev => ({
        ...prev,
        items: updatedItems,
        cement_bags: nextCement,
        sand_m3: nextSand,
        grout_qty: nextGroutQty
      }));
    }
  }, [activeRoomsList, loading]);

  // المزامنة التلقائية والآمنة مع السياق الأب بعد اكتمال الرندر تماماً
  useEffect(() => {
    if (isLocalChange.current) {
      updateBulkFinishingSection('flooring', state);
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

  const handleToggleState = () => {
    updateStateAndSave(prev => ({ enabled: !prev.enabled }));
  };

  const handleQtyChange = (itemKey: string, numericValue: number) => {
    updateStateAndSave(prev => {
      const updatedItems = { ...prev.items };
      if (updatedItems[itemKey]) {
        updatedItems[itemKey].qty = Math.max(0, numericValue);
      }
      const updatedOverrides = prev.manual_overrides.includes(itemKey)
        ? prev.manual_overrides
        : [...prev.manual_overrides, itemKey];
      return {
        manual_overrides: updatedOverrides,
        items: updatedItems
      };
    });
  };

  const handleRowPropertyChange = (itemKey: string, field: 'company' | 'product_id', value: string) => {
    updateStateAndSave(prev => {
      const updatedItems = { ...prev.items };
      const row = updatedItems[itemKey] 
        ? { ...updatedItems[itemKey] } 
        : { qty: 0, company: '', product_id: '', price: 0 };

      if (field === 'company') {
        row.company = value;
        row.product_id = '';
        row.price = 0;
      } else if (field === 'product_id') {
        row.product_id = value;
        const product = products.find(p => p.id === value);
        row.price = product ? Number(product.price) : 0;
      }

      updatedItems[itemKey] = row;
      return { items: updatedItems };
    });
  };

  const handleStructuralFieldChange = (field: 'cement_bags' | 'sand_m3', val: number) => {
    updateStateAndSave(prev => {
      const updatedOverrides = prev.manual_overrides.includes(field)
        ? prev.manual_overrides
        : [...prev.manual_overrides, field];
      return {
        manual_overrides: updatedOverrides,
        [field]: Math.max(0, val)
      };
    });
  };

  // دوال العدادات الفاخرة المحدثة لبيانات مادة السقية
  const handleGroutQtyChange = (val: number) => {
    updateStateAndSave(prev => {
      const updatedOverrides = prev.manual_overrides.includes('grout_qty')
        ? prev.manual_overrides
        : [...prev.manual_overrides, 'grout_qty'];
      return {
        manual_overrides: updatedOverrides,
        grout_qty: Math.max(0, val)
      };
    });
  };

  const handleGroutPriceChange = (val: number) => {
    updateStateAndSave(prev => {
      const updatedOverrides = prev.manual_overrides.includes('grout_price')
        ? prev.manual_overrides
        : [...prev.manual_overrides, 'grout_price'];
      return {
        manual_overrides: updatedOverrides,
        grout_price: Math.max(0, val)
      };
    });
  };

  // دالة تعديل أسعار كماليات وتجهيزات الموقع المشمولة يدوياً بالعداد
  const handleAccessoryPriceChange = (key: keyof FlooringState['accessories'], newPrice: number) => {
    updateStateAndSave(prev => {
      const updatedOverrides = prev.manual_overrides.includes(`price_${key}`)
        ? prev.manual_overrides
        : [...prev.manual_overrides, `price_${key}`];
      return {
        manual_overrides: updatedOverrides,
        accessoryPrices: {
          ...prev.accessoryPrices,
          [key]: Math.max(0, newPrice)
        }
      };
    });
  };

  const handleNestedFieldChange = (
    section: 'labor' | 'logistics', 
    field: string, 
    val: number
  ) => {
    updateStateAndSave(prev => ({
      [section]: {
        ...prev[section],
        [field]: Math.max(0, val)
      }
    }));
  };

  const handleToggleAccessory = (key: keyof FlooringState['accessories']) => {
    updateStateAndSave(prev => ({
      accessories: {
        ...prev.accessories,
        [key]: !prev.accessories[key]
      }
    }));
  };

  // إضافة بند بلاط أو أرضيات مخصص جديد تفاعلياً
  const handleAddCustomRow = () => {
    const uniqueKey = `custom_${Date.now()}`;
    updateStateAndSave(prev => {
      const updatedItems = {
        ...prev.items,
        [uniqueKey]: { qty: 10, company: 'كليوباترا', product_id: '', price: 180 }
      };
      const updatedLabels = {
        ...prev.customLabels,
        [uniqueKey]: 'بند بلاط وأرضيات مخصص جديد'
      };
      return {
        items: updatedItems,
        customLabels: updatedLabels
      };
    });
  };

  // حذف صف وحظره من التوليد التلقائي
  const handleRemoveRow = (key: string) => {
    updateStateAndSave(prev => {
      const updatedItems = { ...prev.items };
      delete updatedItems[key];
      
      const updatedOverrides = prev.manual_overrides.includes(key)
        ? prev.manual_overrides
        : [...prev.manual_overrides, key];

      return {
        items: updatedItems,
        manual_overrides: updatedOverrides
      };
    });
  };

  const availableCompanies = useMemo(() => {
    return Array.from(new Set(products.map(p => p.company))).filter(Boolean);
  }, [products]);

  // تعديل التصفية بمطابقة مفتاح الفئة الفرعية لمادة السقية (grouting)
  const groutProducts = useMemo(() => {
    return products.filter(p => p.subcategory === 'grouting');
  }, [products]);

  // محرك ذكي مدمج لتحديد التوصيف والمسمى الفني للمكان والبنود المخصصة
  const getLabelForKey = useCallback((key: string) => {
    if (state.customLabels[key]) return state.customLabels[key];
    
    const defaultLabels: Record<string, string> = {
      reception: 'بلاط أرضيات الريسبشن والصالون',
      rooms: 'بلاط أرضيات غرف النوم والمعيشة',
      kitchen_floor: 'بلاط أرضيات المطبخ الرئيسي',
      bathroom_floor: 'بلاط أرضيات الحمام الرئيسي',
      kitchen_walls: 'سيراميك جدران وحوائط المطبخ',
      bathroom_walls: 'سيراميك جدران وحوائط الحمام',
      skirting: 'بلاط الوزرة المضيئة الليد'
    };
    
    if (key.startsWith('floor_rec_')) return `أرضية الريسبشن - قطعة ${key.split('_')[2] || '١'}`;
    if (key.startsWith('floor_room_')) return `أرضية غرفة النوم - ${key.split('_')[2] === '1' ? 'الماستر' : 'أطفال ' + (Number(key.split('_')[2]) - 1)}`;
    if (key.startsWith('floor_kit_')) return `أرضية المطبخ الفرعي ${key.split('_')[2]}`;
    if (key.startsWith('wall_kit_')) return `جدران وحوائط المطبخ الفرعي ${key.split('_')[2]}`;
    if (key.startsWith('floor_bath_')) return `أرضية الحمام الفرعي ${key.split('_')[2]}`;
    if (key.startsWith('wall_bath_')) return `جدران وحوائط الحمام الفرعي ${key.split('_')[2]}`;
    if (key.startsWith('floor_balc_')) return `أرضية البلكونة الفرعية ${key.split('_')[2]}`;
    if (key.startsWith('floor_living_')) return `أرضية المعيشة (ليفنج) - قطعة ${key.split('_')[2]}`;
    if (key === 'floor_corridor_main') return 'أرضية الطرقة الرئيسية';
    if (key === 'floor_corridor_sub') return 'أرضية الطرقة الفرعية';
    if (key === 'floor_garden') return 'أرضية الحديقة / الجاردن';
    
    return defaultLabels[key] || 'بند أرضيات مخصص';
  }, [state.customLabels]);

  // الحسبة المالية المترابطة بالكامل
  const financialSummary = useMemo(() => {
    let tilesCost = 0;
    Object.values(state.items ?? {}).forEach(item => {
      tilesCost += (Number(item.qty) || 0) * (Number(item.price) || 0);
    });

    const groutCost = (Number(state.grout_qty) || 0) * (Number(state.grout_price) || 0);

    // احتساب تكاليف مستلزمات الموقع بناءً على الأسعار المحررة يدوياً بالعدادات الفاخرة
    let accessoriesCost = 0;
    const currentPrices = state.accessoryPrices || DEFAULT_ACCESSORY_PRICES;
    if (state.accessories.clips_wedges) accessoriesCost += (currentPrices.clips_wedges ?? 150);
    if (state.accessories.pigments) accessoriesCost += (currentPrices.pigments ?? 80);
    if (state.accessories.steel_wool) accessoriesCost += (currentPrices.steel_wool ?? 50);
    if (state.accessories.broom) accessoriesCost += (currentPrices.broom ?? 60);
    if (state.accessories.mop) accessoriesCost += (currentPrices.mop ?? 90);

    // حساب المساحات الفعلية للأجور
    let floorArea = 0;
    let wallArea = 0;
    let skirtingQty = 0;

    Object.entries(state.items ?? {}).forEach(([key, item]) => {
      if (key === 'skirting') {
        skirtingQty = item.qty;
      } else if (key.startsWith('wall_') || key === 'kitchen_walls' || key === 'bathroom_walls') {
        wallArea += item.qty;
      } else {
        floorArea += item.qty;
      }
    });

    const floorLaborCost = floorArea * (Number(state.labor.floor_rate) || 90);
    const wallLaborCost = wallArea * (Number(state.labor.wall_rate) || 110);
    const skirtingLaborCost = skirtingQty * (Number(state.labor.skirting_rate) || 30);
    
    const totalLaborCost = floorLaborCost + wallLaborCost + skirtingLaborCost;

    const transportCost = Number(state.logistics.transport) || 1500;
    const cleaningCost = Number(state.logistics.cleaning) || 800;

    const netGrandTotal = tilesCost + groutCost + accessoriesCost + totalLaborCost + transportCost + cleaningCost;

    return {
      tilesCost,
      groutCost,
      accessoriesCost,
      totalLaborCost,
      skirtingLaborCost,
      transportCost,
      cleaningCost,
      netGrandTotal
    };
  }, [state]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] bg-[#020B1C]">
      <RefreshCw className="w-12 h-12 text-[#D4AF37] animate-spin mb-4" />
      <p className="text-[#F0E6D2]">جاري مزامنة عينات الأرضيات ومطابقة أمتار الغرف والمساحات...</p>
    </div>
  );

  return (
    <div className="space-y-8 select-none text-right" dir="rtl">
      
      {/* كارت التفعيل الرئيسي (On / Off) ذو الطابع الفاخر والماوس اليد المضيء */}
      <div 
        onClick={handleToggleState}
        className={`p-6 rounded-[2.5rem] border transition-all duration-500 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl cursor-pointer select-none ${
          state.enabled 
            ? 'bg-[#07132a] border-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.15)] hover:shadow-[0_0_40px_rgba(212,175,55,0.25)]' 
            : 'bg-[#07132a]/40 border-[#1f2d4d] hover:border-gray-600'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`p-5 rounded-2xl transition-all duration-500 flex-shrink-0 ${state.enabled ? 'bg-[#D4AF37] text-black shadow-[0_0_30px_rgba(212,175,55,0.4)]' : 'bg-[#020B1C] text-gray-600'}`}>
            <Palette className="w-10 h-10" />
          </div>
          <div className="text-right">
            <h2 className="text-xl md:text-2xl font-bold text-[#F0E6D2]">الحقائب التقديرية للأرضيات والسيراميك والرخام</h2>
            <p className="text-sm text-gray-400 mt-1 uppercase font-bold tracking-widest leading-none">FLOORING, TILES & MARBLE SYSTEM</p>
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
      <div className={`space-y-8 transition-opacity duration-300 ${state.enabled ? 'opacity-100' : 'opacity-25 pointer-events-none filter grayscale'}`}>
        
        {/* جدول حصر خامات الأرضيات والوزرة التفاعلي */}
        <div className="bg-[#07132a] border border-[#1f2d4d] p-6 rounded-2xl space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f2d4d] pb-4">
            <div className="flex items-center gap-2 text-[#D4AF37]">
              <Layers className="w-6 h-6" />
              <h4 className="text-xl font-bold text-[#F0E6D2]">جدول حصر خامات الأرضيات والوزرة التفاعلي (BOQ الخامات والمفاضلة الحركية):</h4>
            </div>
            <button
              type="button"
              disabled={!state.enabled}
              onClick={handleAddCustomRow}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 text-sm font-bold transition-all cursor-pointer"
            >
              <PlusCircle className="w-5 h-5" />
              <span>إضافة بند بلاط مخصص جديد</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-[#1f2d4d] text-[#94a3b8] text-sm font-bold pb-2">
                  <th className="py-3 text-right">نوع الفضاء</th>
                  <th className="py-3 text-right">الشركة الموردة</th>
                  <th className="py-3 text-right">المنتج الفعلي بالمخزن (تعديل تفاعلي)</th>
                  <th className="py-3 text-center">الكمية المطلوبة (م٢ أو م.ط)</th>
                  <th className="py-3 text-center">سعر المتر</th>
                  <th className="py-3 text-left">إجمالي التكلفة</th>
                  <th className="py-3 text-center">حذف البند</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(state.items).map(([key, item]) => {
                  const current = item;
                  const rowProducts = products.filter(p => p.company === current.company);

                  return (
                    <tr key={key} className="border-b border-[#1f2d4d]/60 hover:bg-[#020B1C]/40 transition-colors duration-200">
                      <td className="py-4 text-[#F0E6D2] font-semibold text-base">{getLabelForKey(key)}</td>
                      <td className="py-4">
                        <select
                          value={current.company}
                          onChange={(e) => handleRowPropertyChange(key, 'company', e.target.value)}
                          className="bg-[#020B1C] border border-[#1f2d4d] p-2.5 rounded-lg text-white font-bold outline-none cursor-pointer focus:border-[#D4AF37] text-sm"
                        >
                          <option value="">-- اختر الشركة --</option>
                          {availableCompanies.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td className="py-4">
                        <select
                          disabled={!current.company}
                          value={current.product_id}
                          onChange={(e) => handleRowPropertyChange(key, 'product_id', e.target.value)}
                          className="bg-[#020B1C] border border-[#1f2d4d] p-2.5 rounded-lg text-white font-bold outline-none cursor-pointer focus:border-[#D4AF37] text-sm disabled:opacity-40 min-w-[200px]"
                        >
                          <option value="">-- اختر البلاط لـ {current.company || 'الشركة'} --</option>
                          {rowProducts.map(p => (
                            <option key={p.id} value={p.id}>{p.product_name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4">
                        {/* عداد الكمية التفاعلي الفاخر المذهب مع أزرار النقصان الحمراء */}
                        <div className="flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(key, current.qty + 1)}
                            className="w-8 h-8 rounded-lg bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black flex items-center justify-center font-bold cursor-pointer transition-all"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <span className="text-lg font-bold text-[#D4AF37] font-mono min-w-[40px] text-center">{current.qty}</span>
                          <button
                            type="button"
                            onClick={() => handleQtyChange(key, current.qty - 1)}
                            className="w-8 h-8 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center font-bold cursor-pointer transition-all"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="py-4 text-center font-bold text-[#94a3b8] font-mono">{current.price > 0 ? `${current.price} ج.م` : '--'}</td>
                      <td className="py-4 text-center font-black text-[#D4AF37] font-mono text-base">{(current.qty * current.price).toLocaleString()} ج.م</td>
                      <td className="py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(key)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* كارت حصر وتخصيص الوزرة المعلق ليد بالعدادات الفاخرة */}
        <div className="bg-[#07132a] border border-[#1f2d4d] p-6 rounded-2xl space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start md:items-center gap-4 border-b border-[#1f2d4d] pb-4">
            <div className="flex items-center gap-3">
              <span className="text-xl text-[#D4AF37]">📐</span>
              <h3 className="text-lg font-bold text-[#F0E6D2]">كارت تحديد نوع وتصميم وحصر الوزر:</h3>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 bg-[#020B1C] border border-[#1f2d4d] p-3 rounded-xl w-full md:w-auto select-none">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#94a3b8]">أمتار الوزرة:</span>
                <button
                  type="button"
                  onClick={() => handleQtyChange('skirting', (state.items.skirting?.qty || 0) + 1)}
                  className="w-7 h-7 rounded bg-[#07132a] border border-[#1f2d4d] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black flex items-center justify-center font-bold cursor-pointer"
                >+</button>
                <span className="text-sm font-bold text-[#D4AF37] font-mono min-w-[30px] text-center">
                  {state.items.skirting?.qty || 0}
                </span>
                <button
                  type="button"
                  onClick={() => handleQtyChange('skirting', (state.items.skirting?.qty || 0) - 1)}
                  className="w-7 h-7 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center font-bold cursor-pointer"
                >-</button>
                <span className="text-xs text-gray-400">م.ط</span>
              </div>

              <div className="h-6 w-px bg-[#1f2d4d] hidden sm:block" />

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#94a3b8]">تكلفة المصنعية:</span>
                <button
                  type="button"
                  onClick={() => handleNestedFieldChange('labor', 'skirting_rate', state.labor.skirting_rate + 5)}
                  className="w-7 h-7 rounded bg-[#07132a] border border-[#1f2d4d] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black flex items-center justify-center font-bold cursor-pointer"
                >+</button>
                <span className="text-sm font-bold text-[#D4AF37] font-mono min-w-[30px] text-center">
                  {state.labor.skirting_rate}
                </span>
                <button
                  type="button"
                  onClick={() => handleNestedFieldChange('labor', 'skirting_rate', state.labor.skirting_rate - 5)}
                  className="w-7 h-7 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center font-bold cursor-pointer"
                >-</button>
                <span className="text-xs text-gray-400">ج.م/م</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { type: 'normal', label: 'وزر عادي سيراميك/رخام', desc: 'يتم تركيبه بارزاً فوق السيراميك (سعر المصنعية الافتراضي: 30 ج.م)', defaultRate: 30 },
              { type: 'concealed', label: 'وزر مخفي (Concealed)', desc: 'يتطلب نحت ونقر بأسفل الجدران ليكون مستوياً ومخفياً (سعر المصنعية الافتراضي: 80 ج.م)', defaultRate: 80 },
              { type: 'concealed_led', label: 'وزر مخفي مضيء (LED Profile)', desc: 'نحت جدران مع تأسيس مجرى ألومنيوم مخصص لليد بروفايل (سعر المصنعية الافتراضي: 150 ج.م)', defaultRate: 150 }
            ].map((sk) => (
              <div 
                key={sk.type}
                onClick={() => {
                  updateStateAndSave(prev => ({
                    skirting_type: sk.type as any,
                    labor: {
                      ...prev.labor,
                      skirting_rate: sk.defaultRate
                    }
                  }));
                }}
                className={`p-5 rounded-xl border cursor-pointer transition-all select-none ${
                  state.skirting_type === sk.type 
                    ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_15px_rgba(212,175,55,0.08)]' 
                    : 'border-[#1f2d4d] bg-[#020B1C]/40 hover:border-[#D4AF37]/30'
                }`}
              >
                <h4 className="text-base font-bold text-[#F0E6D2]">{sk.label}</h4>
                <p className="text-xs text-[#94a3b8] mt-2 leading-relaxed">{sk.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* المون الإنشائية بالعدادات الفاخرة */}
        <div className="bg-[#07132a] border border-[#1f2d4d] p-6 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-[#1f2d4d] pb-2 text-[#D4AF37]">
            <HardHat className="w-5 h-5" />
            <h4 className="text-lg font-bold text-[#F0E6D2]">مون وتأسيس أعمال البلاط والأرضيات بالوحدة:</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* الأسمنت */}
            <div className="p-6 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex items-center justify-between shadow-md hover:border-[#D4AF37]/30 transition-all">
              <div className="text-right">
                <span className="text-sm font-semibold text-[#F0E6D2] block">شيكارة أسمنت ورمل التثبيت</span>
                <p className="text-xs text-gray-500 mt-1">مون التثبيت والتمليط الأساسية للبلاط</p>
              </div>
              <div className="flex items-center gap-3 select-none">
                <button 
                  type="button" 
                  onClick={() => handleStructuralFieldChange('cement_bags', (state.cement_bags || 0) + 1)}
                  className="w-8 h-8 rounded-lg bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none"
                >
                  +
                </button>
                <span className="text-xl font-black text-[#D4AF37] font-mono min-w-[30px] text-center">{state.cement_bags}</span>
                <button 
                  type="button" 
                  onClick={() => handleStructuralFieldChange('cement_bags', Math.max(0, (state.cement_bags || 0) - 1))}
                  className="w-8 h-8 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none"
                >
                  -
                </button>
              </div>
            </div>

            {/* الرمل */}
            <div className="p-6 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex items-center justify-between shadow-md hover:border-[#D4AF37]/30 transition-all">
              <div className="text-right">
                <span className="text-sm font-semibold text-[#F0E6D2] block">رمل التأسيس الفاخر (م٣)</span>
                <p className="text-xs text-gray-500 mt-1">رمل التسوية الموزع أسفل البلاط بالوحدة</p>
              </div>
              <div className="flex items-center gap-3 select-none">
                <button 
                  type="button" 
                  onClick={() => handleStructuralFieldChange('sand_m3', Number(((state.sand_m3 || 0) + 0.50).toFixed(2)))}
                  className="w-8 h-8 rounded-lg bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none"
                >
                  +
                </button>
                <span className="text-xl font-black text-[#D4AF37] font-mono min-w-[50px] text-center">{state.sand_m3?.toFixed(2)}</span>
                <button 
                  type="button" 
                  onClick={() => handleStructuralFieldChange('sand_m3', Math.max(0, Number(((state.sand_m3 || 0) - 0.50).toFixed(2))))}
                  className="w-8 h-8 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none"
                >
                  -
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* كارت كماليات ومستلزمات التشطيب الاستهلاكية المدمج به العدادات الفاخرة لمادة السقية والكماليات المحررة */}
        <div className="bg-[#07132a] border border-[#1f2d4d] p-6 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center gap-3 border-b border-[#1f2d4d] pb-4">
            <Wrench className="w-6 h-6 text-[#D4AF37]" />
            <h3 className="text-lg font-bold text-[#F0E6D2]">كارت كماليات ومستلزمات التشطيب الاستهلاكية:</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* مادة ترويب وسقية فواصل الأرضيات مع العدادات الفاخرة المحدثة */}
            <div className="lg:col-span-6 bg-[#020B1C] border border-[#1f2d4d] p-5 rounded-xl space-y-4">
              <span className="text-sm text-[#94a3b8] block font-bold text-right">مادة ترويب وسقية فواصل الأرضيات:</span>
              <select
                value={state.grout_product_id || ''}
                onChange={(e) => {
                  const selected = groutProducts.find(p => p.id === e.target.value);
                  updateStateAndSave(prev => ({
                    grout_product_id: e.target.value,
                    grout_price: selected ? Number(selected.price) : 0
                  }));
                }}
                className="bg-[#07132a] border border-[#1f2d4d] p-3 rounded-lg text-white font-bold outline-none cursor-pointer focus:border-[#D4AF37] w-full text-sm"
              >
                <option value="">-- اختر مادة السقية (الترويبة) --</option>
                {groutProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.product_name}</option>
                ))}
              </select>

              {/* عدادات فاخرة للكمية والسعر لتصميم مادة السقية */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                {/* عداد الكمية بالشكارة */}
                <div className="bg-[#07132a] border border-[#1f2d4d] p-3 rounded-xl flex flex-col items-center justify-between gap-2 select-none">
                  <span className="text-xs text-[#94a3b8]">الكمية (عبوة/شكارة)</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleGroutQtyChange(state.grout_qty + 1)}
                      className="w-7 h-7 rounded bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black flex items-center justify-center font-bold transition-all cursor-pointer"
                    >+</button>
                    <span className="text-sm font-bold text-[#D4AF37] font-mono min-w-[24px] text-center">{state.grout_qty}</span>
                    <button
                      type="button"
                      onClick={() => handleGroutQtyChange(state.grout_qty - 1)}
                      className="w-7 h-7 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center font-bold transition-all cursor-pointer"
                    >-</button>
                  </div>
                </div>

                {/* عداد السعر الفردي التفاعلي للشكارة */}
                <div className="bg-[#07132a] border border-[#1f2d4d] p-3 rounded-xl flex flex-col items-center justify-between gap-2 select-none">
                  <span className="text-xs text-[#94a3b8]">السعر للوحدة (ج.م)</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleGroutPriceChange(state.grout_price + 5)}
                      className="w-7 h-7 rounded bg-[#020B1C] border border-[#1f2d4d] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black flex items-center justify-center font-bold transition-all cursor-pointer"
                    >+</button>
                    <span className="text-sm font-bold text-white font-mono min-w-[36px] text-center">{state.grout_price}</span>
                    <button
                      type="button"
                      onClick={() => handleGroutPriceChange(state.grout_price - 5)}
                      className="w-7 h-7 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center font-bold transition-all cursor-pointer"
                    >-</button>
                  </div>
                </div>
              </div>

              <div className="flex justify-between text-xs text-[#94a3b8] select-none pt-2 border-t border-[#1f2d4d]/60">
                <span>الكمية المحجوزة: {state.grout_qty} عبوة</span>
                <span>تكلفة السقية الإجمالية: <span className="text-[#D4AF37] font-black">{(Number(state.grout_qty || 0) * Number(state.grout_price || 0)).toLocaleString()} ج.م</span></span>
              </div>
            </div>

            {/* كارت كماليات وتجهيزات الموقع المشمولة - معدّل ليدعم عدادات ضبط الأسعار حركياً */}
            <div className="lg:col-span-6 bg-[#020B1C] border border-[#1f2d4d] p-5 rounded-xl space-y-3">
              <span className="text-sm text-[#94a3b8] block font-bold text-right">كماليات وتجهيزات الموقع المشمولة:</span>
              <div className="space-y-3">
                {[
                  { key: 'clips_wedges', label: 'كليبسات وصلايب تسوية', defaultPrice: 150 },
                  { key: 'pigments', label: 'ملونات أكسيد تلوين الترويبة', defaultPrice: 80 },
                  { key: 'steel_wool', label: 'سلك مواعين وصنفرة تسليم جلي', defaultPrice: 50 },
                  { key: 'broom', label: 'مقشة ومستلزمات كنس الموقع', defaultPrice: 60 },
                  { key: 'mop', label: 'ممسحة تنظيف وتسليم البلاط', defaultPrice: 90 }
                ].map((item) => {
                  const isChecked = state.accessories[item.key as keyof FlooringState['accessories']];
                  const currentPrice = state.accessoryPrices?.[item.key as keyof FlooringState['accessories']] ?? item.defaultPrice;

                  return (
                    <div 
                      key={item.key}
                      onClick={() => handleToggleAccessory(item.key as any)}
                      className={`flex items-center justify-between p-2 rounded transition-all duration-300 select-none ${
                        isChecked ? 'bg-[#07132a]/60 border border-[#1f2d4d]' : 'opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 cursor-pointer">
                        {isChecked ? (
                          <CheckSquare className="w-5 h-5 text-[#D4AF37] flex-shrink-0" />
                        ) : (
                          <Square className="w-5 h-5 text-[#1f2d4d] flex-shrink-0" />
                        )}
                        <span className="text-xs text-[#F0E6D2] font-semibold">{item.label}</span>
                      </div>

                      {/* عداد السعر الفاخر المصغر المدمج بالكماليات لتعديل السعر يدوياً */}
                      <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-lg h-9 px-1.5 w-28 select-none" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={!isChecked}
                          onClick={() => handleAccessoryPriceChange(item.key as any, currentPrice + 10)}
                          className="w-5 h-5 rounded bg-[#07132a] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black flex items-center justify-center font-bold text-xs disabled:opacity-30 cursor-pointer"
                        >+</button>
                        <span className="text-xs font-mono font-bold text-[#D4AF37]">{currentPrice} <span className="text-[8px] text-gray-500 font-normal">ج</span></span>
                        <button
                          type="button"
                          disabled={!isChecked}
                          onClick={() => handleAccessoryPriceChange(item.key as any, currentPrice - 10)}
                          className="w-5 h-5 rounded bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center font-bold text-xs disabled:opacity-30 cursor-pointer"
                        >-</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* كارت مصنعات العمالة الفنية والتركيب بالعدادات */}
        <div className="bg-[#07132a] border border-[#1f2d4d] p-6 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center gap-3 border-b border-[#1f2d4d] pb-4">
            <Wrench className="w-6 h-6 text-[#D4AF37]" />
            <h3 className="text-lg font-bold text-[#F0E6D2]">كارت مصنعات العمالة الفنية والتركيب:</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* مصنعية الأرضيات */}
            <div className="p-6 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex items-center justify-between shadow-md hover:border-[#D4AF37]/30 transition-all select-none">
              <span className="text-sm font-semibold text-[#F0E6D2] block">سعر مصنعية تركيب الأرضيات (م٢):</span>
              <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-36">
                <button type="button" onClick={() => handleNestedFieldChange('labor', 'floor_rate', state.labor.floor_rate + 5)} className="w-7 h-7 rounded-lg bg-[#020B1C] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">+</button>
                <span className="text-base font-black text-white font-mono">{state.labor.floor_rate} <span className="text-[10px] text-gray-500 font-normal">ج.م</span></span>
                <button type="button" onClick={() => handleNestedFieldChange('labor', 'floor_rate', Math.max(0, state.labor.floor_rate - 5))} className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">-</button>
              </div>
            </div>

            {/* مصنعية الحوائط */}
            <div className="p-6 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex items-center justify-between shadow-md hover:border-[#D4AF37]/30 transition-all select-none">
              <span className="text-sm font-semibold text-[#F0E6D2] block">سعر مصنعية تركيب الحوائط والجدران (م٢):</span>
              <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-36">
                <button type="button" onClick={() => handleNestedFieldChange('labor', 'wall_rate', state.labor.wall_rate + 5)} className="w-7 h-7 rounded-lg bg-[#020B1C] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">+</button>
                <span className="text-base font-black text-white font-mono">{state.labor.wall_rate} <span className="text-[10px] text-gray-500 font-normal">ج.م</span></span>
                <button type="button" onClick={() => handleNestedFieldChange('labor', 'wall_rate', Math.max(0, state.labor.wall_rate - 5))} className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">-</button>
              </div>
            </div>

          </div>
        </div>

        {/* كارت اللوجستيات بالعدادات الفاخرة */}
        <div className="bg-[#07132a] border border-[#1f2d4d] p-6 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center gap-3 border-b border-[#1f2d4d] pb-4 text-right">
            <Truck className="w-6 h-6 text-[#D4AF37]" />
            <h3 className="text-lg font-bold text-[#F0E6D2]">كارت اللوجستيات (النقل، التشوين، والنظافة):</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* نقل وتشوين */}
            <div className="p-6 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex items-center justify-between shadow-md hover:border-[#D4AF37]/30 transition-all select-none">
              <span className="text-sm font-semibold text-[#F0E6D2] block">نقل وتشوين السيراميك والمواد:</span>
              <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-40">
                <button type="button" onClick={() => handleNestedFieldChange('logistics', 'transport', state.logistics.transport + 100)} className="w-7 h-7 rounded-lg bg-[#020B1C] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">+</button>
                <span className="text-base font-black text-white font-mono">{(state.logistics.transport).toLocaleString()}</span>
                <button type="button" onClick={() => handleNestedFieldChange('logistics', 'transport', Math.max(0, state.logistics.transport - 100))} className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">-</button>
              </div>
            </div>

            {/* نظافة الموقع */}
            <div className="p-6 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex items-center justify-between shadow-md hover:border-[#D4AF37]/30 transition-all select-none">
              <span className="text-sm font-semibold text-[#F0E6D2] block">نظافة الموقع وتشوين المخلفات:</span>
              <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none w-40">
                <button type="button" onClick={() => handleNestedFieldChange('logistics', 'cleaning', state.logistics.cleaning + 50)} className="w-7 h-7 rounded-lg bg-[#020B1C] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">+</button>
                <span className="text-base font-black text-white font-mono">{(state.logistics.cleaning).toLocaleString()}</span>
                <button type="button" onClick={() => handleNestedFieldChange('logistics', 'cleaning', Math.max(0, state.logistics.cleaning - 50))} className="w-7 h-7 rounded-lg bg-[#020B1C] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 font-bold text-sm transition-all cursor-pointer flex items-center justify-center select-none">-</button>
              </div>
            </div>

          </div>
        </div>

        {/* صندوق الملاحظات */}
        <div className="p-6 rounded-2xl bg-[#07132a] border border-[#1f2d4d] space-y-3">
          <div className="flex items-center gap-2 text-[#D4AF37] border-b border-[#1f2d4d]/60 pb-2 text-right">
            <FileText className="w-5 h-5" />
            <h4 className="text-base font-bold">ملاحظات وشروط استلام أعمال الأرضيات والسيراميك والرخام (بنود العقد الفنية):</h4>
          </div>
          <textarea
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            onBlur={() => updateStateAndSave(prev => ({ notes: notesInput }))}
            placeholder="اكتب هنا شروط تصفية أمتار الحوائط والأسقف، نسبة هالك بلاط السيراميك والبورسلين..."
            className="w-full h-24 p-4 rounded-xl bg-[#020B1C] border border-[#1f2d4d] hover:border-[#D4AF37]/50 focus:border-[#D4AF37] text-lg text-[#F0E6D2] placeholder-gray-500 outline-none transition-all resize-none text-base leading-relaxed text-right"
          />
          <div className="flex justify-between items-center text-xs text-gray-500 px-1">
            <span>يتم الحفظ تلقائياً بمجرد الخروج من حقل الكتابة</span>
            <span>حالة الاتصال: متصل وسحابي</span>
          </div>
        </div>

        {/* كارت الملخص المالي النهائي للبند المقتبس تماماً من كارت الكهرباء الفاخر */}
        <div className="p-6 rounded-2xl bg-[#020B1C] border border-[#D4AF37]/30 shadow-[0_0_25px_rgba(212,175,55,0.06)] flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
          
          {/* تصميم مذهب جانبي يعكس الطراز الملكي الفخم لشركة جولد ديكوريشن */}
          <div className="absolute right-0 top-0 bottom-0 w-2 bg-[#D4AF37]" />

          <div className="space-y-1 text-center sm:text-right pr-2">
            <h4 className="text-xl font-bold text-[#D4AF37]">الملخص المالي التقديري لبند البلاط والأرضيات والتكسيات:</h4>
            <p className="text-sm text-gray-400">البيانات الإجمالية واللوجستيات والمون المحصورة يتم ترحيلها حركياً لحسابات المقايسة الكلية للعميل</p>
          </div>

          <div className="flex items-center gap-4 bg-[#07132a] px-8 py-5 rounded-xl border border-[#1f2d4d]">
            <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
              <DollarSign className="w-8 h-8 animate-pulse" />
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 block font-semibold text-right">إجمالي التكلفة التقديرية للأرضيات:</span>
              <span className="text-3xl font-black text-[#F0E6D2] font-mono">
                {financialSummary.netGrandTotal.toLocaleString('en-US')} <span className="text-sm font-normal">ج.م</span>
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}