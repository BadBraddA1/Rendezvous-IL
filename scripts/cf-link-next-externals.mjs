#!/usr/bin/env node
/**
 * Next 16 Turbopack externalizes native deps as hashed package names
 * (e.g. sharp-<hash>, ably-<hash>) under .next/node_modules. OpenNext's
 * esbuild resolves from the project root, so copy those stubs into
 * node_modules before the Worker bundle step.
 *
 * Only link *hashed* package names. Never replace real deps like
 * `@libsql/client` — an earlier version wiped that scope and broke
 * subsequent `next build`s.
 */
import fs from "node:fs"
import path from "node:path"

const srcDir = path.resolve(".next/node_modules")
const destDir = path.resolve("node_modules")

/** Turbopack hash suffix: name-<16 hex chars> */
const HASHED = /-[a-f0-9]{10,}$/i

if (!fs.existsSync(srcDir)) {
  console.error(`[cf-link-next-externals] missing ${srcDir} — run next build first`)
  process.exit(1)
}

let linked = 0

function linkOne(name, src, dest) {
  if (!HASHED.test(name)) {
    console.log(`[cf-link-next-externals] skip unhashed ${name}`)
    return
  }
  fs.rmSync(dest, { recursive: true, force: true })
  fs.cpSync(src, dest, { recursive: true })
  linked += 1
  console.log(`[cf-link-next-externals] linked ${name}`)
}

for (const name of fs.readdirSync(srcDir)) {
  const src = path.join(srcDir, name)
  const dest = path.join(destDir, name)
  const stat = fs.lstatSync(src)

  // Scoped packages: .next/node_modules/@scope/<pkg-hash>
  if (name.startsWith("@") && stat.isDirectory() && !stat.isSymbolicLink()) {
    for (const child of fs.readdirSync(src)) {
      const childSrc = path.join(src, child)
      const childDest = path.join(dest, child)
      const childStat = fs.lstatSync(childSrc)
      if (!childStat.isDirectory() && !childStat.isSymbolicLink()) continue
      fs.mkdirSync(dest, { recursive: true })
      linkOne(`${name}/${child}`, childSrc, childDest)
    }
    continue
  }

  if (!stat.isDirectory() && !stat.isSymbolicLink()) continue
  linkOne(name, src, dest)
}

if (linked === 0) {
  console.log("[cf-link-next-externals] nothing to link")
}
