const mongoose = require('mongoose')

const holidaySchema = new mongoose.Schema({
    date: {
        type: String,
        required: true
    },
    localName: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    countryCode: {
        type: String,
        required: true
    },
    fixed: Boolean,
    counties: {
        type: [String],
        default: null
    },
    launchYear: {
        type: Number,
        default: null
    }
}, { _id: false })

const publicHolidayYear = new mongoose.Schema({
    countryCode: {
        type: String,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    holidays: {
        type: [holidaySchema],
        default: []
    },
    source: {
        type: String,
        required: true
    },
    uploadedAt: {
        type: Date
    },
    fetchedAt: {
        type: Date,
        required: false
    }
}, {
    timestamps: true
})

publicHolidayYear.index({ countryCode: 1, year: 1 }, { unique: true })

module.exports = mongoose.model('public_holiday_years', publicHolidayYear)
