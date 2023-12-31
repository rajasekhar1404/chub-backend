const feedbackTemplate = (title, email, fullname, message) => {
    return {
        from: 'mrrajasekhar09@gmail.com',
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