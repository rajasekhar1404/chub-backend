const assert = require('node:assert/strict')
const test = require('node:test')
const forgotPasswordOTPTemplate = require('../templates/forgotPasswordOTPTemplate')
const { feedbackTemplate } = require('../templates/messageTemplates')

test('password reset email includes formal instructions and escapes HTML content', () => {
    const email = forgotPasswordOTPTemplate('user@example.com', '<Alex & Co>', '123456')

    assert.equal(email.to, 'user@example.com')
    assert.match(email.subject, /password reset verification code/i)
    assert.match(email.text, /expires in 15 minutes/)
    assert.match(email.text, /do not share it with anyone/i)
    assert.match(email.text, /If you did not request a password reset/)
    assert.match(email.html, /Hello &lt;Alex &amp; Co&gt;,/)
    assert.match(email.html, />123456</)
    assert.match(email.html, /expires in 15 minutes/i)
    assert.doesNotMatch(email.html, /Hello <Alex/)
})

test('feedback email provides context and safely formats user-submitted content', () => {
    const email = feedbackTemplate(
        '<Tips & Tricks>',
        'author@example.com',
        'Taylor',
        '<script>alert("x")</script>\nA useful suggestion.',
    )

    assert.equal(email.to, 'author@example.com')
    assert.match(email.subject, /Feedback received/)
    assert.match(email.text, /public post/)
    assert.match(email.text, /A useful suggestion\./)
    assert.match(email.html, /&lt;Tips &amp; Tricks&gt;/)
    assert.match(email.html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/)
    assert.match(email.html, /white-space:pre-wrap/)
    assert.doesNotMatch(email.html, /<script>alert/)
})
