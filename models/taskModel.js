const mongoose = require('mongoose')

const task = new mongoose.Schema({
    userid: {
        type: String,
        required: [true, 'User id not found']
    },
    title: {
        type: String,
        required: [true, "title is required"]
    },
    description: {
        type: String,
        required: false
    },
    startDate: {
        type: Date,
        required: false,
    },
    dueDate: {
        type: Date,
        required: false
    },
    status: {
        type: String,
        required: false
    }
}, {
    timestamps: true
})

module.exports = new mongoose.model('tasks', task)