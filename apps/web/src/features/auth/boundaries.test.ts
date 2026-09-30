import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      files.push(...sourceFiles(path));
      continue;
    }
    if (!path.endsWith(".ts") && !path.endsWith(".tsx")) {
      continue;
    }
    if (path.endsWith(".test.ts") || path.endsWith(".test.tsx")) {
      continue;
    }
    files.push(path);
  }
  return files;
}

describe("auth boundaries", () => {
  it("does not authorize with getSession", () => {
    const root = join(process.cwd(), "src");
    const offenders = sourceFiles(root).filter((path) => {
      const source = readFileSync(path, "utf8");
      return source.includes(".auth.getSession");
    });
    expect(offenders).toEqual([]);
  });

  it("keeps the secret key out of client modules", () => {
    const root = join(process.cwd(), "src");
    const offenders = sourceFiles(root).filter((path) => {
      const source = readFileSync(path, "utf8");
      return (
        source.includes('"use client"') &&
        source.includes("SUPABASE_SECRET_KEY")
      );
    });
    expect(offenders.map((path) => relative(root, path))).toEqual([]);
  });
});
