const mongoose = require('mongoose')

const TaskPadItem = new mongoose.Schema({
    id: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    checked: {
        type: Boolean,
        default: false
    }
}, { _id: false })

const TaskPadModel = new mongoose.Schema({
    userid: {
        type: String,
        required: [true, 'User id is required']
    },
    taskpadId: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: [false]
    },
    type: {
        type: String,
        enum: ['text', 'list'],
        default: 'text'
    },
    items: {
        type: [TaskPadItem],
        default: []
    },
    isPublic: {
        type: Boolean,
        required: true
    }
},{
    timestamps : true
})

module.exports = new mongoose.model('taskpad', TaskPadModel)