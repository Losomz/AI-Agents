/**
 * Subagent Shortcut Extension
 * 
 * 提供 @agent 语法糖快速召唤子代理
 * 
 * 用法示例：
 *   @scout 找到所有认证相关的代码
 *   @planner 设计一个缓存系统
 *   @reviewer 审查 src/utils.ts 的改动
 *   @worker 实现用户登录功能
 * 
 * 也支持并行执行：
 *   @scout,planner 分析代码结构并给出重构建议
 * 
 * 链式执行：
 *   @scout->planner->worker 先侦查，再规划，最后实现
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	pi.on("input", async (event, ctx) => {
		// 跳过扩展注入的消息
		if (event.source === "extension") {
			return { action: "continue" };
		}

		const text = event.text.trim();

		// 检测 @agent 语法
		const singleMatch = text.match(/^@(\w+)\s+(.+)$/);
		if (singleMatch) {
			const [, agent, task] = singleMatch;
			return {
				action: "transform",
				text: `Use ${agent} to ${task}`
			};
		}

		// 检测并行语法 @agent1,agent2 task
		const parallelMatch = text.match(/^@([\w,]+)\s+(.+)$/);
		if (parallelMatch) {
			const [, agents, task] = parallelMatch;
			const agentList = agents.split(',').map(a => a.trim());
			
			if (agentList.length > 1) {
				const taskDescriptions = agentList.map(agent => 
					`${agent} to ${task}`
				).join(', ');
				return {
					action: "transform",
					text: `Run ${agentList.length} agents in parallel: ${taskDescriptions}`
				};
			}
		}

		// 检测链式语法 @agent1->agent2->agent3 task
		const chainMatch = text.match(/^@([\w\->]+)\s+(.+)$/);
		if (chainMatch) {
			const [, chain, task] = chainMatch;
			if (chain.includes('->')) {
				const agents = chain.split('->').map(a => a.trim());
				const chainDescription = agents.map((agent, i) => {
					if (i === 0) {
						return `first have ${agent} ${task}`;
					} else if (i === agents.length - 1) {
						return `then have ${agent} implement based on the previous output`;
					} else {
						return `then have ${agent} refine the previous output`;
					}
				}).join(', ');
				
				return {
					action: "transform",
					text: `Use a chain: ${chainDescription}`
				};
			}
		}

		return { action: "continue" };
	});
}
