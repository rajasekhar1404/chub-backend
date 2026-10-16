const sendEmail = async (template) => {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured')

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...template, from: process.env.EMAIL_FROM || template.from }),
    })

    if (!response.ok) {
        throw new Error(`Email provider returned ${response.status}`)
    }

    return response.json()
}

module.exports = {
    sendEmail
}