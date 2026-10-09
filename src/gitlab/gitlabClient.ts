interface GitlabConfig {
  baseUrl: string;
  token: string;
}

function getConfig(): GitlabConfig {
  const baseUrl = process.env.GITLAB_BASE_URL;
  const token = process.env.GITLAB_TOKEN;
  if (!baseUrl || !token) {
    throw new Error(
      "Faltan las variables de entorno GITLAB_BASE_URL y/o GITLAB_TOKEN. " +
        "Configuralas para poder traer un Merge Request por API (ver README), " +
        "o usa un MCP de GitLab ya conectado en la sesion, o las tools git_* " +
        "sobre un repo local clonado."
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), token };
}

async function gitlabFetch(path: string): Promise<unknown> {
  const { baseUrl, token } = getConfig();
  const res = await fetch(`${baseUrl}/api/v4${path}`, {
    headers: { "PRIVATE-TOKEN": token },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitLab API respondio ${res.status} en "${path}": ${body}`);
  }
  return res.json();
}

function encodeProject(project: string): string {
  return encodeURIComponent(project);
}

export async function getMergeRequestInfo(project: string, mrIid: number): Promise<unknown> {
  const encoded = encodeProject(project);
  return gitlabFetch(`/projects/${encoded}/merge_requests/${mrIid}`);
}

interface GitlabDiffEntry {
  old_path: string;
  new_path: string;
  diff: string;
  new_file?: boolean;
  deleted_file?: boolean;
  renamed_file?: boolean;
}

const PER_PAGE = 100;
const MAX_PAGES = 20; // tope de seguridad: hasta 2000 archivos modificados

export async function getMergeRequestDiff(project: string, mrIid: number): Promise<string> {
  const encoded = encodeProject(project);
  const allDiffs: GitlabDiffEntry[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = (await gitlabFetch(
      `/projects/${encoded}/merge_requests/${mrIid}/diffs?page=${page}&per_page=${PER_PAGE}`
    )) as GitlabDiffEntry[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    allDiffs.push(...batch);
    if (batch.length < PER_PAGE) break;
  }

  return allDiffs
    .map((d) => `diff --git a/${d.old_path} b/${d.new_path}\n${d.diff}`)
    .join("\n");
}
