export const widgetResource = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ClauseFinder</title>
    <style>
      :root {
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica,
          Arial, "Apple Color Emoji", "Segoe UI Emoji";
        color: #111827;
      }
      body {
        margin: 0;
        padding: 16px;
        background: #ffffff;
      }
      h1 {
        margin: 0 0 8px 0;
        font-size: 20px;
      }
      .disclaimer {
        margin: 0 0 16px 0;
        font-size: 13px;
        line-height: 1.4;
      }
      .section {
        margin: 16px 0;
      }
      .section h2 {
        font-size: 14px;
        margin: 0 0 8px 0;
      }
      .table {
        width: 100%;
        border-collapse: collapse;
      }
      .table th,
      .table td {
        border: 1px solid #e5e7eb;
        padding: 8px;
        vertical-align: top;
        font-size: 13px;
      }
      .kv {
        display: grid;
        grid-template-columns: 200px 1fr;
        gap: 6px 12px;
        font-size: 13px;
      }
      pre {
        white-space: pre-wrap;
        word-break: break-word;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        padding: 12px;
        border-radius: 6px;
        font-size: 12px;
      }
      .badge {
        display: inline-block;
        font-size: 12px;
        padding: 2px 6px;
        border: 1px solid #e5e7eb;
        border-radius: 999px;
        background: #f9fafb;
      }
      .muted {
        color: #6b7280;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script>
      (function () {
        var DISCLAIMER =
          "Not legal advice. I’m not a lawyer. I’m only quoting the document text and doing simple, deterministic extraction without interpreting legal meaning.";

        function el(tag, attrs, children) {
          var node = document.createElement(tag);
          if (attrs) {
            Object.keys(attrs).forEach(function (k) {
              if (k === "class") node.className = attrs[k];
              else if (k === "text") node.textContent = attrs[k];
              else node.setAttribute(k, attrs[k]);
            });
          }
          (children || []).forEach(function (c) {
            if (c == null) return;
            if (typeof c === "string") node.appendChild(document.createTextNode(c));
            else node.appendChild(c);
          });
          return node;
        }

        function safeJson(value) {
          try {
            return JSON.stringify(value, null, 2);
          } catch (_e) {
            return String(value);
          }
        }

        function getToolOutput() {
          var w = window;
          if (w && w.openai && w.openai.toolOutput) return w.openai.toolOutput;
          return null;
        }

        function render(app, toolOutput) {
          app.innerHTML = "";

          app.appendChild(el("h1", { text: "ClauseFinder" }));
          app.appendChild(el("p", { class: "disclaimer", text: DISCLAIMER }));

          if (!toolOutput) {
            app.appendChild(
              el("p", {
                class: "muted",
                text:
                  "No tool output found at window.openai.toolOutput. This widget is meant to be rendered by the ChatGPT App UI runtime."
              })
            );
            return;
          }

          var data = toolOutput;
          if (data && typeof data === "object" && data.output && typeof data.output === "object") {
            data = data.output;
          }

          var clauses = (data && data.clauses) || [];
          var keyFields = (data && data.key_fields) || null;
          var deadlines = (data && data.deadlines) || null;
          var noticeEmail = (data && data.notice_email) || null;

          var clausesSection = el("div", { class: "section" }, [
            el("h2", { text: "Cited Clauses" }),
            el("table", { class: "table" }, [
              el("thead", null, [
                el("tr", null, [
                  el("th", { text: "Page" }),
                  el("th", { text: "Exact Text" }),
                  el("th", { text: "Match Reason" })
                ])
              ]),
              el(
                "tbody",
                null,
                clauses.map(function (c) {
                  return el("tr", null, [
                    el("td", null, [el("span", { class: "badge", text: String(c.page) })]),
                    el("td", null, [el("div", { text: c.exactText || "" })]),
                    el("td", null, [el("div", { text: c.matchReason || "" })])
                  ]);
                })
              )
            ])
          ]);

          app.appendChild(clausesSection);

          var fieldsSection = el("div", { class: "section" }, [
            el("h2", { text: "Key Fields" })
          ]);
          if (keyFields) {
            fieldsSection.appendChild(
              el("div", { class: "kv" }, [
                el("div", { class: "muted", text: "effective_date" }),
                el("div", { text: keyFields.effective_date || "" }),
                el("div", { class: "muted", text: "termination_date" }),
                el("div", { text: keyFields.termination_date || "" }),
                el("div", { class: "muted", text: "notice_address_line" }),
                el("div", { text: keyFields.notice_address_line || "" }),
                el("div", { class: "muted", text: "email_address" }),
                el("div", { text: keyFields.email_address || "" })
              ])
            );
          } else {
            fieldsSection.appendChild(el("p", { class: "muted", text: "No key fields." }));
          }
          app.appendChild(fieldsSection);

          var deadlinesSection = el("div", { class: "section" }, [
            el("h2", { text: "Deadlines" })
          ]);
          if (deadlines) {
            deadlinesSection.appendChild(el("pre", null, [safeJson(deadlines)]));
          } else {
            deadlinesSection.appendChild(el("p", { class: "muted", text: "No deadlines." }));
          }
          app.appendChild(deadlinesSection);

          var emailSection = el("div", { class: "section" }, [
            el("h2", { text: "Notice Email" })
          ]);
          if (noticeEmail) {
            emailSection.appendChild(el("pre", null, [safeJson(noticeEmail)]));
          } else {
            emailSection.appendChild(el("p", { class: "muted", text: "No notice email." }));
          }
          app.appendChild(emailSection);

          var debugSection = el("div", { class: "section" }, [
            el("h2", { text: "Raw JSON (debug)" }),
            el("pre", null, [safeJson(toolOutput)])
          ]);
          app.appendChild(debugSection);
        }

        var app = document.getElementById("app");
        if (!app) return;
        render(app, getToolOutput());
      })();
    </script>
  </body>
</html>`;
