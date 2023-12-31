const followedAuthors = require('../models/followedAuthors.')
const userModal = require('../models/userModel')
const { savePost } = require('./savedPostsDao')
const { findTaskpadById, createNewTaskpad } = require('./taskpadDao')
const { createUserPhoto } = require('./userPhotoDao')

const findUserByEmail = async ( email ) => {
    const response = await userModal.findOne({email: email})

    if (!response) {
        throw new Error('User not registered.')
    }

    return response

}

const createUser = async ( user ) => {

    const existingUser = await findUserByQuery({email: user.email})

    if (existingUser) {
        throw new Error('User already registered')
    }

    const response = await userModal.create(user)
    if (!response) {
        throw new Error('Unable to register the user')
    }

    await createUserPhoto({
        userId: response._id.toString(),
        userName: response.fullname,
        thumbnailPhoto: '',
        profilePhoto: ''
    })

    // add CentralHub user guide after registering
    const chubUserGuide = await findTaskpadById('6591acc5080837bc3278674d')
    await createNewTaskpad({taskpadId: chubUserGuide.taskpadId, userid: response._id.toString(), title: chubUserGuide.title, content: chubUserGuide.content, isPublic: false})
    // follow CentralHub
    await followAuthor(response._id.toString(), chubUserGuide.userid)
    // save Markdown userguide
    await savePost(response._id.toString(), '6591baa9080837bc327867d4')
    return response
}

const findAndUpdateUserById = async (id, user) => {
    return await userModal.findOneAndUpdate({_id: id}, user)
}

const findUserByQuery = async (query) => {
    return await userModal.findOne(query)
}

const deleteUserAccount = async (id) => {
    return await userModal.deleteOne({_id: id})
}

const findUserExists = async (id) => {
    return await userModal.exists({_id: id})
}

const followAuthor = async (userId, authorId) => {
    const response = await followedAuthors.findOneAndUpdate(
        { userId: userId, author: { $ne: authorId } },
        { $addToSet: { author: authorId } },
        { new: true } 
    )
    return response ? response : await createFollowingList(userId, authorId)
}

const unFollowAuthor = async (userId, authorId) => {
    const response = await followedAuthors.findOneAndUpdate(
        { userId: userId, author: authorId },
        { $pull: { author: authorId } },
        { new: true } 
    )
    return response 
}

const createFollowingList = async (userId, authorId) => {
    const response = await followedAuthors.exists({userId: userId})
    if (!response) {
        return await followedAuthors.create({userId: userId, author: [authorId]})
    } else {
        return { message: 'You are already following this author' }
    }
}

const findFollowingAuthors = async (id) => {
    return await followedAuthors.findOne({userId: id})
}

const searchUsers = async ( userName ) => {
    return await userModal.find({
        $and: [
            { fullname: { $regex: '.*' + userName }},
            { isPublic: true }
        ]
    }).select(['_id'])
}

const findPublicAuthorById = async (id) => {
    return await userModal.findOne({
        $and: [
            { _id: id},
            { isPublic: true }
        ]
    })
}

module.exports = {
    findUserByEmail,
    createUser,
    findUserByQuery,
    findAndUpdateUserById,
    deleteUserAccount,
    findFollowingAuthors,
    followAuthor,
    findUserExists,
    unFollowAuthor,
    searchUsers,
    findPublicAuthorById
}