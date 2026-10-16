const feedbackTemplate = (title, email, fullname, message) => {
    return {
        from: process.env.EMAIL_FROM || 'CentralHub <onboarding@resend.dev>',
        to: email,
        subject: `Feedback: ${title}`,
        text: `Feedback: ${title}`,
        html: `<h3>Hi, ${fullname},</h3>
                <p>Feedback for your post <b>${title}</b>.</p>
                <p>${message}</p>
        `
    }
}

module.exports = {
    feedbackTemplate
}