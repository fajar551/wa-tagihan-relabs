# WhatsApp Web API Server

Server Node.js untuk mengelola koneksi WhatsApp Web menggunakan whatsapp-web.js dengan akses IP publik dan headless mode.

## 🌟 **Fitur Baru:**

- ✅ **IP Publik** - Bisa diakses dari mana saja
- ✅ **Headless Mode** - Browser tidak terlihat, tetap bisa kirim pesan
- ✅ **QR Code Image** - QR code sebagai gambar base64
- ✅ **Server Info** - Informasi lengkap server dan endpoint
- ✅ **Persistent Session** - Tetap bisa kirim meskipun browser ditutup

## Instalasi

```bash
npm install
```

## Menjalankan Server

```bash
node server.js
```

Server akan berjalan di IP publik dan menampilkan semua URL yang bisa diakses.

## 🌐 **Akses dari IP Publik:**

### **1. Cek Info Server**

```
GET /server-info
```

Response:

```json
{
  "code": 200,
  "data": {
    "serverIP": "192.168.1.100",
    "port": 5568,
    "baseURL": "http://192.168.1.100:5568",
    "endpoints": {
      "connect": "http://192.168.1.100:5568/connect/1",
      "qrImage": "http://192.168.1.100:5568/qr-image/1",
      "status": "http://192.168.1.100:5568/status/1",
      "send": "http://192.168.1.100:5568/send?phone=628123456789&text=Hello",
      "sendDirect": "http://192.168.1.100:5568/test-send/628123456789/Hello"
    }
  }
}
```

### **2. Koneksi WhatsApp**

```
GET /connect/:id
```

- Menghubungkan client WhatsApp dengan ID tertentu
- Browser akan berjalan di background (headless)
- QR code akan tersedia di endpoint `/qr-image/:id`

### **3. QR Code sebagai Gambar**

```
GET /qr-image/:id
```

- Menampilkan QR code sebagai base64 image
- Bisa diakses dari HP untuk scan
- Response:

```json
{
  "code": 200,
  "data": {
    "status": "scan-qr",
    "qrImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "message": "QR code ready for scanning"
  }
}
```

### **4. Cek Status**

```
GET /status/:id
```

- Mengecek status koneksi client
- Response: `disconnected`, `scan-qr`, `authenticated`, `ready`, `error`

### **5. Kirim Pesan**

```
GET /test-send/:phone/:message
```

- Kirim pesan langsung tanpa queue
- Contoh: `/test-send/6282130697168/Hello%20World`

```
GET /send?phone=628123456789&text=Hello World
```

- Kirim pesan dengan queue system

## 📱 **Cara Menggunakan dari HP:**

### **1. Scan QR Code**

1. Buka browser di HP
2. Kunjungi: `http://[IP_SERVER]:5568/qr-image/1`
3. QR code akan muncul sebagai gambar
4. Scan dengan WhatsApp

### **2. Kirim Pesan dari HP**

```
http://[IP_SERVER]:5568/test-send/6282130697168/Test%20dari%20HP
```

### **3. Cek Status dari HP**

```
http://[IP_SERVER]:5568/status/1
```

## 🔧 **Keunggulan Headless Mode:**

### **1. Browser Tidak Terlihat**

- WhatsApp Web berjalan di background
- Tidak mengganggu penggunaan komputer
- Tetap bisa kirim pesan

### **2. Persistent Session**

- Setelah scan QR code, session tersimpan
- Bisa kirim pesan meskipun browser ditutup
- Restart server tidak perlu scan ulang

### **3. Akses dari Mana Saja**

- Bisa diakses dari HP, tablet, komputer lain
- Cukup tahu IP server dan port
- Tidak perlu VPN atau port forwarding

## 🛠️ **Troubleshooting:**

### **Masalah Koneksi**

```bash
# Cek firewall
netsh advfirewall firewall add rule name="WhatsApp API" dir=in action=allow protocol=TCP localport=5568

# Cek port
netstat -an | findstr 5568
```

### **Reset Session**

```bash
curl http://[IP_SERVER]:5568/reset
curl http://[IP_SERVER]:5568/connect/1
```

### **Cek Log Server**

```bash
# Lihat log real-time
node server.js
```

## 📋 **Endpoint Lengkap:**

| Endpoint                     | Method | Deskripsi                |
| ---------------------------- | ------ | ------------------------ |
| `/server-info`               | GET    | Info server dan IP       |
| `/connect/:id`               | GET    | Koneksi WhatsApp         |
| `/qr-image/:id`              | GET    | QR code sebagai gambar   |
| `/status/:id`                | GET    | Cek status koneksi       |
| `/test-send/:phone/:message` | GET    | Kirim pesan langsung     |
| `/send`                      | GET    | Kirim pesan dengan queue |
| `/reset`                     | GET    | Reset session            |
| `/cleanup`                   | GET    | Bersihkan semua data     |

## 🔒 **Keamanan:**

- Gunakan HTTPS di production
- Tambahkan authentication
- Batasi akses IP jika diperlukan
- Monitor penggunaan resource

## 📞 **Contoh Penggunaan:**

### **Dari HP:**

```
# Cek info server
http://192.168.1.100:5568/server-info

# Scan QR code
http://192.168.1.100:5568/qr-image/1

# Kirim pesan
http://192.168.1.100:5568/test-send/6282130697168/Hello%20World
```

### **Dari Komputer:**

```bash
# Cek status
curl http://192.168.1.100:5568/status/1

# Kirim pesan
curl "http://192.168.1.100:5568/test-send/6282130697168/Test%20pesan"
```

**Sekarang WhatsApp Web API Anda bisa diakses dari mana saja dan tetap berfungsi meskipun browser ditutup!** 🚀
