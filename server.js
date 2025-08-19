const express = require('express')
const app = express()
const port = 5568

const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
var QRCode = require('qrcode');
var uniqid = require('uniqid');
var queue = require('./queue');

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

// Fungsi untuk mencari Chrome executable
function findChromeExecutable() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ];

  for (const path of possiblePaths) {
    if (fs.existsSync(path)) {
      return path;
    }
  }
  return undefined;
}

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
    this.debugMode = false // Tambah flag untuk debug mode
  }
  connect(uid) {
    return new Promise((res, rej) => {

      if (!Boolean(uid)) {
        uid = uniqid()
      }

      const chromePath = findChromeExecutable();
      console.log('Chrome executable path:', chromePath);

      // Tentukan headless mode berdasarkan debugMode
      const isHeadless = !this.debugMode;
      console.log('Headless mode:', isHeadless, 'Debug mode:', this.debugMode);

      // Konfigurasi Puppeteer yang stabil untuk headless mode
      const client = new Client({
        puppeteer: {
          headless: isHeadless, // Gunakan headless berdasarkan debugMode
          executablePath: chromePath,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-default-apps',
            '--disable-sync',
            '--disable-translate',
            '--hide-scrollbars',
            '--mute-audio',
            '--no-default-browser-check',
            '--ignore-certificate-errors',
            '--ignore-ssl-errors',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--disable-background-networking',
            '--disable-default-apps',
            '--disable-sync',
            '--disable-translate',
            '--hide-scrollbars',
            '--metrics-recording-only',
            '--mute-audio',
            '--no-first-run',
            '--safebrowsing-disable-auto-update',
            '--ignore-certificate-errors',
            '--ignore-ssl-errors',
            '--ignore-certificate-errors-spki-list',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          ],
          timeout: 60000,
          defaultViewport: null,
          ignoreHTTPSErrors: true
        },
        authStrategy: new LocalAuth({
          clientId: uid,
          dataPath: './sessions'
        }),
        // Tambahkan konfigurasi untuk mengatasi WidFactory error
        takeoverOnConflict: true,
        takeoverTimeoutMs: 10000
      });

      // Set client object first
      this.client = client;

      client.initialize().catch(err => {
        console.error('Error initializing client:', err);
        this.state = 'error'
        rej(err);
      });

      client.on('qr', (qr) => {
        console.log('QR Code received for client:', uid);
        this.qrCode = qr; // Simpan QR code
        QRCode.toDataURL(qr, (err, url) => {
          if (err) {
            console.error('Error generating QR:', err);
            rej(err);
            return;
          }
          /**
           * Send to API laravel notif QR
           * @param uid
           * @param url
           * /laravel/notifscan/:url/uid
           */
          this.state = "scan-qr"
          console.log('QR Code generated for client:', uid, 'State:', this.state);
          if (this.debugMode) {
            console.log('🔍 DEBUG MODE: Browser window terlihat untuk scan QR');
          } else {
            console.log('🌐 HEADLESS MODE: QR code tersedia via API /qr-image/' + uid);
          }
          res(true);
          console.log('scan generated ' + uid)
        })
      });

      client.on('authenticated', (session) => {
        console.log('WhatsApp authenticated for client:', uid);
        this.state = "authenticated"
        isActive = true
        console.log('State changed to authenticated for client:', uid);
      });

      client.on('auth_failure', msg => {
        console.log('Authentication failed for client:', uid, 'Message:', msg);
        this.state = 'auth_failure'
        console.error('AUTHENTICATION FAILURE', msg);
        rej(new Error('Authentication failed: ' + msg));
      });

      client.on('ready', () => {
        console.log('WhatsApp ready for client:', uid);
        this.state = 'ready'
        isActive = true;
        console.log('State changed to ready for client:', uid);
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
        console.log('Client was logged out', reason);
      });

      client.on('loading_screen', (percent, message) => {
        console.log('Loading:', percent, '%', message);
      });

      client.on('qr', (qr) => {
        console.log('QR RECEIVED', qr);
      });

      // Tambahkan event listener untuk state changes
      client.on('state_change', (state) => {
        console.log('State changed to:', state);
        this.state = state;
        if (state === 'ready') {
          isActive = true;
        }
      });

      // Tambahkan error handling untuk page errors
      client.on('page_error', (error) => {
        console.log('Page error:', error);
      });

      // Handle browser disconnect events
      client.on('disconnected', (reason) => {
        console.log('Client disconnected:', reason);
        this.state = 'disconnected';
        isActive = false;
      });

      // Handle page close
      if (client.pupPage) {
        client.pupPage.on('close', () => {
          console.log('Browser page closed');
          this.state = 'disconnected';
          isActive = false;
        });

        client.pupPage.on('error', (error) => {
          console.log('Browser page error:', error);
          this.state = 'error';
        });
      }


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
      // Cek apakah client tersedia
      if (!this.client) {
        console.log('Client not available for sending message');
        return "Client not available";
      }

      // Cek apakah client sudah ready
      if (this.state !== 'ready') {
        console.log('Client not ready, current state:', this.state);
        return "Client not ready, current state: " + this.state;
      }

      for (const data of datas) {
        var phone = data.phone
        phone = phone.replace(/\s/g, "")
        phone = phone.replace('%20', '')
        phone = phone.replace(' ', '')
        console.log("Sending message to:", phone, "Text:", data.text)

        try {
          // Tambahkan delay untuk menghindari rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

          const res = await this.client.sendMessage(phone + '@c.us', data.text.replace(/%0a/g, '\n'));
          console.log('Message sent successfully:', { res })
        } catch (sendError) {
          console.log('Error sending message to', phone, ':', sendError.message);

          // Handle session closed error - tetap headless mode
          if (sendError.message.includes('Session closed') || sendError.message.includes('Target closed')) {
            console.log('Session closed detected, attempting headless reconnect...');
            try {
              // Set state ke disconnected
              this.state = 'disconnected';

              // Destroy client yang ada
              if (this.client) {
                try {
                  await this.client.destroy();
                } catch (err) {
                  console.log('Error destroying client:', err.message);
                }
              }

              // Tunggu sebentar
              await new Promise(resolve => setTimeout(resolve, 3000));

              // Reset debug mode ke false untuk headless reconnect
              this.debugMode = false;

              // Coba reconnect dalam headless mode
              console.log('Attempting headless reconnect...');
              await this.connect('1'); // Reconnect dengan client ID 1

              // Tunggu sampai ready
              let attempts = 0;
              while (this.state !== 'ready' && attempts < 30) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
                console.log('Waiting for headless reconnection, attempt:', attempts, 'State:', this.state);
              }

              if (this.state === 'ready') {
                console.log('Headless reconnected successfully, retrying message...');
                // Coba kirim ulang pesan
                const retryRes = await this.client.sendMessage(phone + '@c.us', data.text.replace(/%0a/g, '\n'));
                console.log('Message sent successfully after headless reconnect:', { retryRes });
              } else {
                console.log('Headless reconnection failed, state:', this.state);
                return `Failed to send to ${phone}: Session closed and headless reconnection failed. Use /connect-debug/1 for manual scan.`;
              }
            } catch (reconnectError) {
              console.log('Headless reconnection failed:', reconnectError.message);
              return `Failed to send to ${phone}: Session closed and headless reconnection failed - ${reconnectError.message}. Use /connect-debug/1 for manual scan.`;
            }
          } else if (sendError.message.includes('WidFactory')) {
            console.log('WidFactory error detected, attempting to reconnect...');
            try {
              await this.client.destroy();
              await new Promise(resolve => setTimeout(resolve, 2000));
              await this.client.initialize();
              console.log('Reconnected successfully');
            } catch (reconnectError) {
              console.log('Reconnection failed:', reconnectError.message);
            }
          }

          return `Failed to send to ${phone}: ${sendError.message}`;
        }
      }
      return "success"
    } catch (error) {
      console.log('SendBulk error:', error)
      return `Error: ${error.message}`
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
    if (clients[id] && clients[id].state === 'ready') {
      return res.json({
        code: 200,
        data: {
          status: clients[id].state
        },
        message: "Client already connected",
      })
    }

    // Jika client sudah ada tapi belum ready, return status saat ini
    if (clients[id]) {
      return res.json({
        code: 200,
        data: {
          status: clients[id].state
        },
        message: "Client exists, check status",
      })
    }

    var client = new WaServer()

    // Mulai proses koneksi tanpa menunggu
    client.connect(id).then(() => {
      console.log('Client connected successfully');
    }).catch(err => {
      console.error('Client connection failed:', err);
    });

    clients[id] = client

    // Return response segera
    res.json({
      code: 200,
      data: {
        status: client.state
      },
      message: "Connection started, check browser window for QR code",
    })
  } catch (error) {
    console.error('Connection error:', error);
    res.json({
      code: 500,
      data: {
        error: error.message,
        status: 'error'
      },
      message: "Connection failed: " + error.message,
    })
  }
})

app.get('/status/:id', async (req, res) => {
  const id = req.params.id
  try {
    if (!clients[id]) {
      return res.json({
        code: 404,
        data: {
          status: 'not_found',
          message: 'Client not found'
        }
      })
    }

    const status = await clients[id].getState()
    res.json({
      code: 200,
      data: {
        status: status,
        isActive: isActive,
        clientId: id
      }
    })
  } catch (error) {
    console.error('Status check error:', error);
    res.json({
      code: 500,
      data: {
        status: 'error',
        error: error.message
      }
    })
  }
})

app.get('/qr/:id', async (req, res) => {
  const id = req.params.id
  try {
    if (!clients[id]) {
      return res.json({
        code: 404,
        data: {
          status: 'not_found',
          message: 'Client not found'
        }
      })
    }

    const status = clients[id].getState()

    if (status === 'scan-qr') {
      // Jika sudah dalam status scan-qr, return success
      res.json({
        code: 200,
        data: {
          status: 'scan-qr',
          message: 'QR code is ready, check browser window'
        }
      })
    } else if (status === 'ready') {
      res.json({
        code: 200,
        data: {
          status: 'ready',
          message: 'Client already connected'
        }
      })
    } else {
      res.json({
        code: 200,
        data: {
          status: status,
          message: 'Waiting for QR code...'
        }
      })
    }
  } catch (error) {
    res.json({
      code: 500,
      data: {
        status: 'error',
        error: error.message
      }
    })
  }
})

app.get('/force-status/:id', async (req, res) => {
  const id = req.params.id
  try {
    if (!clients[id]) {
      return res.json({
        code: 404,
        data: {
          status: 'not_found',
          message: 'Client not found'
        }
      })
    }

    // Return current state
    res.json({
      code: 200,
      data: {
        status: clients[id].getState(),
        isActive: isActive,
        clientId: id
      }
    })
  } catch (error) {
    console.error('Force status error:', error);
    res.json({
      code: 500,
      data: {
        status: 'error',
        error: error.message
      }
    })
  }
})

app.get('/check-whatsapp/:id', async (req, res) => {
  const id = req.params.id
  try {
    if (!clients[id]) {
      return res.json({
        code: 404,
        data: {
          status: 'not_found',
          message: 'Client not found'
        }
      })
    }

    // Return current state only
    res.json({
      code: 200,
      data: {
        status: clients[id].getState(),
        isActive: isActive,
        clientId: id
      }
    })
  } catch (error) {
    console.error('Check WhatsApp error:', error);
    res.json({
      code: 500,
      data: {
        error: error.message
      }
    })
  }
})

app.get('/test', async (req, res) => {
  res.json({
    code: 200,
    message: "Server is running!",
    timestamp: new Date().toISOString(),
    ip: getPublicIP()
  })
})

app.get('/', async (req, res) => {
  res.send('WhatsApp Web API Server is running!')
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

  // Cek apakah client tersedia dan ready
  if (!clients[id] || clients[id].state !== 'ready') {
    res.json({
      code: 400,
      data: "Client not ready. Status: " + (clients[id] ? clients[id].state : 'not found')
    })
    return
  }

  // Cek apakah client object tersedia
  if (!clients[id].client) {
    console.log('Client object is null for client:', id);
    console.log('Client state:', clients[id].state);
    console.log('Client object:', clients[id].client);
    res.json({
      code: 400,
      data: "Client object not available"
    })
    return
  }

  var data = [{
    phone: input.phone,
    text: input.text
  }]

  try {
    console.log('Sending message via queue...');
    // Add random delay
    queue.appendCommand(() => clients[1].sendBulk(data))

    res.json({
      code: 200,
      data: 'success'
    })
  } catch (error) {
    console.error('Send error:', error);
    res.json({
      code: 500,
      data: 'Error: ' + error.message
    })
  }
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
    // Destroy client yang ada
    if (clients[1] && clients[1].client) {
      try {
        // Coba logout dengan error handling
        await clients[1].client.logout().catch(err => {
          console.log('Logout error (normal):', err.message);
        });
      } catch (err) {
        console.log('Error during logout:', err.message);
      }

      // Force destroy client
      try {
        await clients[1].client.destroy();
      } catch (err) {
        console.log('Error destroying client:', err.message);
      }
    }

    // Hapus file session dengan error handling
    try {
      await fs.unlinkSync('./sessions/1.json')
    } catch (err) {
      console.log('Session file not found or already deleted');
    }

    // Hapus folder session jika ada error
    try {
      await fs.rmSync('./sessions', { recursive: true, force: true });
      await fs.mkdirSync('./sessions', { recursive: true });
    } catch (err) {
      console.log('Error cleaning sessions folder:', err.message);
    }

    isActive = false
    delete clients[1]

    res.json({
      code: 200,
      message: "Reset successful"
    })
  } catch (err) {
    console.error('Reset error:', err);
    res.json({
      code: 500,
      message: "Reset failed: " + err.message,
    })
  }
})

app.get('/cleanup', async (req, res) => {
  try {
    // Hapus semua session
    try {
      await fs.rmSync('./sessions', { recursive: true, force: true });
      await fs.mkdirSync('./sessions', { recursive: true });
    } catch (err) {
      console.log('Error cleaning sessions:', err);
    }

    // Destroy semua client
    for (let id in clients) {
      if (clients[id] && clients[id].client) {
        try {
          await clients[id].client.destroy();
        } catch (err) {
          console.log('Error destroying client:', err);
        }
      }
    }

    // Reset state
    isActive = false
    Object.keys(clients).forEach(key => delete clients[key]);

    res.json({
      code: 200,
      message: "Cleanup successful"
    })
  } catch (err) {
    console.error('Cleanup error:', err);
    res.json({
      code: 500,
      message: "Cleanup failed: " + err.message,
    })
  }
})

app.get('/check-browser', async (req, res) => {
  try {
    const chromePath = findChromeExecutable();
    const chromeExists = fs.existsSync(chromePath);

    res.json({
      code: 200,
      data: {
        chromePath: chromePath,
        chromeExists: chromeExists,
        platform: process.platform,
        nodeVersion: process.version
      },
      message: chromeExists ? "Chrome found" : "Chrome not found"
    })
  } catch (error) {
    res.json({
      code: 500,
      data: {
        error: error.message
      },
      message: "Error checking browser"
    })
  }
})

app.get('/manual-ready/:id', async (req, res) => {
  const id = req.params.id
  try {
    if (!clients[id]) {
      return res.json({
        code: 404,
        data: {
          status: 'not_found',
          message: 'Client not found'
        }
      })
    }

    // Manual set state ke ready
    clients[id].state = 'ready';
    isActive = true;

    console.log('Manual state update: client', id, 'set to ready');
    console.log('Client object available:', !!clients[id].client);

    res.json({
      code: 200,
      data: {
        status: clients[id].state,
        isActive: isActive,
        clientId: id,
        clientAvailable: !!clients[id].client,
        message: 'State manually updated to ready'
      }
    })
  } catch (error) {
    console.error('Manual ready error:', error);
    res.json({
      code: 500,
      data: {
        error: error.message
      }
    })
  }
})

app.get('/send-direct', async (req, res) => {
  if (isActive == false) {
    res.json({
      code: 200,
      data: "not active"
    })
    return
  }

  var input = req.query
  var id = DEFAULT_CLIENT

  // cek no hp valid
  if (input.phone.length < 6) {
    res.json({
      code: 400,
      data: "Phone invalid"
    })
    return
  }

  // Cek apakah client tersedia dan ready
  if (!clients[id] || clients[id].state !== 'ready') {
    res.json({
      code: 400,
      data: "Client not ready. Status: " + (clients[id] ? clients[id].state : 'not found')
    })
    return
  }

  // Cek apakah client object tersedia
  if (!clients[id].client) {
    console.log('Client object is null for client:', id);
    res.json({
      code: 400,
      data: "Client object not available"
    })
    return
  }

  try {
    console.log('Sending message directly...');
    const phone = input.phone.replace(/\s/g, "").replace('%20', '').replace(' ', '');
    const text = input.text.replace(/%0a/g, '\n');

    console.log('Sending to:', phone, 'Text:', text);

    const result = await clients[id].client.sendMessage(phone + '@c.us', text);
    console.log('Message sent successfully:', result);

    res.json({
      code: 200,
      data: 'Message sent successfully'
    })
  } catch (error) {
    console.error('Send direct error:', error);
    res.json({
      code: 500,
      data: 'Error: ' + error.message
    })
  }
})

app.get('/browser-status/:id', async (req, res) => {
  const id = req.params.id
  try {
    if (!clients[id]) {
      return res.json({
        code: 404,
        data: {
          status: 'not_found',
          message: 'Client not found'
        }
      })
    }

    const client = clients[id];
    const browserInfo = {
      hasClient: !!client.client,
      hasPage: !!(client.client && client.client.pupPage),
      state: client.state,
      isActive: isActive
    };

    res.json({
      code: 200,
      data: browserInfo
    })
  } catch (error) {
    console.error('Browser status error:', error);
    res.json({
      code: 500,
      data: {
        error: error.message
      }
    })
  }
})

app.listen(port, '0.0.0.0', () => {
  const publicIP = getPublicIP();
  console.log(`WhatsApp Web API Server (HEADLESS MODE) running at:`);
  console.log(`- Local: http://localhost:${port}`);
  console.log(`- Public: http://${publicIP}:${port}`);
  console.log(`- Server Info: http://${publicIP}:${port}/server-info`);
  console.log(`- QR Code: http://${publicIP}:${port}/qr-image/1`);
  console.log(`- Status: http://${publicIP}:${port}/status/1`);
  console.log(`- Send Message: http://${publicIP}:${port}/test-send/628123456789/Hello`);
  console.log(`\n⚠️  SERVER BERJALAN DALAM HEADLESS MODE ⚠️`);
  console.log(`✅ Browser Chrome berjalan di background (tidak terlihat)`);
  console.log(`✅ Tetap bisa kirim pesan meskipun browser ditutup`);
  console.log(`✅ QR Code bisa diakses via: http://${publicIP}:${port}/qr-image/1`);
})

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
    const formattedPhone = phone.replace(/\s/g, "").replace('%20', '').replace(' ', '') + '@c.us';

    // Tambahkan delay untuk menghindari rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Kirim pesan langsung
    const result = await clients[id].client.sendMessage(formattedPhone, message);

    console.log('Message sent successfully:', result);

    res.json({
      code: 200,
      data: 'Message sent successfully',
      result: result
    });

  } catch (error) {
    console.error('Test send error:', error);

    // Handle session closed error
    if (error.message.includes('Session closed') || error.message.includes('Target closed')) {
      console.log('Session closed detected in test-send, attempting headless auto-reconnect...');

      try {
        // Set debug mode ke false untuk headless reconnect
        clients[id].debugMode = false;

        // Auto reconnect dalam headless mode
        await clients[id].connect('1');

        // Tunggu sampai ready
        let attempts = 0;
        while (clients[id].state !== 'ready' && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
          console.log('Waiting for headless auto-reconnection, attempt:', attempts, 'State:', clients[id].state);
        }

        if (clients[id].state === 'ready') {
          console.log('Headless auto-reconnected successfully, retrying message...');

          // Coba kirim ulang pesan
          const formattedPhone = phone.replace(/\s/g, "").replace('%20', '').replace(' ', '') + '@c.us';
          const retryResult = await clients[id].client.sendMessage(formattedPhone, message);

          res.json({
            code: 200,
            data: 'Message sent successfully after headless auto-reconnect',
            result: retryResult
          });
        } else {
          res.json({
            code: 500,
            data: 'Session closed and headless auto-reconnection failed. Please use /connect-debug/1 to reconnect manually.'
          });
        }
      } catch (reconnectError) {
        console.log('Headless auto-reconnection failed:', reconnectError.message);
        res.json({
          code: 500,
          data: 'Session closed and headless auto-reconnection failed. Please use /connect-debug/1 to reconnect manually.'
        });
      }
    } else if (error.message.includes('WidFactory')) {
      console.log('WidFactory error detected, attempting to reconnect...');
      try {
        await clients[id].client.destroy();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await clients[id].client.initialize();
        console.log('Reconnected successfully');

        res.json({
          code: 500,
          data: 'WidFactory error detected, client reconnected. Please try again.'
        });
      } catch (reconnectError) {
        console.log('Reconnection failed:', reconnectError.message);
        res.json({
          code: 500,
          data: 'Error: WidFactory error and reconnection failed. Please restart the server.'
        });
      }
    } else {
      res.json({
        code: 500,
        data: 'Error: ' + error.message
      });
    }
  }
});

// Endpoint untuk auto-reconnect
app.get('/auto-reconnect/:id', async (req, res) => {
  const id = req.params.id;
  try {
    if (!clients[id]) {
      return res.json({
        code: 404,
        data: "Client not found"
      });
    }

    console.log('Auto-reconnecting client in headless mode:', id);

    // Destroy client yang ada
    if (clients[id].client) {
      try {
        await clients[id].client.destroy();
      } catch (err) {
        console.log('Error destroying client:', err.message);
      }
    }

    // Reset state
    clients[id].state = 'disconnected';
    isActive = false;

    // Set debug mode ke false untuk headless reconnect
    clients[id].debugMode = false;

    // Reconnect dalam headless mode
    await clients[id].connect(id);

    // Tunggu sampai ready
    let attempts = 0;
    while (clients[id].state !== 'ready' && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      console.log('Waiting for headless auto-reconnection, attempt:', attempts, 'State:', clients[id].state);
    }

    if (clients[id].state === 'ready') {
      res.json({
        code: 200,
        data: {
          status: 'ready',
          message: 'Headless auto-reconnected successfully'
        }
      });
    } else {
      res.json({
        code: 500,
        data: {
          status: clients[id].state,
          message: 'Headless auto-reconnection failed, please use /connect-debug/1 for manual scan'
        }
      });
    }

  } catch (error) {
    console.error('Headless auto-reconnect error:', error);
    res.json({
      code: 500,
      data: 'Headless auto-reconnection failed: ' + error.message
    });
  }
});

app.get('/qr-image/:id', async (req, res) => {
  const id = req.params.id
  try {
    if (!clients[id]) {
      return res.json({
        code: 404,
        data: {
          status: 'not_found',
          message: 'Client not found'
        }
      })
    }

    const status = clients[id].getState()

    if (status === 'scan-qr') {
      // Generate QR code sebagai gambar
      const qrData = await new Promise((resolve, reject) => {
        QRCode.toDataURL(clients[id].qrCode, (err, url) => {
          if (err) reject(err);
          else resolve(url);
        });
      });

      res.json({
        code: 200,
        data: {
          status: 'scan-qr',
          qrImage: qrData,
          message: 'QR code ready for scanning'
        }
      })
    } else if (status === 'ready') {
      res.json({
        code: 200,
        data: {
          status: 'ready',
          message: 'Client already connected'
        }
      })
    } else {
      res.json({
        code: 200,
        data: {
          status: status,
          message: 'Waiting for QR code...'
        }
      })
    }
  } catch (error) {
    res.json({
      code: 500,
      data: {
        status: 'error',
        error: error.message
      }
    })
  }
})

app.get('/server-info', async (req, res) => {
  try {
    const publicIP = getPublicIP();
    res.json({
      code: 200,
      data: {
        serverIP: publicIP,
        port: port,
        headlessMode: true, // Konfirmasi bahwa server berjalan dalam headless mode
        baseURL: `http://${publicIP}:${port}`,
        endpoints: {
          connect: `http://${publicIP}:${port}/connect/1`,
          connectDebug: `http://${publicIP}:${port}/connect-debug/1`,
          qrImage: `http://${publicIP}:${port}/qr-image/1`,
          status: `http://${publicIP}:${port}/status/1`,
          send: `http://${publicIP}:${port}/send?phone=628123456789&text=Hello`,
          sendDirect: `http://${publicIP}:${port}/test-send/628123456789/Hello`,
          reconnect: `http://${publicIP}:${port}/reconnect/1`,
          autoReconnect: `http://${publicIP}:${port}/auto-reconnect/1`,
          reset: `http://${publicIP}:${port}/reset`
        },
        note: "Server berjalan dalam headless mode - browser tidak terlihat tapi tetap bisa kirim pesan",
        debugMode: "Gunakan /connect-debug/1 untuk browser terlihat saat scan QR",
        autoReconnect: "Auto-reconnect menggunakan headless mode (tidak membuka browser)"
      }
    })
  } catch (error) {
    res.json({
      code: 500,
      data: {
        error: error.message
      }
    })
  }
})

app.get('/reconnect/:id', async (req, res) => {
  const id = req.params.id
  try {
    // Destroy client yang ada
    if (clients[id] && clients[id].client) {
      try {
        // Coba logout dengan error handling
        await clients[id].client.logout().catch(err => {
          console.log('Logout error (normal):', err.message);
        });
      } catch (err) {
        console.log('Error during logout:', err.message);
      }

      // Force destroy client
      try {
        await clients[id].client.destroy();
      } catch (err) {
        console.log('Error destroying client:', err.message);
      }
    }

    // Reset state
    isActive = false
    delete clients[id]

    // Buat client baru
    var client = new WaServer()

    // Mulai proses koneksi
    client.connect(id).then(() => {
      console.log('Client reconnected successfully');
    }).catch(err => {
      console.error('Client reconnection failed:', err);
    });

    clients[id] = client

    res.json({
      code: 200,
      data: {
        status: client.state
      },
      message: "Reconnection started, check QR code via /qr-image/" + id,
    })
  } catch (error) {
    console.error('Reconnection error:', error);
    res.json({
      code: 500,
      data: {
        error: error.message,
        status: 'error'
      },
      message: "Reconnection failed: " + error.message,
    })
  }
})

// Endpoint untuk koneksi debug mode (browser terlihat)
app.get('/connect-debug/:id', async (req, res) => {
  const id = req.params.id
  try {
    // Destroy client yang ada
    if (clients[id] && clients[id].client) {
      try {
        await clients[id].client.logout().catch(err => {
          console.log('Logout error (normal):', err.message);
        });
      } catch (err) {
        console.log('Error during logout:', err.message);
      }

      try {
        await clients[id].client.destroy();
      } catch (err) {
        console.log('Error destroying client:', err.message);
      }
    }

    // Reset state
    isActive = false
    delete clients[id]

    // Buat client baru dengan debug mode
    var client = new WaServer()

    // Override headless mode untuk debug
    client.debugMode = true;

    // Mulai proses koneksi
    client.connect(id).then(() => {
      console.log('Client connected in debug mode successfully');
    }).catch(err => {
      console.error('Client connection failed:', err);
    });

    clients[id] = client

    res.json({
      code: 200,
      data: {
        status: client.state
      },
      message: "Debug connection started, browser window will be visible for QR scanning",
    })
  } catch (error) {
    console.error('Debug connection error:', error);
    res.json({
      code: 500,
      data: {
        error: error.message,
        status: 'error'
      },
      message: "Debug connection failed: " + error.message,
    })
  }
})