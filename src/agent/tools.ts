import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs"
import { execSync } from "node:child_process"
import { resolve } from "node:path"
import type { ToolDef } from "../providers/base.ts"

export const TOOL_DEFS: ToolDef[] = [
  {
    name: "read_file",
    description: "Read the contents of a file at the given path.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path relative to the working directory" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write content to a file, creating it if it does not exist.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path to write" },
        content: { type: "string", description: "Full content to write" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "list_dir",
    description: "List files and directories at a path.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory path (default: current directory)" },
      },
    },
  },
  {
    name: "execute_shell",
    description: "Execute a shell command and return stdout.",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command to run" },
      },
      required: ["command"],
    },
  },
]

export type ToolResult = { output: string; error?: string }
export type PermissionGate = (toolName: string, args: Record<string, unknown>) => Promise<boolean>

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  gate: PermissionGate,
  cwd = process.cwd(),
): Promise<ToolResult> {
  const allowed = await gate(name, args)
  if (!allowed) return { output: "", error: "user denied" }

  try {
    switch (name) {
      case "read_file": {
        const p = resolve(cwd, String(args.path ?? ""))
        if (!existsSync(p)) return { output: "", error: `file not found: ${args.path}` }
        return { output: readFileSync(p, "utf8") }
      }
      case "write_file": {
        const p = resolve(cwd, String(args.path ?? ""))
        writeFileSync(p, String(args.content ?? ""), "utf8")
        return { output: `wrote ${p}` }
      }
      case "list_dir": {
        const p = resolve(cwd, String(args.path ?? "."))
        const entries = readdirSync(p, { withFileTypes: true })
        return {
          output: entries.map(e => (e.isDirectory() ? `${e.name}/` : e.name)).join("\n"),
        }
      }
      case "execute_shell": {
        const out = execSync(String(args.command ?? ""), { cwd, encoding: "utf8", timeout: 30_000, shell: true })
        return { output: out }
      }
      default:
        return { output: "", error: `unknown tool: ${name}` }
    }
  } catch (err) {
    return { output: "", error: err instanceof Error ? err.message : String(err) }
  }
}
