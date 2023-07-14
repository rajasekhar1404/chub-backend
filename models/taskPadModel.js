const mongoose = require('mongoose')

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
    isPublic: {
        type: Boolean,
        required: true
    }
},{
    timestamps : true
})

module.exports = new mongoose.model('taskpad', TaskPadModel)