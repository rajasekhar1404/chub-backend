const nodemailer = require('nodemailer')

let transporter

const getTransporter = () => {
    if (transporter) return transporter

    const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
        throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD must be configured')
    }

    transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: GMAIL_USER,
            pass: GMAIL_APP_PASSWORD.replace(/\s+/g, ''),
        },
    })

    return transporter
}

const sendEmail = async (template) => {
    if (!template.to || !template.subject) {
        throw new Error('Email template must include a recipient and subject')
    }

    if (!template.text && !template.html) {
        throw new Error('Email template must include text or html content')
    }

    return getTransporter().sendMail({
        ...template,
        from: process.env.EMAIL_FROM || process.env.GMAIL_USER,
    })
}

module.exports = {
    sendEmail
}
