export type Citation = {
  page: number;
  exactText: string;
};

export function buildCitationsFromExcerpts(excerpts: Array<{ page: number; exactText: string }>): Citation[] {
  return excerpts.map((e) => ({ page: e.page, exactText: e.exactText }));
}
