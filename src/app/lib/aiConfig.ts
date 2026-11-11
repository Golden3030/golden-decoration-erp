// اسم موديل Gemini في مكان واحد فقط.
// لو جوجل أوقفت الموديل مرة تانية، غيّر المتغير GEMINI_MODEL في Vercel بدون ما تعدل الكود.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";