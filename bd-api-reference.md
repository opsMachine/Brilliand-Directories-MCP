# Brilliant Directories API Reference

> **Note:** Claude interacts with the BD API via MCP tools (`list_widgets`, `get_widget`, `update_widget`, `render_widget`). This document is background reference for understanding the underlying API or extending the MCP server.

---

## Base URL

```
{BD_SITE_URL}/api/v2
```

## Authentication

Every request requires this header:

```
X-Api-Key: {BD_API_KEY}
```

---

## Widget Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/data_widgets/get` | List all widgets |
| GET | `/data_widgets/get/{id}` | Fetch single widget by ID or name |
| POST | `/data_widgets/create` | Create a new widget |
| PUT | `/data_widgets/update` | Update an existing widget |
| POST | `/data_widgets/render` | Render widget output server-side |

The DELETE endpoint exists in the BD API but is **never used** and is not exposed in the MCP.

---

## Response Shapes

### Success

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

- `status` is always `"success"` on success
- `message` is an array even for single-widget fetches
- `widget_id` is returned as a string but submitted as a number in PUT bodies

### Error

```json
{
  "status": "error",
  "message": "Description of what went wrong"
}
```

---

## PUT Request Body

All three code fields are required. Omitting one will clear it.

```json
{
  "widget_id": 29,
  "widget_name": "Hello World",
  "widget_data": "<p>new html</p>",
  "widget_style": ".hello { color: red; }",
  "widget_javascript": ""
}
```

---

## Widget Shortcodes

Widgets can include other widgets:

```
[widget=Widget Name]
```

Resolved server-side when the page renders.
