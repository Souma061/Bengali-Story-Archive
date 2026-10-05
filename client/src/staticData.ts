import rawStories from '../../Data/stories.json';
import rawSherlock from '../../Data/sherlock_stories.json';
import type { Story, CollectionItem } from './types';

export const CHARACTER_META: Record<string, { label: string; bengali: string }> = {
  feluda: { label: 'Feluda', bengali: 'ফেলুদা' },
  byomkesh: { label: 'Byomkesh Bakshi', bengali: 'ব্যোমকেশ বক্সী' },
  professor_shonku: { label: 'Professor Shonku', bengali: 'প্রফেসর শঙ্কু' },
  sherlock_holmes: { label: 'Sherlock Holmes', bengali: 'শার্লক হোমস' },
  daroga_priyonath: { label: 'Daroga Priyonath', bengali: 'দারোগা প্রিয়নাথ' },
  kiriti: { label: 'Kiriti Roy', bengali: 'কিরীটী রায়' },
  tenida: { label: 'Tenida', bengali: 'টেনিদা' },
  miss_marple: { label: 'Miss Marple', bengali: 'মিস মার্পল' },
};

function cleanStoryTitle(rawTitle?: string | null): { cleanTitle: string; character?: string; author?: string } {
  if (!rawTitle || typeof rawTitle !== 'string') {
    return { cleanTitle: 'Untitled Audio Story' };
  }
  const parts = rawTitle.split('|').map((p) => p.trim());
  let character: string | undefined;
  let author: string | undefined;

  const titleLower = rawTitle.toLowerCase();
  if (titleLower.includes('feluda') || titleLower.includes('ফেলুদা')) character = 'feluda';
  else if (titleLower.includes('byomkesh') || titleLower.includes('ব্যোমকেশ')) character = 'byomkesh';
  else if (titleLower.includes('shonku') || titleLower.includes('শঙ্কু')) character = 'professor_shonku';
  else if (titleLower.includes('sherlock') || titleLower.includes('শার্লক')) character = 'sherlock_holmes';
  else if (titleLower.includes('tenida') || titleLower.includes('টেনিদা')) character = 'tenida';
  else if (titleLower.includes('kiriti') || titleLower.includes('কিরীটী')) character = 'kiriti';
  else if (titleLower.includes('daroga priyonath') || titleLower.includes('প্রিয়নাথ')) character = 'daroga_priyonath';
  else if (titleLower.includes('miss marple')) character = 'miss_marple';

  if (titleLower.includes('satyajit ray') || titleLower.includes('সত্যজিৎ রায়')) author = 'Satyajit Ray';
  else if (titleLower.includes('saradindu') || titleLower.includes('শরদিন্দু')) author = 'Sharadindu Bandyopadhyay';
  else if (titleLower.includes('arthur conan doyle')) author = 'Sir Arthur Conan Doyle';
  else if (titleLower.includes('rabindranath tagore') || titleLower.includes('রবীন্দ্রনাথ')) author = 'Rabindranath Tagore';
  else if (titleLower.includes('taradas bandyopadhyay')) author = 'Taradas Bandyopadhyay';
  else if (titleLower.includes('bibhutibhushan')) author = 'Bibhutibhushan Bandyopadhyay';
  else if (titleLower.includes('narayan gangopadhyay')) author = 'Narayan Gangopadhyay';
  else if (titleLower.includes('nihar ranjan gupta')) author = 'Nihar Ranjan Gupta';

  const meaningfulParts = parts.filter(
    (p) =>
      !p.toLowerCase().includes('sunday suspense') &&
      !p.toLowerCase().includes('mirchi bangla') &&
      !p.toLowerCase().includes('mirchi 98.3') &&
      !p.toLowerCase().includes('audio story') &&
      !p.toLowerCase().includes('full story')
  );

  const clean = meaningfulParts.length > 0 ? meaningfulParts.join(' - ') : rawTitle;
  return { cleanTitle: clean, character, author };
}

let cachedStories: Story[] | null = null;

export function getStaticStories(): Story[] {
  if (cachedStories) return cachedStories;

  const storyMap = new Map<string, Story>();

  // 1. Load Sunday Suspense stories
  if (rawStories && Array.isArray(rawStories.stories)) {
    for (const item of rawStories.stories) {
      if (!item || !item.youtubeId) continue;
      const { cleanTitle, character, author } = cleanStoryTitle(item.title);
      storyMap.set(item.youtubeId, {
        id: item.youtubeId,
        title: item.title || 'Untitled',
        cleanTitle,
        youtubeId: item.youtubeId,
        youtubeUrl: item.youtubeUrl || `https://www.youtube.com/watch?v=${item.youtubeId}`,
        embedUrl: item.embedUrl || `https://www.youtube.com/embed/${item.youtubeId}`,
        thumbnailUrl: item.thumbnailUrl || '',
        durationSeconds: item.durationSeconds || 0,
        duration: item.duration || '00:00',
        position: item.position,
        collection: 'Sunday Suspense',
        characterSeries: character,
        author,
      });
    }
  }

  // 2. Load Sherlock Holmes stories
  if (rawSherlock && Array.isArray(rawSherlock.stories)) {
    for (const item of rawSherlock.stories) {
      if (!item || !item.youtubeId) continue;
      const existing = storyMap.get(item.youtubeId);
      if (existing) {
        existing.characterSeries = 'sherlock_holmes';
        if (!existing.author) existing.author = 'Sir Arthur Conan Doyle';
      } else {
        const { cleanTitle, author } = cleanStoryTitle(item.title);
        storyMap.set(item.youtubeId, {
          id: item.youtubeId,
          title: item.title || 'Untitled',
          cleanTitle,
          youtubeId: item.youtubeId,
          youtubeUrl: item.youtubeUrl || `https://www.youtube.com/watch?v=${item.youtubeId}`,
          embedUrl: item.embedUrl || `https://www.youtube.com/embed/${item.youtubeId}`,
          thumbnailUrl: item.thumbnailUrl || '',
          durationSeconds: item.durationSeconds || 0,
          duration: item.duration || '00:00',
          position: item.position,
          collection: 'Sherlock Holmes',
          characterSeries: 'sherlock_holmes',
          author: author || 'Sir Arthur Conan Doyle',
        });
      }
    }
  }

  cachedStories = Array.from(storyMap.values());
  return cachedStories;
}

export function getStaticCollections(): CollectionItem[] {
  const stories = getStaticStories();
  return Object.entries(CHARACTER_META).map(([slug, meta]) => {
    const count = stories.filter((s) => s.characterSeries === slug).length;
    return {
      slug,
      name: meta.label,
      bengali: meta.bengali,
      count,
    };
  });
}
