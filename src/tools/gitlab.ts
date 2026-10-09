import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMergeRequestInfo, getMergeRequestDiff } from "../gitlab/gitlabClient.js";

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

const projectParam = z
  .string()
  .describe('Path del proyecto en GitLab (ej: "grupo/subgrupo/proyecto") o su ID numerico');
const mrIidParam = z.number().int().describe("IID (numero) del Merge Request dentro del proyecto");

// Tools opcionales via API REST de GitLab, para equipos que no quieran clonar
// el repo localmente y no tengan ya un MCP de GitLab propio conectado (si lo
// tienen, el skill debe preferir ese antes que estas).
export function registerGitlabTools(server: McpServer): void {
  server.tool(
    "gitlab_get_mr_info",
    "Obtiene los metadatos de un Merge Request de GitLab (titulo, descripcion, estado, rama " +
      "origen/destino) via la API REST, sin clonar el repo. Requiere GITLAB_BASE_URL y " +
      "GITLAB_TOKEN configurados por variable de entorno. Si hay un MCP de GitLab real " +
      "conectado en la sesion (ej. fedpat-gitlab), preferir ese.",
    { project: projectParam, mrIid: mrIidParam },
    async ({ project, mrIid }) => {
      try {
        const mr = await getMergeRequestInfo(project, mrIid);
        return textResult(JSON.stringify(mr, null, 2));
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.tool(
    "gitlab_get_mr_diff",
    "Obtiene el diff completo de un Merge Request de GitLab via la API REST, sin clonar el " +
      "repo. Requiere GITLAB_BASE_URL y GITLAB_TOKEN configurados por variable de entorno. Si " +
      "hay un MCP de GitLab real conectado en la sesion (ej. fedpat-gitlab), preferir ese para " +
      "traer el diff.",
    { project: projectParam, mrIid: mrIidParam },
    async ({ project, mrIid }) => {
      try {
        const diff = await getMergeRequestDiff(project, mrIid);
        if (!diff) {
          return textResult(
            `El Merge Request !${mrIid} de "${project}" no tiene cambios, o no se pudo obtener el diff.`
          );
        }
        return textResult(diff);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}
