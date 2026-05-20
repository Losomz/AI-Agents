# Git Extension

Layered Git command for Pi.

## Commands

- `/git` - choose a Git operation from a menu.
- `/git commit` - analyze current changes, ask the agent to create a Chinese gitmoji + Conventional Commits message, then run `git add -A`, `git commit`, and `git push`.
- `/git pull` - pull from the current branch with dirty-tree handling.

## Design

This extension keeps Git operations under a single top-level `/git` command so slash-command filtering stays clean.

## Operations

### commit

Collects:

- `git status --porcelain`
- `git diff --cached`
- `git diff`

Then sends a structured request to the agent to generate a commit message and perform add/commit/push.

### pull

Checks whether the repository has uncommitted changes. If dirty, it asks whether to:

- stash changes and pull
- commit changes first
- cancel

After a successful pull, it can restore the auto-created stash.
