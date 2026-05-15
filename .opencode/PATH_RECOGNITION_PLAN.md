# OpenCode 路径识别功能实施计划

## 📋 项目概述

**目标：** 让 OpenCode TUI 能够识别和高亮显示文件路径，使其可点击打开

**核心问题：** OpenCode 的 TUI 不会自动识别文本中的文件路径，无法像其他终端（VS Code Terminal、Windows Terminal、iTerm2）那样提供点击打开功能

**关键洞察：** 其他终端是通过自己解析屏幕文本来识别路径的，不依赖程序输出特殊格式。如果能绕过 OpenCode 的 TUI 输出，直接让内容到达终端，终端就能自动识别路径。

---

## 🎯 技术方案

### 方案核心思路

**绕过 OpenCode TUI 的文本处理，直接输出到终端**

- OpenCode 使用自己的 TUI 渲染引擎（`@opentui/core`）
- TUI 拦截了终端的原生功能
- 如果能通过 `CliRenderer` 直接输出到终端，终端就能自动识别路径

### 实施路径

**阶段 1：研究 `CliRenderer` API** ✅ 进行中
- 安装 `@opentui/core` 和 `@opentui/solid` 依赖
- 查看 `CliRenderer` 的类型定义
- 了解 `write()` 方法的行为

**阶段 2：创建测试插件**
- 创建最小的 TUI 插件
- 测试 `renderer.write()` 是否能绕过 TUI
- 验证终端是否能识别输出的路径

**阶段 3：根据测试结果实施完整方案**
- 如果可行：实施完整的路径识别插件
- 如果不可行：探索替代方案

---

## 📁 项目文件结构

```
D:\UGit\AgentFramework\
├── .opencode/
│   ├── plugins/
│   │   ├── path-optimizer.ts          # 当前的 Server 插件（已实现）
│   │   └── path-tui-renderer.ts       # 待创建的 TUI 插件
│   ├── package.json                    # 已更新，包含 TUI 依赖
│   ├── opencode.json                   # OpenCode 配置（空）
│   └── PATH_RECOGNITION_PLAN.md        # 本文档
└── .pi/                                # Pi 项目（忽略，不相关）
```

---

## 🔍 已完成的工作

### 1. Server 插件实现（path-optimizer.ts）

**文件位置：** `D:\UGit\AgentFramework\.opencode\plugins\path-optimizer.ts`

**功能：**
- ✅ 从工具输出中识别文件路径
- ✅ 支持多种路径格式（相对路径、绝对路径、带行号）
- ✅ 生成 OSC 8 终端超链接
- ✅ 在输出末尾显示路径列表
- ✅ 详细的日志输出

**工作原理：**
- 使用 `tool.execute.after` hook 拦截工具输出
- 用正则表达式提取路径
- 生成 OSC 8 格式的超链接：`\x1b]8;;file://路径\x1b\\显示文本\x1b]8;;\x1b\\`
- 追加到工具输出末尾

**限制：**
- ❌ 依赖终端对 OSC 8 的支持
- ❌ 路径仍然在 TUI 内部渲染，可能被 TUI 处理
- ⚠️ 在不支持 OSC 8 的终端中只显示为普通文本

### 2. 依赖安装

**已安装的包：**
```json
{
  "dependencies": {
    "@opencode-ai/plugin": "1.14.31",
    "@opentui/core": "0.1.105",
    "@opentui/solid": "0.1.105"
  }
}
```

**安装位置：** `D:\UGit\AgentFramework\.opencode\node_modules\`

---

## 🔬 当前调查阶段

### ✅ 重要发现：`writeToScrollback()` 方法

**在 `CliRenderer` 中找到了关键方法：**

```typescript
writeToScrollback(write: ScrollbackWriter): void;
```

**类型定义：**
```typescript
export type ScrollbackWriter = (ctx: ScrollbackRenderContext) => ScrollbackSnapshot;

export interface ScrollbackSnapshot {
    root: Renderable;
    width?: number;
    height?: number;
    rowColumns?: number;
    startOnNewLine?: boolean;
    trailingNewline?: boolean;
    teardown?: () => void;
}
```

**这个方法的作用：**
- ✅ 直接写入到终端的 scrollback buffer（滚动缓冲区）
- ✅ 绕过 TUI 的主渲染循环
- ✅ 内容会直接显示在终端上
- ✅ 终端可以自动识别路径！

**这正是我们需要的！**

### 需要查看的类型定义文件

**主要文件：**
1. ✅ `D:\UGit\AgentFramework\.opencode\node_modules\@opentui\core\renderer.d.ts`
   - 已查看，找到 `CliRenderer` 的定义
   - 发现 `writeToScrollback()` 方法

2. `D:\UGit\AgentFramework\.opencode\node_modules\@opentui\core\Renderable.d.ts`
   - 需要了解如何创建 `Renderable` 对象

3. ✅ `D:\UGit\AgentFramework\.opencode\node_modules\@opencode-ai\plugin\dist\tui.d.ts`
   - 已查看，包含 `TuiPluginApi` 的完整定义

### 关键问题需要回答

**问题 1：`CliRenderer.write()` 的行为**
- ❓ 输出到哪里？（stdout/stderr 还是 TUI 内部缓冲区）
- ❓ 输出会被 TUI 处理吗？（转义、过滤、格式化）
- ❓ 终端控制字符（OSC 8）会保留吗？
- ❓ 输出的时机和位置？（立即显示还是等待刷新）

**问题 2：TUI 插件的加载机制**
- ❓ 如何导出 TUI 插件？（`export default { id, tui }` 格式）
- ❓ 是否需要在 `opencode.json` 中配置？
- ❓ 是否自动从 `.opencode/plugins/` 加载？
- ❓ TUI 插件和 Server 插件可以共存吗？

**问题 3：事件系统**
- ❓ `message.updated` 事件的数据结构？
- ❓ 如何从事件中提取工具输出的文本？
- ❓ 事件触发的时机？（渲染前还是渲染后）

---

## 📝 下一步执行计划

### 步骤 1：查看 `CliRenderer` 类型定义

**命令：**
```bash
# 查看 renderer.d.ts
cat .opencode/node_modules/@opentui/core/renderer.d.ts

# 搜索 CliRenderer 的定义
grep -A 20 "CliRenderer" .opencode/node_modules/@opentui/core/renderer.d.ts
```

**重点关注：**
- `write()` 方法的签名
- 是否有 `writeln()`, `flush()`, `raw()` 等方法
- 是否有访问底层 stdout/stderr 的方法
- 相关的注释和文档

### 步骤 2：创建最小测试插件

**文件：** `.opencode/plugins/renderer-test.ts`

**内容：**
```typescript
import type { TuiPlugin } from "@opencode-ai/plugin/tui"
import { Text } from "@opentui/core"

export default {
  id: "renderer-test",
  tui: async (api, options, meta) => {
    console.log("🧪 测试插件已加载")
    console.log("Renderer 类型:", typeof api.renderer)
    console.log("Renderer 方法:", Object.keys(api.renderer))
    
    // 测试 1：使用 writeToScrollback 写入普通文本
    try {
      api.renderer.writeToScrollback((ctx) => {
        const text = new Text("🧪 测试1：使用 writeToScrollback 写入文本", 0, 0)
        return {
          root: text,
          startOnNewLine: true,
          trailingNewline: true
        }
      })
      console.log("✅ 测试1 成功")
    } catch (e) {
      console.error("❌ 测试1 失败:", e)
    }
    
    // 测试 2：写入文件路径
    try {
      api.renderer.writeToScrollback((ctx) => {
        const text = new Text("📁 测试2：文件路径 src/index.ts", 0, 0)
        return {
          root: text,
          startOnNewLine: true,
          trailingNewline: true
        }
      })
      console.log("✅ 测试2 成功")
    } catch (e) {
      console.error("❌ 测试2 失败:", e)
    }
    
    // 测试 3：写入绝对路径
    try {
      const testPath = "D:\\UGit\\AgentFramework\\src\\index.ts"
      api.renderer.writeToScrollback((ctx) => {
        const text = new Text(`🔗 测试3：绝对路径 ${testPath}`, 0, 0)
        return {
          root: text,
          startOnNewLine: true,
          trailingNewline: true
        }
      })
      console.log("✅ 测试3 成功")
    } catch (e) {
      console.error("❌ 测试3 失败:", e)
    }
    
    // 测试 4：监听事件后写入
    api.event.on("message.updated", (event) => {
      console.log("📨 消息更新事件触发")
      try {
        api.renderer.writeToScrollback((ctx) => {
          const text = new Text("📨 事件触发时的输出", 0, 0)
          return {
            root: text,
            startOnNewLine: true,
            trailingNewline: true
          }
        })
      } catch (e) {
        console.error("❌ 事件中写入失败:", e)
      }
    })
    
    console.log("🧪 测试插件初始化完成")
  }
} satisfies { id: string; tui: TuiPlugin }
```

**注意：**
- 使用 `writeToScrollback()` 而不是 `write()`
- 需要创建 `Renderable` 对象（使用 `Text` 组件）
- 返回 `ScrollbackSnapshot` 对象

### 步骤 3：测试验证

**操作：**
1. 重启 OpenCode
2. 观察控制台输出
3. 检查 TUI 界面是否显示测试文本
4. 验证路径是否可点击

**预期结果：**

**情况 A：成功（理想情况）**
- ✅ 测试文本显示在终端
- ✅ 文件路径可以点击
- ✅ 超链接正常工作
- ✅ 事件触发时输出正常

**情况 B：部分成功**
- ✅ 文本显示但在 TUI 内部
- ❌ 路径不可点击
- ⚠️ 需要探索其他方案

**情况 C：失败**
- ❌ 文本不显示或报错
- ❌ `renderer.write()` 不可用
- ⚠️ 需要完全不同的方案

### 步骤 4：根据结果制定方案

**如果情况 A（成功）：**
1. 实施完整的路径识别 TUI 插件
2. 监听 `message.updated` 事件
3. 提取路径并使用 `renderer.write()` 输出
4. 终端自动识别路径

**如果情况 B（部分成功）：**
1. 探索 Slot 系统自定义渲染
2. 研究是否可以拦截 TUI 的文本处理
3. 考虑混合方案（Server + TUI 插件）

**如果情况 C（失败）：**
1. 向 OpenCode 提交 Feature Request
2. 使用外部工具（修改终端配置）
3. 接受现状，使用 Server 插件的 OSC 8 方案

---

## 🛠️ 技术参考

### OpenCode 插件系统

**Server 插件：**
- 运行在后端进程
- 可以修改数据和工具输出
- 使用 `@opencode-ai/plugin`
- 导出格式：`export const PluginName: Plugin = async ({ client, directory }) => { ... }`

**TUI 插件：**
- 运行在前端 TUI 进程
- 可以修改渲染和 UI
- 使用 `@opencode-ai/plugin/tui`
- 导出格式：`export default { id: "plugin-id", tui: async (api) => { ... } }`

### TUI Plugin API

**可用的 API：**
```typescript
api.app          // 应用信息
api.command      // 命令注册和触发
api.route        // 路由管理
api.ui           // UI 组件（Dialog, Toast, Prompt 等）
api.keybind      // 快捷键管理
api.theme        // 主题系统
api.client       // OpenCode SDK 客户端
api.event        // 事件总线
api.renderer     // ⭐ 底层终端渲染器（关键）
api.slots        // Slot 系统（自定义渲染）
api.plugins      // 插件管理
api.lifecycle    // 生命周期管理
```

### 终端超链接协议（OSC 8）

**格式：**
```
\x1b]8;;file://绝对路径\x1b\\显示文本\x1b]8;;\x1b\\
```

**支持的终端：**
- ✅ VS Code 终端
- ✅ Windows Terminal
- ✅ iTerm2 (macOS)
- ✅ GNOME Terminal
- ✅ Hyper
- ❌ 传统的 CMD/PowerShell

---

## 📊 当前状态

**进度：** 阶段 1 - 调查 `CliRenderer` API

**已完成：**
- ✅ 安装 TUI 依赖
- ✅ 创建项目文档
- ✅ 实现 Server 插件（path-optimizer.ts）

**进行中：**
- 🔄 查看 `CliRenderer` 类型定义
- 🔄 创建测试插件

**待完成：**
- ⏳ 测试验证
- ⏳ 实施完整方案

---

## 🔗 相关文件路径

**插件文件：**
- Server 插件：`D:\UGit\AgentFramework\.opencode\plugins\path-optimizer.ts`
- TUI 测试插件：`D:\UGit\AgentFramework\.opencode\plugins\renderer-test.ts`（待创建）

**配置文件：**
- 依赖配置：`D:\UGit\AgentFramework\.opencode\package.json`
- OpenCode 配置：`D:\UGit\AgentFramework\.opencode\opencode.json`

**类型定义：**
- TUI Plugin API：`D:\UGit\AgentFramework\.opencode\node_modules\@opencode-ai\plugin\dist\tui.d.ts`
- CliRenderer：`D:\UGit\AgentFramework\.opencode\node_modules\@opentui\core\renderer.d.ts`

---

## 💡 关键洞察和注意事项

### 重要发现

1. **项目混合情况**
   - 项目中同时有 `.opencode/` 和 `.pi/` 目录
   - 我们只关注 OpenCode，忽略 Pi
   - 不要混淆两个系统的插件机制

2. **TUI 插件的特殊性**
   - TUI 插件需要 `@opentui/core` 和 `@opentui/solid` 依赖
   - 这些是 peer dependencies，需要手动安装
   - TUI 插件和 Server 插件是分开的，不能在同一个文件中

3. **路径识别的本质**
   - 终端自己识别路径，不需要程序输出特殊格式
   - 关键是绕过 TUI 的文本处理
   - 如果能直接输出到终端，问题就解决了

### 潜在风险

1. **`renderer.write()` 可能不会绕过 TUI**
   - 可能只是 TUI 内部的渲染方法
   - 输出可能仍然被 TUI 处理
   - 需要测试验证

2. **TUI 插件加载机制不明确**
   - 不确定是否需要在 `opencode.json` 中配置
   - 不确定导出格式是否正确
   - 需要参考官方文档或示例

3. **兼容性问题**
   - 不同版本的 OpenCode 可能有不同的 API
   - TUI 插件系统可能还在实验阶段
   - 需要做好备选方案

### 备选方案

**如果 TUI 插件方案不可行：**

1. **方案 A：改进 Server 插件**
   - 继续使用 OSC 8 超链接
   - 优化路径识别算法
   - 添加更多配置选项

2. **方案 B：外部工具**
   - 使用终端的自定义配置
   - 创建包装脚本处理 OpenCode 输出
   - 使用 tmux/screen 的 passthrough 功能

3. **方案 C：向 OpenCode 提交 Feature Request**
   - 在 GitHub 提交 issue
   - 说明需求和用例
   - 等待官方实现

---

## 📞 联系和支持

**OpenCode 资源：**
- GitHub：https://github.com/anomalyco/opencode
- Discord：https://opencode.ai/discord
- 文档：https://opencode.ai/docs

**相关 Issue：**
- 搜索关键词：path recognition, hyperlink, clickable paths
- 查看是否有人提过类似需求

---

## 📅 更新日志

**2026-05-15**
- ✅ 创建项目文档
- ✅ 安装 TUI 依赖
- ✅ 实施 Server 插件
- 🔄 开始调查 `CliRenderer` API

---

## 🎯 下次执行清单

**在其他设备上继续时，按以下顺序执行：**

### ✅ 已完成的准备工作

1. ✅ 安装了 TUI 依赖（`@opentui/core`, `@opentui/solid`）
2. ✅ 创建了测试插件（`.opencode/plugins/renderer-test.ts`）
3. ✅ 发现了关键方法（`writeToScrollback()`）
4. ✅ 创建了项目文档

### 🚀 立即执行：测试验证

**步骤 1：重启 OpenCode**
```bash
cd D:\UGit\AgentFramework
opencode
```

**步骤 2：观察启动时的输出**

在 OpenCode 启动后，应该会看到：
- 控制台输出测试日志
- TUI 界面上显示测试文本（如果成功）
- 4 个测试的结果

**步骤 3：检查测试结果**

**预期看到的内容：**
```
🧪 测试1：使用 writeToScrollback 写入文本
📁 测试2：相对路径 src/index.ts
🔗 测试3：绝对路径 D:\UGit\AgentFramework\src\index.ts
📂 测试4：多个路径
  src/index.ts
  src/utils.ts
  tests/unit.test.ts
  D:\UGit\AgentFramework\package.json
```

**步骤 4：验证路径是否可点击**

在 Windows Terminal 中：
- 按住 **Ctrl** 键
- 鼠标悬停在路径上
- 如果路径变成下划线，说明终端识别了路径
- 点击应该能打开文件

**步骤 5：触发事件测试**

在 OpenCode 中输入任何消息，应该会看到：
```
📨 事件触发：消息已更新
```

### 📊 记录测试结果

**成功的标志：**
- ✅ 测试文本显示在 TUI 界面上
- ✅ 路径可以点击（在 Windows Terminal 中）
- ✅ 事件触发时输出正常
- ✅ 控制台没有错误

**如果成功，说明：**
- `writeToScrollback()` 可以绕过 TUI
- 终端能够识别路径
- 方案可行！

**如果失败，可能的情况：**
- ❌ 文本不显示 → `writeToScrollback()` 不可用
- ❌ 文本显示但路径不可点击 → 仍在 TUI 内部
- ❌ 报错 → API 使用不正确

### 📝 下一步行动（根据测试结果）

**情况 A：测试成功（路径可点击）**

立即实施完整的路径识别插件：

1. 创建 `.opencode/plugins/path-tui-renderer.ts`
2. 监听 `message.updated` 事件
3. 从消息中提取路径
4. 使用 `writeToScrollback()` 输出路径列表
5. 删除测试插件

**情况 B：文本显示但路径不可点击**

探索其他方案：
1. 尝试在 `Text` 中使用 ANSI 转义序列
2. 研究是否可以使用原始文本输出
3. 查看是否有其他 API 可以访问 stdout

**情况 C：完全失败**

考虑替代方案：
1. 继续使用 Server 插件的 OSC 8 方案
2. 向 OpenCode 提交 Feature Request
3. 使用外部工具处理输出

### 🔍 调试技巧

**如果遇到问题：**

1. **查看完整的控制台输出**
   ```bash
   # 在 PowerShell 中运行 OpenCode 并查看日志
   opencode 2>&1 | Tee-Object -FilePath opencode.log
   ```

2. **检查插件是否加载**
   - 查找 "🧪 渲染器测试插件已加载" 消息
   - 如果没有，说明插件没有被加载

3. **检查错误信息**
   - 查找 "❌" 标记的错误
   - 记录完整的错误堆栈

4. **验证依赖安装**
   ```bash
   cd .opencode
   bun pm ls | grep opentui
   ```

5. **检查 TypeScript 编译错误**
   ```bash
   cd .opencode
   bunx tsc --noEmit plugins/renderer-test.ts
   ```

---

**文档结束**
