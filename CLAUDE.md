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

1. Read `skills/bd-workflow.md` — edit loop, validation rules, workflow
2. Check if `mcp-server/node_modules` exists. If it does not, ask the user for permission to run `npm install` inside `mcp-server/`. If they approve, run it. If it fails, tell the user to install Node.js from https://nodejs.org (LTS version) and then try again.
3. List all available custom widgets using the `list_widgets` MCP tool so the user knows what exists before doing anything

**During the session:** When you learn stable facts about the project — which widgets do what, site-specific quirks, client preferences, widget naming patterns — save them to memory. Use the `Write`/`Edit` tools on the memory file at `~/.claude/projects/C--Users-mitch-GitHub-BD-Claude-Setup/memory/MEMORY.md`. Do this as you go, not just at the end.

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
- **Never delete widgets** — there is no delete tool in the MCP; do not call the API delete endpoint directly under any circumstances
- **Never infer widget names** — always confirm the exact name with the user or fetch the list first

---

## Safety Rules

1. No production changes without explicit user confirmation
2. No widget deletions under any circumstances — the delete tool does not exist in the MCP and the endpoint must never be called directly
3. Always validate API response contains `"status": "success"` before declaring success
4. If a push fails, show the error and stop — do not retry automatically
5. After any widget update, remind the user to refresh the BD site cache (BD Admin → cache refresh tool)

---

## Working with the User

This system is designed for a non-technical user. Claude should act as the guide — not just the tool.

### Orientation

- On first contact, if the user seems unfamiliar, list all widgets and briefly explain what each one likely does (based on its name and a quick read of the HTML content)
- Never expect the user to know widget IDs or exact names — that's Claude's job

### Identifying Widgets from Plain-English Requests

- When the user says "I want to change the banner" or "the footer looks wrong", map it to a specific widget
- List widgets → propose the most likely match → confirm with the user before proceeding
- If ambiguous, show 2–3 candidates and ask which one they mean

### Always Offer Preview

- Before any edit: offer to render the widget so the user can see the current state
- After any push: always offer to render the result so they can visually confirm the change
- Never push a change without giving the user a chance to preview it first

### Plain Language

Avoid technical terms. Use these substitutions:

| Instead of | Say |
|------------|-----|
| `widget_data` | "the HTML content" |
| `widget_style` | "the CSS / styling" |
| `widget_javascript` | "the JavaScript" |
| "PUT request" | "saving your change" |
| "pushing to production" | "publishing to your live site" |

### Common Request Patterns

| User says | Claude does |
|-----------|-------------|
| "Show me what X looks like" | `render_widget` |
| "What widgets do I have?" | `list_widgets` |
| "Change [something] on [page/section]" | list → identify → get → propose → confirm → edit → push → render |
| "Is my change live?" | `render_widget` + remind about cache + remind to check live site |

### After Every Push

Always do all three:

1. **Cache refresh** — remind the user to go to BD Admin and use the cache refresh tool. This must be done by clicking in the BD Admin UI — there is no API for it.
2. **Offer to render** — ask if they want to preview the result locally
3. **Check the live site** — remind them to open their actual website and confirm the change appears correctly
