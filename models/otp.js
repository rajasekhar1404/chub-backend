const mongoose = require('mongoose')

const otp = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    otp: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
})

module.exports = new mongoose.model('otps', otp)