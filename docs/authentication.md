# Authentication & Authorization

Tempo uses [NextAuth.js](https://next-auth.js.org/) with a **Credentials provider** backed by MongoDB. Sessions are stored as signed JWTs in an HTTP-only cookie.

---

## How it works

1. A user submits their email and password to `POST /api/auth/[...nextauth]` (handled automatically by NextAuth).
2. The `authorize` callback in `lib/auth.ts` validates the credentials with Zod, applies a per-email rate limit, then compares the submitted password against the bcrypt hash stored in MongoDB.
3. On success, NextAuth issues a JWT containing `id` and `role`.
4. Every protected API route calls `getServerSession(authOptions)` to verify the JWT and extract `session.user.id`.

---

## Registration

```
POST /api/register
```

**Body**

```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "min-8-chars"
}
```

**Validation rules**

| Field | Rule |
|---|---|
| `name` | 1–100 characters |
| `email` | Valid email, unique |
| `password` | Minimum 8 characters, stored as bcrypt hash (cost 12) |

**Responses**

| Status | Meaning |
|---|---|
| `201` | User created, auto-signed in |
| `400` | Validation error or email already taken |
| `429` | Rate limited — too many registrations from this IP |

---

## Login

Navigate to `/login`. The form POSTs to NextAuth's credentials endpoint. On success, NextAuth writes a JWT cookie (`next-auth.session-token`) and redirects to `/dashboard`.

**Rate limiting** — Login is rate-limited to **10 attempts per email per 15 minutes** to prevent brute-force attacks. After 10 failures the account is temporarily locked from further login attempts until the window expires.

---

## Session structure

After sign-in, `useSession()` (client) or `getServerSession()` (server) returns:

```ts
{
  user: {
    id: string;        // MongoDB ObjectId as string
    name: string | null;
    email: string;
    role: "member" | "admin";  // extensible
  },
  expires: string;     // ISO timestamp
}
```

---

## JWT payload

The JWT stored in the cookie contains:

| Claim | Value |
|---|---|
| `id` | User's MongoDB `_id` |
| `role` | `"member"` (default) or `"admin"` |

The JWT is signed with `NEXTAUTH_SECRET`. **Never expose this secret.**

---

## Session lifetime

JWTs expire after **30 days** (`maxAge: 30 * 24 * 60 * 60` seconds). NextAuth automatically refreshes the cookie on each request before expiry.

---

## Sign out

```ts
import { signOut } from "next-auth/react";
signOut({ callbackUrl: "/login" });
```

Or navigate to `/api/auth/signout` directly.

---

## Protecting pages

All pages inside `AppShell` automatically redirect unauthenticated users via the `middleware.ts` file, which matches every route except `/login`, `/signup`, and NextAuth's own `/api/auth/*` endpoints.

```ts
// middleware.ts (simplified)
export { default } from "next-auth/middleware";
export const config = {
  matcher: ["/((?!login|signup|api/auth).*)"],
};
```

---

## Protecting API routes

Every API route handler that requires authentication starts with:

```ts
const session = await getServerSession(authOptions);
if (!session?.user?.id) {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}
```

---

## Password security

- Passwords are hashed with **bcrypt** at cost factor **12** before storage.
- Plaintext passwords are never logged or returned by any API.
- The `password` field on the User document is selected with `.select("+password")` only during the `authorize` callback — it is excluded from all other queries.

---

## Role system

The `role` field on each user is stored in MongoDB and encoded in the JWT. Currently two roles exist:

| Role | Description |
|---|---|
| `member` | Default for all registered users |
| `admin` | Reserved for future admin UI features |

Role-based API guards are not yet implemented beyond the field existing — all authenticated users currently have full access to all resources.
