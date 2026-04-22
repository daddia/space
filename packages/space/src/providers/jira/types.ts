// Native Jira REST API v3 shapes. Fields are stored exactly as the API
// returns them -- no conversion. `description` and comment bodies are
// Atlassian Document Format (ADF) objects, typed as unknown.

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: Record<string, unknown>;
}

export interface JiraIssueLink {
  id: string;
  self: string;
  type: {
    id: string;
    name: string;
    inward: string;
    outward: string;
    self: string;
  };
  inwardIssue?: {
    id: string;
    key: string;
    self: string;
  };
  outwardIssue?: {
    id: string;
    key: string;
    self: string;
  };
}

// Internal API response shape (not stored to disk).
export interface JiraSearchResponse {
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

// Stored in .space/sources/jira/meta.json
export interface JiraSyncMeta {
  sync_at: string; // ISO 8601
  project: string;
  jql: string;
  counts: {
    total: number;
    epics: number;
    stories: number;
    bugs: number;
  };
}
