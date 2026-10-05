import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Story {
  id: string;
  title: string;
  cleanTitle: string;
  youtubeId: string;
  youtubeUrl: string;
  embedUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  duration: string;
  position?: number;
  collection: string;
  characterSeries?: string;
  author?: string;
}

export interface CollectionSummary {
  name: string;
  slug: string;
  count: number;
  labelBengali: string;
}

// Locate Data directory safely
const possibleDataDirs = [
  path.resolve(__dirname, '../../Data'),
  path.resolve(__dirname, '../Data'),
  path.resolve(process.cwd(), 'Data'),
  path.resolve(process.cwd(), '../Data'),
];

let dataDir = possibleDataDirs.find((d) => fs.existsSync(d)) || possibleDataDirs[0];

function cleanStoryTitle(rawTitle?: string | null): { cleanTitle: string; character?: string; author?: string } {
  if (!rawTitle || typeof rawTitle !== 'string') {
    return { cleanTitle: 'Untitled Audio Story' };
  }
  // Common prefixes/suffixes: "Sunday Suspense | ", " | Mirchi Bangla...", etc.
  const parts = rawTitle.split('|').map((p) => p.trim());
  let character: string | undefined;
  let author: string | undefined;

  // Detect character / series keywords
  const titleLower = rawTitle.toLowerCase();
  if (titleLower.includes('feluda') || titleLower.includes('ফেলুদা')) character = 'feluda';
  else if (titleLower.includes('byomkesh') || titleLower.includes('ব্যোমকেশ')) character = 'byomkesh';
  else if (titleLower.includes('shonku') || titleLower.includes('শঙ্কু')) character = 'professor_shonku';
  else if (titleLower.includes('sherlock') || titleLower.includes('শার্লক')) character = 'sherlock_holmes';
  else if (titleLower.includes('tenida') || titleLower.includes('টেনিদা')) character = 'tenida';
  else if (titleLower.includes('kiriti') || titleLower.includes('কিরীটী')) character = 'kiriti';
  else if (titleLower.includes('daroga priyonath') || titleLower.includes('প্রিয়নাথ')) character = 'daroga_priyonath';
  else if (titleLower.includes('miss marple')) character = 'miss_marple';

  // Detect famous authors
  if (titleLower.includes('satyajit ray') || titleLower.includes('সত্যজিৎ রায়')) author = 'Satyajit Ray';
  else if (titleLower.includes('saradindu') || titleLower.includes('শরদিন্দু')) author = 'Sharadindu Bandyopadhyay';
  else if (titleLower.includes('arthur conan doyle')) author = 'Sir Arthur Conan Doyle';
  else if (titleLower.includes('rabindranath tagore') || titleLower.includes('রবীন্দ্রনাথ')) author = 'Rabindranath Tagore';
  else if (titleLower.includes('taradas bandyopadhyay')) author = 'Taradas Bandyopadhyay';
  else if (titleLower.includes('bibhutibhushan')) author = 'Bibhutibhushan Bandyopadhyay';
  else if (titleLower.includes('narayan gangopadhyay')) author = 'Narayan Gangopadhyay';
  else if (titleLower.includes('nihar ranjan gupta')) author = 'Nihar Ranjan Gupta';

  // Extract clean central title
  let meaningfulParts = parts.filter(
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

let storiesCache: Story[] = [];

export function loadAllStories(): Story[] {
  if (storiesCache.length > 0) return storiesCache;

  const storyMap = new Map<string, Story>();

  // 1. Load main stories.json
  const mainStoriesPath = path.join(dataDir, 'stories.json');
  if (fs.existsSync(mainStoriesPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(mainStoriesPath, 'utf-8'));
      if (Array.isArray(data.stories)) {
        for (const item of data.stories) {
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
    } catch (err) {
      console.error('Error loading stories.json:', err);
    }
  }

  // 2. Load sherlock_stories.json
  const sherlockPath = path.join(dataDir, 'sherlock_stories.json');
  if (fs.existsSync(sherlockPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(sherlockPath, 'utf-8'));
      if (Array.isArray(data.stories)) {
        for (const item of data.stories) {
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
              youtubeUrl: item.youtubeUrl,
              embedUrl: item.embedUrl,
              thumbnailUrl: item.thumbnailUrl,
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
    } catch (err) {
      console.error('Error loading sherlock_stories.json:', err);
    }
  }

  storiesCache = Array.from(storyMap.values());
  console.log(`Loaded ${storiesCache.length} stories into memory archive.`);
  return storiesCache;
}

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
