#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEWS_DIR  = path.join(PROJECT_ROOT, 'previews');
const WORKSPACE_DIR = path.join(PROJECT_ROOT, 'workspace');

const API_KEY  = process.env.BD_API_KEY;
const SITE_URL = process.env.BD_SITE_URL?.replace(/\/$/, '');

if (!API_KEY || !SITE_URL) {
  console.error('Error: BD_API_KEY and BD_SITE_URL environment variables must be set.');
  process.exit(1);
}

const BASE_URL = `${SITE_URL}/api/v2`;

// ── Helpers ────────────────────────────────────────────────────────────────

async function bdRequest(method, endpoint, body) {
  const options = {
    method,
    headers: { 'X-Api-Key': API_KEY },
  };
  if (body) {
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    options.body = new URLSearchParams(body).toString();
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json();

  if (data.status !== 'success') {
    throw new Error(typeof data.message === 'string' ? data.message : JSON.stringify(data.message));
  }
  return data;
}

function toSafeName(name) {
  return name.replace(/[<>:"/\\|?*\s]/g, '-');
}

function workspaceDir(widgetName) {
  return path.join(WORKSPACE_DIR, toSafeName(widgetName));
}

// ── Preview server (live-reload) ────────────────────────────────────────────

const PREVIEW_PORT = 4444;
let previewServer = null;
let lastRenderTime = 0;
const openedPreviews = new Set();

function ensurePreviewServer() {
  if (previewServer) return;
  previewServer = http.createServer((req, res) => {
    if (req.url === '/last-render') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end(String(lastRenderTime));
    }
    const file = decodeURIComponent(req.url.replace(/^\//, '').split('?')[0]);
    const filePath = path.join(PREVIEWS_DIR, file);
    if (!file || !fs.existsSync(filePath)) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(filePath));
  });
  previewServer.on('error', () => { previewServer = null; });
  previewServer.listen(PREVIEW_PORT);
}

// ── Server ─────────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'bd-widget-manager', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_widgets',
      description: 'List all custom widgets on the BD site with their IDs and last updated dates.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_widget',
      description: 'Fetch a single widget by ID or name, saving files to workspace/. If local workspace files already exist (unpushed edits), returns a warning — call again with force: true only after the user confirms they want to discard local changes.',
      inputSchema: {
        type: 'object',
        properties: {
          id:    { type: 'string',  description: 'Widget ID (numeric) or exact widget name' },
          force: { type: 'boolean', description: 'If true, overwrite existing workspace files without warning. Only pass after explicit user confirmation.' },
        },
        required: ['id'],
      },
    },
    {
      name: 'push_widget',
      description: 'Read workspace/{name}/ files and push to BD API. Call after editing workspace files with the Edit tool. Content never passes through the LLM.',
      inputSchema: {
        type: 'object',
        properties: {
          widget_id:   { type: 'number', description: 'Numeric widget ID' },
          widget_name: { type: 'string', description: 'Exact widget name' },
        },
        required: ['widget_id', 'widget_name'],
      },
    },
    {
      name: 'render_widget',
      description: 'Build a local preview from workspace files and open in the browser. First render opens a new tab; subsequent renders auto-refresh the existing tab. Reads local workspace files — call get_widget first if workspace does not exist.',
      inputSchema: {
        type: 'object',
        properties: {
          widget_name: { type: 'string', description: 'Exact widget name (used for the filename)' },
        },
        required: ['widget_name'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {

      case 'list_widgets': {
        const data = await bdRequest('GET', '/data_widgets/get');
        const widgets = data.message.map(w => ({
          id:      w.widget_id,
          name:    w.widget_name,
          updated: w.date_updated || '—',
        }));
        return { content: [{ type: 'text', text: JSON.stringify(widgets, null, 2) }] };
      }

      case 'get_widget': {
        const data = await bdRequest('GET', `/data_widgets/get/${encodeURIComponent(args.id)}`);
        const w = data.message[0];

        // Guard: warn before overwriting local edits
        const dir = workspaceDir(w.widget_name);
        if (!args.force && fs.existsSync(dir)) {
          const hasEdits = ['data.html', 'style.css', 'javascript.js'].some(f => {
            const fp = path.join(dir, f);
            return fs.existsSync(fp) && fs.readFileSync(fp, 'utf8').trim().length > 0;
          });
          if (hasEdits) {
            return {
              content: [{ type: 'text', text: `⚠️ WARNING: Local workspace files already exist for "${w.widget_name}" and may contain unpushed edits. Re-fetching will overwrite them with the live version from BD.\n\nTell the user this and ask if they want to discard local changes. If they confirm, call get_widget again with force: true.` }],
            };
          }
        }

        // Save code fields to workspace — content never returned to LLM
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'data.html'),       w.widget_data       ?? '', 'utf8');
        fs.writeFileSync(path.join(dir, 'style.css'),       w.widget_style      ?? '', 'utf8');
        fs.writeFileSync(path.join(dir, 'javascript.js'),   w.widget_javascript ?? '', 'utf8');
        fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ widget_id: w.widget_id, widget_name: w.widget_name }), 'utf8');

        const safe = toSafeName(w.widget_name);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              widget_id:    w.widget_id,
              widget_name:  w.widget_name,
              date_updated: w.date_updated,
              files: {
                data:       `workspace/${safe}/data.html`,
                style:      `workspace/${safe}/style.css`,
                javascript: `workspace/${safe}/javascript.js`,
              },
            }, null, 2),
          }],
        };
      }

      case 'push_widget': {
        const dir = workspaceDir(args.widget_name);

        if (!fs.existsSync(dir)) {
          throw new Error(`No workspace found for "${args.widget_name}". Call get_widget first.`);
        }

        // Read from disk — content never passes through LLM
        const widget_data       = fs.readFileSync(path.join(dir, 'data.html'),     'utf8');
        const widget_style      = fs.readFileSync(path.join(dir, 'style.css'),     'utf8');
        const widget_javascript = fs.readFileSync(path.join(dir, 'javascript.js'), 'utf8');

        await bdRequest('PUT', '/data_widgets/update', {
          widget_id:   args.widget_id,
          widget_name: args.widget_name,
          widget_data,
          widget_style,
          widget_javascript,
        });

        return {
          content: [{ type: 'text', text: `Widget "${args.widget_name}" pushed successfully. Remember to refresh the BD site cache.` }],
        };
      }

      case 'render_widget': {
        const dir = workspaceDir(args.widget_name);
        if (!fs.existsSync(dir)) {
          throw new Error(`No workspace found for "${args.widget_name}". Call get_widget first.`);
        }

        // Read meta.json for widget_id (saved by get_widget)
        const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));

        // Call BD API to render PHP — gets real database content
        const renderResp = await fetch(`${BASE_URL}/data_widgets/render`, {
          method: 'POST',
          headers: { 'X-Api-Key': API_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `widget_id=${meta.widget_id}`,
        });
        const renderJson = JSON.parse(await renderResp.text());
        let widgetHtml = renderJson.output ?? '';

        // Read local CSS/JS overrides — these reflect any unsaved edits
        const widgetCss = fs.readFileSync(path.join(dir, 'style.css'),    'utf8');
        const widgetJs  = fs.readFileSync(path.join(dir, 'javascript.js'),'utf8');

        ensurePreviewServer();
        lastRenderTime = Date.now();

        // Rewrite root-relative URLs so local preview loads assets from live site
        widgetHtml = widgetHtml
          .replace(/(src|href)="\//g, `$1="${SITE_URL}/`)
          .replace(/(src|href)='\//g, `$1='${SITE_URL}/`);

        const reloadScript = `<script>(function(){var t="${lastRenderTime}";setInterval(function(){fetch("/last-render").then(function(r){return r.text()}).then(function(s){if(s!==t)location.reload()})},1000)})();</script>`;

        const html = `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap">
  <style>${widgetCss}</style>
  <style>body { padding: 20px; font-family: Montserrat, sans-serif; }</style>
</head><body>
<div class="container-fluid">${widgetHtml}</div>
${widgetJs}
${reloadScript}
</body></html>`;

        const safeName = toSafeName(args.widget_name);
        const filePath = path.join(PREVIEWS_DIR, `${safeName}.html`);
        fs.mkdirSync(PREVIEWS_DIR, { recursive: true });
        fs.writeFileSync(filePath, html, 'utf8');

        const url = `http://localhost:${PREVIEW_PORT}/${safeName}.html`;
        const isNew = !openedPreviews.has(args.widget_name);
        if (isNew) {
          openedPreviews.add(args.widget_name);
          exec(`start "" "${url}"`);
        }

        return {
          content: [{ type: 'text', text: isNew
            ? `Opened preview at ${url} — will auto-refresh on future renders.`
            : `Preview updated — browser tab refreshed automatically.`,
          }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
