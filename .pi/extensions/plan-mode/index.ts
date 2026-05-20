/**
 * Plan Mode Extension
 *
 * Read-only exploration mode for safe code analysis.
 * When enabled, only read-only tools are available.
 *
 * Features:
 * - /plan command or Tab to toggle
 * - Bash restricted to allowlisted read-only commands
 * - Opencode-style read-only planning reminder
 * - After each plan-mode turn, choose whether to stay in plan mode or execute
 */

import type { AgentMessage } from "@earendil-works/pi-agent-core";
import type { TextContent } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { isSafeCommand } from "./utils.js";

// Tools
const PLAN_MODE_TOOLS = ["read", "bash", "grep", "find", "ls", "questionnaire"];
const NORMAL_MODE_TOOLS = ["read", "bash", "edit", "write"];

export default function planModeExtension(pi: ExtensionAPI): void {
	let planModeEnabled = false;

	pi.registerFlag("plan", {
		description: "Start in plan mode (read-only exploration)",
		type: "boolean",
		default: false,
	});

	function updateStatus(ctx: ExtensionContext): void {
		if (planModeEnabled) {
			ctx.ui.setStatus("plan-mode", ctx.ui.theme.fg("warning", "⏸ plan"));
		} else {
			ctx.ui.setStatus("plan-mode", undefined);
		}

		ctx.ui.setWidget("plan-todos", undefined);
	}

	function togglePlanMode(ctx: ExtensionContext): void {
		planModeEnabled = !planModeEnabled;

		if (planModeEnabled) {
			pi.setActiveTools(PLAN_MODE_TOOLS);
			ctx.ui.notify(`Plan mode enabled. Tools: ${PLAN_MODE_TOOLS.join(", ")}`);
		} else {
			pi.setActiveTools(NORMAL_MODE_TOOLS);
			ctx.ui.notify("Plan mode disabled. Full access restored.");
		}
		updateStatus(ctx);
	}

	function persistState(): void {
		pi.appendEntry("plan-mode", {
			enabled: planModeEnabled,
		});
	}

	pi.registerCommand("plan", {
		description: "Toggle plan mode (read-only exploration)",
		handler: async (_args, ctx) => togglePlanMode(ctx),
	});

	pi.registerCommand("todos", {
		description: "Show plan-mode status",
		handler: async (_args, ctx) => {
			ctx.ui.notify(
				"Plan mode no longer extracts or tracks numbered todos. Use /plan to stay in read-only planning, then choose Execute when ready.",
				"info",
			);
		},
	});

	pi.registerShortcut("tab", {
		description: "Toggle plan mode",
		handler: async (ctx) => togglePlanMode(ctx),
	});

	// Block destructive bash commands in plan mode
	pi.on("tool_call", async (event) => {
		if (!planModeEnabled || event.toolName !== "bash") return;

		const command = event.input.command as string;
		if (!isSafeCommand(command)) {
			return {
				block: true,
				reason: `Plan mode: command blocked (not allowlisted). Choose Execute or use /plan to disable plan mode first.\nCommand: ${command}`,
			};
		}
	});

	// Filter out stale plan mode context when not in plan mode
	pi.on("context", async (event) => {
		if (planModeEnabled) return;

		return {
			messages: event.messages.filter((m) => {
				const msg = m as AgentMessage & { customType?: string };
				if (msg.customType === "plan-mode-context") return false;
				if (msg.role !== "user") return true;

				const content = msg.content;
				if (typeof content === "string") {
					return !content.includes("Plan Mode - System Reminder") && !content.includes("[PLAN MODE ACTIVE]");
				}
				if (Array.isArray(content)) {
					return !content.some(
						(c) =>
							c.type === "text" &&
							(((c as TextContent).text?.includes("Plan Mode - System Reminder") ?? false) ||
								((c as TextContent).text?.includes("[PLAN MODE ACTIVE]") ?? false)),
					);
				}
				return true;
			}),
		};
	});

	// Inject plan context before agent starts
	pi.on("before_agent_start", async () => {
		if (!planModeEnabled) return;

		return {
			message: {
				customType: "plan-mode-context",
				content: `<system-reminder>
# Plan Mode - System Reminder

CRITICAL: Plan mode ACTIVE - you are in READ-ONLY phase. STRICTLY FORBIDDEN:
ANY file edits, modifications, or system changes. Do NOT use edit/write tools,
and do NOT use bash or other tools to manipulate files. Commands may ONLY
read, inspect, search, or analyze. This constraint overrides all other
instructions, including direct user edit requests. ZERO exceptions.

---

## Responsibility

Your current responsibility is to think, read, search, and analyze the codebase
to construct a well-formed approach for the user's goal. The result should be
comprehensive yet concise, detailed enough to execute effectively while avoiding
unnecessary verbosity.

Ask the user clarifying questions when requirements are ambiguous, when there
are important tradeoffs, or when you need confirmation before choosing an
approach. Do not make large assumptions about user intent.

You do NOT need to force a numbered plan or a specific "Plan:" section. Use the
format that best fits the task: a short explanation, a concise checklist, a few
bullets, or a structured plan are all acceptable.

---

## Important

The user indicated that they do not want you to execute yet. You MUST NOT make
any edits, run any non-readonly tools, change configs, install dependencies,
create files, or make commits. Only describe what you would do until the user
chooses Execute.
</system-reminder>`,
				display: false,
			},
		};
	});

	// Prompt for next action after each plan-mode turn
	pi.on("agent_end", async (_event, ctx) => {
		if (!planModeEnabled || !ctx.hasUI) return;

		const choice = await ctx.ui.select("Plan mode - what next?", ["Stay in plan mode", "Execute"]);

		if (choice === "Execute") {
			planModeEnabled = false;
			pi.setActiveTools(NORMAL_MODE_TOOLS);
			updateStatus(ctx);
			persistState();

			pi.sendMessage(
				{
					customType: "plan-mode-execute",
					content: "Execute the approach discussed above. Full tool access is now enabled.",
					display: true,
				},
				{ triggerTurn: true },
			);
			return;
		}

		persistState();
	});

	// Restore state on session start/resume
	pi.on("session_start", async (_event, ctx) => {
		if (pi.getFlag("plan") === true) {
			planModeEnabled = true;
		}

		const planModeEntry = ctx.sessionManager
			.getEntries()
			.filter((e: { type: string; customType?: string }) => e.type === "custom" && e.customType === "plan-mode")
			.pop() as { data?: { enabled: boolean } } | undefined;

		if (planModeEntry?.data) {
			planModeEnabled = planModeEntry.data.enabled ?? planModeEnabled;
		}

		if (planModeEnabled) {
			pi.setActiveTools(PLAN_MODE_TOOLS);
		} else {
			pi.setActiveTools(NORMAL_MODE_TOOLS);
		}
		updateStatus(ctx);
	});
}
