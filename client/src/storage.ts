// Storage utility for story playback progress and history in localStorage

const PROGRESS_STORAGE_KEY = "golpo_ghar_playback_progress";
const LAST_PLAYED_KEY = "golpo_ghar_last_played_id";

export interface StoryProgress {
  currentTime: number;
  duration: number;
  updatedAt: number;
}

export type ProgressMap = Record<string, StoryProgress>;

export function getAllStoryProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("Failed to load playback progress from localStorage", e);
    return {};
  }
}

export function getStoryProgress(storyId: string): StoryProgress | null {
  if (!storyId) return null;
  const all = getAllStoryProgress();
  return all[storyId] || null;
}

export function saveStoryProgress(
  storyId: string,
  currentTime: number,
  duration: number
): void {
  if (!storyId || isNaN(currentTime) || currentTime < 0) return;
  try {
    const all = getAllStoryProgress();
    // Only save if listened to more than 3 seconds
    if (currentTime > 3) {
      all[storyId] = {
        currentTime: Math.floor(currentTime),
        duration: Math.floor(duration || 0),
        updatedAt: Date.now(),
      };
    } else {
      delete all[storyId];
    }
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error("Failed to save playback progress to localStorage", e);
  }
}

export function clearStoryProgress(storyId: string): void {
  if (!storyId) return;
  try {
    const all = getAllStoryProgress();
    if (all[storyId]) {
      delete all[storyId];
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(all));
    }
  } catch (e) {
    console.error("Failed to clear playback progress", e);
  }
}

export function saveLastPlayedStoryId(storyId: string): void {
  if (!storyId) return;
  try {
    localStorage.setItem(LAST_PLAYED_KEY, storyId);
  } catch (e) {
    console.error("Failed to save last played story ID", e);
  }
}

export function getLastPlayedStoryId(): string | null {
  try {
    return localStorage.getItem(LAST_PLAYED_KEY);
  } catch {
    return null;
  }
}
