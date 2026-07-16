"use client";

import React, { useState } from "react";
import { useCRM } from "@/components/CRM/context/CRMContext";
import { supabase } from "@/lib/supabaseClient";

interface CRMSearchProps {
  onClose?: () => void; // إضافة خاصية الإغلاق التلقائي كـ Prop اختياري
}

export default function CRMSearch({ onClose }: CRMSearchProps) {
  // 🌟 تلقيم دالة loadProjectData الفورية لشحن مواصفات التشطيب حياً من قاعدة البيانات
  const { setCRMData, loadProjectData } = useCRM();

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("customers")
        .select(`
          id,
          customer_code,
          name,
          mobile,
          phone,
          address,
          email,
          status,
          projects (
            id,
            project_code,
            project_name,
            location,
            unit_type,
            area,
            finishing_level,
            unit_status,
            receptions_count,
            rooms_count,
            bathrooms_count,
            kitchens_count,
            balconies_count,
            living_count,
            corridors_count,
            garden_exist,
            garden_area
          )
        `);

      if (error) throw error;

      const query = searchQuery.trim().toLowerCase();

      const filtered = (data || []).filter((cust: any) => {
        if (!query) return true;

        const matchName = cust.name?.toLowerCase().includes(query);
        const matchMobile = cust.mobile?.includes(query);
        const matchCode = cust.customer_code?.toLowerCase().includes(query);
        
        const matchProject = (cust.projects || []).some((proj: any) => 
          proj.project_name?.toLowerCase().includes(query) ||
          proj.project_code?.toLowerCase().includes(query)
        );

        return matchName || matchMobile || matchCode || matchProject;
      });

      const mappedResults: any[] = [];
      
      filtered.forEach((cust: any) => {
        const projects = cust.projects || [];
        
        if (projects.length > 0) {
          projects.forEach((proj: any) => {
            mappedResults.push({
              id: proj.id,
              customer: {
                customerCode: cust.customer_code,
                name: cust.name,
                mobile: cust.mobile,
                phone: cust.phone,
                address: cust.address,
                email: cust.email,
                status: cust.status
              },
              project: {
                projectCode: proj.project_code,
                projectName: proj.project_name,
                estimateNumber: "EST-1001", 
                estimateDate: new Date().toLocaleDateString("en-CA"),
                unitAddress: proj.location,
                unitType: proj.unit_type,
                area: Number(proj.area || 0),
                unitStatus: proj.unit_status,
                finishingLevel: proj.finishing_level,
                // تأمين وجلب العدادات من قاعدة البيانات بدقة تامة
                receptionsCount: Number(proj.receptions_count || 1),
                roomsCount: Number(proj.rooms_count || 2),
                bathroomsCount: Number(proj.bathrooms_count || 1),
                kitchensCount: Number(proj.kitchens_count || 1),
                balconiesCount: Number(proj.balconies_count || 1),
                livingCount: Number(proj.living_count || 1),
                corridorsCount: Number(proj.corridors_count || 0),
                gardenExist: !!proj.garden_exist,
                gardenArea: Number(proj.garden_area || 0)
              }
            });
          });
        } else {
          mappedResults.push({
            id: `no-project-${cust.id}`,
            customer: {
              customerCode: cust.customer_code,
              name: cust.name,
              mobile: cust.mobile,
              phone: cust.phone,
              address: cust.address,
              email: cust.email,
              status: cust.status
            },
            project: {
              projectCode: "قيد المتابعة",
              projectName: "لم يتم إنشاء مشروع بعد",
              estimateNumber: "EST-0000",
              estimateDate: "-",
              unitAddress: "غير محددة",
              unitType: "غير محددة",
              area: 0,
              unitStatus: "غير محددة",
              finishingLevel: "قيد المتابعة المبدئية",
              receptionsCount: 1,
              roomsCount: 2,
              bathroomsCount: 1,
              kitchensCount: 1,
              balconiesCount: 1,
              livingCount: 1,
              corridorsCount: 0,
              gardenExist: false,
              gardenArea: 0
            }
          });
        }
      });

      setResults(mappedResults);
    } catch (err: any) {
      console.error("Full Supabase Error Object:", JSON.stringify(err, null, 2));
      alert("حدث خطأ أثناء الاتصال بقاعدة البيانات: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // دالة الربط والشحن الفورية للـ Context ومواصفات الـ 14 تابة
  async function selectProject(projectItem: any) {
    setCRMData((prev: any) => ({
      ...prev,
      customer: {
        customerCode: projectItem.customer.customerCode,
        name: projectItem.customer.name,
        mobile: projectItem.customer.mobile,
        phone: projectItem.customer.phone,
        address: projectItem.customer.address,
        email: projectItem.customer.email,
        status: projectItem.customer.status
      },
      project: {
        id: projectItem.id,
        projectCode: projectItem.project.projectCode,
        projectName: projectItem.project.projectName,
        estimateNumber: projectItem.project.estimateNumber,
        estimateDate: projectItem.project.estimateDate,
        unitAddress: projectItem.project.unitAddress,
        unitType: projectItem.project.unitType,
        finishingLevel: projectItem.project.finishingLevel,
        area: projectItem.project.area,
        // 🌟 حل الخلل الأول: حقن عدادات الغرف السبعة والحديقة فورياً في الـ Context لمنع تصفيرها
        receptionsCount: projectItem.project.receptionsCount,
        roomsCount: projectItem.project.roomsCount,
        bathroomsCount: projectItem.project.bathroomsCount,
        kitchensCount: projectItem.project.kitchensCount,
        balconiesCount: projectItem.project.balconiesCount,
        livingCount: projectItem.project.livingCount,
        corridorsCount: projectItem.project.corridorsCount,
        gardenExist: projectItem.project.gardenExist,
        gardenArea: projectItem.project.gardenArea
      },
      finishing: prev.finishing || {} // حماية مسودة التشطيب الحالية
    }));

    // 🌟 حل الخلل الثاني: شحن وتحميل مواصفات الـ 14 تابة للتشطيبات الميدانية فورياً من السيرفر
    if (projectItem.id && !String(projectItem.id).startsWith("no-project") && loadProjectData) {
      await loadProjectData(projectItem.id);
    }

    // إغلاق المنبثقة تلقائياً فور اختيار العميل والمشروع بنجاح
    if (onClose) onClose();
  }

  return (
    <div dir="rtl" className="space-y-4 font-sans">
      
      <div className="bg-[#07132a] border border-[#1f2d4d] rounded-2xl p-6 shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-3">
            <label className="block text-[#F0E6D2] text-xs font-bold mb-2">ابحث باسم العميل أو ماركة المشروع أو هاتف الواتساب حياً:</label>
            <input
              type="text"
              placeholder="اكتب اسم العميل، رقم موبايل، أو عنوان الوحدة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#243556] text-white px-4 outline-none focus:border-[#D4AF37] text-xs font-bold transition"
            />
          </div>

          <div className="md:col-span-1">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-[#D4AF37] to-[#F0E6D2] text-black rounded-xl font-bold hover:scale-[1.01] active:scale-[0.99] cursor-pointer transition disabled:opacity-50 text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-[#D4AF37]/10"
            >
              {loading ? "جاري الاستعلام..." : "🔍 بدء البحث الشامل"}
            </button>
          </div>
        </div>
      </div>

      {results !== null && (
        <div className="bg-[#07132a] border border-[#1f2d4d] rounded-2xl overflow-hidden shadow-2xl transition-all duration-300">
          <div className="p-4 border-b border-[#243556] bg-[#0b1b3d]">
            <h3 className="text-[#F0E6D2] font-bold text-xs">نتائج التصفية المسترجعة من قاعدة البيانات ({results.length})</h3>
          </div>

          {results.length > 0 ? (
            <div className="overflow-x-auto max-h-60 overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#0b1d3d] text-[#F0E6D2]">
                    <th className="p-4 font-bold">كود العميل</th>
                    <th className="p-4 font-bold">كود المشروع</th>
                    <th className="p-4 font-bold">الاسم بالكامل</th>
                    <th className="p-4 font-bold">رقم الهاتف والواتساب</th>
                    <th className="p-4 font-bold">موقع ومواصفات شقة العميل</th>
                    <th className="p-4 font-bold text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#243556] text-white">
                  {results.map((item) => (
                    <tr key={item.id} className="hover:bg-[#0B1B38] text-sm">
                      <td className="p-4 font-mono text-[#F0E6D2] font-bold">{item.customer.customerCode}</td>
                      <td className="p-4 font-mono text-[#F0E6D2]">{item.project.projectCode}</td>
                      <td className="p-4 font-bold">{item.customer.name}</td>
                      <td className="p-4 font-mono text-xs">{item.customer.mobile}</td>
                      <td className="p-4 text-gray-300">{item.project.projectName} ({item.project.unitAddress})</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => selectProject(item)}
                          className="bg-gradient-to-r from-[#D4AF37] to-[#F0E6D2] text-black px-4 py-2 rounded-xl text-xs font-bold hover:scale-105 cursor-pointer transition shadow-md shadow-[#D4AF37]/10"
                        >
                          تحديد الملف والمواصفات 📂
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500 text-xs">
              لا توجد نتائج مطابقة لشروط البحث المدخلة بقاعدة البيانات.
            </div>
          )}
        </div>
      )}

    </div>
  );
}