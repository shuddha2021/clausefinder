import { createMcpServer } from "./server.js";

async function main() {
  const server = createMcpServer();

  // Standard MCP stdio transport for local usage.
  const { StdioServerTransport } = await import(
    "@modelcontextprotocol/sdk/server/stdio.js"
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
