import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

export interface SkillEntry {
  name: string
  path: string
}

function readName(markdown: string, fallback: string): string {
  const frontmatter = markdown.match(/^---\s*([\s\S]*?)\s*---/)
  if (frontmatter) {
    const name = frontmatter[1].match(/^name:\s*["']?([^"'\r\n]+)["']?/m)
    if (name) return name[1].trim()
  }
  const heading = markdown.match(/^#\s+(.+)$/m)
  return heading ? heading[1].trim() : fallback
}

export function listProjectSkills(root = join(__dirname, "..")): SkillEntry[] {
  const skillsDir = join(root, "skills")
  if (!existsSync(skillsDir)) return []
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => {
      const skillPath = join(skillsDir, entry.name, "SKILL.md")
      if (!existsSync(skillPath)) return null
      const markdown = readFileSync(skillPath, "utf8")
      return {
        name: readName(markdown, entry.name),
        path: relative(root, skillPath),
      }
    })
    .filter((x): x is SkillEntry => x !== null)
    .sort((a, b) => a.name.localeCompare(b.name))
}
