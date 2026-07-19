"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from "../context/CRMContext";
import { supabase } from "@/lib/supabaseClient"; 
import TabActivationBanner from './TabActivationBanner'; // 👈 استدعاء المكون المشترك الموحد للأجهزة اللمسية للشركة
import { 
  Layers, 
  FileText, 
  DollarSign, 
  Cpu, 
  Star, 
  Plus, 
  Minus, 
  RefreshCw, 
  Trash2, 
  PlusCircle,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface AluminumTabProps {
  projectId: string;
}

interface WindowTakeoffRow {
  id: string;
  roomName: string;
  width: number;
  height: number;
  sectorUuid: string;    
  glassType: 'single' | 'double' | 'georgia'; 
  screenType: 'standard' | 'pleated';          
  openingStyle: 'sliding' | 'hinged';
  paintColor: string;
}

interface AluminumSectorItem {
  uuid: string;
  code: string;
  spec_name: string;
  category: string;
  base_rate: number;
}

export default function AluminumTab({ projectId }: AluminumTabProps) {
  const { crmData, updateBulkFinishingSection } = useCRM();

  const project = crmData?.project || {};
  const estimatedRooms = Number(project.roomsCount || 2);
  const estimatedReceptions = Number(project.receptionsCount || 1);
  const estimatedKitchens = Number(project.kitchensCount || 1);
  const estimatedBathrooms = Number(project.bathroomsCount || 1);

  const [dbSectors, setDbSectors] = useState<AluminumSectorItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const isLocalChange = useRef(false);

  const [state, setState] = useState({
    enabled: true,
    windows: [] as WindowTakeoffRow[],
    hasTransportation: true,
    accessoriesRates: {
      smallWindowRate: 1500,      
      glassDoubleRate: 1200,      
      glassGeorgiaRate: 2200,     
      screenPleatedRate: 800,     
      transportationPrice: 1500,   
      sectorOverrides: {} as Record<string, number>
    },
    notes: ''
  });

  const [notesInput, setNotesInput] = useState<string>('');
  const [activeEditorSectorUuid, setActiveEditorSectorUuid] = useState<string>('');

  const totalUnitArea = Number(crmData?.project?.area || 100);

  const FALLBACK_SECTORS: AluminumSectorItem[] = [
    { uuid: "al-01", code: "AL-01", spec_name: "قطاع بي إس صغير اقتصادي", category: "aluminum", base_rate: 3000 },
    { uuid: "al-02", code: "AL-02", spec_name: "قطاع بي إس كبير متين", category: "aluminum", base_rate: 4500 },
    { uuid: "al-03", code: "AL-03", spec_name: "قطاع جامبو شريف علي حسن الفاخر", category: "aluminum", base_rate: 6500 }
  ];

  const generateInitialWindowRows = (): WindowTakeoffRow[] => {
    const rows: WindowTakeoffRow[] = [];
    const defaultSector = dbSectors[1]?.uuid || FALLBACK_SECTORS[1].uuid; 
    const smallSector = dbSectors[0]?.uuid || FALLBACK_SECTORS[0].uuid;  

    for (let i = 1; i <= estimatedRooms; i++) {
      rows.push({
        id: `room-win-${i}-${Date.now()}`,
        roomName: `شباك غرفة نوم ${i}`,
        width: 1.50,
        height: 1.20,
        sectorUuid: defaultSector,
        glassType: 'single',
        screenType: 'standard',
        openingStyle: 'sliding',
        paintColor: 'أسود مطفي عازل'
      });
    }

    for (let i = 1; i <= estimatedReceptions; i++) {
      rows.push({
        id: `rec-win-${i}-${Date.now()}`,
        roomName: `شباك ريسبشن وصالة ${i}`,
        width: 1.80,
        height: 1.50,
        sectorUuid: defaultSector,
        glassType: 'single',
        screenType: 'standard',
        openingStyle: 'sliding',
        paintColor: 'أسود مطفي عازل'
      });
    }

    rows.push({
      id: `balcony-win-${Date.now()}`,
      roomName: `باب بلكونة الريسبشن`,
      width: 2.00,
      height: 2.20,
      sectorUuid: dbSectors[2]?.uuid || FALLBACK_SECTORS[2].uuid,
      glassType: 'double',
      screenType: 'pleated',
      openingStyle: 'sliding',
      paintColor: 'أسود مطفي عازل'
    });

    for (let i = 1; i <= estimatedKitchens; i++) {
      rows.push({
        id: `kit-win-${i}-${Date.now()}`,
        roomName: `شباك مطبخ قلاب ${i}`,
        width: 0.60,
        height: 0.60,
        sectorUuid: smallSector,
        glassType: 'single',
        screenType: 'standard',
        openingStyle: 'hinged',
        paintColor: 'أسود مطفي عازل'
      });
    }

    for (let i = 1; i <= estimatedBathrooms; i++) {
      rows.push({
        id: `bath-win-${i}-${Date.now()}`,
        roomName: `شباك حمام قلاب ${i}`,
        width: 0.60,
        height: 0.60,
        sectorUuid: smallSector,
        glassType: 'single',
        screenType: 'standard',
        openingStyle: 'hinged',
        paintColor: 'أسود مطفي عازل'
      });
    }

    return rows;
  };

  useEffect(() => {
    const fetchSpecifications = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('specifications_library')
          .select('*')
          .eq('category', 'aluminum');

        if (error) throw error;

        if (data && data.length > 0) {
          const mappedSpecs: AluminumSectorItem[] = data.map((item: any, index: number) => ({
            uuid: item.uuid || item.id,
            code: item.code || `AL-0${index + 1}`,
            spec_name: item.spec_name,
            category: item.category,
            base_rate: Number(item.base_rate || 4000),
          }));
          setDbSectors(mappedSpecs);
          setActiveEditorSectorUuid(mappedSpecs[0].uuid);
        } else {
          setDbSectors(FALLBACK_SECTORS);
          setActiveEditorSectorUuid(FALLBACK_SECTORS[0].uuid);
        }
      } catch (err) {
        console.error("عثرة أثناء جلب قطاعات الألوميتال، تشغيل مصفوفة الأمان:", err);
        setDbSectors(FALLBACK_SECTORS);
        setActiveEditorSectorUuid(FALLBACK_SECTORS[0].uuid);
      } finally {
        setLoading(false);
      }
    };

    fetchSpecifications();
  }, [crmData?.project?.roomsCount]);

  useEffect(() => {
    if (crmData && crmData.finishing && crmData.finishing.aluminum) {
      const alumContext = crmData.finishing.aluminum;

      const winsList = alumContext.windows && Array.isArray(alumContext.windows) && alumContext.windows.length > 0
        ? alumContext.windows
        : (dbSectors.length > 0 ? generateInitialWindowRows() : []);

      const loadedRates = {
        smallWindowRate: alumContext.accessoriesRates?.smallWindowRate ?? 1500,
        glassDoubleRate: alumContext.accessoriesRates?.glassDoubleRate ?? 1200,
        glassGeorgiaRate: alumContext.accessoriesRates?.glassGeorgiaRate ?? 2200,
        screenPleatedRate: alumContext.accessoriesRates?.screenPleatedRate ?? 800,
        transportationPrice: alumContext.accessoriesRates?.transportationPrice ?? 1500,
        sectorOverrides: alumContext.accessoriesRates?.sectorOverrides ?? {}
      };

      isLocalChange.current = false;
      setState({
        enabled: alumContext.enabled ?? true,
        windows: winsList,
        hasTransportation: alumContext.hasTransportation ?? true,
        accessoriesRates: loadedRates,
        notes: alumContext.notes ?? ''
      });
      setNotesInput(alumContext.notes ?? '');
    }
  }, [crmData?.finishing?.aluminum?.enabled, dbSectors]);

  useEffect(() => {
    if (isLocalChange.current) {
      updateBulkFinishingSection('aluminum', state);
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

  const handleAccessoryRateChange = (key: keyof typeof state.accessoriesRates, value: any) => {
    updateStateAndSave(prev => ({
      accessoriesRates: {
        ...prev.accessoriesRates,
        [key]: value
      }
    }));
  };

  const handleSectorPriceOverride = (sectorUuid: string, price: number) => {
    updateStateAndSave(prev => {
      const updatedOverrides = {
        ...(prev.accessoriesRates.sectorOverrides ?? {}),
        [sectorUuid]: price
      };
      return {
        accessoriesRates: {
          ...prev.accessoriesRates,
          sectorOverrides: updatedOverrides
        }
      };
    });
  };

  const handleAddWindowRow = () => {
    const defaultSector = dbSectors[1]?.uuid || FALLBACK_SECTORS[1].uuid;
    const newRow: WindowTakeoffRow = {
      id: `new-win-${Date.now()}`,
      roomName: "نافذة إضافية مخصصة",
      width: 1.50,
      height: 1.20,
      sectorUuid: defaultSector,
      glassType: 'single',
      screenType: 'standard',
      openingStyle: 'sliding',
      paintColor: 'أسود مطفي عازل'
    };
    updateStateAndSave(prev => ({
      windows: [...prev.windows, newRow]
    }));
  };

  const handleWindowRowEdit = (id: string, fields: Partial<WindowTakeoffRow>) => {
    updateStateAndSave(prev => ({
      windows: prev.windows.map(row => row.id === id ? { ...row, ...fields } : row)
    }));
  };

  const handleRemoveWindowRow = (id: string) => {
    updateStateAndSave(prev => ({
      windows: prev.windows.filter(row => row.id !== id)
    }));
  };

  const getSectorRatePerMeter = (sectorUuid: string): number => {
    if (state.accessoriesRates.sectorOverrides?.[sectorUuid] !== undefined) {
      return state.accessoriesRates.sectorOverrides[sectorUuid];
    }
    const dbSec = dbSectors.find(s => s.uuid === sectorUuid);
    if (dbSec) return dbSec.base_rate;
    
    const fallback = FALLBACK_SECTORS.find(s => s.uuid === sectorUuid);
    return fallback ? fallback.base_rate : 4500;
  };

  const calculateRowCost = (row: WindowTakeoffRow): number => {
    const area = (row.width ?? 0) * (row.height ?? 0);

    const isSmallTiltWindow = row.roomName.includes('قلاب') || ((row.width ?? 0) <= 0.61 && (row.height ?? 0) <= 0.61);
    if (isSmallTiltWindow) {
      return state.accessoriesRates.smallWindowRate ?? 1500;
    }

    const sectorPricePerMeter = getSectorRatePerMeter(row.sectorUuid);

    const glassPricePerMeter = row.glassType === 'double'
      ? (state.accessoriesRates.glassDoubleRate ?? 1200)
      : (row.glassType === 'georgia' ? (state.accessoriesRates.glassGeorgiaRate ?? 2200) : 0);

    const screenPricePerWindow = row.screenType === 'pleated' ? (state.accessoriesRates.screenPleatedRate ?? 800) : 0;

    return (area * (sectorPricePerMeter + glassPricePerMeter)) + screenPricePerWindow;
  };

  const totalSquareMetersCount = state.enabled 
    ? state.windows.reduce((sum, row) => sum + ((row.width ?? 0) * (row.height ?? 0)), 0) 
    : 0;

  const activeTransportationCost = state.enabled && state.hasTransportation ? (state.accessoriesRates.transportationPrice ?? 1500) : 0;

  const totalAluminumEstimate = state.enabled 
    ? state.windows.reduce((sum, row) => sum + calculateRowCost(row), 0) + activeTransportationCost
    : 0;

  const activeEditorSector = dbSectors.find(s => s.uuid === activeEditorSectorUuid) || FALLBACK_SECTORS[0];
  const activeEditorPrice = state.accessoriesRates.sectorOverrides?.[activeEditorSectorUuid] !== undefined
    ? state.accessoriesRates.sectorOverrides[activeEditorSectorUuid]
    : activeEditorSector.base_rate;

  return (
    <div className="space-y-8 font-alexandria text-right" dir="rtl">
      
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800;900&display=swap');
        
        .font-alexandria {
          font-family: 'Alexandria', Arial, sans-serif !important;
          letter-spacing: normal !important;
        }
      `}</style>

      {/* استدعاء شريط التفعيل المنزلق اللمسي الموحد للشركة */}
      <TabActivationBanner 
        title="اعمال قطاعات الألوميتال والزجاج العازل"
        subtitle="Aluminum & Glass ERP System"
        icon={Layers}
        enabled={state.enabled}
        onToggle={() => { updateStateAndSave(prev => ({ enabled: !prev.enabled })); }}
      />

      <div className={`space-y-8 transition-all duration-500 ${state.enabled ? 'opacity-100 pointer-events-auto' : 'opacity-25 pointer-events-none filter grayscale'}`}>

        <div className="p-6 rounded-2xl bg-[#07132a] border border-[#D4AF37] space-y-4">
          <div className="border-b border-[#D4AF37] pb-2 flex items-center gap-2 text-[#D4AF37] select-none font-bold">
            <Cpu className="w-5 h-5" />
            <h4 className="text-lg font-black text-[#D4AF37]"> أسعار متر الألوميتال والزجاج والإكسسوارات  بالمقايسة:</h4>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* الكارت 1: تحديد سعر القطاع المعتمد */}
            <div className="p-5 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex flex-col justify-between space-y-4">
              <div>
                <span className="text-xs text-[#D4AF37] font-bold block mb-1 select-none">القطاع المعتمد للتشغيل:</span>
                <select
                  disabled={!state.enabled}
                  value={activeEditorSectorUuid ?? ''}
                  onChange={(e) => setActiveEditorSectorUuid(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#07132a] border border-[#1f2d4d] focus:border-[#D4AF37] text-sm text-[#F0E6D2] font-bold outline-none cursor-pointer"
                >
                  {dbSectors.map(sec => (
                    <option key={sec.uuid} value={sec.uuid} className="bg-[#020B1C] text-white">
                      {sec.spec_name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-gray-500 block mt-1.5 select-none">السعر الأصلي بمكتبة الشركة: {(activeEditorSector.base_rate ?? 0).toLocaleString('en-US')} ج.م / م²</span>
              </div>
              
              <div className="space-y-1">
                <span className="text-xs text-[#D4AF37] font-bold block mb-1.5 select-none font-alexandria">سعر المتر القطاع للعميل (م²):</span>
                <div className="flex items-center justify-between bg-[#07132a] border border-[#D4AF37] rounded-xl h-11 px-2 select-none">
                  <button
                    type="button"
                    disabled={!state.enabled}
                    onClick={() => handleSectorPriceOverride(activeEditorSectorUuid, (activeEditorPrice ?? 0) + 100)}
                    className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold cursor-pointer transition-all active:scale-90"
                  >
                    <Plus size={12} className="stroke-[3]" />
                  </button>
                  <span className="text-base font-black text-white font-mono">
                    {activeEditorPrice.toLocaleString()} <span className="text-[10px] text-[#F0E6D2] font-normal">ج.م</span>
                  </span>
                  <button
                    type="button"
                    disabled={!state.enabled}
                    onClick={() => handleSectorPriceOverride(activeEditorSectorUuid, Math.max(0, (activeEditorPrice ?? 0) - 100))}
                    className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold cursor-pointer transition-all active:scale-90"
                  >
                    <Minus size={12} className="stroke-[3]" />
                  </button>
                </div>
              </div>
            </div>

            {/* 🌟 كارت 2: أسعار الزجاج الفردية (تم تحويلها لصفوف رأسية متراصة وعدادات h-11 سفلية بملء الحاوية) */}
            <div className="p-5 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex flex-col gap-4.5 justify-center">
              
              {/* الصف الأول: زجاج دبل عازل */}
              <div className="space-y-1.5">
                <span className="text-xs text-[#D4AF37] font-bold block select-none">سعر زجاج دبل عازل (م²):</span>
                <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-3 hover:border-[#D4AF37]/50 transition-all select-none">
                  <button
                    type="button"
                    disabled={!state.enabled}
                    onClick={() => handleAccessoryRateChange('glassDoubleRate', (state.accessoriesRates.glassDoubleRate ?? 1200) + 100)}
                    className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold cursor-pointer transition-all active:scale-90"
                  >
                    <Plus size={12} className="stroke-[3]" />
                  </button>
                  <span className="text-sm font-black text-white font-mono">
                    {(state.accessoriesRates.glassDoubleRate ?? 1200).toLocaleString()} <span className="text-[10px] text-[#F0E6D2]/60 font-normal">ج.م</span>
                  </span>
                  <button
                    type="button"
                    disabled={!state.enabled}
                    onClick={() => handleAccessoryRateChange('glassDoubleRate', Math.max(0, (state.accessoriesRates.glassDoubleRate ?? 1200) - 100))}
                    className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-all active:scale-90"
                  >
                    <Minus size={12} className="stroke-[3]" />
                  </button>
                </div>
              </div>

              {/* الصف الثاني: زجاج جورجيا فاخر */}
              <div className="space-y-1.5">
                <span className="text-xs text-[#D4AF37] font-bold block select-none">سعر زجاج جورجيا فاخر (م²):</span>
                <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-3 hover:border-[#D4AF37]/50 transition-all select-none">
                  <button
                    type="button"
                    disabled={!state.enabled}
                    onClick={() => handleAccessoryRateChange('glassGeorgiaRate', (state.accessoriesRates.glassGeorgiaRate ?? 2200) + 100)}
                    className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold cursor-pointer transition-all active:scale-90"
                  >
                    <Plus size={12} className="stroke-[3]" />
                  </button>
                  <span className="text-sm font-black text-white font-mono">
                    {(state.accessoriesRates.glassGeorgiaRate ?? 2200).toLocaleString()} <span className="text-[10px] text-[#F0E6D2]/60 font-normal">ج.م</span>
                  </span>
                  <button
                    type="button"
                    disabled={!state.enabled}
                    onClick={() => handleAccessoryRateChange('glassGeorgiaRate', Math.max(0, (state.accessoriesRates.glassGeorgiaRate ?? 2200) - 100))}
                    className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-all active:scale-90"
                  >
                    <Minus size={12} className="stroke-[3]" />
                  </button>
                </div>
              </div>
            </div>

            {/* 🌟 كارت 3: أسعار السلك والإكسسوارات (تم تحويلها لصفوف رأسية متراصة وعدادات h-11 سفلية بملء الحاوية) */}
            <div className="p-5 rounded-2xl bg-[#020B1C]/60 border border-[#1f2d4d] flex flex-col gap-4.5 justify-center">
              
              {/* الصف الأول: سلك ناموس بليسيه مطوي */}
              <div className="space-y-1.5">
                <span className="text-xs text-[#D4AF37] font-bold block select-none">سلك ناموس بليسيه مطوي (وحدة):</span>
                <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-3 hover:border-[#D4AF37]/50 transition-all select-none">
                  <button
                    type="button"
                    disabled={!state.enabled}
                    onClick={() => handleAccessoryRateChange('screenPleatedRate', (state.accessoriesRates.screenPleatedRate ?? 800) + 50)}
                    className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold cursor-pointer transition-all active:scale-90"
                  >
                    <Plus size={12} className="stroke-[3]" />
                  </button>
                  <span className="text-sm font-black text-white font-mono">
                    {(state.accessoriesRates.screenPleatedRate ?? 800).toLocaleString()} <span className="text-[10px] text-[#F0E6D2]/60 font-normal">ج.م</span>
                  </span>
                  <button
                    type="button"
                    disabled={!state.enabled}
                    onClick={() => handleAccessoryRateChange('screenPleatedRate', Math.max(0, (state.accessoriesRates.screenPleatedRate ?? 800) - 50))}
                    className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-all active:scale-90"
                  >
                    <Minus size={12} className="stroke-[3]" />
                  </button>
                </div>
              </div>

              {/* الصف الثاني: تركيب إكسسوارات مفصلي قلاب */}
              <div className="space-y-1.5">
                <span className="text-xs text-[#D4AF37] font-bold block select-none">سعر تركيب إكسسوارات مفصلي قلاب:</span>
                <div className="flex items-center justify-between bg-[#07132a] border border-[#1f2d4d] rounded-xl h-11 px-3 hover:border-[#D4AF37]/50 transition-all select-none">
                  <button
                    type="button"
                    disabled={!state.enabled}
                    onClick={() => handleAccessoryRateChange('smallWindowRate', (state.accessoriesRates.smallWindowRate ?? 1500) + 50)}
                    className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold cursor-pointer transition-all active:scale-90"
                  >
                    <Plus size={12} className="stroke-[3]" />
                  </button>
                  <span className="text-sm font-black text-white font-mono">
                    {(state.accessoriesRates.smallWindowRate ?? 1500).toLocaleString()} <span className="text-[10px] text-[#F0E6D2]/60 font-normal">ج.م</span>
                  </span>
                  <button
                    type="button"
                    disabled={!state.enabled}
                    onClick={() => handleAccessoryRateChange('smallWindowRate', Math.max(0, (state.accessoriesRates.smallWindowRate ?? 1500) - 50))}
                    className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-all active:scale-90"
                  >
                    <Minus size={12} className="stroke-[3]" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D4AF37] pb-2 select-none">
          <div className="flex items-center gap-2 text-[#D4AF37]">
            <Layers className="w-6 h-6 animate-pulse" />
            <h4 className="text-lg font-black text-[#D4AF37]">فتحات النوافذ والأبواب بالأبعاد والمساحة (حصر دقيق للشبابيك):</h4>
          </div>
          <button
            type="button"
            disabled={!state.enabled}
            onClick={handleAddWindowRow}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 text-sm font-bold transition-all cursor-pointer font-alexandria"
          >
            <PlusCircle className="w-5 h-5" />
            <span>إضافة فتحة شباك/بلكونة مخصصة</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-16 bg-[#07132a] rounded-3xl border border-[#1f2d4d] gap-3 text-[#D4AF37] select-none">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="text-base font-semibold">جاري جلب جدول الحصر الفردي للنوافذ من قاعدة البيانات ...</span>
          </div>
        ) : state.windows.length === 0 ? (
          <div className="text-center p-12 bg-[#020B1C]/40 rounded-3xl border border-[#1f2d4d]/40 select-none">
            <p className="text-sm text-gray-500">لا توجد نوافذ مضافة ببيان الحصر الهندسي حالياً للوحدة</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {state.windows.map((row) => {
              const area = (row.width ?? 0) * (row.height ?? 0);
              const rowCost = calculateRowCost(row);

              return (
                <div 
                  key={row.id}
                  className="p-6 rounded-3xl bg-[#07132a] border border-[#1f2d4d] hover:border-[#D4AF37]/50 shadow-[0_0_15px_rgba(31,45,77,0.3)] hover:shadow-[0_0_25px_rgba(212,175,55,0.08)] transition-all duration-300 relative group flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="border-r-4 border-[#D4AF37] pr-3 flex justify-between items-center pb-2 border-b border-[#1f2d4d]/30">
                      <div>
                        <input 
                          type="text"
                          disabled={!state.enabled}
                          value={row.roomName ?? ''}
                          onChange={(e) => handleWindowRowEdit(row.id, { roomName: e.target.value })}
                          className="bg-transparent text-ms font-black text-[#D4AF37] border-b border-transparent hover:border-[#D4AF37]/30 focus:border-[#D4AF37] outline-none transition-all w-full max-w-[200px]"
                        />
                        <span className="text-[10px] text-gray-500 block mt-0.5 select-none">تخصيص الخامات والأبعاد للفتحة</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveWindowRow(row.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      
                      {/* 🎯 تعديل عداد العرض ليتطابق بكسلياً بارتفاع h-11 والدواير الرشيقة w-6 h-6 مع دستور الـ ERP */}
                      <div className="space-y-1">
                        <span className="text-xs text-gray-400 font-bold block mb-1 select-none">العرض (متر):</span>
                        <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none" dir="ltr">
                          <button
                            type="button"
                            disabled={!state.enabled}
                            onClick={() => {
                              const currentVal = row.width ?? 0;
                              handleWindowRowEdit(row.id, { width: Math.max(0.1, Number((currentVal - 0.10).toFixed(2))) });
                            }}
                            className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                          >
                            <Minus size={12} className="stroke-[3]" />
                          </button>
                          <span className="text-sm font-black text-white font-mono">{row.width?.toFixed(2) ?? "0.00"}</span>
                          <button
                            type="button"
                            disabled={!state.enabled}
                            onClick={() => {
                              const currentVal = row.width ?? 0;
                              handleWindowRowEdit(row.id, { width: Math.max(0.1, Number((currentVal + 0.10).toFixed(2))) });
                            }}
                            className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                          >
                            <Plus size={12} className="stroke-[3]" />
                          </button>
                        </div>
                      </div>
                      
                      {/* 🎯 تعديل عداد الارتفاع ليتطابق بكسلياً بارتفاع h-11 والدواير الرشيقة w-6 h-6 مع دستور الـ ERP */}
                      <div className="space-y-1">
                        <span className="text-xs text-gray-400 font-bold block mb-1 select-none">الارتفاع (متر):</span>
                        <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-11 px-2 select-none" dir="ltr">
                          <button
                            type="button"
                            disabled={!state.enabled}
                            onClick={() => {
                              const currentVal = row.height ?? 0;
                              handleWindowRowEdit(row.id, { height: Math.max(0.1, Number((currentVal - 0.10).toFixed(2))) });
                            }}
                            className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                          >
                            <Minus size={12} className="stroke-[3]" />
                          </button>
                          <span className="text-sm font-black text-white font-mono">{row.height?.toFixed(2) ?? "0.00"}</span>
                          <button
                            type="button"
                            disabled={!state.enabled}
                            onClick={() => {
                              const currentVal = row.height ?? 0;
                              handleWindowRowEdit(row.id, { height: Math.max(0.1, Number((currentVal + 0.10).toFixed(2))) });
                            }}
                            className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                          >
                            <Plus size={12} className="stroke-[3]" />
                          </button>
                        </div>
                      </div>

                      <div className="bg-[#020B1C] border border-[#1f2d4d] rounded-xl flex flex-col justify-center items-center p-1.5 select-none h-11 self-end mb-0.5">
                        <span className="text-[10px] text-gray-500 font-semibold block leading-none mb-0.5">المساحة:</span>
                        <span className="text-sm font-mono font-black text-[#D4AF37] leading-none">{area.toFixed(2)} م²</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-xs text-gray-400 font-bold block select-none">براند ونوع قطاع الألوميتال:</span>
                          <select
                            disabled={!state.enabled}
                            value={row.sectorUuid ?? ''}
                            onChange={(e) => handleWindowRowEdit(row.id, { sectorUuid: e.target.value })}
                            className="w-full h-11 px-3 rounded-xl bg-[#020B1C] border border-[#1f2d4d] focus:border-[#D4AF37] text-sm text-[#F0E6D2] font-bold outline-none cursor-pointer"
                          >
                            {dbSectors.map(sec => (
                              <option key={sec.uuid} value={sec.uuid} className="bg-[#020B1C] text-white">
                                {sec.spec_name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <span className="text-xs text-gray-400 font-bold block select-none">لون الدهان (الكتروستاتيك):</span>
                          <input
                            type="text"
                            disabled={!state.enabled}
                            value={row.paintColor ?? ''}
                            onChange={(e) => handleWindowRowEdit(row.id, { paintColor: e.target.value })}
                            placeholder="مثال: أسود مطفي عازل"
                            className="w-full h-11 px-3 rounded-xl bg-[#020B1C] border border-[#1f2d4d] focus:border-[#D4AF37] text-sm text-white outline-none font-bold"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 select-none">
                        <span className="text-xs text-gray-400 font-bold block">طريقة حركة وفتح الإطار:</span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={!state.enabled}
                            onClick={() => handleWindowRowEdit(row.id, { openingStyle: 'sliding' })}
                            className={`py-2.5 px-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                              row.openingStyle === 'sliding'
                                ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37]'
                                : 'border-[#1f2d4d] bg-[#020B1C] text-gray-400'
                            }`}
                          >
                            جرار انزلاقي
                          </button>
                          <button
                            type="button"
                            disabled={!state.enabled}
                            onClick={() => handleWindowRowEdit(row.id, { openingStyle: 'hinged' })}
                            className={`py-2.5 px-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                              row.openingStyle === 'hinged'
                                ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37]'
                                : 'border-[#1f2d4d] bg-[#020B1C] text-gray-400'
                            }`}
                          >
                            مفصلي قلاب
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 select-none">
                        <span className="text-xs text-gray-400 font-bold block">جودة ونوع عزل الزجاج:</span>
                        <div className="grid grid-cols-3 gap-2">
                          {(['single', 'double', 'georgia'] as const).map((g) => (
                            <button
                              key={g}
                              type="button"
                              disabled={!state.enabled}
                              onClick={() => handleWindowRowEdit(row.id, { glassType: g })}
                              className={`py-2.5 px-1 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                row.glassType === g
                                  ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37]'
                                  : 'border-[#1f2d4d] bg-[#020B1C] text-gray-400'
                              }`}
                            >
                              {g === 'single' ? 'سنجل شفاف' : g === 'double' ? 'دبل عازل' : 'دبل جورجيا'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 select-none">
                        <span className="text-xs text-gray-400 font-bold block">سلك ناموس الحماية:</span>
                        <div className="grid grid-cols-2 gap-2">
                          {(['standard', 'pleated'] as const).map((s) => (
                            <button
                              key={s}
                              type="button"
                              disabled={!state.enabled}
                              onClick={() => handleWindowRowEdit(row.id, { screenType: s })}
                              className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                row.screenType === s
                                  ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37]'
                                  : 'border-[#1f2d4d] bg-[#020B1C] text-gray-400'
                              }`}
                            >
                              {s === 'standard' ? 'سلك فايبر ثابت' : 'سلك بليسيه مطوي'}
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#1f2d4d]/40 flex items-center justify-between select-none">
                    <span className="text-xs text-gray-500 font-bold">كلفة التكسية التقديرية للنافذة:</span>
                    <span className="text-3xl font-black text-[#D4AF37] tracking-wider font-mono">
                      {rowCost.toLocaleString('en-US')} <span className="text-xs font-normal">ج.م</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div 
          onClick={() => {
            if (!state.enabled) return;
            updateStateAndSave(prev => ({ hasTransportation: !prev.hasTransportation }));
          }}
          className={`p-6 rounded-3xl border transition-all duration-500 flex flex-col sm:flex-row items-center justify-between gap-6 ${
            state.enabled ? 'cursor-pointer' : 'cursor-not-allowed'
          } ${
            state.hasTransportation && state.enabled
              ? 'border-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_20px_rgba(212,175,55,0.08)]' 
              : 'border-[#1f2d4d] bg-[#020B1C]/40'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-xl border transition-all duration-300 flex-shrink-0 ${
              state.hasTransportation && state.enabled ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-[#020B1C] border-[#1f2d4d] text-gray-500'
            }`}>
              <Star className="w-8 h-8" />
            </div>
            <div className="text-right">
              <h4 className="text-lg font-black text-[#D4AF37]">تكاليف النقل وتشوين القطاعات والزجاج بالدور</h4>
              <p className="text-xs text-white mt-1">تأمين نقل الألواح وتشوينها للأدوار العليا لسلامة الزجاج من الخدش والكسر</p>
              
              {/* 🎯 تعديل عداد تكاليف النقل والتشوين المذهب ليتطابق بكسلياً بالدواير الرشيقة h-10 w-6 h-6 مع دستور الـ ERP */}
              <div className="mt-3 select-none" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl h-10 px-2 hover:border-[#D4AF37]/50 transition-all select-none w-44" dir="ltr">
                  <button
                    type="button"
                    disabled={!state.hasTransportation || !state.enabled}
                    onClick={() => handleAccessoryRateChange('transportationPrice', Math.max(0, (state.accessoriesRates.transportationPrice ?? 1500) - 100))}
                    className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                  >
                    <Minus size={12} className="stroke-[3]" />
                  </button>
                  <span className="text-sm font-bold text-white font-mono">
                    {(state.accessoriesRates.transportationPrice ?? 1500).toLocaleString()} <span className="text-[9px] text-gray-500 font-normal">ج.م</span>
                  </span>
                  <button
                    type="button"
                    disabled={!state.hasTransportation || !state.enabled}
                    onClick={() => handleAccessoryRateChange('transportationPrice', (state.accessoriesRates.transportationPrice ?? 1500) + 100)}
                    className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                  >
                    <Plus size={12} className="stroke-[3]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="text-center sm:text-left min-w-[145px] border-t sm:border-t-0 sm:border-r border-[#1f2d4d]/40 pt-4 sm:pt-0 sm:pr-6 w-full sm:w-auto select-none">
            <span className="text-xs text-gray-500 block font-semibold">تكلفة التشوين المعتمدة:</span>
            <span className="text-2xl font-black text-[#D4AF37] font-mono">{activeTransportationCost.toLocaleString('en-US')} ج.م</span>
          </div>
        </div>

      </div>

      <div className="p-6 rounded-2xl bg-[#07132a] border border-[#D4AF37] space-y-3">
        <div className="flex items-center gap-2 text-[#D4AF37] border-b border-[#D4AF37] pb-2">
          <FileText className="w-5 h-5" />
          <h4 className="text-lg font-black text-[#D4AF37]">اتفاقات وبنود مخصصة لأعمال الألوميتال والشبابيك :</h4>
        </div>
        <textarea
          value={notesInput}
          disabled={!state.enabled}
          onChange={(e) => setNotesInput(e.target.value)}
          onBlur={() => {
            updateStateAndSave(prev => ({ notes: notesInput }));
          }}
          placeholder="اكتب هنا أي تفاصيل مخصصة، درجات فوم عزل النوافذ، جودة المقابض والمفصلات الإيطالية، أو شروط تصنيع إضافية تم الاتفاق عليها مع العميل لحفظها مباشرة بالعقد..."
          className="w-full h-24 p-4 rounded-xl bg-[#020B1C] border border-[#1f2d4d] hover:border-[#D4AF37]/50 focus:border-[#D4AF37] text-[#F0E6D2] placeholder-gray-500 outline-none transition-all resize-none leading-relaxed"
        />
        <div className="flex justify-between items-center text-xs text-gray-500 px-1 select-none">
          <span>يتم الحفظ تلقائياً بمجرد الخروج من حقل الكتابة</span>
          <span>حالة الاتصال: متصل </span>
        </div>
      </div>

      {/* 🌟 تم إعادة هيكلة كارت الملخص المالي الإجمالي لبند الألوميتال والشبابيك ليطابق بالكامل تصميم كارت التكييف المعتمد */}
      <div className="p-5 rounded-xl bg-[#020B1C] border border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.05)] flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[#D4AF37]" />
        
        <div className="space-y-1 text-center sm:text-right pr-1 select-none font-alexandria">
          <h4 className="text-lg font-bold text-[#D4AF37]">الملخص المالي النهائي لبند الألوميتال والزجاج بالوحدة:</h4>
          <p className="text-xs text-[#F0E6D2]/60 font-normal leading-relaxed max-w-2xl text-right">
            التسعير بالكامل؛ إجمالي مساحة النوافذ المحصورة بالأمتار الفردية ({totalSquareMetersCount.toFixed(2)} م² للوحدة بالكامل) شاملة قطاعاتها والكماليات ومصنعيات التركيب وتكاليف التشوين بالنقل ({activeTransportationCost.toLocaleString('en-US')} ج.م).
          </p>
        </div>

        <div className="flex items-center gap-3 bg-[#07132a] px-6 py-4 rounded-lg border border-[#1f2d4d]">
          <div className="p-1.5 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
            <DollarSign className="w-6 h-6" />
          </div>
          <div className="text-right">
            <span className="text-[10px] text-white block font-semibold">إجمالي تكلفة النوافذ :</span>
            <span className="text-2xl font-black text-[#D4AF37] font-mono">
              {totalAluminumEstimate.toLocaleString('en-US')} <span className="text-xs font-normal">ج.م</span>
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}