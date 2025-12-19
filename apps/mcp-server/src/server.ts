import type { IncomingMessage, ServerResponse } from "node:http";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { DocStore } from "./lib/store.js";

import { tool_extract_document_text } from "./tools/extract_document_text.js";
import { tool_find_relevant_clauses } from "./tools/find_relevant_clauses.js";
import { tool_extract_key_fields } from "./tools/extract_key_fields.js";
import { tool_compute_deadlines } from "./tools/compute_deadlines.js";
import { tool_generate_notice_email } from "./tools/generate_notice_email.js";

import { widgetResource } from "./ui/resource.js";

export function createMcpServer() {
  const store = new DocStore();

  const server = new McpServer({
    name: "clausefinder",
    version: "0.0.0"
  });

  server.resource("ui://clausefinder/widget.html", async () => {
    return {
      contents: [
        {
          uri: "ui://clausefinder/widget.html",
          mimeType: "text/html",
          text: widgetResource
        }
      ]
    };
  });

  server.tool(
    "extract_document_text",
    {
      filename: { type: "string" },
      mime_type: { type: "string" },
      pdf_base64: { type: "string" }
    },
    async (args: any) => {
      return tool_extract_document_text({ args, store });
    }
  );

  server.tool(
    "find_relevant_clauses",
    {
      doc_id: { type: "string" },
      query: { type: "string" },
      max_results: { type: "number", optional: true },
      excerpt_max_chars: { type: "number", optional: true }
    },
    async (args: any) => {
      return tool_find_relevant_clauses({ args, store });
    }
  );

  server.tool(
    "extract_key_fields",
    {
      doc_id: { type: "string" },
      clauses: { type: "array" }
    },
    async (args: any) => {
      return tool_extract_key_fields({ args, store });
    }
  );

  server.tool(
    "compute_deadlines",
    {
      doc_id: { type: "string" },
      clauses: { type: "array" },
      reference_date: { type: "string", optional: true }
    },
    async (args: any) => {
      return tool_compute_deadlines({ args, store });
    }
  );

  server.tool(
    "generate_notice_email",
    {
      doc_id: { type: "string" },
      clauses: { type: "array" },
      to: { type: "string" },
      from: { type: "string" },
      purpose: { type: "string" },
      subject: { type: "string", optional: true }
    },
    async (args: any) => {
      return tool_generate_notice_email({ args, store });
    }
  );

  return server;
}

function json(res: ServerResponse, status: number, body: unknown) {
  const text = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(text);
}

async function readJson(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

// Vercel-compatible HTTP handler.
// This is a narrow, deterministic JSON API wrapper around the MCP tools.
export async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const method = (req.method || "GET").toUpperCase();
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (method === "GET" && url.pathname === "/health") {
      return json(res, 200, { ok: true });
    }

    if (method === "OPTIONS" && url.pathname === "/") {
      res.statusCode = 204;
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.end();
      return;
    }

    // Expose the MCP endpoint at the root path only.
    // Any /mcp or /sse routes are intentionally not supported.
    if (url.pathname !== "/") {
      return json(res, 404, { error: "Not Found" });
    }

    if (method !== "POST") {
      return json(res, 405, { error: "Method Not Allowed" });
    }

    const body = await readJson(req);
    const tool = body && body.tool;
    const args = body && body.args;

    if (typeof tool !== "string" || !args || typeof args !== "object") {
      return json(res, 400, { error: "Expected { tool: string, args: object }" });
    }

    const g = globalThis as any;
    const store: DocStore = g.__clausefinderStore || (g.__clausefinderStore = new DocStore());

    let output: any;
    if (tool === "extract_document_text") {
      output = await tool_extract_document_text({ args, store });
    } else if (tool === "find_relevant_clauses") {
      output = await tool_find_relevant_clauses({ args, store });
    } else if (tool === "extract_key_fields") {
      output = await tool_extract_key_fields({ args, store });
    } else if (tool === "compute_deadlines") {
      output = await tool_compute_deadlines({ args, store });
    } else if (tool === "generate_notice_email") {
      output = await tool_generate_notice_email({ args, store });
    } else {
      return json(res, 404, { error: "Unknown tool" });
    }

    return json(res, 200, output);
  } catch (err: any) {
    return json(res, 500, { error: String(err && err.message ? err.message : err) });
  }
}

export default handler;
