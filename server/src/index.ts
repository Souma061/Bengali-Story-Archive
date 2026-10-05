import Fastify from 'fastify';
import cors from '@fastify/cors';
import { loadAllStories, CHARACTER_META } from './data.js';

const fastify = Fastify({
  logger: true,
});

await fastify.register(cors, {
  origin: true,
});

// Warm up data cache
const allStories = loadAllStories();

// 1. Health check
fastify.get('/api/health', async () => {
  return { status: 'ok', totalStories: allStories.length, timestamp: new Date().toISOString() };
});

// 2. Collections / Categories
fastify.get('/api/collections', async () => {
  const categories = Object.entries(CHARACTER_META).map(([slug, meta]) => {
    const count = allStories.filter((s) => s.characterSeries === slug).length;
    return {
      slug,
      name: meta.label,
      bengali: meta.bengali,
      count,
    };
  });

  return {
    totalStories: allStories.length,
    collections: categories,
  };
});

// 3. Stories list with search and filters
fastify.get('/api/stories', async (request) => {
  const query = request.query as {
    search?: string;
    character?: string;
    collection?: string;
    page?: string;
    limit?: string;
  };

  let filtered = allStories;

  if (query.character) {
    filtered = filtered.filter((s) => s.characterSeries === query.character);
  }

  if (query.collection) {
    const colLower = query.collection.toLowerCase();
    filtered = filtered.filter((s) => s.collection.toLowerCase().includes(colLower));
  }

  if (query.search) {
    const searchTerms = query.search.toLowerCase().trim().split(/\s+/);
    filtered = filtered.filter((s) => {
      const target = `${s.title} ${s.cleanTitle} ${s.author || ''} ${s.characterSeries || ''}`.toLowerCase();
      return searchTerms.every((term) => target.includes(term));
    });
  }

  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(query.limit || '24', 10)));
  const offset = (page - 1) * limit;

  const paginated = filtered.slice(offset, offset + limit);

  return {
    total: filtered.length,
    page,
    limit,
    totalPages: Math.ceil(filtered.length / limit),
    stories: paginated,
  };
});

// 4. Random story discovery ("Tune Into A Random Story")
fastify.get('/api/discover/random', async () => {
  if (allStories.length === 0) return { error: 'No stories found' };
  const randomIndex = Math.floor(Math.random() * allStories.length);
  return allStories[randomIndex];
});

// 5. Get single story by ID
fastify.get('/api/stories/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const story = allStories.find((s) => s.id === id || s.youtubeId === id);
  if (!story) {
    return reply.status(404).send({ error: 'Story not found' });
  }
  return story;
});

// 6. Get related stories
fastify.get('/api/stories/:id/related', async (request, reply) => {
  const { id } = request.params as { id: string };
  const story = allStories.find((s) => s.id === id || s.youtubeId === id);
  if (!story) {
    return reply.status(404).send({ error: 'Story not found' });
  }

  let related = allStories.filter((s) => s.id !== story.id);
  if (story.characterSeries) {
    related = related.filter((s) => s.characterSeries === story.characterSeries);
  } else if (story.author) {
    related = related.filter((s) => s.author === story.author);
  }

  return related.slice(0, 6);
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 4000;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Fastify server ready at http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
