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

export async function sendContactEmail({ name, email, message }) {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'UstaadPro <no-reply@ustaadpro.local>';
  const to = process.env.CONTACT_EMAIL || from;

  const info = await transporter.sendMail({
    from,
    to,
    replyTo: email,
    subject: `New Contact Form Submission from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0b1c30;max-width:600px;">
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <div style="margin-top:20px;padding:15px;background:#f5f7fb;border-left:4px solid #006c49;">
          <p style="margin:0;white-space:pre-wrap;">${message}</p>
        </div>
      </div>
    `,
  });

  if (!hasSmtpConfig()) {
    console.log('SMTP is not configured. Contact email payload:', info.message);
  }

  return info;
}
