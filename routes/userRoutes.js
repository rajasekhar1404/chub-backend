const express = require('express')
const { registerUser, loginUser, updateUser, getLoggedInUser, getUserProfilePhoto, updateUserProfilePhoto, getPublicUserByEmail, generateForgotPasswordCode, verifyForgotPasswordOTP, updateForgotPassword } = require('../controllers/userController')
const validateToken = require('../middlewares/validateToken')
const router = express.Router()

router.route("/email/:email").get(getPublicUserByEmail)
router.route('/register').post(registerUser)
router.route('/login').post(loginUser)
router.route('/update').post(validateToken, updateUser)
router.route('/user').get(validateToken, getLoggedInUser)
router.route('/profilePhoto').get(validateToken, getUserProfilePhoto).post(validateToken, updateUserProfilePhoto)
router.route('/forgotPassword/:email').get(generateForgotPasswordCode)
router.route('/verifyotp').post(verifyForgotPasswordOTP)
router.route('/updateForgotPassword').post(updateForgotPassword)

module.exports = router