import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { config } from './config.js';
import { logger } from './logger.js';

let transporter: nodemailer.Transporter | null = null;
let usingEthereal = false;
let resend: Resend | null = null;

const resendConfigured = !!config.resendApiKey?.trim();
const smtpConfigured = !!(config.email.user && config.email.pass && config.email.host);
const isGmailHost = () => config.email.host.toLowerCase().includes('gmail');

const fromDisplayName = () => config.email.fromName ?? 'Bookshelf Helpdesk';

function getResendFrom(): string {
  const from = config.email.from?.trim();
  const name = fromDisplayName();
  const cannotUseWithResend =
    !from ||
    from.endsWith('@bookshelf.app') ||
    from.includes('resend.dev') ||
    /@(gmail|googlemail)\.com$/i.test(from);
  if (from && from.includes('@') && !cannotUseWithResend) {
    return from.includes('<') ? from : `${name} <${from}>`;
  }
  return `${name} <onboarding@resend.dev>`;
}

export async function initEmail(): Promise<void> {
  if (smtpConfigured) {
    transporter = nodemailer.createTransport(
      isGmailHost()
        ? {
            service: 'gmail',
            auth: { user: config.email.user, pass: config.email.pass },
          }
        : {
            host: config.email.host,
            port: config.email.port,
            secure: config.email.secure,
            auth: { user: config.email.user, pass: config.email.pass },
          }
    );
    try {
      await transporter.verify();
      logger.info(
        isGmailHost()
          ? 'Email: Gmail SMTP verified – emails will be sent to recipients’ inboxes.'
          : 'Email: SMTP connection verified – emails will be sent to recipients’ inboxes.',
        { host: config.email.host, from: config.email.from }
      );
    } catch (err) {
      transporter = null;
      logger.error('Email: Gmail SMTP failed. Other users will NOT get reset emails until you fix this.', {
        error: err instanceof Error ? err.message : String(err),
        fix: 'Set SMTP_PASS in .env to your Gmail App Password (16 chars from myaccount.google.com/apppasswords). We do not use Resend when Gmail is set, so you must fix Gmail to send to other users.',
      });
      return;
    }
    return;
  }
  if (resendConfigured) {
    resend = new Resend(config.resendApiKey);
    const from = getResendFrom();
    if (from === 'onboarding@resend.dev') {
      logger.info(
        'Email: Resend configured (testing). Reset links only go to your Resend account email. To send to ALL users, use Gmail: set SMTP_USER, SMTP_PASS, EMAIL_FROM in .env (see EMAIL_AND_PASSWORD_RESET.md).'
      );
    } else {
      logger.info('Email: Resend configured – reset links will be sent to any recipient’s inbox.', { from });
    }
    return;
  }
  await setupEthereal();
}

async function setupEthereal(): Promise<void> {
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    usingEthereal = true;
    logger.info(
      'Email: No Resend or SMTP in .env – using Ethereal. Add RESEND_API_KEY to send the link directly to your inbox (see EMAIL_AND_PASSWORD_RESET.md).'
    );
  } catch (err) {
    logger.warn('Email: Could not create Ethereal test account. Emails will only be logged.', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { to, subject, text, html } = options;
  if (!text && !html) {
    logger.warn('sendEmail: no text or html provided', { to, subject });
  }

  if (transporter) {
    try {
      const from = config.email.fromName ? `"${config.email.fromName}" <${config.email.from}>` : config.email.from;
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        text: text ?? (html ? undefined : '(no content)'),
        html: html ?? undefined,
      });
      logger.info('Email sent', { to, subject });
      if (usingEthereal) {
        const previewUrl = nodemailer.getTestMessageUrl(info as nodemailer.SentMessageInfo);
        if (previewUrl) logger.info('View the email in your browser: ' + previewUrl);
      }
    } catch (err) {
      logger.error('Failed to send email', {
        to,
        subject,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    }
    return;
  }

  if (resend) {
    try {
      const { error } = await resend.emails.send({
        from: getResendFrom(),
        to: [to],
        subject,
        html: html ?? (text ? `<p>${text.replace(/\n/g, '<br>')}</p>` : undefined),
        text: text ?? undefined,
      });
      if (error) throw new Error(error.message);
      logger.info('Email sent (Resend) – delivered to inbox', { to, subject });
    } catch (err) {
      logger.error('Failed to send email via Resend', {
        to,
        subject,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
    return;
  }

  logger.info('Email not sent (no transporter). Would have sent:', { to, subject });
  if (text) logger.info('Text: ' + text);
  if (html) logger.info('HTML length: ' + html.length + ' chars');
}

function escapeHtmlAttr(url: string): string {
  return url
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  const link = resetLink.replace(/\s+/g, '').trim();
  const linkEscaped = escapeHtmlAttr(link);
  const subject = 'Reset your Bookshelf password';
  const html = `
    <p>You requested a password reset for your Bookshelf account.</p>
    <p>Click the link below to set a new password (valid for 1 hour):</p>
    <p><a href="${linkEscaped}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Reset my password</a></p>
    <p style="color:#666;font-size:12px;">Or copy this link and paste it into your browser:</p>
    <p style="color:#666;font-size:12px;word-break:break-all;"><a href="${linkEscaped}">${link.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</a></p>
    <p>If you didn't request this, you can ignore this email.</p>
  `;
  const text = `Reset your password: ${link}\n\nIf you didn't request this, ignore this email.`;

  if (resendConfigured || transporter) {
    await sendEmail({ to, subject, text, html });
  } else {
    logger.info('Password reset requested but email is NOT configured. Copy this link to reset the password:');
    logger.info(link);
  }
}
