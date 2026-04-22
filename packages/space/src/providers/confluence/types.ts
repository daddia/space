// ---------------------------------------------------------------------------
// Confluence REST API v2 response shapes
// These are internal API shapes. Fields are stored exactly as returned --
// no conversion. Do not add derived or computed fields here.
// ---------------------------------------------------------------------------

/** Page summary returned by the list endpoint (no body). */
export interface ConfluencePageSummary {
  id: string;
  title: string;
  parentId: string | null;
  spaceId?: string;
}

/** Full page object returned by the get endpoint (includes storage body). */
export interface ConfluencePage {
  id: string;
  title: string;
  parentId: string | null;
  spaceId?: string;
  body: {
    storage: {
      /** Native Confluence storage XHTML. Stored verbatim to .xhtml file. */
      value: string;
      representation: 'storage';
    };
  };
  version: {
    number: number;
  };
}

/** Internal API response shape for the page list endpoint. Not stored to disk. */
export interface ConfluencePageListResponse {
  results: ConfluencePageSummary[];
  _links: {
    /** Relative path to the next page of results, absent when on the last page. */
    next?: string;
    base?: string;
  };
}

// ---------------------------------------------------------------------------
// Shapes written to disk by the sync command
// ---------------------------------------------------------------------------

/** Written to `.space/sources/confluence/pages/{id}.meta.json`. */
export interface ConfluencePageMeta {
  id: string;
  title: string;
  parentId: string | null;
  spaceKey: string;
  labels: string[];
  version: number;
  sync_at: string; // ISO 8601
}

/** Entry in `.space/sources/confluence/index.json`. */
export interface ConfluenceIndexEntry {
  title: string;
  parentId: string | null;
}

/** Written to `.space/sources/confluence/meta.json`. */
export interface ConfluenceSyncMeta {
  sync_at: string; // ISO 8601
  space: string;
  counts: { total: number };
}
