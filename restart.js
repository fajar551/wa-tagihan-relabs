const { exec } = require('child_process');
const axios = require('axios');

async function restartAndTest() {
  try {
    console.log('Restarting server...');

    // Kill existing process
    exec('taskkill /f /im node.exe', (error) => {
      if (error) {
        console.log('No existing process to kill');
      } else {
        console.log('Killed existing process');
      }
    });

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Start server
    console.log('Starting server...');
    const server = exec('node server.js', (error) => {
      if (error) {
        console.error('Server error:', error);
      }
    });

    // Wait 5 seconds for server to start
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test connection
    console.log('Testing connection...');
    const connect = await axios.get('http://localhost:5568/connect/1');
    console.log('Connect:', connect.data);

    // Wait 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check status
    const status = await axios.get('http://localhost:5568/status/1');
    console.log('Status:', status.data);

    // Manual ready
    const manual = await axios.get('http://localhost:5568/manual-ready/1');
    console.log('Manual ready:', manual.data);

    // Send message
    const send = await axios.get('http://localhost:5568/send', {
      params: {
        phone: '6282130697168',
        text: 'Test setelah restart'
      }
    });
    console.log('Send:', send.data);

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

restartAndTest(); 