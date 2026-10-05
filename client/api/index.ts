import type { IncomingMessage, ServerResponse } from "node:http";
import rawStories from "../src/data/stories.json";
import rawSherlock from "../src/data/sherlock_stories.json";

interface Story {
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

const CHARACTER_META: Record<string, { label: string; bengali: string }> = {
  feluda: { label: "Feluda", bengali: "ফেলুদা" },
  byomkesh: { label: "Byomkesh Bakshi", bengali: "ব্যোমকেশ বক্সী" },
  professor_shonku: { label: "Professor Shonku", bengali: "প্রফেসর শঙ্কু" },
  sherlock_holmes: { label: "Sherlock Holmes", bengali: "শার্লক হোমস" },
  daroga_priyonath: { label: "Daroga Priyonath", bengali: "দারোগা প্রিয়নাথ" },
  kiriti: { label: "Kiriti Roy", bengali: "কিরীটী রায়" },
  tenida: { label: "Tenida", bengali: "টেনিদা" },
  miss_marple: { label: "Miss Marple", bengali: "মিস মার্পল" },
};

function cleanTitle(rawTitle?: string | null): {
  cleanTitle: string;
  character?: string;
  author?: string;
} {
  if (!rawTitle || typeof rawTitle !== "string") {
    return { cleanTitle: "Untitled Audio Story" };
  }
  const parts = rawTitle.split("|").map((p) => p.trim());
  let character: string | undefined;
  let author: string | undefined;

  const titleLower = rawTitle.toLowerCase();
  if (titleLower.includes("feluda") || titleLower.includes("ফেলুদা"))
    character = "feluda";
  else if (titleLower.includes("byomkesh") || titleLower.includes("ব্যোমকেশ"))
    character = "byomkesh";
  else if (titleLower.includes("shonku") || titleLower.includes("শঙ্কু"))
    character = "professor_shonku";
  else if (titleLower.includes("sherlock") || titleLower.includes("শার্লক"))
    character = "sherlock_holmes";
  else if (titleLower.includes("tenida") || titleLower.includes("টেনিদা"))
    character = "tenida";
  else if (titleLower.includes("kiriti") || titleLower.includes("কিরীটী"))
    character = "kiriti";
  else if (
    titleLower.includes("daroga priyonath") ||
    titleLower.includes("প্রিয়নাথ")
  )
    character = "daroga_priyonath";
  else if (titleLower.includes("miss marple")) character = "miss_marple";

  if (titleLower.includes("satyajit ray") || titleLower.includes("সত্যজিৎ রায়"))
    author = "Satyajit Ray";
  else if (
    titleLower.includes("saradindu") ||
    titleLower.includes("শরদিন্দু")
  )
    author = "Sharadindu Bandyopadhyay";
  else if (titleLower.includes("arthur conan doyle"))
    author = "Sir Arthur Conan Doyle";
  else if (
    titleLower.includes("rabindranath tagore") ||
    titleLower.includes("রবীন্দ্রনাথ")
  )
    author = "Rabindranath Tagore";
  else if (titleLower.includes("taradas bandyopadhyay"))
    author = "Taradas Bandyopadhyay";
  else if (titleLower.includes("bibhutibhushan"))
    author = "Bibhutibhushan Bandyopadhyay";
  else if (titleLower.includes("narayan gangopadhyay"))
    author = "Narayan Gangopadhyay";
  else if (titleLower.includes("nihar ranjan gupta"))
    author = "Nihar Ranjan Gupta";

  const meaningful = parts.filter(
    (p) =>
      !p.toLowerCase().includes("sunday suspense") &&
      !p.toLowerCase().includes("mirchi bangla") &&
      !p.toLowerCase().includes("mirchi 98.3") &&
      !p.toLowerCase().includes("audio story") &&
      !p.toLowerCase().includes("full story")
  );

  return {
    cleanTitle: meaningful[0] || parts[0] || rawTitle,
    character,
    author,
  };
}

function normalizeStory(raw: any, collectionName: string): Story | null {
  const ytId = raw.id || raw.youtubeId || raw.url?.split("v=")[1];
  if (!ytId) return null;
  const rawTitle = raw.title || "";
  const info = cleanTitle(rawTitle);

  return {
    id: ytId,
    title: rawTitle,
    cleanTitle: info.cleanTitle,
    youtubeId: ytId,
    youtubeUrl: `https://www.youtube.com/watch?v=${ytId}`,
    embedUrl: `https://www.youtube.com/embed/${ytId}`,
    thumbnailUrl:
      raw.thumbnail ||
      raw.thumbnails?.[0]?.url ||
      `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
    durationSeconds: Number(raw.duration || raw.durationSeconds) || 0,
    duration: raw.duration_string || raw.duration || "00:00",
    position: raw.playlist_index,
    collection: collectionName,
    characterSeries: info.character,
    author: info.author,
  };
}

// In-memory cache of stories
const allStories: Story[] = (() => {
  const list: Story[] = [];
  const seen = new Set<string>();

  const rawList: any[] = Array.isArray(rawStories)
    ? rawStories
    : (rawStories as any)?.stories || [];

  for (const s of rawList) {
    const item = normalizeStory(s, "Sunday Suspense");
    if (item && !seen.has(item.id)) {
      seen.add(item.id);
      list.push(item);
    }
  }

  const sherlockList: any[] = Array.isArray(rawSherlock)
    ? rawSherlock
    : (rawSherlock as any)?.stories || [];

  for (const s of sherlockList) {
    const item = normalizeStory(s, "Sherlock Holmes");
    if (item && !seen.has(item.id)) {
      seen.add(item.id);
      item.characterSeries = "sherlock_holmes";
      item.author = "Sir Arthur Conan Doyle";
      list.push(item);
    }
  }

  return list;
})();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url || "/", "http://localhost");
  const pathname = url.pathname.replace(/\/$/, "");

  // 1. /api/health
  if (pathname === "/api/health" || pathname === "/api") {
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        status: "ok",
        totalStories: allStories.length,
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  // 2. /api/collections
  if (pathname === "/api/collections") {
    const categories = Object.entries(CHARACTER_META).map(([slug, meta]) => {
      const count = allStories.filter((s) => s.characterSeries === slug).length;
      return {
        slug,
        name: meta.label,
        bengali: meta.bengali,
        count,
      };
    });
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        totalStories: allStories.length,
        collections: categories,
      })
    );
    return;
  }

  // 3. /api/discover/random
  if (pathname === "/api/discover/random") {
    const randomIndex = Math.floor(Math.random() * allStories.length);
    res.statusCode = 200;
    res.end(JSON.stringify(allStories[randomIndex]));
    return;
  }

  // 4. /api/stories/:id
  const storyMatch = pathname.match(/^\/api\/stories\/([a-zA-Z0-9_-]+)$/);
  if (storyMatch) {
    const id = storyMatch[1];
    const story = allStories.find((s) => s.id === id || s.youtubeId === id);
    if (!story) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "Story not found" }));
      return;
    }
    res.statusCode = 200;
    res.end(JSON.stringify(story));
    return;
  }

  // 5. /api/stories (with search & filters)
  if (pathname === "/api/stories") {
    let filtered = allStories;
    const character = url.searchParams.get("character");
    const collection = url.searchParams.get("collection");
    const search = url.searchParams.get("search");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.max(
      1,
      Math.min(600, parseInt(url.searchParams.get("limit") || "600", 10))
    );

    if (character) {
      filtered = filtered.filter((s) => s.characterSeries === character);
    }
    if (collection) {
      const colLower = collection.toLowerCase();
      filtered = filtered.filter((s) =>
        s.collection.toLowerCase().includes(colLower)
      );
    }
    if (search) {
      const terms = search.toLowerCase().trim().split(/\s+/);
      filtered = filtered.filter((s) => {
        const target =
          `${s.title} ${s.cleanTitle} ${s.author || ""} ${s.characterSeries || ""}`.toLowerCase();
        return terms.every((term) => target.includes(term));
      });
    }

    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit),
        stories: paginated,
      })
    );
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: "Endpoint not found" }));
}
