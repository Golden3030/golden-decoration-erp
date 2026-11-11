import { GEMINI_MODEL, withGeminiRetry } from "@/lib/aiConfig";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// يرفع الحد الأقصى لزمن تنفيذ الدالة على Vercel (الافتراضي قصير ويسبب انقطاع التحليل)
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        error: "مفتاح الأمان GEMINI_API_KEY غير معرّف أو لم يتم حفظه بملف الإعدادات الخارجي .env.local بالضغط على Ctrl + S"
      }, { status: 500 });
    }

    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "يرجى إرفاق صورة التصميم لتحليلها." }, { status: 400 });
    }

    const base64Data = imageBase64.split(",")[1] || imageBase64;
    const mimeType = imageBase64.split(";")[0].split(":")[1] || "image/jpeg";

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      },
    };

    const visionPrompt = `
      You are Golden Decoration AI Interior Design Analyzer.
      Analyze this interior design image with high engineering precision.
      
      Extract and detail:
      1. Wall and Ceiling Colors (الألوان المستخدمة للجدران والأسقف ودرجاتها المقترحة).
      2. Used Materials (الخامات الموضحة بالصورة للأرضيات، التكسيات، التجاليد الخشبية، بديل الرخام، إلخ).
      3. Lighting Design (توزيع وأشكال الإضاءة مثل LED Profile, Spotlights, Chandelier).
      4. Estimated Cost category (Economic, Medium, Luxury) based on the visual luxury level of materials.
      5. Execution duration estimate.

      Write your analysis ONLY in Egyptian Arabic in a highly structured, professional interior design presentation layout. Use clean markdown and bullet points.
    `;

    let responseText = "";

    try {
      // المحاولة الأولى: استخدام خادم جوجل جيميناي النشط
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await withGeminiRetry(() => model.generateContent([visionPrompt, imagePart]));
      responseText = result.response.text();
    } catch (geminiError: any) {
      console.error("Gemini API error:", geminiError);
      throw new Error("Gemini: " + (geminiError?.message || "خطأ غير معروف"));
    }

    return NextResponse.json({ analysis: responseText });
  } catch (error: any) {
    console.error("Error in Vision AI Route:", error);
    return NextResponse.json({
      error: "فشلت خوادم الرؤية البصرية للذكاء الاصطناعي في الاستجابة بالكامل: " + error.message
    }, { status: 500 });
  }
}