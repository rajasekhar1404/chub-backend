const express = require('express')
const { createTaskpad, getUserTaskpadByTaskpadId, updateTaskpad, deleteTaskpadById, findAllTaskpadTitlesWithTaskpadIds, getAllPublicTaskpads, getPublicTaskpadById } = require('../controllers/taskPadController')
const validateToken = require('../middlewares/validateToken')
const router = express.Router()

router.route('/get/:taskpadId').get(validateToken, getUserTaskpadByTaskpadId)
router.route('/create').post(validateToken, createTaskpad)
router.route('/update').post(validateToken, updateTaskpad)
router.route('/').get(validateToken, findAllTaskpadTitlesWithTaskpadIds)
router.route('/:taskpadId').delete(validateToken, deleteTaskpadById)
router.route('/:email').get(getAllPublicTaskpads)
router.route('/:email/:taskpadId').get(getPublicTaskpadById)

module.exports = router