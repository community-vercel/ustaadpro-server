import nodemailer from 'nodemailer';

const requiredSmtpKeys = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];

function hasSmtpConfig() {
  return requiredSmtpKeys.every(key => Boolean(process.env[key]));
}

function createTransporter() {
  if (!hasSmtpConfig()) {
    return nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendOtpEmail({ to, code, purpose = 'verification' }) {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'UstaadPro <no-reply@ustaadpro.local>';

  const info = await transporter.sendMail({
    from,
    to,
    subject: 'Your UstaadPro verification code',
    text: `Your UstaadPro ${purpose} code is ${code}. It expires in 10 minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0b1c30">
        <h2>UstaadPro verification</h2>
        <p>Your ${purpose} code is:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  });

  if (!hasSmtpConfig()) {
    console.log('SMTP is not configured. OTP email payload:', info.message);
  }

  return info;
}
