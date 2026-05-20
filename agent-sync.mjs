#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';

const DEFAULT_REPO_URL = process.env.AGENTFRAMEWORK_REPO_URL || 'git@github.com:Losomz/AgentFramework.git';
const DEFAULT_REF = process.env.AGENTFRAMEWORK_REF || 'main';
const CACHE_ROOT = process.env.AGENTFRAMEWORK_HOME || path.join(os.homedir(), '.agentframework');
const CACHE_REPO_DIR = path.join(CACHE_ROOT, 'repo');
const PROJECT_DIR = process.cwd();
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

const rawArgs = process.argv.slice(2);
const flags = new Set(rawArgs.filter((arg) => arg.startsWith('--')));
const selectedPackageArg = rawArgs.find((arg) => !arg.startsWith('--'));
const assumeYes = flags.has('--yes') || flags.has('-y');
const useLocalSource = flags.has('--local');

const syncPackages = [
  {
    name: 'pi',
    title: 'Pi 配置',
    description: '同步 Pi extensions（git、plan-mode、subagent 等）',
    targets: [
      {
        from: 'configs/pi/extensions',
        to: '.pi/extensions',
        after: '请在 Pi 中执行 /reload 重新加载扩展。',
      },
    ],
  },
  {
    name: 'opencode',
    title: 'OpenCode 配置',
    description: '同步 OpenCode commands、skills 和基础配置',
    targets: [
      { from: 'configs/opencode/commands', to: '.opencode/commands' },
      { from: 'configs/opencode/skills', to: '.opencode/skills' },
      { from: 'configs/opencode/opencode.json', to: '.opencode/opencode.json' },
      { from: 'configs/opencode/README.md', to: '.opencode/README.md' },
    ],
  },
];

function printUsage() {
  console.log(`AgentFramework Sync\n\nUsage:\n  node agent-sync.mjs                # 交互选择同步内容\n  node agent-sync.mjs pi             # 同步 Pi 配置\n  node agent-sync.mjs opencode       # 同步 OpenCode 配置\n  node agent-sync.mjs all --yes      # 同步全部且不询问确认\n  node agent-sync.mjs pi --local     # 开发期：从当前仓库 configs/ 同步，不拉远程\n\nEnvironment:\n  AGENTFRAMEWORK_REPO_URL=${DEFAULT_REPO_URL}\n  AGENTFRAMEWORK_REF=${DEFAULT_REF}\n  AGENTFRAMEWORK_HOME=${CACHE_ROOT}\n`);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: options.stdio || 'pipe',
      shell: false,
      env: { ...process.env, ...options.env },
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
      if (options.stdio === 'inherit') process.stdout.write(chunk);
    });

    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
      if (options.stdio === 'inherit') process.stderr.write(chunk);
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
        return;
      }
      reject(new Error(stderr.trim() || `${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`));
    });
  });
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureTool(command, hint) {
  try {
    await run(command, ['--version']);
  } catch {
    throw new Error(hint);
  }
}

async function ensureRepo() {
  if (useLocalSource) {
    return SCRIPT_DIR;
  }

  await ensureTool('git', '未检测到 git，请先安装 git。');
  await fs.mkdir(CACHE_ROOT, { recursive: true });

  if (!await pathExists(path.join(CACHE_REPO_DIR, '.git'))) {
    console.log(`首次同步，正在拉取 AgentFramework: ${DEFAULT_REPO_URL}`);
    await run('git', ['clone', '--depth', '1', '--branch', DEFAULT_REF, DEFAULT_REPO_URL, CACHE_REPO_DIR], {
      stdio: 'inherit',
    });
    return CACHE_REPO_DIR;
  }

  console.log('正在更新 AgentFramework 缓存...');
  await run('git', ['remote', 'set-url', 'origin', DEFAULT_REPO_URL], { cwd: CACHE_REPO_DIR });
  await run('git', ['fetch', '--depth', '1', 'origin', DEFAULT_REF], { cwd: CACHE_REPO_DIR, stdio: 'inherit' });
  await run('git', ['checkout', DEFAULT_REF], { cwd: CACHE_REPO_DIR, stdio: 'inherit' });
  await run('git', ['reset', '--hard', `origin/${DEFAULT_REF}`], { cwd: CACHE_REPO_DIR, stdio: 'inherit' });
  return CACHE_REPO_DIR;
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function backupTarget(targetPath, backupRoot) {
  if (!await pathExists(targetPath)) {
    return null;
  }

  const relative = path.relative(PROJECT_DIR, targetPath);
  const backupPath = path.join(backupRoot, relative);
  await fs.mkdir(path.dirname(backupPath), { recursive: true });
  await fs.cp(targetPath, backupPath, { recursive: true, force: true });
  return backupPath;
}

async function syncTarget(repoRoot, target, backupRoot) {
  const sourcePath = path.join(repoRoot, target.from);
  const targetPath = path.join(PROJECT_DIR, target.to);

  if (!await pathExists(sourcePath)) {
    throw new Error(`同步源不存在: ${sourcePath}`);
  }

  const backupPath = await backupTarget(targetPath, backupRoot);
  await fs.rm(targetPath, { recursive: true, force: true });
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.cp(sourcePath, targetPath, { recursive: true, force: true });

  return { sourcePath, targetPath, backupPath };
}

async function confirm(message) {
  if (assumeYes) return true;
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(`${message} [y/N] `);
    return answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes';
  } finally {
    rl.close();
  }
}

async function selectPackage() {
  if (selectedPackageArg) {
    if (selectedPackageArg === 'all') return syncPackages;
    const pkg = syncPackages.find((item) => item.name === selectedPackageArg);
    if (!pkg) {
      throw new Error(`未知同步包: ${selectedPackageArg}`);
    }
    return [pkg];
  }

  console.log('请选择要同步的内容：');
  syncPackages.forEach((pkg, index) => {
    console.log(`  ${index + 1}. ${pkg.title} - ${pkg.description}`);
  });
  console.log(`  ${syncPackages.length + 1}. all - 全部`);
  console.log('');

  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question('请输入序号或名称: ');
    const value = answer.trim();
    if (value === 'all' || Number(value) === syncPackages.length + 1) return syncPackages;
    const byName = syncPackages.find((item) => item.name === value);
    if (byName) return [byName];
    const byIndex = syncPackages[Number(value) - 1];
    if (byIndex) return [byIndex];
    throw new Error(`无效选择: ${value}`);
  } finally {
    rl.close();
  }
}

async function main() {
  if (flags.has('--help') || flags.has('-h')) {
    printUsage();
    return;
  }

  console.log('====================================');
  console.log('       AgentFramework Sync');
  console.log('====================================');
  console.log(`目标项目: ${PROJECT_DIR}`);
  console.log(`来源模式: ${useLocalSource ? 'local' : 'git cache'}`);
  if (!useLocalSource) {
    console.log(`仓库: ${DEFAULT_REPO_URL}#${DEFAULT_REF}`);
  }
  console.log('');

  const packages = await selectPackage();
  const repoRoot = await ensureRepo();
  const backupRoot = path.join(PROJECT_DIR, '.agentframework', 'backups', timestamp());

  console.log('将同步：');
  for (const pkg of packages) {
    console.log(`- ${pkg.title}`);
    for (const target of pkg.targets) {
      console.log(`  ${target.from} -> ${target.to}`);
    }
  }
  console.log(`备份目录: ${backupRoot}`);
  console.log('');

  if (!await confirm('确认继续同步并覆盖目标目录吗？')) {
    console.log('已取消同步。');
    return;
  }

  for (const pkg of packages) {
    console.log(`\n同步 ${pkg.title}...`);
    for (const target of pkg.targets) {
      const result = await syncTarget(repoRoot, target, backupRoot);
      if (result.backupPath) console.log(`  ✓ 已备份: ${path.relative(PROJECT_DIR, result.backupPath)}`);
      console.log(`  ✓ 已同步: ${target.from} -> ${target.to}`);
      if (target.after) console.log(`  提示: ${target.after}`);
    }
  }

  console.log('\n同步完成。');
}

main().catch((error) => {
  console.error('同步失败:', error.message);
  process.exitCode = 1;
});
