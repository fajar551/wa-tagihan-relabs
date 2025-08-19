const axios = require('axios');

async function testBrowserStatus() {
  try {
    console.log('Testing browser status...');

    // Connect
    const connect = await axios.get('http://localhost:5568/connect/1');
    console.log('Connect:', connect.data);

    // Wait 10 seconds for browser to start
    console.log('Waiting for browser to start...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check browser status
    console.log('Checking browser status...');
    const browserStatus = await axios.get('http://localhost:5568/browser-status/1');
    console.log('Browser status:', JSON.stringify(browserStatus.data, null, 2));

    // Wait for WhatsApp Web to be ready
    console.log('Waiting for WhatsApp Web to be ready...');
    const waitReady = await axios.get('http://localhost:5568/wait-ready/1');
    console.log('Wait ready:', JSON.stringify(waitReady.data, null, 2));

    // Check browser status again
    console.log('Checking browser status after wait...');
    const browserStatus2 = await axios.get('http://localhost:5568/browser-status/1');
    console.log('Browser status after wait:', JSON.stringify(browserStatus2.data, null, 2));

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testBrowserStatus(); 