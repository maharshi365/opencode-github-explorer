export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  key: string; // normalized "owner/repo"
  url: string; // full https URL
}

/**
 * Parse various GitHub URL formats and normalize to owner/repo
 * 
 * Supported formats:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - git@github.com:owner/repo.git
 * - owner/repo (shorthand)
 */
export function parseGitHubUrl(input: string): ParsedGitHubUrl | null {
  // Remove whitespace
  const trimmed = input.trim();

  // Pattern 1: HTTPS URL with optional .git
  const httpsPattern = /^https?:\/\/github\.com\/([^\/]+)\/(.+?)(\.git)?$/;
  const httpsMatch = trimmed.match(httpsPattern);
  if (httpsMatch) {
    const owner = httpsMatch[1];
    const repo = httpsMatch[2];
    return {
      owner,
      repo,
      key: `${owner}/${repo}`,
      url: `https://github.com/${owner}/${repo}.git`,
    };
  }

  // Pattern 2: SSH URL
  const sshPattern = /^git@github\.com:([^\/]+)\/(.+?)(\.git)?$/;
  const sshMatch = trimmed.match(sshPattern);
  if (sshMatch) {
    const owner = sshMatch[1];
    const repo = sshMatch[2];
    return {
      owner,
      repo,
      key: `${owner}/${repo}`,
      url: `https://github.com/${owner}/${repo}.git`,
    };
  }

  // Pattern 3: Shorthand owner/repo
  const shorthandPattern = /^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9._-]+)$/;
  const shorthandMatch = trimmed.match(shorthandPattern);
  if (shorthandMatch) {
    const owner = shorthandMatch[1];
    const repo = shorthandMatch[2];
    return {
      owner,
      repo,
      key: `${owner}/${repo}`,
      url: `https://github.com/${owner}/${repo}.git`,
    };
  }

  return null;
}

/**
 * Validate that owner and repo names follow GitHub's rules
 */
export function validateGitHubNames(owner: string, repo: string): boolean {
  // GitHub username/org rules: alphanumeric, hyphen, max 39 chars
  const ownerValid = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(owner);
  
  // GitHub repo rules: alphanumeric, hyphen, underscore, dot
  const repoValid = /^[a-zA-Z0-9._-]+$/.test(repo);
  
  return ownerValid && repoValid;
}
