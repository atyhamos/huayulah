/* Build the guest-mode demo for hosting as a claude.ai artifact: dist-artifact/ + page.html + strokes.json. */
import { execSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const out = join(root, 'dist-artifact')
execSync('npx vite build --mode artifact --outDir dist-artifact --emptyOutDir', { cwd: root, stdio: 'inherit' })

// one combined stroke file (the artifact host limits file counts)
const strokesDir = join(root, 'public/strokes')
const strokes: Record<string, unknown> = {}
for (const f of readdirSync(strokesDir)) if (f.endsWith('.json')) strokes[f.slice(0, -5)] = JSON.parse(readFileSync(join(strokesDir, f), 'utf8'))
writeFileSync(join(out, 'strokes.json'), JSON.stringify(strokes))

// the artifact host supplies <html>/<head>/<body>; keep only our tags
const html = readFileSync(join(out, 'index.html'), 'utf8')
const tags = [...html.matchAll(/<(script|link)\b[^>]*>(<\/script>)?/g)]
  .map((m) => m[0])
  .filter((t) => /assets\//.test(t))
const page = [
  '<title>Huayulah</title>',
  '<meta name="theme-color" content="#42805d">',
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Figtree:wght@400..800&family=Ma+Shan+Zheng&display=swap">',
  ...tags,
  '<div id="root"></div>',
].join('\n')
writeFileSync(join(out, 'page.html'), page + '\n')

// the artifact host rejects a literal U+FFFD (it appears in a template string in the Claude SDK); escape it
for (const f of readdirSync(join(out, 'assets'))) {
  if (!f.endsWith('.js')) continue
  const path = join(out, 'assets', f)
  const js = readFileSync(path, 'utf8')
  if (js.includes('\uFFFD')) writeFileSync(path, js.replaceAll('\uFFFD', '\\uFFFD'))
}

const assets = readdirSync(join(out, 'assets')).map((a) => `assets/${a}`)
const otter = readdirSync(join(out, 'otter')).map((a) => `otter/${a}`)
console.log(`artifact: page.html + strokes.json + ${assets.length} assets + ${otter.length} otter files`)
console.log(JSON.stringify(Object.fromEntries([...assets, ...otter].map((a) => [a, `dist-artifact/${a}`])), null, 1))
