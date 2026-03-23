import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  detectTechStack, extractScripts, detectConfigFiles,
  findKeyFiles, generateTree, countFiles
} from '../src/scan.mjs';

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'adev-test-'));
}

function cleanTmpDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---- detectTechStack ----

describe('detectTechStack', () => {
  let tmpDir;
  before(() => { tmpDir = makeTmpDir(); });
  after(() => { cleanTmpDir(tmpDir); });

  it('detects Next.js from package.json', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      dependencies: { next: '^14.0.0', react: '^18.0.0' }
    }));
    const stack = detectTechStack(tmpDir);
    assert.ok(stack.includes('Next.js'));
    assert.ok(!stack.includes('React')); // Next.js takes priority
  });

  it('detects React when no framework', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
      dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' }
    }));
    const stack = detectTechStack(dir);
    assert.ok(stack.includes('React'));
    cleanTmpDir(dir);
  });

  it('detects TypeScript', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
      devDependencies: { typescript: '^5.0.0' }
    }));
    const stack = detectTechStack(dir);
    assert.ok(stack.includes('TypeScript'));
    cleanTmpDir(dir);
  });

  it('detects Python from requirements.txt', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(path.join(dir, 'requirements.txt'), 'flask==2.0\n');
    const stack = detectTechStack(dir);
    assert.ok(stack.includes('Python'));
    cleanTmpDir(dir);
  });

  it('detects Go from go.mod', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(path.join(dir, 'go.mod'), 'module example.com/app\ngo 1.21\n');
    const stack = detectTechStack(dir);
    assert.ok(stack.includes('Go'));
    cleanTmpDir(dir);
  });

  it('detects Docker from Dockerfile', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(path.join(dir, 'Dockerfile'), 'FROM node:20\n');
    const stack = detectTechStack(dir);
    assert.ok(stack.includes('Docker'));
    cleanTmpDir(dir);
  });

  it('returns 未识别 for empty directory', () => {
    const dir = makeTmpDir();
    const stack = detectTechStack(dir);
    assert.deepStrictEqual(stack, ['未识别']);
    cleanTmpDir(dir);
  });
});

// ---- extractScripts ----

describe('extractScripts', () => {
  it('extracts scripts from package.json', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
      scripts: { dev: 'vite', build: 'tsc && vite build' }
    }));
    const scripts = extractScripts(dir);
    assert.equal(scripts.dev, 'vite');
    assert.equal(scripts.build, 'tsc && vite build');
    cleanTmpDir(dir);
  });

  it('returns empty object for directory without package.json', () => {
    const dir = makeTmpDir();
    const scripts = extractScripts(dir);
    assert.deepStrictEqual(scripts, {});
    cleanTmpDir(dir);
  });

  it('searches subdirectories when root has no package.json', () => {
    const dir = makeTmpDir();
    const subDir = path.join(dir, 'frontend');
    fs.mkdirSync(subDir);
    fs.writeFileSync(path.join(subDir, 'package.json'), JSON.stringify({
      scripts: { dev: 'next dev' }
    }));
    const scripts = extractScripts(dir);
    assert.equal(scripts.dev, 'next dev');
    cleanTmpDir(dir);
  });
});

// ---- detectConfigFiles ----

describe('detectConfigFiles', () => {
  it('detects existing config files', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
    fs.writeFileSync(path.join(dir, 'Dockerfile'), 'FROM node');
    const configs = detectConfigFiles(dir);
    assert.ok(configs.includes('tsconfig.json'));
    assert.ok(configs.includes('Dockerfile'));
    cleanTmpDir(dir);
  });

  it('returns empty array for directory without config files', () => {
    const dir = makeTmpDir();
    const configs = detectConfigFiles(dir);
    assert.deepStrictEqual(configs, []);
    cleanTmpDir(dir);
  });
});

// ---- findKeyFiles ----

describe('findKeyFiles', () => {
  it('finds entry point files', () => {
    const dir = makeTmpDir();
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'src', 'index.ts'), 'export {}');
    const keyFiles = findKeyFiles(dir);
    assert.ok(keyFiles.includes('src/index.ts'));
    cleanTmpDir(dir);
  });

  it('returns empty array when no entry points found', () => {
    const dir = makeTmpDir();
    const keyFiles = findKeyFiles(dir);
    assert.deepStrictEqual(keyFiles, []);
    cleanTmpDir(dir);
  });
});

// ---- generateTree ----

describe('generateTree', () => {
  it('generates tree with files and directories', () => {
    const dir = makeTmpDir();
    fs.mkdirSync(path.join(dir, 'src'));
    fs.writeFileSync(path.join(dir, 'src', 'app.js'), '');
    fs.writeFileSync(path.join(dir, 'README.md'), '');
    const tree = generateTree(dir);
    assert.ok(tree.includes('src/'));
    assert.ok(tree.includes('README.md'));
    cleanTmpDir(dir);
  });

  it('ignores node_modules and hidden files', () => {
    const dir = makeTmpDir();
    fs.mkdirSync(path.join(dir, 'node_modules'));
    fs.writeFileSync(path.join(dir, '.env'), 'SECRET=x');
    fs.writeFileSync(path.join(dir, 'index.js'), '');
    const tree = generateTree(dir);
    assert.ok(!tree.includes('node_modules'));
    assert.ok(!tree.includes('.env'));
    assert.ok(tree.includes('index.js'));
    cleanTmpDir(dir);
  });

  it('returns empty string for empty directory', () => {
    const dir = makeTmpDir();
    const tree = generateTree(dir);
    assert.equal(tree, '');
    cleanTmpDir(dir);
  });
});

// ---- countFiles ----

describe('countFiles', () => {
  it('counts files by extension', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(path.join(dir, 'a.js'), '');
    fs.writeFileSync(path.join(dir, 'b.js'), '');
    fs.writeFileSync(path.join(dir, 'c.ts'), '');
    const stats = countFiles(dir);
    assert.equal(stats['.js'], 2);
    assert.equal(stats['.ts'], 1);
    cleanTmpDir(dir);
  });

  it('returns empty object for empty directory', () => {
    const dir = makeTmpDir();
    const stats = countFiles(dir);
    assert.deepStrictEqual(stats, {});
    cleanTmpDir(dir);
  });
});
