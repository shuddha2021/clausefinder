import { Buffer } from "node:buffer";

import * as pdfjs from "pdfjs-dist";

type TextItem = {
  str: string;
  transform?: number[];
};

function normalizeWhitespace(s: string): string {
  return s.replace(/[\t\u00A0]+/g, " ").replace(/[ ]{2,}/g, " ").trim();
}

function stableTextFromItems(items: TextItem[]): string {
  const enriched = items
    .map((it, idx) => {
      const tr = Array.isArray(it.transform) ? it.transform : undefined;
      const x = tr ? tr[4] : 0;
      const y = tr ? tr[5] : 0;
      return { str: it.str || "", x, y, idx };
    })
    .filter((x) => normalizeWhitespace(x.str).length > 0);

  // Group by y (lines), sort by y desc, x asc.
  const lineTolerance = 2;
  const lines: Array<{ y: number; items: typeof enriched }> = [];

  for (const item of enriched) {
    let line = lines.find((l) => Math.abs(l.y - item.y) <= lineTolerance);
    if (!line) {
      line = { y: item.y, items: [] as any };
      lines.push(line);
    }
    (line.items as any).push(item);
  }

  lines.sort((a, b) => b.y - a.y);
  for (const line of lines) {
    (line.items as any).sort((a: any, b: any) => (a.x - b.x) || (a.idx - b.idx));
  }

  const parts: string[] = [];
  for (const line of lines) {
    const lineText = (line.items as any)
      .map((it: any) => normalizeWhitespace(it.str))
      .join(" ")
      .trim();
    if (lineText) parts.push(lineText);
  }

  return parts.join("\n").trim();
}

export async function extractPdfTextByPage(pdfBuffer: Buffer): Promise<string[]> {
  // pdfjs-dist expects a Uint8Array.
  const data = new Uint8Array(pdfBuffer);

  // Support both old/new pdfjs-dist builds.
  const loadingTask = (pdfjs as any).getDocument({ data });
  const pdf = await loadingTask.promise;

  const pages: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = (textContent.items || []) as TextItem[];
    pages.push(stableTextFromItems(items));
  }

  return pages;
}
