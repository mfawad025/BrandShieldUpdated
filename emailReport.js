require('dotenv').config();
const nodemailer = require('nodemailer');

function getMailer() {
  if (!process.env.SMTP_HOST || process.env.SMTP_HOST === 'smtp.yourprovider.com') return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function statusBadge(status) {
  const colors = {
    found: '#F5586B',
    reported: '#E8B34C',
    removed: '#2FD8B8',
  };
  const labels = { found: 'Leak Found', reported: 'DMCA Sent', removed: 'Removed' };
  return `<span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-family:sans-serif;background:${colors[status]}22;color:${colors[status]};">${labels[status]}</span>`;
}

function buildReportHtml(user, newLeaks, summary) {
  const rows = newLeaks
    .map(
      (leak) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #2A2140;color:#F6F2EC;font-size:14px;">${leak.matched_alias || ''}</td>
        <td style="padding:10px 0;border-bottom:1px solid #2A2140;">
          <a href="${leak.url}" style="color:#F6F2EC;font-size:13px;word-break:break-all;">${leak.url}</a>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #2A2140;">${statusBadge(leak.status)}</td>
      </tr>`
    )
    .join('');

  const noNewLeaksRow = `<tr><td colspan="3" style="padding:20px 0;color:#9c93ad;font-size:14px;">No new leaks found today — nice and quiet.</td></tr>`;

  return `
  <div style="background:#15111F;padding:32px;font-family:sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#1F1830;border-radius:14px;padding:32px;">
      <h2 style="color:#F6F2EC;font-family:sans-serif;margin:0 0 6px;">Your BrandShield Daily Report</h2>
      <p style="color:#9c93ad;margin:0 0 24px;font-size:14px;">Hi ${user.name}, here's what happened in your case today.</p>

      <div style="display:flex;gap:10px;margin-bottom:26px;">
        <div style="flex:1;background:#15111F;border-radius:10px;padding:14px;text-align:center;">
          <div style="color:#F5586B;font-size:22px;font-weight:700;">${summary.found || 0}</div>
          <div style="color:#9c93ad;font-size:11px;text-transform:uppercase;">Found</div>
        </div>
        <div style="flex:1;background:#15111F;border-radius:10px;padding:14px;text-align:center;">
          <div style="color:#E8B34C;font-size:22px;font-weight:700;">${summary.reported || 0}</div>
          <div style="color:#9c93ad;font-size:11px;text-transform:uppercase;">Reported</div>
        </div>
        <div style="flex:1;background:#15111F;border-radius:10px;padding:14px;text-align:center;">
          <div style="color:#2FD8B8;font-size:22px;font-weight:700;">${summary.removed || 0}</div>
          <div style="color:#9c93ad;font-size:11px;text-transform:uppercase;">Removed</div>
        </div>
      </div>

      <h3 style="color:#F6F2EC;font-size:15px;margin-bottom:10px;">New today (${newLeaks.length})</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tbody>${newLeaks.length ? rows : noNewLeaksRow}</tbody>
      </table>

      <p style="color:#6b6480;font-size:12px;margin-top:28px;">
        Automatic takedown notices are best-effort and may need manual follow-up for some hosts. Log in to your dashboard for full case history.
      </p>
    </div>
  </div>`;
}

async function sendDailyReportEmail(user, newLeaks, summary) {
  const mailer = getMailer();
  const html = buildReportHtml(user, newLeaks, summary);

  if (!mailer) {
    console.log(`[email disabled — SMTP not configured] Would have emailed ${user.email}:`);
    console.log(`  New leaks: ${newLeaks.length}, summary:`, summary);
    return;
  }

  await mailer.sendMail({
    from: process.env.REPORT_FROM_EMAIL,
    to: user.email,
    subject: `BrandShield Daily Report — ${newLeaks.length} new item(s)`,
    html,
  });
}

module.exports = { sendDailyReportEmail, buildReportHtml };
