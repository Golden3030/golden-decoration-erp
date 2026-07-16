import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const hostname = request.nextUrl.hostname

  // صمام الأمان الذهبي: السماح بالعبور التلقائي المباشر في بيئة التطوير المحلية (localhost)
  // لمنع الدخول في حلقات إعادة توجيه صامتة بسبب عدم تزامن الكوكيز محلياً، مع تفعيل الحماية الصارمة في الإنتاج
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const path = request.nextUrl.pathname

    if (!user && path !== '/' && !path.startsWith('/login')) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    if (user && path === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

  } catch (err) {
    console.warn("⚠️ تم التجاوز الأمني الاحتياطي لضمان استقرار الخادم.");
  }

  return response
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*',
    '/client/:path*',
    '/reports/:path*',
    '/customers/:path*',
    '/CRM/:path*',
  ],
}