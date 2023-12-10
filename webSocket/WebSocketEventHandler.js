const { NOT_FOUND, OK } = require("../constants/statusCodes")

const onConnection = (ws, wss) => {
    
    ws.on('error', console.error)

    ws.on('message', function message(data) {
        const messageObject = JSON.parse(data)
        wss.clients.forEach(client => {
            if (messageObject.deviceType === 'DISPLAY_DEVICE') {
                
                // Execute when a new display is added to ws server
                if (messageObject.messageType === 'NEW_DISPLAY_JOINING') {
                    console.log(`${messageObject.deviceType} ${messageObject.data.deviceId} joined`)
                }

                if (messageObject.messageType === 'UPDATE_DISPLAY_SETTINGS_REQUEST') {

                    if (client.protocol === `${messageObject.data.deviceId}_DISPLAY_DEVICE`) {
                        client.send(stringifyObject({data: messageObject.data, messageType: 'UPDATE_DISPLAY_SETTINGS_PROCESSING', deviceType: 'DISPLAY_DEVICE'}))
                    }

                }

            }

            if (messageObject.deviceType === 'CONSOLE_DEVICE') {

                // Execute when a console is pairing with display
                if (messageObject.messageType === 'CONSOLE_DEVICE_PAIRING') {
                    if (client.protocol === `${messageObject.data.deviceId}_DISPLAY_DEVICE`) {
                        ws.send(stringifyObject({messageType: 'PAIRING_STATUS', deviceType: 'CONSOLE_DEVICE', status: OK}))
                        client.send(stringifyObject({messageType: 'DISPLAY_DEVICE_STATUS', deviceType: 'DISPLAY_DEVICE', data: {...messageObject.data, isPaired: true}}))
                    }
                }

                if (messageObject.messageType === 'SENDING_DISPLAY_SETTINGS_TO_CONSOLE') {
                    if (client.protocol === `${messageObject.data.deviceId}_CONSOLE_DEVICE`) {
                        client.send(stringifyObject({data: messageObject.data, messageType: 'COLLECT_DISPLAY_DEVICE_SETTINGS', deviceType: 'CONSOLE_DEVICE'}))
                    }
                }
            }

        })

        if (messageObject.messageType === 'CONSOLE_DEVICE_PAIRING') {
            var protoCols = []
            wss.clients.forEach(c => c != ws && protoCols.push(c.protocol))
            if (protoCols.filter(each => `${messageObject.data.deviceId}_DISPLAY_DEVICE` === each).length === 0) {
                ws.send(stringifyObject({messageType: 'PAIRING_STATUS', deviceType: 'CONSOLE_DEVICE', status: NOT_FOUND}))
                wss.clients.delete(ws)
            }
            protoCols = []
        }
   
    })

    ws.on('close', function closed(code, reason) {
       
    })

}

const stringifyObject = (object) => {
    return JSON.stringify(object)
}

module.exports = {
    onConnection
}