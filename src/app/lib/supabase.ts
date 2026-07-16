

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("تحذير: مفاتيح الاتصال بـ Supabase غير معرفة في ملف البيئة .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);