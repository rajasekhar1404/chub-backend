const userModel = require('../models/userModel')
const asyncHandler = require('express-async-handler')
const otpsModal = require('../models/otp')
const { OK, CREATED } = require('../constants/statusCodes')
const { findUserByEmail, createUser, findUserByQuery, findAndUpdateUserById } = require('../dao/userDao')
const { encryptPassword, verifyPassword } = require('../utils/passwordEncoder')
const { isPropertyNotEmpty, isPropertyExists } = require('../utils/stringValidator')
const { buildSuccessResponse, buildFailureResponse } = require('../utils/responseBuilder')
const { createToken } = require('../utils/jwtUtils')
const { getUserPhotoById, findUserPhotoAndUpdate, createUserPhoto } = require('../dao/userPhotoDao')
const { generateOTP } = require('../utils/otpUtils')
const { createOtp, findValidOTP, deleteAllOtps } = require('../dao/otpDao')
const { sendEmail } = require('../utils/krsEmailSender')
const forgotPasswordOTPTemplate = require('../templates/forgotPasswordOTPTemplate')

const registerUser = asyncHandler(async (req, res) => {
    const user = req.body
    const createUserRequest = await validateAndBuildRegisterUserRequest(user)
    const registeredUser = await createUser(createUserRequest)
    registeredUser ? buildSuccessResponse('User registered successfully', CREATED, res) : buildFailureResponse('Unable to register the user', res)
})

const loginUser = asyncHandler( async (req, res) => {
    const user = req.body
    const validUserRequest = validateLoginRequest(user)
    const registeredUser = await findUserByEmail(validUserRequest.email)
    await verifyPassword(user.password, registeredUser.password) ? buildSuccessResponse(createToken(registeredUser), OK, res) : buildFailureResponse('Invalid credentials', res)
})

const getLoggedInUser = asyncHandler( async (req, res) => {
    const user = req.user
    const registeredUser = await findUserByQuery({_id: user.id})
    registeredUser ? buildSuccessResponse(buildUserModal(registeredUser), OK, res) : buildFailureResponse('User not found', res)
})

const getUserProfilePhoto = asyncHandler( async (req, res) => {
    const user = req.user
    const userPhoto = await getUserPhotoById(user.id)
    userPhoto ? buildSuccessResponse({profilePhoto: userPhoto.profilePhoto}, OK, res) : buildSuccessResponse('', OK, res)
})

const updateUserProfilePhoto = asyncHandler( async (req, res) => {
    const user = req.user
    const { profilePhoto } = req.body
    const userPhoto = await getUserPhotoById(user.id)
    userPhoto ? await findUserPhotoAndUpdate(user.id, { profilePhoto: profilePhoto }) : await createUserPhoto({userId: user.id, profilePhoto: profilePhoto})
    buildSuccessResponse('Profile photo updated successfully', OK, res)
})

const updateUser = asyncHandler( async (req, res) => {
    const userUpdateRequest = req.body
    const user = req.user
    const registeredUser = await findUserByQuery({_id: user.id})
    const updatedUserObject = await validateUpdateUserRequest(userUpdateRequest, registeredUser)
    const data = await findAndUpdateUserById(user.id, updatedUserObject)
    data ? buildSuccessResponse('User updated successfully', OK, res) : buildFailureResponse('Unable to update the user', res)
})

const getPublicUserByEmail = asyncHandler( async(req, res) => {
    const { email } = req.params
    const publicUser = await findUserByQuery({ $and : [ {email: email}, {isPublic: true} ] })
    publicUser ? buildSuccessResponse(buildUserModal(publicUser), OK, res) : buildFailureResponse(`${ email } not found`, res)
})

const generateForgotPasswordCode = asyncHandler( async (req, res) => {
    const { email } = req.params
    const user = await findUserByEmail(email)
    await deleteAllOtps(user._id)
    const generatedOTP = await createOtp(user._id, generateOTP())
    sendEmail(forgotPasswordOTPTemplate(email, user.fullname, generatedOTP.otp))
    buildSuccessResponse({message: `Verification OTP sent to ${email}`}, OK, res)
})

const verifyForgotPasswordOTP = asyncHandler(async (req, res) => {
    const {email, otp} = req.body
    const registeredUser = await findUserByEmail(email)
    await findValidOTP(registeredUser._id, otp) ? buildSuccessResponse({status: true}, OK, res) : buildFailureResponse('Invalid OTP', res)
})

const updateForgotPassword = asyncHandler( async (req, res) => {
    const { email, otp, password } = req.body
    const registeredUser = await findUserByEmail(email)
    await findValidOTP(registeredUser._id, otp)
    await deleteAllOtps(registeredUser._id)
    await findAndUpdateUserById(registeredUser._id, { password: await encryptPassword(password) }) ? buildSuccessResponse({message: 'Password updated successfully'}, OK, res) : buildFailureResponse('Unable to update the password', res)
})

// utility methods
const validateAndBuildRegisterUserRequest = async (user) => {

    const { fullname, email, password } = user

    const validFullname = isPropertyNotEmpty(fullname, 'fullname')
    const validEmail = isPropertyNotEmpty(email, 'email')
    const validPassword = isPropertyNotEmpty(password, 'password')
    const encryptedPassword = await encryptPassword(validPassword)

    return {
        fullname: validFullname.toUpperCase(),
        email: validEmail,
        password: encryptedPassword,
        isPublic: false
    }
}

const validateLoginRequest = (user) => {
    const { email, password } = user
    const validEmail = isPropertyNotEmpty(email, 'email')
    const validPassword = isPropertyNotEmpty(password, 'password')

    return {
        email: validEmail,
        password: validPassword
    }
}

const buildUserModal = (user) => {
    return {
        _id: user._id,
        fullname: user.fullname,
        email: user.email,
        aboutMe: user.aboutMe,
        experiences: user.experiences,
        projects: user.projects,
        skills : user.skills,
        contact: user.contact,
        isPublic: user.isPublic
    }
}

const validateUpdateUserRequest = async ( user, registeredUser ) => {

    if (!registeredUser) throw new Error('User not found')

    let updatedUser = { ...user }

    if (isPropertyExists(user.oldPassword) && isPropertyExists(user.newPassword) ) {
        const isValidOldPassword = await verifyPassword(user.oldPassword, registeredUser.password)
        if (!isValidOldPassword) {
            throw new Error('Incorrect old password')
        }
        updatedUser.password = await encryptPassword(user.newPassword)
    }

    return updatedUser
}

module.exports = {
    registerUser,
    loginUser,
    updateUser,
    getLoggedInUser,
    getUserProfilePhoto,
    updateUserProfilePhoto,
    getPublicUserByEmail,
    generateForgotPasswordCode,
    verifyForgotPasswordOTP,
    updateForgotPassword
}