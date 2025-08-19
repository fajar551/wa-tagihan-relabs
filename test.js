const axios = require('axios');

const BASE_URL = 'http://localhost:5568';

async function testAPI() {
  console.log('=== Testing WhatsApp Web API ===\n');

  try {
    // Test 1: Info server
    console.log('1. Testing /info...');
    const info = await axios.get(`${BASE_URL}/info`);
    console.log('Info:', info.data);

    // Test 2: Status client 1
    console.log('\n2. Testing /status/1...');
    const status = await axios.get(`${BASE_URL}/status/1`);
    console.log('Status:', status.data);

    // Test 3: Connect client 1 (jika belum connected)
    if (status.data.data.status === 'not_found' || status.data.data.status === 'disconnected') {
      console.log('\n3. Testing /connect/1...');
      console.log('Connecting... (this may take a while)');
      const connect = await axios.get(`${BASE_URL}/connect/1`);
      console.log('Connect result:', connect.data);
    } else {
      console.log('\n3. Client already connected, skipping connect test');
    }

    // Test 4: Status setelah connect
    console.log('\n4. Testing status after connect...');
    const statusAfter = await axios.get(`${BASE_URL}/status/1`);
    console.log('Status after connect:', statusAfter.data);

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

// Test cleanup jika diperlukan
async function testCleanup() {
  console.log('\n=== Testing Cleanup ===\n');

  try {
    const cleanup = await axios.get(`${BASE_URL}/cleanup`);
    console.log('Cleanup result:', cleanup.data);
  } catch (error) {
    console.error('Cleanup error:', error.response ? error.response.data : error.message);
  }
}

// Test reset jika diperlukan
async function testReset() {
  console.log('\n=== Testing Reset ===\n');

  try {
    const reset = await axios.get(`${BASE_URL}/reset`);
    console.log('Reset result:', reset.data);
  } catch (error) {
    console.error('Reset error:', error.response ? error.response.data : error.message);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--cleanup')) {
    await testCleanup();
  } else if (args.includes('--reset')) {
    await testReset();
  } else {
    await testAPI();
  }
}

main().catch(console.error);
