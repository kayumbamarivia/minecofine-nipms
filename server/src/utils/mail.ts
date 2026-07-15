import nodemailer from 'nodemailer';
import { config } from '../config.js';

export interface OutboundEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

function smtpConfigured() {
  return Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);
}

/**
 * Sends mail via SMTP when configured.
 * In local/dev without SMTP, logs the message (including action links) to the API console.
 */
export async function sendEmail(message: OutboundEmail): Promise<{ delivered: boolean; mode: 'smtp' | 'console' }> {
  const from = `"${config.mailFromName}" <${config.mailFromAddress}>`;

  if (!smtpConfigured()) {
    console.log('\n========== NIPMS EMAIL (console delivery) ==========');
    console.log(`To: ${message.to}`);
    console.log(`Subject: ${message.subject}`);
    console.log(message.text);
    console.log('====================================================\n');
    return { delivered: true, mode: 'console' };
  }

  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });

  await transporter.sendMail({
    from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html ?? message.text.replace(/\n/g, '<br/>'),
  });

  return { delivered: true, mode: 'smtp' };
}

export function verificationEmail(fullName: string, verifyUrl: string) {
  return {
    subject: 'Verify your NIPMS email address',
    text: [
      `Dear ${fullName},`,
      '',
      'Your NIPMS account requires email verification before you can sign in.',
      '',
      `Open this link to verify (valid for 48 hours):`,
      verifyUrl,
      '',
      'If you did not expect this message, contact MINECOFIN portfolio administration.',
      '',
      '— National Investment Portfolio Management System',
    ].join('\n'),
  };
}

export function inviteEmail(
  fullName: string,
  email: string,
  temporaryPassword: string,
  verifyUrl: string,
) {
  return {
    subject: 'Your NIPMS account has been created',
    text: [
      `Dear ${fullName},`,
      '',
      'An authorised administrator has created your NIPMS account.',
      '',
      `Sign-in email: ${email}`,
      `Temporary password: ${temporaryPassword}`,
      '',
      '1) Verify your email using this link (valid for 48 hours):',
      verifyUrl,
      '2) Sign in and change your temporary password immediately.',
      '',
      '— National Investment Portfolio Management System',
    ].join('\n'),
  };
}

export function passwordResetEmail(fullName: string, resetUrl: string) {
  return {
    subject: 'Reset your NIPMS password',
    text: [
      `Dear ${fullName},`,
      '',
      'A password reset was requested for your NIPMS account.',
      '',
      `Open this link to choose a new password (valid for 1 hour):`,
      resetUrl,
      '',
      'If you did not request this, you can ignore this message — your current password stays unchanged.',
      '',
      '— National Investment Portfolio Management System',
    ].join('\n'),
  };
}
