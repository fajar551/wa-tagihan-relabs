const axios = require('axios');

async function simpleSendTest() {
  try {
    console.log('Simple send test...');

    // Connect
    const connect = await axios.get('http://localhost:5568/connect/1');
    console.log('Connect:', connect.data);

    // Wait 15 seconds for browser to load
    console.log('Waiting for browser to load...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Manual ready
    const manual = await axios.get('http://localhost:5568/manual-ready/1');
    console.log('Manual ready:', manual.data);

    // Test send dengan endpoint sederhana
    console.log('Testing simple send...');
    const send = await axios.get('http://localhost:5568/test-send/6282130697168/Test%20pesan%20sederhana');
    console.log('Send result:', send.data);

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

simpleSendTest(); 