# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**adev** is a CLI tool that configures AI-driven automated development workflows for Claude Code, based on Anthropic's "Effective Harnesses for Long-Running Agents" paper. It generates structured files (CLAUDE.md, task.json, progress.txt, init.sh, etc.) in target projects to enable task-based autonomous development.

Two CLI variants:
- `adev` — cross-session automation for Claude Code (6-step workflow)
- `qoder-dev` — interactive, user-driven workflow for QoderWork (4-step workflow)

## Development Setup

```bash
npm link          # Install CLI commands globally
adev --help       # Verify adev works
qoder-dev --help  # Verify qoder-dev works
```

No external dependencies — uses only built-in Node.js APIs. Requires Node.js >= 22.

Tests use Node.js built-in test runner (`node:test` + `node:assert`). Run with `npm test`.

## Architecture

**ES modules throughout** (`"type": "module"` in package.json). All source files use `.mjs` extension.

### Entry Points

- `bin/adev.mjs` — Main CLI. Parses `init`/`scan`/`help` commands, handles `-y/--yes` flag, routes to `runInit()` or `runScan()`.
- `bin/qoder-dev.mjs` — QoderWork CLI. Commands: `init`, `status`, `next`.

### Core Modules (src/)

| Module | Role |
|--------|------|
| `generate.mjs` | Template engine — generates all target project files (CLAUDE.md, task.json, architecture.md, init.sh, custom commands). Central to the tool. |
| `init.mjs` | New project mode — interactive tech stack selection, delegates to generate.mjs |
| `scan.mjs` | Existing project mode — auto-detects tech stack by scanning config files (package.json, requirements.txt, go.mod, etc.), generates architecture.md with project analysis |
| `prompts.mjs` | Interactive CLI utilities (ask, choose, confirm, banner, colored output) using readline |
| `qoder/init.mjs` | QoderWork init — creates task.json + progress.txt |
| `qoder/next.mjs` | Execute next task interactively |
| `qoder/status.mjs` | Display project status |

### Key Design Decisions

- **No dependencies**: The tool uses only Node.js built-in APIs (fs, path, readline) to minimize installation friction.
- **Template-driven**: `generate.mjs` contains all file templates as template literals. Changes to generated output happen here.
- **Two distinct workflows**: `adev` generates files for unattended cross-session automation (6-step loop with run-automation.sh). `qoder-dev` is for interactive within-session use (4-step user-confirmed flow).
- **Smart detection in scan mode**: `scan.mjs` identifies tech stacks by checking for framework-specific files and package names, not just file extensions.
- **Generated files are for target projects**: This repo does not use the files it generates (CLAUDE.md, task.json, etc.) — it creates them in whatever project directory the user runs the tool from.

### Testing

```bash
npm test          # Run all tests with node:test
```
