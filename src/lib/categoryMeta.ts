// ✅ مصدر واحد موحّد لأسماء وأيقونات تصنيفات المقايسة (finishing categories).
// اتعمل بعد ما لقينا نفس القاموس ده متكرر ومنفصل في 4 أماكن مختلفة (EstimateTable.tsx،
// PrintableEstimate.tsx، InitialEstimate.tsx، public-estimate/page.tsx) — وكل واحد منهم كان
// ممكن يتحدث لوحده وينحرف عن التاني (زي ما حصل فعليًا مع waterproofing/metalWorks قبل كده).
// أي تصنيف جديد أو تعديل اسم لازم يتم هنا بس، وكل الأماكن الأربعة هتاخده تلقائيًا.

// الاسم العربي المعروض لكل تصنيف حقيقي في المقايسة، زائد "engineering_fee" اللي هو بند افتراضي
// (مش تصنيف بنود حقيقي) بيتحسب لعرض هامش الإشراف الهندسي في الرسم الدائري بالبوابة العامة.
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
  decorations: "أعمال الديكورات والتجاليد الجمالية",
  engineering_fee: "هامش الإشراف والتشغيل الهندسي"
};

// أيقونة إيموجي بسيطة لكل تصنيف — مستخدمة في EstimateTable.tsx وPrintableEstimate.tsx.
export const categoryIconsEmoji: Record<string, string> = {
  archMod: "🔨", masonry: "🧱", plaster: "🖌️", paint: "🎨",
  flooring: "▦", ceiling: "🔲", ac: "❄️", ventilation: "💨",
  doors: "🚪", aluminum: "🪟", staircase: "🪜", electricity: "⚡",
  plumbing: "🚿", decorations: "✨",
};

// أيقونات SVG كاملة لكل تصنيف — مستخدمة في InitialEstimate.tsx وpublic-estimate/page.tsx.
// دالة (مش object) عشان ترجع أيقونة افتراضية موحّدة لأي تصنيف مش موجود في القاموس.
const svgIcons: Record<string, string> = {
  plumbing: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 00-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>`,
  electricity: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>`,
  plaster: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>`,
  paint: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>`,
  ceiling: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>`,
  flooring: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>`,
  doors: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>`,
  aluminum: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"></path></svg>`,
  archMod: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4a2 2 0 114 0v1a2 2 0 01-2 2h-1M4 11V5a2 2 0 012-2h4v8m-1 1v8m0 0H4a2 2 0 01-2-2v-4a2 2 0 012-2h4z"></path></svg>`,
  decorations: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>`,
  masonry: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2"></path></svg>`,
  ac: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v18m9-9H3m12-4l-6 8m0-8l6 8"></path></svg>`,
  ventilation: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"></path></svg>`,
  staircase: `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 20h4v-4h4v-4h4V8h4V4"></path></svg>`,
};

const defaultSvgIcon = `<svg class="w-5 h-5 text-[#C9A45D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>`;

export const getCategoryIconSvg = (category: string): string => svgIcons[category] || defaultSvgIcon;
