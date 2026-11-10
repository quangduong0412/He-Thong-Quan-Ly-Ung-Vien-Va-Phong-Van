/// <reference types="vitest" />
import { createHash } from 'node:crypto'
import { cpSync, mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const src = (p: string) => fileURLToPath(new URL(`./src/lib/${p}`, import.meta.url))

function copyPrototypeAssets() {
  let outDir = ''
  const projectRoot = fileURLToPath(new URL('.', import.meta.url))
  const files = [
    'auth.js', 'main.js', 'data.js', 'state.js', 'utils.js', 'components.js', 'router.js', 'actions.js',
  ]

  /** Vân tay nội dung của một file nguồn; đổi khi file đổi, giữ nguyên khi không đổi. */
  const fingerprint = (path: string): string | null => {
    try {
      return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 8)
    } catch {
      return null
    }
  }

  return {
    name: 'copy-prototype-assets',
    apply: 'build' as const,
    configResolved(config: { build: { outDir: string } }) {
      outDir = config.build.outDir
    },
    /**
     * Các script/style này được copy nguyên tên (không có hash trong tên) nhưng Frappe serve chúng với
     * Cache-Control: max-age=43200. Nếu không có gì phân biệt, trình duyệt sẽ dùng bản cũ tới 12 tiếng sau
     * khi deploy. Gắn ?v=<hash nội dung> vào URL: file nào đổi thì trình duyệt tải lại file đó, file không
     * đổi vẫn được cache. Trang HTML luôn mới vì www/duongtest.py đặt no_cache = 1.
     */
    transformIndexHtml: {
      order: 'post' as const,
      handler(html: string) {
        return html.replace(/(src|href)="([^"]*?\/((?:src|styles)\/[^"?]+\.(?:js|css)))"/g, (match, attr, url, relative) => {
          const hash = fingerprint(resolve(projectRoot, relative))
          return hash ? `${attr}="${url}?v=${hash}"` : match
        })
      },
    },
    closeBundle() {
      const source = resolve(projectRoot, 'src')
      const target = resolve(outDir, 'src')
      mkdirSync(target, { recursive: true })
      for (const file of files) cpSync(resolve(source, file), resolve(target, file))
      cpSync(resolve(source, 'pages'), resolve(target, 'pages'), { recursive: true })
      cpSync(resolve(projectRoot, 'styles'), resolve(outDir, 'styles'), { recursive: true })
    },
  }
}

/** Cổng web của bench (sites/common_site_config.json) cho `yarn dev`; mặc định 8000. */
function benchPort(): number {
  try {
    const config = JSON.parse(readFileSync(new URL('../../../sites/common_site_config.json', import.meta.url), 'utf8'))
    return Number(config.webserver_port) || 8000
  } catch {
    return 8000
  }
}

/**
 * - build (`bench build --app mbw_assistant_mhiring` → `yarn build`): Vite publishes the page;
 *   copyPrototypeAssets keeps the modular classic scripts and styles alongside the built HTML.
 * - dev (`yarn dev`): opens the prototype at http://localhost:5173/ with the bench API proxy available.
 */
export default defineConfig(({ command }) => {
  const bench = `http://127.0.0.1:${benchPort()}`
  return {
    base: command === 'build' ? '/assets/duongtest/frontend/' : '/',
    plugins: [react(), copyPrototypeAssets()],
    resolve: {
      alias: [
        { find: '@assistant/protocol/testing', replacement: src('protocol/testing/index.ts') },
        { find: '@assistant/protocol', replacement: src('protocol/index.ts') },
        { find: '@assistant/core', replacement: src('core/index.ts') },
        { find: '@assistant/extension-sdk', replacement: src('extension-sdk/index.ts') },
        { find: '@assistant/ext-mhiring', replacement: src('ext-mhiring/index.tsx') },
      ],
    },
    server: {
      port: 5173,
      proxy: Object.fromEntries(['/api', '/login', '/assets', '/files', '/private', '/app'].map(p => [p, { target: bench, ws: true }])),
    },
    build: {
      outDir: '../duongtest/public/frontend',
      emptyOutDir: true,
      sourcemap: true,
    },
    test: { include: ['src/**/*.test.{ts,tsx}'], environment: 'node' },
  }
})
