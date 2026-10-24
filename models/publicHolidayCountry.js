const mongoose = require('mongoose')

const publicHolidayCountry = new mongoose.Schema({
    countryCode: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('public_holiday_countries', publicHolidayCountry)
