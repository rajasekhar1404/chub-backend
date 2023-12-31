const forgotPasswordOTPTemplate = (email, fullname, otp) => {
    return {
        from: 'mrrajasekhar09@gmail.com',
        to: email,
        subject: 'CentralHub Password reset OTP',
        text: "CentralHub Password reset OTP",
        html: `<h3>Hi, ${fullname},</h3>
                <p><b>${otp}</b> is your OTP for resetting CentralHub password.</p>
                <p>If you are not tried to reset the password, then login to your account and update the password to secure your account.</p>
        `
    }
}

module.exports = forgotPasswordOTPTemplate