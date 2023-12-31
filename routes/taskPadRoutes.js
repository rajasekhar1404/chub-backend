const express = require('express')
const { createTaskpad, getUserTaskpadByTaskpadId, updateTaskpad, deleteTaskpadById, findAllTaskpadTitlesWithTaskpadIds, getAllPublicTaskpads, getPublicTaskpadById, getAllAuthorPublicPosts, getTaskpadById, searchTaskpad, getLikesByPostId, updatePostLikes, getAuthorPublicPost, getSavedPosts, updatedSavedPost, sendFeedbackMessage } = require('../controllers/taskPadController')
const validateToken = require('../middlewares/validateToken')
const router = express.Router()

router.route('/get/:taskpadId').get(validateToken, getUserTaskpadByTaskpadId)
router.route('/create').post(validateToken, createTaskpad)
router.route('/update').post(validateToken, updateTaskpad)
router.route('/').get(validateToken, findAllTaskpadTitlesWithTaskpadIds).post(validateToken, getTaskpadById)
router.route('/:id').delete(validateToken, deleteTaskpadById)
router.route('/author').post(getAllAuthorPublicPosts).get(getAuthorPublicPost)
router.route('/search').post(validateToken, searchTaskpad)
router.route('/likes').post(validateToken, getLikesByPostId).put(validateToken, updatePostLikes)
router.route('/saved').get(validateToken, getSavedPosts).post(validateToken, updatedSavedPost)
router.route('/feedback').post(validateToken, sendFeedbackMessage)

router.route('/:email').get(getAllPublicTaskpads)
router.route('/:email/:taskpadId').get(getPublicTaskpadById)

module.exports = router