const express = require('express')
const path = require('path')
const taskRoutes = require('./routes/taskRoutes')
const taskPadRoutes = require('./routes/taskPadRoutes')
const userRoutes = require('./routes/userRoutes')
const dbConnection = require('./config/dbConfig')
const cors = require('cors')
const errorHandler = require('./middlewares/errorHandler')
const { redirectRequests } = require('./middlewares/redirectRequests')
const otpDeleteJob = require('./scheduler/otpScheduler')
require('dotenv').config()

const app = express()
app.use(cors())
app.listen(process.env.PORT)

dbConnection()

app.use(express.json({limit: '50mb'}))
app.use(express.static(path.join(__dirname, 'build')))
app.use(redirectRequests)

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'))
})

app.use('/api/tasks', taskRoutes)
app.use('/api/taskpad', taskPadRoutes)
app.use('/api/users', userRoutes)
app.use(errorHandler)
otpDeleteJob.schedule(new Date())