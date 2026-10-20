const { WebSocket, WebSocketServer } = require('ws')
const { NOT_FOUND, OK } = require('./constants/statusCodes')

const send = (socket, payload) => {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload))
    }
}

const routeMessage = (socket, message, clients) => {
    if (message.messageType === 'keep_alive') return

    for (const client of clients) {
        if (client.readyState !== WebSocket.OPEN) continue

        const clientProtocol = client.protocol

        if (message.deviceType === 'DISPLAY_DEVICE') {
            if (message.messageType === 'NEW_DISPLAY_JOINING') {
                console.log('Display joined', message.data?.deviceId)
            }
            if (
                message.messageType === 'UPDATE_DISPLAY_SETTINGS_REQUEST' &&
                clientProtocol === `${message.data?.deviceId}_DISPLAY_DEVICE`
            ) {
                send(client, {
                    data: message.data,
                    messageType: 'UPDATE_DISPLAY_SETTINGS_PROCESSING',
                    deviceType: 'DISPLAY_DEVICE',
                })
            }
        }

        if (message.deviceType === 'CONSOLE_DEVICE') {
            if (
                message.messageType === 'CONSOLE_DEVICE_PAIRING' &&
                clientProtocol === `${message.data?.deviceId}_DISPLAY_DEVICE`
            ) {
                send(socket, { messageType: 'PAIRING_STATUS', deviceType: 'CONSOLE_DEVICE', status: OK })
                send(client, {
                    messageType: 'DISPLAY_DEVICE_STATUS',
                    deviceType: 'DISPLAY_DEVICE',
                    data: { ...message.data, isPaired: true },
                })
            }
            if (
                message.messageType === 'SENDING_DISPLAY_SETTINGS_TO_CONSOLE' &&
                clientProtocol === `${message.data?.deviceId}_CONSOLE_DEVICE`
            ) {
                send(client, {
                    data: message.data,
                    messageType: 'COLLECT_DISPLAY_DEVICE_SETTINGS',
                    deviceType: 'CONSOLE_DEVICE',
                })
            }
        }
    }

    if (message.messageType === 'CONSOLE_DEVICE_PAIRING') {
        const displayProtocol = `${message.data?.deviceId}_DISPLAY_DEVICE`
        const hasDisplay = [...clients].some((client) =>
            client !== socket &&
            client.readyState === WebSocket.OPEN &&
            client.protocol === displayProtocol,
        )
        if (!hasDisplay) {
            send(socket, {
                messageType: 'PAIRING_STATUS',
                deviceType: 'CONSOLE_DEVICE',
                status: NOT_FOUND,
            })
        }
    }
}

const attachWebSocketServer = (server) => {
    const webSocketServer = new WebSocketServer({
        noServer: true,
        handleProtocols: (protocols) => protocols.values().next().value || false,
    })

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
            for (const existingClient of webSocketServer.clients) {
                if (existingClient !== client && existingClient.protocol === client.protocol) {
                    existingClient.close(1000, 'Replaced by a newer connection')
                }
            }

            client.on('message', (data) => {
                let message
                try {
                    message = JSON.parse(data.toString())
                } catch {
                    client.close(1007, 'Message must be valid JSON')
                    return
                }

                routeMessage(client, message, webSocketServer.clients)
            })
            client.on('error', (error) => console.error('WebSocket connection error', error))
        })
    })

    return webSocketServer
}

module.exports = { attachWebSocketServer }
