const { BAD_REQUEST, OK, INTERNAL_SERVER_ERROR, NOT_FOUND } = require('../constants/statusCodes')
const taskModel = require('../models/taskModel')
const asyncHandler = require('express-async-handler')

const getTask = asyncHandler(async (req, res) => {
    const id = req.params.id

    if (!id) {
        res.status(BAD_REQUEST)
        throw new Error('Id is required')
    }

    const data = await taskModel.findById(id)

    res.json(data)
})

const getTasksByDate = asyncHandler(async (req, res) => {
    const { date } = req.body;
    if ( !date ) {
        res.status(OK)
        throw new Error('No date found')
    }
    const data = await taskModel.find({
        userid: req.user.id,
        startDate : {$lte : date},
        dueDate : {$gte : date}
    })
    res.json(data)
})

const getAllTasks = asyncHandler(async (req, res) => {
    const user = req.user
    const data = await taskModel.find({userid: user.id})
    res.json(data)
})

const createTask = asyncHandler(async (req, res) => {
    const { title, description, status, dueDate, startDate } = req.body

    if ( !title || !description || !status ) {
        res.status(INTERNAL_SERVER_ERROR)
        throw new Error('All fields are required')
    }

    const task = {
        userid: req.user.id,
        title: title,
        description: description,
        status: status,
        dueDate: dueDate,
        startDate: startDate
    }

    const data = await taskModel.create(task)
    res.json(data)
})

const updateTask = asyncHandler(async (req, res) => {

    const task = req.body

    if (!task._id) {
        res.status(BAD_REQUEST)
        throw new Error('Id is required')
    }
    let taskToUpdate = await taskModel.findById(task._id)

    if (!taskToUpdate) {
        res.status(NOT_FOUND)
        throw new Error('No task found')
    }
    if (task.title) {
        taskToUpdate.title = task.title
    }
    if (task.status) {
        taskToUpdate.status = task.status
    }
    if (task.description) {
        taskToUpdate.description = task.description
    }
    if (task.startDate) {
        taskToUpdate.startDate = task.startDate
    }
    if (task.dueDate) {
        taskToUpdate.dueDate = task.dueDate
    }
    const data = await taskModel.findByIdAndUpdate(task._id, taskToUpdate)

    res.json(data)
})

const deleteTask = asyncHandler(async (req, res) => {
    const data = await taskModel.findByIdAndRemove(req.params.id)
    res.json(data)
})

module.exports = {
    getTask,
    getAllTasks,
    createTask,
    updateTask,
    deleteTask,
    getTasksByDate,
}