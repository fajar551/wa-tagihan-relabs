const axios = require('axios');

async function testWaitReady() {
  try {
    console.log('Testing wait-ready endpoint...');

    // Connect
    const connect = await axios.get('http://localhost:5568/connect/1');
    console.log('Connect:', connect.data);

    // Wait 5 seconds for browser to start
    console.log('Waiting for browser to start...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Wait for WhatsApp Web to be ready
    console.log('Waiting for WhatsApp Web to be ready...');
    const waitReady = await axios.get('http://localhost:5568/wait-ready/1');
    console.log('Wait ready:', waitReady.data);

    // Check final status
    const status = await axios.get('http://localhost:5568/status/1');
    console.log('Final status:', status.data);

    // Try to send message
    if (waitReady.data.data.status === 'ready' && waitReady.data.data.clientAvailable) {
      console.log('Attempting to send message...');
      const send = await axios.get('http://localhost:5568/send-direct', {
        params: {
          phone: '6282130697168',
          text: 'Test setelah wait-ready'
        }
      });
      console.log('Send result:', send.data);
    } else {
      console.log('Cannot send message - client not ready or not available');
    }

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testWaitReady(); 