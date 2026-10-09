import type { JiraIssue, TestCase, TechDoc } from "../types.js";

interface JiraRealConfig {
  baseUrl: string;
  email: string;
  token: string;
}

function getConfig(): JiraRealConfig | undefined {
  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  if (!baseUrl || !email || !token) return undefined;
  return { baseUrl: baseUrl.replace(/\/+$/, ""), email, token };
}

export function hasRealJiraConfig(): boolean {
  return getConfig() !== undefined;
}

function authHeader(config: JiraRealConfig): string {
  return "Basic " + Buffer.from(`${config.email}:${config.token}`).toString("base64");
}

async function jiraFetch(config: JiraRealConfig, path: string): Promise<unknown> {
  const res = await fetch(`${config.baseUrl}${path}`, {
    headers: { Authorization: authHeader(config), Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jira API respondio ${res.status} en "${path}": ${body}`);
  }
  return res.json();
}

// Conversion minima de Atlassian Document Format (ADF, formato del campo
// "description" en la API v3 de Jira Cloud) a texto plano: concatena los
// nodos de texto y separa parrafos/encabezados con saltos de linea. No
// preserva formato rico (listas, tablas, etc.) a proposito, para no sumar
// complejidad a un cliente que es un fallback, no el camino principal.
function adfToPlainText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { type?: string; text?: string; content?: unknown[] };
  if (n.type === "text" && typeof n.text === "string") return n.text;
  const children = Array.isArray(n.content) ? n.content.map(adfToPlainText).join("") : "";
  if (n.type === "paragraph" || n.type === "heading") return children + "\n\n";
  return children;
}

function descriptionToText(description: unknown): string {
  return typeof description === "string" ? description : adfToPlainText(description).trim();
}

interface JiraApiIssueLink {
  inwardIssue?: { key: string };
  outwardIssue?: { key: string };
}

interface JiraApiIssue {
  key: string;
  fields: {
    summary: string;
    description?: unknown;
    status?: { name: string };
    issuetype?: { name: string };
    issuelinks?: JiraApiIssueLink[];
  };
}

const URL_REGEX = /https?:\/\/[^\s)]+/g;
// Jira no tiene un tipo de issue estandar para "caso de prueba" (eso suele
// venir de un addon como Xray/Zephyr, con su propia API). Como heuristica
// generica, se asume que los casos de prueba son issues enlazados de este
// tipo; cada equipo puede ajustar la variable segun su configuracion.
const TEST_ISSUE_TYPE = process.env.JIRA_TEST_ISSUE_TYPE ?? "Test";

function toJiraIssue(raw: JiraApiIssue): JiraIssue {
  const description = descriptionToText(raw.fields.description);
  const linkedKeys = (raw.fields.issuelinks ?? [])
    .map((l) => l.inwardIssue?.key ?? l.outwardIssue?.key)
    .filter((k): k is string => Boolean(k));

  return {
    key: raw.key,
    type: raw.fields.issuetype?.name ?? "Desconocido",
    summary: raw.fields.summary,
    description,
    status: raw.fields.status?.name ?? "Desconocido",
    linkedIssues: linkedKeys,
    docLinks: Array.from(new Set(description.match(URL_REGEX) ?? [])),
    testCaseKeys: linkedKeys,
  };
}

export async function getIssue(issueKey: string): Promise<JiraIssue | undefined> {
  const config = getConfig();
  if (!config) return undefined;
  try {
    const raw = (await jiraFetch(
      config,
      `/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=summary,description,status,issuetype,issuelinks`
    )) as JiraApiIssue;
    return toJiraIssue(raw);
  } catch {
    return undefined;
  }
}

export async function getTestCases(issueKey: string): Promise<TestCase[]> {
  const config = getConfig();
  if (!config) return [];
  const issue = await getIssue(issueKey);
  if (!issue) return [];

  const testCases: TestCase[] = [];
  for (const key of issue.testCaseKeys ?? []) {
    try {
      const raw = (await jiraFetch(
        config,
        `/rest/api/3/issue/${encodeURIComponent(key)}?fields=summary,description,issuetype`
      )) as JiraApiIssue;
      if (raw.fields.issuetype?.name !== TEST_ISSUE_TYPE) continue;
      const description = descriptionToText(raw.fields.description);
      testCases.push({
        key: raw.key,
        title: raw.fields.summary,
        preconditions: "",
        steps: description ? [description] : [],
        expectedResult: "",
      });
    } catch {
      // issue enlazado no accesible o inexistente: se omite, no se corta todo
    }
  }
  return testCases;
}

// Soporte minimo: solo resuelve paginas de Confluence Cloud cuya URL tiene
// el patron /pages/<id>/, sobre el mismo sitio de JIRA_BASE_URL (Jira y
// Confluence Cloud comparten dominio y credenciales en un sitio Atlassian).
// Otras formas de URL, o Confluence self-hosted con otro host, quedan fuera
// de alcance: la tool cae a fixtures o le pide el contenido al usuario.
const CONFLUENCE_PAGE_ID = /\/pages\/(\d+)/;

export async function getDocumentation(docRef: string): Promise<TechDoc | undefined> {
  const config = getConfig();
  if (!config) return undefined;
  const match = docRef.match(CONFLUENCE_PAGE_ID);
  if (!match) return undefined;
  try {
    const raw = (await jiraFetch(
      config,
      `/wiki/rest/api/content/${match[1]}?expand=body.storage`
    )) as { title: string; body?: { storage?: { value?: string } } };
    const html = raw.body?.storage?.value ?? "";
    const text = html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return { title: raw.title, content: text };
  } catch {
    return undefined;
  }
}
