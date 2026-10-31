/**
 * Builds the site into the Kairo website repo as a private, unlisted page:
 *   https://myaidoppelganger.com/hbd-albert-z6f9fm/
 *
 * Nothing on myaidoppelganger.com links to it (not in the header, the page, the sitemap or robots.txt);
 * the page and its files are noindex. Commit + push the Kairo repo to deploy (Cloudflare Pages).
 *
 *   npm run build:doppel
 */
import { readdir, rename, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

export const PRIVATE_PATH = 'hbd-albert-z6f9fm'
const SITE_DIR = fileURLToPath(new URL('../../myaidoppelganger-site/site/', import.meta.url))
const outDir = join(SITE_DIR, PRIVATE_PATH)

try {
  await stat(SITE_DIR)
} catch {
  console.error(`Kairo site not found at ${SITE_DIR}`)
  process.exit(1)
}

await build({
  mode: 'doppel',
  base: `/${PRIVATE_PATH}/`,
  logLevel: 'warn',
  build: { outDir, emptyOutDir: true },
})

// public/ notes are for whoever edits this project, not for the published page
async function dropReadmes(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) await dropReadmes(p)
    else if (entry.name === 'README.md') await rm(p)
  }
}
await dropReadmes(outDir)

// Same AAC audio, .mp4 name: Cloudflare caches .mp4 at the edge and answers byte-range requests for it (iPhone
// Safari needs those to play audio); .m4a isn't on its cacheable list and comes back as an uncached full download.
// The player looks for .mp4 first.
const musicDir = join(outDir, 'music')
for (const name of await readdir(musicDir).catch(() => [])) {
  if (name.endsWith('.m4a')) await rename(join(musicDir, name), join(musicDir, name.replace(/\.m4a$/, '.mp4')))
}

console.log(`Built → ${outDir}`)
console.log(`Live after deploy at https://myaidoppelganger.com/${PRIVATE_PATH}/`)
