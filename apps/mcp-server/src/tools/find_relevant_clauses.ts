import type { DocStore } from "../lib/store.js";
import { scorePagesForQuery } from "../lib/scoring.js";
import { buildCitationsFromExcerpts } from "../lib/citations.js";
import {
  DISCLAIMER,
  assertNonEmptyString,
  clampInt,
  assertPositiveInt
} from "../lib/validate.js";

export async function tool_find_relevant_clauses(opts: {
  args: any;
  store: DocStore;
}) {
  const { args, store } = opts;
  assertNonEmptyString("doc_id", args.doc_id);
  assertNonEmptyString("query", args.query);

  const maxResults =
    typeof args.max_results === "number" && Number.isFinite(args.max_results)
      ? clampInt(Math.trunc(args.max_results), 1, 10)
      : 5;

  const excerptMaxChars =
    typeof args.excerpt_max_chars === "number" && Number.isFinite(args.excerpt_max_chars)
      ? clampInt(Math.trunc(args.excerpt_max_chars), 120, 2000)
      : 800;

  const doc = store.get(args.doc_id);

  const clauses = scorePagesForQuery({
    pages: doc.pages,
    query: args.query,
    maxResults,
    excerptMaxChars
  }).map((x) => ({
    page: x.page,
    exactText: x.exactText,
    matchReason: x.matchReason
  }));

  const citations = buildCitationsFromExcerpts(clauses);

  return {
    tool: "find_relevant_clauses",
    disclaimer: DISCLAIMER,
    doc_id: args.doc_id,
    query: args.query,
    clauses,
    citations,
    _meta: {
      "openai/outputTemplate": "ui://clausefinder/widget.html"
    }
  };
}
