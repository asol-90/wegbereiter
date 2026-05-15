import { defineConfig, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// `test` is read by Vitest and is not part of Vite's UserConfig type.
type ViteUserConfigWithTest = UserConfig & {
  test?: {
    environment?: string
    globals?: boolean
    setupFiles?: string[]
    css?: boolean
    exclude?: string[]
  }
}

const config: ViteUserConfigWithTest = {
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    exclude: ['node_modules', 'dist', '.claude/worktrees/**'],
  },
}

// https://vite.dev/config/
export default defineConfig(config)
