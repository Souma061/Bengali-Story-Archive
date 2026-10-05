import { useEffect, useState, useMemo } from "react";
import {
  Radio,
  Search,
  X,
  Clock,
  Play,
  Pause,
  Shuffle,
  Volume2,
  VolumeX,
  ExternalLink,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Headphones,
  Award,
  BookOpen,
} from "lucide-react";
import type { Story, CollectionItem } from "./types";
import { getStaticStories, getStaticCollections } from "./staticData";
import { YouTubeAudioEngine } from "./components/YouTubeAudioEngine";
import { SearchModal } from "./components/SearchModal";

// Format seconds into MM:SS or H:MM:SS
function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}:${remMins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function App() {
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [seekTime, setSeekTime] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [kolkataTime, setKolkataTime] = useState<string>("কলকাতা • 11:45 PM");

  // Global Keyboard Shortcuts (Ctrl+K or / to open Search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      } else if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Live Kolkata clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const istTime = new Date(utc + 3600000 * 5.5);
      let hours = istTime.getHours();
      const minutes = istTime.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      setKolkataTime(`কলকাতা • ${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch stories & collections
  useEffect(() => {
    fetch("/api/collections")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.collections?.length > 0) setCollections(data.collections);
        else setCollections(getStaticCollections());
      })
      .catch(() => setCollections(getStaticCollections()));

    fetch("/api/stories?limit=600")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.stories?.length > 0) {
          setAllStories(data.stories);
          setCurrentStory((prev) => prev || data.stories[0]);
        } else {
          const fallback = getStaticStories();
          setAllStories(fallback);
          setCurrentStory((prev) => prev || fallback[0]);
        }
      })
      .catch(() => {
        const fallback = getStaticStories();
        setAllStories(fallback);
        setCurrentStory((prev) => prev || fallback[0]);
      });
  }, []);

  // Filtered stories for catalogue with smart aliases
  const filteredStories = useMemo(() => {
    let list = allStories;
    if (selectedCategory !== "all") {
      list = list.filter((s) => s.characterSeries === selectedCategory);
    }
    if (searchQuery.trim()) {
      const terms = searchQuery.toLowerCase().trim().split(/\s+/);
      list = list.filter((s) => {
        const text =
          `${s.title} ${s.cleanTitle} ${s.author || ""} ${s.characterSeries || ""} ${s.collection}`.toLowerCase();
        return terms.every((t) => text.includes(t));
      });
    }
    return list;
  }, [allStories, selectedCategory, searchQuery]);

  // Audio Playback Controls
  const handleSelectStory = (story: Story) => {
    setCurrentStory(story);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(story.durationSeconds || 0);
  };

  const handleTogglePlay = () => {
    if (!currentStory && allStories.length > 0) {
      handleSelectStory(allStories[0]);
      return;
    }
    setIsPlaying(!isPlaying);
  };

  const handleNextStory = () => {
    if (!currentStory || allStories.length === 0) return;
    const currentIndex = allStories.findIndex((s) => s.id === currentStory.id);
    const nextIndex = (currentIndex + 1) % allStories.length;
    handleSelectStory(allStories[nextIndex]);
  };

  const handlePrevStory = () => {
    if (!currentStory || allStories.length === 0) return;
    const currentIndex = allStories.findIndex((s) => s.id === currentStory.id);
    const prevIndex =
      (currentIndex - 1 + allStories.length) % allStories.length;
    handleSelectStory(allStories[prevIndex]);
  };

  const handleTuneRandom = () => {
    if (allStories.length === 0) return;
    const randomIndex = Math.floor(Math.random() * allStories.length);
    handleSelectStory(allStories[randomIndex]);
  };

  const handleSeek = (seconds: number) => {
    setCurrentTime(seconds);
    setSeekTime(seconds);
    setTimeout(() => setSeekTime(null), 100);
  };

  const handleSkip = (delta: number) => {
    const target = Math.max(0, Math.min(duration || 3600, currentTime + delta));
    handleSeek(target);
  };

  const progressPercent =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col font-sans text-[#e6e1e4] pb-32">
      {/* Background YouTube Audio Engine (Audio-only, no video box) */}
      <YouTubeAudioEngine
        youtubeId={currentStory?.youtubeId || null}
        isPlaying={isPlaying}
        volume={isMuted ? 0 : volume}
        seekTime={seekTime}
        onTimeUpdate={(curr, dur) => {
          setCurrentTime(curr);
          if (dur > 0) setDuration(dur);
        }}
        onStateChange={(playing) => setIsPlaying(playing)}
        onEnded={handleNextStory}
      />

      {/* ========================================== */}
      {/* 1. TOP NAV BAR (Stitch Design)             */}
      {/* ========================================== */}
      <header className="bg-[#0f0e10]/85 backdrop-blur-md sticky top-0 z-40 border-b border-[#504535]/30 shadow-2xl">
        <div className="flex justify-between items-center w-full px-6 lg:px-10 max-w-7xl mx-auto h-20">
          {/* Brand & Vintage Indicator */}
          <div className="flex items-center space-x-4">
            <div
              className="flex items-center space-x-3 group cursor-pointer"
              onClick={() => setSelectedCategory("all")}
            >
              <div className="w-10 h-10 rounded-full bg-[#201f21] border border-[#504535]/50 flex items-center justify-center text-[#ffc665] group-hover:border-[#ffc665]/60 transition-all shadow-inner">
                <Radio className="w-5 h-5 text-[#ffc665]" />
              </div>
              <div>
                <span className="text-xl font-serif-bengali font-bold text-[#ffc665] tracking-wide block">
                  গল্প ঘর (Golpo Ghar)
                </span>
                <span className="hidden lg:block font-mono-retro text-[9px] text-[#9d8f7c] tracking-widest uppercase">
                  Radio Drama & Mystery Archive
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 font-mono-retro text-xs">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`pb-1 transition-colors cursor-pointer ${
                selectedCategory === "all"
                  ? "text-[#ffc665] font-bold border-b-2 border-[#ffc665]"
                  : "text-[#d4c4b0] hover:text-[#e6e1e4]"
              }`}
            >
              সব গল্প
            </button>
            <button
              onClick={() => setSelectedCategory("feluda")}
              className={`pb-1 transition-colors cursor-pointer ${
                selectedCategory === "feluda"
                  ? "text-[#ffc665] font-bold border-b-2 border-[#ffc665]"
                  : "text-[#d4c4b0] hover:text-[#e6e1e4]"
              }`}
            >
              ফেলুদা
            </button>
            <button
              onClick={() => setSelectedCategory("byomkesh")}
              className={`pb-1 transition-colors cursor-pointer ${
                selectedCategory === "byomkesh"
                  ? "text-[#ffc665] font-bold border-b-2 border-[#ffc665]"
                  : "text-[#d4c4b0] hover:text-[#e6e1e4]"
              }`}
            >
              ব্যোমকেশ
            </button>
            <button
              onClick={() => setSelectedCategory("professor_shonku")}
              className={`pb-1 transition-colors cursor-pointer ${
                selectedCategory === "professor_shonku"
                  ? "text-[#ffc665] font-bold border-b-2 border-[#ffc665]"
                  : "text-[#d4c4b0] hover:text-[#e6e1e4]"
              }`}
            >
              প্রফেসর শঙ্কু
            </button>
            <button
              onClick={() => setSelectedCategory("sherlock_holmes")}
              className={`pb-1 transition-colors cursor-pointer ${
                selectedCategory === "sherlock_holmes"
                  ? "text-[#ffc665] font-bold border-b-2 border-[#ffc665]"
                  : "text-[#d4c4b0] hover:text-[#e6e1e4]"
              }`}
            >
              শার্লক হোমস
            </button>
          </nav>

          {/* Trailing Controls: Search, Frequency, Realtime Kolkata Clock, Tune Mystery */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Quick Search Button (opens Command Palette) */}
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-[#201f21] hover:bg-[#2b292c] border border-[#504535]/40 text-xs font-mono-retro text-[#d4c4b0] hover:text-[#ffc665] transition-all cursor-pointer shadow-sm"
              title="সার্চ করুন (Ctrl + K)"
            >
              <Search className="w-3.5 h-3.5 text-[#ffc665]" />
              <span className="hidden sm:inline">খুঁজুন</span>
              <kbd className="hidden md:inline px-1.5 py-0.2 rounded bg-[#0f0e10] border border-[#504535]/30 text-[10px] text-[#9d8f7c]">
                ⌘K
              </kbd>
            </button>

            {/* Frequency Dial Badge */}
            <div className="hidden xl:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#1c1b1d] border border-[#504535]/30 font-mono-retro text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-[#ffc665] animate-pulse" />
              <span className="text-[#ddcdae]">Hi-Fi 98.3 MHz</span>
            </div>

            {/* Real-time Kolkata Clock */}
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#201f21] border border-[#504535]/40 font-mono-retro text-xs text-[#e6e1e4]">
              <Clock className="w-3.5 h-3.5 text-[#ffc665]" />
              <span className="tracking-wider">{kolkataTime}</span>
            </div>

            {/* Tune Mystery Button */}
            <button
              onClick={handleTuneRandom}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#e5a93c] text-[#5e4000] font-mono-retro text-xs font-bold hover:bg-[#ffc665] transition-all active:scale-95 shadow-md shadow-[#e5a93c]/20 cursor-pointer"
            >
              <Shuffle className="w-4 h-4" />
              <span className="hidden sm:inline">Tune Mystery</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================== */}
      {/* MAIN EDITORIAL CANVAS                      */}
      {/* ========================================== */}
      <main className="w-full max-w-7xl mx-auto px-6 lg:px-10 pt-8 space-y-12">
        {/* Sub-Ticker Frequency Line */}
        <div className="w-full bg-[#0f0e10]/60 border border-[#504535]/20 rounded-lg p-3 flex flex-wrap justify-between items-center font-mono-retro text-xs text-[#d4c4b0] gap-3">
          <div className="flex items-center space-x-3">
            <span className="px-2 py-0.5 rounded bg-[#8f191f] text-[#ff9e99] text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
              অন-এয়ার
            </span>
            <span className="text-[#ddcdae] font-serif-bengali text-xs">
              বাংলা ও বিশ্বসাহিত্যের কিছু রোমাঞ্চকর গল্প দিয়ে সাজানো আমাদের এই
              বিশেষ নিবেদন—সানডে সাসপেন্স।
            </span>
          </div>
          <div className="flex items-center space-x-6 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="text-[#ffc665] font-bold">৩২০ Kbps</span> স্টুডিও
              এনালগ মাস্টার
            </span>
            <span className="text-[#9d8f7c]">|</span>
            <span className="flex items-center gap-1">
              <span className="text-[#ffc665] font-bold">ডলবি B</span> নয়েজ
              রিডাকশন
            </span>
          </div>
        </div>

        {/* ========================================== */}
        {/* SECTION 1: HERO SPOTLIGHT (Cassette Hybrid)*/}
        {/* ========================================== */}
        {currentStory && (
          <section className="relative w-full rounded-xl bg-[#1c1b1d] border border-[#504535]/30 overflow-hidden shadow-2xl p-6 lg:p-10">
            {/* Ambient Tube Backlight */}
            <div className="absolute -top-24 right-1/4 w-96 h-96 bg-[#e5a93c]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 left-10 w-80 h-80 bg-[#8f191f]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              {/* Left: Cassette Shell & Tape Spools */}
              <div className="lg:col-span-6 relative">
                <div className="w-full max-w-lg mx-auto bg-[#0f0e10] rounded-xl p-5 border border-[#504535]/50 shadow-2xl relative group">
                  {/* Cassette Screws */}
                  <div className="absolute top-2 left-2 text-[10px] text-[#9d8f7c] opacity-40 font-mono">
                    ✛
                  </div>
                  <div className="absolute top-2 right-2 text-[10px] text-[#9d8f7c] opacity-40 font-mono">
                    ✛
                  </div>
                  <div className="absolute bottom-2 left-2 text-[10px] text-[#9d8f7c] opacity-40 font-mono">
                    ✛
                  </div>
                  <div className="absolute bottom-2 right-2 text-[10px] text-[#9d8f7c] opacity-40 font-mono">
                    ✛
                  </div>

                  {/* Tape Label Sticker */}
                  <div className="bg-[#f1e1c0] text-[#221b07] rounded p-4 border border-[#504535]/60 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start border-b border-[#221b07]/20 pb-2">
                      <div>
                        <span className="font-mono-retro text-[10px] text-[#50462e] uppercase tracking-wider block">
                          রেডিও সাসপেন্স স্পেশাল • সাইড A
                        </span>
                        <h3 className="font-serif-bengali text-xl sm:text-2xl font-bold text-[#221b07] leading-tight mt-0.5">
                          {currentStory.cleanTitle || currentStory.title}
                        </h3>
                        <p className="text-xs text-[#50462e] italic mt-0.5">
                          {currentStory.author || "Sunday Suspense Archive"}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="inline-block border border-[#221b07]/40 px-1.5 py-0.5 text-[9px] font-mono-retro font-bold uppercase rounded">
                          DOLBY SYSTEM
                        </div>
                        <span className="block text-[10px] font-mono-retro text-[#50462e] mt-1">
                          C-90 CHROME
                        </span>
                      </div>
                    </div>

                    {/* Tape Window & Spool Wheels */}
                    <div className="mt-4 bg-[#0f0e10] rounded-lg p-3 flex justify-between items-center border border-[#504535]/30">
                      {/* Left Spool */}
                      <div
                        className={`w-16 h-16 rounded-full bg-[#141315] border-4 border-[#504535]/40 flex items-center justify-center relative shadow-inner ${isPlaying ? "animate-spin-slow" : ""}`}
                      >
                        <div className="w-6 h-6 rounded-full bg-[#363436] border border-[#ffc665]/40 flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ffc665]" />
                        </div>
                        <div className="absolute w-full h-0.5 bg-[#504535]/30" />
                        <div className="absolute h-full w-0.5 bg-[#504535]/30" />
                      </div>

                      {/* Tape Gauge Ruler */}
                      <div className="flex-1 px-4 flex flex-col items-center">
                        <div className="w-full flex justify-between text-[9px] font-mono-retro text-[#9d8f7c] mb-1">
                          <span>100</span>
                          <span>50</span>
                          <span>0</span>
                        </div>
                        <div className="w-full h-3 bg-[#2b292c] rounded-full overflow-hidden p-0.5 border border-[#504535]/20 flex">
                          <div
                            className="h-full bg-amber-900/80 rounded-l transition-all duration-300"
                            style={{
                              width: `${Math.max(15, 100 - progressPercent)}%`,
                            }}
                          />
                          <div className="h-full bg-transparent flex-1 border-l border-[#9d8f7c]/40" />
                        </div>
                        <span className="text-[9px] font-mono-retro text-[#ffc665] mt-1 tracking-widest">
                          {currentStory.duration} • AUDIO TAPE
                        </span>
                      </div>

                      {/* Right Spool */}
                      <div
                        className={`w-16 h-16 rounded-full bg-[#141315] border-4 border-[#504535]/40 flex items-center justify-center relative shadow-inner ${isPlaying ? "animate-spin-mid" : ""}`}
                      >
                        <div className="w-6 h-6 rounded-full bg-[#363436] border border-[#ffc665]/40 flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ffc665]" />
                        </div>
                        <div className="absolute w-full h-0.5 bg-[#504535]/30" />
                        <div className="absolute h-full w-0.5 bg-[#504535]/30" />
                      </div>
                    </div>

                    {/* J-Card Details */}
                    <div className="mt-3 flex justify-between items-center font-mono-retro text-xs text-[#50462e] pt-2 border-t border-[#221b07]/15">
                      <span className="flex items-center gap-1">
                        <Headphones className="w-3.5 h-3.5 text-[#221b07]" />{" "}
                        কণ্ঠ: রেডিও মিরচি বাংলা
                      </span>
                      <span className="font-bold text-[#221b07]">
                        {currentStory.duration}
                      </span>
                    </div>
                  </div>

                  {/* Tape Trapdoor */}
                  <div className="mt-3 w-40 mx-auto h-3 bg-[#2b292c] rounded-t-sm border-t border-x border-[#504535]/30" />
                </div>
              </div>

              {/* Right: Story Narrative & Actions */}
              <div className="lg:col-span-6 space-y-6">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="px-2.5 py-1 rounded bg-[#8f191f] text-[#ffdad7] font-mono-retro text-[10px] uppercase font-bold tracking-wider">
                    নির্বাচিত রহস্য
                  </span>
                  <span className="px-2.5 py-1 rounded bg-[#2b292c] text-[#ddcdae] font-mono-retro text-[10px] border border-[#504535]/30">
                    {currentStory.characterSeries
                      ? collections.find(
                          (c) => c.slug === currentStory.characterSeries,
                        )?.bengali || currentStory.characterSeries
                      : currentStory.collection}
                  </span>
                  <span className="px-2.5 py-1 rounded bg-[#2b292c] text-[#ffc665] font-mono-retro text-[10px] border border-[#504535]/30">
                    Sunday Suspense Archive
                  </span>
                </div>

                <div>
                  <h1 className="font-serif-bengali text-3xl sm:text-4xl font-bold text-[#e6e1e4] tracking-tight leading-snug">
                    {currentStory.cleanTitle}
                  </h1>
                  <p className="font-serif-bengali text-lg text-[#9d8f7c] mt-2 font-normal">
                    {currentStory.author
                      ? `মূল কাহিনী: ${currentStory.author}`
                      : currentStory.title}
                  </p>
                </div>

                <p className="text-sm text-[#d4c4b0] leading-relaxed italic border-l-2 border-[#e5a93c] pl-3 py-0.5 font-serif-bengali">
                  "বাংলা ও বিশ্বসাহিত্যের কিছু রোমাঞ্চকর গল্প দিয়ে সাজানো আমাদের এই বিশেষ নিবেদন—সানডে সাসপেন্স।"
                </p>

                {/* Cast Card */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-lg bg-[#201f21] border border-[#504535]/20 text-xs">
                  <div>
                    <span className="block font-mono-retro text-[10px] text-[#9d8f7c]">
                      প্রধান কণ্ঠ ও উপস্থাপন
                    </span>
                    <span className="font-semibold text-[#e6e1e4]">
                      রেডিও মিরচি টিম
                    </span>
                  </div>
                  <div>
                    <span className="block font-mono-retro text-[10px] text-[#9d8f7c]">
                      শ্রেণী ও ধারা
                    </span>
                    <span className="font-semibold text-[#e6e1e4]">
                      {currentStory.characterSeries
                        ? currentStory.characterSeries.replace("_", " ")
                        : "রহস্য"}
                    </span>
                  </div>
                  <div>
                    <span className="block font-mono-retro text-[10px] text-[#9d8f7c]">
                      সময়সীমা
                    </span>
                    <span className="font-semibold text-[#ffc665]">
                      {currentStory.duration}
                    </span>
                  </div>
                </div>

                {/* Primary Play Action & Buttons */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    onClick={handleTogglePlay}
                    className="flex items-center space-x-3 px-8 py-4 rounded-xl bg-[#e5a93c] text-[#5e4000] font-serif-bengali text-base font-bold glow-amber hover:bg-[#ffc665] active:scale-95 transition-all cursor-pointer"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current" />
                    )}
                    <span>
                      {isPlaying
                        ? "বিরতি দিন (Pause)"
                        : "এখনই শুনুন (Play Audio)"}
                    </span>
                  </button>

                  <button
                    onClick={handleNextStory}
                    className="flex items-center space-x-2 px-5 py-3.5 rounded-xl bg-[#2b292c] text-[#e6e1e4] border border-[#504535]/40 hover:border-[#ffc665]/50 hover:text-[#ffc665] transition-all active:scale-95 text-xs font-mono-retro cursor-pointer"
                  >
                    <span>ক্যাসেট বদলে নিন</span>
                  </button>

                  <a
                    href={currentStory.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-3.5 rounded-xl bg-[#8f191f]/60 hover:bg-[#8f191f] text-[#ffdad7] border border-[#ffb3ae]/20 text-xs font-mono-retro font-semibold transition cursor-pointer"
                    title="মূল ভিডিওটি YouTube-এ খুলুন"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>ইউটিউব লিংক</span>
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================== */}
        {/* SECTION 2: VINTAGE RADIO PUSH-BUTTON TABS */}
        {/* ========================================== */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-mono-retro text-[10px] text-[#ffc665] tracking-widest uppercase">
                তদন্ত বিভাগ ও ধারা নির্বাচন
              </span>
              <h2 className="font-serif-bengali text-2xl font-bold text-[#e6e1e4]">
                রহস্যের শ্রেণীবিভাগ (Detective & Shelf Archives)
              </h2>
            </div>
            <div className="hidden md:flex items-center space-x-2 font-mono-retro text-xs text-[#9d8f7c]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#504535]" />
              <span>টুনার সুইচ বাটন ক্লিক করুন</span>
            </div>
          </div>

          {/* Radio Push Buttons Strip */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 no-scrollbar">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`shrink-0 px-5 py-3 rounded-lg font-mono-retro text-xs font-bold border-b-4 transition-all flex items-center gap-2 cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-[#e5a93c] text-[#5e4000] border-[#5e4000]/40 shadow-md"
                  : "bg-[#201f21] text-[#e6e1e4] hover:text-[#ffc665] border-[#363436]"
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>সব রহস্য ({allStories.length})</span>
            </button>

            {collections.map((col) => (
              <button
                key={col.slug}
                onClick={() => setSelectedCategory(col.slug)}
                className={`shrink-0 px-5 py-3 rounded-lg font-mono-retro text-xs font-medium border-b-4 transition-all flex items-center gap-2 cursor-pointer ${
                  selectedCategory === col.slug
                    ? "bg-[#e5a93c] text-[#5e4000] border-[#5e4000]/40 shadow-md font-bold"
                    : "bg-[#201f21] text-[#e6e1e4] hover:text-[#ffc665] border-[#363436]"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#ffc665]" />
                <span>
                  {col.bengali} ({col.count})
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ========================================== */}
        {/* SECTION 3: BENTO GRID AUDIO DISCOVERY      */}
        {/* ========================================== */}
        <section className="space-y-6" id="all-stories">
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 border-b border-[#504535]/20 pb-4">
            <div>
              <span className="font-mono-retro text-xs text-[#9d8f7c] tracking-wider">
                রিসেন্টলি রিস্টোরড অডিওটেপ
              </span>
              <h3 className="font-serif-bengali text-2xl font-bold text-[#e6e1e4]">
                কালজয়ী অডিও নাটক ক্যাটালগ
              </h3>
            </div>

            {/* Card Catalogue Search Input with Result Count & Clear */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-2.5 text-[#9d8f7c] w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="গল্প বা লেখক খুঁজুন..."
                  className="w-full bg-[#0f0e10] border border-[#504535]/40 rounded-lg pl-9 pr-8 py-2 text-sm text-[#e6e1e4] focus:outline-none focus:border-[#ffc665] transition-colors placeholder:text-[#9d8f7c]/60"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-[#9d8f7c] hover:text-[#e6e1e4] transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Match count badge */}
              <span className="shrink-0 px-2.5 py-1.5 rounded-lg bg-[#201f21] border border-[#504535]/30 text-xs font-mono-retro text-[#ffc665]">
                {filteredStories.length} টি গল্প
              </span>
            </div>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStories.slice(0, 30).map((story, idx) => {
              const isCurrent = currentStory?.id === story.id;
              return (
                <div
                  key={story.id}
                  onClick={() => handleSelectStory(story)}
                  className={`story-card group relative bg-[#1c1b1d] rounded-xl border p-5 transition-all duration-300 hover:shadow-xl flex flex-col justify-between overflow-hidden cursor-pointer ${
                    isCurrent
                      ? "border-[#ffc665] shadow-lg shadow-[#ffc665]/10"
                      : "border-[#504535]/30 hover:border-[#ffc665]/50"
                  }`}
                >
                  {/* Vinyl Disc peek out on top-right */}
                  <div className="absolute -right-12 -top-12 w-36 h-36 rounded-full vinyl-grooves border-2 border-[#504535]/40 flex items-center justify-center group-hover:-translate-y-2 group-hover:translate-x-2 transition-transform duration-500 shadow-2xl opacity-75">
                    <div className="w-12 h-12 rounded-full bg-[#e5a93c]/90 border border-[#5e4000] flex items-center justify-center text-[8px] font-mono-retro text-[#5e4000] font-bold">
                      SS-{idx + 1}
                    </div>
                  </div>

                  <div>
                    {/* Top Badges */}
                    <div className="flex justify-between items-center mb-3">
                      <span className="px-2 py-0.5 rounded bg-[#363436] text-[#ffc665] font-mono-retro text-[10px] border border-[#504535]/30 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ffc665]" />
                        {story.characterSeries
                          ? collections.find(
                              (c) => c.slug === story.characterSeries,
                            )?.bengali || story.characterSeries
                          : story.collection}
                      </span>
                      <span className="font-mono-retro text-[10px] text-[#9d8f7c]">
                        ক্যাসেট #SS-{idx + 101}
                      </span>
                    </div>

                    {/* Title & Author */}
                    <h4 className="font-serif-bengali text-lg font-bold text-[#e6e1e4] group-hover:text-[#ffc665] transition-colors line-clamp-2">
                      {story.cleanTitle}
                    </h4>
                    <p className="text-xs text-[#9d8f7c] mt-0.5 truncate">
                      {story.author || "Sunday Suspense Audio Drama"}
                    </p>
                  </div>

                  {/* Bottom Audio Meta & Action */}
                  <div className="mt-6 pt-4 border-t border-[#504535]/20 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-1.5 font-mono-retro text-xs text-[#ddcdae]">
                        <Clock className="w-3.5 h-3.5 text-[#ffc665]" />
                        <span>{story.duration}</span>
                      </div>
                      <span className="block text-[11px] text-[#9d8f7c]">
                        কণ্ঠ: মিরচি বাংলা
                      </span>
                    </div>

                    {/* Play Button Trigger */}
                    <button
                      className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all active:scale-90 shadow ${
                        isCurrent && isPlaying
                          ? "bg-[#e5a93c] text-[#5e4000] border-[#ffc665]"
                          : "bg-[#2b292c] border-[#504535]/40 text-[#ffc665] group-hover:bg-[#e5a93c] group-hover:text-[#5e4000]"
                      }`}
                    >
                      {isCurrent && isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5 fill-current" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================== */}
        {/* SECTION 4: VINTAGE CASSETTE CARE & ARCHIVE */}
        {/* ========================================== */}
        <section className="bg-[#201f21] rounded-xl p-6 lg:p-8 border border-[#504535]/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-lg bg-[#2b292c] border border-[#504535]/40 flex items-center justify-center text-[#ffc665] shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif-bengali text-base font-bold text-[#e6e1e4]">
                  এনালগ থেকে ডিজিটাল মাস্টার
                </h4>
                <p className="text-xs text-[#9d8f7c] mt-1">
                  আসল ম্যাগনেটিক ফিতা থেকে সরাসরি ২৪-বিট ৯৬kHz রেজোলিউশনে
                  মাস্টার্ড সাউন্ডট্র্যাক।
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-lg bg-[#2b292c] border border-[#504535]/40 flex items-center justify-center text-[#ffc665] shrink-0">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif-bengali text-base font-bold text-[#e6e1e4]">
                  থ্রিডি বাইনরাল সাউন্ডস্কেপ
                </h4>
                <p className="text-xs text-[#9d8f7c] mt-1">
                  হেডফোন ব্যবহার করে অনুভব করুন বর্ষার বৃষ্টি, রহস্যময় পদশব্দ
                  কিংবা রাতের ট্রেনের অবিরাম কু ঝিক ঝিক।
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-lg bg-[#2b292c] border border-[#504535]/40 flex items-center justify-center text-[#ffc665] shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif-bengali text-base font-bold text-[#e6e1e4]">
                  আসল সাহিত্যের প্রতি বিশ্বস্ত
                </h4>
                <p className="text-xs text-[#9d8f7c] mt-1">
                  মূল কাহিনীর প্রতিটি চমক ও আবেগ অবিকৃত রেখে অসামান্য ক্লাসিক
                  রেডিও ড্রামা বিন্যাস।
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================== */}
      {/* FOOTER                                     */}
      {/* ========================================== */}
      <footer className="w-full border-t border-[#504535]/20 mt-16 mb-20 bg-[#0f0e10]">
        <div className="flex flex-col md:flex-row justify-between items-center w-full px-6 lg:px-10 py-8 max-w-7xl mx-auto gap-4">
          <div className="text-center md:text-left">
            <h5 className="font-serif-bengali text-base font-semibold text-[#ffc665] mb-1">
              গল্প ঘর (Golpo Ghar)
            </h5>
            <p className="text-xs text-[#d4c4b0]">
              © গল্প ঘর (Golpo Ghar) — Vintage Bengali Audio Drama & Radio
              Mystery Archive. Kolkata 700001.
            </p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-6 text-xs text-[#d4c4b0]">
            <span className="hover:text-[#ffc665] cursor-pointer">
              আর্কাইভ (Archive)
            </span>
            <span className="hover:text-[#ffc665] cursor-pointer">
              সম্প্রচার নির্দেশিকা
            </span>
            <span className="hover:text-[#ffc665] cursor-pointer">
              কপিরাইট ও সূত্র
            </span>
          </div>
        </div>
      </footer>

      {/* ========================================== */}
      {/* 5. BOTTOM FLOATING AUDIO PLAYER DOCK (FIXED)*/}
      {/* ========================================== */}
      {currentStory && (
        <aside className="fixed bottom-0 left-0 right-0 z-50 bg-[#1A191C]/92 backdrop-blur-xl border-t border-[#ffc665]/20 shadow-2xl">
          {/* Glowing Cathode Light Guide Filament Line */}
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#e5a93c] to-transparent opacity-60" />

          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Left: Mini Vinyl & Track Info */}
            <div className="flex items-center space-x-3 w-full md:w-1/4">
              <div
                className={`w-12 h-12 rounded-full vinyl-grooves border border-[#ffc665]/40 flex items-center justify-center shrink-0 shadow-lg ${
                  isPlaying ? "animate-spin-slow" : ""
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-[#e5a93c] border border-black flex items-center justify-center">
                  <span className="w-1 h-1 rounded-full bg-black" />
                </div>
              </div>
              <div className="truncate">
                <div className="flex items-center space-x-2">
                  <h6 className="font-serif-bengali text-sm font-bold text-[#e6e1e4] truncate">
                    {currentStory.cleanTitle}
                  </h6>
                  <span className="px-1.5 py-0.2 rounded bg-[#201f21] text-[9px] font-mono-retro text-[#ffc665] border border-[#504535]/30 shrink-0">
                    Hi-Fi 320k
                  </span>
                </div>
                <p className="text-[11px] text-[#9d8f7c] truncate mt-0.5">
                  {currentStory.author || "সানডে সাসপেন্স"}
                </p>
              </div>
            </div>

            {/* Center: Playback Controls & Filament Wave Scrubber */}
            <div className="flex flex-col items-center w-full md:w-2/4 space-y-1.5">
              {/* Transport Buttons */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button
                  onClick={handlePrevStory}
                  className="text-[#9d8f7c] hover:text-[#ffc665] transition-colors cursor-pointer"
                  title="পূর্ববর্তী গল্প"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleSkip(-15)}
                  className="text-[#d4c4b0] hover:text-[#ffc665] transition-colors cursor-pointer"
                  title="১৫ সেকেন্ড পেছান"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Main Play / Pause Button with Glow Aura */}
                <button
                  onClick={handleTogglePlay}
                  className="w-10 h-10 rounded-full bg-[#e5a93c] text-[#5e4000] flex items-center justify-center glow-amber hover:bg-[#ffc665] transition-all active:scale-95 cursor-pointer"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5 fill-current" />
                  )}
                </button>

                <button
                  onClick={() => handleSkip(15)}
                  className="text-[#d4c4b0] hover:text-[#ffc665] transition-colors cursor-pointer"
                  title="১৫ সেকেন্ড এগোন"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextStory}
                  className="text-[#9d8f7c] hover:text-[#ffc665] transition-colors cursor-pointer"
                  title="পরবর্তী গল্প"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Scrubber and Times */}
              <div className="w-full flex items-center space-x-3 font-mono-retro text-xs text-[#9d8f7c]">
                <span className="w-10 text-right text-[#ffc665] text-[11px]">
                  {formatDuration(currentTime)}
                </span>

                {/* Filament Glow Scrubber Track */}
                <div className="flex-1 relative cursor-pointer group py-1 flex items-center">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={(e) => handleSeek(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#363436] rounded-full appearance-none cursor-pointer accent-[#ffc665] focus:outline-none"
                    style={{
                      background: `linear-gradient(to right, #ffc665 0%, #ffc665 ${progressPercent}%, rgba(255, 255, 255, 0.15) ${progressPercent}%, rgba(255, 255, 255, 0.15) 100%)`,
                    }}
                  />
                </div>

                <span className="w-10 text-[11px]">
                  {duration > 0
                    ? formatDuration(duration)
                    : currentStory.duration}
                </span>
              </div>
            </div>

            {/* Right: VU Equalizer, Volume, and YouTube Redirection */}
            <div className="flex items-center justify-end space-x-4 w-full md:w-1/4">
              {/* Live Equalizer Bars */}
              <div className="hidden sm:flex items-end space-x-1 h-5 px-2 bg-[#0f0e10]/80 rounded border border-[#504535]/30">
                <div
                  className={`w-1 bg-[#ffc665] rounded-t ${isPlaying ? "eq-bar-1" : "h-1"}`}
                />
                <div
                  className={`w-1 bg-[#e5a93c] rounded-t ${isPlaying ? "eq-bar-2" : "h-1.5"}`}
                />
                <div
                  className={`w-1 bg-[#ffc665] rounded-t ${isPlaying ? "eq-bar-3" : "h-2"}`}
                />
                <div
                  className={`w-1 bg-[#e5a93c] rounded-t ${isPlaying ? "eq-bar-4" : "h-1"}`}
                />
                <div
                  className={`w-1 bg-[#ffc665] rounded-t ${isPlaying ? "eq-bar-5" : "h-1.5"}`}
                />
              </div>

              {/* Volume Icon & Slider */}
              <div className="hidden lg:flex items-center space-x-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-[#9d8f7c] hover:text-[#ffc665] transition cursor-pointer"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setIsMuted(false);
                    setVolume(Number(e.target.value));
                  }}
                  className="w-16 h-1 bg-[#363436] rounded-full appearance-none cursor-pointer accent-[#ffc665]"
                />
              </div>

              {/* YouTube Redirect Button (Original external link without inline video) */}
              <a
                href={currentStory.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="মূল অডিওটি YouTube-এ শুনুন"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#8f191f]/90 hover:bg-[#8f191f] text-[#ffdad7] font-mono-retro text-xs font-bold transition-all shadow border border-[#ffb3ae]/20 hover:scale-105 shrink-0 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">YouTube-এ শুনুন</span>
              </a>
            </div>
          </div>
        </aside>
      )}

      {/* Global Command Palette / Spotlight Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        stories={allStories}
        onSelectStory={handleSelectStory}
        currentStoryId={currentStory?.id}
        isPlaying={isPlaying}
      />
    </div>
  );
}
