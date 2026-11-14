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

    let display = await connect('123456789012_DISPLAY_DEVICE')
    const console = await connect('123456789012_CONSOLE_DEVICE')
    const connectionId = 'c6af4a35-7154-4f5c-bf24-7113ef4293ea'

    const pendingStatus = waitForMessage(console, 'PAIRING_STATUS')
    const pairingRequest = waitForMessage(display, 'CONSOLE_DEVICE_PAIRING_REQUEST')
    console.send(JSON.stringify({
        messageType: 'CONSOLE_DEVICE_PAIRING',
        deviceType: 'CONSOLE_DEVICE',
        data: { deviceId: '123456789012', connectionId, username: 'test-user' },
    }))
    assert.equal((await pendingStatus).status, 202)
    assert.equal((await pairingRequest).data.username, 'test-user')

    const pairingStatus = waitForMessage(console, 'PAIRING_STATUS')
    const displayStatus = waitForMessage(display, 'DISPLAY_DEVICE_STATUS')
    const connectedDevices = waitForMessage(display, 'CONNECTED_DEVICES_STATUS')
    display.send(JSON.stringify({
        messageType: 'PAIRING_DECISION',
        deviceType: 'DISPLAY_DEVICE',
        data: { deviceId: '123456789012', connectionId, accepted: true, displayName: 'Living Room' },
    }))
    const pairedConsoleStatus = await pairingStatus
    assert.equal(pairedConsoleStatus.status, 200)
    assert.equal(pairedConsoleStatus.deviceName, 'Living Room')
    const pairedDisplayStatus = await displayStatus
    assert.equal(pairedDisplayStatus.data.isPaired, true)
    assert.equal(pairedDisplayStatus.data.displayName, 'Living Room')
    assert.deepEqual((await connectedDevices).data.devices, [{ connectionId, username: 'test-user' }])

    const settingsUpdate = waitForMessage(display, 'UPDATE_DISPLAY_SETTINGS_PROCESSING')
    console.send(JSON.stringify({
        messageType: 'UPDATE_DISPLAY_SETTINGS_REQUEST',
        deviceType: 'DISPLAY_DEVICE',
        data: { deviceId: '123456789012', connectionId, backgroundColor: '#123456' },
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
        data: { deviceId: '123456789012', connectionId },
    }))
    assert.equal((await liveCommand).data.deviceId, '123456789012')

    const cameraFrame = waitForMessage(console, 'SECURITY_CAMERA_LIVE_FRAME')
    display.send(JSON.stringify({
        messageType: 'SECURITY_CAMERA_LIVE_FRAME',
        deviceType: 'CONSOLE_DEVICE',
        data: { deviceId: '123456789012', connectionId, base64: 'aGVsbG8=', capturedAt: Date.now() },
    }))
    assert.equal((await cameraFrame).data.base64, 'aGVsbG8=')

    const liveSessionId = 'live-session-1'
    const videoOffer = waitForMessage(display, 'SECURITY_CAMERA_WEBRTC_SIGNAL')
    console.send(JSON.stringify({
        messageType: 'SECURITY_CAMERA_WEBRTC_SIGNAL',
        deviceType: 'DISPLAY_DEVICE',
        data: {
            deviceId: '123456789012',
            connectionId,
            sessionId: liveSessionId,
            signal: { type: 'offer', sdp: 'v=0\r\n' },
        },
    }))
    const relayedOffer = await videoOffer
    assert.deepEqual(relayedOffer.data.signal, { type: 'offer', sdp: 'v=0\r\n' })
    assert.equal(relayedOffer.data.sessionId, liveSessionId)

    const videoAnswer = waitForMessage(console, 'SECURITY_CAMERA_WEBRTC_SIGNAL')
    display.send(JSON.stringify({
        messageType: 'SECURITY_CAMERA_WEBRTC_SIGNAL',
        deviceType: 'CONSOLE_DEVICE',
        data: {
            deviceId: '123456789012',
            connectionId,
            sessionId: liveSessionId,
            signal: {
                type: 'candidate',
                candidate: { candidate: 'candidate:1 1 UDP 1 192.0.2.1 1234 typ host', sdpMid: '0', sdpMLineIndex: 0 },
            },
        },
    }))
    const relayedCandidate = await videoAnswer
    assert.equal(relayedCandidate.data.signal.type, 'candidate')
    assert.equal(relayedCandidate.data.sessionId, liveSessionId)

    const liveRecordingCommand = waitForMessage(display, 'SECURITY_CAMERA_LIVE_RECORDING')
    console.send(JSON.stringify({
        messageType: 'SECURITY_CAMERA_LIVE_RECORDING',
        deviceType: 'DISPLAY_DEVICE',
        data: {
            deviceId: '123456789012',
            connectionId,
            sessionId: liveSessionId,
            action: 'start',
            durationMinutes: 5,
        },
    }))
    const relayedRecordingCommand = await liveRecordingCommand
    assert.equal(relayedRecordingCommand.data.sessionId, liveSessionId)
    assert.equal(relayedRecordingCommand.data.durationMinutes, 5)

    const invalidRecordingCommand = hasMessageWithin(display, 'SECURITY_CAMERA_LIVE_RECORDING')
    console.send(JSON.stringify({
        messageType: 'SECURITY_CAMERA_LIVE_RECORDING',
        deviceType: 'DISPLAY_DEVICE',
        data: {
            deviceId: '123456789012',
            connectionId,
            sessionId: liveSessionId,
            action: 'start',
            durationMinutes: 61,
        },
    }))
    assert.equal(await invalidRecordingCommand, false)

    const liveRecordingState = waitForMessage(console, 'SECURITY_CAMERA_LIVE_RECORDING_STATE')
    display.send(JSON.stringify({
        messageType: 'SECURITY_CAMERA_LIVE_RECORDING_STATE',
        deviceType: 'CONSOLE_DEVICE',
        data: {
            deviceId: '123456789012',
            connectionId,
            sessionId: liveSessionId,
            state: 'saved',
            recordingId: 'recording-1.mp4',
        },
    }))
    assert.equal((await liveRecordingState).data.state, 'saved')

    const streamRequest = waitForMessage(display, 'SECURITY_CAMERA_RECORDING_STREAM_REQUEST')
    console.send(JSON.stringify({
        messageType: 'SECURITY_CAMERA_RECORDING_STREAM_REQUEST',
        deviceType: 'DISPLAY_DEVICE',
        data: {
            deviceId: '123456789012',
            connectionId,
            requestId: 'stream-request-1',
            recordingId: 'recording-1731600000000.mp4',
        },
    }))
    const relayedStreamRequest = await streamRequest
    assert.equal(relayedStreamRequest.data.requestId, 'stream-request-1')
    assert.equal(relayedStreamRequest.data.recordingId, 'recording-1731600000000.mp4')

    const streamResult = waitForMessage(console, 'SECURITY_CAMERA_RECORDING_STREAM_RESULT')
    display.send(JSON.stringify({
        messageType: 'SECURITY_CAMERA_RECORDING_STREAM_RESULT',
        deviceType: 'CONSOLE_DEVICE',
        data: {
            deviceId: '123456789012',
            connectionId,
            requestId: 'stream-request-1',
            recordingId: 'recording-1731600000000.mp4',
            url: 'http://192.168.1.25:54321/stream/0123456789abcdef0123456789abcdef0123456789abcdef/recording-1731600000000.mp4',
        },
    }))
    assert.equal((await streamResult).data.requestId, 'stream-request-1')

    const invalidStreamRequest = hasMessageWithin(display, 'SECURITY_CAMERA_RECORDING_STREAM_REQUEST')
    console.send(JSON.stringify({
        messageType: 'SECURITY_CAMERA_RECORDING_STREAM_REQUEST',
        deviceType: 'DISPLAY_DEVICE',
        data: {
            deviceId: '123456789012',
            connectionId,
            requestId: 'stream-request-2',
            recordingId: '../private.mp4',
        },
    }))
    assert.equal(await invalidStreamRequest, false)

    const invalidStreamResult = hasMessageWithin(console, 'SECURITY_CAMERA_RECORDING_STREAM_RESULT')
    display.send(JSON.stringify({
        messageType: 'SECURITY_CAMERA_RECORDING_STREAM_RESULT',
        deviceType: 'CONSOLE_DEVICE',
        data: {
            deviceId: '123456789012',
            connectionId,
            requestId: 'stream-request-3',
            recordingId: 'recording-1731600000000.mp4',
            url: 'file:///private/recording.mp4',
        },
    }))
    assert.equal(await invalidStreamResult, false)

    const publicStreamResult = hasMessageWithin(console, 'SECURITY_CAMERA_RECORDING_STREAM_RESULT')
    display.send(JSON.stringify({
        messageType: 'SECURITY_CAMERA_RECORDING_STREAM_RESULT',
        deviceType: 'CONSOLE_DEVICE',
        data: {
            deviceId: '123456789012',
            connectionId,
            requestId: 'stream-request-4',
            recordingId: 'recording-1731600000000.mp4',
            url: 'http://example.com:54321/stream/0123456789abcdef0123456789abcdef0123456789abcdef/recording-1731600000000.mp4',
        },
    }))
    assert.equal(await publicStreamResult, false)

    const streamStopped = waitForMessage(console, 'SECURITY_CAMERA_LIVE_STOP')
    display.send(JSON.stringify({
        messageType: 'SECURITY_CAMERA_LIVE_STOP',
        deviceType: 'CONSOLE_DEVICE',
        data: { deviceId: '123456789012', connectionId, reason: 'recording' },
    }))
    assert.equal((await streamStopped).data.reason, 'recording')

    const oversizedSignal = hasMessageWithin(display, 'SECURITY_CAMERA_WEBRTC_SIGNAL')
    console.send(JSON.stringify({
        messageType: 'SECURITY_CAMERA_WEBRTC_SIGNAL',
        deviceType: 'DISPLAY_DEVICE',
        data: { deviceId: '123456789012', connectionId, signal: { type: 'offer', sdp: 'x'.repeat(32_001) } },
    }))
    assert.equal(await oversizedSignal, false)

    const recordingChunk = waitForMessage(console, 'SECURITY_CAMERA_RECORDING_CHUNK')
    display.send(JSON.stringify({
        messageType: 'SECURITY_CAMERA_RECORDING_CHUNK',
        deviceType: 'CONSOLE_DEVICE',
        data: { deviceId: '123456789012', connectionId, recordingId: 'recording-1.mp4', chunkIndex: 0, chunk: 'eA==' },
    }))
    assert.equal((await recordingChunk).data.chunk, 'eA==')

    const oversizedChunk = hasMessageWithin(console, 'SECURITY_CAMERA_RECORDING_CHUNK')
    display.send(JSON.stringify({
        messageType: 'SECURITY_CAMERA_RECORDING_CHUNK',
        deviceType: 'CONSOLE_DEVICE',
        data: { deviceId: '123456789012', connectionId, recordingId: 'recording-1.mp4', chunkIndex: 1, chunk: 'x'.repeat(64001) },
    }))
    assert.equal(await oversizedChunk, false)

    const spoofedCommand = hasMessageWithin(display, 'SECURITY_CAMERA_LIVE_STOP')
    console.send(JSON.stringify({
        messageType: 'SECURITY_CAMERA_LIVE_STOP',
        deviceType: 'DISPLAY_DEVICE',
        data: { deviceId: '987654321098', connectionId },
    }))
    assert.equal(await spoofedCommand, false)

    const replaced = once(display, 'close')
    const replacementDisplay = await connect('123456789012_DISPLAY_DEVICE')
    await replaced
    assert.equal(replacementDisplay.readyState, WebSocket.OPEN)
    display = replacementDisplay

    const missingDeviceConsole = await connect('987654321098_CONSOLE_DEVICE')
    const missingStatus = waitForMessage(missingDeviceConsole, 'PAIRING_STATUS')
    missingDeviceConsole.send(JSON.stringify({
        messageType: 'CONSOLE_DEVICE_PAIRING',
        deviceType: 'CONSOLE_DEVICE',
        data: {
            deviceId: '987654321098',
            connectionId: '4fd56e60-10c6-40ea-bc95-2f4d0c119592',
            username: 'unknown-user',
        },
    }))
    assert.equal((await missingStatus).status, 404)
    assert.equal(missingDeviceConsole.readyState, WebSocket.OPEN)

    const rejectedConsole = await connect('123456789012_CONSOLE_DEVICE')
    const rejectionRequest = waitForMessage(display, 'CONSOLE_DEVICE_PAIRING_REQUEST')
    const rejectionPendingStatus = waitForMessage(rejectedConsole, 'PAIRING_STATUS')
    rejectedConsole.send(JSON.stringify({
        messageType: 'CONSOLE_DEVICE_PAIRING',
        deviceType: 'CONSOLE_DEVICE',
        data: {
            deviceId: '123456789012',
            connectionId: '9e8d1205-1b0e-4666-831b-a4d88b7054dd',
            username: 'rejected-user',
        },
    }))
    assert.equal((await rejectionPendingStatus).status, 202)
    await rejectionRequest
    const rejectionStatus = waitForMessage(rejectedConsole, 'PAIRING_STATUS')
    display.send(JSON.stringify({
        messageType: 'PAIRING_DECISION',
        deviceType: 'DISPLAY_DEVICE',
        data: {
            deviceId: '123456789012',
            connectionId: '9e8d1205-1b0e-4666-831b-a4d88b7054dd',
            accepted: false,
        },
    }))
    assert.equal((await rejectionStatus).status, 403)

    const rejectedCommand = hasMessageWithin(display, 'UPDATE_DISPLAY_SETTINGS_PROCESSING')
    rejectedConsole.send(JSON.stringify({
        messageType: 'UPDATE_DISPLAY_SETTINGS_REQUEST',
        deviceType: 'DISPLAY_DEVICE',
        data: {
            deviceId: '123456789012',
            connectionId: '9e8d1205-1b0e-4666-831b-a4d88b7054dd',
            backgroundColor: '#abcdef',
        },
    }))
    assert.equal(await rejectedCommand, false)

    const secondConnectionId = '09737b9b-6289-42eb-86bc-c775bf64ca48'
    const secondConsole = await connect('123456789012_CONSOLE_DEVICE')
    const secondPairingRequest = waitForMessage(display, 'CONSOLE_DEVICE_PAIRING_REQUEST')
    const secondPendingStatus = waitForMessage(secondConsole, 'PAIRING_STATUS')
    secondConsole.send(JSON.stringify({
        messageType: 'CONSOLE_DEVICE_PAIRING',
        deviceType: 'CONSOLE_DEVICE',
        data: {
            deviceId: '123456789012',
            connectionId: secondConnectionId,
            username: 'second-user',
        },
    }))
    assert.equal((await secondPendingStatus).status, 202)
    await secondPairingRequest
    const secondPairingStatus = waitForMessage(secondConsole, 'PAIRING_STATUS')
    const twoConnectedDevices = waitForMessage(display, 'CONNECTED_DEVICES_STATUS')
    display.send(JSON.stringify({
        messageType: 'PAIRING_DECISION',
        deviceType: 'DISPLAY_DEVICE',
        data: { deviceId: '123456789012', connectionId: secondConnectionId, accepted: true },
    }))
    assert.equal((await secondPairingStatus).status, 200)
    assert.deepEqual((await twoConnectedDevices).data.devices, [
        { connectionId, username: 'test-user' },
        { connectionId: secondConnectionId, username: 'second-user' },
    ])

    const removed = once(console, 'close')
    const oneConnectedDevice = waitForMessage(display, 'CONNECTED_DEVICES_STATUS')
    display.send(JSON.stringify({
        messageType: 'REMOVE_CONNECTED_DEVICE',
        deviceType: 'DISPLAY_DEVICE',
        data: { deviceId: '123456789012', connectionId },
    }))
    assert.deepEqual((await oneConnectedDevice).data.devices, [
        { connectionId: secondConnectionId, username: 'second-user' },
    ])
    assert.equal((await removed)[0], 4001)

    const removeSecond = once(secondConsole, 'close')
    const emptyConnectedDevices = waitForMessage(display, 'CONNECTED_DEVICES_STATUS')
    display.send(JSON.stringify({
        messageType: 'REMOVE_CONNECTED_DEVICE',
        deviceType: 'DISPLAY_DEVICE',
        data: { deviceId: '123456789012', connectionId: secondConnectionId },
    }))
    assert.deepEqual((await emptyConnectedDevices).data.devices, [])
    assert.equal((await removeSecond)[0], 4001)
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
