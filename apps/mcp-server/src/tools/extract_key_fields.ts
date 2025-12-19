import type { DocStore } from "../lib/store.js";
import { DISCLAIMER, assertNonEmptyString, isValidEmail } from "../lib/validate.js";

function firstMatch(text: string, regex: RegExp): string | null {
  const m = text.match(regex);
  return m ? m[0] : null;
}

function extractDateLike(text: string): string | null {
  // ISO
  const iso = firstMatch(text, /\b\d{4}-\d{2}-\d{2}\b/);
  if (iso) return iso;

  // US mm/dd/yyyy
  const us = firstMatch(text, /\b\d{1,2}\/\d{1,2}\/\d{4}\b/);
  if (us) return us;

  // Month name patterns
  const month = firstMatch(
    text,
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},\s+\d{4}\b/i
  );
  if (month) return month;

  return null;
}

function extractAddressLine(text: string): string | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    // Very simple deterministic street-address-ish line.
    if (/\b\d{1,6}\s+[^,]{2,40}\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive)\b/i.test(line)) {
      return line;
    }
  }
  return null;
}

function extractEmail(text: string): string | null {
  const m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (!m) return null;
  const email = m[0];
  return isValidEmail(email) ? email : null;
}

export async function tool_extract_key_fields(opts: {
  args: any;
  store: DocStore;
}) {
  const { args, store } = opts;
  assertNonEmptyString("doc_id", args.doc_id);

  const clauses: Array<{ page?: number; exactText?: string }> = Array.isArray(args.clauses)
    ? args.clauses
    : [];

  // Only regex extraction from provided clauses.
  const combined = clauses
    .map((c) => (typeof c?.exactText === "string" ? c.exactText : ""))
    .join("\n\n");

  const effective = combined.match(/\bEffective Date\b[\s\S]{0,200}/i)?.[0] || combined;
  const termination = combined.match(/\bTermination Date\b[\s\S]{0,200}/i)?.[0] || combined;

  const effective_date = extractDateLike(effective);
  const termination_date = extractDateLike(termination);
  const notice_address_line = extractAddressLine(combined);
  const email_address = extractEmail(combined);

  return {
    tool: "extract_key_fields",
    disclaimer: DISCLAIMER,
    doc_id: args.doc_id,
    key_fields: {
      effective_date: effective_date || "",
      termination_date: termination_date || "",
      notice_address_line: notice_address_line || "",
      email_address: email_address || ""
    },
    _meta: {
      "openai/outputTemplate": "ui://clausefinder/widget.html"
    }
  };
}
