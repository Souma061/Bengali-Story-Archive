import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  Clock,
  Volume2,
  Sparkles,
  ArrowRight,
  Radio,
  CornerDownLeft
} from 'lucide-react';
import type { Story } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: Story[];
  onSelectStory: (story: Story) => void;
  currentStoryId?: string;
  isPlaying?: boolean;
}

// Common aliases mapping Bengali & English terms
const SEARCH_ALIASES: Record<string, string[]> = {
  feluda: ['ফেলুদা', 'feluda', 'satyajit', 'ray', 'তোপসে', 'জটায়ু'],
  byomkesh: ['ব্যোমকেশ', 'byomkesh', 'bakshi', 'sharadindu', 'অজিত'],
  shonku: ['শঙ্কু', 'shonku', 'professor', 'সত্য়জিৎ', 'corvus', 'গিরিডি'],
  sherlock: ['শার্লক', 'sherlock', 'holmes', 'conan doyle', 'ডয়েল', 'ওয়াটসন'],
  horror: ['ভৌতিক', 'horror', 'ghost', 'গা ছমছমে', 'ভূত', 'প্রেতাত্মা', 'রহস্য'],
  tenida: ['টেনিদা', 'tenida', 'পটলডাঙ্গা', 'ক্যাবলা', 'হাবু'],
  kiriti: ['কিরীটী', 'kiriti', 'নীহাররঞ্জন'],
};

const TRENDING_SEARCHES = [
  'সোনার কেল্লা',
  'বাদশাহী আংটি',
  'সত্যান্বেষী',
  'কর্ভাস',
  'রক্তমুখী নীলা',
  'রক্তচোষা',
  'ঘুরঘুটিয়ার ঘটনা',
];

export function SearchModal({
  isOpen,
  onClose,
  stories,
  onSelectStory,
  currentStoryId,
  isPlaying,
}: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened & handle Escape / Keyboard shortcuts
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setSelectedTag('all');
    }
  }, [isOpen]);

  // Fast tokenized & alias search
  const results = useMemo(() => {
    let baseList = stories;

    // Filter by tag if selected
    if (selectedTag !== 'all') {
      baseList = baseList.filter((s) => s.characterSeries === selectedTag);
    }

    if (!query.trim()) {
      return baseList.slice(0, 15);
    }

    const queryTokens = query.toLowerCase().trim().split(/\s+/);

    return baseList
      .map((story) => {
        const fullText = `${story.title} ${story.cleanTitle} ${story.author || ''} ${story.characterSeries || ''} ${story.collection}`.toLowerCase();
        
        let score = 0;
        let allMatched = true;

        for (const token of queryTokens) {
          let tokenMatched = false;
          if (fullText.includes(token)) {
            score += 10;
            tokenMatched = true;
          }

          // Check aliases
          for (const [key, aliasList] of Object.entries(SEARCH_ALIASES)) {
            if (aliasList.some((alias) => alias.includes(token) || token.includes(alias))) {
              if (story.characterSeries === key || fullText.includes(key)) {
                score += 5;
                tokenMatched = true;
              }
            }
          }

          if (!tokenMatched) {
            allMatched = false;
            break;
          }
        }

        // Exact match in cleanTitle boost
        if (story.cleanTitle.toLowerCase().includes(query.toLowerCase().trim())) {
          score += 20;
        }

        return { story, score, allMatched };
      })
      .filter((item) => item.allMatched)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.story);
  }, [stories, query, selectedTag]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        onSelectStory(results[selectedIndex]);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Auto-scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start justify-center pt-3 sm:pt-20 px-2 sm:px-4 animate-fadeIn">
      {/* Background click to dismiss */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Main Command Palette Dialog */}
      <div className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[85vh] bg-[#141315]/95 border border-[#504535]/40 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col z-10 glow-amber">
        
        {/* Search Input Bar */}
        <div className="p-4 border-b border-[#504535]/30 flex items-center gap-3 bg-[#1c1b1d]">
          <Search className="w-5 h-5 text-[#ffc665] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="গল্প, চরিত্র বা লেখক খুঁজুন (যেমন: ফেলুদা, বোমকেশ, কর্ভাস)..."
            className="w-full bg-transparent text-sm sm:text-base text-[#e6e1e4] placeholder-[#9d8f7c]/70 focus:outline-none font-sans"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-[#9d8f7c] hover:text-[#e6e1e4] hover:bg-[#2b292c] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-[#201f21] border border-[#504535]/30 text-[10px] font-mono-retro text-[#9d8f7c]">
              ESC
            </div>
          )}
        </div>

        {/* Quick Filter Tags & Trending */}
        <div className="px-4 py-2.5 border-b border-[#504535]/20 bg-[#171618] flex items-center justify-between gap-2 overflow-x-auto no-scrollbar text-xs">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono-retro text-[#9d8f7c] uppercase mr-1">ফিল্টার:</span>
            {[
              { id: 'all', label: 'সব' },
              { id: 'feluda', label: 'ফেলুদা' },
              { id: 'byomkesh', label: 'ব্যোমকেশ' },
              { id: 'professor_shonku', label: 'শঙ্কু' },
              { id: 'sherlock_holmes', label: 'শার্লক' },
            ].map((tag) => (
              <button
                key={tag.id}
                onClick={() => setSelectedTag(tag.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono-retro transition cursor-pointer ${
                  selectedTag === tag.id
                    ? 'bg-[#e5a93c] text-[#5e4000] font-bold shadow'
                    : 'bg-[#201f21] text-[#d4c4b0] hover:text-[#ffc665]'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] font-mono-retro text-[#9d8f7c] shrink-0">
            {results.length} টি গল্প
          </span>
        </div>

        {/* Trending Suggestions when no query is typed */}
        {!query && (
          <div className="px-4 py-2 bg-[#121113]/80 border-b border-[#504535]/15 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-mono-retro text-[#ffc665] flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3 text-[#ffc665]" /> ট্রেন্ডিং:
            </span>
            {TRENDING_SEARCHES.map((term) => (
              <button
                key={term}
                onClick={() => setQuery(term)}
                className="px-2 py-0.5 rounded bg-[#201f21] hover:bg-[#2b292c] text-[#d4c4b0] hover:text-[#ffc665] text-[11px] font-serif-bengali transition cursor-pointer shrink-0 border border-[#504535]/20"
              >
                {term}
              </button>
            ))}
          </div>
        )}

        {/* Results List */}
        <div ref={listRef} className="max-h-80 sm:max-h-96 overflow-y-auto p-2 space-y-1">
          {results.length === 0 ? (
            <div className="py-12 text-center text-[#9d8f7c]">
              <Radio className="w-10 h-10 mx-auto text-[#504535] mb-2" />
              <p className="text-sm font-semibold text-[#e6e1e4]">কোন গল্প খুঁজে পাওয়া যায়নি</p>
              <p className="text-xs text-[#9d8f7c] mt-1">
                ভিন্ন কোনো নাম, লেখক বা চরিত্র দিয়ে অনুসন্ধান করুন
              </p>
            </div>
          ) : (
            results.map((story, index) => {
              const isSelected = index === selectedIndex;
              const isCurrentPlaying = currentStoryId === story.id && isPlaying;
              return (
                <div
                  key={story.id}
                  onClick={() => {
                    onSelectStory(story);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between gap-3 p-2.5 rounded-xl transition cursor-pointer ${
                    isSelected
                      ? 'bg-[#e5a93c]/15 border border-[#ffc665]/60 text-[#ffc665]'
                      : 'hover:bg-[#1c1b1d] border border-transparent text-[#e6e1e4]'
                  }`}
                >
                  {/* Thumbnail & Title Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative w-12 h-9 rounded-lg overflow-hidden bg-black shrink-0 border border-[#504535]/30">
                      <img
                        src={story.thumbnailUrl}
                        alt={story.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {isCurrentPlaying && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Volume2 className="w-4 h-4 text-[#ffc665] animate-pulse" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs sm:text-sm font-serif-bengali font-bold truncate">
                          {story.cleanTitle}
                        </h4>
                        {story.characterSeries && (
                          <span className="px-1.5 py-0.2 rounded bg-[#201f21] text-[9px] font-mono-retro text-[#ffc665] border border-[#504535]/30 shrink-0">
                            {story.characterSeries.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#9d8f7c] truncate mt-0.5">
                        {story.author || story.collection}
                      </p>
                    </div>
                  </div>

                  {/* Duration & Play Cue */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1 font-mono-retro text-[11px] text-[#ddcdae]">
                      <Clock className="w-3 h-3 text-[#ffc665]" />
                      <span>{story.duration}</span>
                    </div>

                    <div className="hidden sm:flex items-center text-[#ffc665] text-xs">
                      {isSelected ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#e5a93c]/20 border border-[#e5a93c]/40 font-mono-retro text-[10px]">
                          Enter <CornerDownLeft className="w-3 h-3" />
                        </span>
                      ) : (
                        <ArrowRight className="w-4 h-4 opacity-40" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Hotkeys Bar */}
        <div className="p-3 border-t border-[#504535]/20 bg-[#100f11] flex items-center justify-between text-[11px] font-mono-retro text-[#9d8f7c]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[#201f21] border border-[#504535]/30 text-white">↑↓</kbd> নেভিগেট
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[#201f21] border border-[#504535]/30 text-white">Enter</kbd> শুনুন
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[#201f21] border border-[#504535]/30 text-white">Esc</kbd> বন্ধ করুন
            </span>
          </div>

          <span className="text-[#ffc665] font-serif-bengali">সানডে সাসপেন্স আর্কাইভ</span>
        </div>

      </div>
    </div>
  );
}
