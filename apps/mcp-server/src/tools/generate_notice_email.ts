import type { DocStore } from "../lib/store.js";
import {
  DISCLAIMER,
  assertNonEmptyString,
  isValidEmail
} from "../lib/validate.js";

function normalizeLines(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function tool_generate_notice_email(opts: {
  args: any;
  store: DocStore;
}) {
  const { args } = opts;
  assertNonEmptyString("doc_id", args.doc_id);
  assertNonEmptyString("to", args.to);
  assertNonEmptyString("from", args.from);
  assertNonEmptyString("purpose", args.purpose);

  const to = args.to.trim();
  const from = args.from.trim();

  if (!isValidEmail(to)) throw new Error("to must be a valid email address");
  if (!isValidEmail(from)) throw new Error("from must be a valid email address");

  const subject =
    typeof args.subject === "string" && args.subject.trim().length > 0
      ? args.subject.trim()
      : `Notice regarding: ${args.purpose.trim()}`;

  const clauses: Array<{ page?: number; exactText?: string }> = Array.isArray(args.clauses)
    ? args.clauses
    : [];

  const quotedClauses = clauses
    .map((c) => {
      const page = typeof c.page === "number" ? c.page : null;
      const text = typeof c.exactText === "string" ? c.exactText : "";
      if (!page || !text.trim()) return null;
      return `Page ${page}:\n"""\n${normalizeLines(text)}\n"""`;
    })
    .filter(Boolean)
    .join("\n\n");

  const body =
    `To: ${to}\n` +
    `From: ${from}\n` +
    `Subject: ${subject}\n\n` +
    `Hello,\n\n` +
    `This email provides notice regarding: ${normalizeLines(args.purpose)}.\n\n` +
    `Relevant quoted clauses:\n\n` +
    `${quotedClauses || "(No cited clauses provided.)"}\n\n` +
    `Sincerely,\n` +
    `${from}\n\n` +
    `---\n` +
    `${DISCLAIMER}`;

  return {
    tool: "generate_notice_email",
    disclaimer: DISCLAIMER,
    doc_id: args.doc_id,
    notice_email: {
      to,
      from,
      subject,
      body
    },
    _meta: {
      "openai/outputTemplate": "ui://clausefinder/widget.html"
    }
  };
}
