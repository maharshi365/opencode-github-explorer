import { join } from "node:path";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import type { GitHubExplorerConfig } from "./config.js";
import { MetadataManager, type RepoMetadata } from "./metadata-manager.js";
import { parseGitHubUrl, validateGitHubNames } from "./url-parser.js";
import { expandPath } from "./config.js";

export class CloneManager {
  private config: GitHubExplorerConfig;
  private metadata: MetadataManager;
  private $: any; // Bun shell API

  constructor($: any, config: GitHubExplorerConfig, projectDir?: string) {
    this.$ = $;
    this.config = {
      ...config,
      cloneDirectory: expandPath(config.cloneDirectory),
    };
    this.metadata = new MetadataManager(projectDir);
  }

  /**
   * Clone a repository or return cached path
   */
  async cloneRepo(urlInput: string): Promise<string> {
    // Parse and validate URL
    const parsed = parseGitHubUrl(urlInput);
    if (!parsed) {
      throw new Error(
        `Invalid GitHub URL: ${urlInput}\n` +
        `Supported formats:\n` +
        `  - https://github.com/owner/repo\n` +
        `  - git@github.com:owner/repo.git\n` +
        `  - owner/repo`
      );
    }

    if (!validateGitHubNames(parsed.owner, parsed.repo)) {
      throw new Error(`Invalid GitHub owner or repo name: ${parsed.key}`);
    }

    // Check if already cloned
    const existing = await this.metadata.findByKey(parsed.key);
    if (existing) {
      const isValid = await this.validateClone(existing.path);
      if (isValid) {
        // Update last accessed and return
        await this.updateLastAccessed(parsed.key);
        return existing.path;
      } else {
        // Invalid clone, remove and re-clone
        console.log(`Invalid clone detected for ${parsed.key}, re-cloning...`);
        await this.deleteRepo(parsed.key);
      }
    }

    // Check if we need to cleanup before cloning
    await this.ensureCapacity();

    // Clone the repository
    const repoPath = join(this.config.cloneDirectory, parsed.owner, parsed.repo);
    
    try {
      // Ensure parent directory exists
      await this.ensureDirectory(this.config.cloneDirectory);
      await this.ensureDirectory(join(this.config.cloneDirectory, parsed.owner));

      console.log(`Cloning ${parsed.key} to ${repoPath}...`);
      
      // Clone with depth
      await this.$`git clone --depth ${this.config.cloneDepth} ${parsed.url} ${repoPath}`;

      // Save metadata
      const now = Date.now();
      const metadata: RepoMetadata = {
        key: parsed.key,
        url: parsed.url,
        path: repoPath,
        clonedAt: now,
        lastAccessed: now,
      };

      await this.metadata.upsert(metadata);
      
      console.log(`Successfully cloned ${parsed.key}`);
      return repoPath;

    } catch (error) {
      // Clean up on failure
      if (existsSync(repoPath)) {
        await this.$`rm -rf ${repoPath}`;
      }
      throw new Error(`Failed to clone ${parsed.key}: ${error}`);
    }
  }

  /**
   * Validate that a clone is intact
   */
  async validateClone(path: string): Promise<boolean> {
    try {
      // Check if directory exists
      if (!existsSync(path)) {
        return false;
      }

      // Check if .git exists
      const gitDir = join(path, ".git");
      if (!existsSync(gitDir)) {
        return false;
      }

      // Check if there's at least one file (besides .git)
      const result = await this.$`find ${path} -maxdepth 1 -type f`.quiet();
      const hasFiles = result.stdout.toString().trim().length > 0;

      return hasFiles;
    } catch (error) {
      return false;
    }
  }

  /**
   * Update last accessed timestamp
   */
  async updateLastAccessed(key: string): Promise<void> {
    const repo = await this.metadata.findByKey(key);
    if (repo) {
      repo.lastAccessed = Date.now();
      await this.metadata.upsert(repo);
    }
  }

  /**
   * Ensure we have capacity for a new clone
   */
  private async ensureCapacity(): Promise<void> {
    const all = await this.metadata.load();
    
    if (all.length >= this.config.maxClonedRepos) {
      console.log(`Max repos (${this.config.maxClonedRepos}) reached, cleaning up oldest...`);
      await this.cleanupLRU(all.length - this.config.maxClonedRepos + 1);
    }
  }

  /**
   * Clean up least recently used repos
   */
  async cleanupLRU(count = 1): Promise<void> {
    const sorted = await this.metadata.getSortedByLRU();
    
    for (let i = 0; i < Math.min(count, sorted.length); i++) {
      const repo = sorted[i];
      console.log(`Removing LRU repo: ${repo.key} (last accessed: ${new Date(repo.lastAccessed).toLocaleString()})`);
      await this.deleteRepo(repo.key);
    }
  }

  /**
   * Clean up repos that haven't been accessed in N days
   */
  async cleanupStale(days: number): Promise<void> {
    const all = await this.metadata.load();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    
    const stale = all.filter(repo => repo.lastAccessed < cutoff);
    
    if (stale.length > 0) {
      console.log(`Cleaning up ${stale.length} stale repo(s) (older than ${days} days)...`);
      
      for (const repo of stale) {
        await this.deleteRepo(repo.key);
      }
    }
  }

  /**
   * Delete a specific repository
   */
  async deleteRepo(key: string): Promise<void> {
    const repo = await this.metadata.findByKey(key);
    if (!repo) {
      return;
    }

    try {
      if (existsSync(repo.path)) {
        await this.$`rm -rf ${repo.path}`;
      }
      await this.metadata.remove(key);
      console.log(`Deleted repo: ${key}`);
    } catch (error) {
      console.error(`Failed to delete repo ${key}:`, error);
      throw error;
    }
  }

  /**
   * List all cloned repositories
   */
  async listRepos(): Promise<RepoMetadata[]> {
    return await this.metadata.load();
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectory(path: string): Promise<void> {
    if (!existsSync(path)) {
      await mkdir(path, { recursive: true });
    }
  }
}
