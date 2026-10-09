import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverEntry = path.join(here, "..", "dist", "index.js");
const repoPath = path.join(here, "..", "sample-repo");

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverEntry],
});

const client = new Client({ name: "smoke-test", version: "0.0.1" });
await client.connect(transport);

const tools = await client.listTools();
console.log(
  "Tools registradas:",
  tools.tools.map((t) => t.name)
);

async function call(name: string, args: Record<string, unknown>) {
  console.log(`\n--- ${name}(${JSON.stringify(args)}) ---`);
  const result = await client.callTool({ name, arguments: args });
  for (const item of result.content as Array<{ type: string; text?: string }>) {
    if (item.type === "text") console.log(item.text);
  }
}

await call("demo_jira_get_issue", { issueKey: "DEMO-5001" });
await call("demo_jira_get_issue", { issueKey: "DEMO-5042" });
await call("demo_jira_get_test_cases", { issueKey: "DEMO-5001" });
await call("demo_jira_get_documentation", { docRef: "DOC-FILTROS-AVISO" });
await call("demo_jira_get_documentation", { docRef: "NO-EXISTE" });
await call("git_get_changed_files", {
  repoPath,
  fromRef: "main",
  toRef: "feature/DEMO-5001-filtro-estado",
});
await call("git_get_diff", {
  repoPath,
  fromRef: "main",
  toRef: "feature/DEMO-5001-filtro-estado",
});

await call("demo_jira_get_issue", { issueKey: "DEMO-6010" });
await call("demo_jira_get_issue", { issueKey: "DEMO-6042" });
await call("demo_jira_get_test_cases", { issueKey: "DEMO-6010" });
await call("demo_jira_get_documentation", { docRef: "DOC-DENUNCIA-SRT" });
await call("git_get_diff", {
  repoPath,
  fromRef: "main",
  toRef: "feature/DEMO-6010-denuncia-srt",
});

// Sin GITLAB_BASE_URL/GITLAB_TOKEN configurados: debe devolver un error
// entendible, no explotar.
await call("gitlab_get_mr_diff", { project: "grupo/proyecto-demo", mrIid: 123 });

await client.close();
