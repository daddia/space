// Re-export shim — source of truth has moved to src/lifecycle/detect-workspace-state.ts.
// This file is retained for backwards-compatible imports within the package.
export {
  detectWorkspaceState,
  readExistingLayout,
  type WorkspaceState,
  type WorkspaceLayout,
} from '../lifecycle/detect-workspace-state.js';
