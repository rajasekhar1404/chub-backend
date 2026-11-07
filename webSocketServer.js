const { WebSocket, WebSocketServer } = require('ws')
const { FORBIDDEN, NOT_FOUND, OK } = require('./constants/statusCodes')
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const {
    cameraMessagesFromConsole,
    cameraMessagesFromDisplay,
    isValidCameraMessage,
} = require('./constants/securityCameraMessages')

const send = (socket, payload) => {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload))
    }
}

const getConnectedDevices = (clients, connectionStates, deviceId) => [...clients]
    .map((client) => connectionStates.get(client))
    .filter((state) => state?.deviceType === 'CONSOLE_DEVICE' && state.deviceId === deviceId && state.accepted)
    .map(({ connectionId, username }) => ({ connectionId, username }))

const sendConnectedDevices = (clients, connectionStates, deviceId) => {
    const devices = getConnectedDevices(clients, connectionStates, deviceId)
    for (const client of clients) {
        const state = connectionStates.get(client)
        if (state?.deviceType === 'DISPLAY_DEVICE' && state.deviceId === deviceId) {
            send(client, {
                messageType: 'CONNECTED_DEVICES_STATUS',
                deviceType: 'DISPLAY_DEVICE',
                data: { deviceId, devices },
            })
        }
    }
}

const routeMessage = (socket, message, clients, connectionStates) => {
    if (message.messageType === 'keep_alive') return

    const sourceState = connectionStates.get(socket)
    if (!sourceState || !message.data || message.data.deviceId !== sourceState.deviceId) return

    if (
        sourceState.deviceType === 'CONSOLE_DEVICE' &&
        sourceState.accepted &&
        message.data.connectionId === sourceState.connectionId &&
        message.deviceType === 'DISPLAY_DEVICE' &&
        isValidCameraMessage(message, cameraMessagesFromConsole)
    ) {
        for (const client of clients) {
            const state = connectionStates.get(client)
            if (state?.deviceType === 'DISPLAY_DEVICE' && state.deviceId === sourceState.deviceId) {
                send(client, message)
            }
        }
        return
    }

    if (
        sourceState.deviceType === 'DISPLAY_DEVICE' &&
        message.deviceType === 'CONSOLE_DEVICE' &&
        isValidCameraMessage(message, cameraMessagesFromDisplay)
    ) {
        for (const client of clients) {
            const state = connectionStates.get(client)
            if (
                state?.deviceType === 'CONSOLE_DEVICE' &&
                state.deviceId === sourceState.deviceId &&
                state.accepted &&
                message.data.connectionId === state.connectionId
            ) {
                send(client, message)
            }
        }
        return
    }

    if (sourceState.deviceType === 'CONSOLE_DEVICE') {
        if (message.messageType === 'CONSOLE_DEVICE_PAIRING') {
            const { connectionId, username } = message.data
            if (
                typeof connectionId !== 'string' ||
                !UUID_PATTERN.test(connectionId) ||
                typeof username !== 'string' ||
                !username.trim() ||
                username.length > 100
            ) return

            const duplicateConnectionId = [...clients].some((client) => {
                const state = connectionStates.get(client)
                return client !== socket &&
                    state?.deviceId === sourceState.deviceId &&
                    state.connectionId === connectionId &&
                    (state.pending || state.accepted)
            })
            if (duplicateConnectionId) {
                send(socket, { messageType: 'PAIRING_STATUS', deviceType: 'CONSOLE_DEVICE', status: FORBIDDEN })
                return
            }

            const display = [...clients].find((client) => {
                const state = connectionStates.get(client)
                return state?.deviceType === 'DISPLAY_DEVICE' && state.deviceId === sourceState.deviceId
            })
            if (!display) {
                send(socket, { messageType: 'PAIRING_STATUS', deviceType: 'CONSOLE_DEVICE', status: NOT_FOUND })
                return
            }

            Object.assign(sourceState, { connectionId, username: username.trim(), pending: true, accepted: false })
            send(socket, { messageType: 'PAIRING_STATUS', deviceType: 'CONSOLE_DEVICE', status: 202 })
            send(display, {
                messageType: 'CONSOLE_DEVICE_PAIRING_REQUEST',
                deviceType: 'DISPLAY_DEVICE',
                data: { deviceId: sourceState.deviceId, connectionId, username: username.trim() },
            })
            return
        }

        if (!sourceState.accepted || message.data.connectionId !== sourceState.connectionId) return

        if (message.messageType === 'UPDATE_DISPLAY_SETTINGS_REQUEST' && message.deviceType === 'DISPLAY_DEVICE') {
            for (const client of clients) {
                const state = connectionStates.get(client)
                if (state?.deviceType === 'DISPLAY_DEVICE' && state.deviceId === sourceState.deviceId) {
                    send(client, {
                        data: message.data,
                        messageType: 'UPDATE_DISPLAY_SETTINGS_PROCESSING',
                        deviceType: 'DISPLAY_DEVICE',
                    })
                }
            }
        }
        return
    }

    if (message.deviceType === 'DISPLAY_DEVICE') {
        if (message.messageType === 'NEW_DISPLAY_JOINING') {
            console.log('Display joined', sourceState.deviceId)
            sendConnectedDevices(clients, connectionStates, sourceState.deviceId)
        }

        if (message.messageType === 'PAIRING_DECISION') {
            const { connectionId, accepted } = message.data
            const consoleSocket = [...clients].find((client) => {
                const state = connectionStates.get(client)
                return state?.deviceType === 'CONSOLE_DEVICE' &&
                    state.deviceId === sourceState.deviceId &&
                    state.connectionId === connectionId &&
                    state.pending
            })
            if (!consoleSocket || typeof accepted !== 'boolean') return

            const consoleState = connectionStates.get(consoleSocket)
            consoleState.pending = false
            consoleState.accepted = accepted
            if (accepted) {
                send(consoleSocket, { messageType: 'PAIRING_STATUS', deviceType: 'CONSOLE_DEVICE', status: OK })
                send(socket, {
                    messageType: 'DISPLAY_DEVICE_STATUS',
                    deviceType: 'DISPLAY_DEVICE',
                    data: { deviceId: sourceState.deviceId, connectionId, username: consoleState.username, isPaired: true },
                })
                sendConnectedDevices(clients, connectionStates, sourceState.deviceId)
            } else {
                send(consoleSocket, { messageType: 'PAIRING_STATUS', deviceType: 'CONSOLE_DEVICE', status: FORBIDDEN })
            }
        }

        if (message.messageType === 'REMOVE_CONNECTED_DEVICE' && typeof message.data.connectionId === 'string') {
            for (const client of clients) {
                const state = connectionStates.get(client)
                if (
                    state?.deviceType === 'CONSOLE_DEVICE' &&
                    state.deviceId === sourceState.deviceId &&
                    state.connectionId === message.data.connectionId &&
                    state.accepted
                ) {
                    state.accepted = false
                    client.close(4001, 'Removed by display')
                }
            }
            sendConnectedDevices(clients, connectionStates, sourceState.deviceId)
        }
    }

    if (message.messageType === 'SENDING_DISPLAY_SETTINGS_TO_CONSOLE' && message.deviceType === 'CONSOLE_DEVICE') {
        for (const client of clients) {
            const state = connectionStates.get(client)
            if (
                state?.deviceType === 'CONSOLE_DEVICE' &&
                state.deviceId === sourceState.deviceId &&
                state.accepted &&
                (!message.data.connectionId || message.data.connectionId === state.connectionId)
            ) {
                send(client, {
                    data: message.data,
                    messageType: 'COLLECT_DISPLAY_DEVICE_SETTINGS',
                    deviceType: 'CONSOLE_DEVICE',
                })
            }
        }
    }
}

const attachWebSocketServer = (server) => {
    const webSocketServer = new WebSocketServer({
        noServer: true,
        handleProtocols: (protocols) => protocols.values().next().value || false,
    })
    const connectionStates = new Map()

    server.on('upgrade', (request, socket, head) => {
        const pathname = new URL(request.url, 'http://localhost').pathname
        if (pathname !== '/ws') {
            socket.destroy()
            return
        }

        const protocol = request.headers['sec-websocket-protocol']
            ?.split(',')
            .map((value) => value.trim())
            .find(Boolean)
        if (!protocol || !/(.+)_(CONSOLE_DEVICE|DISPLAY_DEVICE)$/.test(protocol)) {
            socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n')
            socket.destroy()
            return
        }

        webSocketServer.handleUpgrade(request, socket, head, (client) => {
            const protocolMatch = client.protocol.match(/^(.+)_(CONSOLE_DEVICE|DISPLAY_DEVICE)$/)
            const deviceType = protocolMatch?.[2]
            const deviceId = protocolMatch?.[1]
            if (!deviceType || !deviceId) {
                client.close(1008, 'Invalid device protocol')
                return
            }

            if (deviceType === 'DISPLAY_DEVICE') {
                for (const existingClient of webSocketServer.clients) {
                    const state = connectionStates.get(existingClient)
                    if (existingClient !== client && state?.deviceType === deviceType && state.deviceId === deviceId) {
                        connectionStates.delete(existingClient)
                        existingClient.close(1000, 'Replaced by a newer connection')
                    }
                }
            }

            connectionStates.set(client, {
                deviceId,
                deviceType,
                connectionId: null,
                username: null,
                accepted: deviceType === 'DISPLAY_DEVICE',
                pending: false,
            })

            client.on('close', () => {
                const state = connectionStates.get(client)
                connectionStates.delete(client)
                if (state?.deviceType === 'CONSOLE_DEVICE' && state.accepted) {
                    sendConnectedDevices(webSocketServer.clients, connectionStates, state.deviceId)
                }
            })
            client.on('message', (data) => {
                let message
                try {
                    message = JSON.parse(data.toString())
                } catch {
                    client.close(1007, 'Message must be valid JSON')
                    return
                }

                routeMessage(client, message, webSocketServer.clients, connectionStates)
            })
            client.on('error', (error) => console.error('WebSocket connection error', error))
        })
    })

    return webSocketServer
}

module.exports = { attachWebSocketServer }
