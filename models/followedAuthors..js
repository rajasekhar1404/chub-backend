const mongoose = require('mongoose')

const followedAuthors = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: { unique: true, dropDups: true }
    },
    author: {
        type: [String],
        required: true
    }
}, {
    timestamps: true
})

module.exports = new mongoose.model('followed_authors', followedAuthors)