const onConnection = (ws, wss) => {
    
    ws.on('error', console.error)
    
    ws.on('message', function message(data) {
        wss.clients.forEach(client => {
            const messageObject = JSON.parse(data)
            if (client !== ws && client.protocol === messageObject.userId) {
                client.send(data.toString())
            }
        })
    })

    ws.on('close', function closed(c, d) {
        console.log(c, d.toString())
    })

}

module.exports = {
    onConnection
}