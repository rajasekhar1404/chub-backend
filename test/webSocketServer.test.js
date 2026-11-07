const assert = require('node:assert/strict')
const http = require('node:http')
const { once } = require('node:events')
const { after, test } = require('node:test')
const { WebSocket } = require('ws')
const { attachWebSocketServer } = require('../webSocketServer')

let server
let webSocketServer
const clients = new Set()

const waitForMessage = (socket, messageType) => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${messageType}`)), 2000)
    const handleMessage = (data) => {
        const message = JSON.parse(data.toString())
        if (message.messageType !== messageType) return
        clearTimeout(timeout)
        socket.off('message', handleMessage)
        resolve(message)
    }
    socket.on('message', handleMessage)
})

const hasMessageWithin = (socket, messageType, delay = 100) => new Promise((resolve) => {
    const timeout = setTimeout(() => {
        socket.off('message', handleMessage)
        resolve(false)
    }, delay)
    const handleMessage = (data) => {
        if (JSON.parse(data.toString()).messageType !== messageType) return
        clearTimeout(timeout)
        socket.off('message', handleMessage)
        resolve(true)
    }
    socket.on('message', handleMessage)
})

const connect = async (protocol) => {
    const socket = new WebSocket(`ws://127.0.0.1:${server.address().port}/ws`, protocol)
    clients.add(socket)
    await once(socket, 'open')
    return socket
}

test('local WebSocket server supports pairing, settings, camera relay, and stale connection replacement', async () => {
    server = http.createServer()
    webSocketServer = attachWebSocketServer(server)
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')

    const display = await connect('123456789012_DISPLAY_DEVICE')
    const console = await connect('123456789012_CONSOLE_DEVICE')

    const pairingStatus = waitForMessage(console, 'PAIRING_STATUS')
    const displayStatus = waitForMessage(display, 'DISPLAY_DEVICE_STATUS')
    console.send(JSON.stringify({
        messageType: 'CONSOLE_DEVICE_PAIRING',
        deviceType: 'CONSOLE_DEVICE',
        data: { deviceId: '123456789012' },
    }))

    assert.equal((await pairingStatus).status, 200)
    assert.equal((await displayStatus).data.isPaired, true)

    const settingsUpdate = waitForMessage(display, 'UPDATE_DISPLAY_SETTINGS_PROCESSING')
    console.send(JSON.stringify({
        messageType: 'UPDATE_DISPLAY_SETTINGS_REQUEST',
        deviceType: 'DISPLAY_DEVICE',
        data: { deviceId: '123456789012', backgroundColor: '#123456' },
    }))
    assert.equal((await settingsUpdate).data.backgroundColor, '#123456')

    const collectedSettings = waitForMessage(console, 'COLLECT_DISPLAY_DEVICE_SETTINGS')
    display.send(JSON.stringify({
        messageType: 'SENDING_DISPLAY_SETTINGS_TO_CONSOLE',
        deviceType: 'CONSOLE_DEVICE',
        data: { deviceId: '123456789012', backgroundColor: '#654321' },
    }))
    assert.equal((await collectedSettings).data.backgroundColor, '#654321')

    const liveCommand = waitForMessage(display, 'SECURITY_CAMERA_LIVE_START')
    console.send(JSON.stringify({
        messageType: 'SECURITY_CAMERA_LIVE_START',
        deviceType: 'DISPLAY_DEVICE',
        data: { deviceId: '123456789012' },
    }))
    assert.equal((await liveCommand).data.deviceId, '123456789012')

    const cameraFrame = waitForMessage(console, 'SECURITY_CAMERA_LIVE_FRAME')
    display.send(JSON.stringify({
        messageType: 'SECURITY_CAMERA_LIVE_FRAME',
        deviceType: 'CONSOLE_DEVICE',
        data: { deviceId: '123456789012', base64: 'aGVsbG8=', capturedAt: Date.now() },
    }))
    assert.equal((await cameraFrame).data.base64, 'aGVsbG8=')

    const videoOffer = waitForMessage(display, 'SECURITY_CAMERA_WEBRTC_SIGNAL')
    console.send(JSON.stringify({
        messageType: 'SECURITY_CAMERA_WEBRTC_SIGNAL',
        deviceType: 'DISPLAY_DEVICE',
        data: { deviceId: '123456789012', signal: { type: 'offer', sdp: 'v=0\r\n' } },
    }))
    assert.deepEqual((await videoOffer).data.signal, { type: 'offer', sdp: 'v=0\r\n' })

    const videoAnswer = waitForMessage(console, 'SECURITY_CAMERA_WEBRTC_SIGNAL')
    display.send(JSON.stringify({
        messageType: 'SECURITY_CAMERA_WEBRTC_SIGNAL',
        deviceType: 'CONSOLE_DEVICE',
        data: {
            deviceId: '123456789012',
            signal: {
                type: 'candidate',
                candidate: { candidate: 'candidate:1 1 UDP 1 192.0.2.1 1234 typ host', sdpMid: '0', sdpMLineIndex: 0 },
            },
        },
    }))
    assert.equal((await videoAnswer).data.signal.type, 'candidate')

    const streamStopped = waitForMessage(console, 'SECURITY_CAMERA_LIVE_STOP')
    display.send(JSON.stringify({
        messageType: 'SECURITY_CAMERA_LIVE_STOP',
        deviceType: 'CONSOLE_DEVICE',
        data: { deviceId: '123456789012', reason: 'recording' },
    }))
    assert.equal((await streamStopped).data.reason, 'recording')

    const oversizedSignal = hasMessageWithin(display, 'SECURITY_CAMERA_WEBRTC_SIGNAL')
    console.send(JSON.stringify({
        messageType: 'SECURITY_CAMERA_WEBRTC_SIGNAL',
        deviceType: 'DISPLAY_DEVICE',
        data: { deviceId: '123456789012', signal: { type: 'offer', sdp: 'x'.repeat(32_001) } },
    }))
    assert.equal(await oversizedSignal, false)

    const recordingChunk = waitForMessage(console, 'SECURITY_CAMERA_RECORDING_CHUNK')
    display.send(JSON.stringify({
        messageType: 'SECURITY_CAMERA_RECORDING_CHUNK',
        deviceType: 'CONSOLE_DEVICE',
        data: { deviceId: '123456789012', recordingId: 'recording-1.mp4', chunkIndex: 0, chunk: 'eA==' },
    }))
    assert.equal((await recordingChunk).data.chunk, 'eA==')

    const oversizedChunk = hasMessageWithin(console, 'SECURITY_CAMERA_RECORDING_CHUNK')
    display.send(JSON.stringify({
        messageType: 'SECURITY_CAMERA_RECORDING_CHUNK',
        deviceType: 'CONSOLE_DEVICE',
        data: { deviceId: '123456789012', recordingId: 'recording-1.mp4', chunkIndex: 1, chunk: 'x'.repeat(64001) },
    }))
    assert.equal(await oversizedChunk, false)

    const spoofedCommand = hasMessageWithin(display, 'SECURITY_CAMERA_LIVE_STOP')
    console.send(JSON.stringify({
        messageType: 'SECURITY_CAMERA_LIVE_STOP',
        deviceType: 'DISPLAY_DEVICE',
        data: { deviceId: '987654321098' },
    }))
    assert.equal(await spoofedCommand, false)

    const replaced = once(display, 'close')
    const replacementDisplay = await connect('123456789012_DISPLAY_DEVICE')
    await replaced
    assert.equal(replacementDisplay.readyState, WebSocket.OPEN)

    const missingDeviceConsole = await connect('987654321098_CONSOLE_DEVICE')
    const missingStatus = waitForMessage(missingDeviceConsole, 'PAIRING_STATUS')
    missingDeviceConsole.send(JSON.stringify({
        messageType: 'CONSOLE_DEVICE_PAIRING',
        deviceType: 'CONSOLE_DEVICE',
        data: { deviceId: '987654321098' },
    }))
    assert.equal((await missingStatus).status, 404)
    assert.equal(missingDeviceConsole.readyState, WebSocket.OPEN)
})

after(async () => {
    for (const client of clients) {
        client.terminate()
    }
    if (webSocketServer) {
        await new Promise((resolve) => webSocketServer.close(resolve))
    }
    if (server?.listening) {
        await new Promise((resolve) => server.close(resolve))
    }
})
