const mongoose = require('mongoose')

const postResponse = new mongoose.Schema({
    postId: {
        type: String,
        required: true,
        index: { unique: true, dropDups: true }
    },
    likes: {
        type: [String],
        required: true
    },
    feedback: {
        type: Array,
        required: false
    }
}, {
    timestamps: true
})

module.exports = new mongoose.model('post_response', postResponse)