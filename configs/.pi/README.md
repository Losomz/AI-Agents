# Pi 配置说明

本项目使用 [pi](https://github.com/earendil-works/pi-mono) 作为 AI 编码助手。

## 目录结构

```
.pi/
├── README.md           # 本文档
├── models.json         # 自定义 provider 配置
└── extensions/         # 扩展脚本
    ├── blog/           # /blog 日志生成入口
    ├── git/            # /git Git 操作入口
    └── subagent/       # 子 agent 扩展
        ├── index.ts
        ├── agents.ts
        └── agents/     # 子 agent 定义
```

## 自定义 Provider 配置

### models.json

本项目使用自定义的 `yunyi-claude` provider，配置在 `.pi/models.json` 中：

```json
{
  "providers": {
    "yunyi-claude": {
      "baseUrl": "https://yunyi.cfd/claude/v1",
      "api": "openai-completions",
      "apiKey": "YOUR_API_KEY",
      "models": [
        {
          "id": "claude-opus-4-7",
          "name": "Claude Opus 4.7",
          "reasoning": true,
          "input": ["text", "image"],
          "contextWindow": 200000,
          "maxTokens": 16384
        }
      ]
    }
  }
}
```

### 配置层级

Pi 支持两个层级的 `models.json`：

1. **项目级别**：`.pi/models.json`（当前项目专用，优先级更高）
2. **用户级别**：`~/.pi/agent/models.json`（全局所有项目）

项目级别的配置会覆盖用户级别的同名 provider。

### API Key 管理

**方式 1：直接写入（不推荐提交到 git）**
```json
{
  "providers": {
    "yunyi-claude": {
      "apiKey": "DBWGSPEW-UADK-WQBN-3ZDE-9G1QQ9HVW2F6"
    }
  }
}
```

**方式 2：使用环境变量（推荐）**
```json
{
  "providers": {
    "yunyi-claude": {
      "apiKey": "YUNYI_API_KEY"
    }
  }
}
```

然后在环境中设置：
```bash
export YUNYI_API_KEY="your-actual-key"
```

**方式 3：使用 shell 命令**
```json
{
  "providers": {
    "yunyi-claude": {
      "apiKey": "!op read 'op://vault/yunyi/api-key'"
    }
  }
}
```

## Blog 日志生成扩展

`extensions/blog/` 提供单入口 `/blog` 命令，用来从 Git 历史生成不同受众的项目日志，避免占用 Pi 内置 `/changelog`。

可用命令：

```text
/blog             # 弹出菜单选择日志类型
/blog product     # 面向消费者/玩家/用户的产品级更新日志
/blog tech        # 面向技术人员的技术变更日志
/blog work        # 面向公司内部的工作日志
```

默认输出文件：

```text
docs/CHANGELOG.md       # product
docs/TECH_CHANGELOG.md  # tech
docs/WORKLOG.md         # work
```

默认只生成或更新文件，不自动 commit、tag、push；只有在用户明确要求发布/提交/打 tag/推送时才执行对应 Git 操作。

## 子 Agent 配置

### Agent 定义格式

子 agent 定义集中放在 `.pi/extensions/subagent/agents/`，使用 Markdown frontmatter 格式：

```markdown
---
name: worker
description: General-purpose subagent with full capabilities
tools: read, write, edit, bash
# 可选；不写则使用当前默认模型
# model: provider/model
---

Agent 的系统提示词内容...
```

### 模型配置

默认不在 agent 定义里固定模型，让子 agent 使用当前 Pi 默认模型。

如需为某个子 agent 固定模型，可添加 `model: provider/model`：

```yaml
model: wanwu/gpt-5.5
```

不要使用分开的字段：

```yaml
# ❌ 错误方式
provider: wanwu
model: gpt-5.5
```

### 可用的 Agent

#### scout
快速代码侦查，返回压缩的上下文信息供其他 agent 使用。

```typescript
pi.subagent({
  agent: "scout",
  agentScope: "project",
  task: "找到所有处理用户认证的代码"
});
```

#### planner
根据上下文和需求创建实现计划。

```typescript
pi.subagent({
  agent: "planner",
  agentScope: "project",
  task: "规划如何重构认证模块"
});
```

#### worker
通用工作 agent，具有完整能力，在隔离的上下文中处理任务。

```typescript
pi.subagent({
  agent: "worker",
  agentScope: "project",
  task: "实现用户登录功能"
});
```

#### reviewer
代码审查专家，分析代码质量和安全性。

```typescript
pi.subagent({
  agent: "reviewer",
  agentScope: "project",
  task: "审查最近的认证相关改动"
});
```

## 常见问题

### Q: Subagent 启动失败，提示 "No API key found"

**原因**：Subagent 进程不会自动加载 extensions，只会读取 `models.json`。

**解决方案**：
1. 确保 `.pi/models.json` 或 `~/.pi/agent/models.json` 存在
2. 如果 agent 定义里写了 `model:`，确保使用 `provider/model` 格式且模型存在
3. 重启 pi 或执行 `/reload` 让配置生效

### Q: 如何在多个项目间共享配置？

将配置放在用户级别：`~/.pi/agent/models.json`

### Q: 如何为不同项目使用不同的 API key？

在项目的 `.pi/models.json` 中配置，它会覆盖全局配置。

### Q: 如何避免将 API key 提交到 git？

**方式 1**：将 `.pi/models.json` 加入 `.gitignore`

**方式 2**：使用环境变量或 shell 命令方式配置 API key

**方式 3**：提交模板文件 `.pi/models.json.example`，实际的 `models.json` 不提交

## 参考文档

- [Pi 官方文档](https://github.com/earendil-works/pi-mono)
- [自定义模型配置](https://github.com/earendil-works/pi-mono/blob/main/docs/models.md)
- [Provider 配置](https://github.com/earendil-works/pi-mono/blob/main/docs/providers.md)
- [扩展开发](https://github.com/earendil-works/pi-mono/blob/main/docs/extensions.md)

## 更新日志

### 2026-05-14
- 初始化项目 pi 配置
- 配置 yunyi-claude 自定义 provider
- 创建 4 个子 agent（scout, planner, worker, reviewer）
- 子 agent 定义集中到 `.pi/extensions/subagent/agents/`，默认使用当前模型
