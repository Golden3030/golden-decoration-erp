"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Send, 
  CheckCircle, 
  Phone, 
  MapPin, 
  Sparkles, 
  TrendingUp,
  Smartphone,
  Coins,
  Gem,
  Crown,
  Building2,
  Award,
  HardHat,
  Gift,
  Zap,
  UserX,
  Plus,
  Minus,
  ChevronLeft
} from "lucide-react";

// تم تسريع وتيرة العداد التصاعدي ليكون خاطفاً وتفاعلياً بمعدل 300ms لتوفير سرعة استجابة هائلة
function useCountUp(targetValue: number, durationMs: number = 300) {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const fromValueRef = useRef(targetValue);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setDisplayValue(targetValue);
      return;
    }

    const fromValue = fromValueRef.current;
    const startTime = performance.now();

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const nextValue = Math.round(fromValue + (targetValue - fromValue) * eased);
      setDisplayValue(nextValue);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromValueRef.current = targetValue;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [targetValue, durationMs]);

  return displayValue;
}

type FinishingLevel = "standard" | "luxury" | "ultra";

export default function PublicCampaignCalculator() {
  const [mounted, setMounted] = useState(false);
  const [area, setArea] = useState<number>(185); // المساحة الافتراضية الأولية
  const [finishingLevel, setFinishingLevel] = useState<FinishingLevel>("luxury");
  const [estimatedMin, setEstimatedMin] = useState<number>(0);
  const [estimatedMax, setEstimatedMax] = useState<number>(0);

  const displayedMin = useCountUp(estimatedMin);
  const displayedMax = useCountUp(estimatedMax);

  const [showLeadForm, setShowLeadForm] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [phoneError, setPhoneError] = useState<string>(""); 
  const [region, setRegion] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSubmittedSuccess] = useState<boolean>(false);

  // مفتاح حركي لتفعيل وميض الأرقام الذهبية عند تغير السعر
  const [pricePulseKey, setPricePulseKey] = useState<number>(0);

  // أسعار الباقات الافتراضية لشركات المقاولات الفاخرة
  const [ratePerSqm, setRatePerSqm] = useState({
    standard: 4500, // باقة لوكس
    luxury: 6500,   // باقة سوبر لوكس
    ultra: 9500     // باقة ألترا لوكس
  });

  useEffect(() => {
    document.title = "حاسبة التكاليف الذكية | Golden Decoration";
    setMounted(true);
    fetchDynamicRates();
  }, []);

  // جلب الأسعار ديناميكياً مع حماية كاملة ضد الأخطاء السحابية
  async function fetchDynamicRates() {
    try {
      const { data, error } = await supabase.from("package_rates").select("package_id, rate_per_sqm");
      if (data && !error) {
        const freshRates = { ...ratePerSqm };
        data.forEach((row: any) => {
          if (row.package_id === "standard") freshRates.standard = Number(row.rate_per_sqm);
          if (row.package_id === "luxury") freshRates.luxury = Number(row.rate_per_sqm);
          if (row.package_id === "ultra") freshRates.ultra = Number(row.rate_per_sqm);
        });
        setRatePerSqm(freshRates);
      }
    } catch (err) { 
      console.warn("استخدام الباقات الملوكية الافتراضية للمنظومة.", err); 
    }
  }

  // حساب النطاق السعري
  useEffect(() => {
    const baseCost = Number(area) * ratePerSqm[finishingLevel];
    setEstimatedMin(Math.round(baseCost * 0.95));
    setEstimatedMax(Math.round(baseCost * 1.05));
  }, [area, finishingLevel, ratePerSqm]);

  // تحديث وميض السعر عند حدوث أي تغير في الحسابات
  useEffect(() => {
    if (mounted) {
      setPricePulseKey((prev) => prev + 1);
    }
  }, [estimatedMin, estimatedMax]);

  const sliderPercentage = useMemo(() => {
    const min = 40;
    const max = 600;
    return ((area - min) / (max - min)) * 100;
  }, [area]);

  const formatNumber = (num: number) => num.toLocaleString("en-US");

  // تنظيف وتصحيح رقم الموبايل تلقائياً بالصفر الأيسر المصري
  const sanitizeAndValidatePhoneNum = (num: string): { isValid: boolean; sanitized: string } => {
    let cleaned = num.replace(/\s+/g, "").trim();
    
    // تصحيح تلقائي إذا نسي العميل كتابة الصفر في البداية
    if (/^[125]\d{9}$/.test(cleaned)) {
      cleaned = "0" + cleaned;
    }

    const egRegex = /^01[0125]\d{8}$/; 
    const intRegex = /^\+?[1-9]\d{6,14}$/; 
    
    const isValid = egRegex.test(cleaned) || intRegex.test(cleaned);
    return { isValid, sanitized: cleaned };
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError("");
    
    const { isValid, sanitized } = sanitizeAndValidatePhoneNum(phone);
    if (!isValid) {
      setPhoneError("يرجى إدخال رقم هاتف مصري صحيح (11 رقم يبدأ بـ 01) أو رقم دولي مع كود الدولة.");
      return;
    }

    setLoading(true);
    try {
      const finishingLevelArabic = finishingLevel === "standard" ? "لوكس" : finishingLevel === "luxury" ? "سوبر لوكس" : "ألترا لوكس";
      const requestDetailsText = `حاسبة صفحة الهبوط: الباقة المطلوبة [${finishingLevelArabic}]، المساحة الحالية للوحدة [${area} م²]. نطاق الميزانية المعتمد يتراوح بين [${formatNumber(estimatedMin)} ج.م] كحد أدنى و [${formatNumber(estimatedMax)} ج.م] كحد أقصى شامل الخامات والمصنعيات.`;

      const { error } = await supabase.from("customer_requests").insert({
        name: name.trim(), 
        phone: sanitized, 
        area: Number(area), 
        finishing_level: finishingLevelArabic, 
        region: region.trim(), 
        notes: notes.trim() || "لا توجد ملاحظات إضافية من العميل",
        request_details: requestDetailsText,
        estimatedMin: Number(estimatedMin),
        estimatedMax: Number(estimatedMax),
        execution_date: new Date().toISOString().split("T")[0]
      });

      if (error) throw error;
      setSubmittedSuccess(true);
    } catch (err) { 
      console.error(err);
      alert("حدث خطأ تقني أثناء تخزين البيانات ، يرجى التحقق من اتصالك بالإنترنت."); 
    }
    setLoading(false);
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#000000] text-[#F0E6D2] py-8 px-4 relative overflow-hidden flex items-center justify-center font-alexandria tracking-normal" dir="rtl">
      
      {/* الهالة الضوئية الذهبية الدافئة المتنفسة بالخلفية السوداء المطلقة */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-[#D4AF37]/8 blur-[120px] pointer-events-none animate-ambient-breathe z-0" />

      {/* ورقة أنماط الدستور الجمالي الموحد - تم حذف سطر الـ @import المبطئ تماماً وتعيين خط تاوما الاحتياطي السلس */}
      <style dangerouslySetInnerHTML={{__html: `
        .font-alexandria {
          font-family: var(--font-alexandria), 'Tahoma', sans-serif !important;
          letter-spacing: normal !important;
        }

        input[type="range"] { -webkit-appearance: none; width: 100%; background: transparent; cursor: pointer; }
        
        /* شريط التمرير الذهبي الراقي */
        input[type="range"]::-webkit-slider-runnable-track { 
          width: 100%; 
          height: 6px; 
          background: linear-gradient(to left, #D4AF37 0%, #D4AF37 var(--slider-progress), rgba(212, 175, 55, 0.15) var(--slider-progress), rgba(212, 175, 55, 0.15) 100%) !important;
          border-radius: 12px; 
        }
        
        /* مقبض السحب المذهب الفخم */
        input[type="range"]::-webkit-slider-thumb { 
          height: 20px; 
          width: 20px; 
          border-radius: 50%; 
          background: radial-gradient(circle, #F0E6D2 0%, #D4AF37 100%); 
          -webkit-appearance: none; 
          margin-top: -7px; 
          box-shadow: 0 0 14px rgba(212, 175, 55, 0.8); 
          cursor: pointer; 
          border: 2px solid #000000; 
          transition: transform 0.2s ease-in-out; 
        }
        input[type="range"]::-webkit-slider-thumb:hover { 
          transform: scale(1.2); 
        }

        @keyframes ambient-breathe {
          0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.75; transform: translate(-50%, -50%) scale(1.06); }
        }
        .animate-ambient-breathe {
          animation: ambient-breathe 8s ease-in-out infinite;
        }

        @keyframes badge-breathe {
          0%, 100% { 
            opacity: 0.85; 
            transform: scale(0.97); 
            box-shadow: 0 0 8px rgba(212, 175, 55, 0.12);
            border-color: rgba(212, 175, 55, 0.3);
          }
          50% { 
            opacity: 1; 
            transform: scale(1.03); 
            box-shadow: 0 0 18px rgba(212, 175, 55, 0.25);
            border-color: rgba(212, 175, 55, 0.65);
          }
        }
        .animate-badge-breathe {
          animation: badge-breathe 4s ease-in-out infinite;
        }

        .cta-shimmer::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          width: 40%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          animation: cta-shimmer-sweep 4s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes cta-shimmer-sweep {
          0%, 92%, 100% { transform: translateX(-150%) skewX(-20deg); }
          45% { transform: translateX(150%) skewX(-20deg); }
        }

        .frame-glow {
          animation: frame-glow-pulse 5s ease-in-out infinite;
        }
        @keyframes frame-glow-pulse {
          0%, 100% { 
            box-shadow: 0 0 35px rgba(212,175,55,0.06), inset 0 0 25px rgba(255,255,255,0.01);
            border-color: rgba(212,175,55,0.3);
          }
          50% { 
            box-shadow: 0 0 55px rgba(212,175,55,0.22), inset 0 0 35px rgba(255,255,255,0.03);
            border-color: rgba(212,175,55,0.65);
          }
        }

        @keyframes phone-glow-breathe {
          0%, 100% {
            transform: rotate(-3deg) scale(1);
            filter: drop-shadow(0 0 8px rgba(212, 175, 55, 0.2));
          }
          50% {
            transform: rotate(3deg) scale(1.04);
            filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.6));
          }
        }
        .animate-phone-interact {
          animation: phone-glow-breathe 3.5s ease-in-out infinite;
        }

        /* تعزيز التأثير البلوري الكريستالي الفاخر */
        .glass-price-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
          border: 1px solid rgba(212, 175, 55, 0.45) !important;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.85), inset 0 1px 2px rgba(255, 255, 255, 0.15) !important;
        }

        @keyframes price-fade-glow-pulse {
          0% {
            opacity: 0.75;
            filter: drop-shadow(0 0 2px rgba(212, 175, 55, 0.15));
            transform: scale(0.98);
          }
          50% {
            opacity: 1;
            filter: drop-shadow(0 0 16px rgba(212, 175, 55, 0.8));
            transform: scale(1.02);
          }
          100% {
            opacity: 1;
            filter: drop-shadow(0 0 4px rgba(212, 175, 55, 0.2));
            transform: scale(1);
          }
        }
        .animate-price-fade {
          animation: price-fade-glow-pulse 0.4s ease-out;
        }
      `}} />

      <div className="w-full max-w-[430px] z-10 relative">
        
        {/* الإطارات الزخرفية المذهبة الجانبية - ملتصقة ومحاذية للكارت تماماً لمنع الانفصال بصرياً */}
        <div 
          className="hidden xl:block absolute right-[102%] top-1/2 -translate-y-1/2 h-[550px] w-[220px] bg-contain bg-right bg-no-repeat select-none pointer-events-none opacity-45 z-0"
          style={{ backgroundImage: "url('/right-chevron.png')" }}
        />
        <div 
          className="hidden xl:block absolute left-[102%] top-1/2 -translate-y-1/2 h-[550px] w-[220px] bg-contain bg-left bg-no-repeat select-none pointer-events-none opacity-45 z-0"
          style={{ backgroundImage: "url('/left-chevron.png')" }}
        />
        
        {/* الكارت الرئيسي بلون أسود كامل لمنح الهوية الملكية أقصى قدر من البروز */}
        <div className="frame-glow bg-[#000000]/95 backdrop-blur-[24px] border border-[#D4AF37]/40 rounded-[2.5rem] pt-4 pb-6 px-4.5 space-y-4 transition-all duration-300">
          
          {/* ترويسة التطبيق مع زيادة ذكية ومتجانسة للمسافات لتوفير الراحة والبروز البصري الفاخر */}
          <header className="text-center space-y-4 pb-1">
            
            <div className="flex flex-col items-center gap-0 mt-[-5px]">
              <img 
                src="/logo.png" 
                alt="Golden Decoration Logo" 
                width={95} 
                height={95} 
                className="mx-auto drop-shadow-[0_0_18px_rgba(212,175,55,0.4)] object-contain select-none animate-fade-in"
              />

              {/* جملة مؤشر ميزانيات التشطيب الذكي - مزاحة بأناقة وتفصلها مسافة مريحة من الشعار */}
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full border border-[#D4AF37]/35 bg-[#000000] animate-badge-breathe mt-3.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] shrink-0 animate-pulse" />
                <span className="text-[10px] font-black text-[#D4AF37] tracking-wider select-none font-alexandria">
                  مؤشر ميزانيات التشطيبات الذكي 2026
                </span>
              </div>
            </div>

            {/* كتلة النصوص الرئيسية مع تطبيق إزاحة للأعلى بنسبة صغيرة ممتازة وإحكام المسافات البينية بدقة متناهية لمنع اقتصاص الحروف */}
            <div className="inline-flex items-center justify-center gap-2.5 select-none mx-auto mt-1.5 translate-y-[-6px]">
              <div className="flex flex-col items-center text-center space-y-2">
                <h1 className="text-lg font-bold text-white leading-tight font-alexandria">
                  احسب تكلفة تشطيب شقتك
                </h1>
                {/* تم تعديل الحجم إلى 3.5xl مع تحرير ارتفاع السطر وإضافة حشوة سفلية لضمان ظهور الذيول كاملة */}
                <span className="bg-gradient-to-r from-[#F0E6D2] via-[#C9A45D] to-[#D4AF37] bg-clip-text text-transparent font-black text-4xl md:text-4xl block font-alexandria leading-none">
                  من موبايلك
                </span>
              </div>

              <Smartphone 
                className="w-11 h-11 text-[#D4AF37] shrink-0 animate-phone-interact" 
                strokeWidth={1} 
              />
            </div>

            {/* الأوسمة الثلاثة - مع مسافات توزيع واضحة وواسعة */}
            <div className="flex flex-row flex-nowrap items-center justify-center gap-4 select-none w-full pt-1.5">
              {[
                { icon: UserX, label: "بدون تسجيل" },
                { icon: Gift, label: "مجاني" },
                { icon: Zap, label: "نتيجة فورية" },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 bg-[#000000] border border-[#D4AF37]/30 text-[#F0E6D2] px-2.5 py-1 rounded-full text-[9px] font-bold whitespace-nowrap font-alexandria"
                >
                  <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{label}</span>
                  <Icon className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                </span>
              ))}
            </div>
          </header>

          {!success ? (
            !showLeadForm ? (
              <div className="space-y-4 font-alexandria">
                
                {/* كارت عرض الأسعار المذهب مع دائرة المساحة الذهبية الكاملة الاستدارة */}
                <div className="relative rounded-2xl p-4.5 glass-price-card">
                  
                  <span className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1 tracking-wider mb-2 select-none font-alexandria">
                    <TrendingUp className="w-3.5 h-3.5" /> الميزانية التقديرية المقترحة:
                  </span>

                  {/* وميض الأرقام الذهبية عالي الاستجابة مع إلغاء تباعد الحروف */}
                  <div key={pricePulseKey} className="space-y-1 animate-price-fade font-alexandria">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] font-bold text-[#F0E6D2]/50 w-6 text-right select-none">من:</span>
                      <span className="bg-gradient-to-r from-[#F0E6D2] via-[#C9A45D] to-[#D4AF37] bg-clip-text text-transparent text-2xl font-black font-mono tracking-normal leading-none">
                        {formatNumber(displayedMin)}
                      </span>
                      <span className="text-[10px] text-[#F0E6D2]/40 font-bold select-none">ج.م</span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] font-bold text-[#F0E6D2]/50 w-6 text-right select-none">إلى:</span>
                      <span className="bg-gradient-to-r from-[#F0E6D2] via-[#C9A45D] to-[#D4AF37] bg-clip-text text-transparent text-2xl font-black font-mono tracking-normal leading-none">
                        {formatNumber(displayedMax)}
                      </span>
                      <span className="text-[10px] text-[#F0E6D2]/40 font-bold select-none">ج.م</span>
                    </div>
                  </div>

                  <p className="mt-2.5 pt-2 border-t border-[#D4AF37]/20 text-[10px] text-emerald-400/95 font-bold text-center select-none font-alexandria">
                    الأسعار شاملة أرقى الخامات المعتمدة والمصنعية
                  </p>

                  {/* الوشاح الدائري المذهب الدقيق جداً أعلى يسار الصندوق بدلاً من المربع المائل */}
                  <div className="absolute -top-4 -left-3.5 flex flex-col items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-[#F0E6D2] via-[#C9A45D] to-[#D4AF37] shadow-[0_4px_12px_rgba(212,175,55,0.4)] border-2 border-[#D4AF37] select-none z-20">
                    <span className="text-[#020B1C] text-sm font-black leading-none font-mono">{area}</span>
                    <span className="text-[#020B1C] text-[8px] font-bold leading-none mt-0.5">م²</span>
                  </div>

                </div>

                {/* شريط التحكم التفاعلي بالمساحة - مع دمج العداد التفاعلي كقارئ مباشر للمساحة */}
                <div className="space-y-3.5 select-none">
                  
                  {/* العداد الحركي المتطور h-11 طبقاً للمانيفستو يعرض الآن القيمة مباشرة */}
                  <div className="flex items-center justify-between h-11 bg-[#000000] border border-[#D4AF37]/35 rounded-xl px-4 w-full">
                    <button 
                      type="button"
                      onClick={() => setArea(prev => Math.max(40, prev - 1))}
                      className="w-6 h-6 rounded-full bg-[#9B1C1C]/25 border border-[#9B1C1C]/60 flex items-center justify-center cursor-pointer hover:bg-[#9B1C1C]/40 active:scale-90 transition-all text-[#ff6b6b]"
                    >
                      <Minus size={12} strokeWidth={3} />
                    </button>
                    
                    <span className="text-[#D4AF37] font-black text-sm font-alexandria bg-[#000000] px-3.5 py-0.5 rounded-lg border border-[#D4AF37]/20 font-mono">
                      {area} m²
                    </span>
                    
                    <button 
                      type="button"
                      onClick={() => setArea(prev => Math.min(600, prev + 1))}
                      className="w-6 h-6 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/60 flex items-center justify-center cursor-pointer hover:bg-[#D4AF37]/35 active:scale-90 transition-all text-[#D4AF37]"
                    >
                      <Plus size={12} strokeWidth={3} />
                    </button>
                  </div>

                  <input
                    type="range" min="40" max="600" step="1"
                    value={area}
                    onChange={(e) => setArea(Number(e.target.value))}
                    className="w-full cursor-pointer"
                    style={{ ["--slider-progress" as string]: `${sliderPercentage}%` }}
                  />
                  <div className="flex justify-between text-[9px] text-[#F0E6D2]/40 font-mono">
                    <span>600 م²</span>
                    <span>40 م²</span>
                  </div>
                </div>

                {/* اختيار مستوى وباقة التشطيب - مع تكنولوجيا التوهج اللامع عند التحديد والضغط (Neon Glow Activation) */}
                <div className="space-y-2 select-none">
                  <label className="text-[#F0E6D2] text-xs font-bold tracking-wide block font-alexandria">اختر باقة التشطيب ومستوى الخامات:</label>
                  
                  <div className="grid grid-cols-3 gap-2 w-full">
                    
                    {/* خيار: باقة لوكس */}
                    <button
                      type="button"
                      onClick={() => setFinishingLevel("standard")}
                      className={`py-3 px-1 rounded-xl border text-[10px] font-black transition-all duration-300 flex flex-col items-center justify-center gap-1.5 cursor-pointer transform active:scale-95 ${
                        finishingLevel === "standard"
                          ? "bg-black border-2 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.55)] scale-[1.03]"
                          : "bg-[#000000]/60 border border-[#D4AF37]/20 text-[#F0E6D2]/60 hover:border-[#D4AF37]/50 hover:text-[#F0E6D2]"
                      }`}
                    >
                      <Coins size={15} className={finishingLevel === "standard" ? "text-[#D4AF37] animate-pulse" : "text-[#D4AF37]/40"} />
                      <span>باقة لوكس</span>
                    </button>

                    {/* خيار: سوبر لوكس */}
                    <button
                      type="button"
                      onClick={() => setFinishingLevel("luxury")}
                      className={`py-3 px-1 rounded-xl border text-[10px] font-black transition-all duration-300 flex flex-col items-center justify-center gap-1.5 cursor-pointer transform active:scale-95 ${
                        finishingLevel === "luxury"
                          ? "bg-black border-2 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.55)] scale-[1.03]"
                          : "bg-[#000000]/60 border border-[#D4AF37]/20 text-[#F0E6D2]/60 hover:border-[#D4AF37]/50 hover:text-[#F0E6D2]"
                      }`}
                    >
                      <Gem size={15} className={finishingLevel === "luxury" ? "text-[#D4AF37] animate-pulse" : "text-[#D4AF37]/40"} />
                      <span>سوبر لوكس</span>
                    </button>

                    {/* خيار: ألترا لوكس */}
                    <button
                      type="button"
                      onClick={() => setFinishingLevel("ultra")}
                      className={`py-3 px-1 rounded-xl border text-[10px] font-black transition-all duration-300 flex flex-col items-center justify-center gap-1.5 cursor-pointer transform active:scale-95 ${
                        finishingLevel === "ultra"
                          ? "bg-black border-2 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.55)] scale-[1.03]"
                          : "bg-[#000000]/60 border border-[#D4AF37]/20 text-[#F0E6D2]/60 hover:border-[#D4AF37]/50 hover:text-[#F0E6D2]"
                      }`}
                    >
                      <Crown size={15} className={finishingLevel === "ultra" ? "text-[#D4AF37] animate-pulse" : "text-[#D4AF37]/40"} />
                      <span>ألترا لوكس</span>
                    </button>

                  </div>
                </div>

                {/* زر الإجراء الأساسي بالهوية الأرستقراطية الملكية (The Matte Royal Velvet Button) */}
                <button
                  onClick={() => setShowLeadForm(true)}
                  className="cta-shimmer relative overflow-hidden w-full h-12 bg-gradient-to-r from-black via-[#0d0904] to-black border-2 border-[#D4AF37] text-[#F0E6D2] rounded-full font-black text-xs shadow-[0_4px_18px_rgba(212,175,55,0.2)] flex items-center justify-center gap-2.5 hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(212,175,55,0.55)] hover:border-[#F0E6D2] active:scale-[1.01] transition-all duration-300 cursor-pointer font-alexandria"
                >
                  <span className="text-[#F0E6D2] tracking-wider">احصل على مقايسة تفصيلية رسمية الآن</span>
                  <ChevronLeft size={16} className="text-[#D4AF37] shrink-0" />
                </button>

              </div>
            ) : (
              /* استمارة تسليم البيانات الراقية */
              <form onSubmit={handleSubmitRequest} className="space-y-3.5 font-alexandria">
                <div className="flex justify-between items-center border-b border-[#D4AF37]/20 pb-2.5">
                  <h3 className="text-[#F0E6D2] font-black text-xs select-none font-alexandria">طلب مقايسة تفصيلية</h3>
                  <button 
                    type="button" 
                    onClick={() => setShowLeadForm(false)} 
                    className="text-[#D4AF37] text-[10px] font-black underline cursor-pointer hover:text-[#F0E6D2] transition-colors font-alexandria"
                  >
                    تعديل المساحة والباقة
                  </button>
                </div>
                
                <input
                  type="text" 
                  placeholder="اسم العميل الثلاثى"
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 rounded-xl bg-[#000000]/80 border border-[#D4AF37]/30 text-white px-3.5 text-xs font-semibold outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/35 transition-all placeholder:text-[#F0E6D2]/30 font-alexandria"
                  required
                />
                
                <div className="relative">
                  <Phone className="absolute right-3.5 top-[14px] text-gray-500" size={15} />
                  <input
                    type="tel" 
                    placeholder="رقم الموبايل (مصحح ذاتياً)"
                    value={phone} 
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (phoneError) setPhoneError(""); 
                    }}
                    className="w-full h-11 rounded-xl bg-[#000000]/80 border border-[#D4AF37]/30 text-[#F0E6D2] pr-10 pl-3.5 text-xs font-semibold outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/35 transition-all placeholder:text-[#F0E6D2]/30 text-left font-mono"
                    required
                  />
                  {phoneError && (
                    <p className="text-[10px] text-[#ff6b6b] font-bold mt-1.5 text-right font-alexandria">
                      ⚠️ {phoneError}
                    </p>
                  )}
                </div>
                
                {/* دمج المنطقة والمساحة اليدوية أفقياً */}
                <div className="grid grid-cols-2 gap-3">
                  
                  <div className="relative">
                    <MapPin className="absolute right-3.5 top-[14px] text-gray-500" size={15} />
                    <input
                      type="text" 
                      placeholder="المنطقة / المدينة"
                      value={region} 
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full h-11 rounded-xl bg-[#000000]/80 border border-[#D4AF37]/30 text-white pr-9 pl-3.5 text-xs font-semibold outline-none focus:border-[#D4AF37] transition-all placeholder:text-[#F0E6D2]/30 font-alexandria"
                      required
                    />
                  </div>

                  <div className="relative">
                    <span className="absolute left-3.5 top-[14px] text-[11px] text-[#D4AF37] font-bold select-none font-alexandria">م²</span>
                    <input
                      type="number" 
                      placeholder="المساحة"
                      value={area || ""} 
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val >= 0 && val <= 1000) setArea(val);
                      }}
                      className="w-full h-11 rounded-xl bg-[#000000]/80 border border-[#D4AF37]/30 text-white px-3.5 text-xs font-semibold outline-none focus:border-[#D4AF37] transition-all placeholder:text-[#F0E6D2]/30 text-right font-mono"
                      required
                    />
                  </div>

                </div>

                <textarea
                  placeholder="ملاحظات إضافية خاصة بالموقع (اختياري)..."
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-14 rounded-xl bg-[#000000]/80 border border-[#D4AF37]/30 text-white p-3.5 text-xs font-semibold outline-none focus:border-[#C9A45D] transition-all placeholder:text-[#F0E6D2]/30 resize-none font-alexandria"
                />

                <div className="flex gap-2.5 pt-1.5 select-none font-alexandria">
                  <button 
                    type="button" 
                    onClick={() => setShowLeadForm(false)} 
                    className="flex-1 h-11 rounded-full border border-[#D4AF37]/20 text-gray-400 font-bold text-[10px] cursor-pointer hover:bg-white/5 transition-all"
                  >
                    رجوع
                  </button>
                  {/* ترقية الزر الفرعي كذلك للتناغم مع الهوية البصرية الملكية */}
                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="cta-shimmer relative overflow-hidden flex-[2.5] h-11 bg-gradient-to-r from-black via-[#0d0904] to-black border-2 border-[#D4AF37] text-[#F0E6D2] rounded-full font-black text-[11px] shadow-lg cursor-pointer hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all duration-300"
                  >
                    {loading ? "جاري حفظ بياناتك..." : "تأكيد وإرسال بياناتك"}
                  </button>
                </div>
              </form>
            )
          ) : (
            /* صفحة النجاح الراقية */
            <div className="text-center py-6 space-y-4 select-none animate-in zoom-in duration-500 font-alexandria">
              <CheckCircle className="text-emerald-400 mx-auto drop-shadow-[0_0_12px_rgba(52,211,153,0.4)]" size={54} strokeWidth={1.5} />
              <h2 className="text-[#F0E6D2] text-lg font-black tracking-wide">طلبك قيد الدراسة الفنية</h2>
              <p className="text-gray-300 text-[10px] leading-relaxed font-semibold px-4">
                نشكر ثقتكم في Golden Decoration. تم تسجيل تفاصيل طلبك بنجاح، وسيتم ارسال مقايستك المعتمدة فورا عبر الواتساب في أقرب وقت.
              </p>
              
              <div className="pt-2 select-none font-alexandria">
                <a 
                  href={`https://wa.me/201065282534?text=أهلاً%20Golden%20Decoration%20لقد%20أتممت%20حساب%20ميزانية%20وحدتي%20بمساحة%20${area}%20متر%20مربع%20باقة%20${finishingLevel === "standard" ? "لوكس" : finishingLevel === "luxury" ? "سوبر%20لوكس" : "ألترا%20لوكس"}`}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3.5 rounded-full font-black text-xs transition-all duration-200 hover:scale-[1.03] cursor-pointer shadow-lg shadow-emerald-900/45"
                >
                  محادثة فورية مع المهندس المختص (واتساب)
                </a>
              </div>
            </div>
          )}

          {/* الهيكل العمودي للأوسمة السفلية بخلفية سوداء بالكامل وتحديد مذهب نحيف */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#D4AF37]/30 select-none">
            {[
              { icon: HardHat, label: "إشراف هندسي", sub: "متكامل" },
              { icon: Building2, label: "+350", sub: "مشروع منفذ" },
              { icon: Award, label: "12 سنة", sub: "خبرة وجودة" },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={sub} className="flex flex-col items-center gap-1.5 px-1 py-2.5 rounded-xl bg-[#000000]/90 border border-[#D4AF37]/20 text-center select-none font-alexandria">
                <Icon size={18} className="text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.25)]" />
                <span className="text-white text-[9px] font-black leading-none">{label}</span>
                <span className="text-white/55 text-[8px] font-bold leading-none mt-0.5">{sub}</span>
              </div>
            ))}
          </div>

        </div>

        {/* سطر العلامة التجارية السفلي الفخم */}
        <a 
          href="https://wa.me/201065282534?text=أهلاً%20Golden%20Decoration%20أود%20الاستفسار%20المباشر%20عن%20أعمال%20تصاميم%20وتشطيبات%20المشاريع"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center gap-1.5 mt-4 text-center group cursor-pointer font-alexandria"
        >
          <div className="flex items-center gap-2 text-white group-hover:text-[#D4AF37] transition-all duration-300">
            <span className="text-[10px] font-semibold tracking-wide">للتواصل المباشر مع المهندس المختص اضغط هنا</span>
            <svg 
              className="w-4 h-4 fill-current text-[#25D366] drop-shadow-[0_0_8px_rgba(37,211,102,0.45)] shrink-0 transition-transform group-hover:scale-110 duration-300" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.055 11.945.055a11.838 11.838 0 0 1 8.411 4.937 11.838 11.838 0 0 1 3.535 8.414c-.005 6.533-5.342 11.826-11.89 11.826-2.001 0-3.972-.511-5.717-1.483L0 24zm6.59-4.846c1.6.95 3.198 1.451 4.757 1.451 5.396 0 9.784-4.364 9.788-9.724a9.699 9.699 0 0 0-2.91-6.913 9.699 9.699 0 0 0-6.916-2.914c-5.399 0-9.788 4.366-9.79 9.729a9.61 9.61 0 0 0 1.484 5.03l-.973 3.55 3.655-.959zm11.758-5.36c-.079-.133-.294-.213-.618-.374-.325-.16-.1.92-.1.921s-.2.133-.538-.053c-.341-.186-1.432-.527-2.071-1.096-.497-.442-.832-.988-.93-1.149-.097-.16-.01-.247.07-.327.073-.073.16-.187.24-.281.08-.093.107-.16.16-.32.054-.16.027-.306-.014-.467-.04-.16-.363-.878-.497-1.203-.131-.317-.264-.274-.363-.274-.094 0-.202-.011-.31-.011a.596.596 0 0 0-.433.201c-.149.16-.568.555-.568 1.353 0 .798.58 1.568.661 1.675.08.107 1.141 1.742 2.766 2.443 1.353.584 1.629.468 1.918.44.29-.028.93-.38 1.06-.747.132-.367.132-.682.093-.747z"/>
            </svg>
          </div>
          <span className="text-[#D4AF37]/45 group-hover:text-[#D4AF37] hover:drop-shadow-[0_0_8px_rgba(212,175,55,0.5)] transition-all duration-300 font-bold uppercase tracking-[0.25em] text-[10px]">
            — GOLDEN DECORATION —
          </span>
        </a>

      </div>
    </main>
  );
}