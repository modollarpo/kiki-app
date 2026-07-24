import nodemailer from "nodemailer";
import { logger } from "./logger";

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  fromName: string;
}

function getConfig(): EmailConfig | null {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const from = process.env.SMTP_FROM || "";
  const fromName = process.env.SMTP_FROM_NAME || "KIKI Agent";
  if (!host || !user || !pass || !from) return null;
  return { host, port, user, pass, from, fromName };
}

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(config: EmailConfig): nodemailer.Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
    });
  }
  return _transporter;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const config = getConfig();
  if (!config) {
    logger.warn("[Email] SMTP not configured — skipping email to", { to, subject });
    return false;
  }
  try {
    const transporter = getTransporter(config);
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.from}>`,
      to,
      subject,
      html,
    });
    logger.info("[Email] Sent", { to, subject });
    return true;
  } catch (error) {
    logger.error("[Email] Failed to send", { to, subject, error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

export function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  return sendEmail(to, "Reset your KIKI Agent password", `
    <div style="font-family:monospace;max-width:480px;margin:0 auto;padding:24px;background:#111827;color:#f9fafb;border-radius:4px;">
      <h2 style="color:#10b981;margin:0 0 16px;">KIKI<span style="color:#3b82f6;">.</span>Agent</h2>
      <p style="font-size:13px;color:#9ca3af;line-height:1.6;">We received a request to reset your password. Click the button below to set a new one. This link expires in 15 minutes.</p>
      <a href="${resetUrl}" style="display:inline-block;padding:10px 24px;margin:16px 0;background:#3b82f6;color:#fff;text-decoration:none;border-radius:3px;font-size:13px;font-weight:700;">Reset Password</a>
      <p style="font-size:11px;color:#6b7280;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `);
}

export function sendWelcomeEmail(to: string, name: string, dashboardUrl: string): Promise<boolean> {
  return sendEmail(to, "Welcome to KIKI Agent", `
    <div style="font-family:monospace;max-width:480px;margin:0 auto;padding:24px;background:#111827;color:#f9fafb;border-radius:4px;">
      <h2 style="color:#10b981;margin:0 0 16px;">KIKI<span style="color:#3b82f6;">.</span>Agent</h2>
      <p style="font-size:13px;color:#f9fafb;margin:0 0 8px;">Hi ${name},</p>
      <p style="font-size:13px;color:#9ca3af;line-height:1.6;margin:0 0 16px;">Welcome to KIKI Agent — your autonomous LTV campaign execution platform. Your 14-day Growth trial is active.</p>
      <a href="${dashboardUrl}" style="display:inline-block;padding:10px 24px;margin:16px 0;background:#10b981;color:#fff;text-decoration:none;border-radius:3px;font-size:13px;font-weight:700;">Go to Dashboard</a>
      <p style="font-size:11px;color:#6b7280;">Need help? Reply to this email or contact support.</p>
    </div>
  `);
}
