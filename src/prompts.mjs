// prompts.mjs - 交互式提示工具
import { createInterface } from 'node:readline';

const rl = () => createInterface({ input: process.stdin, output: process.stdout });

export async function ask(question, defaultVal = '') {
  const r = rl();
  const suffix = defaultVal ? ` (${defaultVal})` : '';
  return new Promise(resolve => {
    r.question(`  ${question}${suffix}: `, answer => {
      r.close();
      resolve(answer.trim() || defaultVal);
    });
  });
}

export async function choose(question, options) {
  console.log(`\n  ${question}`);
  options.forEach((opt, i) => console.log(`    ${i + 1}. ${opt}`));
  const r = rl();
  return new Promise(resolve => {
    r.question(`  请选择 [1-${options.length}]: `, answer => {
      r.close();
      const idx = parseInt(answer) - 1;
      resolve(options[idx] || options[0]);
    });
  });
}

export async function confirm(question, defaultYes = true) {
  const r = rl();
  const hint = defaultYes ? 'Y/n' : 'y/N';
  return new Promise(resolve => {
    r.question(`  ${question} (${hint}): `, answer => {
      r.close();
      if (!answer.trim()) return resolve(defaultYes);
      resolve(answer.trim().toLowerCase().startsWith('y'));
    });
  });
}

export function banner(text) {
  const line = '─'.repeat(50);
  console.log(`\n  ${line}`);
  console.log(`  ${text}`);
  console.log(`  ${line}\n`);
}

export function success(text) { console.log(`  ✅ ${text}`); }
export function info(text)    { console.log(`  ℹ️  ${text}`); }
export function warn(text)    { console.log(`  ⚠️  ${text}`); }
export function step(n, text) { console.log(`\n  [${n}] ${text}`); }
