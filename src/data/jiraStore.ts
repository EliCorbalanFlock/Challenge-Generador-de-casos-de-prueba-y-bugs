import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { JiraIssue, TestCase, TechDoc } from "../types.js";

// PoC: los datos salen de fixtures locales en vez de la API real de Jira.
// Para pasar a produccion, reemplazar estas funciones por llamadas a la REST API
// de Jira (ver README), manteniendo la misma firma.
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

export function getIssue(issueKey: string): JiraIssue | undefined {
  return issues[issueKey];
}

export function getTestCases(issueKey: string): TestCase[] {
  return testCasesByIssue[issueKey] ?? [];
}

export function getDocumentation(docRef: string): TechDoc | undefined {
  return docs[docRef];
}
