// generate.mjs - 文件生成引擎
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMPL_DIR = path.join(__dirname, '..', 'templates');

export function readTemplate(name) {
  return fs.readFileSync(path.join(TMPL_DIR, name), 'utf-8');
}

// ---- 模板引擎 ----

export function renderTemplate(templateStr, vars = {}) {
  // 1. 处理条件块: {{#if key}}...{{/if}}
  let result = templateStr.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
    return vars[key] ? content : '';
  });
  // 2. 替换变量: {{key}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return vars[key] !== undefined ? String(vars[key]) : '';
  });
  return result;
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
  if (!config || typeof config !== 'object') {
    throw new Error('generateClaudeMd: config object is required');
  }
  if (!config.mode || !['new', 'existing'].includes(config.mode)) {
    throw new Error(`generateClaudeMd: invalid mode "${config.mode}", must be "new" or "existing"`);
  }
  if (!config.projectName) {
    throw new Error('generateClaudeMd: projectName is required');
  }

  const isExisting = config.mode === 'existing';
  const s = config.scripts || {};

  // 构建测试命令列表
  let testCommands = '';
  if (s.lint)  testCommands += `- \`${s.lint}\` 无错误\n`;
  else         testCommands += `- \`npm run lint\` 无错误（如果项目配置了 lint）\n`;
  if (s.build) testCommands += `- \`${s.build}\` 构建成功\n`;
  else         testCommands += `- \`npm run build\` 构建成功\n`;
  if (s.test)  testCommands += `- \`${s.test}\` 测试通过\n`;

  const template = readTemplate('claude-md.template');
  return renderTemplate(template, {
    projectName: config.projectName,
    modeLabel: isExisting ? '已有项目接管' : '从零开始开发',
    description: config.description || '请在此补充项目描述。',
    techStack: config.techStack || '待确认',
    isExisting,
    serverUrl: config.devServer || 'http://localhost:3000',
    testCommands,
    extraRules: config.extraRules || '',
    hasExtraRules: !!config.extraRules,
  });
}

// ============================================================
// architecture.md 生成（扫描模式用）
// ============================================================

export function generateArchitectureMd(scanResult) {
  if (!scanResult || !scanResult.projectName) {
    throw new Error('generateArchitectureMd: scanResult with projectName is required');
  }
  const { projectName, techStack, tree, configFiles, scripts, readme, stats, keyFiles } = scanResult;

  const template = readTemplate('architecture-md.template');
  return renderTemplate(template, {
    projectName,
    date: new Date().toISOString().split('T')[0],
    techStackList: techStack.map(t => `- ${t}`).join('\n'),
    statsTable: Object.entries(stats).map(([k, v]) => `| ${k} | ${v} |`).join('\n'),
    tree,
    configFilesList: configFiles.length > 0 ? configFiles.map(f => `- \`${f}\``).join('\n') : '无',
    scriptsList: scripts ? Object.entries(scripts).map(([k, v]) => `- \`${k}\`: ${v}`).join('\n') : '无 package.json 或无 scripts',
    hasKeyFiles: keyFiles && keyFiles.length > 0,
    keyFilesList: keyFiles ? keyFiles.map(f => `- \`${f}\``).join('\n') : '',
    hasReadme: !!readme,
    readmeContent: readme ? readme.substring(0, 2000) + (readme.length > 2000 ? '\n\n...(已截断)' : '') : '',
  });
}

// ============================================================
// task.json 生成
// ============================================================

export function generateTaskJson(mode, tasks = []) {
  if (tasks.length > 0) return JSON.stringify({ tasks }, null, 2);

  const templateName = mode === 'new' ? 'task-new.json' : 'task-existing.json';
  return readTemplate(templateName);
}

// ============================================================
// init.sh 生成
// ============================================================

export function generateInitSh(config) {
  const { projectDir, scripts, devServer } = config;
  const dir = projectDir || '.';
  const isSubDir = dir !== '.';

  const template = readTemplate('init-sh.template');
  return renderTemplate(template, {
    cdIn: isSubDir ? `cd ${dir}` : '',
    cdOut: isSubDir ? 'cd ..' : '',
    cdInline: isSubDir ? `cd ${dir} && ` : '',
    devCmd: scripts?.dev || 'npm run dev',
    devServer: devServer || 'http://localhost:3000',
  });
}

// ============================================================
// Claude Code 自定义命令生成
// ============================================================

export function generateCommands() {
  return {
    'next.md': readTemplate('commands/next.md'),
    'status.md': readTemplate('commands/status.md'),
    'add-task.md': readTemplate('commands/add-task.md'),
    'scan-project.md': readTemplate('commands/scan-project.md'),
  };
}
