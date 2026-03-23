import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateClaudeMd, generateArchitectureMd, generateTaskJson,
  generateInitSh, generateCommands, renderTemplate
} from '../src/generate.mjs';

// ---- generateClaudeMd ----

describe('generateClaudeMd', () => {
  const baseConfig = {
    mode: 'new',
    projectName: 'test-project',
    description: 'A test project',
    techStack: 'React, TypeScript',
    devServer: 'http://localhost:3000',
    scripts: { dev: 'npm run dev', build: 'npm run build', lint: 'npm run lint' },
    projectDir: '.',
  };

  it('generates markdown for new project', () => {
    const result = generateClaudeMd(baseConfig);
    assert.ok(result.includes('test-project'));
    assert.ok(result.includes('React, TypeScript'));
    assert.ok(result.includes('从零开始开发'));
    assert.ok(!result.includes('ONBOARDING'));
  });

  it('includes ONBOARDING for existing projects', () => {
    const result = generateClaudeMd({ ...baseConfig, mode: 'existing' });
    assert.ok(result.includes('ONBOARDING'));
    assert.ok(result.includes('已有项目接管'));
    assert.ok(result.includes('保持代码风格一致'));
  });

  it('includes script commands when provided', () => {
    const result = generateClaudeMd(baseConfig);
    assert.ok(result.includes('npm run lint'));
    assert.ok(result.includes('npm run build'));
  });

  it('includes extraRules when provided', () => {
    const result = generateClaudeMd({ ...baseConfig, extraRules: '自定义规则内容' });
    assert.ok(result.includes('自定义规则内容'));
    assert.ok(result.includes('项目特定规则'));
  });

  it('uses default description when missing', () => {
    const result = generateClaudeMd({ ...baseConfig, description: '' });
    assert.ok(result.includes('请在此补充项目描述'));
  });

  it('throws on null config', () => {
    assert.throws(() => generateClaudeMd(null), /config object is required/);
  });

  it('throws on invalid mode', () => {
    assert.throws(
      () => generateClaudeMd({ mode: 'invalid', projectName: 'x' }),
      /invalid mode/
    );
  });

  it('throws on missing projectName', () => {
    assert.throws(
      () => generateClaudeMd({ mode: 'new' }),
      /projectName is required/
    );
  });
});

// ---- generateArchitectureMd ----

describe('generateArchitectureMd', () => {
  const scanResult = {
    projectName: 'my-app',
    techStack: ['React', 'TypeScript'],
    tree: 'src/\n  index.ts\n',
    configFiles: ['tsconfig.json', '.eslintrc.js'],
    scripts: { dev: 'vite', build: 'tsc && vite build' },
    readme: '# My App\nA sample app.',
    stats: { '总文件数': 42, '主要文件类型': '.ts: 20, .tsx: 15' },
    keyFiles: ['src/index.ts'],
  };

  it('generates architecture doc with all sections', () => {
    const result = generateArchitectureMd(scanResult);
    assert.ok(result.includes('my-app'));
    assert.ok(result.includes('React'));
    assert.ok(result.includes('TypeScript'));
    assert.ok(result.includes('tsconfig.json'));
    assert.ok(result.includes('src/index.ts'));
    assert.ok(result.includes('My App'));
  });

  it('throws on missing scanResult', () => {
    assert.throws(() => generateArchitectureMd(null), /scanResult with projectName is required/);
  });

  it('throws on missing projectName', () => {
    assert.throws(() => generateArchitectureMd({}), /scanResult with projectName is required/);
  });
});

// ---- generateTaskJson ----

describe('generateTaskJson', () => {
  it('generates new project task', () => {
    const result = JSON.parse(generateTaskJson('new'));
    assert.equal(result.tasks.length, 1);
    assert.equal(result.tasks[0].id, 1);
    assert.equal(result.tasks[0].passes, false);
    assert.ok(result.tasks[0].title.includes('基础搭建'));
  });

  it('generates existing project task', () => {
    const result = JSON.parse(generateTaskJson('existing'));
    assert.equal(result.tasks.length, 1);
    assert.ok(result.tasks[0].title.includes('现状梳理'));
  });

  it('uses custom tasks when provided', () => {
    const custom = [{ id: 1, title: 'Custom', steps: [], passes: false }];
    const result = JSON.parse(generateTaskJson('new', custom));
    assert.equal(result.tasks[0].title, 'Custom');
  });
});

// ---- generateInitSh ----

describe('generateInitSh', () => {
  it('generates bash script with shebang', () => {
    const result = generateInitSh({
      mode: 'new', projectDir: '.', scripts: { dev: 'npm run dev' },
      devServer: 'http://localhost:3000',
    });
    assert.ok(result.startsWith('#!/bin/bash'));
    assert.ok(result.includes('npm run dev'));
    assert.ok(result.includes('localhost:3000'));
  });

  it('includes cd command for non-root projectDir', () => {
    const result = generateInitSh({
      mode: 'new', projectDir: 'frontend', scripts: {},
      devServer: 'http://localhost:5173',
    });
    assert.ok(result.includes('cd frontend'));
  });
});

// ---- generateCommands ----

describe('generateCommands', () => {
  it('returns all four commands', () => {
    const cmds = generateCommands();
    assert.ok('next.md' in cmds);
    assert.ok('status.md' in cmds);
    assert.ok('add-task.md' in cmds);
    assert.ok('scan-project.md' in cmds);
  });

  it('commands contain meaningful content', () => {
    const cmds = generateCommands();
    assert.ok(cmds['next.md'].includes('task.json'));
    assert.ok(cmds['status.md'].includes('progress.txt'));
  });
});

// ---- renderTemplate ----

describe('renderTemplate', () => {
  it('replaces simple variables', () => {
    const result = renderTemplate('Hello {{name}}!', { name: 'World' });
    assert.equal(result, 'Hello World!');
  });

  it('replaces missing variables with empty string', () => {
    const result = renderTemplate('Hello {{name}}!', {});
    assert.equal(result, 'Hello !');
  });

  it('handles #if blocks when truthy', () => {
    const result = renderTemplate('A{{#if show}}B{{/if}}C', { show: true });
    assert.equal(result, 'ABC');
  });

  it('removes #if blocks when falsy', () => {
    const result = renderTemplate('A{{#if show}}B{{/if}}C', { show: false });
    assert.equal(result, 'AC');
  });

  it('handles multiline #if blocks', () => {
    const tmpl = 'start\n{{#if visible}}\nline1\nline2\n{{/if}}\nend';
    const result = renderTemplate(tmpl, { visible: true });
    assert.ok(result.includes('line1'));
    assert.ok(result.includes('line2'));
  });

  it('handles multiple variables and conditions', () => {
    const tmpl = '{{greeting}} {{name}}{{#if excited}}!!!{{/if}}';
    const result = renderTemplate(tmpl, { greeting: 'Hi', name: 'Bob', excited: true });
    assert.equal(result, 'Hi Bob!!!');
  });
});
