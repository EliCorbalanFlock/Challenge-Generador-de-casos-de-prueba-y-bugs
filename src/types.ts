export interface JiraIssue {
  key: string;
  type: "Historia de Usuario" | "Bug" | string;
  summary: string;
  description: string;
  status: string;
  linkedIssues: string[];
  docLinks: string[];
  testCaseKeys?: string[];
  reportedAgainst?: string;
}

export interface TestCase {
  key: string;
  title: string;
  preconditions: string;
  steps: string[];
  expectedResult: string;
}

export interface TechDoc {
  title: string;
  content: string;
}
