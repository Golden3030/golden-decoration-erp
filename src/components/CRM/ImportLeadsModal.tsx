"use client";

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Sparkles, Check, RefreshCw, FolderCheck } from "lucide-react";

interface ImportLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export default function ImportLeadsModal({ isOpen, onClose, onImportSuccess }: ImportLeadsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [mapping, setMapping] = useState({
    name: "",
    mobile: "",
    email: "",
    address: "",
  });
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: رفع الملف، 2: مطابقة الأعمدة، 3: التقرير النهائي
  const [loading, setLoading] = useState(false);
  
  const [report, setReport] = useState({
    total: 0,
    imported: 0,
    duplicates: 0,
    failed: 0,
  });

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          alert("الملف فارغ أو لا يحتوي على صفوف بيانات كافية.");
          setLoading(false);
          return;
        }

        const sheetHeaders = jsonData[0].map((h: any) => String(h || "").trim());
        const dataRows = jsonData.slice(1).map((row: any) => {
          const rowObj: any = {};
          sheetHeaders.forEach((header: string, index: number) => {
            rowObj[header] = row[index];
          });
          return rowObj;
        });

        setHeaders(sheetHeaders);
        setRawData(dataRows);

        const autoMapping = { name: "", mobile: "", email: "", address: "" };
        
        sheetHeaders.forEach((h: string) => {
          const lower = h.toLowerCase();
          if (lower.includes("اسم") || lower.includes("name") || lower.includes("العميل")) {
            autoMapping.name = h;
          } else if (
            lower.includes("هاتف") || 
            lower.includes("تليفون") || 
            lower.includes("موبايل") || 
            lower.includes("phone") || 
            lower.includes("mobile") || 
            lower.includes("رقم")
          ) {
            autoMapping.mobile = h;
          } else if (lower.includes("بريد") || lower.includes("ايميل") || lower.includes("email") || lower.includes("mail")) {
            autoMapping.email = h;
          } else if (lower.includes("عنوان") || lower.includes("address") || lower.includes("مكان")) {
            autoMapping.address = h;
          }
        });

        setMapping(autoMapping);
        setStep(2); 
      } catch (error) {
        console.error("Error reading Excel file:", error);
        alert("فشل قراءة الملف. يرجى التأكد من أنه ملف إكسيل سليم.");
      } finally {
        setLoading(false);
      }
    };

    reader.readAsBinaryString(selectedFile);
  };

  const handleSaveImport = async () => {
    if (!mapping.name || !mapping.mobile) {
      alert("يجب مطابقة حقل (الاسم) وحقل (رقم الهاتف) كحد أدنى للاستيراد.");
      return;
    }

    setLoading(true);

    try {
      const { data: salesAgents, error: agentsError } = await supabase
        .from("users")
        .select("id")
        .eq("role", "sales");

      if (agentsError) throw agentsError;

      const agentsCount = salesAgents ? salesAgents.length : 0;

      const validRows = rawData.filter(row => {
        const nameVal = String(row[mapping.name] || "").trim();
        const mobileVal = String(row[mapping.mobile] || "").trim();
        return nameVal.length > 0 && mobileVal.length > 0;
      });

      const totalRows = validRows.length;
      if (totalRows === 0) {
        alert("لا توجد صفوف تحتوي على اسم ورقم هاتف صالحين للاستيراد.");
        setLoading(false);
        return;
      }

      // تجهيز مصفوفة الهواتف وفحص المكرر
      const rawMobiles = validRows.map(row => {
        let mobile = String(row[mapping.mobile] || "").trim();
        
        // 🌟 مطهر أرقام الجوال المصرية: إعادة الصفر الأيسر المفقود تلقائياً بسبب الإكسيل لتفادي تدمير روابط الواتساب والـ Validation
        if (mobile.length === 10 && (mobile.startsWith("10") || mobile.startsWith("11") || mobile.startsWith("12") || mobile.startsWith("15"))) {
          mobile = "0" + mobile;
        }
        return mobile;
      });

      const excelMobiles = Array.from(new Set(rawMobiles));

      const { data: existingCustomers, error: fetchError } = await supabase
        .from("customers")
        .select("mobile")
        .in("mobile", excelMobiles);

      if (fetchError) throw fetchError;

      const existingMobileSet = new Set((existingCustomers || []).map(c => String(c.mobile || "").trim()));

      const finalToInsert: any[] = [];
      let duplicateCount = 0;

      validRows.forEach((row, idx) => {
        let mobile = String(row[mapping.mobile] || "").trim();
        
        // إعادة معالجة الأرقام قبل التخزين النهائي
        if (mobile.length === 10 && (mobile.startsWith("10") || mobile.startsWith("11") || mobile.startsWith("12") || mobile.startsWith("15"))) {
          mobile = "0" + mobile;
        }

        const name = String(row[mapping.name] || "").trim();
        const email = mapping.email ? String(row[mapping.email] || "").trim() : "";
        const address = mapping.address ? String(row[mapping.address] || "").trim() : "";

        if (existingMobileSet.has(mobile)) {
          duplicateCount++;
        } else {
          existingMobileSet.add(mobile);
          
          let assignedTo = null;
          if (agentsCount > 0) {
            assignedTo = salesAgents[idx % agentsCount].id;
          }

          finalToInsert.push({
            name: name,
            mobile: mobile,
            email: email,
            address: address,
            status: "جديد",
            customer_code: `CUST-${Date.now().toString().slice(-6)}-${idx}`,
            assigned_to: assignedTo, 
            created_at: new Date().toISOString(),
            // 🌟 ربط عمود date وتلقيمه بتاريخ اليوم الحالي تلقائياً لحسم مشكلة "تاريخ غير متوفر" في شاشات المبيعات
            date: new Date().toISOString().split("T")[0]
          });
        }
      });

      if (finalToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("customers")
          .insert(finalToInsert);

        if (insertError) throw insertError;

        await supabase.from("notifications").insert({
          title: "استيراد وتوزيع مبيعات تلقائي",
          message: `📊 تم استيراد عدد (${finalToInsert.length}) عملاء جدد وتوزيعهم بالتساوي والتحكم الدائري على موظفي المبيعات الحاليين.`,
          type: "sales",
          link: "/customers"
        });
      }

      setReport({
        total: rawData.length,
        imported: finalToInsert.length,
        duplicates: duplicateCount,
        failed: rawData.length - (finalToInsert.length + duplicateCount),
      });

      setStep(3); 
      onImportSuccess();
    } catch (err: any) {
      console.error("Database Import Error:", err);
      alert("حدث خطأ أثناء حفظ البيانات بقاعدة البيانات: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setHeaders([]);
    setRawData([]);
    setMapping({ name: "", mobile: "", email: "", address: "" });
    setStep(1);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md" dir="rtl">
      <div className="bg-[#07132a] border-2 border-[#D4AF37] rounded-[2rem] w-full max-w-xl overflow-hidden shadow-2xl transition-all relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
        
        <div className="border-b border-[#D4AF37]/15 p-5 flex justify-between items-center bg-[#050914]/90 select-none">
          <h3 className="text-[#D4AF37] text-md md:text-base font-black flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-[#D4AF37] animate-pulse" />
            <span>استيراد وتوزيع عملاء المبيعات التلقائي (Excel)</span>
          </h3>
          <button 
            type="button"
            onClick={() => { resetModal(); onClose(); }}
            className="w-8 h-8 rounded-lg bg-red-950/40 border border-red-500/30 hover:bg-red-600 transition flex items-center justify-center font-black cursor-pointer text-white shadow-md text-sm select-none"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6 font-semibold text-xs text-[#F0E6D2]">
          
          {step === 1 && (
            <div className="space-y-4 text-center">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#D4AF37]/30 hover:border-[#D4AF37] rounded-2xl p-10 cursor-pointer bg-[#020B1C] transition duration-300 shadow-inner flex flex-col items-center justify-center"
              >
                <div className="text-4xl mb-3 animate-pulse">📥</div>
                <p className="text-white text-sm font-black">اسحب ملف الإكسيل هنا أو اضغط للتصفح</p>
                <p className="text-gray-500 text-[10px] mt-2">يدعم صيغ .xlsx و .xls و .csv الناتجة من منصات المبيعات والشركات</p>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls, .csv" 
                  className="hidden" 
                />
              </div>
              {loading && <p className="text-[#D4AF37] text-xs font-bold animate-pulse">جاري جلب قائمة المبيعات وإعداد التوزيع التناوبي...</p>}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 text-right">
              <div className="bg-[#020B1C]/80 p-4 rounded-xl border border-[#D4AF37]/20 shadow-inner">
                <p className="text-[#D4AF37] text-xs font-bold mb-1">💡 نظام التوزيع الدائري والربط (Round-Robin):</p>
                <p className="text-gray-400 text-[10px] leading-relaxed">سيقوم النظام تلقائياً بربط وتوزيع العملاء الجدد بالتساوي على كافة موظفي المبيعات النشطين المسجلين بقاعدة البيانات لضمان العدالة وتكافؤ فرص المتابعة.</p>
              </div>

              <div className="space-y-3 font-semibold text-xs md:text-sm">
                <div className="flex items-center justify-between gap-4">
                  <label className="text-white text-xs font-black w-1/3">اسم العميل (مطلوب):</label>
                  <select
                    value={mapping.name}
                    onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                    className="flex-1 h-11 bg-[#020B1C] border border-[#D4AF37]/20 rounded-xl px-3 text-xs text-[#D4AF37] font-bold outline-none cursor-pointer focus:border-[#D4AF37]"
                  >
                    <option value="">-- اختر العمود من الإكسيل --</option>
                    {headers.map((h: string) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <label className="text-white text-xs font-black w-1/3">رقم الهاتف (مطلوب):</label>
                  <select
                    value={mapping.mobile}
                    onChange={(e) => setMapping({ ...mapping, mobile: e.target.value })}
                    className="flex-1 h-11 bg-[#020B1C] border border-[#D4AF37]/20 rounded-xl px-3 text-xs text-[#D4AF37] font-bold outline-none cursor-pointer focus:border-[#D4AF37]"
                  >
                    <option value="">-- اختر العمود من الإكسيل --</option>
                    {headers.map((h: string) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <label className="text-gray-300 text-xs w-1/3">البريد الإلكتروني (اختياري):</label>
                  <select
                    value={mapping.email}
                    onChange={(e) => setMapping({ ...mapping, email: e.target.value })}
                    className="flex-1 h-11 bg-[#020B1C] border border-[#D4AF37]/20 rounded-xl px-3 text-xs text-[#D4AF37] font-bold outline-none cursor-pointer focus:border-[#D4AF37]"
                  >
                    <option value="">-- اختر العمود من الإكسيل --</option>
                    {headers.map((h: string) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <label className="text-gray-300 text-xs w-1/3">العنوان / المنطقة (اختياري):</label>
                  <select
                    value={mapping.address}
                    onChange={(e) => setMapping({ ...mapping, address: e.target.value })}
                    className="flex-1 h-11 bg-[#020B1C] border border-[#D4AF37]/20 rounded-xl px-3 text-xs text-[#D4AF37] font-bold outline-none cursor-pointer focus:border-[#D4AF37]"
                  >
                    <option value="">-- اختر العمود من الإكسيل --</option>
                    {headers.map((h: string) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#243556] select-none">
                <button
                  type="button"
                  onClick={resetModal}
                  className="px-6 h-11 rounded-xl bg-transparent border border-red-500/40 text-red-500 hover:bg-red-500/10 active:scale-95 transition-all text-xs font-black cursor-pointer"
                >
                  إلغاء الملف المرفوع
                </button>
                {/* 🌟 زر الحفظ الإمبراطوري بالتصميم البصري المتوهج ذو الـ Bottom Glow */}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleSaveImport(); }}
                  disabled={loading}
                  className="px-6 h-11 rounded-xl bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.03] active:scale-95 transition-all duration-300 cursor-pointer text-xs font-black flex items-center justify-center gap-1.5 select-none relative overflow-hidden disabled:opacity-50"
                >
                  {loading ? "جاري التوزيع والحفظ..." : "💾 حفظ وتوزيع الدفعة "}
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-4xl mb-2 animate-bounce">🎉</div>
                <h4 className="text-white font-black text-base">تم استيراد وتوزيع العملاء بنجاح!</h4>
                <p className="text-gray-400 text-xs mt-1">توضح الأرقام التالية نتائج عملية التصفية والتوزيع الحصري على حسابات الموظفين بالتساوي:</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#020B1C] border border-[#D4AF37]/15 rounded-xl p-4 text-center shadow-inner">
                  <p className="text-gray-500 text-[10px] font-bold">إجمالي العملاء بالملف</p>
                  <p className="text-white text-base font-black mt-1 font-mono">{report.total}</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center shadow-inner">
                  <p className="text-emerald-500 text-[10px] font-bold">تم استيرادهم وتوزيعهم بالتساوي</p>
                  <p className="text-emerald-400 text-base font-black mt-1 font-mono">+{report.imported}</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center shadow-inner">
                  <p className="text-amber-500 text-[10px] font-bold">مكررون (محجوبون تلقائياً)</p>
                  <p className="text-amber-400 text-base font-black mt-1 font-mono">{report.duplicates}</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center shadow-inner">
                  <p className="text-red-500 text-[10px] font-bold">صفوف تفتقر للاسم أو الهاتف</p>
                  <p className="text-red-400 text-base font-black mt-1 font-mono">{report.failed}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { resetModal(); onClose(); }}
                className="w-full bg-[#D4AF37] hover:bg-[#F0E6D2] text-[#020B1C] font-black py-2.5 rounded-xl transition cursor-pointer active:scale-95 text-xs text-center block shadow-lg hover:shadow-[0_0_12px_rgba(212,175,55,0.3)]"
              >
                إنهاء وإغلاق النافذة
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}