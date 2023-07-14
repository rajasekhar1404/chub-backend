const scheduler = require('node-schedule')
const { deleteExpiredOtps } = require('../dao/otpDao')

const otpDeleteJob = scheduler.scheduleJob('delete all expired otps', '15 * * * *', async function() {
    await deleteExpiredOtps()
})

module.exports = otpDeleteJob