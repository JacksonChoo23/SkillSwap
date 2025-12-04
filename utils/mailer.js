// src/utils/mailer.js
const nodemailer = require('nodemailer');

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 2525),
  secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  logger: process.env.MAIL_DEBUG === '1',
  debug: process.env.MAIL_DEBUG === '1'
});

async function verify() {
  try {
    await transport.verify();
    console.log('[MAIL] SMTP verify: OK');
  } catch (err) {
    console.error('[MAIL] SMTP verify: FAIL', err);
  }
}

async function sendMail({ to, subject, html, text }) {
  return transport.sendMail({
    from: process.env.MAIL_FROM || 'SkillSwap MY <no-reply@skillswap.my>',
    to,
    subject,
    text: text || '',
    html
  });
}

async function sendResetEmail({ to, name, token }) {
  const base = process.env.BASE_URL || 'http://localhost:3000';
  const url = `${base}/auth/reset/${token}`;
  const html = `
    <p>Hi ${name || ''},</p>
    <p>Click the link to reset your password (1 hour valid):</p>
    <p><a href="${url}">${url}</a></p>
    <p>If you did not request this, ignore this email.</p>
  `;
  const text = `Reset your password: ${url}`;
  return sendMail({ to, subject: 'Reset your password', html, text });
}

async function sendActivationEmail({ to, name, token }) {
  const base = process.env.BASE_URL || 'http://localhost:3000';
  const url = `${base}/auth/activate/${token}`;
  const html = `
    <p>Hi ${name || ''},</p>
    <p>Thank you for registering. Please click the link below to verify your email address:</p>
    <p><a href="${url}">${url}</a></p>
    <p>If you did not register for this account, please ignore this email.</p>
  `;
  const text = `Verify your email: ${url}`;
  return sendMail({ to, subject: 'Verify your email - SkillSwap MY', html, text });
}

module.exports = { transport, verify, sendMail, sendResetEmail: sendResetEmail, sendActivationEmail };
