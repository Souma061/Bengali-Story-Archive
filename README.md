# Golpo Ghar (গল্প ঘর) — Sunday Suspense Archive

> **বাংলা ক্লাসিক অডিও গল্পের ডিজিটাল আর্কাইভ**
> A retro-inspired web platform for discovering and listening to Bengali classic audio stories (Sunday Suspense, Sherlock Holmes, Feluda, Byomkesh, Professor Shonku, etc.) powered by official YouTube playback.

---

## 🚀 Quick Start

Ensure you have **Node.js (>= 20)** and **pnpm (>= 9)** installed.

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Run Both Frontend and Backend (Development)
```bash
pnpm dev
```

* **Frontend (React + Vite)**: `http://localhost:3000`
* **Backend API (Fastify)**: `http://localhost:4000`

---

## 📁 Project Structure

```text
sunday_suspense/
├── Data/                   # Curated metadata & extraction files (520+ stories)
│   ├── stories.json
│   ├── sherlock_stories.json
│   ├── feluda.json
│   ├── byomkesh.json
│   └── ...
├── Docs/                   # Project documentation
│   ├── PRD.md              # Product Requirements Document
│   ├── architecture.md     # Architecture & stack
│   └── design.md           # Design system & retro specifications
├── client/                 # Frontend (React 19 + TypeScript + Tailwind CSS v4)
│   ├── src/
│   │   ├── App.tsx         # Retro radio interface, category dial, player modal
│   │   ├── index.css       # Tailwind & vintage styling
│   │   └── types.ts
│   └── vite.config.ts      # Proxies /api requests to :4000
├── server/                 # Backend (Fastify + TypeScript)
│   ├── src/
│   │   ├── index.ts        # REST API endpoints
│   │   └── data.ts         # Ingestion & normalization layer
│   └── tsconfig.json
├── pnpm-workspace.yaml     # pnpm monorepo configuration
└── package.json            # Root workspace scripts
```

---

## 📻 API Endpoints

- `GET /api/health` — System status and total story count.
- `GET /api/collections` — Detective & character series counts (Feluda, Byomkesh, Shonku, etc.).
- `GET /api/stories?page=1&limit=24&character=feluda&search=angti` — Paginated and filtered story catalogue.
- `GET /api/stories/:id` — Single story metadata.
- `GET /api/stories/:id/related` — Related stories by series or author.
- `GET /api/discover/random` — Random story discovery dial.
