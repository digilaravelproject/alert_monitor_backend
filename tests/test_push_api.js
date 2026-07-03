const jwt = require('jsonwebtoken');
const env = require('../src/config/env');

async function testPush() {
    try {
        // 1. Generate token for Admin
        const token = jwt.sign(
            { id: 1, phone_number: '+919876543210', role: 'Admin' },
            env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        console.log('Generated JWT Token:', token);

        // 2. Fetch the test-push-notification endpoint
        const requestBody = {
            token: 'TEST_DEVICE_FCM_TOKEN_12345',
            feed_id: 8 // Testing with the active database feed ID from our previous query test
        };

        console.log('Sending POST request to /api/test-push-notification...');
        const response = await fetch('http://localhost:3000/api/test-push-notification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
        });

        const status = response.status;
        const body = await response.json();

        console.log('Response Status:', status);
        console.log('Response Body:', JSON.stringify(body, null, 2));

        if (status === 200) {
            console.log('\n✓ Push notification endpoint tested successfully.');
            process.exit(0);
        } else {
            console.error('\n✗ Push notification endpoint returned error.');
            process.exit(1);
        }
    } catch (error) {
        console.error('Test error:', error);
        process.exit(1);
    }
}

testPush();
