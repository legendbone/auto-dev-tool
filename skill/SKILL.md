---
name: auto-dev
description: Configure Claude Code automated development system for any project. Use when the user wants to set up AI-driven development workflow, initialize auto-coding agent, scan existing projects, or mentions "auto dev", "adev", "automated development", "Claude Code workflow", "task.json", "progress tracking", or "AI coding agent".
---

# Auto Dev - Automated Development System

Configure Claude Code to work as an autonomous coding agent following the Anthropic "Effective Harnesses for Long-Running Agents" methodology.

## When to Use This Skill

Use this skill when:
- Starting a new project and want AI-driven development
- Taking over an existing project with Claude Code
- The user mentions "auto dev", "adev", "automated development"
- Setting up task tracking and progress management
- Need to configure the 6-step AI workflow

## Quick Reference

The `adev` CLI tool provides two commands:

| Command | Purpose | Use Case |
|---------|---------|----------|
| `adev init` | New projects (0 → 1) | Fresh start, generate all config files |
| `adev scan` | Existing projects (1 → N) | Take over legacy code, AI learns existing structure |

## Generated Files

Both commands create:

- **CLAUDE.md** - AI workflow instructions (6-step mandatory process)
- **task.json** - Task list with steps and completion status
- **progress.txt** - Work log for cross-session context
- **init.sh** - Environment initialization script
- **run-automation.sh** - Unattended automation loop
- **.claude/commands/** - 4 custom slash commands

## The 6-Step AI Workflow

CLAUDE.md enforces this workflow on every session:

1. **Initialize** - Run `./init.sh`, start dev server
2. **Select Task** - Read `task.json`, pick next incomplete task
3. **Implement** - Follow task steps, match existing code style
4. **Test** - lint + build + browser tests (Playwright MCP)
5. **Log Progress** - Write to `progress.txt`
6. **Commit** - All changes in single commit (code + task.json + progress.txt)

## Custom Commands

After setup, these slash commands are available in Claude Code:

- `/project:next` - Execute next task following workflow
- `/project:status` - Show progress summary
- `/project:add-task` - Add new task via natural language
- `/project:scan-project` - Deep project analysis

## Usage Patterns

### Pattern 1: New Project

```bash
mkdir my-project && cd my-project
adev init
# Answer prompts or use -y for defaults
claude
# Then use /project:next to start
```

### Pattern 2: Existing Project

```bash
cd existing-project
adev scan
# AI analyzes codebase, generates architecture.md
claude
# Use /project:scan-project for deep analysis first
```

### Pattern 3: Quick Setup (No Prompts)

```bash
adev init ./my-project -y
adev scan ./legacy-app -y
```

## Key Differences: init vs scan

| Aspect | `adev init` | `adev scan` |
|--------|-------------|-------------|
| Target | Empty/new directory | Existing codebase |
| architecture.md | Empty template | Auto-generated from code analysis |
| CLAUDE.md | Standard workflow | + ONBOARDING section for legacy code |
| First task | "Project setup" | "Understand existing codebase" |
| Tech stack | User selects | Auto-detected from files |

## Installation

If `adev` is not available:

```bash
git clone https://github.com/legendbone/auto-dev-tool.git
cd auto-dev-tool
npm link
```

## Tech Stack Detection (scan mode)

Automatically detects: Next.js, Nuxt, React, Vue, Svelte, Express, Fastify, Koa, TypeScript, Tailwind, Prisma, Drizzle, Supabase, MongoDB, Jest, Vitest, Playwright, Python (Django/Flask/FastAPI), Go (Gin/Fiber), Rust, Java, Ruby on Rails, Docker.

## Best Practices

1. **Task granularity** - Break projects into 20-40 specific tasks
2. **Test everything** - UI changes must use Playwright browser tests
3. **One commit per task** - Always include task.json + progress.txt updates
4. **Block properly** - When stuck, log to progress.txt and stop (don't fake completion)
5. **For legacy code** - Read architecture.md first, match existing patterns

## Troubleshooting

| Issue | Solution |
|-------|----------|
| adev not found | Run `npm link` in the adev directory |
| Scan misses package.json | Checks subdirectories one level deep |
| Want to override existing files | Delete them first, then re-run adev |
| Token cost too high | Use `claude` (manual) instead of `run-automation.sh` |

## Reference

- Anthropic paper: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- Original demo: https://github.com/SamuelQZQ/auto-coding-agent-demo
- Video: B站/小红书 "数字游牧人"
