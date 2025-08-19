const express = require('express')
const app = express()
const port = 5568

const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
var QRCode = require('qrcode');
var uniqid = require('uniqid');
var queue = require('./queue');

app.use(express.json());
const clients = {}
const DEFAULT_CLIENT = 1
var isActive = false

class WaServer {
  constructor() {
    this.state = "disconnected"
    this.client = null
  }
  connect(uid) {
    return new Promise((res, rej) => {

      if (!Boolean(uid)) {
        uid = uniqid()
      }

      // Tambahkan timeout untuk mencegah hanging
      const timeout = setTimeout(() => {
        this.state = 'timeout'
        rej(new Error('Connection timeout after 60 seconds'))
      }, 60000)

      const client = new Client({
        puppeteer: {
          headless: false,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        },
        authStrategy: new LocalAuth()
      });

      client.initialize();

      client.on('qr', (qr) => {
        QRCode.toDataURL(qr, (err, url) => {
          if (err) {
            clearTimeout(timeout)
            rej(err)
            return
          }
          /**
           * Send to API laravel notif QR
           * @param uid
           * @param url
           * /laravel/notifscan/:url/uid
           */
          this.state = "scan-qr"
          clearTimeout(timeout)
          res(true);
          console.log('scan generated ' + uid)
        })
      });

      client.on('authenticated', (session) => {
        console.log('authenticated')
        this.state = "authenticated"
        isActive = true
        // Jangan resolve di sini, tunggu event 'ready'
      });

      client.on('auth_failure', msg => {
        this.state = 'auth_failure'
        clearTimeout(timeout)
        rej(new Error('Authentication failed: ' + msg));
        console.error('AUTHENTICATION FAILURE', msg);
      });

      client.on('ready', () => {
        this.state = 'ready'
        clearTimeout(timeout)
        res(true);
        console.log('READY');
      });

      client.on('message', async msg => {
        this.onReceiveMessage(msg)
        console.log('MESSAGE RECEIVED', msg);
      });

      client.on('message_create', (msg) => {

      })

      client.on('change_battery', (batteryInfo) => {
        const { battery, plugged } = batteryInfo;
        console.log(`Battery: ${battery}% - Charging? ${plugged}`);
      });

      client.on('disconnected', (reason) => {
        this.state = 'disconnected'
        clearTimeout(timeout)
        rej(new Error('Client disconnected: ' + reason));
        console.log('Client was logged out', reason);
      });

      // Tambahkan error handler untuk client
      client.on('error', (error) => {
        this.state = 'error'
        clearTimeout(timeout)
        rej(error);
        console.error('Client error:', error);
      });

      this.client = client

    })
  }

  async onReceiveMessage(msg) {
    try {



    } catch (error) {
      console.log(error)
    }
  }

  async sendBulk(datas) {
    try {
      for (const data of datas) {
        var phone = data.phone
        phone = phone.replace(/\s/g, "")
        phone = phone.replace('%20', '')
        phone = phone.replace(' ', '')
        console.log("hihi", data.text)
        const res = await this.client.sendMessage(phone + '@c.us', data.text.replace(/%0a/g, '\n'));
        console.log({ res })
      }
      return "success"
    } catch (error) {
      console.log({ error })
      return error
    }
  }

  getState() {
    return this.state
  }
}


app.get('/connect/:id', async (req, res) => {
  const id = req.params.id
  try {
    // Cek apakah client sudah ada
    if (clients[id]) {
      const state = clients[id].getState()
      if (state === 'ready' || state === 'authenticated') {
        return res.json({
          code: 200,
          data: {
            status: state,
            message: 'Client already connected'
          },
          message: "Client already exists and connected",
        })
      }
    }

    var client = new WaServer()
    await client.connect(id)
    clients[id] = client

    res.json({
      code: 200,
      data: {
        status: client.state,
        message: client.state === 'scan-qr' ? 'QR Code generated, please scan' : 'Connected successfully'
      },
      message: "Connection successful",
    })
  } catch (error) {
    console.error('Connection error:', error)
    res.json({
      code: 500,
      data: {
        status: 'error',
        error: error.message
      },
      message: "Connection failed: " + error.message,
    })
  }
})

app.get('/status/:id', async (req, res) => {
  const id = req.params.id
  const data = await clients[id].getState()
  res.json({
    code: 200,
    data
  })
})

app.get('/debug', async (req, res) => {
  const debugInfo = {
    total_clients: Object.keys(clients).length,
    clients: {},
    isActive: isActive,
    timestamp: new Date().toISOString()
  }

  for (const [id, client] of Object.entries(clients)) {
    debugInfo.clients[id] = {
      state: client.getState(),
      hasClient: !!client.client,
      clientReady: client.client ? 'yes' : 'no'
    }
  }

  res.json({
    code: 200,
    data: debugInfo
  })
})


app.get('/', async (req, res) => {
  res.send('ok')
})

app.get('/active', async (req, res) => {
  isActive = true
  console.log(isActive)
  res.send('ok')
})

app.post('/sendbulk', async (req, res) => {
  var input = req.body
  var id = input.id
  var data = input.data
  const response = await clients[id].sendBulk(data)
  res.json({
    code: 200,
    data: response
  })
})

app.get('/send', async (req, res) => {
  if (isActive == false) {
    res.json({
      code: 200,
      data: "not active"
    })
    return
  }

  var input = req.query
  var id = DEFAULT_CLIENT // exclusif for portal 

  // cek no hp valid
  if (input.phone.length < 6) {
    res.json({
      code: 400,
      data: "Phone invalid"
    })
    return
  }

  var data = [{
    phone: input.phone,
    text: input.text
  }]

  // Add random delay
  queue.appendCommand(() => clients[1].sendBulk(data))

  //const response = await clients[1].sendBulk(data)
  res.json({
    code: 200,
    data: 'success'
  })
})

app.get('/info', async (req, res) => {
  res.json({
    code: 200,
    data: {
      clients: Object.keys(clients),
      default_client: DEFAULT_CLIENT
    }
  })
})

app.get('/reset', async (req, res) => {
  try {
    await fs.unlinkSync('./sessions/1.json')
  } catch (err) {
    res.json({
      code: 200,
      message: err,
    })
  }

  isActive = false
  var client = new WaServer()
  await client.connect(1)
  clients[1] = client

  res.json({
    code: 200,
    message: "ok"
  })
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})