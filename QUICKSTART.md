# Quick Start Guide

## Installation

1. **Clone this repository:**
   ```bash
   cd ~/.config/opencode/plugins
   git clone <this-repo-url> github-explorer
   cd github-explorer
   bun install
   ```

2. **Add to your OpenCode config** (`~/.config/opencode/opencode.json`):
   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "plugin": ["github-explorer"]
   }
   ```

3. **Restart OpenCode**

## Basic Usage

### 1. Using Slash Commands

```bash
# Explore a repository
/github-explore facebook/react

# List cloned repositories  
/github-list
```

### 2. Ask OpenCode Directly

```
User: What testing framework does express.js use?

OpenCode: [Automatically uses github-explore tool]
          [Clones and analyzes expressjs/express]
```

### 3. Use the Subagent

After cloning a repo, you can directly use the github-explorer subagent:

```
User: @github-explorer How are React hooks implemented?

Subagent: [Analyzes packages/react/src/ReactHooks.js...]
```

## Configuration Options

Create `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["github-explorer"],
  "githubExplorer": {
    "maxClonedRepos": 10,
    "cloneDirectory": "~/.cache/opencode/github-repos",
    "autoCleanupDays": 14,
    "cloneDepth": 1
  }
}
```

## Examples

### Example 1: Explore React

```
/github-explore facebook/react
@github-explorer What's in the packages directory?
```

### Example 2: Compare Frameworks

```
/github-explore expressjs/express
/github-explore fastify/fastify
@github-explorer Compare the middleware architecture
```

### Example 3: Find Implementation Details

```
User: How does Next.js handle server components?

OpenCode: [Explores vercel/next.js automatically]
```

## Troubleshooting

**Plugin not loading?**
- Check OpenCode logs: `opencode logs`
- Verify plugin path in config
- Run `bun install` in plugin directory

**Clone failing?**
- Check `git --version` is installed
- Verify repository URL is public
- Check internet connection

**Out of disk space?**
- Reduce `maxClonedRepos` in config
- Clean cache: `rm -rf ~/.cache/opencode/github-repos`

## Development

Run tests:
```bash
bun test
```

Check types:
```bash
bunx tsc --noEmit
```
