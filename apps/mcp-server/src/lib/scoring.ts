type ScoredExcerpt = {
  page: number;
  exactText: string;
  matchReason: string;
  score: number;
};

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "in",
  "for",
  "on",
  "at",
  "by",
  "with",
  "from",
  "this",
  "that",
  "these",
  "those",
  "is",
  "are",
  "be",
  "as",
  "it"
]);

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
}

function tokenizeQuery(query: string): string[] {
  const tokens = normalize(query)
    .split(" ")
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !STOPWORDS.has(t));
  return Array.from(new Set(tokens));
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let idx = 0;
  while (true) {
    const next = haystack.indexOf(needle, idx);
    if (next === -1) break;
    count++;
    idx = next + needle.length;
  }
  return count;
}

function pickExcerpt(pageText: string, queryNorm: string, maxChars: number): string {
  const t = pageText || "";
  if (!t) return "";

  const idx = queryNorm ? t.toLowerCase().indexOf(queryNorm) : -1;
  if (idx === -1) {
    return t.length <= maxChars ? t : t.slice(0, maxChars);
  }

  const start = Math.max(0, idx - Math.floor(maxChars / 3));
  const end = Math.min(t.length, start + maxChars);
  return t.slice(start, end);
}

export function scorePagesForQuery(opts: {
  pages: string[];
  query: string;
  maxResults: number;
  excerptMaxChars: number;
}): ScoredExcerpt[] {
  const tokens = tokenizeQuery(opts.query);
  const queryNorm = normalize(opts.query);

  const scored: ScoredExcerpt[] = [];

  for (let i = 0; i < opts.pages.length; i++) {
    const text = opts.pages[i] || "";
    const normText = normalize(text);

    let score = 0;
    const reasons: string[] = [];

    // Phrase match is strongest.
    if (queryNorm && normText.includes(queryNorm)) {
      score += 50;
      reasons.push("contains full query phrase");
    }

    // Token matches.
    for (const tok of tokens) {
      const c = countOccurrences(normText, tok);
      if (c > 0) {
        score += Math.min(10, c) * 5;
        reasons.push(`contains token "${tok}" (${c}x)`);
      }
    }

    if (score <= 0) continue;

    const exactText = pickExcerpt(text, queryNorm, opts.excerptMaxChars).trim();
    if (!exactText) continue;

    scored.push({
      page: i + 1,
      exactText,
      matchReason: reasons.join("; "),
      score
    });
  }

  scored.sort((a, b) => (b.score - a.score) || (a.page - b.page));

  return scored.slice(0, opts.maxResults);
}
