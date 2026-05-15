# OpenCode 路径识别插件 - 快速开始

## 📋 当前状态

**阶段：** 测试验证阶段

**已完成：**
- ✅ 安装 TUI 依赖
- ✅ 创建测试插件
- ✅ 发现关键 API：`writeToScrollback()`

**下一步：** 重启 OpenCode 测试

---

## 🚀 立即执行

### 1. 重启 OpenCode
```bash
cd D:\UGit\AgentFramework
opencode
```

### 2. 观察测试输出

**应该看到：**
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

### 3. 测试路径点击

在 Windows Terminal 中：
- **按住 Ctrl**
- **鼠标悬停在路径上**
- **点击路径**

如果能打开文件 → **成功！**

---

## 📁 关键文件

- **测试插件：** `.opencode/plugins/renderer-test.ts`
- **Server 插件：** `.opencode/plugins/path-optimizer.ts`
- **详细文档：** `.opencode/PATH_RECOGNITION_PLAN.md`
- **依赖配置：** `.opencode/package.json`

---

## 🎯 测试结果判断

### ✅ 成功标志
- 测试文本显示在 TUI 上
- 路径可以点击
- 控制台无错误

### ❌ 失败情况
- 文本不显示
- 路径不可点击
- 有错误信息

---

## 📞 下一步

**如果成功：** 实施完整的路径识别插件

**如果失败：** 查看详细文档中的调试技巧

**详细信息：** 查看 `PATH_RECOGNITION_PLAN.md`

---

**创建时间：** 2026-05-15
**项目：** OpenCode 路径识别功能
