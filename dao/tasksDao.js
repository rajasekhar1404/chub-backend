const taskModel = require("../models/taskModel")

const deleteAllTasks = async (id) => {
    return await taskModel.deleteMany({userid: id})
}

const findTasksBetween = async (id, from, to) => {
    return await taskModel.find({
        userid: id,
        startDate : {$lte : to},
        dueDate : {$gte : from}
    })
}

module.exports = {
    deleteAllTasks, findTasksBetween
}