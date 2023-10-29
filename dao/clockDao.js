const clock = require('../models/clock')

const findUserClockSettingsById = async (id) => {
    return await clock.findOne({userId: id})
}

const findAndUpdateUserClockSettings = async (id, settings) => {
    const response = await clock.findOneAndUpdate({userId: id}, settings)
    if (!response) {
        return await clock.create({...settings, userId: id})
    }
    return response;
}

module.exports = {
    findUserClockSettingsById,
    findAndUpdateUserClockSettings
}