const asyncHandler = require('express-async-handler')
const { findUserClockSettingsById, findAndUpdateUserClockSettings } = require('../dao/clockDao')
const { buildSuccessResponse, buildFailureResponse } = require('../utils/responseBuilder')
const { OK } = require('../constants/statusCodes')

const getUserClockSettings = asyncHandler(async (req, res) => {
    const user = req.user
    const response = await findUserClockSettingsById(user.id)
    response ? buildSuccessResponse(response, OK, res) : buildFailureResponse('Clock settings not found', res)
})

const updateUserClockSettings = asyncHandler(async (req, res) => {
    const user = req.user
    const response = await findAndUpdateUserClockSettings(user.id, req.body)
    response ? buildSuccessResponse('Clock settings updated', OK, res) : buildFailureResponse('Unable to update clock settings', res)
})

module.exports = {
    getUserClockSettings,
    updateUserClockSettings
}