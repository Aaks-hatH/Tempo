# API Reference

All API routes are under `/api/`. Every route requires an authenticated session (JWT cookie) unless noted. All request bodies must be `Content-Type: application/json`. All responses are JSON.

---

## Authentication

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/register` | Create a new user account |
| `POST` | `/api/auth/[...nextauth]` | NextAuth sign-in / sign-out / session |

---

## Tasks

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/tasks` | List tasks (`all`, `status`, `projectId`, `search` params) |
| `POST` | `/api/tasks` | Create a task |
| `GET` | `/api/tasks/:id` | Get a single task |
| `PATCH` | `/api/tasks/:id` | Update a task (partial) |
| `DELETE` | `/api/tasks/:id` | Delete a task |

See [Tasks](./tasks.md) for full field documentation.

---

## Projects

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/projects` | List all projects with task counts |
| `POST` | `/api/projects` | Create a project |
| `PATCH` | `/api/projects/:id` | Update a project |
| `DELETE` | `/api/projects/:id` | Delete a project |

See [Projects](./projects.md) for full field documentation.

---

## Calendar

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/calendar` | List events (`from`, `to`, `all` params) |
| `POST` | `/api/calendar` | Create an event |
| `PATCH` | `/api/calendar/:id` | Update an event |
| `DELETE` | `/api/calendar/:id` | Delete an event |

**Create event body**

```json
{
  "title": "Sprint review",
  "startsAt": "2026-05-20T10:00:00.000Z",
  "endsAt": "2026-05-20T11:00:00.000Z",
  "color": "#8B5CF6",
  "description": "End-of-sprint demo",
  "allDay": false,
  "shared": true
}
```

---

## Chat

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/chat/channels` | List all channels |
| `POST` | `/api/chat/channels` | Create a channel |
| `GET` | `/api/chat/messages` | Get messages (`channelId`, `before`, `limit` params) |
| `POST` | `/api/chat/messages` | Send a message |

**Create channel body**

```json
{ "name": "design", "description": "Design team channel" }
```

**Send message body**

```json
{ "channelId": "<channel-id>", "content": "Hello team!" }
```

---

## Pings / Notifications

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/pings` | List pings for current user |
| `POST` | `/api/pings` | Send a ping to a teammate |
| `PATCH` | `/api/pings` | Mark read / dismissed |
| `PATCH` | `/api/pings?action=read-all` | Mark all pings read |

See [Notifications](./notifications.md) for full documentation.

---

## Notes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/notes` | List your notes |
| `POST` | `/api/notes` | Create a note |
| `PATCH` | `/api/notes/:id` | Update a note |
| `DELETE` | `/api/notes/:id` | Delete a note |

**Create note body**

```json
{
  "title": "Meeting notes",
  "content": "## Action items\n- [ ] Follow up with Alice"
}
```

---

## Focus Sessions

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/focus` | List your focus sessions |
| `POST` | `/api/focus` | Start / create a session |
| `PATCH` | `/api/focus/:id` | Update (e.g. mark complete) |
| `DELETE` | `/api/focus/:id` | Delete a session |

---

## Video Calls

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/call/rooms` | List active call rooms |
| `POST` | `/api/call/rooms` | Create a call room |
| `GET` | `/api/call/rooms/:roomId` | Get a single room |
| `GET` | `/api/call/signal/:roomId` | Poll for WebRTC signals |
| `POST` | `/api/call/signal/:roomId` | Send a WebRTC signal |

---

## Users & Presence

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/users` | List all team members with online status |
| `POST` | `/api/presence` | Heartbeat — marks you online and updates current page |

**Presence heartbeat body**

```json
{ "currentPage": "/tasks" }
```

---

## Dashboard

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/dashboard` | Aggregated stats: task counts, events today, active sessions |

---

## Activity Feed

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/activity` | Recent activity records (task created/completed, project created) |

---

## Settings

| Method | Route | Description |
|---|---|---|
| `PATCH` | `/api/settings` | Update profile (name, avatar URL, preferences) |

---

## Error responses

All errors follow this shape:

```json
{ "message": "Unauthorized" }
```

Validation errors include field-level detail:

```json
{
  "errors": {
    "title": ["String must contain at least 1 character(s)"]
  }
}
```

| Status | Meaning |
|---|---|
| `400` | Bad request — validation failed or malformed JSON |
| `401` | Unauthorized — no valid session |
| `404` | Resource not found |
| `429` | Rate limited |
| `500` | Internal server error |
