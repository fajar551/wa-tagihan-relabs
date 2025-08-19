const express = require('express')
const app = express()
const port = 5568

const fs = require('fs');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const uniqid = require('uniqid');
const queue = require('./queue');
const pino = require('pino');

app.use(express.json());

// Tambahkan CORS support
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve static files
app.use(express.static('.'));

const clients = {}
const DEFAULT_CLIENT = 1
var isActive = false

// Fungsi untuk mendapatkan IP publik
function getPublicIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return 'localhost';
}

class WaServer {
  constructor() {
    this.state = "disconnected"
    this.client = null
    this.qrCode = null
    this.authState = null
  }

  async connect(uid) {
    return new Promise(async (res, rej) => {
      try {
        if (!Boolean(uid)) {
          uid = uniqid()
        }

        console.log('Connecting Baileys client:', uid);

        // Setup auth state
        const authDir = `./sessions/${uid}`;
        if (!fs.existsSync(authDir)) {
          fs.mkdirSync(authDir, { recursive: true });
        }

        this.authState = await useMultiFileAuthState(authDir);

        // Create client
        this.client = makeWASocket({
          auth: this.authState.state,
          printQRInTerminal: true,
          logger: pino({ level: 'silent' })
        });

        // Handle connection updates
        this.client.ev.on('connection.update', async (update) => {
          const { connection, lastDisconnect, qr } = update;

          if (qr) {
            console.log('QR Code received for client:', uid);
            this.qrCode = qr;
            this.state = "scan-qr";

            // Generate QR code image
            try {
              const qrImage = await QRCode.toDataURL(qr);
              console.log('QR Code generated for client:', uid, 'State:', this.state);
              res(true);
            } catch (err) {
              console.error('Error generating QR:', err);
              rej(err);
            }
          }

          if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);

            if (shouldReconnect) {
              this.connect(uid);
            } else {
              this.state = 'disconnected';
            }
          } else if (connection === 'open') {
            console.log('WhatsApp connected for client:', uid);
            this.state = 'ready';
            isActive = true;
            res(true);
          }
        });

        // Handle messages
        this.client.ev.on('messages.upsert', async (m) => {
          const msg = m.messages[0];
          if (!msg.key.fromMe && m.type === 'notify') {
            console.log('Message received:', msg);
            this.onReceiveMessage(msg);
          }
        });

      } catch (error) {
        console.error('Error connecting client:', error);
        this.state = 'error';
        rej(error);
      }
    });
  }

  async onReceiveMessage(msg) {
    try {
      console.log('Message received:', msg);
    } catch (error) {
      console.log(error);
    }
  }

  async sendBulk(datas) {
    try {
      if (!this.client) {
        console.log('Client not available for sending message');
        return "Client not available";
      }

      if (this.state !== 'ready') {
        console.log('Client not ready, current state:', this.state);
        return "Client not ready, current state: " + this.state;
      }

      for (const data of datas) {
        var phone = data.phone;
        phone = phone.replace(/\s/g, "");
        phone = phone.replace('%20', '');
        phone = phone.replace(' ', '');

        if (!phone.endsWith('@s.whatsapp.net')) {
          phone = phone + '@s.whatsapp.net';
        }

        console.log("Sending message to:", phone, "Text:", data.text);

        try {
          // Tambahkan delay untuk menghindari rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

          const res = await this.client.sendMessage(phone, { text: data.text.replace(/%0a/g, '\n') });
          console.log('Message sent successfully:', { res });
        } catch (sendError) {
          console.log('Error sending message to', phone, ':', sendError.message);
          return `Failed to send to ${phone}: ${sendError.message}`;
        }
      }
      return "success";
    } catch (error) {
      console.log('SendBulk error:', error);
      return `Error: ${error.message}`;
    }
  }

  getState() {
    return this.state;
  }
}

// Endpoints
app.get('/test', async (req, res) => {
  res.json({
    code: 200,
    message: "Server is running!",
    timestamp: new Date().toISOString(),
    ip: getPublicIP()
  });
});

app.get('/server-info', async (req, res) => {
  try {
    const publicIP = getPublicIP();
    res.json({
      code: 200,
      data: {
        serverIP: publicIP,
        port: port,
        baseURL: `http://${publicIP}:${port}`,
        endpoints: {
          connect: `http://${publicIP}:${port}/connect/1`,
          qrImage: `http://${publicIP}:${port}/qr-image/1`,
          status: `http://${publicIP}:${port}/status/1`,
          send: `http://${publicIP}:${port}/send?phone=628123456789&text=Hello`,
          sendDirect: `http://${publicIP}:${port}/test-send/628123456789/Hello`
        }
      }
    });
  } catch (error) {
    res.json({
      code: 500,
      data: {
        error: error.message
      }
    });
  }
});

app.get('/connect/:id', async (req, res) => {
  const id = req.params.id;
  try {
    // Cek apakah client sudah ada
    if (clients[id] && clients[id].state === 'ready') {
      return res.json({
        code: 200,
        data: {
          status: clients[id].state
        },
        message: "Client already connected",
      });
    }

    // Jika client sudah ada tapi belum ready, return status saat ini
    if (clients[id]) {
      return res.json({
        code: 200,
        data: {
          status: clients[id].state
        },
        message: "Client exists, check status",
      });
    }

    var client = new WaServer();

    // Mulai proses koneksi tanpa menunggu
    client.connect(id).then(() => {
      console.log('Client connected successfully');
    }).catch(err => {
      console.error('Client connection failed:', err);
    });

    clients[id] = client;

    // Return response segera
    res.json({
      code: 200,
      data: {
        status: client.state
      },
      message: "Connection started, check browser window for QR code",
    });
  } catch (error) {
    console.error('Connection error:', error);
    res.json({
      code: 500,
      data: {
        error: error.message,
        status: 'error'
      },
      message: "Connection failed: " + error.message,
    });
  }
});

app.get('/status/:id', async (req, res) => {
  const id = req.params.id;
  try {
    if (!clients[id]) {
      return res.json({
        code: 404,
        data: {
          status: 'not_found',
          message: 'Client not found'
        }
      });
    }

    const status = await clients[id].getState();
    res.json({
      code: 200,
      data: {
        status: status,
        isActive: isActive,
        clientId: id
      }
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.json({
      code: 500,
      data: {
        status: 'error',
        error: error.message
      }
    });
  }
});

app.get('/qr-image/:id', async (req, res) => {
  const id = req.params.id;
  try {
    if (!clients[id]) {
      return res.json({
        code: 404,
        data: {
          status: 'not_found',
          message: 'Client not found'
        }
      });
    }

    const status = clients[id].getState();

    if (status === 'scan-qr' && clients[id].qrCode) {
      // Generate QR code sebagai gambar
      const qrData = await QRCode.toDataURL(clients[id].qrCode);

      res.json({
        code: 200,
        data: {
          status: 'scan-qr',
          qrImage: qrData,
          message: 'QR code ready for scanning'
        }
      });
    } else if (status === 'ready') {
      res.json({
        code: 200,
        data: {
          status: 'ready',
          message: 'Client already connected'
        }
      });
    } else {
      res.json({
        code: 200,
        data: {
          status: status,
          message: 'Waiting for QR code...'
        }
      });
    }
  } catch (error) {
    res.json({
      code: 500,
      data: {
        status: 'error',
        error: error.message
      }
    });
  }
});

app.get('/test-send/:phone/:message', async (req, res) => {
  const phone = req.params.phone;
  const message = req.params.message;
  const id = DEFAULT_CLIENT;

  try {
    // Cek apakah client tersedia
    if (!clients[id]) {
      return res.json({
        code: 400,
        data: "Client not found"
      });
    }

    // Cek apakah client object tersedia
    if (!clients[id].client) {
      return res.json({
        code: 400,
        data: "Client object not available"
      });
    }

    // Cek apakah client sudah ready
    if (clients[id].state !== 'ready') {
      return res.json({
        code: 400,
        data: `Client not ready. Current state: ${clients[id].state}`
      });
    }

    console.log('Attempting to send message to:', phone, 'Text:', message);

    // Format phone number
    let formattedPhone = phone.replace(/\s/g, "").replace('%20', '').replace(' ', '');
    if (!formattedPhone.endsWith('@s.whatsapp.net')) {
      formattedPhone = formattedPhone + '@s.whatsapp.net';
    }

    // Tambahkan delay untuk menghindari rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Kirim pesan langsung
    const result = await clients[id].client.sendMessage(formattedPhone, { text: message });

    console.log('Message sent successfully:', result);

    res.json({
      code: 200,
      data: 'Message sent successfully',
      result: result
    });

  } catch (error) {
    console.error('Test send error:', error);
    res.json({
      code: 500,
      data: 'Error: ' + error.message
    });
  }
});

app.get('/reset', async (req, res) => {
  try {
    // Destroy client yang ada
    if (clients[1] && clients[1].client) {
      try {
        await clients[1].client.logout();
      } catch (err) {
        console.log('Error logging out client:', err);
      }
    }

    isActive = false;
    delete clients[1];

    res.json({
      code: 200,
      message: "Reset successful"
    });
  } catch (err) {
    console.error('Reset error:', err);
    res.json({
      code: 500,
      message: "Reset failed: " + err.message,
    });
  }
});

app.get('/cleanup', async (req, res) => {
  try {
    // Destroy semua client
    for (let id in clients) {
      if (clients[id] && clients[id].client) {
        try {
          await clients[id].client.logout();
        } catch (err) {
          console.log('Error logging out client:', err);
        }
      }
    }

    // Reset state
    isActive = false;
    Object.keys(clients).forEach(key => delete clients[key]);

    res.json({
      code: 200,
      message: "Cleanup successful"
    });
  } catch (err) {
    console.error('Cleanup error:', err);
    res.json({
      code: 500,
      message: "Cleanup failed: " + err.message,
    });
  }
});

app.get('/', async (req, res) => {
  res.send('WhatsApp Web API Server is running!');
});

app.listen(port, '0.0.0.0', () => {
  const publicIP = getPublicIP();
  console.log(`WhatsApp Web API Server (Baileys) running at:`);
  console.log(`- Local: http://localhost:${port}`);
  console.log(`- Public: http://${publicIP}:${port}`);
  console.log(`- Server Info: http://${publicIP}:${port}/server-info`);
  console.log(`- QR Code: http://${publicIP}:${port}/qr-image/1`);
  console.log(`- Status: http://${publicIP}:${port}/status/1`);
  console.log(`- Send Message: http://${publicIP}:${port}/test-send/628123456789/Hello`);
}); 