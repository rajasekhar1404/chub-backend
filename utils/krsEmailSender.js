const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
    port: 465,
    host: "smtp.gmail.com",
    auth: {
        user: "mrrajasekhar09@gmail.com",
        pass: "dwmchcphzqmlasfo"
    },
    secure: true
})

const sendEmail = (template) => {
    transporter.sendMail(template, function(err, info) {
        if (err) {
            throw new Error(err.message)
        } else {
            console.log(info)
        }
    })
}

module.exports = {
    sendEmail
}