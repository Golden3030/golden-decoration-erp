"use client";

import React from "react";
import { useCRM } from "@/components/CRM/context/CRMContext";
import { Trash2, Layers } from "lucide-react";

export const categoryNames: Record<string, string> = {
  archMod: "تعديل معماري وتكسير",
  masonry: "أعمال المباني والطوب",
  plaster: "أعمال المصيص والمحارة",
  paint: "أعمال الدهانات والنقاشة",
  flooring: "أعمال الأرضيات والتكسيات",
  ceiling: "الأسقف المعلقة والجبس بورد",
  ac: "أعمال تكييف الهواء وتأسيس النحاس",
  ventilation: "أعمال تهوية وشفاطات",
  doors: "أعمال الأبواب والنجارة",
  aluminum: "الشبابيك وقطاعات الألوميتال",
  staircase: "تكسية وتجليد السلالم",
  electricity: "تأسيس وتمديد الكهرباء",
  plumbing: "تأسيس سباكة وتغذية مائية",
  decorations: "أعمال الديكورات والتجاليد الجمالية"
};

interface EstimateTableProps {
  items: any[];
  isEditable?: boolean;
}

export default function EstimateTable({ items, isEditable = false }: EstimateTableProps) {
  const { updateEstimate, isLocked } = useCRM();

  // 🔒 صمام الأمان الفاصل: يتم قفل وإيقاف صلاحية التحرير يدوياً فور تجميد المقايسة تعاقدياً
  const editable = isEditable && !isLocked;

  // دالة الحساب الدفاعية الآمنة لجمع مجاميع السطور برمجياً بشكل يتفادى تباين مسميات الحقول
  const calculateRowTotal = (item: any) => {
    const qty = Number(item.quantity ?? 0);
    const uPrice = Number(item.unitPrice ?? item.unit_price ?? 0);
    const lCost = Number(item.laborCost ?? item.labor_cost ?? 0);
    return (qty * uPrice) + lCost;
  };

  // دالة الحساب الإجمالية لكافة البنود المعدلة دفعة واحدة
  const calculateGrandTotal = (updatedItems: any[]) => {
    return updatedItems.reduce((sum, item) => sum + calculateRowTotal(item), 0);
  };

  const handleFieldChange = (itemId: string, field: string, value: any) => {
    if (!editable) return;
    
    const updatedItems = items.map((item) => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        
        // 🌟 مزامنة مزدوجة للحقول لضمان عدم حدوث تضارب بين السيرفر والذاكرة المحلية
        if (field === "unitPrice") updatedItem.unit_price = value;
        if (field === "unit_price") updatedItem.unitPrice = value;
        if (field === "laborCost") updatedItem.labor_cost = value;
        if (field === "labor_cost") updatedItem.laborCost = value;
        if (field === "quantity") updatedItem.quantity = value;
        
        return updatedItem;
      }
      return item;
    });

    const newTotal = calculateGrandTotal(updatedItems);

    updateEstimate({
      items: updatedItems,
      total: newTotal
    });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!editable) return;
    const confirmDelete = window.confirm("⚠️ هل أنت متأكد من رغبتك في حذف هذا البند نهائياً من المقايسة الحالية؟");
    if (!confirmDelete) return;

    const updatedItems = items.filter((item) => item.id !== itemId);
    const newTotal = calculateGrandTotal(updatedItems);

    updateEstimate({
      items: updatedItems,
      total: newTotal
    });
  };

  const groupedItems = items.reduce((acc, item) => {
    const categoryKey = item.category || "other";
    if (!acc[categoryKey]) acc[categoryKey] = [];
    acc[categoryKey].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  if (!items || items.length === 0) return null;

  return (
    <div className="rounded-2xl bg-[#07132a] border border-[#1f2d4d] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-[#1f2d4d]/40 border-b border-[#1f2d4d] text-[#F0E6D2] text-lg font-bold select-none">
              <th className="p-4 w-[35%] text-right">بيان البند والوصف الهندسي</th>
              <th className="p-4 text-center w-[10%]">الوحدة</th>
              <th className="p-4 text-center w-[12%]">الكمية</th>
              <th className="p-4 text-center w-[12%]">سعر مادة الخام</th>
              <th className="p-4 text-center w-[12%]">أجور المصنعيات</th>
              <th className="p-4 text-center w-[14%]">إجمالي التكلفة</th>
              {editable && <th className="p-4 text-center w-[5%]">خيارات</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1f2d4d]/50">
            {(Object.entries(groupedItems) as [string, any[]][]).map(([categoryKey, categoryItems]) => (
              <React.Fragment key={categoryKey}>
                <tr className="bg-[#020B1C] border-y border-[#1f2d4d]/80 text-[#D4AF37] font-extrabold text-base select-none">
                  <td colSpan={editable ? 7 : 6} className="px-4 py-3 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[#D4AF37]" />
                    <span>{categoryNames[categoryKey] || "بنود وتجهيزات عامة"}</span>
                  </td>
                </tr>

                {categoryItems.map((item: any) => {
                  const itemTotal = calculateRowTotal(item);
                  const activeUnitPrice = item.unitPrice ?? item.unit_price ?? 0;
                  const activeLaborCost = item.laborCost ?? item.labor_cost ?? 0;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#1f2d4d]/20 transition-all duration-200 text-base text-[#F0E6D2]"
                    >
                      <td className="p-4 text-right">
                        {editable ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={item.name || ""}
                              onChange={(e) => handleFieldChange(item.id, "name", e.target.value)}
                              className="w-full px-3 py-1.5 text-base font-bold rounded-lg bg-[#020B1C] border border-[#1f2d4d] focus:border-[#D4AF37] outline-none text-[#F0E6D2] text-right"
                            />
                            <textarea
                              value={item.description || ""}
                              onChange={(e) => handleFieldChange(item.id, "description", e.target.value)}
                              className="w-full px-3 py-1.5 text-sm rounded-lg bg-[#020B1C]/50 border border-[#1f2d4d] focus:border-[#D4AF37] outline-none text-gray-400 text-right h-16 resize-none"
                            />
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="font-bold text-[#F0E6D2]">{item.name}</div>
                            {item.description && (
                              <p className="text-sm text-gray-400 leading-relaxed">{item.description}</p>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="p-4 text-center font-medium">
                        {editable ? (
                          <input
                            type="text"
                            value={item.unit || "م²"}
                            onChange={(e) => handleFieldChange(item.id, "unit", e.target.value)}
                            className="w-16 px-2 py-1 text-center rounded-lg bg-[#020B1C] border border-[#1f2d4d] focus:border-[#D4AF37] outline-none text-sm text-[#F0E6D2]"
                          />
                        ) : (
                          <span>{item.unit}</span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        {editable ? (
                          <input
                            type="number"
                            value={item.quantity ?? 0}
                            onChange={(e) => handleFieldChange(item.id, "quantity", Number(e.target.value))}
                            className="w-20 px-2 py-1 text-center font-bold rounded-lg bg-[#020B1C] border border-[#1f2d4d] focus:border-[#D4AF37] outline-none text-base text-[#F0E6D2]"
                          />
                        ) : (
                          <span className="font-bold">{item.quantity}</span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        {editable ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              value={activeUnitPrice}
                              onChange={(e) => handleFieldChange(item.id, "unitPrice", Number(e.target.value))}
                              className="w-24 px-2 py-1 text-center font-bold rounded-lg bg-[#020B1C] border border-[#1f2d4d] focus:border-[#D4AF37] outline-none text-base text-[#F0E6D2]"
                            />
                            <span className="text-xs text-gray-400 select-none">ج.م</span>
                          </div>
                        ) : (
                          <span className="font-bold">
                            {Number(activeUnitPrice).toLocaleString()} ج.م
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        {editable ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              value={activeLaborCost}
                              onChange={(e) => handleFieldChange(item.id, "laborCost", Number(e.target.value))}
                              className="w-24 px-2 py-1 text-center font-bold rounded-lg bg-[#020B1C] border border-[#1f2d4d] focus:border-[#D4AF37] outline-none text-base text-[#F0E6D2]"
                            />
                            <span className="text-xs text-gray-400 select-none">ج.م</span>
                          </div>
                        ) : (
                          <span className="font-bold">
                            {Number(activeLaborCost).toLocaleString()} ج.م
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center font-extrabold text-[#D4AF37]">
                        {itemTotal.toLocaleString()} ج.م
                      </td>

                      {editable && (
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}