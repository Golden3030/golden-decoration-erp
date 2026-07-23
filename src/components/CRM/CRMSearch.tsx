"use client";

import React, { useState } from "react";
import { useCRM } from "@/components/CRM/context/CRMContext";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Sparkles, Check, RefreshCw } from "lucide-react";

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
    <div dir="rtl" className="space-y-4 font-sans text-[#F0E6D2] text-right">
      
      {/* 🛠️ جدار الحماية البصري الموحد وتنسيق شريط التمرير المذهب وحظر التداخل بـ whitespace-nowrap و min-w-[850px] بالجدول لمنع القص والتقاطع كلياً */}
      <style dangerouslySetInnerHTML={{__html: `
        /* تفعيل وإظهار شريط التمرير الأفقي والرأسي لجداول البحث بألوان ذهبية فاخرة */
        ::-webkit-scrollbar { 
          width: 6px !important; 
          height: 6px !important; 
          display: block !important;
        }
        ::-webkit-scrollbar-track { 
          background: #020B1C !important; 
        }
        ::-webkit-scrollbar-thumb { 
          background: #D4AF37 !important; 
          border-radius: 9999px !important; 
        }
        ::-webkit-scrollbar-thumb:hover { 
          background: #AA7C11 !important; 
        }

        /* إلغاء أكواد الإخفاء لضمان انسيابية التمرير بالماوس والجوال */
        .overflow-x-auto { 
          scrollbar-width: thin !important; 
          -ms-overflow-style: auto !important; 
          overflow-x: auto !important; 
        }

        /* عزل تلوين وأوزان خلايا جدول البحث ومنع تسريب الـ CSS للسايدبار */
        .premium-crm-search-table thead th {
          font-size: 0.75rem !important;
          font-weight: 500 !important;
          color: #D4AF37 !important;
          text-align: right !important;
          background-color: #000000 !important;
          border-bottom: 2px solid rgba(212, 175, 55, 0.3) !important;
          padding: 14px 16px !important;
          letter-spacing: normal !important;
        }

        .premium-crm-search-table tbody td {
          font-size: 0.8rem !important;
          font-weight: 400 !important;
          color: #F0E6D2 !important;
          text-align: right !important;
          border-bottom: 1px solid rgba(212, 175, 55, 0.1) !important;
          padding: 14px 16px !important;
          letter-spacing: normal !important;
        }

        .premium-crm-search-table tbody tr:hover {
          background-color: rgba(7, 19, 42, 0.8) !important;
        }
      `}} />

      <div className="bg-[#07132a] border-2 border-[#D4AF37]/20 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end font-semibold text-xs md:text-sm">
          <div className="md:col-span-3">
            <label className="block text-[#D4AF37] text-xs font-bold mb-2 select-none">ابحث باسم العميل أو ماركة المشروع أو هاتف الواتساب حياً:</label>
            <input
              type="text"
              placeholder="اكتب اسم العميل، رقم موبايل، أو عنوان الوحدة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 rounded-xl bg-[#020B1C] border border-[#D4AF37]/20 text-white px-4 outline-none focus:border-[#D4AF37] text-xs font-bold transition placeholder-slate-600"
            />
          </div>

          {/* 🌟 زر البحث الإمبراطوري بالتصميم البصري المتوهج ذو الـ Bottom Glow */}
          <div className="md:col-span-1">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full h-12 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.01] active:scale-95 transition-all duration-300 cursor-pointer text-xs font-black flex items-center justify-center gap-1.5 select-none relative overflow-hidden disabled:opacity-50"
            >
              {loading ? "جاري الاستعلام..." : "🔍 بدء البحث الشامل"}
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
            </button>
          </div>
        </div>
      </div>

      {results !== null && (
        <div className="bg-[#07132a] border-2 border-[#D4AF37]/20 rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-300">
          <div className="p-4 border-b border-[#D4AF37]/20 bg-[#0b1b3d]">
            <h3 className="text-[#D4AF37] font-bold text-xs select-none">نتائج التصفية المسترجعة من قاعدة البيانات ({results.length})</h3>
          </div>

          {results.length > 0 ? (
            /* تفعيل جدار التمرير المذهب وحظر التداخل بـ whitespace-nowrap و min-w-[850px] بالجدول لمنع القص والتقاطع كلياً */
            <div className="overflow-x-auto max-h-60 overflow-y-auto pr-1">
              <table className="w-full text-right table-auto min-w-[850px] premium-crm-search-table">
                <thead>
                  <tr className="whitespace-nowrap select-none">
                    <th>كود العميل</th>
                    <th>كود المشروع</th>
                    <th>الاسم بالكامل</th>
                    <th>رقم الهاتف والواتساب</th>
                    <th>موقع ومواصفات شقة العميل</th>
                    <th className="text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((item) => (
                    <tr key={item.id} className="whitespace-nowrap">
                      <td className="font-mono text-[#D4AF37] font-bold">{item.customer.customerCode}</td>
                      <td className="font-mono text-[#F0E6D2]">{item.project.projectCode}</td>
                      <td className="font-bold text-[#F0E6D2]">{item.customer.name}</td>
                      <td className="font-mono text-[#F0E6D2]/80 text-xs">{item.customer.mobile}</td>
                      <td className="text-gray-300 text-xs">{item.project.projectName} ({item.project.unitAddress})</td>
                      <td className="text-center select-none">
                        {/* زر تحديد الملف بالبكسل متناسق مع الأزرار الصغيرة الرشيقة */}
                        <button
                          onClick={() => selectProject(item)}
                          className="rounded-lg bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.15)] hover:shadow-[0_0_20px_rgba(212,175,55,0.35)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer text-xs font-bold px-4 py-2 flex items-center justify-center gap-1 relative overflow-hidden"
                        >
                          <span>تحديد الملف والمواصفات 📂</span>
                          <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_4px_rgba(212,175,55,0.8)]" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500 text-xs font-bold select-none">
              لا توجد نتائج مطابقة لشروط البحث المدخلة بقاعدة البيانات.
            </div>
          )}
        </div>
      )}

    </div>
  );
}