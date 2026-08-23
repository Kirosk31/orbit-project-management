import { pino, type Logger } from 'pino'

export interface LoggerOptions {
  level: string
  isProduction: boolean
}

export function createLogger(options: LoggerOptions): Logger {
  return pino({
    level: options.level,
    base: {
      service: 'orbit-api',
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        '*.password',
        '*.token',
      ],
      censor: '[REDACTED]',
    },
    ...(options.isProduction || options.level === 'silent'
      ? {}
      : {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:HH:MM:ss',
              ignore: 'pid,hostname',
            },
          },
        }),
  })
}

export type { Logger }
