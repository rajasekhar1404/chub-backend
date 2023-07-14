const mongoose = require('mongoose')

const connection = async () => {
    try {
        await mongoose.connect(process.env.ATLAS_URL).catch(err => console.log(err.message))
    } catch(err) {
        console.log(err.message)
    }
}

module.exports = connection