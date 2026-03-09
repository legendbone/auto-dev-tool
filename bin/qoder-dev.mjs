#!/usr/bin/env node

// qoder-dev - QoderWork 适配的自动开发工具
// 让我在开发过程中遵循结构化流程

import { runInit } from '../src/qoder/init.mjs';
import { runStatus } from '../src/qoder/status.mjs';
import { runNext } from '../src/qoder/next.mjs';

const HELP = `
  qoder-dev - QoderWork 自动开发流程工具

  用法:
    qoder-dev init [目录]     初始化 Qoder Dev 工作流
    qoder-dev status          显示当前开发状态
    qoder-dev next            执行下一个任务（交互式）
    qoder-dev help            显示帮助

  快捷指令（在对话中使用）:
    /dev:next     - 执行下一个任务
    /dev:status   - 查看开发状态  
    /dev:add      - 添加新任务

  示例:
    qoder-dev init ./my-project    # 初始化项目
    qoder-dev status               # 查看状态
    qoder-dev next                 # 执行下一个任务
`;

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args.includes('-h') || args.includes('--help')) {
    console.log(HELP);
    process.exit(0);
  }

  const command = args[0];
  const targetDir = process.cwd();

  switch (command) {
    case 'init':
      await runInit(args[1] || targetDir);
      break;
    case 'status':
      await runStatus(targetDir);
      break;
    case 'next':
      await runNext(targetDir);
      break;
    default:
      console.error(`未知命令: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch(err => {
  console.error('错误:', err.message);
  process.exit(1);
});
