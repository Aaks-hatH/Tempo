# Tempo

Tempo is a private internal workspace built for the Hash Browns team. It replaces scattered tools with a single hub for tasks, chat, calendar, notes, focus sessions, video calls, and live team presence.

## Built by

| Name | Role |
|------|------|
| Aakshat Hariharan | Director of Cybersecurity & Threat Intelligence |
| Advaith Banigandlapati | Principal Engineer & Product Architect |
| Abhimanyu Daripally | Backend Infrastructure & Systems Architect |
| Nivas Palaniappan | Head of Growth, Brand & Digital Strategy |

## Features

- **Dashboard** — task summary, today's events, focus stats, activity feed, and live team presence all on one screen.
- **Tasks** — list and Kanban views with priorities, tags, and due times.
- **Calendar** — week and month views, colour-coded events, click any time slot to create.
- **Projects** — project cards with progress bars and milestone tracking.
- **Chat** — channel-based messaging with real-time polling and full message history.
- **Notes** — pinnable, colour-coded notes with autosave and full-text search.
- **Focus** — Pomodoro timer with arc progress, streak tracking, and weekly session stats.
- **Calls** — PIN-protected video rooms built with WebRTC.
- **Notifications & Pings** — real-time bell notifications and direct teammate pings.
- **Presence** — heartbeat-based online indicators so you always know who's around.
- **Settings** — profile editing, accent colour picker, font size, compact mode, notification preferences, and keyboard shortcuts.

## Tech stack

- **Framework** — Next.js 15 (App Router)
- **Language** — TypeScript
- **Styling** — Tailwind CSS v4
- **Animations** — Framer Motion
- **Database** — MongoDB via Mongoose
- **Auth** — NextAuth.js with credentials + bcrypt
- **Validation** — Zod
- **State** — Zustand

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set these three environment variables before running:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string (Atlas M0 free tier works) |
| `NEXTAUTH_SECRET` | Any long random string |
| `NEXTAUTH_URL` | `http://localhost:3000` for local dev |

## Deployment

Deploy the Next.js app on **Vercel Hobby**, use **MongoDB Atlas M0** for the database, and keep the repo on **GitHub Free** for automatic deploys on push. See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full step-by-step.

## Access

This is a closed workspace — the login page and signup are restricted to team members. The root `/` shows a landing page; authenticated users are redirected directly to the dashboard.