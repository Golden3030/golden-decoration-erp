"use client";

import { useCRM } from "@/components/CRM/context/CRMContext";
import { ShieldAlert } from "lucide-react";

export default function EstimateTotals() {
  const { crmData, updateEstimate } = useCRM();

  const estimate = crmData.estimate || {};
  const materialsCost = Number(estimate.materialsCost || 0);
  const laborCost = Number(estimate.laborCost || 0);
  const engineeringPercentage = Number(estimate.engineeringPercentage || 15);

  const engineeringValue = estimate.engineeringValue 
    ? Number(estimate.engineeringValue) 
    : (materialsCost + laborCost) * (engineeringPercentage / 100);

  const total = estimate.total 
    ? Number(estimate.total) 
    : (materialsCost + laborCost + engineeringValue);

  const area = Number(crmData.project?.area || 0);
  
  const pricePerMeter = area > 0 ? Math.round(total / area) : 0;

  const projectEstimatedMax = crmData.project?.estimatedMax ? Number(crmData.project.estimatedMax) : null;

  // تحديث نسبة إشراف وهامش الشركة مع إعادة احتساب الإجماليات لحظياً
  const handlePercentageChange = (newPercentage: number) => {
    const percent = Math.max(0, Math.min(100, newPercentage));
    const newDirectCost = materialsCost + laborCost;
    const newEngineeringValue = newDirectCost * (percent / 100);
    const newFinalTotal = newDirectCost + newEngineeringValue;

    updateEstimate({
      engineeringPercentage: percent,
      total: Number(newFinalTotal.toFixed(2)),
      engineeringValue: Number(newEngineeringValue.toFixed(2))
    });
  };

  const cards = [
    {
      title: "إجمالي تكلفة الخامات",
      value: `${materialsCost.toLocaleString('ar-EG')} ج.م`,
      bg: "bg-[#020B1C]",
      border: "border-[#243556]",
      text: "text-[#F0E6D2] font-mono font-bold"
    },
    {
      title: "إجمالي تكلفة المصنعيات",
      value: `${laborCost.toLocaleString('ar-EG')} ج.م`,
      bg: "bg-[#020B1C]",
      border: "border-[#243556]",
      text: "text-[#F0E6D2] font-mono font-bold"
    },
    {
      title: `الإشراف الهندسي المالي (${engineeringPercentage}%)`,
      value: `${Math.round(engineeringValue).toLocaleString('ar-EG')} ج.م`, 
      bg: "bg-[#020B1C]",
      border: "border-[#243556]",
      text: "text-[#F0E6D2] font-mono font-bold"
    },
    {
      title: "سعر المتر المربع الشامل",
      value: area > 0 ? `${pricePerMeter.toLocaleString('ar-EG')} ج.م / م²` : "حدد مساحة الشقة 📏",
      bg: "bg-[#020B1C]",
      border: "border-[#D4AF37]/50 border-2 shadow-[0_0_12px_rgba(212,175,55,0.1)]", 
      text: "text-[#D4AF37] font-black font-mono text-xs"
    },
    {
      title: "الإجمالي النهائي التعاقدي",
      value: `${Math.round(total).toLocaleString('ar-EG')} ج.م`, 
      bg: "bg-[#0b1d3d]", 
      border: "border-[#F0E6D2] border-2 shadow-[0_0_15px_rgba(212,175,55,0.25)]", 
      text: "text-[#F0E6D2] text-xl font-black font-mono animate-fade-in"
    }
  ];

  return (
    <div dir="rtl" className="space-y-4 w-full select-none font-sans">
      
      {projectEstimatedMax && total > projectEstimatedMax && (
        <div className="p-4 rounded-xl bg-red-950/20 border-2 border-red-500 text-rose-400 flex items-center justify-center gap-2 text-xs font-black animate-pulse select-none w-full shadow-lg shadow-red-500/5">
          <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
          <span>⚠️ تنبيه رقابي مالي: تجاوزت التكلفة الإجمالية الحالية للمقايسة ({Math.round(total).toLocaleString()} ج.م) الميزانية المستهدفة للعميل ({projectEstimatedMax.toLocaleString()} ج.م)!</span>
        </div>
      )}

      {/* 🎯 لوحة تعديل النسبة التفاعلية المحدثة بصرياً بخلفية زجاجية فاخرة لتوضيح قابليتها للكتابة */}
      <div className="p-5 rounded-2xl bg-[#07132a] border border-[#1f2d4d] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="text-right select-none">
          <span className="text-[#D4AF37] font-black text-sm block">التحكم اليدوي بنسبة الإشراف والتشغيل للشركة</span>
          <p className="text-slate-400 text-xs mt-1">تعديل النسبة أدناه يعيد احتساب هامش الشركة والإجمالي النهائي للمشروع فوراً.</p>
        </div>
        
        <div className="flex items-center gap-2.5 bg-[#020B1C] border border-[#243556] px-4 py-2 rounded-xl h-11">
          <span className="text-gray-400 text-xs font-bold select-none">نسبة الإشراف المعتمدة:</span>
          <div className="flex items-center gap-0.5">
            <input
              type="number"
              min="0"
              max="100"
              value={engineeringPercentage}
              onChange={(e) => handlePercentageChange(Number(e.target.value))}
              className="w-12 bg-transparent border-b border-dashed border-[#D4AF37]/50 focus:border-solid focus:border-[#D4AF37] text-center font-black text-base text-[#D4AF37] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all duration-200"
            />
            <span className="text-[#D4AF37] font-black text-sm select-none">%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
        {cards.map((card, index) => (
          <div
            key={index}
            className={`p-4 rounded-2xl border text-center transition-all duration-300 transform hover:scale-[1.03] hover:shadow-2xl select-none cursor-pointer flex flex-col justify-between ${card.bg} ${card.border}`}
          >
            <p className="text-gray-400 text-[10px] mb-2 font-bold whitespace-nowrap">{card.title}</p>
            <p className={`transition-all duration-200 ${card.text}`}>{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}