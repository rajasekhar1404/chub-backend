const otpModal = require('../models/otp')

const createOtp = async (userId, otp) => {
    return await otpModal.create({
        userId: userId,
        otp: otp
    })
}

const deleteAllOtps = async (id) => {
    await otpModal.deleteMany({userId: id})
}

const deleteExpiredOtps = async () => {
    await otpModal.deleteMany({ createdAt: { $lt: new Date(Date.now() - 15 * 60 * 1000) } })
}

const findValidOTP = async (id, otp) => {
    const response = await otpModal.findOne({
        userId: id,
        otp: otp,
        createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
    })

    if (!response) {
        throw new Error('Invalid OTP')
    }
    return response
}

module.exports = {
    createOtp,
    findValidOTP,
    deleteAllOtps,
    deleteExpiredOtps
}