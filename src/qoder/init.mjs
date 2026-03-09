// init.mjs - 初始化 Qoder Dev 工作流
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_TASKS = [
  {
    id: 1,
    title: "项目初始化",
    description: "设置项目基础结构和工作流",
    steps: [
      "创建必要的配置文件",
      "设置开发环境",
      "验证工具链可用"
    ],
    status: "pending",
    priority: "high",
    estimatedTime: "20min",
    completedAt: null,
    notes: ""
  }
];

export async function runInit(targetDir) {
  console.log('\n  🔧 Qoder Dev 初始化\n');

  // 创建 QODER_DEV.md
  const qoderDevMd = `# 项目开发跟踪

> 本文件由 qoder-dev 自动生成

## 项目信息

- **创建时间**: ${new Date().toISOString().split('T')[0]}
- **开发模式**: QoderWork 自动开发流程

## 快速开始

1. 编辑 \`task.json\` 添加你的开发任务
2. 在对话中输入 \`/dev:next\` 开始执行
3. 我会按照任务步骤逐步完成，并记录进度

## 工作流说明

- **Step 1**: 我读取 task.json，了解当前任务
- **Step 2**: 向你确认任务理解
- **Step 3**: 执行任务步骤
- **Step 4**: 验证结果，更新进度

---

*上次更新: ${new Date().toLocaleString()}*
`;

  writeFile(targetDir, 'QODER_DEV.md', qoderDevMd);
  console.log('  ✅ QODER_DEV.md - 工作流程说明');

  // 创建 task.json
  const taskJson = {
    project: path.basename(targetDir),
    currentSession: {
      startedAt: new Date().toISOString().split('T')[0],
      tasksCompleted: 0,
      lastTaskId: null
    },
    tasks: DEFAULT_TASKS
  };

  writeFile(targetDir, 'task.json', JSON.stringify(taskJson, null, 2));
  console.log('  ✅ task.json - 任务清单');

  // 创建 progress.txt
  const progressTxt = `# ${taskJson.project} - 开发日志

## Session ${taskJson.currentSession.startedAt}

项目已初始化，等待开始第一个任务。

使用 \`/dev:next\` 开始开发。

---
`;

  writeFile(targetDir, 'progress.txt', progressTxt);
  console.log('  ✅ progress.txt - 工作日志');

  // 创建 .qoder 目录结构
  const commandsDir = path.join(targetDir, '.qoder', 'commands');
  fs.mkdirSync(commandsDir, { recursive: true });

  // 创建快捷指令
  const commands = {
    'next.md': `执行下一个任务

请：
1. 读取 task.json
2. 找到下一个 status: "pending" 的任务
3. 向我确认任务理解
4. 执行 task.steps 中的每一步
5. 验证结果
6. 更新 task.json（status: "completed"）
7. 更新 progress.txt（记录工作内容）
8. 生成任务完成摘要
`,
    'status.md': `显示开发状态

请：
1. 读取 task.json
2. 统计任务状态
3. 读取 progress.txt 的最后几条记录
4. 以清晰的格式汇报：
   - 项目名
   - 总任务数 / 已完成 / 进行中 / 待开始
   - 当前进行中的任务（如果有）
   - 最近完成的任务
   - 下一步建议
`,
    'add-task.md': `添加新任务

请：
1. 询问用户新任务的内容
2. 将需求拆解为 3-8 个具体步骤
3. 生成 task 对象：
   - id: 当前最大 id + 1
   - title: 任务标题
   - description: 描述
   - steps: 步骤数组
   - status: "pending"
   - priority: "normal" | "high" | "low"
   - estimatedTime: 预估时间
4. 添加到 task.json
5. 确认添加成功
`,
    'refactor.md': `代码重构建议

请：
1. 分析当前代码库（读取关键文件）
2. 识别可以改进的地方：
   - 代码重复
   - 命名不清晰
   - 函数过长
   - 缺少测试
   - 性能问题
3. 生成重构建议列表
4. 询问用户是否要将建议转为 task.json 中的任务
`
  };

  for (const [name, content] of Object.entries(commands)) {
    fs.writeFileSync(path.join(commandsDir, name), content, 'utf-8');
  }
  console.log('  ✅ .qoder/commands/ - 4 个快捷指令');

  console.log('\n  ✨ 初始化完成！\n');
  console.log('  接下来：');
  console.log('    1. 编辑 task.json 添加你的开发任务');
  console.log('    2. 在对话中输入 /dev:next 开始执行');
  console.log('');
}

function writeFile(dir, filename, content) {
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, content, 'utf-8');
}
