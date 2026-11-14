const cameraMessagesFromConsole = new Set([
    'SECURITY_CAMERA_LIVE_START',
    'SECURITY_CAMERA_LIVE_STOP',
    'SECURITY_CAMERA_WEBRTC_SIGNAL',
    'SECURITY_CAMERA_LIST_REQUEST',
    'SECURITY_CAMERA_DELETE_REQUEST',
    'SECURITY_CAMERA_RECORDING_REQUEST',
    'SECURITY_CAMERA_RECORDING_STREAM_REQUEST',
    'SECURITY_CAMERA_LIVE_RECORDING',
])
const cameraMessagesFromDisplay = new Set([
    'SECURITY_CAMERA_LIVE_FRAME',
    'SECURITY_CAMERA_LIVE_STOP',
    'SECURITY_CAMERA_WEBRTC_SIGNAL',
    'SECURITY_CAMERA_RECORDINGS',
    'SECURITY_CAMERA_RECORDING_START',
    'SECURITY_CAMERA_RECORDING_CHUNK',
    'SECURITY_CAMERA_RECORDING_COMPLETE',
    'SECURITY_CAMERA_RECORDING_STREAM_RESULT',
    'SECURITY_CAMERA_LIVE_RECORDING_STATE',
    'SECURITY_CAMERA_ERROR',
])

const isValidCameraMessage = (message, allowedTypes) => {
    const data = message.data
    if (
        !allowedTypes.has(message.messageType) ||
        !data ||
        typeof data !== 'object' ||
        Array.isArray(data) ||
        typeof data.deviceId !== 'string'
    ) return false

    if (message.messageType === 'SECURITY_CAMERA_LIVE_FRAME') {
        return typeof data.base64 === 'string' && data.base64.length <= 1_000_000
    }
    if (message.messageType === 'SECURITY_CAMERA_RECORDING_CHUNK') {
        return typeof data.chunk === 'string' && data.chunk.length <= 64_000
    }
    if (message.messageType === 'SECURITY_CAMERA_RECORDINGS') {
        return Array.isArray(data.recordings) && data.recordings.length <= 500
    }
    if (message.messageType === 'SECURITY_CAMERA_RECORDING_STREAM_REQUEST') {
        return (
            typeof data.requestId === 'string' &&
            /^[A-Za-z0-9_-]{1,100}$/.test(data.requestId) &&
            typeof data.recordingId === 'string' &&
            /^recording-\d+\.(mp4|mov)$/.test(data.recordingId)
        )
    }
    if (message.messageType === 'SECURITY_CAMERA_RECORDING_STREAM_RESULT') {
        if (
            typeof data.requestId !== 'string' ||
            !/^[A-Za-z0-9_-]{1,100}$/.test(data.requestId) ||
            typeof data.recordingId !== 'string' ||
            !/^recording-\d+\.(mp4|mov)$/.test(data.recordingId)
        ) return false
        if (typeof data.error === 'string') return data.error.length <= 500 && data.url == null
        if (typeof data.url !== 'string' || data.url.length > 2048) return false
        try {
            const url = new URL(data.url)
            const ip = url.hostname.split('.').map(Number)
            const privateAddress = ip.length === 4 &&
                ip.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) &&
                (
                    ip[0] === 10 ||
                    (ip[0] === 172 && ip[1] >= 16 && ip[1] <= 31) ||
                    (ip[0] === 192 && ip[1] === 168)
                )
            return url.protocol === 'http:' &&
                privateAddress &&
                !url.username &&
                !url.password &&
                !url.search &&
                !url.hash &&
                /^\/stream\/[A-Za-z0-9_-]{32,64}\/recording-\d+\.(mp4|mov)$/.test(url.pathname)
        } catch {
            return false
        }
    }
    if (message.messageType === 'SECURITY_CAMERA_LIVE_RECORDING') {
        return (
            typeof data.sessionId === 'string' &&
            data.sessionId.length <= 100 &&
            (data.action === 'stop' ||
                (data.action === 'start' &&
                    Number.isInteger(data.durationMinutes) &&
                    data.durationMinutes >= 1 &&
                    data.durationMinutes <= 60))
        )
    }
    if (message.messageType === 'SECURITY_CAMERA_LIVE_RECORDING_STATE') {
        return (
            typeof data.sessionId === 'string' &&
            data.sessionId.length <= 100 &&
            ['recording', 'saved', 'error'].includes(data.state) &&
            (data.error == null || (typeof data.error === 'string' && data.error.length <= 500))
        )
    }
    if (message.messageType === 'SECURITY_CAMERA_WEBRTC_SIGNAL') {
        const signal = data.signal
        if (!signal || typeof signal !== 'object' || Array.isArray(signal)) return false
        if (JSON.stringify(signal).length > 32_768) return false
        if (signal.type === 'offer' || signal.type === 'answer') {
            return typeof signal.sdp === 'string' && signal.sdp.length <= 32_000
        }
        if (signal.type === 'candidate') {
            const candidate = signal.candidate
            return candidate &&
                typeof candidate === 'object' &&
                !Array.isArray(candidate) &&
                typeof candidate.candidate === 'string' &&
                candidate.candidate.length <= 4096 &&
                (candidate.sdpMid == null || (typeof candidate.sdpMid === 'string' && candidate.sdpMid.length <= 256)) &&
                (candidate.sdpMLineIndex == null || (Number.isInteger(candidate.sdpMLineIndex) && candidate.sdpMLineIndex >= 0))
        }
        return false
    }
    return true
}

module.exports = {
    cameraMessagesFromConsole,
    cameraMessagesFromDisplay,
    isValidCameraMessage,
}
