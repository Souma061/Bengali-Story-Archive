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
import { SpeedSelector } from "./components/SpeedSelector";
import { SleepTimerMenu, type SleepTimerOption } from "./components/SleepTimerMenu";
import {
  saveStoryProgress,
  getStoryProgress,
  getAllStoryProgress,
  clearStoryProgress,
  saveLastPlayedStoryId,
  getLastPlayedStoryId,
  type StoryProgress,
} from "./storage";

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
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [sleepTimerOption, setSleepTimerOption] = useState<SleepTimerOption>("off");
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const [sleepToastMessage, setSleepToastMessage] = useState<string | null>(null);
  const [resumeTime, setResumeTime] = useState<number>(0);
  const [storyProgressMap, setStoryProgressMap] = useState<Record<string, StoryProgress>>(() => getAllStoryProgress());
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

  // Fetch stories & collections + Restore last played session
  useEffect(() => {
    fetch("/api/collections")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.collections?.length > 0) setCollections(data.collections);
        else setCollections(getStaticCollections());
      })
      .catch(() => setCollections(getStaticCollections()));

    const initStories = (stories: Story[]) => {
      setAllStories(stories);
      const lastId = getLastPlayedStoryId();
      const matched = (lastId && stories.find((s) => s.id === lastId)) || stories[0];
      if (matched) {
        setCurrentStory(matched);
        const savedProg = getStoryProgress(matched.id);
        if (savedProg && savedProg.currentTime > 5) {
          setCurrentTime(savedProg.currentTime);
          setResumeTime(savedProg.currentTime);
          if (savedProg.duration) setDuration(savedProg.duration);
        } else {
          setDuration(matched.durationSeconds || 0);
        }
      }
    };

    fetch("/api/stories?limit=600")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.stories?.length > 0) {
          initStories(data.stories);
        } else {
          initStories(getStaticStories());
        }
      })
      .catch(() => {
        initStories(getStaticStories());
      });
  }, []);

  // Save exact timestamp whenever audio is paused
  useEffect(() => {
    if (!isPlaying && currentStory && currentTime > 3) {
      saveStoryProgress(currentStory.id, currentTime, duration);
      setStoryProgressMap(getAllStoryProgress());
    }
  }, [isPlaying]);

  // Periodic autosave every 5 seconds while playing
  useEffect(() => {
    if (!isPlaying || !currentStory || currentTime <= 3) return;
    const timer = setInterval(() => {
      saveStoryProgress(currentStory.id, currentTime, duration);
      setStoryProgressMap(getAllStoryProgress());
    }, 5000);
    return () => clearInterval(timer);
  }, [isPlaying, currentStory?.id, Math.floor(currentTime / 5), duration]);

  // Save exact timestamp before tab/window closes
  useEffect(() => {
    const handleUnload = () => {
      if (currentStory && currentTime > 3) {
        saveStoryProgress(currentStory.id, currentTime, duration);
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [currentStory?.id, currentTime, duration]);

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

  // Audio Playback Controls with Smart Resume
  const handleSelectStory = (story: Story, forceStartFromBeginning = false) => {
    saveLastPlayedStoryId(story.id);
    const saved = getStoryProgress(story.id);
    const startTime =
      !forceStartFromBeginning &&
      saved &&
      saved.currentTime > 5 &&
      saved.currentTime < (saved.duration || story.durationSeconds || 100) - 10
        ? saved.currentTime
        : 0;

    setCurrentStory(story);
    setIsPlaying(true);
    setCurrentTime(startTime);
    setResumeTime(startTime);
    setDuration(story.durationSeconds || saved?.duration || 0);

    if (startTime > 0) {
      setSleepToastMessage(
        `⏱️ আগের অবস্থান থেকে শুরু হচ্ছে (${formatDuration(startTime)})`
      );
      setTimeout(() => setSleepToastMessage(null), 3500);
    }
  };

  const handleRestartCurrentStory = () => {
    if (!currentStory) return;
    clearStoryProgress(currentStory.id);
    setStoryProgressMap(getAllStoryProgress());
    handleSeek(0);
    setSleepToastMessage("⏮️ গল্পটি শুরু থেকে বাজছে");
    setTimeout(() => setSleepToastMessage(null), 3000);
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

  // Sleep Timer countdown effect
  useEffect(() => {
    if (sleepTimerRemaining === null || sleepTimerRemaining <= 0 || !isPlaying) return;

    const interval = setInterval(() => {
      setSleepTimerRemaining((prev) => {
        if (prev === null || prev <= 1) {
          setIsPlaying(false);
          setSleepTimerOption("off");
          setSleepToastMessage("🌙 ঘুমের টাইমার শেষ হয়েছে—অডিও থামানো হয়েছে। শুভ রাত্রি!");
          setTimeout(() => setSleepToastMessage(null), 6000);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimerRemaining, isPlaying]);

  const handleSetSleepTimer = (option: SleepTimerOption) => {
    setSleepTimerOption(option);
    if (option === "off") {
      setSleepTimerRemaining(null);
      setSleepToastMessage(null);
    } else if (option === "end_of_story") {
      setSleepTimerRemaining(null);
      setSleepToastMessage("🌙 বর্তমান গল্প শেষে অডিও স্বয়ংক্রিয়ভাবে বন্ধ হবে");
      setTimeout(() => setSleepToastMessage(null), 4000);
    } else {
      const mins = parseInt(option, 10);
      setSleepTimerRemaining(mins * 60);
      setSleepToastMessage(`🌙 ঘুমের টাইমার চালু: ${mins} মিনিট পর অডিও বন্ধ হবে`);
      setTimeout(() => setSleepToastMessage(null), 4000);
    }
  };

  const handleSongEnded = () => {
    if (currentStory) {
      clearStoryProgress(currentStory.id);
      setStoryProgressMap(getAllStoryProgress());
    }
    if (sleepTimerOption === "end_of_story") {
      setIsPlaying(false);
      setSleepTimerOption("off");
      setSleepToastMessage("🌙 গল্পটি সমাপ্ত হয়েছে—ঘুমের টাইমার অনুযায়ী অডিও বন্ধ হলো।");
      setTimeout(() => setSleepToastMessage(null), 6000);
      return;
    }
    handleNextStory();
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-[#e6e1e4] pb-32">
      {/* Toast Notification Banner */}
      {sleepToastMessage && (
        <div className="fixed top-24 right-4 sm:right-8 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-xl bg-[#141315]/95 border border-[#ffc665]/50 text-[#ffc665] text-xs font-serif-bengali shadow-2xl backdrop-blur-md animate-in slide-in-from-top-2 duration-200">
          <span className="w-2 h-2 rounded-full bg-[#ffc665] animate-ping shrink-0" />
          <span>{sleepToastMessage}</span>
          <button
            onClick={() => setSleepToastMessage(null)}
            className="ml-2 text-[#9d8f7c] hover:text-[#e6e1e4] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Background YouTube Audio Engine (Audio-only, no video box) */}
      <YouTubeAudioEngine
        youtubeId={currentStory?.youtubeId || null}
        isPlaying={isPlaying}
        volume={isMuted ? 0 : volume}
        playbackRate={playbackRate}
        startSeconds={resumeTime}
        seekTime={seekTime}
        onTimeUpdate={(curr, dur) => {
          setCurrentTime(curr);
          if (dur > 0) setDuration(dur);
        }}
        onStateChange={(playing) => setIsPlaying(playing)}
        onEnded={handleSongEnded}
      />

      {/* ========================================== */}
      {/* 1. TOP NAV BAR (Clean & Uncluttered, Mobile-First) */}
      {/* ========================================== */}
      <header className="bg-[#0f0e10]/95 backdrop-blur-md sticky top-0 z-40 border-b border-[#504535]/30 shadow-2xl">
        <div className="flex justify-between items-center w-full px-3 sm:px-8 max-w-7xl mx-auto h-16 sm:h-20 gap-2 sm:gap-4">

          {/* Brand & Vintage Indicator */}
          <div
            className="flex items-center space-x-2 sm:space-x-3 shrink-0 cursor-pointer group"
            onClick={() => setSelectedCategory("all")}
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#201f21] border border-[#504535]/50 flex items-center justify-center text-[#ffc665] group-hover:border-[#ffc665]/60 transition-all shadow-inner">
              <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-[#ffc665]" />
            </div>
            <div className="whitespace-nowrap">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-lg sm:text-xl font-serif-bengali font-bold text-[#ffc665] tracking-wide">
                  গল্প ঘর
                </span>
                <span className="font-mono-retro text-[9px] sm:text-[10px] text-[#9d8f7c] border-l border-[#504535]/40 pl-1.5 sm:pl-2">
                  Golpo Ghar
                </span>
              </div>
              <span className="hidden sm:block font-mono-retro text-[9px] text-[#9d8f7c] tracking-widest uppercase">
                Radio Drama & Mystery Archive
              </span>
            </div>
          </div>

          {/* Center: Integrated Spotlight Search Bar */}
          <div className="flex-1 max-w-md mx-2 hidden md:block">
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#141315] hover:bg-[#1c1b1d] border border-[#504535]/40 hover:border-[#ffc665]/60 text-xs text-[#9d8f7c] hover:text-[#e6e1e4] transition-all shadow-inner group cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Search className="w-4 h-4 text-[#ffc665] group-hover:scale-110 transition-transform" />
                <span className="font-sans">গল্প, লেখক বা চরিত্র খুঁজুন...</span>
              </span>
              <kbd className="px-1.5 py-0.5 rounded bg-[#201f21] border border-[#504535]/40 text-[10px] font-mono-retro text-[#ffc665]">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: Unified Telemetry Pill & Tune Mystery Action */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
            {/* Mobile Search Icon Button */}
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="md:hidden p-2 rounded-lg bg-[#201f21] border border-[#504535]/40 text-[#ffc665] hover:bg-[#2b292c] transition cursor-pointer"
              title="সার্চ করুন"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Unified Radio Telemetry Pill */}
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#1c1b1d] border border-[#504535]/40 font-mono-retro text-xs text-[#d4c4b0] shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#ffc665] animate-pulse" />
              <span className="text-[#ddcdae]">98.3 MHz</span>
              <span className="text-[#504535]">|</span>
              <Clock className="w-3.5 h-3.5 text-[#ffc665]" />
              <span>{kolkataTime}</span>
            </div>

            {/* Tune Mystery Button */}
            <button
              onClick={handleTuneRandom}
              className="flex items-center space-x-1.5 p-2 sm:px-4 sm:py-2 rounded-lg bg-[#e5a93c] text-[#5e4000] font-mono-retro text-xs font-bold hover:bg-[#ffc665] transition-all active:scale-95 shadow-md shadow-[#e5a93c]/20 cursor-pointer shrink-0"
              title="একটি রহস্যময় গল্প শুনুন"
            >
              <Shuffle className="w-4 h-4" />
              <span className="hidden sm:inline whitespace-nowrap">Tune Mystery</span>
            </button>
          </div>

        </div>
      </header>

      {/* ========================================== */}
      {/* MAIN EDITORIAL CANVAS                      */}
      {/* ========================================== */}
      <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-10 pt-4 sm:pt-8 space-y-6 sm:space-y-12">
        {/* Sub-Ticker Frequency Line */}
        <div className="w-full bg-[#0f0e10]/60 border border-[#504535]/20 rounded-lg p-2.5 sm:p-3 flex flex-wrap justify-between items-center font-mono-retro text-xs text-[#d4c4b0] gap-2 sm:gap-3">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <span className="px-2 py-0.5 rounded bg-[#8f191f] text-[#ff9e99] text-[9px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 shrink-0">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
              অন-এয়ার
            </span>
            <span className="text-[#ddcdae] font-serif-bengali text-xs leading-snug">
              বাংলা ও বিশ্বসাহিত্যের কিছু রোমাঞ্চকর গল্প দিয়ে সাজানো আমাদের এই
              বিশেষ নিবেদন—সানডে সাসপেন্স।
            </span>
          </div>
          <div className="hidden sm:flex items-center space-x-6 text-[11px]">
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
          <section className="relative w-full rounded-xl bg-[#1c1b1d] border border-[#504535]/30 overflow-hidden shadow-2xl p-3 sm:p-6 lg:p-10">
            {/* Ambient Tube Backlight */}
            <div className="absolute -top-24 right-1/4 w-96 h-96 bg-[#e5a93c]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 left-10 w-80 h-80 bg-[#8f191f]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 items-center relative z-10">
              {/* Left: Cassette Shell & Tape Spools */}
              <div className="lg:col-span-6 relative">
                <div className="w-full max-w-sm sm:max-w-lg mx-auto bg-[#0f0e10] rounded-xl p-2.5 sm:p-4 border border-[#504535]/50 shadow-2xl relative group">
                  {/* Cassette Screws */}
                  <div className="absolute top-1.5 left-1.5 text-[9px] text-[#9d8f7c] opacity-40 font-mono">
                    ✛
                  </div>
                  <div className="absolute top-1.5 right-1.5 text-[9px] text-[#9d8f7c] opacity-40 font-mono">
                    ✛
                  </div>
                  <div className="absolute bottom-1.5 left-1.5 text-[9px] text-[#9d8f7c] opacity-40 font-mono">
                    ✛
                  </div>
                  <div className="absolute bottom-1.5 right-1.5 text-[9px] text-[#9d8f7c] opacity-40 font-mono">
                    ✛
                  </div>

                  {/* Tape Label Sticker */}
                  <div className="bg-[#f1e1c0] text-[#221b07] rounded p-2.5 sm:p-4 border border-[#504535]/60 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start border-b border-[#221b07]/20 pb-1.5">
                      <div className="min-w-0 pr-2">
                        <span className="font-mono-retro text-[8px] sm:text-[10px] text-[#50462e] uppercase tracking-wider block">
                          রেডিও সাসপেন্স স্পেশাল • সাইড A
                        </span>
                        <h3 className="font-serif-bengali text-sm sm:text-2xl font-bold text-[#221b07] leading-tight mt-0.5 truncate">
                          {currentStory.cleanTitle || currentStory.title}
                        </h3>
                        <p className="text-[10px] sm:text-xs text-[#50462e] italic mt-0.5 truncate">
                          {currentStory.author || "Sunday Suspense Archive"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="inline-block border border-[#221b07]/40 px-1 py-0.5 text-[8px] sm:text-[9px] font-mono-retro font-bold uppercase rounded leading-none">
                          DOLBY
                        </div>
                        <span className="block text-[8px] sm:text-[9px] font-mono-retro text-[#50462e] mt-0.5">
                          C-90
                        </span>
                      </div>
                    </div>

                    {/* Tape Window & Spool Wheels */}
                    <div className="mt-2.5 sm:mt-4 bg-[#0f0e10] rounded-lg p-2 sm:p-3 flex justify-between items-center border border-[#504535]/30">
                      {/* Left Spool */}
                      <div
                        className={`w-10 h-10 sm:w-16 sm:h-16 rounded-full bg-[#141315] border-2 sm:border-4 border-[#504535]/40 flex items-center justify-center relative shadow-inner shrink-0 ${isPlaying ? "animate-spin-slow" : ""}`}
                      >
                        <div className="w-3.5 h-3.5 sm:w-6 sm:h-6 rounded-full bg-[#363436] border border-[#ffc665]/40 flex items-center justify-center">
                          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-[#ffc665]" />
                        </div>
                        <div className="absolute w-full h-0.5 bg-[#504535]/30" />
                        <div className="absolute h-full w-0.5 bg-[#504535]/30" />
                      </div>

                      {/* Tape Gauge Ruler */}
                      <div className="flex-1 px-2.5 sm:px-4 min-w-0 flex flex-col items-center">
                        <div className="w-full flex justify-between text-[8px] sm:text-[9px] font-mono-retro text-[#9d8f7c] mb-0.5 px-0.5">
                          <span>100</span>
                          <span>50</span>
                          <span>0</span>
                        </div>
                        <div className="w-full h-2 sm:h-3 bg-[#2b292c] rounded-full overflow-hidden p-0.5 border border-[#504535]/20 flex">
                          <div
                            className="h-full bg-gradient-to-r from-amber-900 to-amber-700 rounded-l transition-all duration-300"
                            style={{
                              width: `${Math.max(15, 100 - progressPercent)}%`,
                            }}
                          />
                          <div className="h-full bg-transparent flex-1 border-l border-[#9d8f7c]/40" />
                        </div>
                        <span className="text-[8px] sm:text-[9px] font-mono-retro text-[#ffc665] mt-1 tracking-wider whitespace-nowrap overflow-hidden text-ellipsis">
                          {currentStory.duration} • HI-FI
                        </span>
                      </div>

                      {/* Right Spool */}
                      <div
                        className={`w-10 h-10 sm:w-16 sm:h-16 rounded-full bg-[#141315] border-2 sm:border-4 border-[#504535]/40 flex items-center justify-center relative shadow-inner shrink-0 ${isPlaying ? "animate-spin-mid" : ""}`}
                      >
                        <div className="w-3.5 h-3.5 sm:w-6 sm:h-6 rounded-full bg-[#363436] border border-[#ffc665]/40 flex items-center justify-center">
                          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-[#ffc665]" />
                        </div>
                        <div className="absolute w-full h-0.5 bg-[#504535]/30" />
                        <div className="absolute h-full w-0.5 bg-[#504535]/30" />
                      </div>
                    </div>

                    {/* J-Card Details */}
                    <div className="mt-2 sm:mt-3 flex justify-between items-center font-mono-retro text-[10px] sm:text-xs text-[#50462e] pt-1.5 sm:pt-2 border-t border-[#221b07]/15">
                      <span className="flex items-center gap-1 truncate mr-2">
                        <Headphones className="w-3 h-3 text-[#221b07] shrink-0" />{" "}
                        কণ্ঠ: রেডিও মিরচি বাংলা
                      </span>
                      <span className="font-bold text-[#221b07] shrink-0">
                        {currentStory.duration}
                      </span>
                    </div>
                  </div>

                  {/* Tape Trapdoor */}
                  <div className="mt-2 w-28 sm:w-40 mx-auto h-2 sm:h-3 bg-[#2b292c] rounded-t-sm border-t border-x border-[#504535]/30" />
                </div>
              </div>

              {/* Right: Story Narrative & Actions */}
              <div className="lg:col-span-6 space-y-4 sm:space-y-6">
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
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 pt-2">
                  <button
                    onClick={handleTogglePlay}
                    className="w-full sm:w-auto flex items-center justify-center space-x-3 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl bg-[#e5a93c] text-[#5e4000] font-serif-bengali text-sm sm:text-base font-bold glow-amber hover:bg-[#ffc665] active:scale-95 transition-all cursor-pointer shadow-lg"
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
                    className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-3.5 sm:px-5 py-3 sm:py-3.5 rounded-xl bg-[#2b292c] text-[#e6e1e4] border border-[#504535]/40 hover:border-[#ffc665]/50 hover:text-[#ffc665] transition-all active:scale-95 text-xs font-mono-retro cursor-pointer"
                  >
                    <span>ক্যাসেট বদল</span>
                  </button>

                  {currentTime > 10 && (
                    <button
                      onClick={handleRestartCurrentStory}
                      className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-xl bg-[#201f21] text-[#d4c4b0] border border-[#504535]/40 hover:border-[#ffc665]/50 hover:text-[#ffc665] transition-all text-xs font-mono-retro cursor-pointer"
                      title="গল্পটি আবার শুরু থেকে শুনুন"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>শুরু থেকে</span>
                    </button>
                  )}

                  <a
                    href={currentStory.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-xl bg-[#8f191f]/60 hover:bg-[#8f191f] text-[#ffdad7] border border-[#ffb3ae]/20 text-xs font-mono-retro font-semibold transition cursor-pointer"
                    title="মূল ভিডিওটি YouTube-এ খুলুন"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>ইউটিউব</span>
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
              const savedProgress = storyProgressMap[story.id];
              const hasProgress = savedProgress && savedProgress.currentTime > 5;
              const progressPct =
                hasProgress && (savedProgress.duration || story.durationSeconds || 0) > 0
                  ? Math.min(
                      100,
                      (savedProgress.currentTime /
                        (savedProgress.duration || story.durationSeconds || 1)) *
                        100
                    )
                  : 0;

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

                    {/* Resume playback progress bar on card */}
                    {hasProgress && (
                      <div className="mt-3 pt-2 border-t border-[#504535]/20">
                        <div className="flex items-center justify-between text-[10px] font-mono-retro text-[#ffc665] mb-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(savedProgress.currentTime)} পর্যন্ত শোনা
                          </span>
                          <span>{Math.round(progressPct)}%</span>
                        </div>
                        <div className="w-full h-1 bg-[#201f21] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#e5a93c] to-[#ffc665] rounded-full transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    )}
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

          {/* Edge-to-edge interactive scrubber track */}
          <div className="relative w-full h-2 cursor-pointer group py-0.5 -mt-0.5 flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="w-full h-1 bg-[#363436] rounded-none appearance-none cursor-pointer accent-[#ffc665] focus:outline-none"
              style={{
                background: `linear-gradient(to right, #ffc665 0%, #ffc665 ${progressPercent}%, rgba(255, 255, 255, 0.12) ${progressPercent}%, rgba(255, 255, 255, 0.12) 100%)`,
              }}
            />
          </div>

          {/* ========================================================= */}
          {/* MOBILE DOCK VIEW (< md): Sleek 2-Row Layout               */}
          {/* ========================================================= */}
          <div className="md:hidden px-3.5 pt-1.5 pb-2.5 space-y-1.5 max-w-lg mx-auto">
            {/* Top row: Track Info & YouTube icon */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5 truncate">
                <div
                  className={`w-8 h-8 rounded-full vinyl-grooves border border-[#ffc665]/40 flex items-center justify-center shrink-0 shadow ${
                    isPlaying ? "animate-spin-slow" : ""
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-[#e5a93c]" />
                </div>
                <div className="truncate">
                  <h6 className="font-serif-bengali text-xs font-bold text-[#e6e1e4] truncate">
                    {currentStory.cleanTitle}
                  </h6>
                  <p className="text-[10px] text-[#9d8f7c] truncate">
                    {currentStory.author || "সানডে সাসপেন্স"}
                  </p>
                </div>
              </div>

              {/* Right: Time stamp & YT button */}
              <div className="flex items-center space-x-2 shrink-0 font-mono-retro text-[10px] text-[#ffc665]">
                <span>
                  {formatDuration(currentTime)} / {duration > 0 ? formatDuration(duration) : currentStory.duration}
                </span>
                <a
                  href={currentStory.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="YouTube-এ শুনুন"
                  className="p-1.5 rounded-lg bg-[#8f191f] text-[#ffdad7] hover:bg-[#8f191f]/80 transition flex items-center justify-center"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Bottom row: Symmetrical Transport Bar */}
            <div className="flex items-center justify-between pt-0.5">
              <SpeedSelector
                currentSpeed={playbackRate}
                onSelectSpeed={setPlaybackRate}
              />

              <button
                onClick={handlePrevStory}
                className="text-[#9d8f7c] hover:text-[#ffc665] p-1.5 transition cursor-pointer"
                title="পূর্ববর্তী গল্প"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleSkip(-15)}
                className="text-[#d4c4b0] hover:text-[#ffc665] p-1.5 transition cursor-pointer"
                title="১৫ সেকেন্ড পেছান"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Main Play/Pause Button */}
              <button
                onClick={handleTogglePlay}
                className="w-10 h-10 rounded-full bg-[#e5a93c] text-[#5e4000] flex items-center justify-center glow-amber hover:bg-[#ffc665] transition-all active:scale-95 shadow-md shrink-0 cursor-pointer"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5 fill-current" />
                )}
              </button>

              <button
                onClick={() => handleSkip(15)}
                className="text-[#d4c4b0] hover:text-[#ffc665] p-1.5 transition cursor-pointer"
                title="১৫ সেকেন্ড এগোন"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <button
                onClick={handleNextStory}
                className="text-[#9d8f7c] hover:text-[#ffc665] p-1.5 transition cursor-pointer"
                title="পরবর্তী গল্প"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <SleepTimerMenu
                remainingSeconds={sleepTimerRemaining}
                selectedOption={sleepTimerOption}
                onSelectOption={handleSetSleepTimer}
              />
            </div>
          </div>

          {/* ========================================================= */}
          {/* DESKTOP DOCK VIEW (>= md): Full 3-Column Layout            */}
          {/* ========================================================= */}
          <div className="hidden md:flex max-w-7xl mx-auto px-4 lg:px-8 py-3 items-center justify-between gap-4">
            {/* Left: Mini Vinyl & Track Info */}
            <div className="flex items-center space-x-3 w-1/4">
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
            <div className="flex flex-col items-center w-2/4 space-y-1.5">
              {/* Transport Buttons with Speed & Sleep Timer */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                <SpeedSelector
                  currentSpeed={playbackRate}
                  onSelectSpeed={setPlaybackRate}
                />

                <button
                  onClick={handlePrevStory}
                  className="text-[#9d8f7c] hover:text-[#ffc665] transition-colors cursor-pointer p-1"
                  title="পূর্ববর্তী গল্প"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleSkip(-15)}
                  className="text-[#d4c4b0] hover:text-[#ffc665] transition-colors cursor-pointer p-1"
                  title="১৫ সেকেন্ড পেছান"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Main Play / Pause Button */}
                <button
                  onClick={handleTogglePlay}
                  className="w-10 h-10 rounded-full bg-[#e5a93c] text-[#5e4000] flex items-center justify-center glow-amber hover:bg-[#ffc665] transition-all active:scale-95 cursor-pointer shrink-0"
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
                  className="text-[#d4c4b0] hover:text-[#ffc665] transition-colors cursor-pointer p-1"
                  title="১৫ সেকেন্ড এগোন"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextStory}
                  className="text-[#9d8f7c] hover:text-[#ffc665] transition-colors cursor-pointer p-1"
                  title="পরবর্তী গল্প"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                <SleepTimerMenu
                  remainingSeconds={sleepTimerRemaining}
                  selectedOption={sleepTimerOption}
                  onSelectOption={handleSetSleepTimer}
                />
              </div>

              {/* Scrubber and Times */}
              <div className="w-full flex items-center space-x-3 font-mono-retro text-xs text-[#9d8f7c]">
                <span className="w-10 text-right text-[#ffc665] text-[11px]">
                  {formatDuration(currentTime)}
                </span>

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
            <div className="flex items-center justify-end space-x-4 w-1/4">
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

              {/* YouTube Redirect Button */}
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
