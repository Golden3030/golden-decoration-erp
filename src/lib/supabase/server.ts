import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// عميل Supabase مخصص للاستخدام داخل API Routes و Server Components
// بيقرأ الجلسة من الكوكيز اللي وصلها middleware.ts (نفس مصدر الحقيقة)
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set(name, value, options)
          } catch {
            // ممكن تفشل لو اتنادت من Server Component بحت، مش مشكلة هنا لأننا في Route Handlers
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set(name, '', options)
          } catch {}
        },
      },
    }
  )
}
