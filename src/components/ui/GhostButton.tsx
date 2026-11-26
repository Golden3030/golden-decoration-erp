import React from "react";

// زرار ثانوي خفيف (نص ذهبي بدون إطار) للإجراءات الجانبية زي "جرّب مثال"، عشان الزرار الأساسي هو الوحيد الظاهر بقوة.
type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function GhostButton({ className = "", type = "button", children, ...rest }: Props) {
  return (
    <button
      type={type}
      {...rest}
      className={`inline-flex items-center gap-1 text-[11px] font-bold text-[#D4AF37] hover:underline underline-offset-4 px-1 py-1 cursor-pointer disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}