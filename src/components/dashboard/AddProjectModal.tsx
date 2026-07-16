"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AddProjectModal({ onClose }: { onClose: () => void }) {
  const [customers, setCustomers] = useState<any[]>([]); // قائمة العملاء للربط
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [location, setLocation] = useState("");
  const [unitType, setUnitType] = useState("شقة");
  const [area, setArea] = useState<number | "">("");
  const [finishingLevel, setFinishingLevel] = useState("متوسط (سوبر لوكس )");
  const [unitStatus, setUnitStatus] = useState("بدون تشطيب (طوب احمر)");
  
  const [receptionsCount, setReceptionsCount] = useState(0);
  const [roomsCount, setRoomsCount] = useState(0);
  const [bathroomsCount, setBathroomsCount] = useState(0);
  const [kitchensCount, setKitchensCount] = useState(0);
  const [balconiesCount, setBalconiesCount] = useState(0);

  const [loading, setLoading] = useState(false);

  // جلب العملاء المسجلين لربط المشروع بأحدهما
  useEffect(() => {
    async function loadCustomers() {
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("id, name, customer_code")
          .order("name", { ascending: true });

        if (error) throw error;
        setCustomers(data || []);
      } catch (err: any) {
        console.error("Error loading customers list:", err);
      } finally {
        setLoadingCustomers(false);
      }
    }

    loadCustomers();
  }, []);

  // وظيفة حفظ المشروع الجديد الموصول بالعميل وتوليد كود المشروع تلقائياً
  async function handleSave() {
    if (!selectedCustomerId || !projectName) {
      alert("يرجى ملء الحقول الإلزامية (اختيار العميل، اسم المشروع).");
      return;
    }

    setLoading(true);

    try {
      // توليد كود مشروع عشوائي فريد تلقائياً (مثال: P-8492)
      const generatedProjectCode = "P-" + Math.floor(1000 + Math.random() * 9000);

      const { error } = await supabase
        .from("projects")
        .insert({
          customer_id: selectedCustomerId,
          project_code: generatedProjectCode, // شحن كود المشروع المولد تلقائياً
          project_name: projectName,
          location: location || null,
          unit_type: unitType,
          area: Number(area || 0),
          finishing_level: finishingLevel,
          unit_status: unitStatus,
          status: "pending",
          receptions_count: receptionsCount,
          rooms_count: roomsCount,
          bathrooms_count: bathroomsCount,
          kitchens_count: kitchensCount,
          balconies_count: balconiesCount
        });

      if (error) throw error;

      alert(`✅ تم تسجيل وحفظ المشروع الجديد بنجاح بكود: ${generatedProjectCode}`);
      onClose();
    } catch (err: any) {
      console.error("Save Project Error:", err);
      alert("حدث خطأ أثناء حفظ المشروع: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300">
      
      {/* زيادة الهوامش والبادنج والخطوط بالكامل لسهولة الاستخدام */}
      <div className="bg-[#07132a] border border-[#F0E6D2] rounded-2xl p-8 w-full max-w-2xl text-right relative mx-4 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
        
        <div className="border-b border-[#243556] pb-4 flex justify-between items-center">
          <h2 className="text-[#F0E6D2] text-2xl font-bold">إضافة مشروع جديد</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white font-bold text-2xl cursor-pointer">✕</button>
        </div>

        {/* تنبيه بتوليد كود المشروع تلقائياً */}
        <div className="bg-[#152542] rounded-xl p-3 border border-[#1f2d4d] text-center">
          <p className="text-[#F0E6D2] text-sm">💡 ملاحظة: سيقوم النظام بتوليد كود المشروع تلقائياً عند الضغط على حفظ.</p>
        </div>

        {/* اختيار العميل التفاعلي المسحوب من قاعدة البيانات */}
        <div>
          <label className="block text-white text-sm mb-2 font-bold text-[#D4AF37]">اختر العميل المرتبط بالمشروع *</label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            disabled={loadingCustomers}
            className="w-full h-12 text-base rounded-xl bg-[#020B1C] border border-[#243556] text-white px-3 outline-none"
          >
            <option value="">{loadingCustomers ? "جاري جلب العملاء..." : "اختر العميل من القائمة..."}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.customer_code})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-white text-sm mb-2 font-bold">اسم المشروع *</label>
            <input
              type="text"
              placeholder="مثال: شقة المهندسين"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full h-12 text-base rounded-xl bg-[#020B1C] border border-[#243556] text-white px-4 outline-none focus:border-[#F0E6D2]"
            />
          </div>

          <div>
            <label className="block text-white text-sm mb-2 font-bold">نوع الوحدة</label>
            <select
              value={unitType}
              onChange={(e) => setUnitType(e.target.value)}
              className="w-full h-12 text-base rounded-xl bg-[#020B1C] border border-[#243556] text-white px-3 outline-none"
            >
              <option>شقة</option>
              <option>دوبلكس</option>
              <option>فيلا</option>
              <option>مكتب</option>
              <option>محل</option>
            </select>
          </div>
          <div>
            <label className="block text-white text-sm mb-2 font-bold">المساحة (م²)</label>
            <input
              type="number"
              placeholder="المساحة بالمتر"
              value={area}
              onChange={(e) => setArea(Number(e.target.value) || "")}
              className="w-full h-12 text-base rounded-xl bg-[#020B1C] border border-[#243556] text-white px-4 outline-none focus:border-[#F0E6D2]"
            />
          </div>
          <div>
            <label className="block text-white text-sm mb-2 font-bold">حالة الوحدة</label>
            <select
              value={unitStatus}
              onChange={(e) => setUnitStatus(e.target.value)}
              className="w-full h-12 text-base rounded-xl bg-[#020B1C] border border-[#243556] text-white px-3 outline-none"
            >
              <option>بدون تشطيب (طوب احمر)</option>
              <option>نصف تشطيب (محارة)</option>
              <option>تجديد</option>
            </select>
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-white text-sm mb-2 font-bold">مستوى التشطيب</label>
            <select
              value={finishingLevel}
              onChange={(e) => setFinishingLevel(e.target.value)}
              className="w-full h-12 text-base rounded-xl bg-[#020B1C] border border-[#243556] text-white px-3 outline-none"
            >
              <option>اقتصادى (لوكس)</option>
              <option>متوسط (سوبر لوكس )</option>
              <option>فاخر (الترا لوكس)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-white text-sm mb-2 font-bold">عنوان الوحدة بالتفصيل</label>
          <input
            type="text"
            placeholder="مثال: عمارة 15 الشارع الخامس، التجمع"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full h-12 text-base rounded-xl bg-[#020B1C] border border-[#243556] text-white px-4 outline-none focus:border-[#F0E6D2]"
          />
        </div>

        {/* تم تحديث المسميات لتطابق كودك المالي بدقة (عدد الريسبشن، عدد الغرف... إلخ) */}
        <div className="grid grid-cols-5 gap-3 pt-3 border-t border-[#243556]">
          {[
            { label: "عدد الريسبشن", val: receptionsCount, set: setReceptionsCount },
            { label: "عدد الغرف", val: roomsCount, set: setRoomsCount },
            { label: "عدد الحمامات", val: bathroomsCount, set: setBathroomsCount },
            { label: "عدد المطابخ", val: kitchensCount, set: setKitchensCount },
            { label: "عدد البلكونات", val: balconiesCount, set: setBalconiesCount }
          ].map((item) => (
            <div key={item.label}>
              <label className="block text-white text-[11px] mb-2 font-bold text-center">{item.label}</label>
              <input
                type="number"
                min="0"
                value={item.val}
                onChange={(e) => item.set(Number(e.target.value) || 0)}
                className="w-full h-11 rounded-lg bg-[#020B1C] border border-[#243556] text-white text-center outline-none text-base"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-4 pt-5 border-t border-[#243556]">
          <button
            onClick={onClose}
            className="bg-transparent border border-[#243556] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#152542] cursor-pointer transition duration-150 text-base"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-[#c9a227] text-black px-8 py-3 rounded-xl font-bold hover:bg-[#F0E6D2] cursor-pointer transition duration-150 disabled:opacity-50 text-base"
          >
            {loading ? "جاري الحفظ..." : "💾 حفظ وتسجيل المشروع"}
          </button>
        </div>

      </div>

    </div>
  );
}