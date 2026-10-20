const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const forgotPasswordOTPTemplate = (email, fullname, otp) => {
    const greeting = fullname ? `Hello ${fullname},` : 'Hello,'
    const safeGreeting = escapeHtml(greeting)
    const safeOtp = escapeHtml(otp)

    return {
        to: email,
        subject: 'CentralHub password reset verification code',
        text: `${greeting}

We received a request to reset the password for your CentralHub account. Enter this verification code in the password reset screen:

${otp}

This code expires in 15 minutes and can only be used once. For your security, do not share it with anyone. CentralHub will never ask you to disclose this code by email or phone.

If you did not request a password reset, you can safely ignore this email. Your password will not change unless the code is used to complete the reset.

Regards,
CentralHub Support`,
        html: `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>CentralHub password reset</title></head>
<body style="margin:0;padding:24px;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#243040;">
  <table role="presentation" style="width:100%;max-width:600px;margin:0 auto;border-collapse:collapse;background:#ffffff;border:1px solid #e2e7ed;border-radius:8px;">
    <tr><td style="padding:28px 32px 12px;">
      <p style="margin:0 0 18px;font-size:14px;color:#526173;">CentralHub account security</p>
      <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:#172b4d;">Password reset verification</h1>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">${safeGreeting}</p>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;">We received a request to reset the password for your CentralHub account. Enter the verification code below in the password reset screen:</p>
      <p style="margin:0 0 20px;padding:16px;text-align:center;background:#f4f6f8;border-radius:6px;font-size:28px;font-weight:bold;letter-spacing:6px;color:#172b4d;">${safeOtp}</p>
      <p style="margin:0 0 14px;font-size:14px;line-height:1.6;"><strong>This code expires in 15 minutes</strong> and can only be used once.</p>
      <p style="margin:0 0 14px;font-size:14px;line-height:1.6;">For your security, do not share this code with anyone. CentralHub will never ask you to disclose it by email or phone.</p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;">If you did not request a password reset, you can safely ignore this email. Your password will not change unless the code is used to complete the reset.</p>
      <p style="margin:0;font-size:14px;line-height:1.6;">Regards,<br><strong>CentralHub Support</strong></p>
    </td></tr>
    <tr><td style="padding:16px 32px;border-top:1px solid #e2e7ed;color:#718096;font-size:12px;line-height:1.5;">This is an automated account security message. Please do not share your verification code.</td></tr>
  </table>
</body>
</html>`
    }
}

module.exports = forgotPasswordOTPTemplate