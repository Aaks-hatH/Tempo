# Getting Started

This guide walks you through setting up Tempo locally from scratch.

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 18.x or later |
| npm / yarn / pnpm | Any recent version |
| MongoDB | Atlas cluster or local 6.x+ |

---

## 1. Clone and install

```bash
git clone <your-repo-url>
cd Tempo
npm install
```

---

## 2. Environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

`.env.example` contains:

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/tempo
NEXTAUTH_SECRET=<a-long-random-string>
NEXTAUTH_URL=http://localhost:3000
```

| Variable | Description |
|---|---|
| `MONGODB_URI` | Full MongoDB connection string including database name |
| `NEXTAUTH_SECRET` | A random secret used to sign JWTs — generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | The public URL of your app. In production set this to your domain. |

---

## 3. Run in development

```bash
npm run dev
```

The app starts at [http://localhost:3000](http://localhost:3000).

---

## 4. Create your first account

Navigate to `/signup`. Fill in your name, email, and password. The first user registered becomes a regular member — there is no automatic admin promotion.

After signing up you are redirected to `/dashboard`.

---

## 5. Invite teammates

Tempo does not have an email invitation flow yet. To add teammates, share your app URL and have them sign up at `/signup` themselves. Once registered, they appear in the team presence list and can be pinged, assigned tasks, and added to channels.

---

## Project structure

```
Tempo/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/                # REST API handlers
│   │   ├── activity/       # Activity feed
│   │   ├── auth/           # NextAuth.js catch-all
│   │   ├── calendar/       # Calendar events CRUD
│   │   ├── call/           # WebRTC room signaling
│   │   ├── chat/           # Channels and messages
│   │   ├── dashboard/      # Aggregated dashboard stats
│   │   ├── focus/          # Focus session CRUD
│   │   ├── notes/          # Notes CRUD
│   │   ├── pings/          # Notification pings
│   │   ├── presence/       # Online/offline heartbeat
│   │   ├── projects/       # Projects CRUD
│   │   ├── register/       # User registration
│   │   ├── settings/       # User settings PATCH
│   │   ├── tasks/          # Tasks CRUD
│   │   └── users/          # User list (team roster)
│   ├── calendar/           # Calendar page
│   ├── call/               # Video call pages
│   ├── chat/               # Chat page
│   ├── dashboard/          # Dashboard page
│   ├── focus/              # Focus session page
│   ├── login/              # Login page
│   ├── notes/              # Notes page
│   ├── projects/           # Projects page
│   ├── settings/           # Settings page
│   ├── signup/             # Registration page
│   └── tasks/              # Task board page
├── components/             # Shared React components
│   ├── app-shell.tsx       # Global layout: sidebar, command bar, presence
│   ├── command-center-bar.tsx  # Top status bar + notification bell
│   ├── command-palette.tsx # ⌘K command palette
│   ├── notification-center.tsx # Bell, toasts, desktop notifications
│   ├── ping-modal.tsx      # Send a ping to a teammate
│   ├── task-list.tsx       # Compact task list widget
│   └── video-call.tsx      # Full WebRTC video call UI
├── lib/
│   ├── auth.ts             # NextAuth configuration
│   ├── models/             # Mongoose models
│   ├── mongodb.ts          # DB connection helper
│   ├── rate-limit.ts       # In-DB rate limiter
│   └── validations.ts      # Zod schemas
├── store/
│   └── use-tempo-store.ts  # Zustand global UI state
├── types/                  # TypeScript augmentations
└── docs/                   # ← You are here
```
