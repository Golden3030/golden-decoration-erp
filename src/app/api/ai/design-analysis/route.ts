import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

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
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
      const result = await model.generateContent([visionPrompt, imagePart]);
      responseText = result.response.text();
    } catch (geminiError: any) {
      console.warn("Gemini Vision service is down or key is invalid, switching to OpenRouter Fallback...", geminiError);

      const apiKeyOpenRouter = process.env.OPENROUTER_API_KEY;
      if (!apiKeyOpenRouter) {
        throw new Error("عذراً، خوادم جيميناي غير مستجيبة ومفتاح الأمان الاحتياطي OPENROUTER_API_KEY غير معرّف في البيئة لتشغيل البديل البصري.");
      }

      // تجاوز الفشل الفوري: استدعاء واجهات OpenRouter وإرسال تيار الصورة للنموذج البصري البديل
      const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKeyOpenRouter}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Golden Decoration ERP"
        },
        body: JSON.stringify({
          model: "qwen/qwen2.5-vl-72b-instruct:free", // تم تحديث النموذج هنا للإصدار الأحدث والمتاح مجاناً للرؤية البصرية
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: visionPromptToText(visionPrompt) },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Data}`
                  }
                }
              ]
            }
          ]
        })
      });

      if (!orResponse.ok) {
        const errorData = await orResponse.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "فشلت خوادم الرؤية البصرية لـ OpenRouter البديلة في الاستجابة أيضاً.");
      }

      const orData = await orResponse.json();
      responseText = orData.choices[0].message.content;
    }

    return NextResponse.json({ analysis: responseText });
  } catch (error: any) {
    console.error("Error in Vision AI Route:", error);
    return NextResponse.json({
      error: "فشلت خوادم الرؤية البصرية للذكاء الاصطناعي في الاستجابة بالكامل: " + error.message
    }, { status: 500 });
  }
}

const visionPromptText = `
  Analyze this interior design image.
  Identify colors, materials, and lighting.
  Respond ONLY in Egyptian Arabic using markdown.
`;

function visionPromptToText(prompt: string): string {
  return prompt || visionPromptText;
}