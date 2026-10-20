import { DurableObject } from 'cloudflare:workers'
import { createServer } from 'node:http'
import { httpServerHandler } from 'cloudflare:node'
import statusCodes from '../constants/statusCodes.js'
import app from '../server.js'
import dbConnection from '../config/dbConfig.js'
import otpDao from '../dao/otpDao.js'

const { NOT_FOUND, OK } = statusCodes

export class WebSocketHub extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env)
        // Keep the Express server and its MongoDB connection inside one
        // Durable Object so requests use a persistent Node-compatible runtime.
        this.httpHandler = httpServerHandler(createServer(app))
    }

    async fetch(request) {
        if (new URL(request.url).pathname !== '/ws') {
            return this.httpHandler.fetch(request, this.env, this.ctx)
        }
        if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
            return new Response('Expected a WebSocket upgrade', { status: 426 })
        }

        const pair = new WebSocketPair()
        const [client, server] = Object.values(pair)
        const protocols = (request.headers.get('Sec-WebSocket-Protocol') || '')
            .split(',')
            .map((protocol) => protocol.trim())
            .filter(Boolean)
        const protocol = protocols[0]

        if (protocol) {
            for (const existingSocket of this.ctx.getWebSockets()) {
                if (existingSocket.deserializeAttachment()?.protocol === protocol) {
                    existingSocket.close(1000, 'Replaced by a newer connection')
                }
            }
            server.serializeAttachment({ protocol })
        }
        this.ctx.acceptWebSocket(server)

        const headers = protocol ? { 'Sec-WebSocket-Protocol': protocol } : undefined
        return new Response(null, { status: 101, webSocket: client, headers })
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

        for (const client of sockets) {
            const clientProtocol = client.deserializeAttachment()?.protocol

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
            const hasDisplay = sockets.some((client) =>
                client !== socket &&
                client.readyState === WebSocket.OPEN &&
                client.deserializeAttachment()?.protocol === displayProtocol,
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
}
