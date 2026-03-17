const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendEmail(to, subject, text, html) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(`[email] SMTP not configured — skipping email to ${to}`);
    return;
  }
  try {
    const info = await transporter.sendMail({
      from: `"OrganMatch Platform" <${process.env.SMTP_USER}>`,
      to, subject, text,
      html: html || `<pre style="font-family:sans-serif;white-space:pre-wrap">${text}</pre>`,
    });
    console.log(`[email] Sent to ${to} — ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[email] Failed sending to ${to}: ${err.message}`);
  }
}

async function sendNotificationEmail(to, title, body, type = 'notification') {
  const CONFIG = {
    offer_received:               { label: '📨 Organ Offer Received',             accent: '#f59e0b' },
    offer_accepted:               { label: '✅ Offer Accepted',                    accent: '#22c55e' },
    offer_declined:               { label: '❌ Offer Declined',                    accent: '#ef4444' },
    donor_registered:             { label: '🏥 New Donor Registered',             accent: '#a78bfa' },
    organ_transplanted_donor:     { label: '🫀 Organ Successfully Transplanted',  accent: '#22c55e' },
    organ_transplanted_recipient: { label: '🎉 Organ Matched for Your Patient',   accent: '#3b82f6' },
    new_match:                    { label: '🔵 New Match Found',                   accent: '#3b82f6' },
    default:                      { label: '🔔 OrganMatch Alert',                 accent: '#64748b' },
  };
  const cfg = CONFIG[type] || CONFIG.default;

  const html = `
<!DOCTYPE html><html><body style="margin:0;padding:20px;background:#0a0f1a;font-family:Arial,sans-serif;">
  <div style="max-width:580px;margin:0 auto;background:#0f1623;border-radius:12px;overflow:hidden;border:1px solid #1e2d40;">
    <div style="background:#161f2e;padding:18px 24px;border-bottom:2px solid ${cfg.accent};">
      <div style="font-size:13px;color:#64748b;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">OrganMatch Platform</div>
      <div style="font-size:15px;font-weight:600;color:${cfg.accent};">${cfg.label}</div>
    </div>
    <div style="padding:24px;">
      <h2 style="margin:0 0 12px;color:#f1f5f9;font-size:17px;">${title}</h2>
      <p style="margin:0 0 20px;color:#94a3b8;font-size:14px;line-height:1.7;">${body}</p>
      <div style="background:#161f2e;border-radius:8px;padding:14px;margin-bottom:20px;">
        <p style="margin:0;font-size:12px;color:#64748b;">🔒 Log in to <strong style="color:#94a3b8;">OrganMatch</strong> to review and take action.</p>
      </div>
      <hr style="border:none;border-top:1px solid #1e2d40;margin:0 0 16px;">
      <p style="margin:0;font-size:11px;color:#475569;">Automated message from OrganMatch. <strong>Do not reply.</strong></p>
    </div>
  </div>
</body></html>`;

  return sendEmail(to, `[OrganMatch] ${title}`, `${cfg.label}\n\n${title}\n\n${body}`, html);
}

module.exports = { sendEmail, sendNotificationEmail };