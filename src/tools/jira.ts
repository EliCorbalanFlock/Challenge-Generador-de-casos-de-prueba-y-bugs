import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getIssue, getTestCases, getDocumentation } from "../data/jiraStore.js";

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

export function registerJiraTools(server: McpServer): void {
  server.tool(
    "jira_get_issue",
    "Obtiene los datos de una Historia de Usuario o un Bug de Jira a partir de su clave: " +
      "resumen, descripcion, criterios de aceptacion, estado, issues enlazados y links a " +
      "documentacion tecnica. Usar siempre como primer paso antes de analizar un bug.",
    { issueKey: z.string().describe("Clave del issue, ej: DEMO-5001") },
    async ({ issueKey }) => {
      const issue = getIssue(issueKey);
      if (!issue) {
        return textResult(
          `No se encontro el issue "${issueKey}". Pedile al usuario la clave correcta o los ` +
            `datos de la historia/bug para poder continuar el analisis.`
        );
      }
      return textResult(JSON.stringify(issue, null, 2));
    }
  );

  server.tool(
    "jira_get_test_cases",
    "Obtiene los casos de prueba asociados a una Historia de Usuario de Jira. " +
      "Usar para verificar si los casos de prueba existentes corresponden a la funcionalidad " +
      "documentada, o para detectar casos de prueba mal definidos.",
    { issueKey: z.string().describe("Clave de la Historia de Usuario, ej: DEMO-5001") },
    async ({ issueKey }) => {
      const testCases = getTestCases(issueKey);
      if (testCases.length === 0) {
        return textResult(
          `No hay casos de prueba registrados para "${issueKey}". Si esperabas encontrar ` +
            `alguno, pedile al usuario que los comparta.`
        );
      }
      return textResult(JSON.stringify(testCases, null, 2));
    }
  );

  server.tool(
    "jira_get_documentation",
    "Obtiene el contenido de la documentacion tecnica enlazada a un issue de Jira, a partir " +
      "de la referencia devuelta en el campo docLinks de jira_get_issue. Si la documentacion " +
      "no esta disponible, el resultado indica que hay que pedirsela al usuario.",
    { docRef: z.string().describe("Referencia de documentacion, tal como aparece en docLinks") },
    async ({ docRef }) => {
      const doc = getDocumentation(docRef);
      if (!doc) {
        return textResult(
          `No se encontro documentacion local para "${docRef}". Pedile al usuario que pegue ` +
            `el contenido de esa documentacion (o el link accesible) para poder compararla ` +
            `contra el codigo y el bug.`
        );
      }
      return textResult(JSON.stringify(doc, null, 2));
    }
  );
}
