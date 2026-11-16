"use client";

import { useState } from "react";
import SalesResult from "./SalesResult";
import { fetchAiJson } from "@/lib/fetchAi";
import GoldButton from "@/components/ui/GoldButton";
import { isOnline } from "@/lib/offline-sync"; // استيراد مستشعر الشبكة المعتمد

export default function SalesChat() {
  const [message, setMessage] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [planImage, setPlanImage] = useState<string | null>(null);

  function handlePlanUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPlanImage(reader.result as string); 
    };
    reader.readAsDataURL(file);
  }

  async function handleAnalyze() {
    // جدار الأمان: منع إرسال الطلب أوفلاين كلياً لعدم استقرار سيرفرات الذكاء الفوري دون شبكة
    if (!isOnline()) {
      alert("عذراً، تطلب استشارة ومراسلة مساعد المبيعات الذكي اتصالاً نشطاً بالإنترنت.");
      return;
    }

    if (!message.trim() && !planImage) {
      alert("يرجى كتابة طلب العميل أو إرفاق مخطط الشقة أولاً لتحليله.");
      return;
    }

    setLoading(true);
    setShowResult(false);

    try {
      const data = await fetchAiJson("/api/ai/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message, imageBase64: planImage })
      });

      // لو الذكاء الاصطناعي لم يجد مساحة الشقة في الطلب، لا نعرض أي أرقام
      const est = data.estimate;
      if (!est) {
        alert(data.response || "لم أتمكن من تحديد مساحة الشقة من الطلب.");
        return;
      }

      setAnalysisData({
        area: est.area,
        level: est.levelLabel,
        dbLevel: est.dbLevel,
        levelSpecified: est.levelSpecified,
        minCost: est.minCost,
        maxCost: est.maxCost,
        minDays: est.minDays,
        maxDays: est.maxDays,
        options: est.options,
        counts: est.counts,
        location: est.location,
        aiText: data.response
      });

      setShowResult(true);
    } catch (err: any) {
      console.error("AI Sales Error Detailed:", err);
      alert("حدث خطأ أثناء تحليل الطلب بالذكاء الاصطناعي: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" className="bg-[#07132a] border border-[#F0E6D2] rounded-xl p-6 text-white space-y-4 animate-fade-in">
      <h2 className="text-2xl font-bold text-[#D4AF37] mb-1">
        مساعد المبيعات AI
      </h2>

      <p className="mb-1 text-sm text-gray-300">اكتب طلب العميل المكتوب:</p>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="اكتب طلب العميل، مثال: عايز أشطب شقتي سوبر لوكس بالتجمع مثل الكروكي المرفق"
        className="w-full bg-transparent border border-[#F0E6D2] rounded-xl p-4 h-32 outline-none focus:border-[#D4AF37]"
      />

      <div className="flex items-center justify-between bg-[#020B1C] border border-[#1f2d4d] rounded-xl p-3 select-none">
        <input
          type="file"
          accept="image/*"
          id="plan-image-upload"
          onChange={handlePlanUpload}
          className="hidden"
        />
        <label htmlFor="plan-image-upload" className="text-sm text-gray-300 cursor-pointer flex items-center gap-2 hover:text-[#F0E6D2] transition">
          📎 ارفق كروكي / مخطط الشقة (اختياري)
        </label>
        
        {planImage ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-emerald-500 text-black px-2 py-1 rounded-lg font-bold">✓ تم الإرفاق بنجاح</span>
            <button onClick={() => setPlanImage(null)} className="text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer">حذف</button>
          </div>
        ) : (
          <span className="text-[10px] text-gray-500">لم يتم إرفاق ملف</span>
        )}
      </div>

      <GoldButton onClick={handleAnalyze} disabled={loading} size="lg" className="w-full">
        {loading ? "جاري قراءة المخطط وتحليل الطلب ..." : "تحليل الطلب بالذكاء الاصطناعي"}
      </GoldButton>

      {showResult && analysisData && (
        <SalesResult analysis={analysisData} />
      )}

    </div>
  );
}