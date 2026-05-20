# AgentFramework

个人 AI Agent 配置与模板仓库。

这个仓库现在只保留两类核心内容：

- `configs/`：各 AI 工具的可同步配置源，例如 Pi、OpenCode。
- `agents/`：通用 agent 模板目录，暂时只保留空目录占位，后续放独立 agent 文件。

根目录的 `agent-sync.mjs` 是一个轻量同步脚本，用来把本仓库中的配置同步到当前项目。

## 目录结构

```text
AgentFramework/
├── agent-sync.mjs          # 项目内同步脚本
├── agents/                 # 通用 agent 模板目录（暂时为空）
├── configs/
│   ├── pi/                 # Pi 配置源
│   │   └── extensions/     # Pi extensions
│   └── opencode/           # OpenCode 配置源
│       ├── commands/
│       ├── skills/
│       └── opencode.json
└── README.md
```

## 同步用法

在目标项目根目录执行：

```bash
node agent-sync.mjs
```

直接同步某个配置：

```bash
node agent-sync.mjs pi
node agent-sync.mjs opencode
node agent-sync.mjs all
```

跳过确认：

```bash
node agent-sync.mjs pi --yes
```

开发期从当前仓库本地 `configs/` 同步，不拉远程：

```bash
node agent-sync.mjs pi --local --yes
```

## 当前同步包

### `pi`

同步：

```text
configs/pi/extensions -> .pi/extensions
```

同步后在 Pi 中执行：

```text
/reload
```

### `opencode`

同步：

```text
configs/opencode/commands     -> .opencode/commands
configs/opencode/skills       -> .opencode/skills
configs/opencode/opencode.json -> .opencode/opencode.json
configs/opencode/README.md    -> .opencode/README.md
```

## 同步策略

同步前会把目标目录或文件备份到：

```text
.agentframework/backups/<timestamp>/
```

然后删除目标并复制最新内容。

## 远程仓库配置

默认远程仓库：

```text
git@github.com:Losomz/AgentFramework.git
```

可用环境变量覆盖：

```bash
AGENTFRAMEWORK_REPO_URL=<repo-url>
AGENTFRAMEWORK_REF=main
AGENTFRAMEWORK_HOME=<cache-dir>
```
