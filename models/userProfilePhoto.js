const mongoose = require('mongoose')

const userPhotos = mongoose.Schema({
    userId: {
        type: String,
        required: false
    },
    userName: {
        type: String,
        required: false
    },
    thumbnailPhoto: {
        type: String,
        required: false
    },
    profilePhoto: {
        type: String,
        required: false
    }
})


module.exports = new mongoose.model('userphotos', userPhotos)