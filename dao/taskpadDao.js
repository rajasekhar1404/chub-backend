const taskpadModal = require('../models/taskPadModel')

const getLatestTaskPadId = async (id) => {
    return await taskpadModal.find({userid: id}).sort({ createdAt: -1 }).limit(1).select('taskpadId')
}

const createNewTaskpad = async ( taskpad ) => {
    return await taskpadModal.create(taskpad)
}

const findUserTaskpadByTaskpadId = async (userid, taskpadId) => {
    const response =  await taskpadModal.findOne({
        $and : [
            {userid: userid}, {taskpadId: taskpadId}
        ]
    })
    if ( !response ) throw new Error( `${taskpadId} not found.`)
    return response
}

const findAndUpdateTaskpadByUseridAndTaskpadId = async (userid, taskpadId, taskpad) => {
    const response = await taskpadModal.findOneAndUpdate({
        $and: [
            {userid: userid}, {taskpadId: taskpadId}
        ]
    }, taskpad)
    if ( !response ) throw new Error(  `${taskpadId} not found` )
}

const findAllTaskPadTitlesAndIdsOfUser = async (id) => {
    const response = await taskpadModal.find({userid: id}).sort( {createdAt: -1} ).select(['taskpadId', 'title'])
    return response
}

const deleteTaskpad = async (userid, taskpadId) => {
    const response = await taskpadModal.deleteOne({
        $and: [
            {userid: userid}, {_id: taskpadId}
        ]
    })
    if ( response.deletedCount <= 0 ) throw new Error( `${taskpadId} not found` )
}

const findAllPublicTaskpads = async (id) => {
    return await taskpadModal.find({
        $and: [
            {userid:id}, {isPublic: true}
        ]
    }).sort( {createdAt: -1} ).select(['taskpadId', 'title', "_id"])
}

const findTaskpadById = async (id) => {
    return await taskpadModal.findById(id)
}

const findPublicTaskpadById = async ( id, tpId ) =>  {
    const response = await taskpadModal.findOne({
        $and: [
            {userid: id}, {taskpadId: tpId}, {isPublic: true}
        ]
    })
    if (!response) throw new Error(`${tpId} not found`)
    return response
}

const findPublicPostById = async ( id ) =>  {
    const response = await taskpadModal.findOne({
        $and: [
            {_id: id}, {isPublic: true}
        ]
    })
    if (!response) throw new Error(`Post not found`)
    return response
}

const deleteAllTaskPads = async ( id ) => {
    return await taskpadModal.deleteMany({userid : id})
}

const searchPublicTaskpads = async (title) => {
    return await taskpadModal.find({
        $and: [
            { title: { $regex: '.*' + title }},
            { isPublic: true }
        ]
    }).sort( {createdAt: -1} ).select(['taskpadId', 'title', "_id"])
}

const getTaskpadsByIds = async (ids) => {
    return await taskpadModal.find({
        $and: [
            { _id: { $in : ids }},
            { isPublic: true }
        ]
    }).select(['title', "_id"])
}

module.exports = {
    getLatestTaskPadId,
    createNewTaskpad,
    findUserTaskpadByTaskpadId,
    findAndUpdateTaskpadByUseridAndTaskpadId,
    deleteTaskpad,
    findAllTaskPadTitlesAndIdsOfUser,
    findAllPublicTaskpads,
    findPublicTaskpadById,
    deleteAllTaskPads,
    findTaskpadById,
    searchPublicTaskpads,
    findPublicPostById,
    getTaskpadsByIds
}