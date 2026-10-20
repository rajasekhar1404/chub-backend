const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const feedbackTemplate = (title, email, fullname, message) => {
    const greeting = fullname ? `Hello ${fullname},` : 'Hello,'

    return {
        to: email,
        subject: `Feedback received for your CentralHub post: ${title}`,
        text: `${greeting}

A CentralHub user has sent feedback regarding your public post, "${title}".

Feedback:
${message}

Thank you for sharing your work with the CentralHub community.

Regards,
CentralHub`,
        html: `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Feedback on your CentralHub post</title></head>
<body style="margin:0;padding:24px;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#243040;">
  <table role="presentation" style="width:100%;max-width:600px;margin:0 auto;border-collapse:collapse;background:#ffffff;border:1px solid #e2e7ed;border-radius:8px;">
    <tr><td style="padding:28px 32px 12px;">
      <p style="margin:0 0 18px;font-size:14px;color:#526173;">CentralHub community</p>
      <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:#172b4d;">You received feedback</h1>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;">A CentralHub user has sent feedback regarding your public post:</p>
      <p style="margin:0 0 18px;padding:14px 16px;background:#f4f6f8;border-left:4px solid #4263eb;border-radius:4px;font-size:16px;font-weight:bold;line-height:1.5;">${escapeHtml(title)}</p>
      <h2 style="margin:0 0 8px;font-size:16px;color:#172b4d;">Feedback</h2>
      <div style="margin:0 0 20px;padding:16px;background:#f9fafb;border:1px solid #e2e7ed;border-radius:6px;font-size:15px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere;">${escapeHtml(message)}</div>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;">Thank you for sharing your work with the CentralHub community.</p>
      <p style="margin:0;font-size:14px;line-height:1.6;">Regards,<br><strong>CentralHub</strong></p>
    </td></tr>
    <tr><td style="padding:16px 32px;border-top:1px solid #e2e7ed;color:#718096;font-size:12px;line-height:1.5;">You are receiving this message because your public post received feedback through CentralHub.</td></tr>
  </table>
</body>
</html>`
    }
}

module.exports = {
    feedbackTemplate
}