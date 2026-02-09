import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

export interface GitHubExplorerConfig {
  maxClonedRepos: number;
  cloneDirectory: string;
  autoCleanupDays: number;
  cloneDepth: number;
  excludePatterns: string[];
}

export const DEFAULT_CONFIG: GitHubExplorerConfig = {
  maxClonedRepos: 5,
  cloneDirectory: join(homedir(), ".cache", "opencode", "github-repos"),
  autoCleanupDays: 7,
  cloneDepth: 1,
  excludePatterns: ["node_modules", ".git", "dist", "build", ".next"],
};

export function mergeConfig(
  userConfig?: Partial<GitHubExplorerConfig>
): GitHubExplorerConfig {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };
}

export function expandPath(path: string): string {
  if (path.startsWith("~/")) {
    return join(homedir(), path.slice(2));
  }
  return path;
}
