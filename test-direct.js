const axios = require('axios');

async function testDirect() {
  try {
    console.log('Testing direct send...');

    // Connect
    const connect = await axios.get('http://localhost:5568/connect/1');
    console.log('Connect:', connect.data);

    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check status
    const status = await axios.get('http://localhost:5568/status/1');
    console.log('Status:', status.data);

    // Manual ready
    const manual = await axios.get('http://localhost:5568/manual-ready/1');
    console.log('Manual ready:', manual.data);

    // Send direct
    const send = await axios.get('http://localhost:5568/send-direct', {
      params: {
        phone: '6282130697168',
        text: 'Test direct send'
      }
    });
    console.log('Send direct:', send.data);

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testDirect(); 