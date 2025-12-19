export const DISCLAIMER =
  "Not legal advice. I’m not a lawyer. I’m only quoting the document text and doing simple, deterministic extraction without interpreting legal meaning.";

export function assertNonEmptyString(name: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
}

export function assertPositiveInt(name: string, value: unknown): asserts value is number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
}

export function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function assertIsPdf(mimeType: unknown) {
  if (mimeType !== "application/pdf") {
    throw new Error("Only application/pdf is accepted");
  }
}

export function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
