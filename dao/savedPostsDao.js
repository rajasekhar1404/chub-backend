const savedPosts = require("../models/savedPosts")

const savePost = async ( id, postId ) => {
    const response = await savedPosts.findOneAndUpdate(
        { userId: id, postId: { $ne: postId } },
        { $addToSet: { postId: postId } },
        { new: true }
    )
    if (!response) return await createNewSavedPost(id, postId)
    else return response
}

const createNewSavedPost = async ( id, postId ) => {
    return await savedPosts.create( { userId: id, postId: [postId] } )
}

const removeSavedPost = async ( id, postId ) => {
    return await savedPosts.findOneAndUpdate(
        { userId: id, postId: postId },
        { $pull: { postId: postId } },
        { new: true } 
    )
}

const getSavedPostsByUserId = async ( id ) => {
    return await savedPosts.findOne({ userId: id })
}

const deleteFromSavedPost = async ( postId ) => {
    return await savedPosts.findOneAndUpdate(
        { postId: postId },
        { $pull: { postId: postId } },
        { new: true } 
    )
}

module.exports = {
    savePost,
    removeSavedPost,
    getSavedPostsByUserId,
    deleteFromSavedPost
}