const mongoose = require('mongoose')

const User = mongoose.Schema({
    fullname : {
        type: String,
        required: [true, 'Full name is required']
    },
    email: {
        type: String,
        required: [true, 'email is required'],
        index: { unique: true, dropDups: true}
    },
    aboutMe: {
        type: String,
        required: false
    },
    experiences: {
        type: Array,
        required: false
    },
    projects: {
        type: Array,
        required: false
    },
    skills: {
        type: Array,
        required: false
    },
    contact: {
        type: Object,
        required: false
    },
    password : {
        type: String,
        required: [true, 'password is required']
    },
    isPublic : {
        type: Boolean,
        required: [true, 'visibility required']
    },
    twoWayAuth : {
        type: Boolean,
        required: false
    }
})

module.exports = new mongoose.model('users', User)