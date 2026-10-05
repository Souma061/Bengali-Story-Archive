import { X, Search, Clock, Play, Volume2, Radio } from 'lucide-react';
import type { Story, CollectionItem } from '../types';

interface PlaylistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stories: Story[];
  collections: CollectionItem[];
  currentStory: Story | null;
  isPlaying: boolean;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectStory: (story: Story) => void;
  totalStories: number;
}

export function PlaylistDrawer({
  isOpen,
  onClose,
  stories,
  collections,
  currentStory,
  isPlaying,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onSelectStory,
  totalStories,
}: PlaylistDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-end animate-fadeIn">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl bg-[#141210]/95 border-l border-amber-500/20 shadow-2xl h-full flex flex-col z-10">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-amber-500/20 bg-[#1a1714] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-100 flex items-center gap-2">
                গল্প সম্ভার ও প্লে-লিস্ট
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800/40">
                  {totalStories} টি গল্প
                </span>
              </h3>
              <p className="text-xs text-amber-200/50">যে কোনো গল্পে ক্লিক করে সরাসরি শুনুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-amber-200/60 hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-white/5 bg-[#171411]">
          <div className="relative">
            <Search className="w-4 h-4 text-amber-300/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="গল্প বা লেখক খুঁজুন (Search story or author)..."
              className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-amber-500/20 rounded-xl text-sm text-amber-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 transition"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mt-3 pt-1">
            <button
              onClick={() => onSelectCategory('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-amber-500 text-black font-bold shadow'
                  : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              সব গল্প
            </button>
            {collections.map((col) => (
              <button
                key={col.slug}
                onClick={() => onSelectCategory(col.slug)}
                className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition cursor-pointer ${
                  selectedCategory === col.slug
                    ? 'bg-amber-500 text-black font-bold shadow'
                    : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {col.bengali} ({col.count})
              </button>
            ))}
          </div>
        </div>

        {/* Stories Scrollable List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {stories.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              <p className="text-sm">কোনো গল্প খুঁজে পাওয়া যায়নি</p>
            </div>
          ) : (
            stories.map((story) => {
              const isCurrent = currentStory?.id === story.id;
              return (
                <div
                  key={story.id}
                  onClick={() => onSelectStory(story)}
                  className={`group flex items-center justify-between gap-3 p-3 rounded-xl border transition cursor-pointer ${
                    isCurrent
                      ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-950/20'
                      : 'bg-black/30 hover:bg-white/5 border-white/5 hover:border-amber-500/30'
                  }`}
                >
                  {/* Thumbnail & Title */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative w-14 h-10 rounded-lg overflow-hidden bg-black shrink-0">
                      <img
                        src={story.thumbnailUrl}
                        alt={story.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {isCurrent && isPlaying ? (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Volume2 className="w-5 h-5 text-amber-400 animate-pulse" />
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <Play className="w-4 h-4 text-white fill-current" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4
                        className={`text-xs sm:text-sm font-semibold truncate ${
                          isCurrent ? 'text-amber-300' : 'text-zinc-200 group-hover:text-amber-100'
                        }`}
                      >
                        {story.cleanTitle || story.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                        {story.author || story.collection}
                      </p>
                    </div>
                  </div>

                  {/* Duration Badge */}
                  <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 shrink-0">
                    <Clock className="w-3 h-3 text-amber-500/80" />
                    <span>{story.duration}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
