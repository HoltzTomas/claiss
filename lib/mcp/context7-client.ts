import { experimental_createMCPClient } from "ai";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export interface Context7ClientResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: any;
}

/**
 * Creates and initializes a Context7 MCP client for accessing Manim documentation
 * @returns Object containing the initialized client and available tools
 * @throws Error if client initialization or tool fetching fails
 */
export async function createContext7Client(): Promise<Context7ClientResult> {
  const transport = new StreamableHTTPClientTransport(
    new URL("https://mcp.context7.com/mcp"),
    {
      requestInit: {
        headers: {
          CONTEXT7_API_KEY: process.env.CONTEXT7 || "",
        },
      },
    }
  );

  const client = await experimental_createMCPClient({ transport });
  const tools = await client.tools();

  return { client, tools };
}
