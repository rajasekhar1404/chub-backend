const { timingSafeEqual } = require('node:crypto')

const authorizeHolidayUpload = (req, res, next) => {
    const expectedToken = process.env.HOLIDAY_UPLOAD_TOKEN
    if (!expectedToken) {
        console.error('HOLIDAY_UPLOAD_TOKEN is not configured.')
        return res.status(500).json({ message: 'Holiday upload is not configured.' })
    }
    if (Buffer.byteLength(expectedToken) < 32) {
        console.error('HOLIDAY_UPLOAD_TOKEN must be at least 32 bytes long.')
        return res.status(500).json({ message: 'Holiday upload is not configured.' })
    }

    const authorization = req.get('authorization') || ''
    const providedToken = authorization.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length)
        : ''
    const expected = Buffer.from(expectedToken)
    const provided = Buffer.from(providedToken)
    const validToken = provided.length === expected.length && timingSafeEqual(provided, expected)

    if (!validToken) {
        return res.status(401).json({ message: 'Unauthorized.' })
    }
    next()
}

module.exports = authorizeHolidayUpload
