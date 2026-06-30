// scan.mjs - 扫描已有项目，生成架构文档并配置自动开发系统
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { banner, step, success, info, warn, ask, confirm } from './prompts.mjs';
import {
  writeFile, fileExists,
  generateClaudeMd, generateArchitectureMd, generateTaskJson,
  generateInitSh, generateCommands
} from './generate.mjs';

// ---- 忽略目录 ----
const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.next', '__pycache__', '.venv', 'venv',
  'dist', 'build', '.cache', '.turbo', '.nuxt', '.output',
  'coverage', '.pytest_cache', '.mypy_cache', 'target', 'vendor',
  '.idea', '.vscode', '.DS_Store', 'automation-logs'
]);

// ---- 技术栈检测 ----
export function detectTechStack(dir) {
  const stack = [];
  const has = (f) => fs.existsSync(path.join(dir, f));
  const readJson = (f) => {
    try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')); }
    catch { return null; }
  };

  // 如果根目录没有 package.json，检查一级子目录
  let pkgDir = dir;
  if (!has('package.json')) {
    try {
      const subdirs = fs.readdirSync(dir, { withFileTypes: true })
        .filter(e => e.isDirectory() && !IGNORE_DIRS.has(e.name) && !e.name.startsWith('.'));
      for (const sub of subdirs) {
        if (fs.existsSync(path.join(dir, sub.name, 'package.json'))) {
          pkgDir = path.join(dir, sub.name);
          break;
        }
      }
    } catch (e) { console.error(`  [warn] 扫描子目录失败: ${e.message}`); }
  }
  const hasPkg = (f) => fs.existsSync(path.join(pkgDir, f));
  const readPkgJson = (f) => {
    try { return JSON.parse(fs.readFileSync(path.join(pkgDir, f), 'utf-8')); }
    catch { return null; }
  };

  // Node.js / JavaScript
  if (hasPkg('package.json')) {
    const pkg = readPkgJson('package.json');
    if (pkg) {
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (allDeps['next'])          stack.push('Next.js');
      else if (allDeps['nuxt'])     stack.push('Nuxt.js');
      else if (allDeps['react'])    stack.push('React');
      else if (allDeps['vue'])      stack.push('Vue.js');
      else if (allDeps['svelte'])   stack.push('Svelte');
      else if (allDeps['express'])  stack.push('Express.js');
      else if (allDeps['fastify'])  stack.push('Fastify');
      else if (allDeps['koa'])      stack.push('Koa');
      else                          stack.push('Node.js');

      if (allDeps['typescript'] || hasPkg('tsconfig.json')) stack.push('TypeScript');
      if (allDeps['tailwindcss'])   stack.push('Tailwind CSS');
      if (allDeps['prisma'] || allDeps['@prisma/client']) stack.push('Prisma');
      if (allDeps['drizzle-orm'])   stack.push('Drizzle ORM');
      if (allDeps['@supabase/supabase-js']) stack.push('Supabase');
      if (allDeps['mongoose'])      stack.push('MongoDB (Mongoose)');
      if (allDeps['sequelize'])     stack.push('Sequelize');
      if (allDeps['jest'])          stack.push('Jest');
      if (allDeps['vitest'])        stack.push('Vitest');
      if (allDeps['mocha'])         stack.push('Mocha');
      if (allDeps['playwright'] || allDeps['@playwright/test']) stack.push('Playwright');
    }
  }

  // Python
  if (has('requirements.txt') || has('pyproject.toml') || has('setup.py')) {
    stack.push('Python');
    if (has('pyproject.toml')) {
      try {
        const content = fs.readFileSync(path.join(dir, 'pyproject.toml'), 'utf-8');
        if (content.includes('django'))  stack.push('Django');
        if (content.includes('flask'))   stack.push('Flask');
        if (content.includes('fastapi')) stack.push('FastAPI');
        if (content.includes('pytest'))  stack.push('Pytest');
      } catch { /* pyproject.toml 格式异常，跳过框架检测 */ }
    }
  }

  // Go
  if (has('go.mod')) {
    stack.push('Go');
    try {
      const content = fs.readFileSync(path.join(dir, 'go.mod'), 'utf-8');
      if (content.includes('gin-gonic'))  stack.push('Gin');
      if (content.includes('fiber'))      stack.push('Fiber');
    } catch { /* go.mod 读取失败，跳过框架检测 */ }
  }

  // Rust
  if (has('Cargo.toml')) stack.push('Rust');

  // Java
  if (has('pom.xml'))         stack.push('Java (Maven)');
  if (has('build.gradle'))    stack.push('Java (Gradle)');

  // Ruby
  if (has('Gemfile')) {
    stack.push('Ruby');
    if (has('config/routes.rb')) stack.push('Ruby on Rails');
  }

  // Docker
  if (has('Dockerfile') || has('docker-compose.yml') || has('docker-compose.yaml')) {
    stack.push('Docker');
  }

  if (stack.length === 0) stack.push('未识别');
  return stack;
}

// ---- 提取 npm scripts ----
export function extractScripts(dir) {
  // 先检查根目录
  const tryRead = (d) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(d, 'package.json'), 'utf-8')).scripts || {};
    } catch { return null; }
  };
  let scripts = tryRead(dir);
  if (scripts) return scripts;
  // 检查一级子目录
  try {
    const subdirs = fs.readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isDirectory() && !IGNORE_DIRS.has(e.name) && !e.name.startsWith('.'));
    for (const sub of subdirs) {
      scripts = tryRead(path.join(dir, sub.name));
      if (scripts) return scripts;
    }
  } catch (e) { console.error(`  [warn] 扫描子目录 scripts 失败: ${e.message}`); }
  return {};
}

// ---- 目录树生成 ----
export function generateTree(dir, prefix = '', depth = 0, maxDepth = 3) {
  if (depth >= maxDepth) return '';
  let result = '';
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
      .filter(e => !IGNORE_DIRS.has(e.name) && !e.name.startsWith('.'))
      .sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

    entries.forEach((entry, index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const childPrefix = isLast ? '    ' : '│   ';

      result += `${prefix}${connector}${entry.name}${entry.isDirectory() ? '/' : ''}\n`;

      if (entry.isDirectory()) {
        result += generateTree(path.join(dir, entry.name), prefix + childPrefix, depth + 1, maxDepth);
      }
    });
  } catch { /* 目录不可读，跳过该层级 */ }
  return result;
}

// ---- 检测配置文件 ----
export function detectConfigFiles(dir) {
  const configs = [
    'tsconfig.json', '.eslintrc', '.eslintrc.js', '.eslintrc.json', 'eslint.config.js', 'eslint.config.mjs',
    '.prettierrc', '.prettierrc.js', 'prettier.config.js',
    'tailwind.config.js', 'tailwind.config.ts',
    'vite.config.ts', 'vite.config.js', 'next.config.js', 'next.config.mjs', 'next.config.ts',
    'jest.config.js', 'jest.config.ts', 'vitest.config.ts',
    'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
    '.env.example', '.env.local.example',
    'Makefile', 'Procfile',
    '.github/workflows', '.gitlab-ci.yml',
    'supabase/config.toml',
  ];
  return configs.filter(f => fs.existsSync(path.join(dir, f)));
}

// ---- 统计文件 ----
export function countFiles(dir, stats = {}, depth = 0) {
  if (depth > 8) return stats;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      if (entry.isDirectory()) {
        countFiles(path.join(dir, entry.name), stats, depth + 1);
      } else {
        const ext = path.extname(entry.name).toLowerCase() || '(无扩展名)';
        stats[ext] = (stats[ext] || 0) + 1;
      }
    }
  } catch { /* 目录不可读，跳过该层级 */ }
  return stats;
}

// ---- 发现关键入口文件 ----
export function findKeyFiles(dir) {
  const candidates = [
    'src/index.ts', 'src/index.js', 'src/main.ts', 'src/main.js',
    'src/app.ts', 'src/app.js', 'src/App.tsx', 'src/App.jsx',
    'src/app/layout.tsx', 'src/app/page.tsx',    // Next.js App Router
    'src/pages/index.tsx', 'src/pages/index.jsx', // Next.js Pages Router
    'app/layout.tsx', 'app/page.tsx',
    'pages/index.tsx', 'pages/index.jsx',
    'index.ts', 'index.js', 'main.ts', 'main.js',
    'app.py', 'main.py', 'manage.py',
    'main.go', 'cmd/main.go',
    'src/main.rs', 'src/lib.rs',
  ];
  return candidates.filter(f => fs.existsSync(path.join(dir, f)));
}

// ---- 读 README ----
export function readReadme(dir) {
  for (const name of ['README.md', 'readme.md', 'README.MD', 'Readme.md']) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) {
      try { return fs.readFileSync(p, 'utf-8'); } catch {}
    }
  }
  return null;
}

// ============================================================
// 主入口
// ============================================================

export async function runScan(targetDir, opts = {}) {
  const dir = path.resolve(targetDir);
  banner('adev scan - 扫描已有项目并接入自动开发系统');

  if (!fs.existsSync(dir)) {
    console.error(`  目录不存在: ${dir}`);
    process.exit(1);
  }

  // ---- Step 1: 扫描 ----
  step(1, '扫描项目...');

  const projectName = path.basename(dir);
  const techStack = detectTechStack(dir);
  const allScripts = extractScripts(dir);
  const tree = generateTree(dir);
  const configFiles = detectConfigFiles(dir);
  const fileCounts = countFiles(dir);
  const keyFiles = findKeyFiles(dir);
  const readme = readReadme(dir);

  // 汇总文件统计
  const totalFiles = Object.values(fileCounts).reduce((a, b) => a + b, 0);
  const topExts = Object.entries(fileCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ext, count]) => `${ext}: ${count}`)
    .join(', ');

  const stats = {
    '总文件数': totalFiles,
    '主要文件类型': topExts,
    '配置文件数': configFiles.length,
    '可用脚本数': Object.keys(allScripts).length,
  };

  info(`项目名称: ${projectName}`);
  info(`技术栈: ${techStack.join(', ')}`);
  info(`文件总数: ${totalFiles}`);
  info(`配置文件: ${configFiles.length} 个`);

  // ---- Step 2: 交互确认 ----
  let description = '';
  let devServer = 'http://localhost:3000';

  if (!opts.skipPrompts) {
    step(2, '确认项目信息');
    description = await ask('项目描述（一句话说明项目是什么）', '');

    // 智能推测 dev server
    if (allScripts.dev) {
      const devScript = allScripts.dev;
      if (devScript.includes('3001')) devServer = 'http://localhost:3001';
      else if (devScript.includes('8080')) devServer = 'http://localhost:8080';
      else if (devScript.includes('8000')) devServer = 'http://localhost:8000';
      else if (devScript.includes('5173')) devServer = 'http://localhost:5173';
      else if (devScript.includes('4000')) devServer = 'http://localhost:4000';
    }
    devServer = await ask('开发服务器地址', devServer);
  }

  // 匹配 scripts
  const detectedScripts = {
    dev: allScripts.dev ? `npm run dev` : null,
    build: allScripts.build ? `npm run build` : null,
    lint: allScripts.lint ? `npm run lint` : (allScripts['lint:fix'] ? `npm run lint:fix` : null),
    test: allScripts.test ? `npm run test` : (allScripts['test:unit'] ? `npm run test:unit` : null),
  };

  // ---- Step 3: 生成文件 ----
  step(3, '生成配置文件...');

  // architecture.md
  const archMd = generateArchitectureMd({
    projectName, techStack, tree, configFiles,
    scripts: allScripts, readme, stats, keyFiles
  });
  writeFile(dir, 'architecture.md', archMd);
  success('architecture.md — 项目架构文档');

  // CLAUDE.md
  if (fileExists(dir, 'CLAUDE.md')) {
    if (!opts.skipPrompts) {
      const overwrite = await confirm('检测到已有 CLAUDE.md，是否覆盖？', false);
      if (!overwrite) {
        warn('保留现有 CLAUDE.md');
      } else {
        const claudeMd = generateClaudeMd({
          mode: 'existing', projectName, description,
          techStack: techStack.join(', '), devServer,
          scripts: detectedScripts, projectDir: '.',
        });
        writeFile(dir, 'CLAUDE.md', claudeMd);
        success('CLAUDE.md — AI 工作流程指令（已覆盖）');
      }
    }
  } else {
    const claudeMd = generateClaudeMd({
      mode: 'existing', projectName, description,
      techStack: techStack.join(', '), devServer,
      scripts: detectedScripts, projectDir: '.',
    });
    writeFile(dir, 'CLAUDE.md', claudeMd);
    success('CLAUDE.md — AI 工作流程指令');
  }

  // task.json
  if (!fileExists(dir, 'task.json')) {
    writeFile(dir, 'task.json', generateTaskJson('existing'));
    success('task.json — 任务清单（含「项目现状梳理」初始任务）');
  } else {
    info('task.json 已存在，跳过');
  }

  // progress.txt
  if (!fileExists(dir, 'progress.txt')) {
    const date = new Date().toISOString().split('T')[0];
    const initProgress = `# ${projectName} - 工作进度日志

## ${date} - 项目接管初始化

### 完成的工作:
- adev scan 已完成，生成了 architecture.md 和 CLAUDE.md
- 检测到的技术栈: ${techStack.join(', ')}

### 关键决策:
- 使用 adev 自动化开发系统接管已有项目

### 测试结果:
- 项目扫描成功，文件生成正常

### 给下一个 Agent 的警告:
- 这是初始扫描记录，请先运行第一个任务「项目现状梳理」来深入了解项目

### 未解决的问题:
- 需要确认 task.json 中的任务列表是否完整

---
`;
    writeFile(dir, 'progress.txt', initProgress);
    success('progress.txt — 工作进度日志');
  } else {
    info('progress.txt 已存在，跳过');
  }

  // init.sh
  if (!fileExists(dir, 'init.sh')) {
    writeFile(dir, 'init.sh', generateInitSh({
      mode: 'existing', projectDir: '.', scripts: detectedScripts, devServer,
    }));
    success('init.sh — 环境初始化脚本');
  } else {
    info('init.sh 已存在，跳过');
  }

  // run-automation.sh
  if (!fileExists(dir, 'run-automation.sh')) {
    const { readTemplate } = await import('./generate.mjs');
    writeFile(dir, 'run-automation.sh', readTemplate('run-automation.sh'));
    success('run-automation.sh — 自动化循环脚本');
  } else {
    info('run-automation.sh 已存在，跳过');
  }

  // Claude Code 自定义命令
  if (!opts.lite) {
    step(4, '配置 Claude Code 自定义命令...');
    const commands = generateCommands();
    for (const [name, content] of Object.entries(commands)) {
      writeFile(dir, `.claude/commands/${name}`, content);
    }
    success(`.claude/commands/ — ${Object.keys(commands).length} 个自定义命令`);
  }

  // ---- 更新 .gitignore ----
  const gitignorePath = path.join(dir, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    let gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    const additions = ['automation-logs/', 'progress.txt'];
    const toAdd = additions.filter(a => !gitignore.includes(a));
    if (toAdd.length > 0) {
      gitignore += '\n# adev - auto dev\n' + toAdd.join('\n') + '\n';
      fs.writeFileSync(gitignorePath, gitignore);
      success('.gitignore 已更新');
    }
  }

  // ---- 完成 ----
  banner('扫描完成！');
  console.log(`  你的项目已经准备好使用 Claude Code 自动开发了。\n`);
  console.log(`  接下来你可以：`);
  console.log(`    1. 编辑 task.json 添加开发任务`);
  console.log(`    2. 启动 Claude Code:\n`);
  console.log(`       cd ${dir}`);
  console.log(`       claude\n`);
  console.log(`    3. 使用自定义命令：`);
  console.log(`       /project:next        — 让 AI 执行下一个任务`);
  console.log(`       /project:status      — 查看开发进度`);
  console.log(`       /project:add-task    — 添加新任务`);
  console.log(`       /project:scan-project — 让 AI 深度分析项目\n`);
}
