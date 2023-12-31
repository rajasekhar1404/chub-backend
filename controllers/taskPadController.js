const asyncHandler = require("express-async-handler");
const { getLatestTaskPadId, createNewTaskpad, findUserTaskpadByTaskpadId, findAndUpdateTaskpadByUseridAndTaskpadId, deleteTaskpad, findAllTaskPadTitlesAndIdsOfUser, findAllPublicTaskpads, findPublicTaskpadById, findTaskpadById, searchPublicTaskpads, findPublicPostById, getTaskpadsByIds } = require("../dao/taskpadDao");
const { buildSuccessResponse, buildFailureResponse } = require("../utils/responseBuilder");
const { findUserByEmail, searchUsers, findPublicAuthorById } = require('../dao/userDao')
const { CREATED, OK } = require("../constants/statusCodes");
const { isPropertyNotEmpty } = require("../utils/stringValidator");
const { findPostLikes, updatePostLike, removePostLike } = require("../dao/postResponseDao");
const { getSavedPostsByUserId, savePost, removeSavedPost, deleteFromSavedPost } = require("../dao/savedPostsDao");
const { feedbackTemplate } = require("../templates/messageTemplates");
const { sendEmail } = require("../utils/krsEmailSender");

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
    const validTaskpad = validateTaskpadUpate( updateTaskpadRequest, user.id )
    await findAndUpdateTaskpadByUseridAndTaskpadId(user.id, updateTaskpadRequest.taskpadId, validTaskpad)
    buildSuccessResponse({message: `${updateTaskpadRequest.taskpadId} updated.`}, OK, res)
})

const deleteTaskpadById = asyncHandler( async (req, res) => {
    const user = req.user
    const { id } = req.params
    await deleteTaskpad(user.id, id)
    await deleteFromSavedPost(id)
    // delete post responses
    buildSuccessResponse({message: `Deleted successfully`}, OK, res)
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

const getTaskpadById = asyncHandler ( async (req, res) => {
    const { id } = req.body
    const validTaskpadId = isPropertyNotEmpty(id, 'Id')
    const response = await findTaskpadById(validTaskpadId)
    buildSuccessResponse(response, OK, res)
} )

const getLikesByPostId = asyncHandler ( async ( req, res ) => {
    const { id } = req.user
    const { postId } = req.body
    const validPostId = isPropertyNotEmpty(postId, 'Post')
    const response = await findPostLikes(validPostId)
    
    if (response) {
        const isAlreadyLiked = response.likes.includes(id)
        buildSuccessResponse({ alreadyLiked: isAlreadyLiked, count: response.likes.length }, OK, res)
    } else {
        buildSuccessResponse({ alreadyLiked: false, count: 0 }, OK, res)
    }
} )

const updatePostLikes = asyncHandler ( async ( req, res ) => {
    const { postId, updateLike } = req.body
    const { id } = req.user
    updateLike ? await updatePostLike(postId, id) : await removePostLike(postId, id)
    buildSuccessResponse( {  message: 'Success' } , OK, res)
} )

const getSavedPosts = asyncHandler( async ( req, res ) => {
    const { id } = req.user
    const response = await getSavedPostsByUserId(id)
    const data = response ? await getTaskpadsByIds(response.postId) : []
    buildSuccessResponse(data, OK, res)
} )

const updatedSavedPost = asyncHandler ( async ( req, res ) => {
    const { alreadySaved, postId } = req.body
    const { id } = req.user
    alreadySaved ? await savePost(id, postId) : await removeSavedPost(id, postId)
    buildSuccessResponse({ message: 'Success' }, OK, res)
} )

const sendFeedbackMessage = asyncHandler( async (req, res) => {
    const { message, postId } = req.body
    const { id } = req.user

    // get taskpad by postId
    const { userid, title } = await findPublicPostById(postId)
    //get user details by id
    // take email and title out of it
    const { email, fullname } = await findPublicAuthorById(userid)
    // send email
    sendEmail(feedbackTemplate(title, email, fullname, message))
    // save the feedback
    buildSuccessResponse({message: 'Feedback sent'}, OK, res)
})

// public apis
const getAllAuthorPublicPosts = asyncHandler(async (req, res) => {
    const { authorId } = req.body
    const validAuthorId = isPropertyNotEmpty(authorId, 'Author Id')
    const allPublicPostsOfAuthor = await findAllPublicTaskpads(validAuthorId)
    buildSuccessResponse(allPublicPostsOfAuthor, OK, res)
})

const getAuthorPublicPost = asyncHandler( async (req, res) => {
    const { id } = req.query
    const post = await findPublicPostById(id)
    buildSuccessResponse(post, OK, res)
} )

const searchTaskpad = asyncHandler( async (req, res) => {
    const { type, content } = req.body
    if (type !== 'Post') return buildFailureResponse('Invalid search', res)
    const results = await searchPublicTaskpads(content)
    buildSuccessResponse(results, OK, res)
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

const validateTaskpadUpate = ( updateTaskpadRequest, id ) => {
    const { title, taskpadId, content, isPublic, userid } = updateTaskpadRequest
    if ( !title || title.trim().length <= 0 ) throw new Error('Title is required')
    if ( !taskpadId || taskpadId.trim().length <= 3 ) throw new Error('Invalid taskpad Id')
    if ( userid !== id ) throw new Error(`You don't have access to edit: ${title}`)

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
    getPublicTaskpadById,
    getAllAuthorPublicPosts,
    getTaskpadById,
    searchTaskpad,
    getLikesByPostId,
    updatePostLikes,
    getAuthorPublicPost,
    getSavedPosts,
    updatedSavedPost,
    sendFeedbackMessage
}