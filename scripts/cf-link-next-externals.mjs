#!/usr/bin/env node
/**
 * Next 16 Turbopack externalizes native deps as hashed package names
 * (e.g. sharp-<hash>) under .next/node_modules. OpenNext's esbuild
 * resolves from the project root, so copy those stubs into node_modules
 * before the Worker bundle step.
 */
import fs from "node:fs"
import path from "node:path"

const srcDir = path.resolve(".next/node_modules")
const destDir = path.resolve("node_modules")

if (!fs.existsSync(srcDir)) {
  console.error(`[cf-link-next-externals] missing ${srcDir} — run next build first`)
  process.exit(1)
}

let linked = 0
for (const name of fs.readdirSync(srcDir)) {
  const src = path.join(srcDir, name)
  const dest = path.join(destDir, name)
  const stat = fs.lstatSync(src)
  if (!stat.isDirectory() && !stat.isSymbolicLink()) continue

  fs.rmSync(dest, { recursive: true, force: true })
  fs.cpSync(src, dest, { recursive: true })
  linked += 1
  console.log(`[cf-link-next-externals] linked ${name}`)
}

if (linked === 0) {
  console.log("[cf-link-next-externals] nothing to link")
}
