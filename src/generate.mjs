// generate.mjs - 文件生成引擎
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMPL_DIR = path.join(__dirname, '..', 'templates');

export function readTemplate(name) {
  return fs.readFileSync(path.join(TMPL_DIR, name), 'utf-8');
}

export function writeFile(targetDir, relativePath, content) {
  const fullPath = path.join(targetDir, relativePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
  // Make .sh files executable
  if (relativePath.endsWith('.sh')) {
    fs.chmodSync(fullPath, '755');
  }
  return fullPath;
}

export function fileExists(targetDir, relativePath) {
  return fs.existsSync(path.join(targetDir, relativePath));
}

// ============================================================
// CLAUDE.md 动态生成
// ============================================================

export function generateClaudeMd(config) {
  const {
    mode,           // 'new' | 'existing'
    projectName,
    description,
    techStack,
    devServer,
    scripts,        // { dev, build, lint, test }
    projectDir,     // 项目子目录（新项目）或 '.' （已有项目）
    extraRules,
  } = config;

  const isExisting = mode === 'existing';
  const serverUrl = devServer || 'http://localhost:3000';

  let md = `# ${projectName} - AI 自动开发指令

> 本文件由 adev 自动生成，定义了 Claude Code 的工作规范。
> 模式: ${isExisting ? '已有项目接管' : '从零开始开发'}

## 项目概述

${description || '请在此补充项目描述。'}

**技术栈:** ${techStack || '待确认'}
`;

  // ---- 已有项目: 额外的入职指引 ----
  if (isExisting) {
    md += `
---

## ONBOARDING: 接管已有项目

**在做任何修改之前，你必须先理解这个项目。**

1. **阅读 architecture.md** — 包含项目的技术栈、目录结构和核心模块分析
2. **阅读 progress.txt** — 包含已完成的工作和待解决的问题
3. **浏览关键文件** — 先读 README.md，再看核心入口文件和配置文件
4. **运行现有测试** — 确保你接手时项目的测试是通过的
5. **理解代码规范** — 遵循项目已有的命名约定、文件组织和代码风格

### 关键原则

- **先理解，再动手** — 不要在不理解上下文的情况下修改代码
- **保持一致性** — 新代码必须与现有代码风格完全一致
- **不要随意重构** — 除非任务明确要求重构，否则保持现有结构
- **不要破坏现有功能** — 修改前后都要运行测试
- **小步提交** — 每个 commit 只做一件事
`;
  }

  // ---- 核心工作流 ----
  md += `
---

## MANDATORY: Agent 工作流

每个新的 Agent 会话必须严格遵循以下 6 步工作流程：

### Step 1: 初始化环境

\`\`\`bash
./init.sh
\`\`\`

确保开发服务器已启动（${serverUrl}）后再继续。**不要跳过此步骤。**
`;

  if (isExisting) {
    md += `
> **已有项目特别注意：** 如果是你第一次接触此项目，先阅读 architecture.md 了解全貌。
`;
  }

  md += `
### Step 2: 选择下一个任务

读取 \`task.json\` 并选择一个任务。

选择标准（按优先级）：
1. 选择 \`passes: false\` 的任务
2. 考虑依赖关系 — 基础功能优先
3. 选择 id 最小的未完成任务

### Step 3: 实现任务

- 仔细阅读任务描述和每个 step
- 按步骤逐一实现功能
- 遵循现有代码模式和规范
${isExisting ? '- **参照已有代码风格**，不要引入新的模式或范式\n- **不要修改与当前任务无关的文件**' : ''}

### Step 4: 测试验证

**强制测试要求：**

**大幅度页面修改**（新建页面、重写组件、修改核心交互）：
- **必须在浏览器中测试！** 使用 MCP Playwright 工具
- 验证页面能正确加载和渲染
- 验证表单提交、按钮点击等交互功能
- 截图确认 UI 正确显示

**小幅度代码修改**（修复 bug、调整样式）：
- 可以使用 lint/build 验证
- 有疑虑时仍建议浏览器测试

**所有修改必须通过：**
`;

  // 动态生成测试命令
  const s = scripts || {};
  if (s.lint)  md += `- \`${s.lint}\` 无错误\n`;
  else         md += `- \`npm run lint\` 无错误（如果项目配置了 lint）\n`;
  if (s.build) md += `- \`${s.build}\` 构建成功\n`;
  else         md += `- \`npm run build\` 构建成功\n`;
  if (s.test)  md += `- \`${s.test}\` 测试通过\n`;
  md += `- 功能在浏览器中正常工作（UI 相关修改）\n`;

  if (isExisting) {
    md += `
**已有项目额外要求：**
- 修改前运行一次完整测试，记录基线状态
- 修改后再运行一次，确保没有引入回归
`;
  }

  md += `
### Step 5: 更新进度

将工作记录写入 \`progress.txt\`：

\`\`\`
## [日期] - Task #[id]: [任务标题]

### 完成的工作:
- [具体更改了什么]

### 测试结果:
- [如何测试的，结果如何]

### 备注:
- [给后续 Agent 的注意事项]
\`\`\`

### Step 6: 提交更改

**重要：所有更改必须在同一个 commit 中提交！**

1. 更新 \`task.json\`，将任务的 \`passes\` 从 \`false\` 改为 \`true\`
2. 更新 \`progress.txt\` 记录工作内容
3. 一次性提交所有更改：

\`\`\`bash
git add -A
git commit -m "Task #[id]: [任务标题] - completed"
\`\`\`

---

## task.json 规则

- 只能将 \`passes\` 从 \`false\` 改为 \`true\`
- **永远不要**删除或修改任务描述
- **永远不要**从列表中移除任务
- 一个 task 的所有内容必须在同一个 commit 中提交

---

## 阻塞处理

如果任务无法完成（缺少 API Key、需要人工配置等），**严格禁止**：
- 提交 git commit
- 将 task.json 的 passes 设为 true
- 假装任务已完成

**必须**：
- 在 progress.txt 中记录当前进度和阻塞原因
- 输出清晰的阻塞信息，说明需要人工做什么
- 停止任务，等待人工介入

---

## 关键规则速查

1. **每次会话一个任务** — 专注完成一个任务后停止
2. **测试后才能标记完成** — 所有验证步骤必须通过
3. **UI 修改必须浏览器测试** — 使用 Playwright MCP
4. **记录到 progress.txt** — 帮助后续 Agent 理解你的工作
5. **一个 commit 包含所有更改** — 代码 + progress.txt + task.json
6. **永远不删除任务** — 只将 passes 从 false 改为 true
7. **阻塞时停止** — 不提交，不假装完成，输出阻塞信息
${isExisting ? '8. **保持代码风格一致** — 遵循现有代码的约定\n9. **不随意重构** — 除非任务明确要求' : ''}
`;

  if (extraRules) {
    md += `\n---\n\n## 项目特定规则\n\n${extraRules}\n`;
  }

  return md;
}

// ============================================================
// architecture.md 生成（扫描模式用）
// ============================================================

export function generateArchitectureMd(scanResult) {
  const { projectName, techStack, tree, configFiles, scripts, readme, stats, keyFiles } = scanResult;

  let md = `# ${projectName} - 项目架构文档

> 本文件由 \`adev scan\` 自动生成，帮助 AI Agent 快速理解项目现状。
> 生成时间: ${new Date().toISOString().split('T')[0]}

## 技术栈

${techStack.map(t => `- ${t}`).join('\n')}

## 项目统计

| 指标 | 值 |
|------|-----|
${Object.entries(stats).map(([k, v]) => `| ${k} | ${v} |`).join('\n')}

## 目录结构

\`\`\`
${tree}
\`\`\`

## 检测到的配置文件

${configFiles.length > 0 ? configFiles.map(f => `- \`${f}\``).join('\n') : '无'}

## 可用脚本

${scripts ? Object.entries(scripts).map(([k, v]) => `- \`${k}\`: ${v}`).join('\n') : '无 package.json 或无 scripts'}
`;

  if (keyFiles && keyFiles.length > 0) {
    md += `\n## 关键入口文件\n\n${keyFiles.map(f => `- \`${f}\``).join('\n')}\n`;
  }

  if (readme) {
    md += `\n## 项目 README 摘要\n\n${readme.substring(0, 2000)}${readme.length > 2000 ? '\n\n...(已截断)' : ''}\n`;
  }

  md += `
---

## 给 AI Agent 的提示

请在开始工作前仔细阅读以上信息。如果有不明确的地方，请先浏览对应的源码文件再动手。
特别注意项目已有的代码组织方式和命名约定，新代码必须保持一致。
`;

  return md;
}

// ============================================================
// task.json 生成
// ============================================================

export function generateTaskJson(mode, tasks = []) {
  if (tasks.length > 0) return JSON.stringify({ tasks }, null, 2);

  if (mode === 'new') {
    return JSON.stringify({
      tasks: [
        {
          id: 1,
          title: "项目基础搭建",
          description: "初始化项目结构、安装依赖、创建基础配置",
          steps: [
            "创建项目目录结构",
            "安装核心依赖",
            "创建基础配置文件",
            "验证项目能正常启动"
          ],
          passes: false
        }
      ]
    }, null, 2);
  }

  // existing mode - 空模板
  return JSON.stringify({
    tasks: [
      {
        id: 1,
        title: "项目现状梳理",
        description: "阅读代码，理解项目架构，在 progress.txt 中记录发现",
        steps: [
          "阅读 architecture.md 了解项目概况",
          "浏览核心源码文件，理解代码结构",
          "运行现有测试，记录基线状态",
          "在 progress.txt 中记录项目理解"
        ],
        passes: false
      }
    ]
  }, null, 2);
}

// ============================================================
// init.sh 生成
// ============================================================

export function generateInitSh(config) {
  const { mode, projectDir, scripts, devServer } = config;
  const dir = projectDir || '.';
  const devCmd = scripts?.dev || 'npm run dev';

  return `#!/bin/bash
# =============================================================================
# init.sh - 环境初始化脚本
# 每个新的 Agent 会话开始时运行此脚本
# =============================================================================
set -e

GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
RED='\\033[0;31m'
NC='\\033[0m'

echo -e "\${YELLOW}正在初始化项目环境...\${NC}"

# ---- 安装依赖 ----
${dir !== '.' ? `cd ${dir}` : ''}
if [ -f "package.json" ]; then
  echo "安装 npm 依赖..."
  npm install
elif [ -f "requirements.txt" ]; then
  echo "安装 Python 依赖..."
  pip install -r requirements.txt
elif [ -f "pyproject.toml" ]; then
  echo "安装 Python 依赖..."
  pip install -e .
elif [ -f "go.mod" ]; then
  echo "下载 Go 依赖..."
  go mod download
fi
${dir !== '.' ? 'cd ..' : ''}

# ---- 启动开发服务器 ----
echo "启动开发服务器..."
${dir !== '.' ? `cd ${dir} && ` : ''}${devCmd} &
SERVER_PID=$!
${dir !== '.' ? 'cd ..' : ''}

# ---- 等待服务器就绪 ----
echo "等待服务器启动..."
for i in {1..30}; do
  if curl -s ${devServer || 'http://localhost:3000'} > /dev/null 2>&1; then
    echo -e "\${GREEN}✓ 开发服务器已就绪: ${devServer || 'http://localhost:3000'}\${NC}"
    break
  fi
  sleep 1
done

echo -e "\${GREEN}✓ 初始化完成 (Server PID: $SERVER_PID)\${NC}"
`;
}

// ============================================================
// Claude Code 自定义命令生成
// ============================================================

export function generateCommands() {
  return {
    'next.md': `请按照 CLAUDE.md 中定义的工作流执行下一个任务：

1. 先运行 ./init.sh 初始化环境（如果尚未运行）
2. 读取 task.json，选择下一个 passes: false 的任务
3. 按照任务的 steps 逐步实现
4. 测试验证（lint + build + 浏览器测试）
5. 更新 progress.txt
6. 提交所有更改（代码 + task.json + progress.txt 在同一个 commit）

开始吧。
`,
    'status.md': `请汇报当前项目的开发状态：

1. 读取 task.json，统计已完成和未完成的任务
2. 读取 progress.txt，了解最近的工作记录
3. 检查 git log，查看最近的提交

以表格形式展示：
- 总任务数 / 已完成 / 未完成
- 最近一次完成的任务
- 下一个待完成的任务
- 最近一条 progress 记录摘要
`,
    'add-task.md': `请根据我接下来描述的需求，在 task.json 中添加新任务：

规则：
1. 新任务的 id 必须是当前最大 id + 1
2. 将需求拆解为 3-8 个具体的 steps
3. passes 设为 false
4. 不要修改或删除任何已有任务
5. 添加后显示新任务的完整 JSON

请告诉我你想添加什么任务？
`,
    'scan-project.md': `请深入分析当前项目的代码库：

1. 阅读 architecture.md（如果存在）
2. 浏览项目目录结构，理解文件组织
3. 阅读核心入口文件（如 index.ts, app.ts, main.py 等）
4. 检查配置文件（tsconfig, eslint, docker 等）
5. 运行现有测试，记录结果
6. 检查 package.json / requirements.txt 等依赖文件

将你的发现详细记录到 progress.txt 中，格式如下：

## [日期] - 项目扫描报告

### 项目概述:
- [项目类型和用途]

### 技术架构:
- [前端/后端/数据库]

### 代码质量:
- [测试覆盖/代码规范/潜在问题]

### 待改进:
- [发现的问题或优化空间]
`
  };
}
