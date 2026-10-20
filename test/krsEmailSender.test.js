const assert = require('node:assert/strict')
const test = require('node:test')
const nodemailer = require('nodemailer')

const previousEnv = {
    GMAIL_USER: process.env.GMAIL_USER,
    GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
    EMAIL_FROM: process.env.EMAIL_FROM,
}
const originalCreateTransport = nodemailer.createTransport
let transportOptions
let sentMessage
let sendMailImplementation

process.env.GMAIL_USER = 'sender@gmail.com'
process.env.GMAIL_APP_PASSWORD = 'abcd efgh ijkl mnop'
process.env.EMAIL_FROM = 'CentralHub Support <sender@gmail.com>'

nodemailer.createTransport = (options) => {
    transportOptions = options
    return {
        sendMail: (message) => {
            sentMessage = message
            return sendMailImplementation(message)
        },
    }
}

const { sendEmail } = require('../utils/krsEmailSender')

test('sendEmail sends HTML and text using a secure Gmail SMTP transport', async () => {
    sendMailImplementation = async () => ({ messageId: 'message-id' })

    const result = await sendEmail({
        to: 'recipient@example.com',
        subject: 'CentralHub update',
        text: 'Plain text message',
        html: '<p>HTML message</p>',
    })

    assert.deepEqual(result, { messageId: 'message-id' })
    assert.equal(transportOptions.host, 'smtp.gmail.com')
    assert.equal(transportOptions.port, 465)
    assert.equal(transportOptions.secure, true)
    assert.equal(transportOptions.auth.user, 'sender@gmail.com')
    assert.equal(transportOptions.auth.pass, 'abcdefghijklmnop')
    assert.equal(sentMessage.from, 'CentralHub Support <sender@gmail.com>')
    assert.equal(sentMessage.to, 'recipient@example.com')
    assert.equal(sentMessage.text, 'Plain text message')
    assert.equal(sentMessage.html, '<p>HTML message</p>')
})

test('sendEmail surfaces SMTP failures and validates the message', async () => {
    sendMailImplementation = async () => {
        throw new Error('SMTP authentication failed')
    }

    await assert.rejects(
        sendEmail({ to: 'recipient@example.com', subject: 'Test', text: 'Body' }),
        /SMTP authentication failed/,
    )
    await assert.rejects(
        sendEmail({ to: 'recipient@example.com', subject: 'Test' }),
        /must include text or html content/,
    )
})

test.after(() => {
    nodemailer.createTransport = originalCreateTransport
    for (const [name, value] of Object.entries(previousEnv)) {
        if (value === undefined) delete process.env[name]
        else process.env[name] = value
    }
})
