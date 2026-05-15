import type { Plugin } from "@opencode-ai/plugin"
import { resolve, isAbsolute, sep } from "path"

/**
 * Path Optimizer Plugin
 * 优化 OpenCode 的文件路径识别功能
 * 
 * 功能：
 * 1. 从工具输出中识别文件路径
 * 2. 生成 OSC 8 终端超链接（在支持的终端中可点击）
 * 3. 在输出末尾显示可点击的路径列表
 */
export const PathOptimizerPlugin: Plugin = async ({ client, project, directory }) => {
  console.log("\n" + "=".repeat(60))
  console.log("🚀 路径优化插件已加载")
  console.log("📁 工作目录:", directory)
  console.log("📦 项目:", project?.name || "unknown")
  console.log("=".repeat(60) + "\n")

  // 记录插件加载日志
  await client.app.log({
    body: {
      service: "path-optimizer",
      level: "info",
      message: "Path Optimizer Plugin initialized",
      extra: {
        project: project?.name || "unknown",
        directory: directory,
      },
    },
  })

  /**
   * 从文本中提取文件路径
   * 支持多种路径格式：
   * - 相对路径：src/index.ts, ./src/index.ts, ../lib/utils.ts
   * - 绝对路径：D:\path\to\file.ts, /usr/local/file.ts
   * - 带行号：src/index.ts:10, src/index.ts:10:5
   */
  const extractPaths = (text: string): string[] => {
    const paths = new Set<string>()

    // 正则表达式匹配文件路径
    // 支持：相对路径、绝对路径、Windows 路径、带行号的路径
    const pathRegex = /((?:[A-Za-z]:[\\/]|\.\.?[\\/]|~[\\/]|[\w.-]+[\\/])[^\s<>"'`|]+?\.[A-Za-z0-9_+.-]+)(?::(\d+))?(?::(\d+))?/g
    
    let match
    while ((match = pathRegex.exec(text)) !== null) {
      const fullPath = match[0]
      const pathOnly = match[1]
      
      // 过滤掉明显不是文件路径的匹配
      if (pathOnly && !pathOnly.includes("http://") && !pathOnly.includes("https://")) {
        paths.add(fullPath)
      }
    }

    // 也尝试从常见的工具输出格式中提取路径
    // 例如：grep 输出 "filename:line:column"
    const grepRegex = /^([^\s:]+\.[A-Za-z0-9_+.-]+):(\d+):/gm
    while ((match = grepRegex.exec(text)) !== null) {
      paths.add(`${match[1]}:${match[2]}`)
    }

    return Array.from(paths)
  }

  /**
   * 生成 OSC 8 终端超链接
   * 格式：\x1b]8;;file://绝对路径\x1b\\显示文本\x1b]8;;\x1b\\
   * 
   * 支持的终端：
   * - VS Code 终端
   * - Windows Terminal
   * - iTerm2 (macOS)
   * - GNOME Terminal
   * - Hyper
   */
  const createHyperlink = (displayText: string, filePath: string): string => {
    // 确保路径是绝对路径
    const absolutePath = isAbsolute(filePath) 
      ? filePath 
      : resolve(directory, filePath)
    
    // 转换为 file:// URI
    // Windows 路径需要转换反斜杠为正斜杠
    const normalizedPath = absolutePath.replace(/\\/g, "/")
    const fileUri = `file://${normalizedPath}`
    
    // OSC 8 格式：ESC ] 8 ; ; URI ESC \ TEXT ESC ] 8 ; ; ESC \
    return `\x1b]8;;${fileUri}\x1b\\${displayText}\x1b]8;;\x1b\\`
  }

  /**
   * 格式化路径显示
   * 将绝对路径转换为相对于工作目录的路径（如果可能）
   */
  const formatPathDisplay = (path: string): string => {
    if (!directory) return path
    
    try {
      const absolutePath = isAbsolute(path) ? path : resolve(directory, path)
      
      // 如果路径在工作目录下，显示相对路径
      if (absolutePath.startsWith(directory)) {
        const relativePath = absolutePath.substring(directory.length + 1)
        return relativePath || path
      }
    } catch (e) {
      // 如果转换失败，返回原路径
    }
    
    return path
  }

  return {
    // 在工具执行后拦截输出，添加路径识别和超链接
    "tool.execute.after": async (input, output) => {
      try {
        // 从输出中提取路径
        const extractedPaths = extractPaths(output.output)
        
        if (extractedPaths.length === 0) {
          return // 没有识别到路径，不做处理
        }

        console.log("\n" + "=".repeat(60))
        console.log(`🔍 路径识别结果 [工具: ${input.tool}]`)
        console.log(`📊 识别到 ${extractedPaths.length} 个文件路径`)
        console.log("=".repeat(60))

        // 生成超链接列表（最多显示 20 个）
        const maxLinks = 20
        const pathsToShow = extractedPaths.slice(0, maxLinks)
        
        const hyperlinks = pathsToShow.map((path, index) => {
          const displayPath = formatPathDisplay(path)
          const hyperlink = createHyperlink(displayPath, path)
          
          console.log(`  ${index + 1}. ${displayPath}`)
          
          return `  ${hyperlink}`
        })

        if (extractedPaths.length > maxLinks) {
          console.log(`  ... 还有 ${extractedPaths.length - maxLinks} 个路径未显示`)
        }

        console.log("=".repeat(60) + "\n")

        // 在输出末尾追加可点击的路径列表
        const pathSection = [
          "",
          "━".repeat(60),
          "📁 识别到的文件路径（可点击打开）:",
          "",
          ...hyperlinks,
          "",
          extractedPaths.length > maxLinks 
            ? `  ... 还有 ${extractedPaths.length - maxLinks} 个路径` 
            : "",
          "💡 提示：在支持的终端中，Ctrl+点击路径可直接打开文件",
          "━".repeat(60),
        ].filter(line => line !== "").join("\n")

        output.output += "\n" + pathSection

      } catch (error) {
        console.error("❌ 路径识别过程中出错:", error)
      }
    },
  }
}
  }) satisfies Plugin,
}

function collectLinks(directory: string, input: { tool: string; args: unknown }, output: { title: string; output: string; metadata: unknown }) {
  return unique([
    ...linksFromToolArgs(directory, input.tool, input.args),
    ...linksFromGrepOutput(output.output),
    ...linksFromText(output.title),
    ...linksFromText(output.output),
    ...linksFromUnknown(output.metadata),
  ]).flatMap((link) => windowsVariants(link))
}

function linksFromToolArgs(directory: string, tool: string, args: unknown) {
  if (!isRecord(args)) return []
  const fields = ["filePath", "filepath", "path"]
  return fields.flatMap((field) => {
    const value = args[field]
    if (typeof value !== "string") return []
    if (!looksLikePath(value)) return []
    return [normalizePathLink(directory, value)]
  })
}

function linksFromGrepOutput(value: string) {
  const links: string[] = []
  let current = ""
  for (const line of value.split(/\r?\n/)) {
    const header = line.match(/^(.+):$/)
    if (header?.[1] && looksLikePath(header[1])) {
      current = header[1]
      continue
    }
    const match = line.match(/^\s*Line\s+(\d+):/)
    if (current && match?.[1]) links.push(`${current}:${match[1]}`)
  }
  return links
}

function linksFromText(value: string) {
  const matches = value.matchAll(/((?:[A-Za-z]:[\\/]|\.\.?[\\/]|~[\\/]|[\w.-]+[\\/])[^\s<>"'`|]+?\.[A-Za-z0-9_+.-]+)(?::(\d+))?(?::(\d+))?/g)
  return [...matches]
    .map((match) => [match[1], match[2], match[3]].filter(Boolean).join(":"))
    .filter(looksLikePath)
}

function linksFromUnknown(value: unknown): string[] {
  if (typeof value === "string") return linksFromText(value)
  if (Array.isArray(value)) return value.flatMap(linksFromUnknown)
  if (!isRecord(value)) return []
  return Object.values(value).flatMap(linksFromUnknown)
}

function normalizePathLink(directory: string, value: string) {
  const absolute = path.isAbsolute(value) ? value : path.resolve(directory, value)
  return absolute
}

function windowsVariants(value: string) {
  if (process.platform !== "win32") return [value]
  const forward = value.replaceAll("\\", "/")
  return forward === value ? [value] : [value, forward]
}

function looksLikePath(value: string) {
  return (/[\\/]/.test(value) || /^[A-Za-z]:/.test(value)) && /\.[A-Za-z0-9_+.-]+(?::\d+)?(?::\d+)?$/.test(value)
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function debug(message: string) {
  const line = `[path-optimizer] ${new Date().toISOString()} ${message}`
  try {
    writeFileSync(LOG_FILE, line + "\n", { flag: "a" })
  } catch {}
}
