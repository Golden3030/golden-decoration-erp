"use client";

// شريط تبويبات مضغوط (صف واحد بتمرير أفقي على الموبايل) بدل صفوف الأزرار الكبيرة.
// بنفس لغة تصميم أزرار النظام (كحلي بحدود وإضاءة ذهبية). لو غيّرت التصميم غيّره هنا فقط.
export interface TabOption<K extends string> {
  key: K;
  label: string;
  disabled?: boolean;   // مش متاح دلوقتي (يظهر بتلميح "قريباً")
}

interface Props<K extends string> {
  options: TabOption<K>[];
  value: K;
  onChange: (key: K) => void;
  size?: "md" | "sm";   // sm للتبويبات الفرعية
  ariaLabel?: string;
}

export default function SegmentedTabs<K extends string>({ options, value, onChange, size = "md", ariaLabel }: Props<K>) {
  const h = size === "sm" ? "h-8 px-3 text-[11px]" : "h-10 px-4 text-xs";
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex gap-1.5 overflow-x-auto whitespace-nowrap pb-1 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={o.disabled}
            onClick={() => !o.disabled && onChange(o.key)}
            className={`relative shrink-0 snap-start overflow-hidden rounded-xl border-2 font-black select-none transition-all duration-200 ${h} ${
              active
                ? "bg-gradient-to-b from-[#0c1e3d] to-[#040e20] text-[#D4AF37] border-[#D4AF37] shadow-[0_0_14px_rgba(212,175,55,0.3)]"
                : o.disabled
                  ? "bg-[#020B1C] text-gray-600 border-[#1a2644] cursor-not-allowed"
                  : "bg-[#020B1C] text-gray-400 border-[#243556] hover:border-[#D4AF37]/60 hover:text-[#D4AF37] cursor-pointer"
            }`}
          >
            {o.label}
            {o.disabled && <span className="mr-1.5 text-[9px] font-bold text-gray-600">قريباً</span>}
            {active && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-[#D4AF37] to-transparent" />
            )}
          </button>
        );
      })}
    </div>
  );
}