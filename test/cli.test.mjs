import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCliArgs } from '../bin/adev.mjs';

describe('parseCliArgs', () => {
  it('parses init command', () => {
    const result = parseCliArgs(['init']);
    assert.equal(result.command, 'init');
    assert.equal(result.skipPrompts, false);
  });

  it('parses scan command', () => {
    const result = parseCliArgs(['scan']);
    assert.equal(result.command, 'scan');
  });

  it('parses -y flag', () => {
    const result = parseCliArgs(['scan', '-y']);
    assert.equal(result.command, 'scan');
    assert.equal(result.skipPrompts, true);
  });

  it('parses --yes flag', () => {
    const result = parseCliArgs(['init', '--yes']);
    assert.equal(result.skipPrompts, true);
  });

  it('-y flag is not treated as directory', () => {
    const result = parseCliArgs(['scan', '-y']);
    assert.notEqual(result.targetDir, '-y');
  });

  it('parses target directory', () => {
    const result = parseCliArgs(['init', './my-project']);
    assert.equal(result.command, 'init');
    assert.equal(result.targetDir, './my-project');
  });

  it('parses directory with -y flag', () => {
    const result = parseCliArgs(['scan', '-y', './app']);
    assert.equal(result.command, 'scan');
    assert.equal(result.skipPrompts, true);
    assert.equal(result.targetDir, './app');
  });

  it('returns help for empty args', () => {
    const result = parseCliArgs([]);
    assert.equal(result.command, 'help');
  });

  it('returns help for -h flag', () => {
    const result = parseCliArgs(['-h']);
    assert.equal(result.command, 'help');
  });

  it('returns help for --help flag', () => {
    const result = parseCliArgs(['--help']);
    assert.equal(result.command, 'help');
  });

  it('returns help for help command', () => {
    const result = parseCliArgs(['help']);
    assert.equal(result.command, 'help');
  });

  it('passes through unknown commands', () => {
    const result = parseCliArgs(['unknown']);
    assert.equal(result.command, 'unknown');
  });

  it('parses --lite flag', () => {
    const result = parseCliArgs(['scan', '--lite']);
    assert.equal(result.command, 'scan');
    assert.equal(result.lite, true);
  });

  it('--lite defaults to false', () => {
    const result = parseCliArgs(['scan']);
    assert.equal(result.lite, false);
  });

  it('combines -y and --lite flags', () => {
    const result = parseCliArgs(['scan', '-y', '--lite', './app']);
    assert.equal(result.command, 'scan');
    assert.equal(result.skipPrompts, true);
    assert.equal(result.lite, true);
    assert.equal(result.targetDir, './app');
  });
});
