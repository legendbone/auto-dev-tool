// next.mjs - 执行下一个任务（交互式）
import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';

const rl = () => createInterface({ input: process.stdin, output: process.stdout });

async function ask(question) {
  const r = rl();
  return new Promise(resolve => {
    r.question(`  ${question}: `, answer => {
      r.close();
      resolve(answer.trim());
    });
  });
}

export async function runNext(targetDir) {
  const taskPath = path.join(targetDir, 'task.json');
  const progressPath = path.join(targetDir, 'progress.txt');

  if (!fs.existsSync(taskPath)) {
    console.log('\n  ⚠️  未找到 task.json，请先运行: qoder-dev init\n');
    return;
  }

  const taskData = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
  const tasks = taskData.tasks || [];

  // 找到下一个待开始的任务
  const nextTask = tasks.find(t => t.status === 'pending');

  if (!nextTask) {
    console.log('\n  🎉 所有任务已完成！\n');
    return;
  }

  console.log('\n  🎯 下一个任务\n');
  console.log(`  Task ${nextTask.id}: ${nextTask.title}`);
  console.log(`  描述: ${nextTask.description}`);
  console.log(`  优先级: ${nextTask.priority || 'normal'}`);
  console.log(`  预计时间: ${nextTask.estimatedTime || '未估计'}\n`);

  console.log('  步骤:');
  nextTask.steps?.forEach((step, i) => {
    console.log(`    ${i + 1}. ${step}`);
  });
  console.log('');

  // 询问是否开始
  const answer = await ask('是否开始执行此任务? (y/n/edit)');

  if (answer.toLowerCase() === 'edit') {
    console.log('\n  请手动编辑 task.json 后再次运行\n');
    return;
  }

  if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
    console.log('\n  已取消\n');
    return;
  }

  // 更新任务状态为进行中
  nextTask.status = 'in-progress';
  fs.writeFileSync(taskPath, JSON.stringify(taskData, null, 2), 'utf-8');

  console.log('\n  ✅ 任务已标记为进行中\n');
  console.log('  现在请在 QoderWork 对话中告诉我：\n');
  console.log(`  "开始执行 Task ${nextTask.id}: ${nextTask.title}"\n`);
  console.log('  我会按照步骤完成任务，并更新进度。\n');
}
