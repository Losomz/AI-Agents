import type { TuiPlugin } from "@opencode-ai/plugin/tui"
import { Text } from "@opentui/core"

/**
 * 测试插件：验证 writeToScrollback 是否能绕过 TUI 直接输出到终端
 */
export default {
  id: "renderer-test",
  tui: async (api, options, meta) => {
    console.log("\n" + "=".repeat(60))
    console.log("🧪 渲染器测试插件已加载")
    console.log("Renderer 类型:", typeof api.renderer)
    console.log("=".repeat(60) + "\n")
    
    // 测试 1：使用 writeToScrollback 写入普通文本
    console.log("📍 测试 1: 写入普通文本...")
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
    
    // 测试 2：写入相对路径
    console.log("📍 测试 2: 写入相对路径...")
    try {
      api.renderer.writeToScrollback((ctx) => {
        const text = new Text("📁 测试2：相对路径 src/index.ts", 0, 0)
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
    console.log("📍 测试 3: 写入绝对路径...")
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
    
    // 测试 4：写入多个路径
    console.log("📍 测试 4: 写入多个路径...")
    try {
      api.renderer.writeToScrollback((ctx) => {
        const paths = [
          "src/index.ts",
          "src/utils.ts",
          "tests/unit.test.ts",
          "D:\\UGit\\AgentFramework\\package.json"
        ]
        const text = new Text(
          "📂 测试4：多个路径\n" + paths.map(p => `  ${p}`).join("\n"),
          0,
          0
        )
        return {
          root: text,
          startOnNewLine: true,
          trailingNewline: true
        }
      })
      console.log("✅ 测试4 成功")
    } catch (e) {
      console.error("❌ 测试4 失败:", e)
    }
    
    // 测试 5：监听事件后写入
    console.log("📍 测试 5: 设置事件监听...")
    api.event.on("message.updated", (event) => {
      console.log("📨 消息更新事件触发")
      try {
        api.renderer.writeToScrollback((ctx) => {
          const text = new Text("📨 事件触发：消息已更新", 0, 0)
          return {
            root: text,
            startOnNewLine: true,
            trailingNewline: true
          }
        })
        console.log("✅ 事件中写入成功")
      } catch (e) {
        console.error("❌ 事件中写入失败:", e)
      }
    })
    console.log("✅ 测试5 事件监听已设置")
    
    console.log("\n" + "=".repeat(60))
    console.log("🧪 测试插件初始化完成")
    console.log("💡 请观察 OpenCode TUI 界面是否显示测试文本")
    console.log("💡 请检查路径是否可以点击（在支持的终端中）")
    console.log("=".repeat(60) + "\n")
  }
} satisfies { id: string; tui: TuiPlugin }
