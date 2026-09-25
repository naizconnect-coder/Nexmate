import nodemailer from "nodemailer"
import type { Transporter } from "nodemailer"

export interface SmtpMailRecipient {
  email: string
  name?: string | null
}

export interface SendSmtpMailInput {
  to?: SmtpMailRecipient[]
  bcc?: SmtpMailRecipient[]
  subject: string
  htmlBody: string
}

interface SmtpConfig {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

const globalForSmtp = globalThis as typeof globalThis & {
  __nexmateSmtpTransporter?: Transporter
}

function readSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim()
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM?.trim() || user

  if (!host || !user || !pass || !from) return null

  const port = Number.parseInt(process.env.SMTP_PORT ?? "587", 10)
  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 587,
    user,
    pass,
    from,
  }
}

export function isSmtpConfigured(): boolean {
  return readSmtpConfig() !== null
}

export function getSmtpFromAddress(): string | null {
  return readSmtpConfig()?.from ?? null
}

function getSmtpTransporter(): Transporter {
  const config = readSmtpConfig()
  if (!config) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM in the environment."
    )
  }

  if (!globalForSmtp.__nexmateSmtpTransporter) {
    globalForSmtp.__nexmateSmtpTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      requireTLS: config.port === 587,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    })
  }

  return globalForSmtp.__nexmateSmtpTransporter
}

function mapRecipients(recipients: SmtpMailRecipient[]) {
  return recipients.map((recipient) => ({
    address: recipient.email.trim(),
    name: recipient.name?.trim() || undefined,
  }))
}

export async function sendSmtpMail(input: SendSmtpMailInput): Promise<void> {
  const to = input.to ?? []
  const bcc = input.bcc ?? []
  if (to.length === 0 && bcc.length === 0) {
    throw new Error("At least one email recipient is required")
  }

  const config = readSmtpConfig()
  if (!config) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM in the environment."
    )
  }

  const transporter = getSmtpTransporter()
  await transporter.sendMail({
    from: config.from,
    to: mapRecipients(to),
    bcc: mapRecipients(bcc),
    subject: input.subject,
    html: input.htmlBody,
  })
}
