const jwt = require('jsonwebtoken')

const createToken = (user) => {

    const { _id, fullname, email, password } = user

    const accessToken = jwt.sign(
        {
            user : {
                id: _id,
                fullname : fullname,
                email : email
            }
        },
        process.env.ACCESS_KEY,
        { 
            expiresIn: "30d"
        }
    )

    return {key: accessToken}

}

module.exports = {
    createToken
}