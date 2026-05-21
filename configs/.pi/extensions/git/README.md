# Git Extension

Layered Git command for Pi.

## Commands

- `/git` - choose a Git operation from a menu.
- `/git commit` - analyze current changes, then ask the default commit subagent (`General`) to create a Chinese gitmoji + Conventional Commits message and run `git add -A`, `git commit`, and `git push`.
- `/git commit <agent>` or `/git commit --agent <agent>` - use a specific subagent for the commit workflow.
- `/git pull` - pull from the current branch with dirty-tree handling.

## Design

This extension keeps Git operations under a single top-level `/git` command so slash-command filtering stays clean.

## Operations

### commit

Collects:

- `git status --porcelain`
- `git diff --cached`
- `git diff`

Then sends a structured request to the main agent that instructs it to immediately call the `subagent` tool. The selected subagent performs the entire add/commit/push workflow; the main agent must not run `git add`, `git commit`, or `git push` itself.

Default commit subagent: `General`.

Examples:

```text
/git commit
/git commit General
/git commit --agent General
```

### pull

Checks whether the repository has uncommitted changes. If dirty, it asks whether to:

- stash changes and pull
- commit changes first
- cancel

After a successful pull, it can restore the auto-created stash.
