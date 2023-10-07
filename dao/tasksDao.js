const taskModel = require("../models/taskModel")

const deleteAllTasks = async (id) => {
    return await taskModel.deleteMany({userid: id})
}

module.exports = {
    deleteAllTasks
}