import { useState, useRef, useEffect } from "react";
import { Gauge, Check } from "lucide-react";

interface SpeedSelectorProps {
  currentSpeed: number;
  onSelectSpeed: (speed: number) => void;
}

const SPEED_OPTIONS = [
  { value: 0.75, label: "০.৭৫x", hint: "ধীর" },
  { value: 1.0, label: "১.০x", hint: "স্বাভাবিক (Normal)" },
  { value: 1.25, label: "১.২৫x", hint: "দ্রুত" },
  { value: 1.5, label: "১.৫x", hint: "দেড় গুণ" },
  { value: 2.0, label: "২.০x", hint: "দ্বিগুণ" },
];

export function SpeedSelector({
  currentSpeed,
  onSelectSpeed,
}: SpeedSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-mono-retro font-bold transition-all cursor-pointer border ${
          currentSpeed !== 1.0
            ? "bg-[#ffc665]/15 border-[#ffc665] text-[#ffc665] shadow-sm shadow-[#ffc665]/20"
            : "bg-[#201f21] border-[#504535]/40 text-[#d4c4b0] hover:text-[#ffc665] hover:border-[#ffc665]/50"
        }`}
        title="প্লেব্যাক গতি নির্বাচন করুন (Playback Speed)"
      >
        <Gauge className="w-3.5 h-3.5" />
        <span>{currentSpeed}x</span>
      </button>

      {/* Upward Popover Menu */}
      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 w-48 bg-[#141315] border border-[#504535]/60 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
          <div className="px-2.5 py-1.5 border-b border-[#504535]/30 mb-1 flex items-center justify-between">
            <span className="font-mono-retro text-[10px] text-[#9d8f7c] uppercase tracking-wider">
              প্লেব্যাক গতি (Speed)
            </span>
            <span className="font-mono-retro text-[10px] text-[#ffc665]">
              {currentSpeed}x
            </span>
          </div>

          <div className="space-y-0.5">
            {SPEED_OPTIONS.map((opt) => {
              const isSelected = currentSpeed === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    onSelectSpeed(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono-retro transition cursor-pointer ${
                    isSelected
                      ? "bg-[#ffc665]/15 text-[#ffc665] font-bold"
                      : "text-[#d4c4b0] hover:bg-[#201f21] hover:text-[#e6e1e4]"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-bold">{opt.label}</span>
                    <span className="text-[10px] text-[#9d8f7c]">
                      {opt.hint}
                    </span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#ffc665]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
