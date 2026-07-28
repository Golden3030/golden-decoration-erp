import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ✅ فحص دفاعي: لو المتغيرات دي مش متضافة في إعدادات البيئة (زي لوحة تحكم Vercel)،
// كان createClient('', '') بيرمي خطأ صامت وقت تحميل الملف قبل ما React يعرض أي حاجة،
// فالصفحة كلها بتفشل تفتح بدون أي رسالة توضح السبب. دلوقتي هيظهر تحذير واضح في الكونسول.
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "⚠️ متغيرات البيئة NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY غير معرّفة. " +
    "لو الموقع شغال على Vercel، تأكد من إضافتهم في: Project Settings → Environment Variables، " +
    "ثم إعادة نشر المشروع (Redeploy) بعد الإضافة."
  );
}

// تهيئة وتصدير عميل الاتصال بقاعدة البيانات
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);  // بدل createClient