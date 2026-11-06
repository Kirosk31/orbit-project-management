import orbitConfig from '@orbit/eslint-config'

export default [
  ...orbitConfig,
  {
    ignores: ['.claude/**', '**/.impeccable/**', 'apps/site/.next/**', 'apps/site/next-env.d.ts'],
  },
  {
    files: ['**/prisma/seed.ts', '**/prisma/demo-seed.ts'],
    rules: {
      'no-console': 'off',
    },
  },
]
