import { execFileSync } from "node:child_process";

function git(repoPath: string, args: string[]): string {
  try {
    return execFileSync("git", ["-C", repoPath, ...args], {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`git ${args.join(" ")} fallo en "${repoPath}": ${message}`);
  }
}

export function getChangedFiles(repoPath: string, fromRef: string, toRef: string): string {
  return git(repoPath, ["diff", "--name-status", `${fromRef}..${toRef}`]);
}

export function getDiff(repoPath: string, fromRef: string, toRef: string): string {
  return git(repoPath, ["diff", `${fromRef}..${toRef}`]);
}

export function getFileContent(repoPath: string, ref: string, filePath: string): string {
  return git(repoPath, ["show", `${ref}:${filePath}`]);
}
