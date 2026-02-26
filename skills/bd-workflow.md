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
1. FETCH   → Get the widget's current state from the API
2. SHOW    → Display current widget_name, date_updated, and all three code fields
3. PROPOSE → Show the exact changes you intend to make (diff or before/after)
4. CONFIRM → Wait for explicit user approval ("yes", "go ahead", "push it", etc.)
5. PUSH    → Send the PUT request to the API
6. VERIFY  → Confirm the response contains "status": "success"
7. REMIND  → Tell user to refresh the BD site cache
```

Never jump to step 5 without completing steps 1–4.

---

## Fetch Rules

When fetching a widget, always display:

- `widget_name` — so user can confirm you have the right widget
- `date_updated` — so user knows how fresh the current state is
- All three code fields (`widget_data`, `widget_style`, `widget_javascript`)

If the widget name is ambiguous or unconfirmed, fetch the full list first and ask the user to identify which widget they mean.

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

## What We Never Do

- Never use the DELETE endpoint
- Never push changes without explicit user confirmation in the current session
- Never retry a failed push automatically — show the error and stop
- Never edit a widget without fetching its current state first

---

## Quick Reference: API Calls

```bash
# List all widgets
curl -s -H "X-Api-Key: $BD_API_KEY" "$BD_SITE_URL/api/v2/data_widgets/get"

# Fetch single widget
curl -s -H "X-Api-Key: $BD_API_KEY" "$BD_SITE_URL/api/v2/data_widgets/get/{id}"

# Update widget
curl -s -X PUT \
  -H "X-Api-Key: $BD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"widget_id": ID, "widget_name": "NAME", "widget_data": "...", "widget_style": "...", "widget_javascript": "..."}' \
  "$BD_SITE_URL/api/v2/data_widgets/update"
```
