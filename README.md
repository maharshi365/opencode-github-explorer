# OpenCode GitHub Explorer Plugin

An OpenCode plugin that enables exploring public GitHub repositories by cloning them to a local cache and using a specialized read-only subagent for analysis.

## Features

- **Automatic Repository Cloning**: Clone GitHub repos on-demand with intelligent caching
- **Custom Tool**: `github-explore` tool that AI can automatically use
- **Slash Command**: `/github-explore` for manual invocation
- **Specialized Subagent**: Read-only `github-explorer` agent optimized for code exploration
- **LRU Caching**: Automatically manages disk space with least-recently-used eviction
- **Shallow Clones**: Fast cloning with configurable depth (default: 1)
- **Auto Cleanup**: Remove stale repositories after configurable inactivity period

## Installation

### As an NPM Package (Recommended)

```bash
npm install opencode-github-explorer
```

Then add to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-github-explorer"]
}
```

### From Local Files

Clone this repository and place it in your OpenCode plugins directory:

```bash
git clone https://github.com/yourusername/opencode-github-explorer
cd opencode-github-explorer
bun install
```

Then add to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["./path/to/opencode-github-explorer/src/index.ts"]
}
```

## Configuration

Add configuration to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-github-explorer"],
  "githubExplorer": {
    "maxClonedRepos": 5,
    "cloneDirectory": "~/.cache/opencode/github-repos",
    "autoCleanupDays": 7,
    "cloneDepth": 1,
    "excludePatterns": ["node_modules", ".git", "dist", "build"]
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxClonedRepos` | number | `5` | Maximum number of repositories to keep cloned |
| `cloneDirectory` | string | `~/.cache/opencode/github-repos` | Base directory for cloning repos |
| `autoCleanupDays` | number | `7` | Remove repos not accessed for N days |
| `cloneDepth` | number | `1` | Git clone depth (1 = shallow clone) |
| `excludePatterns` | string[] | `["node_modules", ".git", "dist", "build", ".next"]` | Patterns to exclude when exploring |

## Usage

### 1. Automatic Tool Use (AI-Driven)

The AI will automatically use the `github-explore` tool when you ask about GitHub repositories:

```
User: What testing framework does the express.js repo use?

AI: [Uses github-explore tool]
    [Clones expressjs/express]
    [Invokes github-explorer subagent]
    
Subagent: Express uses Mocha as its testing framework...
```

### 2. Slash Command (Manual)

Use the `/github-explore` command to manually clone and explore:

```bash
# Explore a repository
/github-explore facebook/react

# Ask a specific question
/github-explore vercel/next.js How does the routing system work?
```

### 3. Direct Subagent Invocation

After a repository is cloned, you can directly ask the github-explorer subagent:

```
User: @github-explorer How are hooks implemented in React?

Subagent: [Explores packages/react/src/ReactHooks.js...]
```

### 4. List Cloned Repositories

See what repositories are currently cloned:

```bash
/github-list
```

## Supported URL Formats

The plugin accepts various GitHub URL formats:

```
https://github.com/owner/repo
https://github.com/owner/repo.git
git@github.com:owner/repo.git
owner/repo
```

## How It Works

1. **URL Parsing**: Normalizes various GitHub URL formats to `owner/repo`
2. **Caching**: Checks if repository is already cloned locally
3. **Clone**: If not cached, performs shallow clone (depth 1 by default)
4. **Metadata**: Tracks clone time, last accessed, and path
5. **LRU Eviction**: When max repos reached, removes least recently used
6. **Exploration**: Invokes specialized read-only subagent for analysis

## Architecture

```
src/
├── index.ts              # Main plugin with hooks and tool registration
├── clone-manager.ts      # Git operations and lifecycle management
├── metadata-manager.ts   # JSON-based metadata persistence
├── url-parser.ts         # GitHub URL parsing and validation
└── config.ts             # Configuration types and defaults
```

## GitHub Explorer Subagent

The plugin registers a specialized `github-explorer` subagent with:

- **Mode**: `subagent` (can be invoked by AI or manually)
- **Permissions**: Read-only (no write, edit, or bash)
- **Tools**: `read`, `glob`, `grep`, `task` (can delegate to @explore)
- **Focus**: Fast, accurate code exploration and analysis

### Subagent Capabilities

- Read files to understand code structure
- Use glob to find files by pattern (e.g., `**/*.ts`)
- Use grep to search for specific content
- Delegate deep analysis to @explore subagent
- Provide references with `file_path:line_number` format

## Development

### Setup

```bash
bun install
```

### Run Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/url-parser.test.ts

# Watch mode
bun test --watch
```

### Test Files

- `tests/url-parser.test.ts`: URL parsing and validation tests
- `tests/clone-manager.test.ts`: Clone operations and LRU tests

## Limitations

- **Public repositories only**: No authentication support (by design)
- **Shallow clones**: Full history not available (configurable via `cloneDepth`)
- **Disk space**: Managed via `maxClonedRepos` and `autoCleanupDays`
- **Windows case-sensitivity**: Some repos may have case-collision warnings

## Troubleshooting

### Repository not cloning

- Check internet connection
- Verify Git is installed: `git --version`
- Check repository URL is valid and public

### Out of disk space

- Reduce `maxClonedRepos` in config
- Manually clean cache: `rm -rf ~/.cache/opencode/github-repos`
- Reduce `autoCleanupDays` for more aggressive cleanup

### Metadata issues

Global metadata is stored in:
- `~/.config/opencode/github-explorer-metadata.json`

Project metadata (if applicable):
- `.opencode/github-explorer-metadata.json`

You can safely delete these files to reset.

## Examples

### Example 1: Explore React's hook implementation

```
User: /github-explore facebook/react

User: @github-explorer How are hooks implemented?

Subagent: React hooks are implemented in packages/react/src/ReactHooks.js:123
          The main hook dispatcher uses...
```

### Example 2: Find testing patterns

```
User: What testing approach does Next.js use?

AI: [Automatically explores vercel/next.js]
    Next.js uses Jest with custom test utilities found in test/lib/...
```

### Example 3: Compare architectures

```
User: /github-explore expressjs/express
User: /github-explore fastify/fastify

User: @github-explorer Compare the middleware architecture between Express and Fastify

Subagent: [Analyzes both repositories and provides comparison]
```

## License

MIT

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## Support

- [Report Issues](https://github.com/yourusername/opencode-github-explorer/issues)
- [OpenCode Documentation](https://opencode.ai/docs/)
- [OpenCode Discord](https://opencode.ai/discord)
