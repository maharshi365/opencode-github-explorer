import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { $ } from "bun";
import { CloneManager } from "../src/clone-manager";
import { DEFAULT_CONFIG } from "../src/config";
import { existsSync } from "node:fs";

const TEST_DIR = "./test-repos-unit";

const testConfig = {
  ...DEFAULT_CONFIG,
  cloneDirectory: TEST_DIR,
  maxClonedRepos: 2,
};

describe("Clone Manager", () => {
  let cloneManager: CloneManager;

  beforeEach(async () => {
    cloneManager = new CloneManager($, testConfig, TEST_DIR);
    // Clean metadata before each test
    const metadataPath = `${TEST_DIR}/.opencode/github-explorer-metadata.json`;
    if (existsSync(metadataPath)) {
      await $`rm -f ${metadataPath}`;
    }
  });

  afterEach(async () => {
    // Cleanup test directory and metadata
    if (existsSync(TEST_DIR)) {
      await $`rm -rf ${TEST_DIR}`;
    }
    const metadataPath = `${TEST_DIR}/.opencode`;
    if (existsSync(metadataPath)) {
      await $`rm -rf ${metadataPath}`;
    }
  });

  test("should clone a repository", async () => {
    const path = await cloneManager.cloneRepo("octocat/Hello-World");
    expect(path).toContain("octocat");
    expect(path).toContain("Hello-World");
    expect(existsSync(path)).toBe(true);
  }, 30000); // 30 second timeout for cloning

  test("should use cached clone on second access", async () => {
    const path1 = await cloneManager.cloneRepo("octocat/Hello-World");
    const startTime = Date.now();
    const path2 = await cloneManager.cloneRepo("octocat/Hello-World");
    const duration = Date.now() - startTime;
    
    expect(path1).toBe(path2);
    expect(duration).toBeLessThan(1000); // Should be instant (< 1 second)
  }, 60000);

  test("should list cloned repositories", async () => {
    await cloneManager.cloneRepo("octocat/Hello-World");
    const repos = await cloneManager.listRepos();
    
    expect(repos.length).toBe(1);
    expect(repos[0].key).toBe("octocat/Hello-World");
  }, 30000);

  test("should perform LRU cleanup when max exceeded", async () => {
    // Clone two repos (max is 2)
    await cloneManager.cloneRepo("octocat/Hello-World");
    await cloneManager.cloneRepo("github/gitignore");
    
    let repos = await cloneManager.listRepos();
    expect(repos.length).toBe(2);
    
    // Clone third repo - should trigger cleanup
    await cloneManager.cloneRepo("octocat/Spoon-Knife");
    
    repos = await cloneManager.listRepos();
    expect(repos.length).toBe(2);
    
    // First repo should be removed (LRU)
    const keys = repos.map(r => r.key);
    expect(keys).not.toContain("octocat/Hello-World");
  }, 90000);

  test("should handle invalid URLs", async () => {
    expect(async () => {
      await cloneManager.cloneRepo("invalid-url");
    }).toThrow();
  });
});
