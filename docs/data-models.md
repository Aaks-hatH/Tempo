# Data Models

All models are defined with Mongoose and stored in MongoDB. Each model file lives in `lib/models/`.

---

## User

```ts
{
  name?: string;           // Display name (1–100 chars)
  email: string;           // Unique, required
  password: string;        // bcrypt hash, excluded from queries by default
  role: "member" | "admin"; // Defaults to "member"
  avatarUrl?: string;      // Optional profile picture URL
  // ... preference fields managed via settings
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Task

```ts
{
  title: string;           // Required, max 255 chars
  description?: string;    // Max 2000 chars
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";  // Default: MEDIUM
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";  // Default: TODO
  dueAt?: Date;
  order: number;           // For manual sorting within a column
  recurrence?: string;     // Reserved for future recurring tasks
  tags: string[];          // Max 20 tags, each max 32 chars
  checklist: Array<{ text: string; done: boolean }>;
  userId: ObjectId;        // ref: User — creator
  assignedTo?: ObjectId;   // ref: User — assignee
  projectId?: ObjectId;    // ref: Project
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:** `userId`, `assignedTo`, `projectId`, `(userId, status)`, `(userId, dueAt)`

---

## Project

```ts
{
  name: string;            // Required, 1–100 chars
  description?: string;    // Max 500 chars
  color: string;           // Hex color, e.g. "#3B82F6"
  createdAt: Date;
  updatedAt: Date;
}
```

> Note: `taskCount`, `completedCount`, and `progress` are computed at query time via MongoDB aggregation — they are not stored on the document.

---

## Ping

```ts
{
  fromUserId: ObjectId;    // ref: User — sender
  toUserId: ObjectId;      // ref: User — recipient
  type: "ping" | "assign" | "mention" | "request";
  message?: string;        // Optional text, max 500 chars
  taskId?: ObjectId;       // ref: Task
  taskTitle?: string;      // Denormalized task title for display speed
  read: boolean;           // Default: false
  dismissed: boolean;      // Default: false (hidden from panel when true)
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:** `(toUserId, read)`, `(toUserId, createdAt)`

---

## CalendarEvent

```ts
{
  title: string;           // Required, max 255 chars
  startsAt: Date;          // Required
  endsAt: Date;            // Required
  color: string;           // Hex color, default "#3B82F6"
  description?: string;    // Max 1000 chars
  allDay: boolean;         // Default: false
  shared: boolean;         // If true, visible to all team members
  userId: ObjectId;        // ref: User — creator
  createdAt: Date;
  updatedAt: Date;
}
```

---

## ChatMessage

```ts
{
  channelId: ObjectId;     // ref: Channel
  userId: ObjectId;        // ref: User — sender
  content: string;         // Required, max 5000 chars
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Channel

```ts
{
  name: string;            // Required, unique, lowercase slug
  description?: string;
  createdBy: ObjectId;     // ref: User
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Note

```ts
{
  userId: ObjectId;        // ref: User — owner
  title: string;           // Max 255 chars
  content?: string;        // Max 50,000 chars (markdown)
  createdAt: Date;
  updatedAt: Date;
}
```

---

## FocusSession

```ts
{
  userId: ObjectId;        // ref: User
  duration: number;        // Planned duration in minutes
  completedAt?: Date;      // Set when session ends
  label?: string;          // Optional session label
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Presence

```ts
{
  userId: ObjectId;        // ref: User, unique
  lastSeenAt: Date;        // Updated on every heartbeat
  currentPage?: string;    // e.g. "/tasks"
  createdAt: Date;
  updatedAt: Date;
}
```

A user is considered **online** if `lastSeenAt > now - 5 minutes`. The presence heartbeat fires every 60 seconds from `AppShell`.

---

## Activity

```ts
{
  userId: ObjectId;        // ref: User — who did the action
  type: "task_created" | "task_completed" | "project_created";
  resourceId: string;      // The affected resource's ID
  resourceType: "task" | "project";
  meta: Record<string, unknown>;  // e.g. { title: "Write docs" }
  createdAt: Date;
  updatedAt: Date;
}
```

---

## CallRoom

```ts
{
  name: string;
  createdBy: ObjectId;     // ref: User
  participants: ObjectId[]; // ref: User[]
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## CallSignal

```ts
{
  roomId: ObjectId;        // ref: CallRoom
  fromUserId: ObjectId;    // ref: User
  toUserId: ObjectId;      // ref: User
  type: "offer" | "answer" | "ice-candidate";
  payload: Record<string, unknown>;  // SDP or ICE candidate
  consumed: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## RateLimit

```ts
{
  key: string;             // e.g. "login:alice@example.com"
  count: number;
  resetAt: Date;           // TTL — document is deleted after this time
  createdAt: Date;
  updatedAt: Date;
}
```

Rate limits are stored in MongoDB with a TTL index on `resetAt` so documents auto-delete after the window expires.
