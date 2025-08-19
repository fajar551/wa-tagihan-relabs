const axios = require('axios');

const BASE_URL = 'http://localhost:5568';

async function testSendMessage() {
  console.log('=== Testing Send Message ===\n');

  try {
    // Test 1: Check status
    console.log('1. Checking status...');
    const status = await axios.get(`${BASE_URL}/status/1`);
    console.log('Status:', status.data);

    // Test 2: Send message
    console.log('\n2. Sending message...');
    const sendResponse = await axios.get(`${BASE_URL}/send`, {
      params: {
        phone: '6282130697168',
        text: 'Test pesan dari API menggunakan Node.js'
      }
    });
    console.log('Send response:', sendResponse.data);

    // Test 3: Send another message
    console.log('\n3. Sending second message...');
    const sendResponse2 = await axios.get(`${BASE_URL}/send`, {
      params: {
        phone: '6282130697168',
        text: 'Pesan kedua dari API'
      }
    });
    console.log('Send response 2:', sendResponse2.data);

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

// Test manual ready jika diperlukan
async function testManualReady() {
  console.log('\n=== Testing Manual Ready ===\n');

  try {
    const response = await axios.get(`${BASE_URL}/manual-ready/1`);
    console.log('Manual ready response:', response.data);
  } catch (error) {
    console.error('Manual ready error:', error.response ? error.response.data : error.message);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--manual-ready')) {
    await testManualReady();
  } else {
    await testSendMessage();
  }
}

main().catch(console.error); 