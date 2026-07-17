const assert = require('assert');
const { sql, pool, poolConnect } = require('../src/config/database');

const API_URL = 'http://localhost:3000/api';

async function runTests() {
    console.log('Starting Staff Permissions & Logout Integration Tests...');
    await poolConnect;

    let superAdminToken = '';
    let adminToken = '';
    let guardToken = '';

    let adminId = null;
    let locationId = null;
    let levelId = null;
    let customRoleId = null;
    let guardId = null;
    let subGuardId = null;
    let deviceId = null;

    try {
        // 1. Super Admin Login
        console.log('\nStep 1: Super Admin Login');
        const loginRes = await fetch(`${API_URL}/super-admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@alertmonitor.com', password: 'Admin@123' })
        });
        const loginData = await loginRes.json();
        assert.strictEqual(loginRes.status, 200, 'Super admin login should succeed');
        superAdminToken = loginData.data.accessToken;
        console.log('✓ Super Admin logged in.');

        // 2. Create Admin User using Super Admin
        console.log('\nStep 2: Create Admin User');
        // Check if old test admin exists and delete
        await pool.request().query("DELETE FROM users WHERE phone_number IN ('+919876500001', '+919876500002', '+919876500003')");
        
        const createAdminRes = await fetch(`${API_URL}/add-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${superAdminToken}`
            },
            body: JSON.stringify({
                name: 'Test Admin User',
                phone_number: '9876500001',
                role: 'Admin'
            })
        });
        const createAdminData = await createAdminRes.json();
        assert.strictEqual(createAdminRes.status, 201, 'Create Admin should succeed');
        adminId = createAdminData.data.id;
        console.log(`✓ Admin user created. ID: ${adminId}`);

        // 3. Login as Admin via OTP Flow
        console.log('\nStep 3: Login as Admin');
        const adminLoginRes = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone_number: '9876500001' })
        });
        assert.strictEqual(adminLoginRes.status, 200, 'Admin request OTP should succeed');

        const adminVerifyRes = await fetch(`${API_URL}/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone_number: '9876500001', otp: '1234' })
        });
        const adminVerifyData = await adminVerifyRes.json();
        assert.strictEqual(adminVerifyRes.status, 200, 'Admin OTP verification should succeed');
        adminToken = adminVerifyData.data.accessToken;
        console.log('✓ Admin logged in via OTP flow.');

        // 4. Create Location, Level, Role and Guard using Admin Token
        console.log('\nStep 4: Create resources using Admin Token');
        
        // Location
        const createLocRes = await fetch(`${API_URL}/locations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                name: 'Admin Test Branch',
                address: '456 Sector 15',
                city: 'Noida',
                zip_code: '201301'
            })
        });
        const createLocData = await createLocRes.json();
        assert.strictEqual(createLocRes.status, 201, 'Create Location should succeed');
        locationId = createLocData.data.id;
        console.log(`✓ Location created. ID: ${locationId}`);

        // Level
        const createLevelRes = await fetch(`${API_URL}/levels`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                name: 'Critical Level A',
                description: 'First level',
                sla_window: '5m',
                cycle_count: '3x',
                response_logic: 'Immediate',
                color: 'red'
            })
        });
        const createLevelData = await createLevelRes.json();
        assert.strictEqual(createLevelRes.status, 201, 'Create Level should succeed');
        levelId = createLevelData.data.id;
        console.log(`✓ Level created. ID: ${levelId}`);

        // Custom Role
        const createRoleRes = await fetch(`${API_URL}/roles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                name: 'Test Custom Guard',
                description: 'Custom guard role',
                permissions: [1, 2]
            })
        });
        const createRoleData = await createRoleRes.json();
        assert.strictEqual(createRoleRes.status, 201, 'Create Role should succeed');
        customRoleId = createRoleData.data.id;
        console.log(`✓ Custom Role created. ID: ${customRoleId}`);

        // Guard
        const createGuardRes = await fetch(`${API_URL}/add-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                name: 'Test Guard A',
                phone_number: '9876500002',
                role: 'Security Guard',
                access_level: 'Level 1 (Critical)',
                location_id: locationId
            })
        });
        const createGuardData = await createGuardRes.json();
        assert.strictEqual(createGuardRes.status, 201, 'Create Guard should succeed');
        guardId = createGuardData.data.id;
        console.log(`✓ Guard enrolled. ID: ${guardId}`);

        // 5. Login as Guard A via OTP Flow
        console.log('\nStep 5: Login as Guard A');
        const guardLoginRes = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone_number: '9876500002' })
        });
        assert.strictEqual(guardLoginRes.status, 200, 'Guard request OTP should succeed');

        const guardVerifyRes = await fetch(`${API_URL}/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone_number: '9876500002', otp: '1234' })
        });
        const guardVerifyData = await guardVerifyRes.json();
        assert.strictEqual(guardVerifyRes.status, 200, 'Guard OTP verification should succeed');
        guardToken = guardVerifyData.data.accessToken;
        console.log('✓ Guard A logged in.');

        // 6. Test Guard accessing Admin\'s resources
        console.log('\nStep 6: Guard accessing Admin\'s resources');
        
        // Locations
        const getLocsRes = await fetch(`${API_URL}/locations`, {
            headers: { 'Authorization': `Bearer ${guardToken}` }
        });
        const getLocsData = await getLocsRes.json();
        assert.strictEqual(getLocsRes.status, 200, 'Guard get locations should succeed');
        const foundLoc = getLocsData.data.find(l => l.id === locationId);
        assert.ok(foundLoc, 'Guard should see location created by Admin');
        console.log('✓ Guard retrieved Admin\'s locations successfully.');

        // Roles
        const getRolesRes = await fetch(`${API_URL}/roles`, {
            headers: { 'Authorization': `Bearer ${guardToken}` }
        });
        const getRolesData = await getRolesRes.json();
        assert.strictEqual(getRolesRes.status, 200, 'Guard get roles should succeed');
        const foundRole = getRolesData.data.find(r => r.id === customRoleId);
        assert.ok(foundRole, 'Guard should see custom role created by Admin');
        console.log('✓ Guard retrieved custom roles successfully.');

        // Levels
        const getLevelsRes = await fetch(`${API_URL}/levels`, {
            headers: { 'Authorization': `Bearer ${guardToken}` }
        });
        const getLevelsData = await getLevelsRes.json();
        assert.strictEqual(getLevelsRes.status, 200, 'Guard get levels should succeed');
        const foundLevel = getLevelsData.data.find(l => l.id === levelId);
        assert.ok(foundLevel, 'Guard should see custom level created by Admin');
        console.log('✓ Guard retrieved custom levels successfully.');

        // Staff listing
        const getStaffRes = await fetch(`${API_URL}/staff`, {
            headers: { 'Authorization': `Bearer ${guardToken}` }
        });
        const getStaffData = await getStaffRes.json();
        assert.strictEqual(getStaffRes.status, 200, 'Guard get staff should succeed');
        const foundGuard = getStaffData.data.find(s => s.id === guardId);
        assert.ok(foundGuard, 'Guard should see themselves in admin\'s staff list');
        console.log('✓ Guard retrieved staff listing successfully.');

        // 7. Guard creating device & sub-staff
        console.log('\nStep 7: Guard creating device & sub-staff');
        
        // Clean old device if exists
        await pool.request().query("DELETE FROM devices WHERE serial_number = 'GUARDNODE01'");

        const createDeviceRes = await fetch(`${API_URL}/devices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${guardToken}`
            },
            body: JSON.stringify({
                name: 'Guard SOS Trigger',
                serial_number: 'GUARDNODE01',
                type: 'Panic Button',
                location_id: locationId
            })
        });
        const createDeviceData = await createDeviceRes.json();
        assert.strictEqual(createDeviceRes.status, 201, 'Guard create device should succeed');
        deviceId = createDeviceData.data.id;
        console.log(`✓ Guard created device successfully. ID: ${deviceId}`);

        const createSubStaffRes = await fetch(`${API_URL}/add-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${guardToken}`
            },
            body: JSON.stringify({
                name: 'Sub Guard B',
                phone_number: '9876500003',
                role: 'Security Guard',
                access_level: 'Level 1 (Critical)',
                location_id: locationId
            })
        });
        const createSubStaffData = await createSubStaffRes.json();
        assert.strictEqual(createSubStaffRes.status, 201, 'Guard create sub-staff should succeed');
        subGuardId = createSubStaffData.data.id;
        console.log(`✓ Guard created sub-staff successfully. ID: ${subGuardId}`);

        // 8. Logout Guard A and verify token invalidation
        console.log('\nStep 8: Logout Guard A');
        const logoutRes = await fetch(`${API_URL}/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${guardToken}`
            }
        });
        assert.strictEqual(logoutRes.status, 200, 'Logout should succeed');
        console.log('✓ Logout successful.');

        console.log('\nStep 9: Access profile using logged-out token');
        const profileRes = await fetch(`${API_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${guardToken}` }
        });
        assert.strictEqual(profileRes.status, 401, 'Access using logged-out token should return 401 Unauthorized');
        const profileData = await profileRes.json();
        assert.strictEqual(profileData.status, false, 'Status should be false');
        assert.strictEqual(profileData.error, 'Token is logged out or expired', 'Should indicate token is logged out');
        console.log('✓ Verification successful! Logged-out token was correctly rejected.');

        console.log('\nAll integration tests passed successfully!');
    } catch (error) {
        console.error('\n✗ Integration tests failed:', error);
    } finally {
        console.log('\nCleaning up database records...');
        if (deviceId) {
            await pool.request().input('id', sql.Int, deviceId).query('DELETE FROM devices WHERE id = @id');
        }
        await pool.request().query("DELETE FROM users WHERE phone_number IN ('+919876500001', '+919876500002', '+919876500003')");
        if (levelId) {
            await pool.request().input('id', sql.Int, levelId).query('DELETE FROM levels WHERE id = @id');
        }
        if (customRoleId) {
            await pool.request().input('id', sql.Int, customRoleId).query('DELETE FROM role_permissions WHERE role_id = @id');
            await pool.request().input('id', sql.Int, customRoleId).query('DELETE FROM roles WHERE id = @id');
        }
        if (locationId) {
            await pool.request().input('id', sql.Int, locationId).query('DELETE FROM locations WHERE id = @id');
        }
        await pool.request().query('DELETE FROM blacklisted_tokens');
        console.log('Cleanup complete.');
        process.exit(0);
    }
}

runTests();
