import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { JiraIssue, TestCase, TechDoc } from "../types.js";
import * as realClient from "./jiraRealClient.js";

// Fixtures locales: el fallback por defecto, y lo unico que se usa si no hay
// JIRA_BASE_URL/JIRA_EMAIL/JIRA_API_TOKEN configurados. Si estan
// configurados, se intenta primero el cliente real (jiraRealClient.ts) y se
// cae a fixtures solo si no devuelve nada (ej. porque la clave es de demo).
// Ver "Jira: no reinventar la rueda" en el README: esto es para equipos sin
// ningun MCP de Jira propio, no el camino por defecto.
const FIXTURES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "fixtures"
);

function loadJson<T>(fileName: string): T {
  const raw = readFileSync(path.join(FIXTURES_DIR, fileName), "utf-8");
  return JSON.parse(raw) as T;
}

const issues = loadJson<Record<string, JiraIssue>>("issues.json");
const testCasesByIssue = loadJson<Record<string, TestCase[]>>("testCases.json");
const docs = loadJson<Record<string, TechDoc>>("docs.json");

export async function getIssue(issueKey: string): Promise<JiraIssue | undefined> {
  if (realClient.hasRealJiraConfig()) {
    const real = await realClient.getIssue(issueKey);
    if (real) return real;
  }
  return issues[issueKey];
}

export async function getTestCases(issueKey: string): Promise<TestCase[]> {
  if (realClient.hasRealJiraConfig()) {
    const real = await realClient.getTestCases(issueKey);
    if (real.length > 0) return real;
  }
  return testCasesByIssue[issueKey] ?? [];
}

export async function getDocumentation(docRef: string): Promise<TechDoc | undefined> {
  if (realClient.hasRealJiraConfig()) {
    const real = await realClient.getDocumentation(docRef);
    if (real) return real;
  }
  return docs[docRef];
}
