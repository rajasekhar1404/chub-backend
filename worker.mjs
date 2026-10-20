import { WebSocketHub } from './workers/webSocketHub.mjs'

export { WebSocketHub }

export default {
    fetch(request, env, ctx) {
        const id = env.WEBSOCKET_HUB.idFromName('centralhub-global')
        return env.WEBSOCKET_HUB.get(id).fetch(request)
    },

    scheduled(controller, env) {
        const id = env.WEBSOCKET_HUB.idFromName('centralhub-global')
        return env.WEBSOCKET_HUB.get(id).scheduledCleanup(controller.scheduledTime)
    },
}
