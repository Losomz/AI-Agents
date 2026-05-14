/**
 * Git Commit Extension
 *
 * Provides /commit command for git commit and push with conventional commits format.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	pi.registerCommand("commit", {
		description: "Git commit and push with conventional commits format",
		handler: async (args, ctx) => {
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
		},
	});
}
