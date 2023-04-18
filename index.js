const tls = require('tls')
const RSA = require('node-rsa')
require('dotenv').config()

let userPrivateKey
let socketIOClient

const io = require('socket.io')({
  cors: {
    origin: "*"
  },
  pingTimeout: 7000,
  pingInterval: 3000
})

io.on('connection', client => {
  socketIOClient = client

  client.on('message', data => {
    let message = ''

    if (data.code === '10') {
      userPrivateKey = data.privateKey
    }

    if (data.code === '13') {
      const requestStr = JSON.stringify({
        code: data.code,
        message: jsonToBase64(data.message)
      })

      // const requestBuf = Buffer.from(requestStr)
      return socket.write(requestStr)
    }

    if (data.code === '14') {
      const requestStr = JSON.stringify({
        code: data.code,
        message: Buffer.from(data.message).toString("base64")
      })

      // const requestBuf = Buffer.from(requestStr)
      return socket.write(requestStr)
    }

    return socket.write(JSON.stringify({ code: data.code, message }))
  })

  client.on('disconnect', () => { console.log('Disconnected') })
})

io.listen(process.env.SOCKET_PORT)

const options = {
  host: process.env.API_HOST,
  port: process.env.API_PORT,
  rejectUnauthorized: false,
}

const socket = tls.connect(options, () => {
  console.log('Client connected.', socket.authorized ? 'Authorized' : 'Unauthorized')

  process.stdin.pipe(socket, (err) => {
    err && console.error(err)
  })

  process.stdin.resume()
})

socket.on('end', () => {
  console.log('Ended')
})

socket.on('data', (data) => {
  const answer = JSON.parse(data)

  if (answer.code == 10) {
    const walletPrivateKey = Buffer.from(userPrivateKey)
    const byteRSApublicKey = Buffer.from(answer.message, 'base64')
    const keyRSA = new RSA(byteRSApublicKey, "pkcs1-public-der")
    const encrypted = keyRSA.encrypt(walletPrivateKey)

    const requestStr = JSON.stringify({
      code: 12,
      message: encrypted.toString('base64')
    })

    // const requestBuf = Buffer.from(requestStr)
    return socket.write(requestStr)
  }

  if (['1', '3', '12', '13', '14'].includes(answer.code)) {
    const message = base64ToString(answer.message)
    // console.log(message)
    return socketIOClient.emit("message", { code: answer.code, message })
  }
})


// --------------------------------------------

function jsonToBase64(object) {
  const json = JSON.stringify(object)
  return Buffer.from(json).toString("base64")
}

function base64ToJson(base64String) {
  const json = Buffer.from(base64String, "base64").toString()
  return JSON.parse(json)
}

function base64ToString(base64String, encoding = "utf8") {
  return Buffer.from(base64String, "base64").toString(encoding)
}