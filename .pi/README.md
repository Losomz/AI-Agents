# Pi 配置说明

本项目使用 [pi](https://github.com/earendil-works/pi-mono) 作为 AI 编码助手。

## 目录结构

```
.pi/
├── README.md           # 本文档
├── models.json         # 自定义 provider 配置
├── agents/             # 子 agent 定义
│   ├── scout.md        # 代码侦查 agent
│   ├── planner.md      # 规划 agent
│   ├── worker.md       # 通用工作 agent
│   └── reviewer.md     # 代码审查 agent
└── extensions/         # 扩展脚本
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

## 子 Agent 配置

### Agent 定义格式

子 agent 定义文件使用 Markdown frontmatter 格式：

```markdown
---
name: worker
description: General-purpose subagent with full capabilities
tools: read, write, edit, bash
model: yunyi-claude/claude-opus-4-7
---

Agent 的系统提示词内容...
```

### 重要：模型指定格式

**必须使用 `provider/model` 格式**：

```yaml
model: yunyi-claude/claude-opus-4-7
```

**不要使用分开的字段**（subagent 无法正确识别）：
```yaml
# ❌ 错误方式
provider: yunyi-claude
model: claude-opus-4-7
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
2. 确保 agent 定义中使用 `model: provider/model` 格式
3. 重启 pi 让配置生效

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
- 修复 subagent 启动问题（使用 provider/model 格式）
