import type { Plugin } from '@opencode-ai/plugin';
import { tool } from '@opencode-ai/plugin';
import { CloneManager } from './clone-manager.js';
import {
  mergeConfig,
  DEFAULT_CONFIG,
  type GitHubExplorerConfig,
} from './config.js';
import { parseGitHubUrl } from './url-parser.js';

export const GitHubExplorerPlugin: Plugin = async (ctx) => {
  const { project, client, $, directory } = ctx;

  // Load configuration - project config is just Record<string, any>
  const userConfig = (project as any)?.config?.githubExplorer as
    | Partial<GitHubExplorerConfig>
    | undefined;
  const config = mergeConfig(userConfig);

  // Initialize clone manager
  const cloneManager = new CloneManager($, config, directory);

  // Log initialization
  await client.app.log({
    body: {
      service: 'github-explorer',
      level: 'info',
      message: 'GitHub Explorer plugin initialized',
      extra: {
        maxClonedRepos: config.maxClonedRepos,
        cloneDirectory: config.cloneDirectory,
        autoCleanupDays: config.autoCleanupDays,
      },
    },
  });

  // Custom tool: github-explore
  const githubExploreTool = tool({
    description:
      'Clone and explore a public GitHub repository. Use this when the user asks about a GitHub repository or wants to understand code from GitHub.',
    args: {
      repoUrl: tool.schema
        .string()
        .describe(
          "GitHub repository URL or owner/repo format (e.g., 'facebook/react' or 'https://github.com/facebook/react')",
        ),
      question: tool.schema
        .string()
        .optional()
        .describe('Specific question to answer about the repository'),
      thoroughness: tool.schema
        .enum(['quick', 'medium', 'very thorough'])
        .default('medium')
        .describe('How thoroughly to explore the repository'),
    },
    async execute(args, context) {
      try {
        const { repoUrl, question, thoroughness } = args;

        // Parse URL first to get normalized info
        const parsed = parseGitHubUrl(repoUrl);
        if (!parsed) {
          return `Invalid GitHub URL: ${repoUrl}\n\nSupported formats:\n- https://github.com/owner/repo\n- git@github.com:owner/repo.git\n- owner/repo`;
        }

        // Clone or get cached path
        await client.app.log({
          body: {
            service: 'github-explorer',
            level: 'info',
            message: `Cloning repository: ${parsed.key}`,
          },
        });

        const repoPath = await cloneManager.cloneRepo(repoUrl);

        // Build message for the user and context for exploration
        let result = `Successfully cloned ${parsed.key} to ${repoPath}\n\n`;

        if (question) {
          result += `Exploring to answer: ${question}\n\n`;
        } else {
          result += `Repository ready for exploration. Use @github-explorer to analyze this codebase.\n\n`;
        }

        result += `Repository: ${parsed.key}\n`;
        result += `URL: ${parsed.url}\n`;
        result += `Local path: ${repoPath}\n`;
        result += `Exploration level: ${thoroughness}`;

        return result;
      } catch (error) {
        await client.app.log({
          body: {
            service: 'github-explorer',
            level: 'error',
            message: 'Failed to clone repository',
            extra: { error: String(error) },
          },
        });

        return `Failed to explore repository: ${error}`;
      }
    },
  });

  // Return plugin hooks
  return {
    // Register custom tool
    tool: {
      'github-explore': githubExploreTool,
    },

    // Register github-explorer subagent
    agent: {
      'github-explorer': {
        description:
          'Specialized read-only agent for exploring cloned GitHub repositories. Use this to analyze code structure, find patterns, and answer questions about GitHub repositories.',
        mode: 'subagent',
        prompt: `You are a specialized agent for exploring GitHub repositories that have been cloned locally.

Your capabilities:
- Read files to understand code and documentation
- Use glob to find files by pattern (e.g., "**/*.ts" for TypeScript files)
- Use grep to search for specific content across the codebase
- Delegate to the @explore subagent for deep, thorough analysis

Your approach:
1. Start by reading key files (README, package.json, main entry points)
2. Use glob to understand the project structure
3. Use grep to find specific patterns or implementations
4. Provide clear explanations with file references (use file_path:line_number format)
5. For complex searches or when you need thorough exploration, delegate to @explore

Important:
- The repository is already cloned locally at the path provided
- You are read-only - you cannot modify files
- Be thorough but concise in your analysis
- Always cite specific files and line numbers when referencing code
- If the repository is large, focus on the most relevant parts first`,

        tools: {
          read: true,
          glob: true,
          grep: true,
          task: true, // Can delegate to explore subagent
          write: false,
          edit: false,
          bash: false,
          webfetch: false,
          todowrite: false,
        },
      },
    },

    // Periodic cleanup on session idle
    'session.idle': async () => {
      try {
        await cloneManager.cleanupStale(config.autoCleanupDays);
      } catch (error) {
        await client.app.log({
          body: {
            service: 'github-explorer',
            level: 'error',
            message: 'Failed to cleanup stale repos',
            extra: { error: String(error) },
          },
        });
      }
    },

    // Handle slash command: /github-explore
    'tui.command.execute': async (input: any, output: any) => {
      if (input.command === 'github-explore') {
        try {
          // Parse arguments: /github-explore <url> [question...]
          const args = input.args?.trim() || '';
          if (!args) {
            output.message =
              'Usage: /github-explore <repo-url> [question]\\n\\nExamples:\\n  /github-explore facebook/react\\n  /github-explore https://github.com/vercel/next.js How does routing work?';
            return;
          }

          const parts = args.split(' ');
          const repoUrl = parts[0];
          const question = parts.slice(1).join(' ') || undefined;

          // Execute the tool (note: we can't call it directly, so we'll duplicate logic)
          const parsed = parseGitHubUrl(repoUrl);
          if (!parsed) {
            output.message = `Invalid GitHub URL: ${repoUrl}`;
            return;
          }

          const repoPath = await cloneManager.cloneRepo(repoUrl);
          output.message = `Successfully cloned ${parsed.key} to ${repoPath}\\n\\nYou can now use @github-explorer to ask questions about this repository.`;
        } catch (error) {
          output.message = `Error: ${error}`;
        }
      } else if (input.command === 'github-list') {
        // Bonus: list all cloned repos
        try {
          const repos = await cloneManager.listRepos();

          if (repos.length === 0) {
            output.message = 'No repositories cloned yet.';
            return;
          }

          let message = `Cloned repositories (${repos.length}/${config.maxClonedRepos}):\\n\\n`;

          repos.forEach((repo) => {
            const lastAccessed = new Date(repo.lastAccessed).toLocaleString();
            message += `- ${repo.key}\\n`;
            message += `  Path: ${repo.path}\\n`;
            message += `  Last accessed: ${lastAccessed}\\n\\n`;
          });

          output.message = message;
        } catch (error) {
          output.message = `Error listing repos: ${error}`;
        }
      }
    },
  };
};

// Export as default for OpenCode plugin system
export default GitHubExplorerPlugin;
