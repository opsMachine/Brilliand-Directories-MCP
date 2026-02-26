# Brilliant Directories API Reference

## Base URL

```
{BD_SITE_URL}/api/v2
```

Example: if `BD_SITE_URL=https://yoursite.com`, all requests go to `https://yoursite.com/api/v2/...`

---

## Authentication

Every request requires this header:

```
X-Api-Key: {BD_API_KEY}
```

No other auth mechanism is used.

---

## Widget Endpoints

Widgets are BD's custom code blocks. We only manage widgets via this API.

### GET /data_widgets/get/{id}

Fetch a single widget by ID or name.

```
GET {BD_SITE_URL}/api/v2/data_widgets/get/{id}
X-Api-Key: {BD_API_KEY}
```

- `{id}` can be the numeric widget ID or the widget name (URL-encoded if it contains spaces)

---

### GET /data_widgets/get

List all custom widgets.

```
GET {BD_SITE_URL}/api/v2/data_widgets/get
X-Api-Key: {BD_API_KEY}
```

Returns all widgets in the `message` array.

---

### POST /data_widgets/create

Create a new widget.

```
POST {BD_SITE_URL}/api/v2/data_widgets/create
X-Api-Key: {BD_API_KEY}
Content-Type: application/json

{
  "widget_name": "My Widget",
  "widget_data": "<p>HTML/PHP here</p>",
  "widget_style": ".selector { color: red; }",
  "widget_javascript": "<script>console.log('hi')</script>"
}
```

---

### PUT /data_widgets/update

Update an existing widget. Identify by `widget_id` or `widget_name`.

```
PUT {BD_SITE_URL}/api/v2/data_widgets/update
X-Api-Key: {BD_API_KEY}
Content-Type: application/json

{
  "widget_id": 29,
  "widget_name": "Hello World",
  "widget_data": "<p>new html</p>",
  "widget_style": ".hello { color: red; }",
  "widget_javascript": ""
}
```

**Important:** Always fetch the current widget state before updating. Include all three code fields in every PUT — omitting a field may clear it.

---

### DELETE /data_widgets/delete

⛔ **We never use this endpoint.** It is documented here for completeness only.

---

### POST /data_widgets/render

Render a widget's output server-side and return the result.

```
POST {BD_SITE_URL}/api/v2/data_widgets/render
X-Api-Key: {BD_API_KEY}
Content-Type: application/json

{
  "widget_id": 29
}
```

---

## Response Shapes

### Success Response

All successful responses follow this shape:

```json
{
  "status": "success",
  "message": [
    {
      "widget_id": "29",
      "widget_name": "Hello World",
      "widget_data": "<p><?php echo 'hello'; ?></p>",
      "widget_style": ".hello { color: green; }",
      "widget_javascript": "<script>console.log('hi')</script>",
      "date_updated": "2025-02-13 10:32:20"
    }
  ]
}
```

- `status` is always `"success"` on success — validate this before proceeding
- `message` is an array even for single-widget fetches
- `widget_id` is returned as a string but submitted as a number in PUT bodies

### Error Response

```json
{
  "status": "error",
  "message": "Description of what went wrong"
}
```

Always check `status` field. If it is not `"success"`, treat the operation as failed.

---

## Widget Shortcodes

Widgets can include other widgets via shortcode syntax:

```
[widget=Widget Name]
```

This is resolved server-side when the page renders. Useful for composing complex layouts from smaller reusable widgets.

---

## Shell Examples

### List all widgets (bash)

```bash
curl -s \
  -H "X-Api-Key: $BD_API_KEY" \
  "$BD_SITE_URL/api/v2/data_widgets/get" | jq .
```

### Fetch single widget by ID (bash)

```bash
curl -s \
  -H "X-Api-Key: $BD_API_KEY" \
  "$BD_SITE_URL/api/v2/data_widgets/get/29" | jq .
```

### Update a widget (bash)

```bash
curl -s -X PUT \
  -H "X-Api-Key: $BD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"widget_id": 29, "widget_name": "Hello World", "widget_data": "<p>new</p>", "widget_style": "", "widget_javascript": ""}' \
  "$BD_SITE_URL/api/v2/data_widgets/update" | jq .
```

### PowerShell equivalents

```powershell
# List all widgets
Invoke-RestMethod -Uri "$env:BD_SITE_URL/api/v2/data_widgets/get" `
  -Headers @{ "X-Api-Key" = $env:BD_API_KEY }

# Update a widget
Invoke-RestMethod -Uri "$env:BD_SITE_URL/api/v2/data_widgets/update" `
  -Method PUT `
  -Headers @{ "X-Api-Key" = $env:BD_API_KEY; "Content-Type" = "application/json" } `
  -Body '{"widget_id": 29, "widget_name": "Hello World", "widget_data": "<p>new</p>", "widget_style": "", "widget_javascript": ""}'
```
