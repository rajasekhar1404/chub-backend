const assert = require('node:assert/strict')
const { test } = require('node:test')
const taskModel = require('../models/taskModel')
const { getTasksByDate } = require('../controllers/taskController')

test('finds tasks overlapping the requested calendar day, including tasks without a due date', async () => {
    const originalFind = taskModel.find
    let query
    const response = {
        json(data) {
            this.data = data
        }
    }
    taskModel.find = async (filter) => {
        query = filter
        return [{ title: 'Task today' }]
    }

    try {
        await getTasksByDate({
            body: {
                fromDate: '2026-10-24T18:30:00.000Z',
                toDate: '2026-10-25T18:29:59.999Z'
            },
            user: { id: 'user-1' }
        }, response, error => {
            throw error
        })

        assert.equal(query.userid, 'user-1')
        assert.equal(query.startDate.$lte.toISOString(), '2026-10-25T18:29:59.999Z')
        assert.equal(query.$or[0].dueDate.$gte.toISOString(), '2026-10-24T18:30:00.000Z')
        assert.deepEqual(query.$or[1], {
            dueDate: null,
            startDate: { $gte: new Date('2026-10-24T18:30:00.000Z') }
        })
        assert.deepEqual(response.data, [{ title: 'Task today' }])
    } finally {
        taskModel.find = originalFind
    }
})

test('rejects invalid task date ranges', async () => {
    const response = {
        status(statusCode) {
            this.statusCode = statusCode
            return this
        }
    }
    let nextError

    await getTasksByDate({
        body: { fromDate: 'not-a-date', toDate: '2026-10-25T18:29:59.999Z' },
        user: { id: 'user-1' }
    }, response, error => {
        nextError = error
    })

    assert.equal(response.statusCode, 400)
    assert.match(nextError.message, /valid date or date range/)
})
