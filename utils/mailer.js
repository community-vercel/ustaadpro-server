import nodemailer from 'nodemailer';
import path from 'path';

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

export async function sendComplaintEmail({ name, email, phone, service, subService, description, imageUrls = [], complaintId }) {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'UstaadPro <no-reply@ustaadpro.local>';
  const to = process.env.CONTACT_EMAIL || from;

  const attachments = imageUrls.map((url, i) => ({
    filename: url.split('/').pop(),
    path: path.join(process.cwd(), url),
    cid: `img_${i}`
  }));

  const imageList = imageUrls.length
    ? imageUrls.map((url, i) => `
        <li style="margin-bottom:12px;">
          <img src="cid:img_${i}" style="max-width:100%; border-radius:8px; border:1px solid #ccc;" alt="Attachment ${i+1}" />
        </li>
      `).join('')
    : '<li>No images attached</li>';

  const info = await transporter.sendMail({
    from,
    to,
    replyTo: email || from,
    subject: `[Complaint #${complaintId}] ${service} — ${name}`,
    text: `Complaint #${complaintId}\nName: ${name}\nEmail: ${email || 'N/A'}\nPhone: ${phone}\nService: ${service}\nSub-Service: ${subService || 'N/A'}\n\nDescription:\n${description || 'N/A'}\n\nImages: ${imageUrls.join(', ') || 'None'}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0b1c30;max-width:600px;">
        <h2 style="color:#006c49;">New Complaint #${complaintId}</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;font-weight:700;width:130px;">Name</td><td>${name}</td></tr>
          <tr><td style="padding:6px 0;font-weight:700;">Email</td><td>${email || 'N/A'}</td></tr>
          <tr><td style="padding:6px 0;font-weight:700;">Phone</td><td>${phone}</td></tr>
          <tr><td style="padding:6px 0;font-weight:700;">Service</td><td>${service}</td></tr>
          <tr><td style="padding:6px 0;font-weight:700;">Sub-Service</td><td>${subService || 'N/A'}</td></tr>
        </table>
        <div style="margin-top:16px;padding:14px;background:#f5f7fb;border-left:4px solid #006c49;">
          <strong>Description:</strong>
          <p style="margin:8px 0 0;white-space:pre-wrap;">${description || 'No description provided.'}</p>
        </div>
        <div style="margin-top:16px;">
          <strong>Attached Images (${imageUrls.length}):</strong>
          <ul style="margin:8px 0; padding-left:0; list-style:none;">${imageList}</ul>
        </div>
      </div>
    `,
    attachments,
  });

  if (!hasSmtpConfig()) {
    console.log('SMTP not configured. Complaint email payload:', info.message);
  }

  return info;
}
