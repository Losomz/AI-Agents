/**
 * Subagent Shortcut Extension
 * 
 * 提供 /sub 命令快速召唤子代理
 * 
 * 用法：
 *   /sub
 *   然后从弹窗中选择代理和执行模式
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { discoverAgents } from "./subagent/agents.js";

export default function (pi: ExtensionAPI) {
	pi.registerCommand("sub", {
		description: "快速召唤子代理 (subagent)",
		handler: async (args, ctx) => {
			// 发现可用的代理
			const result = discoverAgents(ctx.cwd, "both");
			const agents = result.agents;
			
			if (agents.length === 0) {
				ctx.ui.notify("未找到可用的代理", "warning");
				return;
			}

			// 步骤1: 选择执行模式
			const modes = [
				"单个代理 - 执行一个任务",
				"并行执行 - 多个代理同时工作",
				"链式执行 - 代理依次处理"
			];
			
			const modeChoice = await ctx.ui.select("选择执行模式", modes);
			if (!modeChoice) return;

			const modeIndex = modes.indexOf(modeChoice);

			// 步骤2: 选择代理
			const agentOptions = agents.map(a => ({
				value: a.name,
				label: `${a.name} - ${a.description || '无描述'}`
			}));

			let selectedAgents: string[] = [];

			if (modeIndex === 0) {
				// 单个代理
				const agent = await ctx.ui.select(
					"选择代理",
					agentOptions.map(a => a.label)
				);
				if (!agent) return;
				const agentName = agent.split(" - ")[0];
				selectedAgents = [agentName];
			} else {
				// 并行或链式 - 需要多选
				ctx.ui.notify("请在任务描述中指定代理，例如: scout, planner", "info");
				const agentList = await ctx.ui.input("输入代理名称 (用逗号分隔)");
				if (!agentList) return;
				selectedAgents = agentList.split(',').map(a => a.trim());
			}

			// 步骤3: 输入任务描述
			const task = await ctx.ui.input("输入任务描述");
			if (!task) return;

			// 步骤4: 构建命令并注入
			let command = "";
			
			if (modeIndex === 0) {
				// 单个代理
				command = `Use ${selectedAgents[0]} to ${task}`;
			} else if (modeIndex === 1) {
				// 并行执行
				const taskDescriptions = selectedAgents.map(agent => 
					`${agent} to ${task}`
				).join(', ');
				command = `Run ${selectedAgents.length} agents in parallel: ${taskDescriptions}`;
			} else {
				// 链式执行
				const chainDescription = selectedAgents.map((agent, i) => {
					if (i === 0) {
						return `first have ${agent} ${task}`;
					} else if (i === selectedAgents.length - 1) {
						return `then have ${agent} implement based on the previous output`;
					} else {
						return `then have ${agent} refine the previous output`;
					}
				}).join(', ');
				command = `Use a chain: ${chainDescription}`;
			}

			// 注入命令
			ctx.ui.notify(`执行: ${command}`, "info");
			await ctx.injectUserMessage(command);
		}
	});
}
