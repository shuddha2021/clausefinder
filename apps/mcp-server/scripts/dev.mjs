import { createServer } from "node:http";
import { handler } from "../src/server.ts";

const port = Number(process.env.PORT || 8787);

createServer((req, res) => handler(req, res)).listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`ClauseFinder MCP server listening on http://localhost:${port}`);
});
