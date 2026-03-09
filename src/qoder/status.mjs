// status.mjs - 显示开发状态
import fs from 'node:fs';
import path from 'node:path';

export async function runStatus(targetDir) {
  const taskPath = path.join(targetDir, 'task.json');
  const progressPath = path.join(targetDir, 'progress.txt');

  if (!fs.existsSync(taskPath)) {
    console.log('\n  ⚠️  未找到 task.json，请先运行: qoder-dev init\n');
    return;
  }

  const taskData = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
  const tasks = taskData.tasks || [];

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    pending: tasks.filter(t => t.status === 'pending').length
  };

  console.log('\n  📊 开发状态\n');
  console.log(`  项目: ${taskData.project || '未命名'}`);
  console.log(`  会话开始: ${taskData.currentSession?.startedAt || '未知'}\n`);

  console.log('  任务统计:');
  console.log(`    总计: ${stats.total}`);
  console.log(`    ✅ 已完成: ${stats.completed}`);
  console.log(`    🔄 进行中: ${stats.inProgress}`);
  console.log(`    ⏳ 待开始: ${stats.pending}\n`);

  // 显示进行中的任务
  const inProgressTask = tasks.find(t => t.status === 'in-progress');
  if (inProgressTask) {
    console.log('  当前进行:');
    console.log(`    Task ${inProgressTask.id}: ${inProgressTask.title}`);
    console.log(`    步骤: ${inProgressTask.steps?.length || 0} 个`);
    console.log(`    优先级: ${inProgressTask.priority || 'normal'}\n`);
  }

  // 显示最近的已完成任务
  const recentCompleted = tasks
    .filter(t => t.status === 'completed')
    .slice(-3);

  if (recentCompleted.length > 0) {
    console.log('  最近完成:');
    recentCompleted.forEach(t => {
      console.log(`    ✅ Task ${t.id}: ${t.title}`);
    });
    console.log('');
  }

  // 显示下一个待开始的任务
  const nextPending = tasks.find(t => t.status === 'pending');
  if (nextPending) {
    console.log('  下一个任务:');
    console.log(`    ⏳ Task ${nextPending.id}: ${nextPending.title}`);
    console.log(`    预计时间: ${nextPending.estimatedTime || '未估计'}\n`);
  }

  // 读取 progress.txt 的最后几行
  if (fs.existsSync(progressPath)) {
    const progress = fs.readFileSync(progressPath, 'utf-8');
    const lines = progress.split('\n').filter(l => l.trim());
    const recentLines = lines.slice(-10);

    if (recentLines.length > 0) {
      console.log('  最近日志:');
      recentLines.forEach(line => {
        if (line.startsWith('###')) {
          console.log(`    ${line}`);
        }
      });
      console.log('');
    }
  }

  console.log('  使用 /dev:next 开始下一个任务\n');
}
