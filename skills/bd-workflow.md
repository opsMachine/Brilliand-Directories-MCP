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
6. RENDER  → render_widget → rebuilds preview from local workspace, browser auto-refreshes
7. PUSH    → push_widget → reads from workspace, sends PUT to BD API
8. VERIFY  → confirm response is "pushed successfully"
9. REMIND  → tell user to refresh the BD site cache
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

`render_widget` uses a **hybrid approach**: BD's server executes the PHP to produce real content, then your local CSS and JavaScript edits are applied on top.

```
render_widget(widget_name)
  → reads workspace/{name}/meta.json for the widget ID
  → calls BD API to render the widget — PHP executes, real data loads
  → injects local style.css + javascript.js on top of the rendered output
  → builds full HTML page with Bootstrap 3
  → writes to previews/{name}.html
  → first call opens browser at localhost:4444/{name}.html
  → subsequent calls auto-refresh the existing tab
```

**What you see vs. what's live:**

| Change type | Visible in preview? | Needs push first? |
|-------------|--------------------|--------------------|
| CSS edits (`style.css`) | Yes — immediately | No |
| JS edits (`javascript.js`) | Yes — immediately | No |
| HTML edits (`data.html`) | No — BD renders from live version | Yes — push first, then re-render |

This means:
- If you're only changing styling or JavaScript, re-render to see the result before pushing
- If you're changing the HTML content (`data.html`), push first then re-render to confirm

**Explaining this to the user:**
> "The preview fetches the real content from your live site, then applies your local CSS and JavaScript changes on top. So you can see exactly how your styling changes will look with real data — without having to push first."

Notes:
- `get_widget` must be called first to populate the workspace (creates `meta.json`)
- The `previews/` folder is gitignored — throwaway files
- Re-render after every CSS/JS edit to see the change in the browser

---

## What We Never Do

- Never use the DELETE endpoint
- Never push changes without explicit user confirmation in the current session
- Never retry a failed push automatically — show the error and stop
- Never edit a widget without fetching its current state first

---

## Preview Limitations

The local preview renders real PHP/database content via BD's API, but **BD's global platform CSS is not available locally**. This causes known cosmetic issues that are NOT bugs:

- **Nav bar**: text appears white-on-white because BD's global stylesheet provides the dark nav background, which our preview doesn't load. Looks correct on the live site.
- Any styling that comes from BD's platform-level CSS (not the widget's own `style.css`) won't appear in preview.

Do not investigate or attempt to fix these — they are expected preview limitations.

---

## Site Notes

- **Site:** `https://www.example.com/` — Brilliant Directories membership site
- **Client:** Non-technical — expects plain-language guidance, not widget IDs or API terminology

### Widget Notes

- **Bootstrap Theme Framework** (id: 17) — site-wide header/nav/footer. Nav bar appears white-on-white in preview (known preview limitation — looks correct on live site).
- **Partner Orgs Banner 2026** (id: 209) — queries BD database for partner org records. Shows "unavailable" in local preview because the render API doesn't provide database context. Works fine on the live site.
- **Referral Codes Explainer Sign Up** (id: 28) — static content widget, renders correctly in local preview. About referral codes, designated recipients, sector development fund.

---

## Quick Reference: MCP Tools

Use the MCP tools instead of calling the API directly. They handle authentication, content encoding, and file management.

```
list_widgets()                               → List all widgets
get_widget(id)                               → Fetch widget, save to workspace/
push_widget(widget_id, widget_name)          → Read workspace, push to BD API
render_widget(widget_name)                   → Build preview from local workspace, open in browser
```

The MCP server handles all content as form-encoded form-data. No manual curl requests needed.
