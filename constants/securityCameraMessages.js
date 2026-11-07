const cameraMessagesFromConsole = new Set([
    'SECURITY_CAMERA_LIVE_START',
    'SECURITY_CAMERA_LIVE_STOP',
    'SECURITY_CAMERA_WEBRTC_SIGNAL',
    'SECURITY_CAMERA_LIST_REQUEST',
    'SECURITY_CAMERA_DELETE_REQUEST',
    'SECURITY_CAMERA_RECORDING_REQUEST',
])
const cameraMessagesFromDisplay = new Set([
    'SECURITY_CAMERA_LIVE_FRAME',
    'SECURITY_CAMERA_LIVE_STOP',
    'SECURITY_CAMERA_WEBRTC_SIGNAL',
    'SECURITY_CAMERA_RECORDINGS',
    'SECURITY_CAMERA_RECORDING_START',
    'SECURITY_CAMERA_RECORDING_CHUNK',
    'SECURITY_CAMERA_RECORDING_COMPLETE',
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
