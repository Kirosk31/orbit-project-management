import orbitConfig from '@orbit/eslint-config'

export default [
  ...orbitConfig,
  {
    files: ['**/prisma/seed.ts'],
    rules: {
      'no-console': 'off',
    },
  },
]
