# Blog Extension

Layered `/blog` command for generating project logs from Git history.

## Commands

- `/blog` - choose a blog/log type from a menu.
- `/blog product` - generate a product-facing changelog for consumers, players, or end users.
- `/blog tech` - generate a technical changelog for developers and maintainers.
- `/blog work` - generate an internal work log for company/team reporting.

Aliases are supported for common English and Chinese words, for example:

- product: `product`, `user`, `player`, `release`, `产品`, `用户`, `玩家`
- tech: `tech`, `technical`, `dev`, `engineering`, `技术`, `研发`
- work: `work`, `internal`, `report`, `worklog`, `工作`, `内部`, `汇报`

## Design

This extension keeps related log generation under a single top-level `/blog` command so slash-command filtering stays clean and does not conflict with Pi's built-in `/changelog` command.

The extension itself does not write files directly. It:

1. Checks that the current directory is a Git repository.
2. Collects Git context:
   - `git status --short --branch`
   - latest tags
   - latest tag from `git describe --tags --abbrev=0`
   - commits since latest tag, or all commits if there is no tag
   - commit stats and changed files
3. Sends a structured prompt to the active Pi agent.
4. The agent analyzes the commits and updates the target log file.

## Output Files

Default target files:

- `docs/CHANGELOG.md` - product-facing changelog
- `docs/TECH_CHANGELOG.md` - technical changelog
- `docs/WORKLOG.md` - internal work log

## Safety Defaults

By default `/blog` only asks the agent to generate or update the log file.

It explicitly instructs the agent **not** to:

- commit
- create Git tags
- push

unless the user explicitly requests those actions in the command, for example:

```text
/blog product 发布并打 tag
/blog tech 提交日志文件
/blog work 生成后不要提交
```

## Log Types

### product

For users, players, or customers.

Focus:

- user-visible new content
- UX improvements
- bug fixes users can feel

Skip by default:

- pure refactors
- docs-only changes
- CI/build/dependency/internal tooling changes

### tech

For developers, testers, maintainers, and technical leads.

Focus:

- modules and architecture
- API/data/config changes
- refactors
- fixes and stability
- build/tooling/CI
- tests and verification
- migration risks

### work

For internal company/team reporting.

Focus:

- completed work
- why it was done
- impact scope
- collaboration and engineering support
- risks/blockers
- next steps
