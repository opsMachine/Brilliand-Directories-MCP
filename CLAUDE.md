# BD Claude Setup

## Project Context

This project manages a **Brilliant Directories (BD) website** via their REST API. The only things managed here are **widgets** — BD's custom code blocks that contain HTML/PHP, CSS, and JavaScript.

---

## Environment Variables

API credentials are stored as Windows environment variables. **Never hardcode them.**

| Variable | Purpose |
|----------|---------|
| `BD_API_KEY` | Auth key sent in every request header |
| `BD_SITE_URL` | Base site URL (e.g. `https://yoursite.com`) |

Access them in shell: `$env:BD_API_KEY` (PowerShell) or `$BD_API_KEY` (bash).

---

## Session Start Protocol

At the start of every session, always:

1. Read `bd-api-reference.md` — API endpoints, auth, response shapes
2. Read `skills/bd-workflow.md` — edit loop, validation rules, workflow
3. Check if `mcp-server/node_modules` exists. If it does not, ask the user for permission to run `npm install` inside `mcp-server/`. If they approve, run it. If it fails, tell the user to install Node.js from https://nodejs.org (LTS version) and then try again.
4. List all available custom widgets using the `list_widgets` MCP tool so the user knows what exists before doing anything

---

## Widgets — What We Manage

Widgets are BD's custom code blocks. Each widget has three code fields:

| Field | Content |
|-------|---------|
| `widget_data` | HTML and/or PHP |
| `widget_style` | CSS |
| `widget_javascript` | JavaScript (including `<script>` tags) |

Widgets also support nested includes via shortcode: `[widget=Widget Name]`

### Rules for Widget Edits

- **Always fetch the current state** of a widget before proposing or making any edit
- **Always confirm with the user** before pushing any changes to production
- **Never delete widgets** — the DELETE endpoint exists but must never be used
- **Never infer widget names** — always confirm the exact name with the user or fetch the list first

---

## Safety Rules

1. No production changes without explicit user confirmation
2. No widget deletions under any circumstances
3. Always validate API response contains `"status": "success"` before declaring success
4. If a push fails, show the error and stop — do not retry automatically
5. After any widget update, remind the user to refresh the BD site cache (BD Admin → cache refresh tool)
