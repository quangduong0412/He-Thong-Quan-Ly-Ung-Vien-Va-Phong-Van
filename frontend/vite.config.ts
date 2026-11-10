/// <reference types="vitest" />
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
    'main.js', 'data.js', 'state.js', 'utils.js', 'components.js', 'router.js', 'actions.js',
  ]
  return {
    name: 'copy-prototype-assets',
    apply: 'build' as const,
    configResolved(config: { build: { outDir: string } }) {
      outDir = config.build.outDir
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
