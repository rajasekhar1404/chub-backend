const { INTERNAL_SERVER_ERROR } = require("../constants/statusCodes")

const buildSuccessResponse = (data, statusCode, res) => {
    res.status(statusCode)
    res.json(data)
}

const buildFailureResponse = (responseMessage, res) => {
    res.status(INTERNAL_SERVER_ERROR)
    res.json({message: responseMessage})
}

module.exports = {
    buildFailureResponse,
    buildSuccessResponse
}