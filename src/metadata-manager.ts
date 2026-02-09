import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";

export interface RepoMetadata {
  key: string; // "owner/repo"
  url: string; // Full GitHub URL
  path: string; // Local clone path
  clonedAt: number; // Timestamp
  lastAccessed: number; // Timestamp for LRU
  size?: number; // Optional disk usage in bytes
}

export class MetadataManager {
  private globalMetadataPath: string;
  private projectMetadataPath: string | null;

  constructor(projectDir?: string) {
    this.globalMetadataPath = join(
      homedir(),
      ".config",
      "opencode",
      "github-explorer-metadata.json"
    );

    this.projectMetadataPath = projectDir
      ? join(projectDir, ".opencode", "github-explorer-metadata.json")
      : null;
  }

  /**
   * Load metadata from both global and project locations
   * Project metadata takes precedence (for overrides)
   */
  async load(): Promise<RepoMetadata[]> {
    const globalData = await this.loadFromPath(this.globalMetadataPath);
    
    if (!this.projectMetadataPath) {
      return globalData;
    }

    const projectData = await this.loadFromPath(this.projectMetadataPath);
    
    // Merge: project overrides global by key
    const merged = new Map<string, RepoMetadata>();
    
    globalData.forEach(repo => merged.set(repo.key, repo));
    projectData.forEach(repo => merged.set(repo.key, repo));
    
    return Array.from(merged.values());
  }

  /**
   * Save metadata (defaults to global location)
   */
  async save(metadata: RepoMetadata[], useProject = false): Promise<void> {
    const targetPath = useProject && this.projectMetadataPath
      ? this.projectMetadataPath
      : this.globalMetadataPath;

    await this.saveToPath(targetPath, metadata);
  }

  /**
   * Load metadata from a specific file path
   */
  private async loadFromPath(path: string): Promise<RepoMetadata[]> {
    try {
      const file = Bun.file(path);
      if (await file.exists()) {
        const data = await file.json();
        return Array.isArray(data) ? data : [];
      }
    } catch (error) {
      console.error(`Failed to load metadata from ${path}:`, error);
    }
    return [];
  }

  /**
   * Save metadata to a specific file path
   */
  private async saveToPath(path: string, metadata: RepoMetadata[]): Promise<void> {
    try {
      // Ensure directory exists
      const dir = dirname(path);
      
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      await Bun.write(path, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.error(`Failed to save metadata to ${path}:`, error);
      throw error;
    }
  }

  /**
   * Find a specific repo by key
   */
  async findByKey(key: string): Promise<RepoMetadata | null> {
    const all = await this.load();
    return all.find(repo => repo.key === key) || null;
  }

  /**
   * Update or add a repo's metadata
   */
  async upsert(repo: RepoMetadata, useProject = false): Promise<void> {
    const all = await this.load();
    const index = all.findIndex(r => r.key === repo.key);
    
    if (index >= 0) {
      all[index] = repo;
    } else {
      all.push(repo);
    }

    await this.save(all, useProject);
  }

  /**
   * Remove a repo from metadata
   */
  async remove(key: string, useProject = false): Promise<void> {
    const all = await this.load();
    const filtered = all.filter(repo => repo.key !== key);
    await this.save(filtered, useProject);
  }

  /**
   * Get all repos sorted by last accessed (oldest first)
   */
  async getSortedByLRU(): Promise<RepoMetadata[]> {
    const all = await this.load();
    return all.sort((a, b) => a.lastAccessed - b.lastAccessed);
  }
}
