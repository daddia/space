export {
  detectWorkspaceState,
  readExistingLayout,
  type WorkspaceState,
  type WorkspaceLayout,
} from './detect-workspace-state.js';
export { mergeOrCreateConfig } from './merge-config.js';
export { ensurePackageJsonDeps } from './ensure-package-deps.js';
export { ensureAgentDirs, forceSymlink } from './ensure-agent-dirs.js';
export { detectPackageManager, runInstall } from './run-install.js';
