import { describe, test, expect } from "bun:test";
import { parseGitHubUrl, validateGitHubNames } from "../src/url-parser";

describe("URL Parser", () => {
  test("should parse HTTPS URLs", () => {
    const result = parseGitHubUrl("https://github.com/facebook/react");
    expect(result).toBeTruthy();
    expect(result?.owner).toBe("facebook");
    expect(result?.repo).toBe("react");
    expect(result?.key).toBe("facebook/react");
    expect(result?.url).toBe("https://github.com/facebook/react.git");
  });

  test("should parse HTTPS URLs with .git extension", () => {
    const result = parseGitHubUrl("https://github.com/vercel/next.js.git");
    expect(result).toBeTruthy();
    expect(result?.owner).toBe("vercel");
    expect(result?.repo).toBe("next.js");
    expect(result?.key).toBe("vercel/next.js");
  });

  test("should parse SSH URLs", () => {
    const result = parseGitHubUrl("git@github.com:microsoft/typescript.git");
    expect(result).toBeTruthy();
    expect(result?.owner).toBe("microsoft");
    expect(result?.repo).toBe("typescript");
    expect(result?.key).toBe("microsoft/typescript");
  });

  test("should parse shorthand format", () => {
    const result = parseGitHubUrl("octocat/Hello-World");
    expect(result).toBeTruthy();
    expect(result?.owner).toBe("octocat");
    expect(result?.repo).toBe("Hello-World");
    expect(result?.key).toBe("octocat/Hello-World");
  });

  test("should handle repos with dots in name", () => {
    const result = parseGitHubUrl("vercel/next.js");
    expect(result).toBeTruthy();
    expect(result?.repo).toBe("next.js");
  });

  test("should return null for invalid URLs", () => {
    expect(parseGitHubUrl("invalid-url")).toBeNull();
    expect(parseGitHubUrl("https://gitlab.com/owner/repo")).toBeNull();
    expect(parseGitHubUrl("")).toBeNull();
  });
});

describe("GitHub Name Validation", () => {
  test("should validate valid owner names", () => {
    expect(validateGitHubNames("facebook", "react")).toBe(true);
    expect(validateGitHubNames("my-org", "my-repo")).toBe(true);
  });

  test("should validate repos with dots and underscores", () => {
    expect(validateGitHubNames("vercel", "next.js")).toBe(true);
    expect(validateGitHubNames("owner", "my_repo.js")).toBe(true);
  });

  test("should reject invalid names", () => {
    expect(validateGitHubNames("-invalid", "repo")).toBe(false);
    expect(validateGitHubNames("owner", "")).toBe(false);
  });
});
