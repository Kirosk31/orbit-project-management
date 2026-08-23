import type { SendMailOptions } from './mail.js'

export interface TemplateContext {
  appUrl: string
  fullName: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function layout(content: string, title: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
            <tr>
              <td style="padding:24px 32px;border-bottom:1px solid #e4e4e7;">
                <span style="font-size:18px;font-weight:700;color:#18181b;">Orbit</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 12px;font-size:20px;color:#18181b;">${title}</h1>
                ${content}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a;">
                You received this email because of your Orbit account. If this wasn't you, you can safely ignore it.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`
}

function primaryButton(href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td style="background:#4f46e5;border-radius:8px;">
          <a href="${href}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;border-radius:8px;">${label}</a>
        </td>
      </tr>
    </table>`
}

export function createVerificationEmail(
  context: TemplateContext,
  token: string,
): Omit<SendMailOptions, 'to'> {
  const link = `${context.appUrl}/verify-email?token=${encodeURIComponent(token)}`
  const safeName = escapeHtml(context.fullName)
  const safeLink = escapeHtml(link)
  return {
    subject: 'Verify your Orbit email',
    html: layout(
      `<p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.6;">Hi ${safeName},</p>
       <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.6;">Welcome to Orbit. Please confirm your email address to activate your account.</p>
       ${primaryButton(safeLink, 'Verify email')}
       <p style="margin:16px 0 0;color:#71717a;font-size:13px;">Or copy this link into your browser:<br/><a href="${safeLink}" style="color:#4f46e5;">${safeLink}</a></p>`,
      'Confirm your email address',
    ),
  }
}

export function createPasswordResetEmail(
  context: TemplateContext,
  token: string,
): Omit<SendMailOptions, 'to'> {
  const link = `${context.appUrl}/reset-password?token=${encodeURIComponent(token)}`
  const safeName = escapeHtml(context.fullName)
  const safeLink = escapeHtml(link)
  return {
    subject: 'Reset your Orbit password',
    html: layout(
      `<p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.6;">Hi ${safeName},</p>
       <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.6;">We received a request to reset your password. This link expires in one hour.</p>
       ${primaryButton(safeLink, 'Reset password')}
       <p style="margin:16px 0 0;color:#71717a;font-size:13px;">If you didn't request this, you can ignore this email.</p>`,
      'Reset your password',
    ),
  }
}

export function createInvitationEmail(
  context: { appUrl: string; organizationName: string },
  token: string,
): Omit<SendMailOptions, 'to'> {
  const link = `${context.appUrl}/app/organizations?invitationToken=${encodeURIComponent(token)}`
  const safeOrganizationName = escapeHtml(context.organizationName)
  const safeLink = escapeHtml(link)
  const subjectOrganizationName = context.organizationName.replace(/[\r\n]+/g, ' ').trim()

  return {
    subject: `Join ${subjectOrganizationName} on Orbit`,
    html: layout(
      `<p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.6;">You have been invited to join <strong>${safeOrganizationName}</strong> on Orbit.</p>
       <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.6;">This single-use invitation expires in seven days and is valid only for this email address.</p>
       ${primaryButton(safeLink, 'Accept invitation')}
       <p style="margin:16px 0 0;color:#71717a;font-size:13px;">If you were not expecting this invitation, you can ignore this email.</p>`,
      'You are invited to Orbit',
    ),
  }
}
