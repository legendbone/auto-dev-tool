# adev - Auto Dev

一键配置 Claude Code 全自动开发系统。

基于 Anthropic《Effective Harnesses for Long-Running Agents》论文方法论，将「任务分解 → 进度追踪 → 测试验证 → Git 提交」的完整开发工作流注入到任意项目中，让 Claude Code 按照规范自主完成开发任务。

## 安装

需要 Node.js >= 22。

```bash
cd adev
npm link
```

安装后在终端中输入 `adev` 即可使用。

## 两种模式

### `adev init` — 新项目（从 0 到 1）

为一个全新的项目配置自动开发系统。交互式选择技术栈后，自动生成全套配置文件。

```bash
mkdir my-project && cd my-project
adev init
```

支持的预设技术栈包括 Next.js、Vue 3 + Vite、React + Vite、Express.js、Python FastAPI，也可以自定义。

### `adev scan` — 老项目接管（从 1 到 N）

扫描一个已有项目，自动检测技术栈、目录结构、npm scripts、配置文件等，生成架构文档，让 Claude 快速理解项目现状并接手后续开发。

```bash
cd my-existing-project
adev scan
```

扫描引擎支持识别的技术栈：Next.js、Nuxt、React、Vue、Svelte、Express、Fastify、Koa、TypeScript、Tailwind CSS、Prisma、Drizzle、Supabase、MongoDB、Jest、Vitest、Playwright、Python (Django / Flask / FastAPI)、Go (Gin / Fiber)、Rust、Java、Ruby on Rails、Docker 等。

两种模式都支持 `-y` 参数跳过交互提示，使用默认配置：

```bash
adev init ./my-project -y
adev scan ./legacy-app -y
```

## 生成的文件

运行后会在项目根目录生成以下文件：

| 文件 | 作用 |
|------|------|
| `CLAUDE.md` | AI 工作流程指令，定义了 6 步强制工作流 |
| `task.json` | 任务清单，JSON 格式，每个任务有 id、steps、passes 状态 |
| `progress.txt` | 工作进度日志，跨会话传递上下文的桥梁 |
| `init.sh` | 环境初始化脚本，每次新会话开始时运行 |
| `run-automation.sh` | 自动化循环脚本，让 Claude Code 无人值守运行多个任务 |
| `architecture.md` | 项目架构文档（scan 模式自动生成，init 模式为空模板） |
| `.claude/commands/` | 4 个 Claude Code 自定义命令 |

scan 模式会智能跳过已存在的文件，不会覆盖你的现有配置。

## Claude Code 自定义命令

生成的 `.claude/commands/` 目录包含 4 个快捷命令，在 Claude Code 中直接输入即可调用：

| 命令 | 作用 |
|------|------|
| `/project:next` | 按照 CLAUDE.md 工作流执行下一个任务 |
| `/project:status` | 汇报当前项目进度（已完成/未完成任务数、最近记录） |
| `/project:add-task` | 用自然语言描述需求，AI 自动拆解为 task.json 中的新任务 |
| `/project:scan-project` | 让 AI 深度分析项目代码并记录到 progress.txt |

## AI 的 6 步工作流

CLAUDE.md 中定义的核心工作流，Claude Code 每次启动后强制遵循：

1. **初始化环境** — 运行 `./init.sh`，安装依赖并启动开发服务器
2. **选择任务** — 读取 `task.json`，按优先级选择一个未完成任务
3. **实现任务** — 按照任务 steps 逐步实现功能
4. **测试验证** — lint + build + 浏览器测试（Playwright MCP）
5. **更新进度** — 将工作内容记录到 `progress.txt`
6. **提交更改** — 代码 + task.json + progress.txt 在同一个 commit 中提交

## 新项目 vs 老项目的区别

init 模式生成的 CLAUDE.md 专注于从零构建，而 scan 模式额外包含一个 **ONBOARDING 板块**，强制要求 Claude：

- 先阅读 architecture.md 理解项目全貌
- 浏览核心源码文件，理解现有代码风格
- 运行现有测试，建立基线
- 不随意重构，保持与现有代码一致
- 修改前后都运行测试，确保不引入回归

## 三种运行方式

配置完成后有三种方式启动 Claude Code：

```bash
# 方式一：手动确认（最稳妥）
claude

# 方式二：跳过权限确认（实验中最常用）
claude -p --dangerously-skip-permissions

# 方式三：全自动循环（最危险，无人值守）
./run-automation.sh 10    # 循环运行 10 次
```

## 典型工作流示例

**新项目：**

```bash
mkdir my-blog && cd my-blog
adev init                              # 选择 Next.js 技术栈
# 编辑 task.json 添加任务，或启动 Claude 让它帮你生成
claude                                 # 启动 Claude Code
> /project:next                        # 让 AI 开始第一个任务
```

**老项目：**

```bash
cd ~/work/legacy-app
adev scan                              # 扫描项目，生成架构文档
claude                                 # 启动 Claude Code
> /project:scan-project                # 让 AI 深度分析代码
> /project:add-task                    # 描述你想做的改动
> /project:next                        # 开始执行
```

## 项目结构

```
adev/
├── package.json
├── bin/
│   └── adev.mjs              # CLI 入口
├── src/
│   ├── prompts.mjs            # 交互提示工具
│   ├── generate.mjs           # CLAUDE.md 动态生成引擎 + 模板
│   ├── init.mjs               # 新项目初始化
│   └── scan.mjs               # 老项目扫描与接管
└── templates/
    └── run-automation.sh      # 自动化循环脚本模板
```

## 理论背景

本工具的方法论来源于：

- **Anthropic 论文**：[Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) — 提出了初始化 Agent + 编码 Agent 的两阶段架构
- **开源实践**：[SamuelQZQ/auto-coding-agent-demo](https://github.com/SamuelQZQ/auto-coding-agent-demo) — 用 GLM-5 + Claude Code 完成 31 个任务、10 小时全自动开发的实验
- **视频讲解**：B站/小红书「数字游牧人」

## License

MIT
