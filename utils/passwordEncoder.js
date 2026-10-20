const bcrypt = require('bcryptjs')

const encryptPassword = async (rawPassword) => {
    return await bcrypt.hash(rawPassword, 10)
}

const verifyPassword = async (rawPassword, encryptedPassword) => {
    return await bcrypt.compare(rawPassword, encryptedPassword)
}

module.exports = {
    encryptPassword,
    verifyPassword
}