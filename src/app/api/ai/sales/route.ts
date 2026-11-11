import { withGeminiFallback } from "@/lib/aiConfig";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// يرفع الحد الأقصى لزمن تنفيذ الدالة على Vercel لمنع انقطاع الاتصال خاصة عند تحليل صور المخططات
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        error: "مفتاح الأمان GEMINI_API_KEY غير معرّف أو مفقود في ملف الإعدادات .env.local"
      }, { status: 500 });
    }

    const { message, imageBase64 } = await req.json();

    if (!message && !imageBase64) {
      return NextResponse.json({ error: "يرجى كتابة طلب العميل أو إرفاق مخطط كروكي الشقة أولاً." }, { status: 400 });
    }

    // هندسة الأوامر وتوجيه المساعد على صياغة عروض الأسعار والردود ببريق مذهب
    const salesPrompt = `
      You are Golden Decoration AI Sales Assistant.
      Your goal is to answer client inquiries in Egyptian Arabic with extreme politeness, warm tone, and commercial smartness.
      We offer luxury interior design and residential finishing services.
      Our average rate is 5000 EGP per square meter for Super Lux.
      Today's date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

      Here is the current client message:
      "${message || "تم إرفاق مخطط كروكي الشقة للتسعير والحصر الفني"}"

      You must analyze their requirements (and the uploaded floor plan image if provided) and make sure your output contains these exact Arabic phrases so our parsing engine can read them:
      1. "المساحة التقديرية المستخرجة: [رقم المساحة]" (e.g. "المساحة التقديرية المستخرجة: 120")
      2. "مستوى التشطيب المطلوب: [مستوى التشطيب]" (Choose EXACTLY one of: "سوبر لوكس", "لوكس", "الترا لوكس")
      3. "من [الحد الأدنى للتكلفة] إلى [الحد الأقصى للتكلفة]" (e.g. "من 420,000 إلى 500,000") - calculate cost realistically: Super Lux is ~5000 EGP/m², Ultra Lux is ~8000 EGP/m², Lux is ~3500 EGP/m².
      4. "مدة التنفيذ المتوقعة: [عدد الأيام]" (e.g. "مدة التنفيذ المتوقعة: 75")

      Formulate a professional, warm, sales-driven response in Egyptian Arabic. 
      Encourage them to schedule a site visit or request a detailed estimate using our ERP system.
      Provide realistic starting price estimates and duration forecasts.

      Respond ONLY in Egyptian Arabic in a highly structured, professional, and friendly chat style. Use clean markdown and warm emojis.
    `;

    let responseText = "";

    // معالجة صورة الكروكي المرفقة تفاعلياً بـ السيرفر الخلفي للرؤية الحاسوبية
    let imagePart: any = null;
    if (imageBase64) {
      const base64Data = imageBase64.split(",")[1] || imageBase64;
      const mimeType = imageBase64.split(";")[0].split(":")[1] || "image/jpeg";
      imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      };
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const contentPayload = imagePart ? [salesPrompt, imagePart] : salesPrompt;

      // يجرب gemini-3.8-flash أولاً، ولو فشل بضغط الخوادم ينتقل تلقائياً إلى gemini-3.5-flash-lite
      const result = await withGeminiFallback(async (modelName) => {
        const model = genAI.getGenerativeModel({ model: modelName });
        return await model.generateContent(contentPayload);
      });

      responseText = result.response.text();
    } catch (geminiError: any) {
      console.error("Gemini API error:", geminiError);
      throw new Error("Gemini: " + (geminiError?.message || "خطأ غير معروف"));
    }

    // إرجاع الرد بمفتاح "response" ليتطابق مع واجهة المبيعات تماماً
    return NextResponse.json({ response: responseText });
  } catch (error: any) {
    console.error("Error in Sales AI Route:", error);
    return NextResponse.json({
      error: "فشلت خوادم المبيعات للذكاء الاصطناعي في الاستجابة بالكامل: " + error.message
    }, { status: 500 });
  }
}
