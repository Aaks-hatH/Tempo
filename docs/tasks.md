# Tasks

The task board is Tempo's core work-tracking surface. It uses a **Kanban layout** with four columns that represent a task's lifecycle, and supports drag-and-drop reordering, priority levels, due dates, project assignment, and teammate pings.

---

## Columns

| Column | Status value | Meaning |
|---|---|---|
| Backlog | `TODO` | Not started |
| In Progress | `IN_PROGRESS` | Actively being worked on |
| Review | `REVIEW` | Awaiting review or approval |
| Done | `DONE` | Completed |

---

## Creating a task

Click **New task** (top-right) or the **+** button inside any column header.

The create modal accepts:

| Field | Required | Notes |
|---|---|---|
| Title | Yes | 1–255 characters |
| Priority | No | `LOW`, `MEDIUM`, `HIGH`, `URGENT` — defaults to `MEDIUM` |
| Due date | No | ISO date picker |
| Project | No | Assigns the task to a project; affects project progress counters |

The task is immediately added optimistically to the correct column.

---

## Assigning a task to a project

Open any task's **create modal** or use the **⋮ menu → Move** action. Select a project from the dropdown. Once assigned, the task is counted toward that project's progress bar.

You can also create tasks directly from the **Projects page** using the "Add task" button on each project card — those tasks are automatically linked to that project.

---

## Task priority

Each task card shows its priority as a colored badge:

| Priority | Color |
|---|---|
| `LOW` | Slate |
| `MEDIUM` | Blue |
| `HIGH` | Orange |
| `URGENT` | Red |

---

## Moving tasks

**Drag and drop** — Grab a card and drop it on a different column. The status change is sent to the server immediately.

**Context menu** — Hover a card and click the **⌄** chevron. A dropdown lists all other columns with "Move to …" options.

---

## Pinging about a task

Hover a card and click the **⚡ bolt** icon to send a ping to a teammate with the task attached. The recipient sees the task title inside their notification.

---

## Assigning a task to a teammate

Hover a card and click the **👤+** icon. This opens the Ping modal in "assign" mode — you pick a teammate and they receive an "Assigned a task" notification.

---

## Deleting a task

Hover the card → click **⌄** → **Delete**. Deletion is immediate and cannot be undone from the UI.

---

## Tags

Tasks support up to 20 tags (max 32 chars each). Tags are displayed as small badges on the card. Tags can be set via the API (`PATCH /api/tasks/:id`); a tag editing UI is planned.

---

## Checklist items

The Task model supports a `checklist` array of `{ text, done }` items. These can be set via the API but do not yet have a UI — a checklist panel is on the roadmap.

---

## Recurrence

A `recurrence` string field exists on the Task model for future recurring task support.

---

## API

### List tasks

```
GET /api/tasks
```

**Query parameters**

| Param | Type | Description |
|---|---|---|
| `all` | `"true"` | Return all team tasks instead of only your own |
| `status` | string | Filter by status (`TODO`, `IN_PROGRESS`, etc.) |
| `projectId` | string | Filter by project ID |
| `search` | string | Case-insensitive regex search on title |

**Response**

```json
{
  "tasks": [
    {
      "_id": "...",
      "title": "Write release notes",
      "priority": "HIGH",
      "status": "IN_PROGRESS",
      "dueAt": "2026-05-20T00:00:00.000Z",
      "tags": ["release"],
      "projectId": { "_id": "...", "name": "Q2 Launch", "color": "#3B82F6" },
      "userId": { "_id": "...", "name": "Alice", "email": "alice@example.com" },
      "assignedTo": null
    }
  ]
}
```

---

### Create a task

```
POST /api/tasks
```

**Body**

```json
{
  "title": "Write release notes",
  "priority": "HIGH",
  "status": "TODO",
  "dueAt": "2026-05-20T00:00:00.000Z",
  "projectId": "<project-id>",
  "assignedTo": "<user-id>",
  "tags": ["release", "docs"]
}
```

**Response** — `201 Created`

```json
{ "task": { "_id": "...", ... } }
```

---

### Get a single task

```
GET /api/tasks/:id
```

---

### Update a task

```
PATCH /api/tasks/:id
```

All fields are optional. Only provided fields are updated.

```json
{
  "status": "DONE",
  "title": "Updated title",
  "priority": "URGENT",
  "dueAt": null,
  "tags": ["v2"],
  "checklist": [
    { "text": "Write tests", "done": true },
    { "text": "Update docs", "done": false }
  ]
}
```

Marking a task `DONE` automatically creates an `Activity` record of type `task_completed`.

---

### Delete a task

```
DELETE /api/tasks/:id
```

**Response** — `200`

```json
{ "success": true }
```
