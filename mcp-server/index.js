#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const API_KEY = process.env.BD_API_KEY;
const SITE_URL = process.env.BD_SITE_URL?.replace(/\/$/, '');

if (!API_KEY || !SITE_URL) {
  console.error('Error: BD_API_KEY and BD_SITE_URL environment variables must be set.');
  process.exit(1);
}

const BASE_URL = `${SITE_URL}/api/v2`;

async function bdRequest(method, path, body) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: { 'X-Api-Key': API_KEY, 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  const data = await response.json();

  if (data.status !== 'success') {
    throw new Error(typeof data.message === 'string' ? data.message : JSON.stringify(data.message));
  }

  return data;
}

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
      name: 'update_widget',
      description: 'Push updated code to a widget. Requires all three code fields — omitting one will clear it. Always fetch the widget first.',
      inputSchema: {
        type: 'object',
        properties: {
          widget_id:         { type: 'number', description: 'Numeric widget ID' },
          widget_name:       { type: 'string', description: 'Exact widget name' },
          widget_data:       { type: 'string', description: 'HTML/PHP content' },
          widget_style:      { type: 'string', description: 'CSS content' },
          widget_javascript: { type: 'string', description: 'JavaScript content (include <script> tags)' },
        },
        required: ['widget_id', 'widget_name', 'widget_data', 'widget_style', 'widget_javascript'],
      },
    },
    {
      name: 'render_widget',
      description: 'Render a widget server-side and return its HTML output.',
      inputSchema: {
        type: 'object',
        properties: {
          widget_id: { type: 'number', description: 'Numeric widget ID' },
        },
        required: ['widget_id'],
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
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              widget_id:         w.widget_id,
              widget_name:       w.widget_name,
              date_updated:      w.date_updated,
              widget_data:       w.widget_data,
              widget_style:      w.widget_style,
              widget_javascript: w.widget_javascript,
            }, null, 2),
          }],
        };
      }

      case 'update_widget': {
        await bdRequest('PUT', '/data_widgets/update', {
          widget_id:         args.widget_id,
          widget_name:       args.widget_name,
          widget_data:       args.widget_data,
          widget_style:      args.widget_style,
          widget_javascript: args.widget_javascript,
        });
        return {
          content: [{ type: 'text', text: `Widget "${args.widget_name}" updated successfully.` }],
        };
      }

      case 'render_widget': {
        const url = `${BASE_URL}/data_widgets/render`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'X-Api-Key': API_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `widget_id=${args.widget_id}`,
        });
        const text = await response.text();
        if (!response.ok) {
          throw new Error(`Render failed (${response.status}): ${text.slice(0, 200)}`);
        }
        return { content: [{ type: 'text', text }] };
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
