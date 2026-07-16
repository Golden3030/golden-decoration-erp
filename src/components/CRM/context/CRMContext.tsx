"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode
} from "react";
import { supabase } from "@/lib/supabaseClient";

export const CRMContext = createContext<any>(null);

// 🌟 تصدير المخطط الفني الموحد للتشطيبات لمنع خطأ الاستيراد بشاشة الـ CRM
export const DEFAULT_FINISHING_SCHEMA = {
  electricity: {
    enabled: true,
    foundation: {
      wallHoses: "",
      floorHoses: "",
      electricalBoxes: "",
      wires: "",
      panel: "",
    },
    finishing: {
      switches: "",
      sockets: "",
      ledProfile: false,
      ledStrip: false,
      magneticTrack: false,
      cameras: false,
      smartHome: false,
    }
  },
  paint: {
    enabled: true,
    foundation: {
      wallSealer: "",
      ceilingSealer: "",
      wallPutty: "",
      ceilingPutty: "",
      primer: ""
    },
    finishing: {
      wallPaint: "",
      ceilingPaint: ""
    },
    decorations: "",
    other: "",
    notes: ""
  },
  plaster: {
    enabled: true,
    areas: {},
    areaProducts: {},
    repairs: "لا",
    repairDetails: "",
    notes: ""
  },
  plumbing: {
    enabled: true,
    pipes: "",
    brands: "",
    fixtures: "",
    notes: ""
  },
  flooring: {
    enabled: true,
    type: "",
    color: "",
    size: "",
    notes: ""
  },
  ceiling: {
    enabled: true,
    type: "",
    design: "",
    lighting: "",
    notes: ""
  },
  doors: {
    enabled: true,
    type: "",
    material: "",
    color: "",
    notes: ""
  },
  aluminum: {
    enabled: true,
    type: "",
    glass: "",
    color: "",
    notes: ""
  },
  ac: {
    enabled: true,
    foundation1: "",
    foundation2: "",
    notes: ""
  },
  decorations: {
    enabled: true,
    items: [
      { name: "مكتبة تلفزيون", enabled: false, location: "" },
      { name: "كرانيش مضيئة", enabled: false, location: "" },
      { name: "كرانيش فيوتك", enabled: false, location: "" },
      { name: "تجاليد", enabled: false, location: "" },
      { name: "خلفية سرير", enabled: false, location: "" },
      { name: "مرايا ديكورية", enabled: false, location: "" },
      { name: "بانوهات", enabled: false, location: "" },
      { name: "أخرى", enabled: false, location: "" }
    ],
    notes: ""
  },
  areas: {
    rooms: "",
    distribution: "",
    notes: ""
  },
};

export function CRMProvider({
  children
}:{
  children: ReactNode
}) {

  const [crmData, setCRMData] = useState({
    activeTab: "المحارة",
    customer: {
      customerCode: "",
      name: "",
      mobile: "",
      phone: "",
      status: "",
    },
    project: {
      id: "", 
      projectCode: "", 
      projectName: "", 
      estimateNumber: "",
      estimateDate: "",
      unitAddress: "",
      unitType: "",
      area: 0,
      finishingLevel: "",
      workflow_stage: "",
      receptionsCount: 1,
      roomsCount: 2,
      bathroomsCount: 1,
      kitchensCount: 1,
      balconiesCount: 1, // 👈 تم معايرتها لتعمل بالتناظر القياسي السنامي
      livingCount: 1,
      corridorsCount: 0,
      gardenExist: false,
      gardenArea: 0
    },
    finishing: JSON.parse(JSON.stringify(DEFAULT_FINISHING_SCHEMA)),
    estimate: {
      number: "EST-0001",
      date: "",
      status: "مبدئية",
      materialsCost: 0,
      laborCost: 0,
      engineeringPercentage: 15,
      engineeringValue: 0,
      total: 0,
      items: [
        { name: "تعديل معماري", description: "أعمال التعديل المعماري", materials: 0, labor: 0 },
        { name: "المحارة", description: "أعمال المحارة ", materials: 0, labor: 0 },
        { name: "الدهانات", description: "خامات تأسيس وتشطيب الدهانات", materials: 0, labor: 0 },
        { name: "الأرضيات", description: "تركيب الأرضيات", materials: 0, labor: 0 },
        { name: "السقف المعلق", description: "أعمال الجبس والأسقف المعلقة", materials: 0, labor: 0 },
        { name: "الأبواب", description: "توريد وتركيب الأبواب", materials: 0, labor: 0 },
        { name: "الشبابيك", description: "أعمال الألوميتال والزجاج", materials: 0, labor: 0 },
        { name: "الكهرباء", description: "تأسيس وتشطيب الكهرباء", materials: 0, labor: 0 },
        { name: "السباكة", description: "تأسيس وتشطيب السباكة", materials: 0, labor: 0 },
        { name: "التكييف", description: "تأسيس التكييف", materials: 0, labor: 0 },
        { name: "الديكورات", field: "decorations", description: "الديكورات الخاصة بالوحدة" }
      ]
    }
  });

  // تحديد قفل التعديل بروتوكولياً (Locked state) لمنع الانهيار البرمجي
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // دالة مزامنة وسحب مواصفات التشطيب لـ 14 تابة من قاعدة البيانات لربط المشروع حياً
  async function loadProjectData(projectId: string) {
    if (!projectId || projectId.startsWith("new") || projectId.startsWith("d19b7d8d")) return;
    try {
      const { data: specs, error } = await supabase
        .from("finishing_specs")
        .select("*")
        .eq("project_id", projectId);

      if (error) throw error;

      if (specs && specs.length > 0) {
        const loadedFinishing = JSON.parse(JSON.stringify(DEFAULT_FINISHING_SCHEMA));
        specs.forEach((spec: any) => {
          try {
            if (spec.category && loadedFinishing[spec.category]) {
              loadedFinishing[spec.category] = JSON.parse(spec.value);
            }
          } catch (e) {
            console.error("Error parsing spec json value:", e);
          }
        });

        setCRMData((prev: any) => ({
          ...prev,
          finishing: loadedFinishing
        }));
      }
    } catch (e) {
      console.error("Error loading project specs inside CRMContext:", e);
    }
  }

  // دالة الحفظ السحابي المؤقت والتخزين للأرباح والمقايسات الجارية
  async function saveEstimateSnapshot(items: any[], total: number) {
    console.log("🛠️ Saving estimate snapshot into Context state:", items, total);
  }

  // دالة تحديث الخيارات وتأصيل مزامنتها تلقائياً مع السحابة
  function updateBulkFinishingSection(categoryKey: string, sectionData: any) {
    setCRMData((prev: any) => {
      const nextState = {
        ...prev,
        finishing: {
          ...prev.finishing,
          [categoryKey]: {
            ...(prev.finishing[categoryKey] || {}),
            ...sectionData
          }
        }
      };

      const projectId = prev.project?.id;
      if (projectId && projectId.trim() !== "" && !projectId.startsWith("d19b7d8d") && !projectId.startsWith("new")) {
        supabase
          .from("finishing_specs")
          .delete()
          .eq("project_id", projectId)
          .eq("category", categoryKey)
          .then(({ error: delError }) => {
            if (delError) {
              console.error("خطأ مسح القيمة القديمة للمواصفات التلقائية:", delError);
              return;
            }

            supabase
              .from("finishing_specs")
              .insert({
                project_id: projectId,
                category: categoryKey,
                item: "spec_data",
                value: JSON.stringify(sectionData),
                notes: sectionData.notes || ""
              })
              .then(({ error: insError }) => {
                if (insError) {
                  console.error("خطأ إدراج المواصفة التلقائية الحية:", insError);
                }
              });
          });
      }

      return nextState;
    });
  }

  // دالة مسح وإفراغ مواصفات المشروع عند رغبة العميل بالإلغاء
  async function clearFinishingSpecs() {
    const projectId = crmData.project?.id;
    if (projectId && projectId.trim() !== "" && !projectId.startsWith("new")) {
      const { error } = await supabase
        .from("finishing_specs")
        .delete()
        .eq("project_id", projectId);
      
      if (error) {
        console.error("خطأ أثناء مسح بيانات المواصفات الفنية:", error);
        return false;
      }
    }

    setCRMData((prev: any) => ({
      ...prev,
      finishing: JSON.parse(JSON.stringify(DEFAULT_FINISHING_SCHEMA))
    }));
    return true;
  }

  function updateEstimate(data: any) {
    setCRMData((prev: any) => ({
      ...prev,
      estimate: {
        ...prev.estimate,
        ...data
      }
    }));
  }

  return (
    <CRMContext.Provider
      value={{
        crmData,
        setCRMData,
        isLocked,
        setIsLocked,
        loadProjectData,
        saveEstimateSnapshot,
        updateBulkFinishingSection,
        updateEstimate,
        clearFinishingSpecs
      }}
    >
      {children}
    </CRMContext.Provider>
  );
}

export function useCRM(){
  return useContext(CRMContext);
}