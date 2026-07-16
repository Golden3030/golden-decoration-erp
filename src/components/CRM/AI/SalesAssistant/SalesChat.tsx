"use client";

import { useState } from "react";
import SalesResult from "./SalesResult";
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
      const res = await fetch("/api/ai/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          message: message,
          imageBase64: planImage 
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "فشل السيرفر في التخاطب مع خوادم جولد.");
      }

      const data = await res.json();
      const aiText = data.response;

      const areaMatch = aiText.match(/المساحة التقديرية المستخرجة:\s*(\d+)/) || aiText.match(/المساحة:\s*(\d+)/) || aiText.match(/(\d+)\s*متر/);
      const parsedArea = areaMatch ? Number(areaMatch[1]) : 120;

      const levelMatch = aiText.match(/مستوى التشطيب المطلوب:\s*([^\n\r]+)/) || aiText.match(/مستوى التشطيب:\s*([^\n\r]+)/);
      let parsedLevel = levelMatch ? levelMatch[1].trim() : "لوكس";

      let dbLevel = "اقتصادى (لوكس)";
      if (parsedLevel.includes("الترا") || parsedLevel.includes("فاخر")) {
        dbLevel = "فاخر (الترا لوكس)";
        parsedLevel = "الترا لوكس";
      } else if (parsedLevel.includes("سوبر")) {
        dbLevel = "متوسط (سوبر لوكس )";
        parsedLevel = "سوبر لوكس";
      } else {
        parsedLevel = "لوكس";
      }

      const costMatch = aiText.match(/من\s*([\d,]+)\s*إلى\s*([\d,]+)/);
      const minCost = costMatch ? Number(costMatch[1].replace(/,/g, "")) : (parsedArea * 3500 * 0.9);
      const maxCost = costMatch ? Number(costMatch[2].replace(/,/g, "")) : (parsedArea * 3500 * 1.1);

      const durationMatch = aiText.match(/مدة التنفيذ المتوقعة:\s*(\d+)/) || aiText.match(/مدة التنفيذ:\s*(\d+)/) || aiText.match(/(\d+)\s*يوم/);
      const duration = durationMatch ? Number(durationMatch[1]) : 75;

      setAnalysisData({
        area: parsedArea,
        level: parsedLevel,
        dbLevel: dbLevel,
        minCost: minCost,
        maxCost: maxCost,
        duration: duration,
        aiText: aiText
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

      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="w-full h-12 rounded-xl bg-[#c9a227] text-black font-bold px-8 py-3 transition disabled:opacity-50 cursor-pointer text-xs"
      >
        {loading ? "جاري قراءة المخطط وتحليل الطلب ..." : "تحليل الطلب بالذكاء الاصطناعي"}
      </button>

      {showResult && analysisData && (
        <SalesResult analysis={analysisData} />
      )}

    </div>
  );
}