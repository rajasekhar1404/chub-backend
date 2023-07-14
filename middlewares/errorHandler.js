const statusCode = require('../constants/statusCodes')

const errorHandler = (err, req, res, next) => {
    switch(res.statusCode) {
        case statusCode.BAD_REQUEST :
            res.json({message: err.message})
            break;
        case statusCode.UNAUTHORIZED :
            res.json({message: err.message})
            break;
        case statusCode.FORBIDDEN : 
            res.json({message: err.message})
            break;
        case statusCode.INTERNAL_SERVER_ERROR :
            res.json({message: err.message})
            break;
        default:
            res.status(statusCode.INTERNAL_SERVER_ERROR)
            res.json({message: err.message})
            break;
    }
    next()
}

module.exports = errorHandler