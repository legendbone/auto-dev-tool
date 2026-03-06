// init.mjs - 从零开始，为新项目配置自动开发系统
import fs from 'node:fs';
import path from 'node:path';
import { banner, step, success, info, warn, ask, choose, confirm } from './prompts.mjs';
import {
  writeFile, fileExists, readTemplate,
  generateClaudeMd, generateTaskJson, generateInitSh, generateCommands
} from './generate.mjs';

// ============================================================
// 预定义技术栈
// ============================================================
const TECH_STACKS = {
  'Next.js + TypeScript + Tailwind': {
    label: 'Next.js 全栈 (TypeScript + Tailwind CSS)',
    stack: 'Next.js, TypeScript, Tailwind CSS, React',
    devServer: 'http://localhost:3000',
    scripts: { dev: 'npm run dev', build: 'npm run build', lint: 'npm run lint', test: null },
  },
  'Vue3 + Vite + TypeScript': {
    label: 'Vue 3 + Vite (TypeScript)',
    stack: 'Vue 3, Vite, TypeScript, Tailwind CSS',
    devServer: 'http://localhost:5173',
    scripts: { dev: 'npm run dev', build: 'npm run build', lint: 'npm run lint', test: null },
  },
  'React + Vite': {
    label: 'React + Vite',
    stack: 'React, Vite, TypeScript',
    devServer: 'http://localhost:5173',
    scripts: { dev: 'npm run dev', build: 'npm run build', lint: 'npm run lint', test: null },
  },
  'Express + Node.js': {
    label: 'Express.js 后端 (TypeScript)',
    stack: 'Express.js, TypeScript, Node.js',
    devServer: 'http://localhost:3000',
    scripts: { dev: 'npm run dev', build: 'npm run build', lint: 'npm run lint', test: 'npm test' },
  },
  'Python + FastAPI': {
    label: 'Python FastAPI',
    stack: 'Python, FastAPI, SQLAlchemy',
    devServer: 'http://localhost:8000',
    scripts: { dev: 'uvicorn main:app --reload', build: null, lint: 'ruff check .', test: 'pytest' },
  },
  '自定义': {
    label: '自定义技术栈',
    stack: '',
    devServer: 'http://localhost:3000',
    scripts: { dev: 'npm run dev', build: 'npm run build', lint: null, test: null },
  },
};

// ============================================================
// 主入口
// ============================================================
export async function runInit(targetDir, opts = {}) {
  const dir = path.resolve(targetDir);
  banner('adev init - 新项目自动开发系统配置');

  // 创建目录
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    info(`创建目录: ${dir}`);
  }

  // ---- Step 1: 收集项目信息 ----
  step(1, '项目信息');

  let projectName, description, techKey, techStack, devServer, scripts;

  if (opts.skipPrompts) {
    projectName = path.basename(dir);
    description = '';
    techKey = 'Next.js + TypeScript + Tailwind';
    techStack = TECH_STACKS[techKey].stack;
    devServer = TECH_STACKS[techKey].devServer;
    scripts = TECH_STACKS[techKey].scripts;
  } else {
    projectName = await ask('项目名称', path.basename(dir));
    description = await ask('项目描述（一句话说明项目是什么）', '');

    techKey = await choose('选择技术栈:', Object.values(TECH_STACKS).map(t => t.label));
    const matched = Object.entries(TECH_STACKS).find(([_, v]) => v.label === techKey);
    const preset = matched ? matched[1] : TECH_STACKS['自定义'];

    if (preset.stack) {
      techStack = preset.stack;
      devServer = preset.devServer;
      scripts = preset.scripts;
    } else {
      techStack = await ask('技术栈（如: React, Express, PostgreSQL）', '');
      devServer = await ask('开发服务器地址', 'http://localhost:3000');
      const devCmd = await ask('启动开发服务器的命令', 'npm run dev');
      scripts = { dev: devCmd, build: 'npm run build', lint: 'npm run lint', test: null };
    }

    devServer = await ask('确认开发服务器地址', devServer);
  }

  // ---- Step 2: 生成文件 ----
  step(2, '生成配置文件...');

  // CLAUDE.md
  const claudeMd = generateClaudeMd({
    mode: 'new', projectName, description,
    techStack, devServer, scripts,
    projectDir: '.',
  });
  writeFile(dir, 'CLAUDE.md', claudeMd);
  success('CLAUDE.md — AI 工作流程指令');

  // task.json
  writeFile(dir, 'task.json', generateTaskJson('new'));
  success('task.json — 任务清单');

  // progress.txt
  const initProgress = `# ${projectName} - 工作进度日志\n\n> 技术栈: ${techStack}\n> 创建时间: ${new Date().toISOString().split('T')[0]}\n\n---\n`;
  writeFile(dir, 'progress.txt', initProgress);
  success('progress.txt — 工作进度日志');

  // init.sh
  writeFile(dir, 'init.sh', generateInitSh({
    mode: 'new', projectDir: '.', scripts, devServer,
  }));
  success('init.sh — 环境初始化脚本');

  // run-automation.sh
  writeFile(dir, 'run-automation.sh', readTemplate('run-automation.sh'));
  success('run-automation.sh — 自动化循环脚本');

  // architecture.md (空模板)
  const archMd = `# ${projectName} - 项目架构设计\n\n> 请在此描述你的项目架构，或让 Claude Code 根据你的需求自动生成。\n\n## 项目概述\n\n${description || '待补充'}\n\n## 技术栈\n\n${techStack}\n\n## 目录结构\n\n待 AI 创建项目后自动补充。\n\n## 数据模型\n\n待补充。\n\n## API 设计\n\n待补充。\n`;
  writeFile(dir, 'architecture.md', archMd);
  success('architecture.md — 项目架构文档模板');

  // ---- Step 3: Claude Code 自定义命令 ----
  step(3, '配置 Claude Code 自定义命令...');
  const commands = generateCommands();
  for (const [name, content] of Object.entries(commands)) {
    writeFile(dir, `.claude/commands/${name}`, content);
  }
  success(`.claude/commands/ — ${Object.keys(commands).length} 个自定义命令`);

  // ---- Step 4: Git 初始化 ----
  step(4, '初始化 Git...');
  if (!fs.existsSync(path.join(dir, '.git'))) {
    const { execSync } = await import('node:child_process');
    try {
      execSync('git init', { cwd: dir, stdio: 'ignore' });
      success('Git 仓库已初始化');
    } catch {
      warn('Git 初始化失败，请手动运行 git init');
    }
  } else {
    info('Git 仓库已存在，跳过');
  }

  // .gitignore
  const gitignore = `node_modules/\n.next/\ndist/\nbuild/\n.env\n.env.local\nautomation-logs/\n*.log\n.DS_Store\n`;
  if (!fileExists(dir, '.gitignore')) {
    writeFile(dir, '.gitignore', gitignore);
    success('.gitignore');
  }

  // ---- 完成 ----
  banner('初始化完成！');
  console.log(`  项目 "${projectName}" 已配置好全自动开发系统。\n`);
  console.log(`  接下来你可以：`);
  console.log(`    1. 编辑 task.json 添加你的开发任务`);
  console.log(`    2. （可选）编辑 architecture.md 补充架构设计`);
  console.log(`    3. 启动 Claude Code:\n`);
  console.log(`       cd ${dir}`);
  console.log(`       claude\n`);
  console.log(`    4. 使用自定义命令：`);
  console.log(`       /project:next        — 让 AI 执行下一个任务`);
  console.log(`       /project:status      — 查看开发进度`);
  console.log(`       /project:add-task    — 添加新任务\n`);
  console.log(`  或者直接告诉 Claude：`);
  console.log(`    "请根据我的描述生成 architecture.md 和 task.json，然后开始开发"\n`);
}
