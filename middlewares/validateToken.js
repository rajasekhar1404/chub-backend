const jwt = require('jsonwebtoken')

const validateToken = (req, res, next) => {
    const authToken = req.headers.authorization || req.headers.Authorization
    let token;
    if (authToken && authToken.startsWith('Bearer')) {
        token = authToken.split(" ")[1]
    }
    if (!token) {
        res.status(401)
        throw new Error('User unauthorized')
    }

    jwt.verify(token, process.env.ACCESS_KEY, (err, decoded) => {
        if (err) {
            res.status(401)
            throw new Error('User unauthorized')
        }
        req.user = decoded.user
    })

    next()
}

module.exports = validateToken