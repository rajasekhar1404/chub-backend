const asyncHandler = require("express-async-handler");
const { getLatestTaskPadId, createNewTaskpad, findUserTaskpadByTaskpadId, findAndUpdateTaskpadByUseridAndTaskpadId, deleteTaskpad, findAllTaskPadTitlesAndIdsOfUser, findAllPublicTaskpads, findPublicTaskpadById } = require("../dao/taskpadDao");
const { buildSuccessResponse, buildFailureResponse } = require("../utils/responseBuilder");
const { findUserByEmail } = require('../dao/userDao')
const { CREATED, OK } = require("../constants/statusCodes");

const createTaskpad = asyncHandler(async (req, res) => {
    const user = req.user
    const newTaskpad = req.body
    const taskpadId = await generageTaskpadId(user.id)
    await createNewTaskpad(buildTaskPad(newTaskpad, taskpadId, user.id)) ? buildSuccessResponse({message: `${ newTaskpad.title } created successfully.` }, CREATED, res) : buildFailureResponse('Unable to create new taskpad', res)
})

const getUserTaskpadByTaskpadId = asyncHandler(async (req, res) => {
    const user = req.user
    const { taskpadId } = req.params
    const response = await findUserTaskpadByTaskpadId(user.id, taskpadId)
    buildSuccessResponse(response, OK, res)
})

const findAllTaskpadTitlesWithTaskpadIds = asyncHandler(async (req, res) => {
    const user = req.user
    const response = await findAllTaskPadTitlesAndIdsOfUser(user.id)
    buildSuccessResponse(response, OK, res)
})

const updateTaskpad = asyncHandler( async (req, res) => {
    const user = req.user
    const updateTaskpadRequest = req.body
    const validTaskpad = validateTaskpadUpate( updateTaskpadRequest )
    await findAndUpdateTaskpadByUseridAndTaskpadId(user.id, updateTaskpadRequest.taskpadId, validTaskpad)
    buildSuccessResponse({message: `${updateTaskpadRequest.taskpadId} updated.`}, OK, res)
})

const deleteTaskpadById = asyncHandler( async (req, res) => {
    const user = req.user
    const { taskpadId } = req.params
    await deleteTaskpad(user.id, taskpadId)
    buildSuccessResponse({message: `${taskpadId} deleted successfully`}, OK, res)
})

const getAllPublicTaskpads = asyncHandler( async (req, res) => {
    const { email } = req.params
    const response = await findUserByEmail(email)
    const allPublicTaskpads = await findAllPublicTaskpads(response._id)
    buildSuccessResponse(allPublicTaskpads, OK, res)
})

const getPublicTaskpadById = asyncHandler( async (req, res) => {
    const { email, taskpadId } = req.params
    const user = await findUserByEmail(email)
    const response = await findPublicTaskpadById(user._id, taskpadId)
    buildSuccessResponse(response, OK, res)
})

// utility methods
const generageTaskpadId = async (id) => {
    let newTaskPadTitleId;
    const latestTaskpadId = await getLatestTaskPadId(id)
    if (latestTaskpadId.length <= 0 || !latestTaskpadId[0].taskpadId) newTaskPadTitleId = 'TP-1'
    else {
        let latestTaskpadIdNumber = Number.parseInt(latestTaskpadId[0].taskpadId.split('-')[1])
        newTaskPadTitleId = `TP-${++latestTaskpadIdNumber}`
    }
    return newTaskPadTitleId
}

const buildTaskPad = (newTaskpad, taskpadId, userid ) => {
    const { title, content, isPublic } = newTaskpad
    return {
        title,
        content,
        taskpadId,
        userid,
        isPublic
    }
}

const validateTaskpadUpate = ( updateTaskpadRequest ) => {
    const { title, taskpadId, content, isPublic,  } = updateTaskpadRequest
    if ( !title || title.trim().length <= 0 ) throw new Error('Title is required')
    if ( !taskpadId || taskpadId.trim().length <= 3 ) throw new Error('Invalid taskpad Id')

    return {
        title: title.trim(),
        content: content,
        isPublic: isPublic,
    }
}

module.exports = {
    createTaskpad,
    getUserTaskpadByTaskpadId,
    updateTaskpad,
    deleteTaskpadById,
    findAllTaskpadTitlesWithTaskpadIds,
    getAllPublicTaskpads,
    getPublicTaskpadById
}