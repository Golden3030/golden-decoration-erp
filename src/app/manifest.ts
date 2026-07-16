import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Golden Decoration ERP',
    short_name: 'Golden ERP',
    description: 'نظام إدارة عقود ومشاريع التشطيبات والديكور الفاخرة بمصر والخليج',
    start_url: '/dashboard', // نقطة انطلاق التطبيق الفورية عند الفتح من شاشة الهاتف
    display: 'standalone', // فتح التطبيق بملء الشاشة بدون شريط المتصفح ليعطي مظهر التطبيق الأصيل
    background_color: '#020B1C', // لون خلفية شاشة التحميل المطابق للمانيفستو الجمالي الخاص بك
    theme_color: '#D4AF37', // لون شريط النظام المذهب للتحكم بالهاتف
    icons: [
      {
        src: '/logo.png', // استخدام شعارك الملكي المذهب كأيقونة رسمية للتطبيق على الهاتف
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
      }
    ],
  }
}