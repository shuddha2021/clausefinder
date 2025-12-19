import { Server } from "@modelcontextprotocol/sdk/server";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListResourcesRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { DocStore } from "./lib/store.js";
import { tool_extract_document_text } from "./tools/extract_document_text.js";
import { tool_find_relevant_clauses } from "./tools/find_relevant_clauses.js";
import { tool_extract_key_fields } from "./tools/extract_key_fields.js";
import { tool_compute_deadlines } from "./tools/compute_deadlines.js";
import { tool_generate_notice_email } from "./tools/generate_notice_email.js";
import { widgetResource } from "./ui/resource.js";

type ToolName =
  | "extract_document_text"
  | "find_relevant_clauses"
  | "extract_key_fields"
  | "compute_deadlines"
  | "generate_notice_email";

const TOOLS: Record<
  ToolName,
  {
    description: string;
    inputSchema: any;
    outputSchema: any;
  }
> = {
  extract_document_text: {
    description: "Extract page-numbered text from a PDF and store it in memory.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        filename: { type: "string" },
        mime_type: { type: "string" },
        pdf_base64: { type: "string" }
      },
      required: ["filename", "mime_type", "pdf_base64"]
    },
    outputSchema: {
      type: "object",
      additionalProperties: true,
      properties: {
        tool: { const: "extract_document_text" },
        disclaimer: { type: "string" },
        doc_id: { type: "string" },
        filename: { type: "string" },
        page_count: { type: "number" },
        _meta: { type: "object" }
      },
      required: ["tool", "disclaimer", "doc_id", "filename", "page_count", "_meta"]
    }
  },
  find_relevant_clauses: {
    description: "Find relevant clauses using deterministic keyword + phrase scoring.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        doc_id: { type: "string" },
        query: { type: "string" },
        max_results: { type: "number" },
        excerpt_max_chars: { type: "number" }
      },
      required: ["doc_id", "query"]
    },
    outputSchema: {
      type: "object",
      additionalProperties: true,
      properties: {
        tool: { const: "find_relevant_clauses" },
        disclaimer: { type: "string" },
        doc_id: { type: "string" },
        query: { type: "string" },
        clauses: { type: "array" },
        citations: { type: "array" },
        _meta: { type: "object" }
      },
      required: ["tool", "disclaimer", "doc_id", "query", "clauses", "citations", "_meta"]
    }
  },
  extract_key_fields: {
    description: "Extract key fields from quoted clauses using regex-only extraction.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        doc_id: { type: "string" },
        clauses: { type: "array" }
      },
      required: ["doc_id", "clauses"]
    },
    outputSchema: {
      type: "object",
      additionalProperties: true,
      properties: {
        tool: { const: "extract_key_fields" },
        disclaimer: { type: "string" },
        doc_id: { type: "string" },
        key_fields: { type: "object" },
        _meta: { type: "object" }
      },
      required: ["tool", "disclaimer", "doc_id", "key_fields", "_meta"]
    }
  },
  compute_deadlines: {
    description:
      "Compute deadlines only when an explicit base date and explicit duration (e.g. '30 days') exist.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        doc_id: { type: "string" },
        clauses: { type: "array" },
        reference_date: { type: "string" }
      },
      required: ["doc_id", "clauses"]
    },
    outputSchema: {
      type: "object",
      additionalProperties: true,
      properties: {
        tool: { const: "compute_deadlines" },
        disclaimer: { type: "string" },
        doc_id: { type: "string" },
        deadlines: { type: "object" },
        _meta: { type: "object" }
      },
      required: ["tool", "disclaimer", "doc_id", "deadlines", "_meta"]
    }
  },
  generate_notice_email: {
    description: "Generate a deterministic notice email template with quoted clauses and page numbers.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        doc_id: { type: "string" },
        clauses: { type: "array" },
        to: { type: "string" },
        from: { type: "string" },
        purpose: { type: "string" },
        subject: { type: "string" }
      },
      required: ["doc_id", "clauses", "to", "from", "purpose"]
    },
    outputSchema: {
      type: "object",
      additionalProperties: true,
      properties: {
        tool: { const: "generate_notice_email" },
        disclaimer: { type: "string" },
        doc_id: { type: "string" },
        notice_email: { type: "object" },
        _meta: { type: "object" }
      },
      required: ["tool", "disclaimer", "doc_id", "notice_email", "_meta"]
    }
  }
};

function createToolResult(structured: unknown) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(structured, null, 2)
      }
    ],
    structuredContent: structured
  };
}

function createServer() {
  const store = new DocStore();

  const server = new Server(
    {
      name: "clausefinder",
      version: "0.0.0"
    },
    {
      capabilities: {
        tools: {
          listChanged: true
        }
      }
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: (Object.keys(TOOLS) as ToolName[]).map((name) => {
        const def = TOOLS[name];
        return {
          name,
          description: def.description,
          inputSchema: def.inputSchema,
          outputSchema: def.outputSchema
        };
      })
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name as ToolName;
    const args = request.params.arguments ?? {};

    if (!(name in TOOLS)) {
      return {
        content: [{ type: "text", text: "Unknown tool" }],
        isError: true
      };
    }

    if (name === "extract_document_text") {
      const out = await tool_extract_document_text({ args, store });
      return createToolResult(out);
    }
    if (name === "find_relevant_clauses") {
      const out = await tool_find_relevant_clauses({ args, store });
      return createToolResult(out);
    }
    if (name === "extract_key_fields") {
      const out = await tool_extract_key_fields({ args, store });
      return createToolResult(out);
    }
    if (name === "compute_deadlines") {
      const out = await tool_compute_deadlines({ args, store });
      return createToolResult(out);
    }
    if (name === "generate_notice_email") {
      const out = await tool_generate_notice_email({ args, store });
      return createToolResult(out);
    }

    return {
      content: [{ type: "text", text: "Unknown tool" }],
      isError: true
    };
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: "ui://clausefinder/widget.html",
          name: "ClauseFinder Widget",
          mimeType: "text/html"
        }
      ]
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri !== "ui://clausefinder/widget.html") {
      return {
        contents: []
      };
    }

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

  return server;
}

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
