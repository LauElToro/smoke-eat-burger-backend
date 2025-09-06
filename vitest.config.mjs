import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default {
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.js'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      'next/server': resolve(__dirname, 'tests/mocks/next-server.js'),
    },
  },
}