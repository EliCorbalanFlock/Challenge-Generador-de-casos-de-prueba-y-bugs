import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getIssue, getTestCases, getDocumentation } from "../data/jiraStore.js";

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

// Prefijo "demo_": estas tools leen fixtures locales, no la API real de Jira.
// Sirven para probar el flujo del skill sin credenciales. Si en la sesion hay
// conectado un MCP de Jira real (ej. el que ya usa el equipo), el skill debe
// preferir ese antes que estas.
export function registerJiraTools(server: McpServer): void {
  server.tool(
    "demo_jira_get_issue",
    "[DEMO] Obtiene los datos de una Historia de Usuario o un Bug desde fixtures locales, " +
      "a partir de su clave: resumen, descripcion, criterios de aceptacion, estado, issues " +
      "enlazados y links a documentacion tecnica. Usar solo si no hay un MCP de Jira real " +
      "conectado en la sesion; si lo hay, preferir ese para traer el issue real.",
    { issueKey: z.string().describe("Clave del issue, ej: DEMO-5001") },
    async ({ issueKey }) => {
      const issue = getIssue(issueKey);
      if (!issue) {
        return textResult(
          `No se encontro el issue "${issueKey}" en las fixtures de demo. Pedile al usuario ` +
            `que pegue el texto de la Historia de Usuario y del bug reportado para poder ` +
            `continuar el analisis.`
        );
      }
      return textResult(JSON.stringify(issue, null, 2));
    }
  );

  server.tool(
    "demo_jira_get_test_cases",
    "[DEMO] Obtiene, desde fixtures locales, los casos de prueba asociados a una Historia de " +
      "Usuario. Usar solo si no hay un MCP de Jira (o de gestion de casos de prueba) real " +
      "conectado en la sesion.",
    { issueKey: z.string().describe("Clave de la Historia de Usuario, ej: DEMO-5001") },
    async ({ issueKey }) => {
      const testCases = getTestCases(issueKey);
      if (testCases.length === 0) {
        return textResult(
          `No hay casos de prueba registrados en las fixtures de demo para "${issueKey}". Si ` +
            `esperabas encontrar alguno, pedile al usuario que los comparta.`
        );
      }
      return textResult(JSON.stringify(testCases, null, 2));
    }
  );

  server.tool(
    "demo_jira_get_documentation",
    "[DEMO] Obtiene, desde fixtures locales, el contenido de la documentacion tecnica " +
      "enlazada a un issue, a partir de la referencia devuelta en el campo docLinks de " +
      "demo_jira_get_issue. Usar solo si no hay un MCP de documentacion tecnica real " +
      "conectado en la sesion.",
    { docRef: z.string().describe("Referencia de documentacion, tal como aparece en docLinks") },
    async ({ docRef }) => {
      const doc = getDocumentation(docRef);
      if (!doc) {
        return textResult(
          `No se encontro documentacion local para "${docRef}" en las fixtures de demo. ` +
            `Pedile al usuario que pegue el contenido de esa documentacion (o el link ` +
            `accesible) para poder compararla contra el codigo y el bug.`
        );
      }
      return textResult(JSON.stringify(doc, null, 2));
    }
  );
}
