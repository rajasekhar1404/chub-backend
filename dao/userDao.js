const userModal = require('../models/userModel')

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
    return response
}

const findAndUpdateUserById = async (id, user) => {
    return await userModal.findOneAndUpdate({_id: id}, user)
}

const findUserByQuery = async (query) => {
    return await userModal.findOne(query)
}

module.exports = {
    findUserByEmail,
    createUser,
    findUserByQuery,
    findAndUpdateUserById
}