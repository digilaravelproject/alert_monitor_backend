const assert = require('assert');
const { sql, pool, poolConnect } = require('../src/config/database');

const API_URL = 'http://localhost:3000/api';

async function runTests() {
    console.log('Starting Devices and Alerts Integration Tests...');
    let token = '';
    let locationId = null;
    let deviceId = null;
    let feedId = null;

    try {
        await poolConnect;

        // 1. Super Admin Login
        console.log('\nTesting 1: Super Admin Login');
        const loginRes = await fetch(`${API_URL}/super-admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@alertmonitor.com', password: 'Admin@123' })
        });
        const loginData = await loginRes.json();
        assert.strictEqual(loginRes.status, 200, 'Login response should be 200');
        assert.strictEqual(loginData.status, true, 'Login should succeed');
        token = loginData.data.accessToken;
        console.log('✓ Login successful.');

        // 2. Create Location for Device
        console.log('\nTesting 2: Create Location');
        const createLocRes = await fetch(`${API_URL}/locations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'Device Test Wing',
                address: 'Main Gate Block A',
                city: 'Noida',
                zip_code: '201301'
            })
        });
        const createLocData = await createLocRes.json();
        assert.strictEqual(createLocRes.status, 201, 'Create Location should return 201');
        locationId = createLocData.data.id;
        console.log(`✓ Location created. ID: ${locationId}`);

        // 3. Create Device
        console.log('\nTesting 3: Create Device (Register)');
        const createDevRes = await fetch(`${API_URL}/devices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'Main Lobby SOS Button',
                serial_number: 'TESTNODE01',
                type: 'Panic Button',
                location_id: locationId
            })
        });
        const createDevData = await createDevRes.json();
        assert.strictEqual(createDevRes.status, 201, 'Create Device should return 201');
        assert.strictEqual(createDevData.status, true, 'Device creation should succeed');
        deviceId = createDevData.data.id;
        console.log(`✓ Device registered. ID: ${deviceId}, Serial: TESTNODE01`);

        // 4. Get Device Types
        console.log('\nTesting 4: Get Device Types');
        const typesRes = await fetch(`${API_URL}/devices/types`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const typesData = await typesRes.json();
        assert.strictEqual(typesRes.status, 200, 'Get types should return 200');
        assert.ok(typesData.data.includes('Panic Button'), 'Device types should include Panic Button');
        console.log('✓ Get device types successful.');

        // 5. Get Alert Data (Initial - No Alerts)
        console.log('\nTesting 5: Get Alert Data (Device List & Counts) - Initial State');
        const alertsRes = await fetch(`${API_URL}/alerts?type=Panic Button`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const alertsData = await alertsRes.json();
        assert.strictEqual(alertsRes.status, 200, 'Get Alerts should return 200');
        assert.ok(alertsData.counts.total >= 1, 'Total counts should be at least 1');
        assert.ok(alertsData.counts.active >= 1, 'Active counts should be at least 1');
        
        const testDev = alertsData.data.find(d => d.id === deviceId);
        assert.ok(testDev, 'Our test device should be in list');
        assert.strictEqual(testDev.new_alert, 0, 'Initial alert state should be 0');
        assert.strictEqual(testDev.status, 'ACTIVE', 'Initial status should be ACTIVE');
        console.log(`✓ Alerts status verified. New Alert: ${testDev.new_alert}, Status: ${testDev.status}`);

        // 6. Simulate Incoming IoT Alert in tbl_DeviceFeedData
        console.log('\nTesting 6: Inject IoT Alert Payload into tbl_DeviceFeedData');
        const feedInsertRes = await pool.request()
            .input('node', sql.VarChar, 'TESTNODE01')
            .input('ev', sql.VarChar, 'panic')
            .input('fw_ver', sql.VarChar, '1.0.0')
            .input('mic_db', sql.Decimal(10, 2), 1.0)
            .input('bat_pct', sql.BigInt, 88)
            .input('bat_v', sql.Decimal(10, 2), 3.92)
            .input('charging', sql.Bit, 0)
            .input('err', sql.BigInt, 0)
            .input('msg', sql.VarChar, 'Panic pressed')
            .input('status', sql.VarChar, 'Online')
            .query(`
                INSERT INTO tbl_DeviceFeedData (ts, Ts_date, node, ev, fw_ver, x, y, spd, mov, fall, mic_db, rssi, bat_v, bat_pct, charging, err, msg, status, Insertdate)
                OUTPUT INSERTED.Id
                VALUES (1778508842, GETDATE(), @node, @ev, @fw_ver, 0, 0, 0, 0, 0, @mic_db, 0, @bat_v, @bat_pct, @charging, @err, @msg, @status, GETDATE())
            `);
        feedId = feedInsertRes.recordset[0].Id;
        console.log(`✓ Simulated alert payload inserted. Feed ID: ${feedId}`);

        // 7. Verify Alert Status (Alert is Active)
        console.log('\nTesting 7: Fetch Alerts & Verify Active Alert Status');
        const activeAlertsRes = await fetch(`${API_URL}/alerts?type=Panic Button`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const activeAlertsData = await activeAlertsRes.json();
        const activeTestDev = activeAlertsData.data.find(d => d.id === deviceId);
        assert.ok(activeTestDev, 'Our test device should be in list');
        assert.strictEqual(activeTestDev.new_alert, 1, 'Alert state should now be 1');
        assert.strictEqual(activeTestDev.status, 'ACTIVE ALERT', 'Status should be ACTIVE ALERT');
        assert.strictEqual(activeTestDev.battery_percentage, 88, 'Battery percentage should be updated to 88%');
        console.log(`✓ Alert verified: new_alert = ${activeTestDev.new_alert}, status = ${activeTestDev.status}, battery = ${activeTestDev.battery_percentage}%`);

        // 8. Search Devices
        console.log('\nTesting 8: Search Devices API');
        const searchRes = await fetch(`${API_URL}/devices/search?query=Lobby`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const searchData = await searchRes.json();
        assert.strictEqual(searchRes.status, 200, 'Search should return 200');
        const searchedDev = searchData.data.find(d => d.id === deviceId);
        assert.ok(searchedDev, 'Device should be found in search results');
        console.log('✓ Device search successful.');

        // 9. Toggle Device Status (Deactivate)
        console.log('\nTesting 9: Toggle Device Status (Activate/Deactivate)');
        const toggleRes = await fetch(`${API_URL}/devices/${deviceId}/toggle`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const toggleData = await toggleRes.json();
        assert.strictEqual(toggleRes.status, 200, 'Toggle should return 200');
        assert.strictEqual(toggleData.is_active, false, 'Device should become inactive');
        
        // Fetch to confirm counts and status updated
        const toggledAlertsRes = await fetch(`${API_URL}/alerts?type=Panic Button`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const toggledAlertsData = await toggledAlertsRes.json();
        const toggledDev = toggledAlertsData.data.find(d => d.id === deviceId);
        assert.strictEqual(toggledDev.status, 'DEACTIVE', 'Status of deactivated device should be DEACTIVE');
        console.log(`✓ Device status toggled. is_active = ${toggledDev.is_active}, status = ${toggledDev.status}`);

        // 10. Get Device By ID & Update Device Details
        console.log('\nTesting 10: Get Device by ID & Update Device');
        const getDevRes = await fetch(`${API_URL}/devices/${deviceId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const getDevData = await getDevRes.json();
        assert.strictEqual(getDevRes.status, 200, 'Get by ID should return 200');
        assert.strictEqual(getDevData.data.name, 'Main Lobby SOS Button', 'Name should match');

        const updateDevRes = await fetch(`${API_URL}/devices/${deviceId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'Lobby SOS Button Updated',
                serial_number: 'TESTNODE01',
                type: 'Panic Button',
                location_id: locationId
            })
        });
        const updateDevData = await updateDevRes.json();
        assert.strictEqual(updateDevRes.status, 200, 'Update should return 200');
        assert.strictEqual(updateDevData.data.name, 'Lobby SOS Button Updated', 'Updated name should match');
        console.log('✓ Get by ID and Update successful.');

        // 11. Remove Alert (Dismiss Alert)
        console.log('\nTesting 11: Remove Alert API');
        const removeAlertRes = await fetch(`${API_URL}/devices/${deviceId}/remove-alert`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const removeAlertData = await removeAlertRes.json();
        assert.strictEqual(removeAlertRes.status, 200, 'Remove alert should return 200');
        assert.strictEqual(removeAlertData.status, true, 'Dismissal should succeed');

        // Fetch to verify alert is gone
        const dismissedRes = await fetch(`${API_URL}/alerts?type=Panic Button`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const dismissedData = await dismissedRes.json();
        const dismissedDev = dismissedData.data.find(d => d.id === deviceId);
        assert.strictEqual(dismissedDev.new_alert, 0, 'Alert state should be back to 0');
        console.log(`✓ Alert dismissed successfully. new_alert = ${dismissedDev.new_alert}`);

        // Toggle back to active to check final green badge status
        await fetch(`${API_URL}/devices/${deviceId}/toggle`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const finalRes = await fetch(`${API_URL}/alerts?type=Panic Button`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const finalData = await finalRes.json();
        const finalDev = finalData.data.find(d => d.id === deviceId);
        assert.strictEqual(finalDev.status, 'ACTIVE', 'Status should return to ACTIVE');
        console.log(`✓ Device toggled back to active. Final badge status: ${finalDev.status}`);

        console.log('\n✓ All integration tests passed successfully!');
    } catch (err) {
        console.error('\n✗ Integration test failed:', err);
    } finally {
        // Cleanup test data
        console.log('\nCleaning up database test records...');
        if (feedId) {
            await pool.request().input('feedId', sql.BigInt, feedId).query('DELETE FROM dismissed_alerts WHERE feed_id = @feedId');
            await pool.request().input('feedId', sql.BigInt, feedId).query('DELETE FROM tbl_DeviceFeedData WHERE Id = @feedId');
        }
        if (deviceId) {
            await pool.request().input('deviceId', sql.Int, deviceId).query('DELETE FROM devices WHERE id = @deviceId');
        }
        if (locationId) {
            await pool.request().input('locationId', sql.Int, locationId).query('DELETE FROM locations WHERE id = @locationId');
        }
        console.log('✓ Cleanup completed.');
        process.exit(0);
    }
}

runTests();
