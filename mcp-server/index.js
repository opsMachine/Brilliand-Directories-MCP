#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
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
  return name.replace(/[<>:"/\\|?*]/g, '-');
}

function workspaceDir(widgetName) {
  return path.join(WORKSPACE_DIR, toSafeName(widgetName));
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
      description: 'Fetch a single widget by ID or name, returning all three code fields and metadata. Always call this before update_widget.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Widget ID (numeric) or exact widget name' },
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
      description: 'Render a widget server-side, save to previews/{name}.html, and open in the default browser. HTML never passes through the LLM.',
      inputSchema: {
        type: 'object',
        properties: {
          widget_id:   { type: 'number', description: 'Numeric widget ID' },
          widget_name: { type: 'string', description: 'Exact widget name (used for the filename)' },
        },
        required: ['widget_id', 'widget_name'],
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

        // Save code fields to workspace — content never returned to LLM
        const dir = workspaceDir(w.widget_name);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'data.html'),       w.widget_data       ?? '', 'utf8');
        fs.writeFileSync(path.join(dir, 'style.css'),       w.widget_style      ?? '', 'utf8');
        fs.writeFileSync(path.join(dir, 'javascript.js'),   w.widget_javascript ?? '', 'utf8');

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
        const response = await fetch(`${BASE_URL}/data_widgets/render`, {
          method: 'POST',
          headers: { 'X-Api-Key': API_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `widget_id=${args.widget_id}`,
        });
        const raw = await response.text();
        if (!response.ok) {
          throw new Error(`Render failed (${response.status}): ${raw.slice(0, 200)}`);
        }

        // Rewrite root-relative URLs so local preview loads images/CSS/JS
        const html = raw
          .replace(/(src|href)="\//g,  `$1="${SITE_URL}/`)
          .replace(/(src|href)='\//g,  `$1='${SITE_URL}/`);

        const filePath = path.join(PREVIEWS_DIR, `${toSafeName(args.widget_name)}.html`);
        fs.mkdirSync(PREVIEWS_DIR, { recursive: true });
        fs.writeFileSync(filePath, html, 'utf8');
        exec(`start "" "${filePath}"`);

        return { content: [{ type: 'text', text: `Opened previews/${toSafeName(args.widget_name)}.html in browser.` }] };
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
