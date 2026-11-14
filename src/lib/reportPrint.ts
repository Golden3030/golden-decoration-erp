import { escapeHtml, markdownToHtml } from "@/lib/markdownLite";

// تصدير التقارير كـ PDF بشكل احترافي: يفتح نافذة طباعة منسقة (ورق A4، لوجو الشركة، ترويسة، ترقيم صفحات)
// والمستخدم يختار "حفظ كـ PDF". هذا الأسلوب يدعم العربي بالكامل بخلاف مكتبات توليد PDF داخل المتصفح.

export interface ReportOptions {
  title: string;                                   // عنوان التقرير
  subtitle?: string;                               // سطر تحت العنوان (اختياري)
  meta?: { label: string; value: string }[];      // بيانات التقرير (المشروع، العميل...)
  markdown: string;                                // محتوى التقرير
}

export const COMPANY_NAME_AR = "جولدن ديكوريشن";
export const COMPANY_NAME_EN = "GOLDEN DECORATION";
export const COMPANY_TAGLINE = "للتشطيبات والديكور";

const CSS = `
  @page { size: A4; margin: 16mm 14mm 20mm 14mm; @bottom-center { content: "صفحة " counter(page) " من " counter(pages); font-size: 9px; color: #6b7280; font-family: 'Cairo','Tahoma',sans-serif; } }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font-family: 'Cairo','Tahoma','Segoe UI','Arial',sans-serif; color: #1f2937; font-size: 12px; line-height: 1.85; direction: rtl; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #D4AF37; padding-bottom: 10px; margin-bottom: 14px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand img { width: 64px; height: 64px; object-fit: contain; }
  .brand .ar { font-size: 20px; font-weight: 900; color: #0c1e3d; line-height: 1.2; }
  .brand .en { font-size: 10px; letter-spacing: 2.5px; color: #A17A4C; font-weight: 700; direction: ltr; text-align: right; }
  .brand .tag { font-size: 10px; color: #6b7280; font-weight: 600; }
  .doc-type { text-align: left; font-size: 10px; color: #6b7280; direction: ltr; line-height: 1.6; }
  .doc-type strong { color: #0c1e3d; font-size: 11px; }
  .title-block { background: linear-gradient(135deg, #0c1e3d, #040e20); color: #fff; border-radius: 8px; padding: 14px 18px; margin-bottom: 12px; border-right: 6px solid #D4AF37; }
  .title-block h1 { margin: 0; font-size: 18px; font-weight: 900; color: #F1E5C6; }
  .title-block .sub { margin-top: 4px; font-size: 11px; color: #d1d5db; font-weight: 600; }
  .meta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
  .meta .item { flex: 1 1 30%; background: #f8f5ec; border: 1px solid #e6dcc0; border-radius: 6px; padding: 6px 10px; }
  .meta .item .l { font-size: 9px; color: #A17A4C; font-weight: 700; }
  .meta .item .v { font-size: 12px; color: #0c1e3d; font-weight: 800; }
  .content h2 { font-size: 14px; font-weight: 900; color: #0c1e3d; border-right: 5px solid #D4AF37; background: #f8f5ec; padding: 4px 10px; margin: 18px 0 8px; break-after: avoid; }
  .content h3 { font-size: 12.5px; font-weight: 800; color: #A17A4C; margin: 14px 0 6px; break-after: avoid; }
  .content h4 { font-size: 12px; font-weight: 800; color: #0c1e3d; margin: 10px 0 4px; break-after: avoid; }
  .content p { margin: 4px 0 8px; }
  .content ul, .content ol { margin: 4px 0 10px; padding-right: 22px; padding-left: 0; }
  .content li { margin-bottom: 3px; }
  .content strong { color: #0c1e3d; }
  .content code { background: #f3f4f6; padding: 0 4px; border-radius: 3px; font-size: 11px; }
  .content hr { border: 0; border-top: 1px solid #e5e7eb; margin: 12px 0; }
  .content blockquote { margin: 8px 0; background: #fff8e1; border-right: 4px solid #D4AF37; padding: 8px 12px; border-radius: 4px; color: #5b4a12; font-weight: 600; }
  .table-wrap { margin: 6px 0 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  thead { display: table-header-group; }
  th { background: #0c1e3d; color: #F1E5C6; font-weight: 800; padding: 6px 8px; text-align: right; border: 1px solid #0c1e3d; }
  td { padding: 5px 8px; border: 1px solid #e5e7eb; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #faf8f1; }
  tr { break-inside: avoid; }
  .footer-note { margin-top: 22px; padding-top: 8px; border-top: 1px solid #D4AF37; font-size: 9px; color: #6b7280; display: flex; justify-content: space-between; gap: 12px; }
  @media screen { body { max-width: 794px; margin: 0 auto; padding: 24px; background: #fff; } }
`;

export function buildReportHtml(opts: ReportOptions, origin: string, now: Date = new Date()): string {
  const dateStr = now.toLocaleDateString("ar-EG-u-nu-latn", { year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("ar-EG-u-nu-latn", { hour: "2-digit", minute: "2-digit" });
  const refNo = "GD-" + now.toISOString().slice(0, 10).replace(/-/g, "") + "-" + String(now.getHours()).padStart(2, "0") + String(now.getMinutes()).padStart(2, "0");

  const metaItems = [
    ...(opts.meta || []),
    { label: "تاريخ الإصدار", value: dateStr },
    { label: "رقم التقرير", value: refNo }
  ];

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>${escapeHtml(opts.title)} - ${escapeHtml(dateStr)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <img src="${origin}/logo.png" alt="logo">
      <div>
        <div class="ar">${COMPANY_NAME_AR}</div>
        <div class="en">${COMPANY_NAME_EN}</div>
        <div class="tag">${COMPANY_TAGLINE}</div>
      </div>
    </div>
    <div class="doc-type"><strong>OFFICIAL REPORT</strong><br>${escapeHtml(timeStr)} · ${escapeHtml(dateStr)}</div>
  </div>

  <div class="title-block">
    <h1>${escapeHtml(opts.title)}</h1>
    ${opts.subtitle ? `<div class="sub">${escapeHtml(opts.subtitle)}</div>` : ""}
  </div>

  <div class="meta">
    ${metaItems.map((m) => `<div class="item"><div class="l">${escapeHtml(m.label)}</div><div class="v">${escapeHtml(m.value)}</div></div>`).join("")}
  </div>

  <div class="content">
    ${markdownToHtml(opts.markdown)}
  </div>

  <div class="footer-note">
    <span>صدر هذا التقرير آلياً من نظام إدارة ${COMPANY_NAME_AR}، ويُراجع من المهندس المختص قبل الاعتماد.</span>
    <span>${COMPANY_NAME_EN}</span>
  </div>

  <script>
    (function () {
      var printed = false;
      function go() { if (printed) return; printed = true; setTimeout(function () { window.focus(); window.print(); }, 250); }
      var ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
      var img = document.querySelector('.brand img');
      var imgReady = new Promise(function (r) { if (!img || img.complete) return r(); img.onload = r; img.onerror = r; });
      Promise.all([ready, imgReady]).then(go);
      setTimeout(go, 4000);
    })();
  </script>
</body>
</html>`;
}

// يفتح نافذة التقرير ويبدأ الطباعة (حفظ كـ PDF). يجب استدعاؤها من ضغطة زر مباشرة.
export function openReportPdf(opts: ReportOptions): void {
  const html = buildReportHtml(opts, window.location.origin);
  const w = window.open("", "_blank");
  if (!w) {
    alert("المتصفح منع فتح نافذة التقرير. اسمح بالنوافذ المنبثقة لهذا الموقع ثم اضغط تصدير PDF مرة أخرى.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}