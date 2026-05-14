# Deploy Tempo for free

This guide gives you the cheapest practical deployment path for Tempo: **Vercel Hobby for the Next.js app** + **MongoDB Atlas M0 Free for the database** + **NextAuth credentials auth inside the app**.

> Free tiers change over time and have limits. This setup is best for prototypes, demos, portfolios, student projects, and early validation. For commercial production or higher traffic, review each provider's latest pricing and terms.

## TL;DR: where to deploy

Deploy Tempo here:

1. **Vercel Hobby** — deploy the **Next.js 15 web app**.
2. **MongoDB Atlas M0 Free** — host the **MongoDB database** used by Mongoose.
3. **GitHub Free** — store the repo and trigger Vercel preview/production deployments.

Do **not** deploy this app as a static-only site because Tempo uses a full-stack Next.js architecture with runtime API routes, NextAuth credentials sessions, bcrypt password hashing, and MongoDB/Mongoose models. Vercel is the best fit for this repository because it supports Next.js with minimal configuration.

## Recommended free stack

| Layer | Free provider | Why |
| --- | --- | --- |
| Web app / SSR / API routes | Vercel Hobby | First-class Next.js deployment, Git-based CI/CD, preview URLs, and no server maintenance. |
| Database | MongoDB Atlas M0 Free | Hosted MongoDB works directly with Mongoose and has a permanent free cluster tier suitable for demos. |
| Auth | NextAuth credentials provider | Runs in the Next.js app with JWT sessions; no separate paid auth service required. |
| Source + optional CI | GitHub Free / GitHub Actions | Good for hosting the repo and optionally running checks. |

## 1. Prepare the repository

```bash
npm install
cp .env.example .env.local
npm run typecheck
npm run build
```

If install fails because of a private registry or organization policy, reset npm to the public registry and retry:

```bash
npm config set registry https://registry.npmjs.org/
npm install
```

## 2. Create the free MongoDB backend

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free M0 cluster.
2. Create a database user with a strong password.
3. Add your IP address for local development. For Vercel, add the Atlas network access rule recommended by MongoDB/Vercel for serverless deployments.
4. Copy the connection string and set it locally:

```bash
MONGODB_URI="mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/tempo?retryWrites=true&w=majority"
NEXTAUTH_SECRET="replace-with-openssl-rand-base64-32-output"
NEXTAUTH_URL="http://localhost:3000"
```

Generate a local secret with:

```bash
openssl rand -base64 32
```

Mongoose creates collections and indexes from the models when the app connects. There is no migration command required for the current schema.

## 3. Deploy the Next.js app on Vercel for free

### Option A: Vercel dashboard

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com), choose **Add New → Project**, and import the GitHub repo.
3. Keep defaults:
   - Framework preset: **Next.js**
   - Build command: `npm run build`
   - Install command: `npm install`
4. Add environment variables in **Project Settings → Environment Variables**:

```bash
MONGODB_URI
NEXTAUTH_SECRET
NEXTAUTH_URL
```

5. Set `NEXTAUTH_URL` to your deployed Vercel URL, for example:

```bash
NEXTAUTH_URL="https://your-tempo-app.vercel.app"
```

6. Deploy.

### Option B: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
vercel env add MONGODB_URI production
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production
vercel --prod
```

## 4. Free-tier caveats

- **Vercel Hobby** is excellent for demos and non-commercial/hobby projects, but review Vercel's terms before using it for a revenue-generating business.
- **MongoDB Atlas M0 Free** has storage, connection, region, and performance limits.
- **No free tier is unlimited**. Add usage monitoring before inviting real users.
- Keep `NEXTAUTH_SECRET` private and generate a unique value for every environment.
- Never commit `.env.local` or production secrets to git.

## Best answer: where should Tempo deploy?

For a zero-dollar launch, deploy **Tempo on Vercel Hobby** and use **MongoDB Atlas M0 Free** for the database. This is the fastest, cleanest, and most compatible free path for the current Next.js 15 + NextAuth + Mongoose architecture.
