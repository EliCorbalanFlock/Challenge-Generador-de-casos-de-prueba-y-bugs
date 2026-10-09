import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getChangedFiles, getDiff, getFileContent } from "../git/gitAnalyzer.js";

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

export function registerGitTools(server: McpServer): void {
  server.tool(
    "git_get_changed_files",
    "Lista los archivos modificados entre dos referencias de git (ramas, tags o commits) " +
      "en un repositorio local. Usar antes de git_get_diff para saber que archivos revisar.",
    {
      repoPath: z.string().describe("Ruta local al repositorio git"),
      fromRef: z.string().default("main").describe("Referencia base, ej: main"),
      toRef: z.string().describe("Referencia con los cambios de la historia, ej: feature/DEMO-5001-filtro-estado"),
    },
    async ({ repoPath, fromRef, toRef }) => {
      try {
        return textResult(getChangedFiles(repoPath, fromRef, toRef));
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.tool(
    "git_get_diff",
    "Obtiene el diff completo entre dos referencias de git en un repositorio local. " +
      "Usar para comparar el codigo efectivamente desarrollado para una historia contra lo " +
      "que describe la documentacion tecnica y el bug reportado.",
    {
      repoPath: z.string().describe("Ruta local al repositorio git"),
      fromRef: z.string().default("main").describe("Referencia base, ej: main"),
      toRef: z.string().describe("Referencia con los cambios de la historia, ej: feature/DEMO-5001-filtro-estado"),
    },
    async ({ repoPath, fromRef, toRef }) => {
      try {
        return textResult(getDiff(repoPath, fromRef, toRef));
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.tool(
    "git_get_file_content",
    "Obtiene el contenido completo de un archivo en una referencia de git puntual. Usar " +
      "cuando el diff no alcanza para entender el comportamiento (por ejemplo, para ver un " +
      "archivo completo tal como quedo despues de la historia).",
    {
      repoPath: z.string().describe("Ruta local al repositorio git"),
      ref: z.string().describe("Referencia de git, ej: feature/DEMO-5001-filtro-estado"),
      filePath: z.string().describe("Ruta del archivo relativa a la raiz del repositorio"),
    },
    async ({ repoPath, ref, filePath }) => {
      try {
        return textResult(getFileContent(repoPath, ref, filePath));
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}
