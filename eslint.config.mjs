import orbitConfig from '@orbit/eslint-config'

export default [
  ...orbitConfig,
  {
    ignores: ['.claude/**', '**/.impeccable/**'],
  },
  {
    files: ['**/prisma/seed.ts', '**/prisma/demo-seed.ts'],
    rules: {
      'no-console': 'off',
    },
  },
]
