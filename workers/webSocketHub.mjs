import { DurableObject } from 'cloudflare:workers'
import { createServer } from 'node:http'
import { httpServerHandler } from 'cloudflare:node'
import statusCodes from '../constants/statusCodes.js'
import securityCameraMessages from '../constants/securityCameraMessages.js'
import app from '../server.js'
import dbConnection from '../config/dbConfig.js'
import otpDao from '../dao/otpDao.js'

const { FORBIDDEN, NOT_FOUND, OK } = statusCodes
const { cameraMessagesFromConsole, cameraMessagesFromDisplay, isValidCameraMessage } = securityCameraMessages
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const getConnectedDevices = (sockets, deviceId) => sockets
    .map((socket) => socket.deserializeAttachment())
    .filter((state) => state?.deviceType === 'CONSOLE_DEVICE' && state.deviceId === deviceId && state.accepted)
    .map(({ connectionId, username }) => ({ connectionId, username }))

export class WebSocketHub extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env)
        this.httpHandler = httpServerHandler(createServer(app))
    }

    async fetch(request) {
        if (new URL(request.url).pathname !== '/ws') {
            return this.httpHandler.fetch(request, this.env, this.ctx)
        }
        if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
            return new Response('Expected a WebSocket upgrade', { status: 426 })
        }

        const protocols = (request.headers.get('Sec-WebSocket-Protocol') || '')
            .split(',')
            .map((protocol) => protocol.trim())
            .filter(Boolean)
        const protocol = protocols[0]
        const protocolMatch = protocol?.match(/^(.+)_(CONSOLE_DEVICE|DISPLAY_DEVICE)$/)
        if (!protocolMatch) return new Response('Invalid device protocol', { status: 400 })

        const [, deviceId, deviceType] = protocolMatch
        const pair = new WebSocketPair()
        const [client, server] = Object.values(pair)

        if (deviceType === 'DISPLAY_DEVICE') {
            for (const existingSocket of this.ctx.getWebSockets()) {
                const state = existingSocket.deserializeAttachment()
                if (state?.deviceType === deviceType && state.deviceId === deviceId) {
                    existingSocket.close(1000, 'Replaced by a newer connection')
                }
            }
        }

        server.serializeAttachment({
            protocol,
            deviceId,
            deviceType,
            connectionId: null,
            username: null,
            accepted: deviceType === 'DISPLAY_DEVICE',
            pending: false,
        })
        this.ctx.acceptWebSocket(server)
        return new Response(null, {
            status: 101,
            webSocket: client,
            headers: { 'Sec-WebSocket-Protocol': protocol },
        })
    }

    async scheduledCleanup(scheduledTime) {
        await dbConnection()
        await otpDao.deleteExpiredOtps()
        console.log('Expired OTP cleanup completed', scheduledTime)
    }

    async webSocketMessage(socket, data) {
        let message
        try {
            message = JSON.parse(typeof data === 'string' ? data : new TextDecoder().decode(data))
        } catch {
            socket.close(1007, 'Message must be valid JSON')
            return
        }

        const sockets = this.ctx.getWebSockets()
        const send = (target, payload) => {
            if (target.readyState === WebSocket.OPEN) target.send(JSON.stringify(payload))
        }

        if (message.messageType === 'keep_alive') return
        const sourceState = socket.deserializeAttachment()
        if (!sourceState || !message.data || message.data.deviceId !== sourceState.deviceId) return

        if (
            sourceState.deviceType === 'CONSOLE_DEVICE' &&
            sourceState.accepted &&
            message.data.connectionId === sourceState.connectionId &&
            message.deviceType === 'DISPLAY_DEVICE' &&
            isValidCameraMessage(message, cameraMessagesFromConsole)
        ) {
            for (const client of sockets) {
                const state = client.deserializeAttachment()
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
            for (const client of sockets) {
                const state = client.deserializeAttachment()
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

                const duplicateConnectionId = sockets.some((client) => {
                    const state = client.deserializeAttachment()
                    return client !== socket &&
                        state?.deviceId === sourceState.deviceId &&
                        state.connectionId === connectionId &&
                        (state.pending || state.accepted)
                })
                if (duplicateConnectionId) {
                    send(socket, { messageType: 'PAIRING_STATUS', deviceType: 'CONSOLE_DEVICE', status: FORBIDDEN })
                    return
                }

                const display = sockets.find((client) => {
                    const state = client.deserializeAttachment()
                    return state?.deviceType === 'DISPLAY_DEVICE' && state.deviceId === sourceState.deviceId
                })
                if (!display) {
                    send(socket, { messageType: 'PAIRING_STATUS', deviceType: 'CONSOLE_DEVICE', status: NOT_FOUND })
                    return
                }

                socket.serializeAttachment({
                    ...sourceState,
                    connectionId,
                    username: username.trim(),
                    pending: true,
                    accepted: false,
                })
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
                for (const client of sockets) {
                    const state = client.deserializeAttachment()
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
                send(socket, {
                    messageType: 'CONNECTED_DEVICES_STATUS',
                    deviceType: 'DISPLAY_DEVICE',
                    data: { deviceId: sourceState.deviceId, devices: getConnectedDevices(sockets, sourceState.deviceId) },
                })
            }

            if (message.messageType === 'PAIRING_DECISION') {
                const { connectionId, accepted } = message.data
                const consoleSocket = sockets.find((client) => {
                    const state = client.deserializeAttachment()
                    return state?.deviceType === 'CONSOLE_DEVICE' &&
                        state.deviceId === sourceState.deviceId &&
                        state.connectionId === connectionId &&
                        state.pending
                })
                if (!consoleSocket || typeof accepted !== 'boolean') return

                const consoleState = consoleSocket.deserializeAttachment()
                consoleSocket.serializeAttachment({ ...consoleState, pending: false, accepted })
                if (accepted) {
                    send(consoleSocket, { messageType: 'PAIRING_STATUS', deviceType: 'CONSOLE_DEVICE', status: OK })
                    send(socket, {
                        messageType: 'DISPLAY_DEVICE_STATUS',
                        deviceType: 'DISPLAY_DEVICE',
                        data: { deviceId: sourceState.deviceId, connectionId, username: consoleState.username, isPaired: true },
                    })
                    send(socket, {
                        messageType: 'CONNECTED_DEVICES_STATUS',
                        deviceType: 'DISPLAY_DEVICE',
                        data: { deviceId: sourceState.deviceId, devices: getConnectedDevices(sockets, sourceState.deviceId) },
                    })
                } else {
                    send(consoleSocket, { messageType: 'PAIRING_STATUS', deviceType: 'CONSOLE_DEVICE', status: FORBIDDEN })
                }
            }

            if (message.messageType === 'REMOVE_CONNECTED_DEVICE' && typeof message.data.connectionId === 'string') {
                for (const client of sockets) {
                    const state = client.deserializeAttachment()
                    if (
                        state?.deviceType === 'CONSOLE_DEVICE' &&
                        state.deviceId === sourceState.deviceId &&
                        state.connectionId === message.data.connectionId &&
                        state.accepted
                    ) {
                        client.serializeAttachment({ ...state, accepted: false })
                        client.close(4001, 'Removed by display')
                    }
                }
                send(socket, {
                    messageType: 'CONNECTED_DEVICES_STATUS',
                    deviceType: 'DISPLAY_DEVICE',
                    data: { deviceId: sourceState.deviceId, devices: getConnectedDevices(sockets, sourceState.deviceId) },
                })
            }
        }

        if (message.messageType === 'SENDING_DISPLAY_SETTINGS_TO_CONSOLE' && message.deviceType === 'CONSOLE_DEVICE') {
            for (const client of sockets) {
                const state = client.deserializeAttachment()
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

    async webSocketClose(socket) {
        const state = socket.deserializeAttachment()
        if (!state || state.deviceType !== 'CONSOLE_DEVICE' || !state.accepted) return

        const sockets = this.ctx.getWebSockets()
        const display = sockets.find((client) => {
            const clientState = client.deserializeAttachment()
            return clientState?.deviceType === 'DISPLAY_DEVICE' && clientState.deviceId === state.deviceId
        })
        if (display) {
            const send = (target, payload) => {
                if (target.readyState === WebSocket.OPEN) target.send(JSON.stringify(payload))
            }
            send(display, {
                messageType: 'CONNECTED_DEVICES_STATUS',
                deviceType: 'DISPLAY_DEVICE',
                data: {
                    deviceId: state.deviceId,
                    devices: getConnectedDevices(sockets.filter((client) => client !== socket), state.deviceId),
                },
            })
        }
    }
}
