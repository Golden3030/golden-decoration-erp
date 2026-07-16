import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

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
      Today's date is Monday, June 22, 2026.

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
    let base64Data = "";
    let mimeType = "";
    if (imageBase64) {
      base64Data = imageBase64.split(",")[1] || imageBase64;
      mimeType = imageBase64.split(";")[0].split(":")[1] || "image/jpeg";
      imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      };
    }

    try {
      // المحاولة الأولى: استخدام خادم جوجل جيميناي المستقر والنشط
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" }); // تم التغيير لـ gemini-1.5-flash لضمان استقرار الاتصال الأول
      
      const result = imagePart 
        ? await model.generateContent([salesPrompt, imagePart])
        : await model.generateContent(salesPrompt);

      responseText = result.response.text();
    } catch (geminiError: any) {
      console.warn("Gemini sales assistant failed, switching to OpenRouter...", geminiError);

      const apiKeyOpenRouter = process.env.OPENROUTER_API_KEY;
      if (!apiKeyOpenRouter) {
        throw new Error("خادم جيميناي للمبيعات تعذر اتصاله ومفتاح الأمان OPENROUTER_API_KEY غير معرّف للتشغيل البديل.");
      }

      // الترحيل الفوري والصامت لـ OpenRouter (يدعم كروكي الصور عبر Qwen 2.5 VL المجاني، أو لاما 3.3 للنصوص)
      const openRouterModel = imagePart 
        ? "qwen/qwen2.5-vl-72b-instruct:free" // تم التحديث للنموذج البصري البديل النشط والمستقر
        : "meta-llama/llama-3.3-70b-instruct";

      const bodyPayload = {
        model: openRouterModel,
        messages: [
          {
            role: "user",
            content: imagePart ? [
              { type: "text", text: salesPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`
                }
              }
            ] : salesPrompt
          }
        ]
      };

      const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKeyOpenRouter}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Golden Decoration ERP"
        },
        body: JSON.stringify(bodyPayload)
      });

      if (!orResponse.ok) {
        const errorData = await orResponse.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "فشلت خوادم المبيعات لـ OpenRouter البديلة في الاستجابة أيضاً.");
      }

      const orData = await orResponse.json();
      responseText = orData.choices[0].message.content;
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