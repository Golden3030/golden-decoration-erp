import React from "react";

// زرار النظام الموحد (كحلي بحدود وإضاءة ذهبية)، نفس تصميم أزرار باقي صفحات البرنامج.
// الاستخدام:
//   زرار عادي:      <GoldButton onClick={...}>حفظ</GoldButton>
//   زرار اختيار:    <GoldButton toggle active={x === "a"} size="fill" onClick={...}>خيار</GoldButton>
// لو غيّرت تصميم الأزرار مستقبلاً، غيّره هنا فقط.

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  toggle?: boolean;               // زرار اختيار (له حالة مفعّل / غير مفعّل)
  active?: boolean;               // يُستخدم مع toggle فقط
  size?: "md" | "lg" | "fill";    // fill = يملأ عرض العمود
};

const BASE =
  "relative overflow-hidden flex items-center justify-center gap-1.5 rounded-xl border-2 text-xs font-black select-none transition-all duration-300 active:scale-95 disabled:opacity-40 cursor-pointer";

const SIZES = {
  md: "h-11 px-6",
  lg: "h-12 px-8",
  fill: "h-11 w-full px-3"
};

const ON =
  "bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:scale-[1.01]";

const OFF =
  "bg-[#020B1C] text-gray-400 border-[#243556] hover:border-[#D4AF37]/60 hover:text-[#D4AF37]";

export default function GoldButton({
  toggle = false,
  active = true,
  size = "md",
  className = "",
  type = "button",
  children,
  ...rest
}: Props) {
  const selected = !toggle || active;
  return (
    <button type={type} {...rest} className={`${BASE} ${SIZES[size]} ${selected ? ON : OFF} ${className}`}>
      {children}
      {selected && (
        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_-1px_6px_rgba(212,175,55,0.8)]" />
      )}
    </button>
  );
}