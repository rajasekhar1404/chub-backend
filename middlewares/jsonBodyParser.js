const jsonBodyParser = ({ limitBytes }) => (req, res, next) => {
    const contentType = req.headers['content-type'] || ''
    if (!/^application\/(?:[a-z0-9.+-]*\+)?json(?:\s*;|$)/i.test(contentType)) {
        return next()
    }

    const chunks = []
    let size = 0
    let finished = false
    const fail = (error) => {
        if (finished) return
        finished = true
        next(error)
    }

    req.on('data', (chunk) => {
        if (finished) return
        size += chunk.length
        if (size > limitBytes) {
            const error = new Error('JSON request body is too large')
            error.status = 413
            fail(error)
            req.resume()
            return
        }
        chunks.push(chunk)
    })

    req.on('error', fail)
    req.on('end', () => {
        if (finished) return
        finished = true
        try {
            const text = Buffer.concat(chunks).toString('utf8')
            req.body = text.length ? JSON.parse(text) : {}
            next()
        } catch (error) {
            error.status = 400
            next(error)
        }
    })
}

module.exports = jsonBodyParser
