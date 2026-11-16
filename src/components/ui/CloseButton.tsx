import React from "react";
import { X } from "lucide-react";

// زرار إغلاق موحد للنوافذ المنبثقة (دائري كحلي بحدود ذهبية، ويحمر عند المرور بالماوس).
// لو غيّرت تصميم زرار الإغلاق مستقبلاً، غيّره هنا فقط.

type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function CloseButton({ className = "", type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      aria-label="إغلاق"
      {...rest}
      className={`w-9 h-9 rounded-full bg-[#020B1C] border-2 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.25)] hover:text-red-400 hover:border-red-400 hover:shadow-[0_0_16px_rgba(248,113,113,0.35)] active:scale-95 transition-all duration-300 flex items-center justify-center shrink-0 cursor-pointer ${className}`}
    >
      <X size={16} />
    </button>
  );
}