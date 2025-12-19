import { createHash } from "node:crypto";

import type { DocStore } from "../lib/store.js";
import { extractPdfTextByPage } from "../lib/pdf.js";
import { DISCLAIMER, assertIsPdf, assertNonEmptyString } from "../lib/validate.js";

export async function tool_extract_document_text(opts: {
  args: any;
  store: DocStore;
}) {
  const { args, store } = opts;
  assertNonEmptyString("filename", args.filename);
  assertNonEmptyString("mime_type", args.mime_type);
  assertNonEmptyString("pdf_base64", args.pdf_base64);

  assertIsPdf(args.mime_type);

  const pdfBuffer = Buffer.from(args.pdf_base64, "base64");
  const pages = await extractPdfTextByPage(pdfBuffer);

  const hash = createHash("sha256").update(pdfBuffer).digest("hex");
  const doc_id = `doc_${hash.slice(0, 24)}`;

  store.put({ doc_id, filename: args.filename, pages });

  return {
    tool: "extract_document_text",
    disclaimer: DISCLAIMER,
    doc_id,
    filename: args.filename,
    page_count: pages.length,
    _meta: {
      "openai/outputTemplate": "ui://clausefinder/widget.html"
    }
  };
}
