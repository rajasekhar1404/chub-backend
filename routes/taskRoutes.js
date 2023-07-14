const express = require('express')
const router = express.Router()
const { getAllTasks, createTask, deleteTask, getTask, updateTask, getTasksByDate } = require('../controllers/taskController')
const validateToken = require('../middlewares/validateToken')

router.route('/').get(validateToken, getAllTasks)
router.route('/create').post(validateToken, createTask)
router.route('/:id').get(validateToken, getTask).delete(validateToken, deleteTask)
router.route('/update').put(validateToken, updateTask)
router.route('/date').post(validateToken, getTasksByDate)

module.exports = router