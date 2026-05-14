# Calendar

The Calendar page lets you create and view events for yourself and your team.

---

## Views

The calendar supports three view modes, switchable via tabs:

| View | Description |
|---|---|
| Month | Full month grid — good for an overview |
| Week | 7-day column view with time slots |
| Day | Single-day detail with hour blocks |

---

## Creating an event

Click any date/time slot or the **+ New event** button. Fill in:

| Field | Required | Notes |
|---|---|---|
| Title | Yes | Up to 255 characters |
| Start / End | Yes | Must be valid datetimes; end must be after start |
| Color | No | Hex color picker, default blue |
| Description | No | Up to 1000 characters |
| All day | No | Toggle to mark an event as spanning the whole day |
| Shared | No | If enabled, the event is visible to all team members |

---

## Shared events

By default, events are private (only you can see them). Toggle **Shared** to make an event visible to everyone on the team. The team calendar view (`all=true`) shows all shared events alongside your own private events.

---

## API

```
GET  /api/calendar          # List events
POST /api/calendar          # Create an event
PATCH /api/calendar/:id     # Update an event
DELETE /api/calendar/:id    # Delete an event
```

**Query params for GET**

| Param | Description |
|---|---|
| `from` | ISO datetime — only return events starting after this |
| `to` | ISO datetime — only return events starting before this |
| `all` | `"true"` — include all team members' events |

---

# Chat

The Chat page is a channel-based messaging system.

---

## Channels

Channels are persistent topic rooms. Any team member can create a channel. All channels are visible to all team members.

**Creating a channel** — Click **+ New channel**, enter a name (auto-lowercased and slugified) and an optional description.

---

## Sending messages

Select a channel from the sidebar, type in the input, and press **Enter** or click **Send**. Messages are fetched via polling every few seconds.

---

## API

```
GET  /api/chat/channels           # List channels
POST /api/chat/channels           # Create a channel
GET  /api/chat/messages?channelId=...  # Get messages for a channel
POST /api/chat/messages           # Send a message
```

---

# Notes

Notes are personal markdown documents. They are private to you.

---

## Creating a note

Click **+ New note**. Enter a title and write your content in the text area. Notes are saved on submit. Content supports plain text and markdown.

---

## API

```
GET    /api/notes        # List your notes
POST   /api/notes        # Create a note
PATCH  /api/notes/:id    # Update a note
DELETE /api/notes/:id    # Delete a note
```

---

# Focus Sessions

The Focus page provides a timer for distraction-free work blocks.

---

## Starting a session

Set your desired duration, optionally label the session (e.g., "Deep work on API"), and click **Start**. The timer counts down. You can pause or end the session early.

When the timer completes, the session is marked complete and saved to your history.

---

## Session history

Completed sessions are listed below the timer showing the label, duration, and completion time. A productivity chart is on the roadmap.

---

## API

```
GET    /api/focus        # List your sessions
POST   /api/focus        # Create/start a session
PATCH  /api/focus/:id    # Mark a session complete or update it
DELETE /api/focus/:id    # Delete a session
```

---

# Video Calls

Tempo includes WebRTC-based peer-to-peer video calls using a signaling server built on MongoDB.

---

## Joining a call

Navigate to **Calls** in the sidebar. You'll see a list of active rooms. Click **Join** to enter a room, or click **New room** to create one.

Each room has a unique URL (`/call/[roomId]`) that you can share with teammates.

---

## How it works

1. A call room is created via `POST /api/call/rooms`.
2. Peers exchange WebRTC offers, answers, and ICE candidates through `POST /api/call/signal/[roomId]`.
3. The receiving peer polls `GET /api/call/signal/[roomId]` to read incoming signals.
4. Once the connection is established, video/audio flows peer-to-peer (no media server required).

---

## Limitations

- The signaling uses polling, not WebSocket — there can be a short delay on connection setup.
- No screen sharing or recording yet.
- Works best on modern browsers (Chrome, Firefox, Edge, Safari 15+).

---

# Settings & Personalization

The Settings page lets you update your profile and workspace preferences.

---

## Profile

| Setting | Description |
|---|---|
| Name | Your display name shown to teammates |
| Avatar URL | Link to a profile image (direct image URL) |
| Email | Read-only — contact an admin to change |

---

## Preferences

Settings also controls workspace personalization options such as theme, accent color, and layout density. These are stored per-user in MongoDB and applied on login.

---

## API

```
PATCH /api/settings    # Update name, avatarUrl, or preference fields
```

---

# Dashboard

The dashboard is your home page — an at-a-glance summary of what's happening in the workspace.

---

## Widgets

- **My tasks** — Your open tasks due soon
- **Team activity** — Recent actions (tasks completed, projects created)
- **Calendar preview** — Today's and upcoming events
- **Focus stats** — Your recent focus session history
- **Team online** — Who's currently online

---

## API

```
GET /api/dashboard    # Returns aggregated stats used by all dashboard widgets
```

---

# Presence & Team Awareness

Tempo tracks which team members are online using a lightweight heartbeat system.

---

## How it works

`AppShell` sends a `POST /api/presence` heartbeat every **60 seconds** with the user's current page. The server upserts a `Presence` document with `lastSeenAt = now` and `currentPage`.

When fetching the team list (`GET /api/users`), each user's presence record is checked. Users with `lastSeenAt` within the last **5 minutes** are marked `isOnline: true`.

---

## Where you see it

- **Command center bar** — Shows the number of team members currently online
- **Sidebar** — Green dot indicator next to online teammates
- **Ping modal** — Shows each teammate's online status when choosing who to ping

---

## API

```
POST /api/presence    # Heartbeat — { currentPage: "/tasks" }
GET  /api/users       # Team list with isOnline status
```
