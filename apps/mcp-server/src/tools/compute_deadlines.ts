import type { DocStore } from "../lib/store.js";
import { parseIsoDate, formatIsoDate, addDays } from "../lib/date.js";
import { DISCLAIMER, assertNonEmptyString } from "../lib/validate.js";

function extractDaysDuration(text: string): number | null {
  const m = text.match(/\b(\d{1,4})\s+days\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

function extractIsoDate(text: string): string | null {
  const m = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
  return m ? m[0] : null;
}

export async function tool_compute_deadlines(opts: {
  args: any;
  store: DocStore;
}) {
  const { args } = opts;
  assertNonEmptyString("doc_id", args.doc_id);

  const clauses: Array<{ page?: number; exactText?: string }> = Array.isArray(args.clauses)
    ? args.clauses
    : [];

  const combined = clauses
    .map((c) => (typeof c?.exactText === "string" ? c.exactText : ""))
    .join("\n\n");

  const durationDays = extractDaysDuration(combined);

  // Base date must be explicitly provided or explicitly present as ISO in text.
  let baseDate: Date | null = null;
  let baseDateSource: string = "";

  if (typeof args.reference_date === "string" && args.reference_date.trim()) {
    const parsed = parseIsoDate(args.reference_date.trim());
    if (parsed) {
      baseDate = parsed;
      baseDateSource = "reference_date";
    }
  }

  if (!baseDate) {
    const iso = extractIsoDate(combined);
    if (iso) {
      const parsed = parseIsoDate(iso);
      if (parsed) {
        baseDate = parsed;
        baseDateSource = "clause_text";
      }
    }
  }

  if (!baseDate || !durationDays) {
    return {
      tool: "compute_deadlines",
      disclaimer: DISCLAIMER,
      doc_id: args.doc_id,
      deadlines: {
        status: "insufficient_text",
        reason:
          "Need an explicit base date (reference_date or ISO date in text) and an explicit duration like '30 days'."
      },
      _meta: {
        "openai/outputTemplate": "ui://clausefinder/widget.html"
      }
    };
  }

  const due = addDays(baseDate, durationDays);

  return {
    tool: "compute_deadlines",
    disclaimer: DISCLAIMER,
    doc_id: args.doc_id,
    deadlines: {
      status: "computed",
      base_date: formatIsoDate(baseDate),
      base_date_source: baseDateSource,
      duration_days: durationDays,
      deadline_date: formatIsoDate(due)
    },
    _meta: {
      "openai/outputTemplate": "ui://clausefinder/widget.html"
    }
  };
}
