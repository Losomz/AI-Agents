# Plan Mode Extension

Read-only exploration mode for safe code analysis.

## Features

- **Read-only tools**: Restricts available tools to read, bash, grep, find, ls, questionnaire
- **Bash allowlist**: Only read-only bash commands are allowed
- **Opencode-style reminder**: Strong read-only planning prompt, without forcing numbered plans
- **Two-choice flow**: After each plan-mode turn, choose `Stay in plan mode` or `Execute`
- **Session persistence**: Plan-mode enabled state survives session resume

## Commands

- `/plan` - Toggle plan mode
- `/todos` - Show a note that numbered todo tracking is disabled
- `Tab` - Toggle plan mode shortcut

## Usage

1. Enable plan mode with `/plan` or `--plan` flag.
2. Ask the agent to inspect, analyze, or discuss an approach.
3. The agent stays read-only and may respond in whatever format fits the task: short explanation, bullets, checklist, or structured plan.
4. After the turn, choose one of two options:
   - `Stay in plan mode` - keep discussing/analyzing with read-only tools.
   - `Execute` - leave plan mode, restore full tools, and execute the discussed approach.

## How It Works

### Plan Mode (Read-Only)

- Only read-only tools are available.
- Bash commands are filtered through an allowlist.
- The agent is instructed not to edit files, write files, install dependencies, commit changes, or otherwise change system state.
- Numbered `Plan:` sections are not required and are not parsed.

### Execution Mode

- Full tool access is restored.
- The agent receives a short instruction to execute the approach discussed above.
- There is no numbered step extraction, progress widget, or `[DONE:n]` tracking.

### Command Allowlist

Safe commands (allowed):
- File inspection: `cat`, `head`, `tail`, `less`, `more`
- Search: `grep`, `find`, `rg`, `fd`
- Directory: `ls`, `pwd`, `tree`
- Git read: `git status`, `git log`, `git diff`, `git branch`
- Package info: `npm list`, `npm outdated`, `yarn info`
- System info: `uname`, `whoami`, `date`, `uptime`

Blocked commands:
- File modification: `rm`, `mv`, `cp`, `mkdir`, `touch`
- Git write: `git add`, `git commit`, `git push`
- Package install: `npm install`, `yarn add`, `pip install`
- System: `sudo`, `kill`, `reboot`
- Editors: `vim`, `nano`, `code`
