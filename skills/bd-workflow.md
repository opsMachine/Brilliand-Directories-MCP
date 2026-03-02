# BD Widget Workflow

## Session Start

At the start of every session, list all available custom widgets before doing anything else.

```
GET {BD_SITE_URL}/api/v2/data_widgets/get
```

Display results as a table showing at minimum:

| widget_id | widget_name | date_updated |
|-----------|-------------|--------------|

This gives the user a clear picture of what exists before any edits begin.

---

## The Edit Loop

Every widget edit follows this exact sequence. Do not skip or reorder steps.

```
1. FETCH   → get_widget → saves files to workspace/{name}/, returns metadata + paths
2. READ    → use Read tool on the relevant file(s) — only what's needed
3. PROPOSE → show the exact changes you intend to make (diff or before/after)
4. CONFIRM → wait for explicit user approval ("yes", "go ahead", "push it", etc.)
5. EDIT    → use Edit tool on workspace/{name}/ files
6. PUSH    → push_widget → reads from workspace, sends PUT to BD API
7. VERIFY  → confirm response is "pushed successfully"
8. REMIND  → tell user to refresh the BD site cache
```

Never jump to step 5 without completing steps 1–4.

Large content never passes through the LLM as tool output — `get_widget` saves to disk,
`push_widget` reads from disk. The LLM only touches content via `Read` and `Edit` tool calls.

---

## Fetch Rules

When fetching a widget, `get_widget` returns only:

- `widget_id`, `widget_name`, `date_updated` — confirm you have the right widget
- `files` — paths to the three workspace files

Read individual files with the `Read` tool as needed. Do not read all three unless necessary.

If the widget name is ambiguous or unconfirmed, fetch the full list first and ask the user to identify which widget they mean.

**Re-fetch guard:** If `get_widget` returns a `⚠️ WARNING` about existing local files, stop and tell the user in plain language:

> "You have unsaved local changes to this widget. Fetching the live version will overwrite them. Do you want to discard your local changes and reload from the site?"

Only call `get_widget` with `force: true` after explicit user confirmation. Never pass `force: true` on your own initiative.

**Push staleness risk:** There is no version check on push. If the widget was edited on BD between your fetch and your push, your push will silently overwrite those changes. Mention this to the user if the session has been open for a long time before pushing.

---

## Proposing Changes

Before pushing any change:

1. Show the current value and the proposed new value for each field being changed
2. For unchanged fields, note "unchanged — keeping current value"
3. Ask: "Should I push this to production?"

Only proceed after an affirmative response in the chat.

---

## API Response Validation

After every API call:

1. Check that the response contains `"status": "success"`
2. If status is not `"success"`, treat the operation as failed
3. Show the full error response to the user
4. Stop — do not retry automatically

Success looks like:
```json
{ "status": "success", "message": [...] }
```

Failure looks like:
```json
{ "status": "error", "message": "Something went wrong" }
```

---

## After a Successful Widget Update

Always remind the user:

> "Widget updated successfully. Remember to refresh your BD site cache — go to BD Admin and use the cache refresh tool to make the changes visible on your site."

---

## Widget Name Rules

- Never assume or infer a widget name from context
- If unsure of the exact name, fetch the full widget list and ask the user to confirm
- Widget names are case-sensitive in the API — use the exact name as returned by GET

---

## Render Preview

To visually preview a widget's output:

The MCP server handles everything — HTML never enters the LLM context.

```
render_widget(widget_id, widget_name)
  → BD API returns HTML
  → MCP server writes previews/{widget_name}.html
  → MCP server opens file in default browser
  → Returns one-line confirmation to Claude
```

Pass both `widget_id` (number) and `widget_name` (exact name from list) — the name is used for the filename.

Notes:
- The render endpoint returns a **full HTML page** (entire site template), not just the widget fragment
- The `previews/` folder is gitignored — these are throwaway files
- Read-only operation — safe to run without confirmation

---

## What We Never Do

- Never use the DELETE endpoint
- Never push changes without explicit user confirmation in the current session
- Never retry a failed push automatically — show the error and stop
- Never edit a widget without fetching its current state first

---

## Quick Reference: MCP Tools

Use the MCP tools instead of calling the API directly. They handle authentication, content encoding, and file management.

```
list_widgets()                               → List all widgets
get_widget(id)                               → Fetch widget, save to workspace/
push_widget(widget_id, widget_name)          → Read workspace, push to BD API
render_widget(widget_id, widget_name)        → Render to HTML, open in browser
```

The MCP server handles all content as form-encoded form-data. No manual curl requests needed.
