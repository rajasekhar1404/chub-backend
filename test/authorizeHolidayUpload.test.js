const assert = require('node:assert/strict')
const { afterEach, test } = require('node:test')
const authorizeHolidayUpload = require('../middlewares/authorizeHolidayUpload')

const originalToken = process.env.HOLIDAY_UPLOAD_TOKEN

afterEach(() => {
    if (originalToken === undefined) {
        delete process.env.HOLIDAY_UPLOAD_TOKEN
    } else {
        process.env.HOLIDAY_UPLOAD_TOKEN = originalToken
    }
})

const createResponse = () => ({
    statusCode: null,
    body: null,
    status(statusCode) {
        this.statusCode = statusCode
        return this
    },
    json(body) {
        this.body = body
        return this
    }
})

test('allows the configured holiday upload token', () => {
    const token = 'a'.repeat(32)
    process.env.HOLIDAY_UPLOAD_TOKEN = token
    const response = createResponse()
    let continued = false

    authorizeHolidayUpload({
        get: () => `Bearer ${token}`
    }, response, () => {
        continued = true
    })

    assert.equal(continued, true)
    assert.equal(response.statusCode, null)
})

test('rejects an incorrect holiday upload token', () => {
    process.env.HOLIDAY_UPLOAD_TOKEN = 'a'.repeat(32)
    const response = createResponse()
    let continued = false

    authorizeHolidayUpload({
        get: () => `Bearer ${'b'.repeat(32)}`
    }, response, () => {
        continued = true
    })

    assert.equal(continued, false)
    assert.equal(response.statusCode, 401)
})
