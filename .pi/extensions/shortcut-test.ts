/**
 * Shortcut Test Extension
 * 
 * 测试 registerShortcut API 是否正常工作
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	// 测试 1: 使用 F12（不太常用的键）
	pi.registerShortcut("f12", {
		description: "Test shortcut F12",
		handler: async (ctx) => {
			ctx.ui.notify("✅ F12 快捷键工作了！", "success");
		},
	});

	// 测试 2: 使用 Ctrl+Shift+T（另一个组合）
	pi.registerShortcut("ctrl+shift+t", {
		description: "Test shortcut Ctrl+Shift+T",
		handler: async (ctx) => {
			ctx.ui.notify("✅ Ctrl+Shift+T 快捷键工作了！", "success");
		},
	});

	// 测试 3: 使用 Ctrl+Alt+P（Plan Mode 原来的）
	pi.registerShortcut("ctrl+alt+p", {
		description: "Test shortcut Ctrl+Alt+P",
		handler: async (ctx) => {
			ctx.ui.notify("✅ Ctrl+Alt+P 快捷键工作了！", "success");
		},
	});

	// 测试 4: 使用 F2（README 中提到的）
	pi.registerShortcut("f2", {
		description: "Test shortcut F2",
		handler: async (ctx) => {
			ctx.ui.notify("✅ F2 快捷键工作了！", "success");
		},
	});

	// 启动时通知，确认扩展已加载
	pi.on("session_start", async (_event, ctx) => {
		ctx.ui.notify("🧪 快捷键测试扩展已加载！\n尝试按：F12、F2、Ctrl+Shift+T 或 Ctrl+Alt+P", "info");
	});

	// 注册一个测试命令
	pi.registerCommand("test-shortcut", {
		description: "测试快捷键是否注册成功",
		handler: async (_args, ctx) => {
			ctx.ui.notify("命令工作正常！快捷键应该也能工作。", "info");
		},
	});
}
