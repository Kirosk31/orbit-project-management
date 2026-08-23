import { createTransport, type Transporter } from 'nodemailer'
import type { AppConfig } from '../../config/index.js'
import type { Logger } from '../../core/logger/logger.js'

export interface MailAddress {
  name?: string
  address: string
}

export interface SendMailOptions {
  to: MailAddress
  subject: string
  text?: string
  html?: string
}

export interface MailService {
  sendMail(options: SendMailOptions): Promise<void>
}

export class SmtpMailService implements MailService {
  private readonly transporter: Transporter

  constructor(
    private readonly config: AppConfig,
    private readonly logger: Logger,
  ) {
    this.transporter = createTransport({
      host: config.env.SMTP_HOST,
      port: config.env.SMTP_PORT,
      secure: config.env.SMTP_PORT === 465,
      auth:
        config.env.SMTP_USER && config.env.SMTP_PASS
          ? { user: config.env.SMTP_USER, pass: config.env.SMTP_PASS }
          : undefined,
    })
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    const recipient = options.to.name
      ? `"${options.to.name}" <${options.to.address}>`
      : options.to.address

    await this.transporter.sendMail({
      from: this.config.env.SMTP_FROM,
      to: recipient,
      subject: options.subject,
      text: options.text,
      html: options.html,
    })

    this.logger.debug({ to: options.to.address, subject: options.subject }, 'email sent')
  }
}

export class ConsoleMailService implements MailService {
  constructor(private readonly logger: Logger) {}

  async sendMail(options: SendMailOptions): Promise<void> {
    this.logger.info(
      {
        to: options.to.address,
        subject: options.subject,
        hasHtml: options.html !== undefined,
      },
      'email queued (console transport, SMTP not configured)',
    )
  }
}

export function createMailService(config: AppConfig, logger: Logger): MailService {
  if (config.env.SMTP_HOST) {
    return new SmtpMailService(config, logger)
  }
  return new ConsoleMailService(logger)
}
