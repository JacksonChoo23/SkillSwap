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
  if (!base.startsWith('http://') && !base.startsWith('https://')) {
    base = 'http://' + base;
  }
  if (base.endsWith('/')) {
    base = base.slice(0, -1);
  }

  const url = `${base}/auth/reset/${token}`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f7fa;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Password Reset</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">SkillSwap MY</p>
      </div>
      
      <!-- Body -->
      <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="color: #333; font-size: 18px; margin: 0 0 20px 0;">Hi ${name || 'there'},</p>
        
        <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
          We received a request to reset the password for your SkillSwap MY account. Click the button below to create a new password:
        </p>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${url}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
            Reset Password
          </a>
        </div>
        
        <!-- Link fallback -->
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 25px 0;">
          <p style="color: #666; font-size: 12px; margin: 0 0 8px 0;">Or copy this link:</p>
          <p style="color: #667eea; font-size: 12px; margin: 0; word-break: break-all;">${url}</p>
        </div>
        
        <!-- Warning -->
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 0 8px 8px 0; margin: 25px 0;">
          <p style="color: #856404; font-size: 14px; margin: 0;">
            This link expires in <strong>1 hour</strong>. If you didn't request this, please ignore this email.
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <!-- Footer -->
        <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
          This is an automated message from SkillSwap MY.<br>
          Please do not reply to this email.
        </p>
      </div>
    </div>
  `;
  const text = `Hi ${name || 'there'},\n\nReset your password by visiting this link (valid for 1 hour):\n${url}\n\nIf you didn't request this, please ignore this email.`;
  return sendMail({ to, subject: 'Reset Your Password - SkillSwap MY', html, text });
}

async function sendActivationEmail({ to, name, token }) {
  let base = process.env.BASE_URL || 'http://localhost:3000';
  if (!base.startsWith('http://') && !base.startsWith('https://')) {
    base = 'http://' + base;
  }
  if (base.endsWith('/')) {
    base = base.slice(0, -1);
  }

  const url = `${base}/auth/activate/${token}`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f7fa;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Verify Your Email</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Welcome to SkillSwap MY</p>
      </div>
      
      <!-- Body -->
      <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="color: #333; font-size: 18px; margin: 0 0 20px 0;">Hi ${name || 'there'},</p>
        
        <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
          Thank you for joining SkillSwap MY! We're excited to have you on board. Please verify your email address to get started:
        </p>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${url}" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.4);">
            Verify Email Address
          </a>
        </div>
        
        <!-- Link fallback -->
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 25px 0;">
          <p style="color: #666; font-size: 12px; margin: 0 0 8px 0;">Or copy this link:</p>
          <p style="color: #667eea; font-size: 12px; margin: 0; word-break: break-all;">${url}</p>
        </div>
        
        <!-- Info box -->
        <div style="background: #e7f3ff; border-left: 4px solid #0d6efd; padding: 15px; border-radius: 0 8px 8px 0; margin: 25px 0;">
          <p style="color: #0d6efd; font-size: 14px; margin: 0;">
            Once verified, you can start learning and teaching skills with our community!
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <!-- Footer -->
        <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
          If you didn't create an account with SkillSwap MY, please ignore this email.<br><br>
          This is an automated message. Please do not reply.
        </p>
      </div>
    </div>
  `;
  const text = `Hi ${name || 'there'},\n\nWelcome to SkillSwap MY! Please verify your email by visiting:\n${url}\n\nIf you didn't register, please ignore this email.`;

  // Log the activation link clearly for testing
  console.log('\n' + '='.repeat(80));
  console.log('[EMAIL] ACTIVATION EMAIL LINK');
  console.log('='.repeat(80));
  console.log(`To: ${to}`);
  console.log(`Activation Link: ${url}`);
  console.log('='.repeat(80) + '\n');

  return sendMail({ to, subject: 'Verify Your Email - SkillSwap MY', html, text });
}


async function sendNotificationEmail({ to, name, title, message }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">SkillSwap MY</h1>
      </div>
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="color: #333; font-size: 16px;">Hi ${name || 'there'},</p>
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #333;">${title}</h3>
          <p style="margin: 0; color: #666; line-height: 1.6;">${message}</p>
        </div>
        <p style="color: #666; font-size: 14px;">
          You can view all your notifications by logging into your account.
        </p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          This is an automated message from SkillSwap MY. Please do not reply to this email.
        </p>
      </div>
    </div>
  `;
  const text = `${title}\n\n${message}`;

  try {
    await sendMail({ to, subject: `[SkillSwap MY] ${title}`, html, text });
    console.log(`[MAIL] Notification email sent to ${to}: ${title}`);
  } catch (err) {
    console.error(`[MAIL] Failed to send notification email to ${to}:`, err.message);
  }
}

module.exports = { transport, verify, sendMail, sendResetEmail, sendActivationEmail, sendNotificationEmail };

