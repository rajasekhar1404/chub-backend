const assert = require('node:assert/strict')
const { test } = require('node:test')
const taskModel = require('../models/taskModel')
const { getTasksByDate, getTasksByDateRange } = require('../controllers/taskController')
const { sortTasksByStatus } = require('../utils/taskSorting')

test('sorts tasks by active status priority while preserving order within each status', () => {
    const tasks = [
        { title: 'Cancelled', status: 'CANCELLED' },
        { title: 'To-do first', status: 'TO-DO' },
        { title: 'Completed', status: 'COMPLETED' },
        { title: 'In progress', status: 'IN-PROGRESS' },
        { title: 'To-do second', status: 'TO-DO' }
    ]

    assert.deepEqual(sortTasksByStatus(tasks).map(task => task.title), [
        'In progress',
        'To-do first',
        'To-do second',
        'Completed',
        'Cancelled'
    ])
})

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
        return [
            { title: 'Cancelled', status: 'CANCELLED' },
            { title: 'In progress', status: 'IN-PROGRESS' },
            { title: 'Task today', status: 'TO-DO' }
        ]
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
        assert.deepEqual(response.data.map(task => task.title), [
            'In progress',
            'Task today',
            'Cancelled'
        ])
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

test('returns month-range tasks ordered by status priority', async () => {
    const originalFind = taskModel.find
    const response = {
        status(statusCode) {
            this.statusCode = statusCode
            return this
        },
        json(data) {
            this.data = data
        }
    }
    taskModel.find = async () => [
        { title: 'Cancelled', status: 'CANCELLED' },
        { title: 'Completed', status: 'COMPLETED' },
        { title: 'To-do', status: 'TO-DO' },
        { title: 'In progress', status: 'IN-PROGRESS' }
    ]

    try {
        await getTasksByDateRange({
            body: {
                fromDate: '2026-10-01T00:00:00.000Z',
                toDate: '2026-10-31T23:59:59.999Z'
            },
            user: { id: 'user-1' }
        }, response, error => {
            throw error
        })

        assert.deepEqual(response.data.map(task => task.title), [
            'In progress',
            'To-do',
            'Completed',
            'Cancelled'
        ])
    } finally {
        taskModel.find = originalFind
    }
})
