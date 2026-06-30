#!/usr/bin/env node

// adev - Auto Dev CLI
// 一键配置 Claude Code 全自动开发系统

import { parseArgs } from 'node:util';
import { runInit } from '../src/init.mjs';
import { runScan } from '../src/scan.mjs';

const HELP = `
  adev - Auto Dev: 一键配置 Claude Code 全自动开发系统

  用法:
    adev init [目录]        从零开始，为新项目配置自动开发系统
    adev scan [目录]        扫描已有项目，生成架构文档并接入自动开发系统
    adev help               显示帮助信息

  选项:
    -y, --yes               跳过交互确认，使用默认配置
    --lite                  轻量模式，跳过自定义命令生成
    -h, --help              显示帮助信息

  示例:
    cd my-new-project && adev init          # 新项目初始化
    cd my-old-project && adev scan          # 老项目接管
    adev init ./my-project                  # 指定目录
    adev scan ./legacy-app -y               # 静默模式扫描
    adev scan ./small-lib --lite            # 轻量模式扫描
`;

export function parseCliArgs(args) {
  if (args.length === 0 || args[0] === 'help' || args.includes('-h') || args.includes('--help')) {
    return { command: 'help', targetDir: process.cwd(), skipPrompts: false };
  }

  const command = args[0];
  const skipPrompts = args.includes('-y') || args.includes('--yes');
  const lite = args.includes('--lite');

  let targetDir = process.cwd();
  for (let i = 1; i < args.length; i++) {
    if (!args[i].startsWith('-')) {
      targetDir = args[i];
      break;
    }
  }

  return { command, targetDir, skipPrompts, lite };
}

async function main() {
  const { command, targetDir, skipPrompts, lite } = parseCliArgs(process.argv.slice(2));

  if (command === 'help') {
    console.log(HELP);
    process.exit(0);
  }

  switch (command) {
    case 'init':
      await runInit(targetDir, { skipPrompts });
      break;
    case 'scan':
      await runScan(targetDir, { skipPrompts, lite });
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
