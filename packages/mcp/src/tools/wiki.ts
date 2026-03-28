import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../api-client";
import { tryAction, withResult } from "./utils";

export function registerWikiTools(server: McpServer, api: ApiClient) {
  server.tool(
    "wiki.nav",
    "Get the wiki navigation tree. Lists all wiki pages with their paths.",
    {},
    async () => withResult(() => api.getWikiNav()),
  );

  server.tool(
    "wiki.page",
    "Get a wiki page by path. Returns the page content, title, and metadata.",
    { path: z.string().describe("Wiki page path (e.g. 'getting-started' or 'guides/setup')") },
    async ({ path }) => withResult(() => api.getWikiPage(path)),
  );

  server.tool(
    "wiki.raw",
    "Get the raw markdown content of a wiki page.",
    { path: z.string().describe("Wiki page path") },
    async ({ path }) => withResult(() => api.getWikiRaw(path)),
  );

  server.tool(
    "wiki.save",
    "Create or update a wiki page. If the page exists it will be updated; otherwise a new page is created.",
    {
      path: z.string().describe("Wiki page path"),
      content: z.string().describe("Markdown content for the page"),
      title: z.string().optional().describe("Page title (defaults to filename)"),
    },
    async ({ path, content, title }) =>
      tryAction(
        () => api.saveWikiPage(path, content, title),
        (r) => `Wiki page saved: ${path} (id: ${r.id})`,
      ),
  );
}
