import { useState, useRef, useEffect } from "react";
import { Moon, Clock, Check, X } from "lucide-react";

export type SleepTimerOption = "off" | "15" | "30" | "45" | "60" | "end_of_story";

interface SleepTimerMenuProps {
  remainingSeconds: number | null;
  selectedOption: SleepTimerOption;
  onSelectOption: (option: SleepTimerOption) => void;
}

const TIMER_PRESETS: { value: SleepTimerOption; label: string; desc: string }[] = [
  { value: "15", label: "১৫ মিনিট", desc: "15 minutes" },
  { value: "30", label: "৩০ মিনিট", desc: "30 minutes" },
  { value: "45", label: "৪৫ মিনিট", desc: "45 minutes" },
  { value: "60", label: "৬০ মিনিট", desc: "1 hour" },
  { value: "end_of_story", label: "বর্তমান গল্প শেষে", desc: "End of current story" },
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SleepTimerMenu({
  remainingSeconds,
  selectedOption,
  onSelectOption,
}: SleepTimerMenuProps) {
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

  const isActive = selectedOption !== "off";

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-mono-retro font-bold transition-all cursor-pointer border ${
          isActive
            ? "bg-[#ffc665]/20 border-[#ffc665] text-[#ffc665] shadow-sm shadow-[#ffc665]/20 animate-pulse"
            : "bg-[#201f21] border-[#504535]/40 text-[#d4c4b0] hover:text-[#ffc665] hover:border-[#ffc665]/50"
        }`}
        title="ঘুমের টাইমার (Sleep Timer)"
      >
        <Moon className={`w-3.5 h-3.5 ${isActive ? "text-[#ffc665]" : "text-[#d4c4b0]"}`} />
        {isActive ? (
          <span className="font-mono-retro text-[11px] text-[#ffc665]">
            {remainingSeconds !== null
              ? formatTime(remainingSeconds)
              : "গল্প শেষে"}
          </span>
        ) : (
          <span className="hidden sm:inline text-[11px]">টাইমার</span>
        )}
      </button>

      {/* Upward Popover Menu */}
      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 w-56 bg-[#141315] border border-[#504535]/60 rounded-xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
          {/* Header */}
          <div className="px-2 py-1.5 border-b border-[#504535]/30 mb-2 flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-[#ffc665]">
              <Moon className="w-3.5 h-3.5" />
              <span className="font-serif-bengali text-xs font-bold text-[#e6e1e4]">
                ঘুমের টাইমার (Sleep Timer)
              </span>
            </div>
            {isActive && (
              <span className="w-2 h-2 rounded-full bg-[#ffc665] animate-ping" />
            )}
          </div>

          {/* Active Status Display */}
          {isActive && (
            <div className="mb-2 p-2 rounded-lg bg-[#201f21] border border-[#ffc665]/30 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-mono-retro text-[#ffc665]">
                <Clock className="w-3.5 h-3.5 animate-spin-slow" />
                <span>
                  {remainingSeconds !== null
                    ? `${formatTime(remainingSeconds)} অবশিষ্ট`
                    : "বর্তমান গল্প শেষে বন্ধ"}
                </span>
              </div>
              <button
                onClick={() => {
                  onSelectOption("off");
                  setIsOpen(false);
                }}
                className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-950/40 transition cursor-pointer"
                title="টাইমার বন্ধ করুন"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Options */}
          <div className="space-y-0.5">
            {TIMER_PRESETS.map((preset) => {
              const isSelected = selectedOption === preset.value;
              return (
                <button
                  key={preset.value}
                  onClick={() => {
                    onSelectOption(preset.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-serif-bengali transition cursor-pointer ${
                    isSelected
                      ? "bg-[#ffc665]/20 text-[#ffc665] font-bold"
                      : "text-[#d4c4b0] hover:bg-[#201f21] hover:text-[#e6e1e4]"
                  }`}
                >
                  <div className="flex flex-col text-left">
                    <span className="font-semibold">{preset.label}</span>
                    <span className="text-[10px] text-[#9d8f7c] font-mono-retro">
                      {preset.desc}
                    </span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#ffc665]" />}
                </button>
              );
            })}

            {isActive && (
              <button
                onClick={() => {
                  onSelectOption("off");
                  setIsOpen(false);
                }}
                className="w-full mt-1.5 flex items-center justify-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-serif-bengali text-red-300 hover:bg-red-950/40 border border-red-900/30 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>টাইমার বন্ধ করুন (Turn Off)</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
