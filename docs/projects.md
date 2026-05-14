# Projects

Projects are named containers for tasks. Each project has a color, an optional description, and automatically tracks how many tasks belong to it and how many are completed.

---

## Creating a project

Click **New project** on the Projects page. Fill in:

| Field | Required | Notes |
|---|---|---|
| Name | Yes | 1–100 characters |
| Description | No | Up to 500 characters |
| Color | No | Pick from 8 preset hex colors (defaults to blue) |

---

## Progress tracking

Each project card shows:

- **Completed / Total tasks** — e.g. `3/8 tasks`
- **Progress bar** — filled to `completedCount / taskCount * 100%`
- **Percentage** — shown as `37% complete`

Progress updates are calculated server-side on every fetch using a MongoDB aggregation that counts all tasks with a matching `projectId`, split by `status === "DONE"`.

---

## Adding tasks to a project

**From the Projects page** — Click the **Add task** button at the bottom of any project card. A modal opens where you enter the task title and priority. The task is immediately created with `status: TODO` and linked to that project. The project's task count refreshes automatically.

**From the Tasks page** — When creating a new task via the **New task** button or any column's **+** button, a **Project** dropdown appears in the modal. Select a project to link the task, or leave it blank for an unlinked task.

**From the API** — Pass `projectId` in the `POST /api/tasks` body (see [Tasks API](./tasks.md)).

---

## Viewing a project's tasks

To see only the tasks belonging to a project, use the Tasks API with a `projectId` filter:

```
GET /api/tasks?projectId=<project-id>
```

A filtered task board view is on the roadmap.

---

## Deleting a project

Hover a project card and click the **🗑 trash** icon (visible on hover). You will be prompted to confirm. Deleting a project does **not** delete its tasks — the tasks remain but lose their `projectId` association.

---

## API

### List projects

```
GET /api/projects
```

Returns all projects with aggregated task counts.

**Response**

```json
{
  "projects": [
    {
      "_id": "...",
      "name": "Q2 Launch",
      "description": "Everything for the May release",
      "color": "#3B82F6",
      "taskCount": 12,
      "completedCount": 5,
      "progress": 41,
      "createdAt": "2026-04-01T00:00:00.000Z"
    }
  ]
}
```

---

### Create a project

```
POST /api/projects
```

**Body**

```json
{
  "name": "Q2 Launch",
  "description": "Everything for the May release",
  "color": "#3B82F6"
}
```

**Response** — `201 Created`

```json
{ "project": { "_id": "...", "name": "Q2 Launch", ... } }
```

---

### Update a project

```
PATCH /api/projects/:id
```

All fields optional.

```json
{
  "name": "Q2 Launch (revised)",
  "color": "#10B981"
}
```

---

### Delete a project

```
DELETE /api/projects/:id
```

**Response** — `200`

```json
{ "success": true }
```

---

## Notes

- Projects are currently global (not scoped to a specific user). Any authenticated team member can see and edit all projects. User-scoped or team-scoped projects are on the roadmap.
- There is no project membership model yet — all team members implicitly have access to all projects.
