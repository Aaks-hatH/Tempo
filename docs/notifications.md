# Notifications & Pings

Tempo's notification system is built around **Pings** — lightweight messages one user sends to another, optionally attached to a task. Pings power both the in-app notification panel and browser desktop notifications.

---

## Ping types

| Type | Icon | When it's used |
|---|---|---|
| `ping` | ⚡ Yellow bolt | General "hey, look at this" nudge |
| `assign` | 📋 Blue clipboard | Assigning a task to someone |
| `mention` | 💬 Purple bubble | Mentioning someone (e.g. in chat, future) |
| `request` | 👤 Green person | Requesting someone's help |

All four types appear in the notification panel. All four types trigger in-app toast popups and browser desktop notifications.

---

## Sending a ping

**From a task card** — Hover any task card on the board and click:

- **⚡** (bolt) → opens the Ping modal in `ping` mode
- **👤+** (user-plus) → opens the Ping modal in `assign` mode

**From the Ping modal** — Select a teammate, choose a ping type, optionally add a message, and click **Send ping**.

---

## Receiving notifications

### In-app notification panel

Click the **bell icon** (🔔) in the top status bar. The panel opens and shows all unread and recent pings. Each entry shows:

- The sender's name
- The ping type label
- The attached task title (if any)
- A quoted message (if any)
- A relative timestamp ("2m ago", "3h ago")

Unread pings are highlighted with a blue left dot. Clicking an unread ping marks it as read.

### Toast pop-ups

When a new ping arrives (within 2 minutes of being sent), a toast notification slides in from the top-right corner of the screen. Toasts automatically dismiss after 5 seconds. You can also dismiss them manually.

Up to 4 toasts stack simultaneously. Older ones are replaced when a fifth arrives.

### Browser desktop notifications

Tempo requests browser notification permission the first time you open the app (after a 3-second delay). You can also enable them by clicking **Enable alerts** inside the notification panel.

Once granted, desktop notifications fire for new pings that are less than 2 minutes old. Each sender is rate-limited to one desktop notification per 60 seconds to avoid spam.

Desktop notifications are sent using the native [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notification) and close automatically after 6 seconds.

---

## How polling works

The notification center polls `GET /api/pings` every **12 seconds**. New unread pings that haven't been seen before trigger toasts and desktop notifications. Seen ping IDs are persisted in `sessionStorage` so they don't re-fire on soft navigation (changing pages within the app).

---

## Marking notifications read

- **Clicking a ping** in the panel marks it read.
- **Opening the panel** calls "Mark all read" automatically.
- **"All read"** button in the panel header marks every ping read in one request.

---

## Dismissing notifications

Click the **✕** on any notification in the panel to dismiss it. Dismissed pings are hidden from future fetches (`dismissed: true` in the database) but are not deleted.

---

## API

### List your pings

```
GET /api/pings
```

Returns all non-dismissed pings addressed to you, most recent first (up to 50).

**Query parameters**

| Param | Value | Description |
|---|---|---|
| `unread` | `"true"` | Return only unread count (lightweight poll) |

**Response**

```json
{
  "pings": [
    {
      "_id": "...",
      "type": "ping",
      "message": "Can you review this?",
      "taskTitle": "Write release notes",
      "read": false,
      "createdAt": "2026-05-13T10:00:00.000Z",
      "fromUserId": {
        "_id": "...",
        "name": "Alice",
        "email": "alice@example.com"
      }
    }
  ],
  "unreadCount": 3
}
```

---

### Send a ping

```
POST /api/pings
```

**Body**

```json
{
  "toUserId": "<recipient-user-id>",
  "type": "ping",
  "message": "Hey, can you check this out?",
  "taskId": "<task-id>",
  "taskTitle": "Write release notes"
}
```

**Validation**

- `toUserId` — required, must be a different user (cannot ping yourself)
- `type` — one of `ping`, `assign`, `mention`, `request`
- `message` — optional, max 500 chars
- `taskId` / `taskTitle` — optional, for attaching a task reference

**Response** — `201 Created`

```json
{ "ping": { "_id": "...", "fromUserId": { ... }, ... } }
```

---

### Mark pings read / dismissed

```
PATCH /api/pings
```

**Mark a single ping read**

```json
{ "pingId": "<ping-id>", "read": true }
```

**Dismiss a ping**

```json
{ "pingId": "<ping-id>", "dismissed": true }
```

**Mark all read**

```
PATCH /api/pings?action=read-all
```

No body required.

---

## Troubleshooting

**I'm not seeing toasts**

1. Check that the ping was sent within the last 2 minutes. Older pings that predate your page load won't trigger toasts (they appear in the panel instead).
2. Make sure you're the `toUserId` on the ping — you don't get notified for pings you sent.
3. Open the notification panel (bell icon) to confirm pings are actually arriving.

**Desktop notifications aren't appearing**

1. Click the bell icon. If you see **"Enable alerts"** in the panel header, click it to grant permission.
2. Check your OS notification settings — browsers respect the OS-level "Do Not Disturb" setting.
3. Confirm `Notification.permission` is `"granted"` (not `"denied"`) in your browser's site settings.
4. Note that only one desktop notification fires per sender per 60 seconds.

**The unread count badge isn't updating**

The badge polls every 15 seconds on the lightweight `?unread=true` endpoint. If it's stuck, try refreshing the page.
