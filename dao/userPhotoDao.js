const userPhotoModal = require('../models/userProfilePhoto')

const getUserPhotoById = async (id) => {
    return await userPhotoModal.findOne({userId: id})
}

const findUserPhotoAndUpdate = async (id, profilePhoto) => {
    await userPhotoModal.findOneAndUpdate({userId: id}, profilePhoto)
}

const createUserPhoto = async (profilePhoto) => {
    await userPhotoModal.create(profilePhoto)
}

const deleteUserPhoto = async ( id ) => {
    return await userPhotoModal.deleteOne({userId: id})
}

const getUsersPhotosByIds = async (ids) => {
    return await userPhotoModal.find(
        { userId: { $in : ids } }
    )
}

module.exports = {
    getUserPhotoById,
    findUserPhotoAndUpdate,
    createUserPhoto,
    deleteUserPhoto,
    getUsersPhotosByIds
}