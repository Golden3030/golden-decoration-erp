"use client";

// مفتاح تشغيل وإطفاء بدل الـ Check box: ذهبي منوّر لما يكون مختار، وداكن مطفي لما يتلغي
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;       // يظهر بجانب المفتاح
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

export default function ToggleSwitch({ checked, onChange, label, ariaLabel, disabled, className = "" }: ToggleSwitchProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full border transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60 disabled:opacity-40 ${
          checked
            ? "bg-[#D4AF37] border-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.55)]"
            : "bg-[#0b1736] border-[#1f2d4d]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4.5 w-4.5 rounded-full transition-all duration-200 ${
            checked ? "right-0.5 bg-[#020B1C]" : "right-5 bg-gray-500"
          }`}
        />
      </button>
      {label && <span className={`text-xs font-bold ${checked ? "text-white" : "text-gray-500"}`}>{label}</span>}
    </span>
  );
}