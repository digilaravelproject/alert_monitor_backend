const assert = require('assert');
const { sql, pool, poolConnect } = require('../src/config/database');
const { runPushNotificationJob } = require('../src/jobs/pushNotificationJob');

const API_URL = 'http://localhost:3000/api';

async function runTests() {
    console.log('Starting FCM Alert Push Notification Integration Tests...\n');
    let superAdminToken = '';
    let staffToken = '';
    let locationId = null;
    let deviceId = null;
    let staffUserId = null;
    let feedId = null;

    try {
        await poolConnect;

        // Pre-test cleanup of leftover mock data from previous failed runs
        await pool.request().query(`
            DELETE FROM user_fcm_tokens WHERE user_id IN (SELECT id FROM users WHERE phone_number = '+919999999999');
            DELETE FROM users WHERE phone_number = '+919999999999';
            DELETE FROM devices WHERE serial_number = 'PUSH_TEST_NODE_01';
            DELETE FROM locations WHERE name = 'Push Test Wing';
            DELETE FROM tbl_DeviceFeedData WHERE node = 'PUSH_TEST_NODE_01';
        `);

        // 1. Super Admin Login
        console.log('Step 1: Super Admin Login');
        const loginRes = await fetch(`${API_URL}/super-admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@alertmonitor.com', password: 'Admin@123' })
        });
        const loginData = await loginRes.json();
        assert.strictEqual(loginRes.status, 200, 'Super Admin login should return 200');
        superAdminToken = loginData.data.accessToken;
        console.log('✓ Super Admin login successful.\n');

        // 2. Create Location for Test
        console.log('Step 2: Create Location');
        const createLocRes = await fetch(`${API_URL}/locations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${superAdminToken}`
            },
            body: JSON.stringify({
                name: 'Push Test Wing',
                address: 'Building C Floor 2',
                city: 'Mumbai',
                zip_code: '400001'
            })
        });
        const createLocData = await createLocRes.json();
        assert.strictEqual(createLocRes.status, 201, 'Create Location should return 201');
        locationId = createLocData.data.id;
        console.log(`✓ Location created. ID: ${locationId}\n`);

        // 3. Create Device
        console.log('Step 3: Create Device');
        const createDevRes = await fetch(`${API_URL}/devices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${superAdminToken}`
            },
            body: JSON.stringify({
                name: 'Test Panic Sensor',
                serial_number: 'PUSH_TEST_NODE_01',
                type: 'Panic Button',
                location_id: locationId
            })
        });
        const createDevData = await createDevRes.json();
        assert.strictEqual(createDevRes.status, 201, 'Create Device should return 201');
        deviceId = createDevData.data.id;
        console.log(`✓ Device registered. ID: ${deviceId}, Serial: PUSH_TEST_NODE_01\n`);

        // 4. Enroll Staff Member at Location
        console.log('Step 4: Enroll Staff User');
        const addStaffRes = await fetch(`${API_URL}/add-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${superAdminToken}`
            },
            body: JSON.stringify({
                name: 'Push Guard',
                phone_number: '9999999999',
                role: 'Security Guard',
                access_level: 'Level 1 (Critical)',
                location_id: locationId
            })
        });
        const addStaffData = await addStaffRes.json();
        assert.strictEqual(addStaffRes.status, 201, 'Enroll Staff should return 201');
        staffUserId = addStaffData.data.id;
        console.log(`✓ Staff user enrolled. User ID: ${staffUserId}\n`);

        // 5. Staff User OTP Login Flow
        console.log('Step 5: Staff User Login (OTP)');
        const sendOtpRes = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone_number: '9999999999' })
        });
        assert.strictEqual(sendOtpRes.status, 200, 'OTP request should return 200');

        const verifyOtpRes = await fetch(`${API_URL}/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone_number: '9999999999', otp: '1234' })
        });
        const verifyOtpData = await verifyOtpRes.json();
        assert.strictEqual(verifyOtpRes.status, 200, 'Verify OTP should return 200');
        staffToken = verifyOtpData.data.accessToken;
        console.log('✓ Staff logged in via OTP successfully.\n');

        // 6. Register FCM Token for Staff User
        console.log('Step 6: Register FCM Token');
        const saveFcmRes = await fetch(`${API_URL}/fcm-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${staffToken}`
            },
            body: JSON.stringify({
                fcm_token: 'mock_fcm_token_xyz_98765',
                device_type: 'android'
            })
        });
        const saveFcmData = await saveFcmRes.json();
        assert.strictEqual(saveFcmRes.status, 200, 'Save FCM token should return 200');
        assert.strictEqual(saveFcmData.status, true, 'Save FCM token status should be true');

        // Verify in DB
        const fcmCheckResult = await pool.request()
            .input('userId', sql.Int, staffUserId)
            .query('SELECT * FROM user_fcm_tokens WHERE user_id = @userId');
        assert.strictEqual(fcmCheckResult.recordset.length, 1, 'Should have exactly 1 token row in DB');
        assert.strictEqual(fcmCheckResult.recordset[0].fcm_token, 'mock_fcm_token_xyz_98765', 'FCM token in DB should match');
        console.log('✓ FCM token registered and verified in database.\n');

        // 7. Inject IoT Alert into tbl_DeviceFeedData
        console.log('Step 7: Inject Mock IoT Alert into tbl_DeviceFeedData');
        
        // Before inserting, let's set the tracker to the current MAX ID so we only scan this new alert
        const maxIdResult = await pool.request().query('SELECT MAX(Id) as max_id FROM tbl_DeviceFeedData');
        const preMaxId = maxIdResult.recordset[0].max_id || 0;
        
        await pool.request()
            .input('key_name', sql.NVarChar, 'last_feed_id')
            .input('last_id', sql.BigInt, preMaxId)
            .query(`
                UPDATE notification_tracker SET last_id = @last_id WHERE key_name = @key_name;
                IF @@ROWCOUNT = 0
                    INSERT INTO notification_tracker (key_name, last_id) VALUES (@key_name, @last_id);
            `);

        // Now insert the alert
        const insertFeedResult = await pool.request()
            .input('node', sql.NVarChar, 'PUSH_TEST_NODE_01')
            .input('ev', sql.NVarChar, 'fall')
            .input('msg', sql.NVarChar, 'Man down fall detected')
            .input('status', sql.NVarChar, 'Alert')
            .query(`
                INSERT INTO tbl_DeviceFeedData (node, ev, msg, status, Ts_date, Insertdate)
                VALUES (@node, @ev, @msg, @status, GETDATE(), GETDATE());
                SELECT SCOPE_IDENTITY() as id;
            `);
        feedId = insertFeedResult.recordset[0].id;
        console.log(`✓ IoT alert injected successfully. Feed ID: ${feedId}\n`);

        // 8. Run Push Notification Background Job Manually
        console.log('Step 8: Run Push Notification Worker Job');
        // Capture console output during job execution
        const originalLog = console.log;
        let logs = [];
        console.log = function(...args) {
            logs.push(args.join(' '));
            originalLog.apply(console, args);
        };

        try {
            await runPushNotificationJob();
        } finally {
            console.log = originalLog;
        }

        // Verify the job logic succeeded
        const mockLogFound = logs.some(log => log.includes('[MOCK FCM] Sending push alert to 1 token(s)') && log.includes('mock_fcm_token_xyz_98765'));
        assert.ok(mockLogFound, 'Should log FCM mock sending for the target guard token');

        // Check if tracker was updated
        const trackerCheckResult = await pool.request()
            .input('key_name', sql.NVarChar, 'last_feed_id')
            .query('SELECT last_id FROM notification_tracker WHERE key_name = @key_name');
        assert.ok(Number(trackerCheckResult.recordset[0].last_id) >= feedId, 'Tracker should be updated to or past the processed feedId');
        console.log('\n✓ Push Notification Worker processed and sent alert successfully.\n');

        // 9. Remove FCM Token API Test
        console.log('Step 9: Remove/Delete FCM Token');
        const deleteFcmRes = await fetch(`${API_URL}/fcm-token`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${staffToken}`
            },
            body: JSON.stringify({
                fcm_token: 'mock_fcm_token_xyz_98765'
            })
        });
        const deleteFcmData = await deleteFcmRes.json();
        assert.strictEqual(deleteFcmRes.status, 200, 'Delete FCM token should return 200');
        assert.strictEqual(deleteFcmData.status, true, 'Delete FCM token status should be true');

        // Verify in DB
        const fcmCheckResultPostDelete = await pool.request()
            .input('userId', sql.Int, staffUserId)
            .query('SELECT * FROM user_fcm_tokens WHERE user_id = @userId');
        assert.strictEqual(fcmCheckResultPostDelete.recordset.length, 0, 'Should have 0 tokens in DB post delete');
        console.log('✓ FCM token unregistration verified successfully.\n');

        console.log('🎉 All integration tests passed successfully!');

    } catch (err) {
        console.error('\n❌ Integration tests failed:', err);
        process.exit(1);
    } finally {
        // Clean up test data from DB
        console.log('\nCleaning up test database records...');
        try {
            if (feedId) {
                await pool.request().input('id', sql.Int, feedId).query('DELETE FROM tbl_DeviceFeedData WHERE Id = @id');
            }
            if (staffUserId) {
                await pool.request().input('id', sql.Int, staffUserId).query('DELETE FROM user_fcm_tokens WHERE user_id = @id');
                await pool.request().input('id', sql.Int, staffUserId).query('DELETE FROM users WHERE id = @id');
            }
            if (deviceId) {
                await pool.request().input('id', sql.Int, deviceId).query('DELETE FROM devices WHERE id = @id');
            }
            if (locationId) {
                await pool.request().input('id', sql.Int, locationId).query('DELETE FROM locations WHERE id = @id');
            }
            console.log('Cleanup finished.');
        } catch (cleanupErr) {
            console.error('Error during cleanup:', cleanupErr);
        }
        process.exit(0);
    }
}

// Run test if called directly
runTests();
