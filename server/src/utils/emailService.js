const nodemailer = require('nodemailer');

/*
|--------------------------------------------------------------------------
| Email Service — Gmail SMTP via Nodemailer
|--------------------------------------------------------------------------
|
| Free · 500 emails/day · No domain required · Any recipient works
|
| SETUP:
|   1. Create/use a Gmail account for OneCoolie
|        e.g. noreply.onecoolie@gmail.com
|   2. Enable 2-Step Verification:
|        https://myaccount.google.com/security
|   3. Create App Password:
|        https://myaccount.google.com/apppasswords
|        → Name it "OneCoolie"
|        → Copy the 16-char password (no spaces needed)
|   4. Set in server/.env:
|        GMAIL_USER=noreply.onecoolie@gmail.com
|        GMAIL_APP_PASSWORD=abcdefghijklmnop
|
*/

const FROM_NAME  = process.env.OTP_FROM_NAME || 'OneCoolie';
const FROM_EMAIL = process.env.GMAIL_USER;

const buildOtpHtml = (otp, expiryMinutes = 10) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Your OneCoolie OTP</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#000;padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td>
                <div style="background:#2563EB;width:36px;height:36px;border-radius:10px;display:inline-block;text-align:center;line-height:36px;color:#fff;font-weight:700;font-size:14px;vertical-align:middle;">OC</div>
                <span style="color:#fff;font-size:18px;font-weight:700;margin-left:10px;vertical-align:middle;">OneCoolie</span>
              </td>
              <td align="right"><span style="color:#71717a;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Verification</span></td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px 28px;">
            <p style="margin:0 0 6px;color:#71717a;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">One-Time Password</p>
            <h1 style="margin:0 0 16px;color:#09090b;font-size:22px;font-weight:700;">Your verification code</h1>
            <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.6;">
              Use this code to verify your email for OneCoolie. Valid for <strong>${expiryMinutes} minutes</strong>.
            </p>
            <div style="background:#f4f4f5;border-radius:12px;padding:28px;text-align:center;margin:0 0 24px;">
              <span style="font-family:'Courier New',monospace;font-size:48px;font-weight:700;letter-spacing:14px;color:#09090b;">
                ${otp}
              </span>
            </div>
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 18px;margin:0 0 20px;">
              <p style="margin:0;color:#1d4ed8;font-size:13px;line-height:1.5;">
                <strong>Never share this code.</strong> OneCoolie staff will never ask for your OTP. Expires in ${expiryMinutes} minutes.
              </p>
            </div>
            <p style="margin:0;color:#a1a1aa;font-size:12px;">If you didn't request this, ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#fafafa;border-top:1px solid #e4e4e7;padding:16px 32px;">
            <p style="margin:0;color:#a1a1aa;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
              OneCoolie Pilot Network · KZJ · WL · BZA · SC
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// Reusable transport with connection pooling and IPv4 pinning
const transport = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  family: 4, // Force IPv4 to avoid 60s IPv6 DNS lookup timeout on Windows & cloud
  pool: true,
  maxConnections: 5,
  auth: {
    user: FROM_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const sendOtpEmail = async (to, otp, expiryMinutes = 10) => {
  try {
    const info = await transport.sendMail({
      from:    `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject: `${otp} — Your OneCoolie verification code`,
      html:    buildOtpHtml(otp, expiryMinutes),
      text:    `Your OneCoolie OTP: ${otp}\n\nExpires in ${expiryMinutes} minutes. Never share this code.`,
    });

    console.log('OTP EMAIL SENT:', { messageId: info?.messageId, to });
    return info;
  } catch (err) {
    console.error('OTP EMAIL DELIVERY ERROR:', err.message);
    throw err;
  }
};

module.exports = { sendOtpEmail };
