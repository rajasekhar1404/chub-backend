const mongoose = require('mongoose')

const savedPosts = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: { unique: true, dropDups: true }
    },
    postId: {
        type: [String],
        required: true
    }
}, {
    timestamps: true
})

module.exports = new mongoose.model('saved_posts', savedPosts)