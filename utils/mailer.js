// src/utils/mailer.js
const nodemailer = require('nodemailer');

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT || 1025),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  } : undefined,
  ignoreTLS: true, // often needed for localhost
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
  let base = process.env.BASE_URL || 'http://localhost:3000';
  // Ensure protocol
  if (!base.startsWith('http://') && !base.startsWith('https://')) {
    base = 'http://' + base;
  }
  // Remove trailing slash if present to avoid double slashes
  if (base.endsWith('/')) {
    base = base.slice(0, -1);
  }

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
  let base = process.env.BASE_URL || 'http://localhost:3000';
  // Ensure protocol
  if (!base.startsWith('http://') && !base.startsWith('https://')) {
    base = 'http://' + base;
  }
  // Remove trailing slash if present
  if (base.endsWith('/')) {
    base = base.slice(0, -1);
  }

  const url = `${base}/auth/activate/${token}`;
  const html = `
    <p>Hi ${name || ''},</p>
    <p>Thank you for registering. Please click the link below to verify your email address:</p>
    <p><a href="${url}">${url}</a></p>
    <p>If you did not register for this account, please ignore this email.</p>
  `;
  const text = `Verify your email: ${url}`;

  // Log the activation link clearly for testing
  console.log('\n' + '='.repeat(80));
  console.log('📧 ACTIVATION EMAIL LINK');
  console.log('='.repeat(80));
  console.log(`To: ${to}`);
  console.log(`Activation Link: ${url}`);
  console.log('='.repeat(80) + '\n');

  return sendMail({ to, subject: 'Verify your email - SkillSwap MY', html, text });
}

module.exports = { transport, verify, sendMail, sendResetEmail: sendResetEmail, sendActivationEmail };
