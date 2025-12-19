const DISCLAIMER =
  "Not legal advice. I’m not a lawyer. I’m only quoting the document text and doing simple, deterministic extraction without interpreting legal meaning.";

export default function Page() {
  return (
    <main style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ margin: 0, fontSize: 28 }}>ClauseFinder</h1>
      <p style={{ marginTop: 12, maxWidth: 720 }}>{DISCLAIMER}</p>
      <p style={{ marginTop: 12 }}>
        Widget preview: <a href="/widget/clausefinder">/widget/clausefinder</a>
      </p>
      <p style={{ marginTop: 12, maxWidth: 720 }}>
        This web app is a simple preview shell. The production UI is the Skybridge
        widget HTML used by tool outputs.
      </p>
    </main>
  );
}
