import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerJiraTools } from "./tools/jira.js";
import { registerGitTools } from "./tools/git.js";
import { registerGitlabTools } from "./tools/gitlab.js";

const server = new McpServer({
  name: "hu-bug-analyzer",
  version: "0.1.0",
});

registerJiraTools(server);
registerGitTools(server);
registerGitlabTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
