const mongoose = require('mongoose')
const { IMAGE_SOURCES } = require('../constants/statusCodes')

const clock = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    is24Hours: {
        type: Boolean,
        required: false,
        default: false
    },
    timeFontSizePortrait: {
        type: Number,
        required: false,
        default: 75
    },
    timeFontSizeLandscape: {
        type: Number,
        required: false,
        default: 120
    },
    dateFontSizePortrait: {
        type: Number,
        required: false,
        default: 35
    },
    dateFontSizeLandscape: {
        type: Number,
        required: false,
        default: 35
    },
    fontColor: {
        type: String,
        required: false,
        default: '#fff'
    },
    backgroundColor: {
        type: String,
        required: false,
        default: 'black'
    },
    timePortraitPanX: {
        type: Number,
        required: false,
        default: 0
    },
    timePortraitPanY: {
        type: Number,
        required: false,
        default: 0
    },
    timeLandscapePanX: {
        type: Number,
        required: false,
        default: 0
    },
    timeLandscapePanY: {
        type: Number,
        required: false,
        default: 0
    },
    datePortraitPanX: {
        type: Number,
        required: false,
        default: 0
    },
    datePortraitPanY: {
        type: Number,
        required: false,
        default: 0
    },
    dateLandscapePanX: {
        type: Number,
        required: false,
        default: 0
    },
    dateLandscapePanY: {
        type: Number,
        required: false,
        default: 0
    },
    grayscaleBackground: {
        type: Boolean,
        required: false,
        default: true
    },
    transitionDuration: {
        type: Number,
        required: false,
        default: 15
    },
    showBackgroundImages: {
        type: Boolean,
        required: false,
        default: true
    },
    imageSource: {
        type: String,
        required: false,
        default: IMAGE_SOURCES[3]
    }
}, {
    timestamps: true
})

module.exports = new mongoose.model('clock', clock)