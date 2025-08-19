const axios = require('axios');

async function testPublicFeatures() {
  try {
    console.log('=== Testing Public IP Features ===\n');

    // Test 1: Server info
    console.log('1. Getting server info...');
    const serverInfo = await axios.get('http://localhost:5568/server-info');
    console.log('Server Info:', JSON.stringify(serverInfo.data, null, 2));

    // Test 2: Connect
    console.log('\n2. Connecting WhatsApp...');
    const connect = await axios.get('http://localhost:5568/connect/1');
    console.log('Connect:', connect.data);

    // Wait 10 seconds for QR code
    console.log('\n3. Waiting for QR code...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Test 3: Get QR code image
    console.log('\n4. Getting QR code image...');
    const qrImage = await axios.get('http://localhost:5568/qr-image/1');
    console.log('QR Image Status:', qrImage.data.data.status);
    if (qrImage.data.data.qrImage) {
      console.log('QR Code available as base64 image');
    }

    // Test 4: Check status
    console.log('\n5. Checking status...');
    const status = await axios.get('http://localhost:5568/status/1');
    console.log('Status:', status.data);

    // Test 5: Manual ready
    console.log('\n6. Setting manual ready...');
    const manual = await axios.get('http://localhost:5568/manual-ready/1');
    console.log('Manual ready:', manual.data);

    // Test 6: Send message
    console.log('\n7. Testing send message...');
    const send = await axios.get('http://localhost:5568/test-send/6282130697168/Test%20dari%20IP%20publik');
    console.log('Send result:', send.data);

    console.log('\n=== Test Complete ===');
    console.log('\n📱 To test from phone:');
    console.log(`- Server Info: http://${serverInfo.data.data.serverIP}:5568/server-info`);
    console.log(`- QR Code: http://${serverInfo.data.data.serverIP}:5568/qr-image/1`);
    console.log(`- Send Message: http://${serverInfo.data.data.serverIP}:5568/test-send/6282130697168/Hello%20World`);

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testPublicFeatures(); 