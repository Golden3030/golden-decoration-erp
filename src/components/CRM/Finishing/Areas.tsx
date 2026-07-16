"use client";

import React, { useState, useEffect } from 'react';
import { useCRM } from "../context/CRMContext";
import { Layers, Check, Home, ShieldAlert, Cpu, Plus, Minus } from 'lucide-react';

export default function Areas() {
  const { crmData, setCRMData, updateBulkFinishingSection, isLocked } = useCRM();

  const areasData = crmData?.finishing?.areas || {
    values: {},
    notes: ""
  };

  const values = areasData.values || {};
  const notes = areasData.notes || "";

  const project = crmData?.project || {};
  const totalArea = Number(project.area || 150);

  const bedroomsVal = Number(project.roomsCount || 2);
  const bathroomsVal = Number(project.bathroomsCount || 1);
  const receptionsVal = Number(project.receptionsCount || 1);
  const kitchensVal = Number(project.kitchensCount || 1);
  const balconiesVal = Number(project.balconiesCount || 1);
  const livingVal = Number(project.livingCount || 1);

  const [corridorsActive, setCorridorsActive] = useState<boolean>(false);
  const [gardenActive, setGardenActive] = useState<boolean>(false);

  useEffect(() => {
    const hasGarden = !!(values["الحديقة / الجاردن"] && Number(values["الحديقة / الجاردن"]) > 0);
    setGardenActive(hasGarden);

    const hasCorridors = !!(
      (values["الطرقة الرئيسية"] && Number(values["الطرقة الرئيسية"]) > 0) || 
      (values["الطرقة الفرعية"] && Number(values["الطرقة الفرعية"]) > 0)
    );
    setCorridorsActive(hasCorridors);
  }, [values]);

  const handleValueChange = (itemName: string, numericValue: number) => {
    if (isLocked) return;
    const updatedValues = {
      ...values,
      [itemName]: numericValue > 0 ? String(numericValue) : ""
    };

    let extraProjectUpdates: Record<string, any> = {};
    if (itemName === "الحديقة / الجاردن") {
      extraProjectUpdates.gardenArea = numericValue;
      extraProjectUpdates.gardenExist = numericValue > 0;
    }
    if (itemName === "الطرقة الرئيسية" || itemName === "الطرقة الفرعية") {
      const mainCor = itemName === "الطرقة الرئيسية" ? numericValue : Number(values["الطرقة الرئيسية"] || 0);
      const subCor = itemName === "الطرقة الفرعية" ? numericValue : Number(values["الطرقة الفرعية"] || 0);
      extraProjectUpdates.corridorsCount = (mainCor > 0 ? 1 : 0) + (subCor > 0 ? 1 : 0);
    }

    if (Object.keys(extraProjectUpdates).length > 0) {
      setCRMData((prev: any) => ({
        ...prev,
        project: {
          ...(prev.project || {}),
          ...extraProjectUpdates
        }
      }));
    }

    updateBulkFinishingSection("areas", {
      ...areasData,
      values: updatedValues
    });
  };

  const toggleCorridors = (nextVal: boolean) => {
    if (isLocked) return;
    const updatedValues = {
      ...values,
      "الطرقة الرئيسية": nextVal ? "10" : "",
      "الطرقة الفرعية": nextVal ? "10" : ""
    };

    setCRMData((prev: any) => ({
      ...prev,
      project: {
        ...(prev.project || {}),
        corridorsCount: nextVal ? 2 : 0
      }
    }));

    updateBulkFinishingSection("areas", {
      ...areasData,
      values: updatedValues
    });
  };

  const handleTotalAreaChange = (numericValue: number) => {
    if (isLocked) return;
    setCRMData((prev: any) => ({
      ...prev,
      project: {
        ...(prev.project || {}),
        area: numericValue
      }
    }));

    const updatedValues = {
      ...values,
      "الشقة بالكامل": String(numericValue)
    };

    updateBulkFinishingSection("areas", {
      ...areasData,
      values: updatedValues
    });
  };

  const handleNotesChange = (text: string) => {
    if (isLocked) return;
    updateBulkFinishingSection("areas", {
      ...areasData,
      notes: text
    });
  };

  const activeRoomsList: Array<{ key: string; label: string; defaultSize: number; step: number }> = [];

  for (let i = 1; i <= receptionsVal; i++) {
    activeRoomsList.push({
      key: receptionsVal === 1 ? 'الريسبشن الرئيسى' : `الريسبشن - قطعة ${i}`,
      label: receptionsVal === 1 ? 'الريسبشن الرئيسي للوحدة' : `الريسبشن - قطعة ${i}`,
      defaultSize: i === 1 ? 30 : 20,
      step: 2
    });
  }

  for (let i = 1; i <= bedroomsVal; i++) {
    activeRoomsList.push({
      key: i === 1 ? 'غرفة النوم الرئيسية' : `غرفة الأطفال ${i - 1}`,
      label: i === 1 ? 'غرفة النوم الرئيسية (الماستر)' : `غرفة الأطفال ${i - 1}`,
      defaultSize: i === 1 ? 20 : i === 2 ? 12 : 10,
      step: 1
    });
  }

  for (let i = 1; i <= kitchensVal; i++) {
    activeRoomsList.push({
      key: kitchensVal === 1 ? 'المطبخ الرئيسي' : `المطبخ الفرعي ${i}`,
      label: kitchensVal === 1 ? 'المطبخ الرئيسي' : `المطبخ الفرعي ${i}`,
      defaultSize: 10,
      step: 1
    });
  }

  for (let i = 1; i <= bathroomsVal; i++) {
    activeRoomsList.push({
      key: i === 1 ? 'الحمام الرئيسي' : i === 2 ? 'حمام ضيوف' : `الحمام الفرعي ${i}`,
      label: i === 1 ? 'الحمام الرئيسي للوحدة' : i === 2 ? 'حمام ضيوف مخصص' : `الحمام الفرعي ${i}`,
      defaultSize: 6,
      step: 1
    });
  }

  for (let i = 1; i <= balconiesVal; i++) {
    activeRoomsList.push({
      key: balconiesVal === 1 ? 'البلكونة الرئيسية' : `البلكونة الفرعية ${i}`,
      label: balconiesVal === 1 ? 'البلكونة الرئيسية (التراس)' : `البلكونة الفرعية ${i}`,
      defaultSize: 5,
      step: 1
    });
  }

  for (let i = 1; i <= livingVal; i++) {
    activeRoomsList.push({
      key: livingVal === 1 ? 'الليفنج الرئيسي' : `الليفنج - قطعة ${i}`,
      label: livingVal === 1 ? 'غرفة المعيشة الرئيسية (ليفنج)' : `غرفة المعيشة (ليفنج) - قطعة ${i}`,
      defaultSize: 18,
      step: 1
    });
  }

  const sumOfRoomAreas = activeRoomsList.reduce((sum, room) => {
    const size = Number(values[room.key] || room.defaultSize);
    return sum + size;
  }, 0) + 
  (corridorsActive ? (Number(values["الطرقة الرئيسية"] || 10) + Number(values["الطرقة الفرعية"] || 10)) : 0) +
  (gardenActive ? Number(values["الحديقة / الجاردن"] || 30) : 0);

  const areaDiscrepancy = totalArea - sumOfRoomAreas;

  return (
    <div dir="rtl" className="space-y-8 animate-fade-in select-none font-alexandria text-right">
      
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37] text-[#D4AF37]">
          <Cpu className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[#D4AF37]">حصر وتوزيع وتفاصيل مساحات الوحدة</h3>
          <p className="text-xs text-white mt-1">تحديد وتقسيم مساحات الغرف لربطها تلقائياً بحسابات كميات المقايسة والـ BOQ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#020B1C]/50 p-5 rounded-3xl border border-[#1f2d4d] items-center mb-6">
        <div>
          <span className="text-xs text-white block font-bold">المساحة الإجمالية المتعاقد عليها:</span>
          <span className="text-2xl font-black text-[#D4AF37] font-mono block mt-1">{totalArea} م²</span>
        </div>
        <div className="text-right">
          <span className="text-xs text-white block font-bold">إجمالي المساحة الموزعة داخلياً:</span>
          <span className="text-xl font-black text-[#00FF00] font-mono block mt-1">{sumOfRoomAreas} م²</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 p-2 border-r-4 border-[#D4AF37] select-none">
          <Layers className="w-5 h-5 text-[#D4AF37]" />
          <h4 className="text-base font-bold text-[#D4AF37]">أولاً: حصر وتوزيع مساحات الغرف والصالات الأساسية للوحدة:</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeRoomsList.map((room) => {
            const currentSize = Number(values[room.key] || room.defaultSize);
            return (
              <div 
                key={room.key}
                className="p-5 rounded-2xl border border-[#1f2d4d] bg-[#07132a] hover:border-[#D4AF37] transition-all duration-300 flex flex-col justify-between space-y-4 shadow-xl relative overflow-hidden group select-none"
              >
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-xl bg-[#020B1C] border border-[#243556] text-[#D4AF37] shrink-0">
                    <Home className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    {/* 🌟 1. تم تعديل لون اسم الغرفة بالكامل ليصبح بالذهب الإمبراطوري الفخم #D4AF37 */}
                    <h5 className="text-sm text-[#D4AF37] font-black leading-tight">{room.label}</h5>
                    {/* 🌟 2. تم زيادة الهامش البيني mt-3.5 وتدريج اللون عاجياً ناعماً بنسبة 60% عتامة */}
                    <p className="text-[10px] text-[#F0E6D2]/60 mt-3.5 font-bold">المقترحة للمقايسة: {room.defaultSize} م²</p>
                  </div>
                </div>

                {/* 🌟 3. تم تحويل الخط الفاصل ليتلون بالذهب النيوني الرقيق border-[#D4AF37]/30 وتعديل عداد الغرفة الفردي ليتطابق بكسلياً بارتفاع h-11 */}
                <div className="pt-3 border-t border-[#D4AF37]/30 flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-bold select-none">المساحة الموزعة:</span>
                  <div className="flex items-center gap-1.5 bg-[#020B1C] border border-[#1f2d4d] rounded-xl px-2 py-1 select-none h-11" dir="ltr">
                    <button 
                      type="button" 
                      disabled={isLocked}
                      onClick={() => handleValueChange(room.key, Math.max(0, currentSize - room.step))} 
                      className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                    >
                      <Minus size={12} className="stroke-[3]" />
                    </button>
                    <span className="text-sm font-black text-white font-mono min-w-[20px] text-center">{currentSize}</span>
                    <button 
                      type="button" 
                      disabled={isLocked}
                      onClick={() => handleValueChange(room.key, currentSize + room.step)} 
                      className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                    >
                      <Plus size={12} className="stroke-[3]" />
                    </button>
                    <span className="text-[10px] text-gray-500 font-bold px-1 select-none">م²</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-1.5 p-1 border-r-4 border-[#D4AF37] mr-2">
          <span className="text-base">💎</span>
          <h4 className="text-sm font-black text-[#D4AF37]">ثانياً: تفعيل وحصر كماليات الممرات الخارجية واللاندسكيب (جاردن):</h4>
        </div>

        <div 
          onClick={() => {
            if (isLocked) return;
            const nextVal = !corridorsActive;
            toggleCorridors(nextVal);
          }}
          className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-6 select-none ${
            corridorsActive 
              ? 'border-[#D4AF37] bg-gradient-to-r from-[#07132a] to-[#D4AF37]/5 font-black' 
              : 'border-[#1f2d4d] bg-[#020B1C]/40 hover:border-[#D4AF37]/25'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right flex-1 w-full">
            <div className={`p-3 rounded-full transition-all duration-300 ${corridorsActive ? 'bg-[#D4AF37] text-[#020B1C]' : 'bg-[#1f2d4d] text-gray-500'}`}>
              <Layers className="w-6 h-6" />
            </div>
            <div className="space-y-1 w-full text-right">
              <h4 className="text-base font-bold text-[#D4AF37]"> الطرقات والممرات الداخلية بالوحدة</h4>
              <p className="text-[10px] text-gray-400 mt-1 font-bold">تفعيل هذا الخيار يحسب طرقات الشقة لتصفية دهانها بدقة بالمقايسة:</p>
              
              {corridorsActive && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 p-3 bg-[#020B1C]/50 rounded-xl border border-[#1f2d4d] text-right" onClick={e => e.stopPropagation()}>
                  
                  {/* 🎯 تعديل عداد الطرقة الرئيسية بحدود مذهبة ونبيذية وخط مذهب فاخر */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#D4AF37] font-black">الطرقة الرئيسية:</span>
                    <div className="flex items-center gap-1.5 bg-[#020B1C] border border-[#1f2d4d] rounded-xl px-2 py-1 select-none h-11" dir="ltr">
                      <button 
                        type="button" 
                        disabled={isLocked}
                        onClick={() => handleValueChange("الطرقة الرئيسية", Math.max(0, Number(values["الطرقة الرئيسية"] || 10) - 1))} 
                        className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                      >
                        <Minus size={12} className="stroke-[3]" />
                      </button>
                      <span className="text-sm font-black text-[#D4AF37] font-mono min-w-[20px] text-center">{values["الطرقة الرئيسية"] || 10}</span>
                      <button 
                        type="button" 
                        disabled={isLocked}
                        onClick={() => handleValueChange("الطرقة الرئيسية", Number(values["الطرقة الرئيسية"] || 10) + 1)} 
                        className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                      >
                        <Plus size={12} className="stroke-[3]" />
                      </button>
                      <span className="text-[9px] text-gray-500 font-bold">م²</span>
                    </div>
                  </div>

                  {/* 🎯 تعديل عداد الطرقة الفرعية بحدود مذهبة ونبيذية وخط مذهب فاخر */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#D4AF37] font-black">الطرقة الفرعية:</span>
                    <div className="flex items-center gap-1.5 bg-[#020B1C] border border-[#1f2d4d] rounded-xl px-2 py-1 select-none h-11" dir="ltr">
                      <button 
                        type="button" 
                        disabled={isLocked}
                        onClick={() => handleValueChange("الطرقة الفرعية", Math.max(0, Number(values["الطرقة الفرعية"] || 10) - 1))} 
                        className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                      >
                        <Minus size={12} className="stroke-[3]" />
                      </button>
                      <span className="text-sm font-black text-[#D4AF37] font-mono min-w-[20px] text-center">{values["الطرقة الفرعية"] || 10}</span>
                      <button 
                        type="button" 
                        disabled={isLocked}
                        onClick={() => handleValueChange("الطرقة الفرعية", Number(values["الطرقة الفرعية"] || 10) + 1)} 
                        className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                      >
                        <Plus size={12} className="stroke-[3]" />
                      </button>
                      <span className="text-[9px] text-gray-500 font-bold">م²</span>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>

        <div 
          onClick={() => {
            if (isLocked) return;
            const nextVal = !gardenActive;
            handleValueChange("الحديقة / الجاردن", nextVal ? 30 : 0);
          }}
          className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-6 select-none ${
            gardenActive 
              ? 'border-[#D4AF37] bg-gradient-to-r from-[#07132a] to-[#D4AF37]/5 font-black' 
              : 'border-[#1f2d4d] bg-[#020B1C]/40 hover:border-[#D4AF37]/25'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right flex-1 w-full">
            <div className={`p-3 rounded-full transition-all duration-300 ${gardenActive ? 'bg-[#D4AF37] text-[#020B1C]' : 'bg-[#1f2d4d] text-gray-500'}`}>
              <Home className="w-6 h-6" />
            </div>
            <div className="space-y-1 w-full text-right">
              <h4 className="text-base font-bold text-[#D4AF37]"> الحديقة المفتوحة للوحدة (جاردن)</h4>
              <p className="text-[10px] text-gray-400 mt-1 font-bold">تخصيص مسطحات اللاندسكيب للوحدات الأرضية أو الدوبلكس بالمقايسة:</p>
              
              {gardenActive && (
                /* 🎯 تعديل عداد الجاردن ليتطابق بكسلياً بارتفاع h-11 والدواير الرشيقة w-6 h-6 مع دستور الـ ERP وخط فاصل مذهب */
                <div className="flex items-center justify-between mt-3 p-3 bg-[#020B1C]/50 rounded-xl border border-[#D4AF37]/30" onClick={e => e.stopPropagation()}>
                  <span className="text-xs text-[#D4AF37] font-black">مساحة الجاردن :</span>
                  <div className="flex items-center gap-1.5 bg-[#020B1C] border border-[#1f2d4d] rounded-xl px-2 py-1 select-none h-11" dir="ltr">
                    <button 
                      type="button" 
                      disabled={isLocked}
                      onClick={() => handleValueChange("الحديقة / الجاردن", Math.max(0, Number(values["الحديقة / الجاردن"] || 30) - 5))} 
                      className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                    >
                      <Minus size={12} className="stroke-[3]" />
                    </button>
                    <span className="text-sm font-black text-[#D4AF37] font-mono min-w-[20px] text-center">{values["الحديقة / الجاردن"] || 30}</span>
                    <button 
                      type="button" 
                      disabled={isLocked}
                      onClick={() => handleValueChange("الحديقة / الجاردن", Number(values["الحديقة / الجاردن"] || 30) + 5)} 
                      className="w-6 h-6 rounded-full bg-[#020B1C] border border-[#243556] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#020B1C] text-[#D4AF37] flex items-center justify-center font-bold text-xs cursor-pointer transition active:scale-90"
                    >
                      <Plus size={12} className="stroke-[3]" />
                    </button>
                    <span className="text-[9px] text-gray-500 font-bold">م²</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      <div className="p-6 rounded-2xl bg-[#020B1C] border border-[#1f2d4d] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center sm:text-right">
          <h4 className="text-sm font-bold text-[#D4AF37] flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#D4AF37]" />
            محرك تدقيق اتساق المساحات الموزعة بالمقايسة:
          </h4>
          <p className="text-[11px] text-white">يقارن النظام حركياً إجمالي مساحات الغرف المفردة ({sumOfRoomAreas} م²) بالمساحة المتعاقد عليها بالصفحة الأولى ({totalArea} م²)</p>
        </div>

        {areaDiscrepancy === 0 ? (
          <div className="flex items-center gap-2.5 bg-green-950/20 border border-green-500/40 text-green-400 px-4 py-3 rounded-xl font-bold text-xs">
            <span>✓</span> المساحات متطابقة 100% وبدون أي فوارق
          </div>
        ) : areaDiscrepancy > 0 ? (
          <div className="flex items-center gap-2.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] px-4 py-3 rounded-xl font-bold text-xs">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
            يوجد فارق متبقي بمقدار ({areaDiscrepancy} م²) غير موزع بالداخل
          </div>
        ) : (
          <div className="flex items-center gap-2.5 bg-red-950/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl font-bold text-xs">
            <ShieldAlert className="w-5 h-5 animate-bounce" />
            مجموع الغرف يتجاوز مساحة الشقة بـ ({Math.abs(areaDiscrepancy)} م²)
          </div>
        )}
      </div>

      <div className="mt-8 text-right">
        <label className="text-[#D4AF37] block mb-2 text-xs md:text-sm font-bold">ملاحظات وشروط استلام حصر المساحات والمسطحات</label>
        <textarea
          value={notes}
          disabled={isLocked}
          onChange={(e) => handleNotesChange(e.target.value)}
          className="w-full h-32 bg-[#07132a] border border-[#1f2d4d] rounded-lg p-3 text-white text-sm md:text-base outline-none focus:border-[#D4AF37] leading-relaxed font-bold disabled:opacity-50"
          placeholder="شروط تصفية أمتار الحوائط والأسقف، نسبة هالك بلاط السيراميك والبورسلين..."
        />
      </div>

    </div>
  );
}