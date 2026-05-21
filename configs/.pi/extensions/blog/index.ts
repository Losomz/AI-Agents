/**
 * Blog Extension
 *
 * Provides a layered /blog command for generating product, technical, and work logs.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

type BlogOperation = "product" | "tech" | "work";

type GitContext = {
	cwd: string;
	currentDate: string;
	status: string;
	latestTags: string;
	latestTag: string | null;
	rangeLabel: string;
	commitLog: string;
	commitStats: string;
	changedFiles: string;
};

const BLOG_OPERATIONS: Array<{ value: BlogOperation; label: string; description: string }> = [
	{ value: "product", label: "product", description: "面向消费者/玩家/用户的产品级更新日志" },
	{ value: "tech", label: "tech", description: "面向技术人员的技术变更日志" },
	{ value: "work", label: "work", description: "面向公司内部的工作日志" },
];

const OPERATION_ALIASES: Record<string, BlogOperation> = {
	product: "product",
	products: "product",
	consumer: "product",
	customer: "product",
	player: "product",
	user: "product",
	users: "product",
	release: "product",
	changelog: "product",
	"product-changelog": "product",
	产品: "product",
	用户: "product",
	玩家: "product",
	消费者: "product",

	tech: "tech",
	technical: "tech",
	dev: "tech",
	developer: "tech",
	developers: "tech",
	engineering: "tech",
	engineer: "tech",
	"tech-changelog": "tech",
	技术: "tech",
	开发: "tech",
	研发: "tech",

	work: "work",
	internal: "work",
	report: "work",
	worklog: "work",
	"work-log": "work",
	公司: "work",
	内部: "work",
	工作: "work",
	汇报: "work",
};

function today(): string {
	const date = new Date();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

function truncate(value: string, maxChars = 50000): string {
	if (value.length <= maxChars) return value;
	return `${value.slice(0, maxChars)}\n\n[truncated: ${value.length - maxChars} more chars omitted by /blog extension]`;
}

function normalizeOperation(value: string): BlogOperation | undefined {
	return OPERATION_ALIASES[value.trim().toLowerCase()];
}

function parseArgs(args: string): { operation?: BlogOperation; extraInstructions: string; unknown?: string } {
	const trimmed = args.trim();
	if (!trimmed) return { extraInstructions: "" };

	const [first = "", ...rest] = trimmed.split(/\s+/);
	const operation = normalizeOperation(first);
	if (!operation) {
		return { extraInstructions: rest.join(" "), unknown: first };
	}
	return { operation, extraInstructions: rest.join(" ") };
}

function rangeArgs(latestTag: string | null): string[] {
	return latestTag ? [`${latestTag}..HEAD`] : [];
}

async function execText(pi: ExtensionAPI, command: string, args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
	const result = await pi.exec(command, args);
	return {
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? "",
		code: result.code ?? 0,
	};
}

async function collectGitContext(pi: ExtensionAPI, ctx: ExtensionContext): Promise<GitContext | null> {
	const repoCheck = await execText(pi, "git", ["rev-parse", "--show-toplevel"]);
	if (repoCheck.code !== 0) {
		ctx.ui.notify("/blog must be run inside a git repository", "error");
		return null;
	}

	const status = await execText(pi, "git", ["status", "--short", "--branch"]);
	const tags = await execText(pi, "git", ["tag", "-l", "--sort=-version:refname"]);
	const latestTagResult = await execText(pi, "git", ["describe", "--tags", "--abbrev=0"]);
	const latestTag = latestTagResult.code === 0 && latestTagResult.stdout.trim() ? latestTagResult.stdout.trim() : null;
	const range = rangeArgs(latestTag);
	const rangeLabel = latestTag ? `${latestTag}..HEAD` : "project start..HEAD";

	const commitLog = await execText(pi, "git", ["log", ...range, "--oneline", "--no-merges"]);
	if (latestTag && commitLog.stdout.trim().length === 0) {
		ctx.ui.notify(`No commits since latest tag ${latestTag}`, "info");
		return null;
	}

	const commitStats = await execText(pi, "git", [
		"log",
		...range,
		"--stat",
		"--no-merges",
		"--date=short",
		"--pretty=format:%h %ad %s",
	]);
	const changedFiles = await execText(pi, "git", [
		"log",
		...range,
		"--name-status",
		"--no-merges",
		"--pretty=format:commit %h %s",
	]);

	return {
		cwd: ctx.cwd,
		currentDate: today(),
		status: truncate(status.stdout || status.stderr || "(no status output)", 12000),
		latestTags: truncate(tags.stdout.split("\n").slice(0, 20).join("\n") || "(no tags found)", 12000),
		latestTag,
		rangeLabel,
		commitLog: truncate(commitLog.stdout || "(no commits found)", 20000),
		commitStats: truncate(commitStats.stdout || "(no commit stats found)", 50000),
		changedFiles: truncate(changedFiles.stdout || "(no changed files found)", 50000),
	};
}

function buildCommonInstructions(git: GitContext, extraInstructions: string): string {
	return `## 执行规则

你正在响应 Pi 扩展命令 \`/blog\`。请基于 Git 历史生成指定类型的日志。

### 安全与边界

1. 默认只生成或更新目标日志文件，不要自动 \`git commit\`、不要创建 tag、不要 \`git push\`。
2. 只有当用户在额外要求中明确要求“提交 / 发布 / tag / push”时，才可以执行对应 Git 操作。
3. 如果工作区存在未提交内容，日志仍默认只基于已提交 commit 生成；不要把未提交业务改动混入日志提交。
4. 如果需要更多上下文，可以使用 \`git show <commit> --stat\`、\`git show <commit>\`、\`read\` 等工具继续检查。
5. 如目标目录 \`docs/\` 不存在，可以创建。
6. 输出和写入文件均使用中文。
7. 更新已有日志文件时，在标题后方插入最新章节，保留历史内容。

### 当前信息

- 当前目录：\`${git.cwd}\`
- 当前日期：\`${git.currentDate}\`
- 最新 tag：\`${git.latestTag ?? "无"}\`
- 分析范围：\`${git.rangeLabel}\`

### 用户额外要求

${extraInstructions.trim() ? extraInstructions.trim() : "（无）"}

### Git Status

\`\`\`
${git.status}
\`\`\`

### Latest Tags

\`\`\`
${git.latestTags}
\`\`\`

### Commits In Scope

\`\`\`
${git.commitLog}
\`\`\`

### Commit Stats

\`\`\`
${git.commitStats}
\`\`\`

### Changed Files

\`\`\`
${git.changedFiles}
\`\`\``;
}

function buildProductPrompt(git: GitContext, extraInstructions: string): string {
	return `请生成【面向消费者/玩家/用户的产品级更新日志】。

${buildCommonInstructions(git, extraInstructions)}

## 目标文件

更新或创建：\`docs/CHANGELOG.md\`

## 写作目标

这份日志给最终用户看。请把技术 commit 转换成用户能理解的体验变化，重点说明“用户能感受到什么变化、获得什么好处”。

## 内容筛选

应包含：
- 用户可见的新功能、新内容、新玩法、新流程
- 用户体验优化、性能体感优化、交互/界面优化
- 用户可能遇到的问题修复

默认跳过：
- 纯代码重构
- 纯文档更新
- 构建、CI、依赖、内部工具调整
- 无用户感知的工程化改动

## 分类

只输出有内容的分类：

1. 新增内容
2. 优化改进
3. 问题修复

## 版本号规则

1. 如果最新 tag 是 \`vMAJOR.MINOR.PATCH\`：
   - 只要存在“新增内容”，递增 MINOR，PATCH 归零
   - 如果只有“优化改进”或“问题修复”，递增 PATCH
   - 0.x 阶段不要自动递增 MAJOR
2. 如果没有 tag，从 \`v0.0.1\` 开始。
3. 如果用户额外要求中指定版本号，以用户指定为准。

## 推荐章节格式

\`\`\`markdown
## [v0.1.0] - ${git.currentDate}

> 自 ${git.latestTag ?? "项目开始"} 以来的用户可见改动。

### 新增内容

- ...

### 优化改进

- ...

### 问题修复

- ...
\`\`\`

## 最终反馈

完成后请告诉我：
- 写入的文件路径
- 生成的版本号和日期
- 本次包含/跳过的大致内容
- 是否执行了 commit/tag/push（默认应为否）`;
}

function buildTechPrompt(git: GitContext, extraInstructions: string): string {
	return `请生成【面向技术人员的技术变更日志】。

${buildCommonInstructions(git, extraInstructions)}

## 目标文件

更新或创建：\`docs/TECH_CHANGELOG.md\`

## 写作目标

这份日志给开发、测试、维护者、技术负责人看。请保留必要技术信息，说明模块、架构、接口、数据、构建、兼容性、风险和迁移影响。

## 内容筛选

应包含：
- 功能实现和模块变化
- 架构调整、重构、抽象、目录/职责变化
- Bug 修复和稳定性处理
- 性能优化、资源优化、异常处理
- 构建、CI、依赖、工具链、配置变化
- 测试、质量保障、验证方式
- 潜在风险、兼容性影响、迁移说明

可以跳过：
- 无技术价值的纯格式调整
- 重复或噪声 commit

## 分类

只输出有内容的分类：

1. 功能变更
2. 架构/重构
3. 问题修复
4. 性能/稳定性
5. 构建/工程化
6. 测试/质量
7. 风险与迁移说明

## 推荐章节格式

\`\`\`markdown
## [${git.latestTag ? `${git.latestTag} 后续变更` : "未发布"}] - ${git.currentDate}

> 分析范围：${git.rangeLabel}

### 功能变更

- ...（commit: abc123）

### 风险与迁移说明

- ...
\`\`\`

## 要求

- 条目可以带短 commit hash，方便追溯。
- 不要把内容写成面向用户的营销文案。
- 对不确定的技术影响，用“可能/需要验证”表述，不要编造。

## 最终反馈

完成后请告诉我：
- 写入的文件路径
- 覆盖的 commit 范围
- 主要技术变更摘要
- 是否执行了 commit/tag/push（默认应为否）`;
}

function buildWorkPrompt(git: GitContext, extraInstructions: string): string {
	return `请生成【每日工作日志】。

${buildCommonInstructions(git, extraInstructions)}

## 目标文件

更新或创建：\`docs/WORKLOG.md\`

## 写作目标

这不是正式汇报、周报或发布说明，只需要基于 Git 提交总结“今天做了哪些模块/事项”。语气自然、简洁，像日常工作日志。

## 内容筛选

只保留有实际工作意义的内容：
- 功能开发、玩法/活动/界面流程调整
- bug 修复、体验优化、表现优化
- 本地化、配置、工具、数据、接入等确实完成的事项

默认过滤：
- merge commit
- 临时提交、回滚噪音、纯格式化、无意义改名
- 重复 commit 或同一事项的碎片化提交
- 过细的代码实现细节、文件名堆砌、内部过程描述

整理方式：
- 按模块或事项合并同类 commit。
- 每条一句话，描述“做了什么”，必要时补充“解决了什么问题”。
- 不要写风险、阻塞、后续计划、影响范围、协作说明等正式汇报字段。
- 不要写 commit hash，除非用户额外要求。

## 推荐章节格式

\`\`\`markdown
## ${git.currentDate}

今日工作内容

修复第二关护盾教程引导流程，调整护盾引导层级，并补全相关奖励中文文案。
修复关卡墙体剔除逻辑，避免刺墙或其他实体被错误隐藏导致关卡元素缺失。
优化关卡结算表现，让点数进度先完整点亮，再进入金币奖励弹窗。
\`\`\`

## 写作要求

- 标题使用日期：\`## ${git.currentDate}\`。
- 日期下方固定写：\`今日工作内容\`。
- 正文直接逐行列出工作内容，不使用复杂分级标题。
- 每条尽量 20~60 个中文字符，清楚但不要太正式。
- 如果某天只有工具/配置类工作，也可以写，但要合并成一条自然描述。

## 最终反馈

完成后请告诉我：
- 写入的文件路径
- 覆盖的 commit 范围
- 生成了多少条工作内容
- 是否执行了 commit/tag/push（默认应为否）`;
}

function buildPrompt(operation: BlogOperation, git: GitContext, extraInstructions: string): string {
	if (operation === "product") return buildProductPrompt(git, extraInstructions);
	if (operation === "tech") return buildTechPrompt(git, extraInstructions);
	return buildWorkPrompt(git, extraInstructions);
}

async function handleBlogOperation(pi: ExtensionAPI, ctx: ExtensionContext, operation: BlogOperation, extraInstructions: string): Promise<void> {
	const git = await collectGitContext(pi, ctx);
	if (!git) return;

	const prompt = buildPrompt(operation, git, extraInstructions);
	pi.sendUserMessage(prompt);
}

export default function (pi: ExtensionAPI) {
	pi.registerCommand("blog", {
		description: "Generate product notes, technical changelog, or internal work log",
		getArgumentCompletions: (prefix: string) => {
			const normalizedPrefix = prefix.trim().toLowerCase();
			const items = BLOG_OPERATIONS.map((operation) => ({
				value: operation.value,
				label: operation.label,
				description: operation.description,
			}));
			const filtered = items.filter((item) => item.value.startsWith(normalizedPrefix));
			return filtered.length > 0 ? filtered : null;
		},
		handler: async (args, ctx) => {
			const parsed = parseArgs(args);
			let operation = parsed.operation;

			if (parsed.unknown) {
				ctx.ui.notify(
					`Unknown blog type: ${parsed.unknown}. Use /blog product, /blog tech, or /blog work.`,
					"error",
				);
				return;
			}

			if (!operation) {
				const choice = await ctx.ui.select(
					"Blog type",
					BLOG_OPERATIONS.map((item) => item.value),
				);
				if (!choice) {
					ctx.ui.notify("Blog generation cancelled", "info");
					return;
				}
				operation = choice as BlogOperation;
			}

			await handleBlogOperation(pi, ctx, operation, parsed.extraInstructions);
		},
	});
}
