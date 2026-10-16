const mongoose = require('mongoose')

let connectionPromise

const connection = async () => {
    if (mongoose.connection.readyState === 1) return mongoose.connection
    if (!process.env.ATLAS_URL) throw new Error('ATLAS_URL is not configured')

    if (!connectionPromise) {
        connectionPromise = mongoose.connect(process.env.ATLAS_URL).catch((error) => {
            connectionPromise = undefined
            throw error
        })
    }

    return connectionPromise
}

module.exports = connection
