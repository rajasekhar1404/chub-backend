const express = require('express')
const taskRoutes = require('./routes/taskRoutes')
const taskPadRoutes = require('./routes/taskPadRoutes')
const userRoutes = require('./routes/userRoutes')
const publicHolidayRoutes = require('./routes/publicHolidayRoutes')
const cors = require('cors')
const errorHandler = require('./middlewares/errorHandler')
const { redirectRequests } = require('./middlewares/redirectRequests')
const dbConnection = require('./config/dbConfig')
const jsonBodyParser = require('./middlewares/jsonBodyParser')
const http = require('node:http')

const app = express()
app.use(cors())
app.get('/', (req, res) => res.json({ service: 'CentralHub API', status: 'ok' }))
app.use(async (req, res, next) => {
    try {
        await dbConnection()
        next()
    } catch (error) {
        next(error)
    }
})

app.use(jsonBodyParser({ limitBytes: 50 * 1024 * 1024 }))
app.use(redirectRequests)

app.use('/api/tasks', taskRoutes)
app.use('/api/taskpad', taskPadRoutes)
app.use('/api/users', userRoutes)
app.use('/api/holidays', publicHolidayRoutes)
app.use(errorHandler)

if (require.main === module) {
    require('dotenv').config()
    const port = process.env.PORT || 3000
    const server = http.createServer(app)
    const { attachWebSocketServer } = require('./webSocketServer')
    attachWebSocketServer(server)
    server.listen(port, () => console.log('Application started in port:', port))
}

module.exports = app
