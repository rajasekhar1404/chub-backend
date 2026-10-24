const { BAD_REQUEST, OK, INTERNAL_SERVER_ERROR, NOT_FOUND } = require('../constants/statusCodes')
const { findTasksBetween } = require('../dao/tasksDao')
const taskModel = require('../models/taskModel')
const asyncHandler = require('express-async-handler')
const { buildFailureResponse, buildSuccessResponse } = require('../utils/responseBuilder')

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
    const { date, fromDate: requestedFromDate, toDate: requestedToDate } = req.body
    const hasDateRange = requestedFromDate && requestedToDate
    const fromDate = new Date(hasDateRange ? requestedFromDate : date)
    const toDate = new Date(hasDateRange ? requestedToDate : date)

    if (!hasDateRange && Number.isFinite(fromDate.getTime())) {
        fromDate.setHours(0, 0, 0, 0)
        toDate.setHours(23, 59, 59, 999)
    }

    if (
        !Number.isFinite(fromDate.getTime()) ||
        !Number.isFinite(toDate.getTime()) ||
        fromDate > toDate
    ) {
        res.status(BAD_REQUEST)
        throw new Error('A valid date or date range is required')
    }

    const data = await taskModel.find({
        userid: req.user.id,
        startDate: { $lte: toDate },
        $or: [
            { dueDate: { $gte: fromDate } },
            { dueDate: null, startDate: { $gte: fromDate } }
        ]
    })
    res.json(data)
})

const getTasksByDateRange = asyncHandler(async (req, res) => {
    const { fromDate, toDate } = req.body;
    if ( !fromDate || !toDate ) buildFailureResponse('Date range not found', res)
    else buildSuccessResponse(await findTasksBetween(req.user.id, fromDate, toDate), OK, res)
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
    const data = await taskModel.findByIdAndDelete(req.params.id)
    res.json(data)
})

module.exports = {
    getTask,
    getAllTasks,
    createTask,
    updateTask,
    deleteTask,
    getTasksByDate,
    getTasksByDateRange
}