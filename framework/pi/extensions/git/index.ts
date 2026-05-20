/**
 * Git Extension
 *
 * Provides a layered /git command for git operations.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const GIT_OPERATIONS = [
	{ value: "commit", label: "commit", description: "Commit and push changes" },
	{ value: "pull", label: "pull", description: "Pull from remote repository" },
];

async function handleGitCommit(pi: ExtensionAPI, ctx: ExtensionContext): Promise<void> {
	// Check git status
	const { stdout: status, code: statusCode } = await pi.exec("git", ["status", "--porcelain"]);

	if (statusCode !== 0) {
		ctx.ui.notify("Not a git repository", "error");
		return;
	}

	if (status.trim().length === 0) {
		ctx.ui.notify("No changes to commit", "info");
		return;
	}

	// Get git diff
	const { stdout: diffCached } = await pi.exec("git", ["diff", "--cached"]);
	const { stdout: diffUnstaged } = await pi.exec("git", ["diff"]);

	// Build context message for AI
	const contextMessage = `请帮我提交代码。

## 提交信息格式要求

使用中文编写提交信息，格式：\`{emoji} type(scope): description\`

- 按照 gitmoji 规范 + 约定式提交（Conventional Commits）规范
- 例如：\`✨ feat(extensions): 添加 git 提交命令\`
- 主题开头选择合适的 emoji
- type 选择合适的类型（feat/fix/docs/style/refactor/perf/test/build/ci/chore/revert）
- scope 使用受影响的模块或功能名，不明确可省略
- description 用中文说明"为什么"做这个改动
- 主题行长度控制在 72 个字符以内

## Git Status

\`\`\`
${status}
\`\`\`

## Git Diff (Staged)

\`\`\`diff
${diffCached || "(no staged changes)"}
\`\`\`

## Git Diff (Unstaged)

\`\`\`diff
${diffUnstaged || "(no unstaged changes)"}
\`\`\`

请分析改动内容，生成合适的提交信息，然后执行：
1. \`git add -A\` 暂存所有改动
2. \`git commit -m "提交信息"\` 提交
3. \`git push\` 推送

如果有冲突或错误，通知我手动处理。`;

	// Send message to AI
	pi.sendUserMessage(contextMessage);
}

async function handleGitPull(pi: ExtensionAPI, ctx: ExtensionContext): Promise<void> {
	// Check if it's a git repository
	const { code: statusCode } = await pi.exec("git", ["status"]);
	if (statusCode !== 0) {
		ctx.ui.notify("Not a git repository", "error");
		return;
	}

	// Check for uncommitted changes
	const { stdout: status } = await pi.exec("git", ["status", "--porcelain"]);
	if (status.trim().length > 0) {
		const choice = await ctx.ui.select("You have uncommitted changes. What do you want to do?", [
			"Stash changes and pull",
			"Commit changes first",
			"Cancel pull",
		]);

		if (!choice || choice === "Cancel pull") {
			ctx.ui.notify("Pull cancelled", "info");
			return;
		}

		if (choice === "Stash changes and pull") {
			ctx.ui.notify("Stashing changes...", "info");
			const { code: stashCode } = await pi.exec("git", ["stash", "push", "-m", "Auto-stash before pull"]);
			if (stashCode !== 0) {
				ctx.ui.notify("Failed to stash changes", "error");
				return;
			}
		}

		if (choice === "Commit changes first") {
			ctx.ui.notify("Please commit your changes first using /git commit", "info");
			return;
		}
	}

	// Get current branch
	const { stdout: branch } = await pi.exec("git", ["branch", "--show-current"]);
	const currentBranch = branch.trim();

	ctx.ui.notify(`Pulling from ${currentBranch}...`, "info");

	// Execute git pull
	const { stdout: pullOutput, stderr: pullError, code: pullCode } = await pi.exec("git", ["pull"]);

	if (pullCode === 0) {
		ctx.ui.notify("Pull successful!", "info");

		// Show pull result
		if (pullOutput.includes("Already up to date")) {
			ctx.ui.notify("Already up to date", "info");
		} else {
			ctx.ui.notify(`Pull result:\n${pullOutput}`, "info");
		}

		// If we stashed, ask to restore
		const { stdout: stashList } = await pi.exec("git", ["stash", "list"]);
		if (stashList.includes("Auto-stash before pull")) {
			const restore = await ctx.ui.confirm("Restore stashed changes?", "Do you want to restore your stashed changes?");

			if (restore) {
				const { code: popCode, stderr: popError } = await pi.exec("git", ["stash", "pop"]);
				if (popCode === 0) {
					ctx.ui.notify("Stashed changes restored", "info");
				} else {
					ctx.ui.notify(`Failed to restore stash:\n${popError}`, "error");
				}
			}
		}
	} else {
		// Pull failed
		if (pullError.includes("CONFLICT") || pullOutput.includes("CONFLICT")) {
			ctx.ui.notify("Pull failed: Merge conflicts detected", "error");
			ctx.ui.notify(
				"Please resolve conflicts manually:\n1. Check conflicted files with: git status\n2. Edit files to resolve conflicts\n3. Stage resolved files: git add <file>\n4. Complete merge: git commit",
				"info",
			);
		} else {
			ctx.ui.notify(`Pull failed:\n${pullError || pullOutput}`, "error");
		}
	}
}

function normalizeGitOperation(args: string): string {
	return args.trim().toLowerCase();
}

export default function (pi: ExtensionAPI) {
	pi.registerCommand("git", {
		description: "Git operations",
		getArgumentCompletions: (prefix: string) => {
			const normalizedPrefix = prefix.trim().toLowerCase();
			const items = GIT_OPERATIONS.map((operation) => ({
				value: operation.value,
				label: operation.label,
				description: operation.description,
			}));
			const filtered = items.filter((item) => item.value.startsWith(normalizedPrefix));
			return filtered.length > 0 ? filtered : null;
		},
		handler: async (args, ctx) => {
			let operation = normalizeGitOperation(args);

			if (!operation) {
				const choice = await ctx.ui.select(
					"Git operation",
					GIT_OPERATIONS.map((item) => item.value),
				);
				if (!choice) {
					ctx.ui.notify("Git operation cancelled", "info");
					return;
				}
				operation = choice;
			}

			if (operation === "commit") {
				await handleGitCommit(pi, ctx);
				return;
			}

			if (operation === "pull") {
				await handleGitPull(pi, ctx);
				return;
			}

			ctx.ui.notify(`Unknown git operation: ${operation}. Use /git commit or /git pull.`, "error");
		},
	});
}
