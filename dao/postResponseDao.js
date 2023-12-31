const postResponse = require("../models/postResponse")

const findPostLikes = async ( id ) => {
    return await postResponse.findOne({ postId: id })
}

const updatePostLike = async ( postId, userId ) => {
    const response = await postResponse.findOneAndUpdate(
        { postId: postId, likes: { $ne: userId } },
        { $addToSet: { likes: userId } },
        { new: true } 
    )
    if (!response) return await createNewPostResponse(postId, userId)
    else return response
}

const removePostLike = async ( postId, userId ) => {
    return await postResponse.findOneAndUpdate(
        { postId: postId, likes: userId },
        { $pull: { likes: userId } },
        { new: true } 
    )
}

const createNewPostResponse = async ( postId, userId ) => {
   return await postResponse.create({ postId: postId, likes: [userId], feedback: [] })
}

module.exports = {
    findPostLikes,
    updatePostLike,
    removePostLike
}