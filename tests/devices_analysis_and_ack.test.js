const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { sql, pool, poolConnect } = require('../src/config/database');

const API_URL = 'http://localhost:3000/api';

async function runTests() {
    console.log('Starting Devices Analysis and Acknowledgment Integration Tests...');
    let token = '';
    let locationId = null;
    let deviceId = null;
    let feedId1 = null;
    let feedId2 = null;
    let createdPdfPaths = [];

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

        // 2. Create Location
        console.log('\nTesting 2: Create Location');
        const createLocRes = await fetch(`${API_URL}/locations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'Analysis Test Wing',
                address: 'Building 4B Room 2',
                city: 'Pune',
                zip_code: '411001'
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
                name: 'Server Room Temp Alert Sensor',
                serial_number: 'TESTNODE_ANALYSIS',
                type: 'Panic Button',
                location_id: locationId
            })
        });
        const createDevData = await createDevRes.json();
        assert.strictEqual(createDevRes.status, 201, 'Create Device should return 201');
        assert.strictEqual(createDevData.status, true, 'Device creation should succeed');
        deviceId = createDevData.data.id;
        console.log(`✓ Device registered. ID: ${deviceId}, Serial: TESTNODE_ANALYSIS`);

        // 4. Inject First IoT Alert Payload
        console.log('\nTesting 4: Inject First Alert Feed into tbl_DeviceFeedData');
        const feedInsert1 = await pool.request()
            .input('node', sql.VarChar, 'TESTNODE_ANALYSIS')
            .input('ev', sql.VarChar, 'panic')
            .input('msg', sql.VarChar, 'Panic pressed in server room')
            .input('insertDate', sql.DateTime, new Date())
            .query(`
                INSERT INTO tbl_DeviceFeedData (node, ev, msg, Insertdate, bat_pct)
                OUTPUT INSERTED.Id
                VALUES (@node, @ev, @msg, @insertDate, 88)
            `);
        feedId1 = feedInsert1.recordset[0].Id;
        console.log(`✓ First alert feed inserted. Feed ID: ${feedId1}`);

        // 5. Inject Second IoT Alert Payload
        console.log('\nTesting 5: Inject Second Alert Feed');
        const feedInsert2 = await pool.request()
            .input('node', sql.VarChar, 'TESTNODE_ANALYSIS')
            .input('ev', sql.VarChar, 'panic')
            .input('msg', sql.VarChar, 'Panic pressed twice in server room')
            .input('insertDate', sql.DateTime, new Date())
            .query(`
                INSERT INTO tbl_DeviceFeedData (node, ev, msg, Insertdate, bat_pct)
                OUTPUT INSERTED.Id
                VALUES (@node, @ev, @msg, @insertDate, 87)
            `);
        feedId2 = feedInsert2.recordset[0].Id;
        console.log(`✓ Second alert feed inserted. Feed ID: ${feedId2}`);

        // 6. Get Device Alerts List API
        console.log('\nTesting 6: GET Device Alerts List');
        const alertsListRes = await fetch(`${API_URL}/devices/${deviceId}/alerts`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const alertsListData = await alertsListRes.json();
        assert.strictEqual(alertsListRes.status, 200, 'Get alerts should return 200');
        assert.strictEqual(alertsListData.status, true, 'Get alerts status should be true');
        assert.strictEqual(alertsListData.data.alerts.length, 2, 'There should be 2 alerts in list');
        assert.strictEqual(alertsListData.data.alerts[1].id.toString(), feedId1.toString(), 'Should contain feedId1');
        assert.strictEqual(alertsListData.data.alerts[0].id.toString(), feedId2.toString(), 'Should contain feedId2');
        console.log('✓ Successfully retrieved device alerts list and verified contents.');

        // 7. Acknowledge alert 1 by Feed ID API
        console.log('\nTesting 7: POST Acknowledge Alert 1 by Feed ID');
        const ackFeedRes = await fetch(`${API_URL}/alerts/${feedId1}/acknowledge`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const ackFeedData = await ackFeedRes.json();
        assert.strictEqual(ackFeedRes.status, 200, 'Acknowledge by Feed ID should return 200');
        assert.strictEqual(ackFeedData.status, true, 'Acknowledge by Feed ID status should succeed');
        
        // Verify via Device Alerts List API
        const alertsListRes2 = await fetch(`${API_URL}/devices/${deviceId}/alerts`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const alertsListData2 = await alertsListRes2.json();
        const alert1 = alertsListData2.data.alerts.find(a => a.id.toString() === feedId1.toString());
        assert.strictEqual(alert1.status, 'ACKNOWLEDGED', 'Alert 1 status should be ACKNOWLEDGED');
        console.log('✓ Acknowledged alert 1 successfully and verified status.');

        // 8. Fetch Analysis API for Alert 1 (passing Feed ID)
        console.log('\nTesting 8: GET Alert Analysis Data (passing Feed ID)');
        const analysisRes = await fetch(`${API_URL}/devices/${feedId1}/analysis`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const analysisData = await analysisRes.json();
        assert.strictEqual(analysisRes.status, 200, 'Get analysis should return 200');
        assert.strictEqual(analysisData.status, true, 'Analysis status should be true');
        
        const info = analysisData.data;
        assert.strictEqual(info.total_alerts, 1, 'Total alerts count should be 1');
        assert.ok(info.avg_response, 'Average response time should be calculated');
        assert.ok(info.uptime, 'Uptime should be calculated');
        assert.ok(info.pdf_url, 'PDF url should be returned');
        assert.ok(info.timeline.length > 0, 'Event timeline should contain events');
        
        console.log(`✓ Analysis data: Total alerts: ${info.total_alerts}, Response Time: ${info.avg_response}, Uptime: ${info.uptime}`);
        console.log(`✓ PDF URL: ${info.pdf_url}`);
        
        // Verify PDF file exists on disk
        const pdfFilePath = path.join(__dirname, '../public', info.pdf_url);
        createdPdfPaths.push(pdfFilePath);
        assert.ok(fs.existsSync(pdfFilePath), `PDF file should exist on disk at: ${pdfFilePath}`);
        assert.ok(fs.statSync(pdfFilePath).size > 0, 'PDF file size should be greater than 0');
        console.log('✓ Verified PDF report file is generated correctly and size is non-zero.');

        // 9. DELETE Device API
        console.log('\nTesting 9: DELETE Device');
        const deleteRes = await fetch(`${API_URL}/devices/${deviceId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const deleteData = await deleteRes.json();
        assert.strictEqual(deleteRes.status, 200, 'Delete device should return 200');
        assert.strictEqual(deleteData.status, true, 'Delete device status should succeed');
        console.log('✓ Device deleted successfully via API.');

        console.log('\n✓ All Devices Analysis and Acknowledgment integration tests passed successfully!');
    } catch (err) {
        console.error('\n✗ Integration test failed:', err);
        throw err;
    } finally {
        console.log('\nCleaning up database test records...');
        // Clean up acknowledged alerts
        if (feedId1) {
            await pool.request().input('feedId', sql.BigInt, feedId1).query('DELETE FROM acknowledged_alerts WHERE feed_id = @feedId');
            await pool.request().input('feedId', sql.BigInt, feedId1).query('DELETE FROM dismissed_alerts WHERE feed_id = @feedId');
            await pool.request().input('feedId', sql.BigInt, feedId1).query('DELETE FROM tbl_DeviceFeedData WHERE Id = @feedId');
        }
        if (feedId2) {
            await pool.request().input('feedId', sql.BigInt, feedId2).query('DELETE FROM acknowledged_alerts WHERE feed_id = @feedId');
            await pool.request().input('feedId', sql.BigInt, feedId2).query('DELETE FROM dismissed_alerts WHERE feed_id = @feedId');
            await pool.request().input('feedId', sql.BigInt, feedId2).query('DELETE FROM tbl_DeviceFeedData WHERE Id = @feedId');
        }
        // Clean up devices
        if (deviceId) {
            await pool.request().input('deviceId', sql.Int, deviceId).query('DELETE FROM devices WHERE id = @deviceId');
        }
        // Clean up locations
        if (locationId) {
            await pool.request().input('locationId', sql.Int, locationId).query('DELETE FROM locations WHERE id = @locationId');
        }
        
        // Clean up generated PDF files
        createdPdfPaths.forEach(filePath => {
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`✓ Deleted test PDF report: ${filePath}`);
                }
            } catch (err) {
                console.error(`Failed to delete test PDF report: ${filePath}`, err);
            }
        });
        
        console.log('✓ Database and filesystem cleanup completed.');
        process.exit(0);
    }
}

runTests();
