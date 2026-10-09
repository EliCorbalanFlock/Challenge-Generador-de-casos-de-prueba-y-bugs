import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getIssue, getTestCases, getDocumentation } from "../data/jiraStore.js";
import { hasRealJiraConfig } from "../data/jiraRealClient.js";

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

// Prefijo "demo_": por defecto leen fixtures locales. Si el servidor tiene
// JIRA_BASE_URL/JIRA_EMAIL/JIRA_API_TOKEN configurados (ver README: solo
// para equipos sin un MCP de Jira propio), intentan primero traer el dato
// real y caen a fixtures si no lo encuentran. El nombre se mantiene estable
// en ambos modos para no romper la referencia que hacen los skills. Si en la
// sesion hay conectado un MCP de Jira real (ej. el que ya usa el equipo), el
// skill debe preferir ese antes que estas.
export function registerJiraTools(server: McpServer): void {
  server.tool(
    "demo_jira_get_issue",
    "Obtiene los datos de una Historia de Usuario o un Bug a partir de su clave: resumen, " +
      "descripcion, estado, issues enlazados y links a documentacion tecnica. Si el servidor " +
      "tiene credenciales reales de Jira configuradas, trae el issue real; si no, usa fixtures " +
      "locales de demo. Usar solo si no hay un MCP de Jira real conectado en la sesion; si lo " +
      "hay, preferir ese.",
    { issueKey: z.string().describe("Clave del issue, ej: DEMO-5001") },
    async ({ issueKey }) => {
      const issue = await getIssue(issueKey);
      if (!issue) {
        return textResult(
          `No se encontro el issue "${issueKey}"${hasRealJiraConfig() ? " (ni real ni en las fixtures de demo)" : " en las fixtures de demo"}. ` +
            `Pedile al usuario que pegue el texto de la Historia de Usuario y del bug reportado ` +
            `para poder continuar el analisis.`
        );
      }
      return textResult(JSON.stringify(issue, null, 2));
    }
  );

  server.tool(
    "demo_jira_get_test_cases",
    "Obtiene los casos de prueba asociados a una Historia de Usuario. Con credenciales reales " +
      "de Jira configuradas, busca issues enlazados del tipo configurado en JIRA_TEST_ISSUE_TYPE " +
      "(heuristica generica, sin Xray/Zephyr); si no, usa fixtures locales de demo. Usar solo si " +
      "no hay un MCP de Jira (o de gestion de casos de prueba) real conectado en la sesion.",
    { issueKey: z.string().describe("Clave de la Historia de Usuario, ej: DEMO-5001") },
    async ({ issueKey }) => {
      const testCases = await getTestCases(issueKey);
      if (testCases.length === 0) {
        return textResult(
          `No hay casos de prueba para "${issueKey}". Si esperabas encontrar alguno, pedile al ` +
            `usuario que los comparta.`
        );
      }
      return textResult(JSON.stringify(testCases, null, 2));
    }
  );

  server.tool(
    "demo_jira_get_documentation",
    "Obtiene el contenido de la documentacion tecnica enlazada a un issue, a partir de la " +
      "referencia devuelta en el campo docLinks de demo_jira_get_issue. Con credenciales reales " +
      "de Jira configuradas, intenta resolver URLs de Confluence Cloud del mismo sitio; si no, " +
      "usa fixtures locales de demo. Usar solo si no hay un MCP de documentacion tecnica real " +
      "conectado en la sesion.",
    { docRef: z.string().describe("Referencia de documentacion, tal como aparece en docLinks") },
    async ({ docRef }) => {
      const doc = await getDocumentation(docRef);
      if (!doc) {
        return textResult(
          `No se encontro documentacion para "${docRef}". Pedile al usuario que pegue el ` +
            `contenido de esa documentacion (o el link accesible) para poder compararla contra ` +
            `el codigo y el bug.`
        );
      }
      return textResult(JSON.stringify(doc, null, 2));
    }
  );
}
