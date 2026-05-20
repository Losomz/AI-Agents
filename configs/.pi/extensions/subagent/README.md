# Subagent Extension

Lightweight bundled subagents for Pi.

## Commands

- `/agents` - choose a bundled agent, enter a task, and run it.
- `/agents General <task>` - run the General agent directly.
- `/agents Explore <task>` - run the Explore agent directly.
- `/agents Scout <task>` - run the Scout agent directly.

Agent names are matched case-insensitively.

The extension also keeps the `subagent` tool available for model-driven delegation:

```json
{
  "agent": "Explore",
  "task": "Find code related to resource loading",
  "agentScope": "project",
  "confirmProjectAgents": false
}
```

## Bundled Agents

Bundled agents live in:

```text
.pi/extensions/subagent/agents/*.md
```

To add a new agent, add another markdown file with frontmatter:

```markdown
---
name: MyAgent
description: What this agent is for
tools: read, grep, find, ls
# Optional. If omitted, the current Pi default model is used.
# model: provider/model
---

System prompt for the agent.
```

If `model` is omitted, the subagent uses the current Pi default model.

## Default Agents

### General

模式：subagent

A general-purpose agent for complex questions and multi-step tasks. It has full tool access and may modify files when needed. Use it for implementation, debugging, or larger delegated work units.

### Explore

模式：subagent

A fast read-only codebase exploration agent. It cannot modify files. Use it to find files by pattern, search code, inspect relevant sections, or answer questions about the repository.

### Scout

模式：subagent

A read-only external research agent for dependencies, upstream source code, and external documentation. It may clone external repositories into a managed cache, but must not modify the current workspace.

Recommended cache location:

```text
~/.cache/agentframework/subagents/
```

## Running Widget

While subagents are running, the extension shows a widget above the editor with:

- agent name
- pid
- elapsed time
- model if configured
- task preview

Example:

```text
Subagents running:
  ⏳ Explore pid=1234 8s — 查找资源加载相关代码
```

## Worktree Isolation

Current version does **not** use Git worktree isolation.

`General` runs directly in the current workspace and can modify files. Be careful when running multiple writable General agents in parallel, because they can edit overlapping files.

`Explore` and `Scout` are read-only by prompt and tool policy.

## Safety Notes

- Extension-local agents are repository-controlled prompts.
- The `/agents` command runs bundled project agents with `confirmProjectAgents: false` because these prompts are part of this trusted config package.
- The raw `subagent` tool still accepts `agentScope` for advanced use.
