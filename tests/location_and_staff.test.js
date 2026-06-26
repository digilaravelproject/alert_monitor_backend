const assert = require('assert');

const API_URL = 'http://localhost:3000/api';

async function runTests() {
    console.log('Starting Location and Staff Integration Tests...');
    let token = '';
    let locationId = null;
    let staffId = null;

    try {
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
        console.log('✓ Login successful. Token obtained.');

        // 2. Create Location
        console.log('\nTesting 2: Create Location');
        const createLocRes = await fetch(`${API_URL}/locations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'Corporate HQ Noida',
                address: 'Plot 45, Sector 62',
                city: 'Noida',
                zip_code: '201301'
            })
        });
        const createLocData = await createLocRes.json();
        assert.strictEqual(createLocRes.status, 201, 'Create Location response should be 201');
        assert.strictEqual(createLocData.status, true, 'Location creation should succeed');
        assert.ok(createLocData.data.id, 'Created location should have an ID');
        locationId = createLocData.data.id;
        console.log(`✓ Location created successfully. ID: ${locationId}`);

        // 3. Location list with sites, nodes, and live count
        console.log('\nTesting 3: Location List & Stats');
        const listLocRes = await fetch(`${API_URL}/locations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const listLocData = await listLocRes.json();
        assert.strictEqual(listLocRes.status, 200, 'List Locations response should be 200');
        assert.strictEqual(listLocData.status, true, 'Listing locations should succeed');
        assert.ok(listLocData.counts, 'Response should contain counts');
        assert.ok(listLocData.counts.sites >= 1, 'Total locations count should be at least 1');
        assert.ok(listLocData.data.length >= 1, 'Locations data array should have at least 1 element');
        console.log(`✓ List locations successful. Sites: ${listLocData.counts.sites}, Nodes: ${listLocData.counts.nodes}, Live: ${listLocData.counts.live}`);

        // 4. Search Location
        console.log('\nTesting 4: Search Location');
        const searchLocRes = await fetch(`${API_URL}/locations/search?query=Noida`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const searchLocData = await searchLocRes.json();
        assert.strictEqual(searchLocRes.status, 200, 'Search Locations response should be 200');
        assert.ok(searchLocData.data.length >= 1, 'Search results should return Noida location');
        console.log(`✓ Search successful. Found ${searchLocData.data.length} locations.`);

        // 5. Get Location by ID
        console.log('\nTesting 5: Get Location by ID');
        const getLocRes = await fetch(`${API_URL}/locations/${locationId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const getLocData = await getLocRes.json();
        assert.strictEqual(getLocRes.status, 200, 'Get Location by ID response should be 200');
        assert.strictEqual(getLocData.data.name, 'Corporate HQ Noida', 'Name should match');
        console.log('✓ Retrieve location by ID successful.');

        // 6. Update Location
        console.log('\nTesting 6: Update Location');
        const updateLocRes = await fetch(`${API_URL}/locations/${locationId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'Corporate HQ Noida Updated',
                address: 'Plot 45, Sector 62, Block C',
                city: 'Noida',
                zip_code: '201309'
            })
        });
        const updateLocData = await updateLocRes.json();
        assert.strictEqual(updateLocRes.status, 200, 'Update Location response should be 200');
        assert.strictEqual(updateLocData.data.name, 'Corporate HQ Noida Updated', 'Name should be updated');
        console.log('✓ Location updated successfully.');

        // 7. Toggle Location Status
        console.log('\nTesting 7: Toggle Location Status');
        const toggleRes = await fetch(`${API_URL}/locations/${locationId}/toggle`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const toggleData = await toggleRes.json();
        assert.strictEqual(toggleRes.status, 200, 'Toggle response should be 200');
        assert.strictEqual(toggleData.is_active, false, 'Location should become inactive');
        
        // Toggle it back to active so staff can be enrolled
        const toggleBackRes = await fetch(`${API_URL}/locations/${locationId}/toggle`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const toggleBackData = await toggleBackRes.json();
        assert.strictEqual(toggleBackData.is_active, true, 'Location should become active again');
        console.log('✓ Location status toggled successfully.');

        // 8. Enroll Staff (using Location ID)
        console.log('\nTesting 8: Enroll Staff with Location ID');
        const enrollRes = await fetch(`${API_URL}/add-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'John Test Guard',
                phone_number: '9999911111',
                role: 'Security Guard',
                access_level: 'Level 1 (Critical)',
                location_id: locationId
            })
        });
        const enrollData = await enrollRes.json();
        assert.strictEqual(enrollRes.status, 201, 'Enroll Staff response should be 201');
        assert.ok(enrollData.data.id, 'Staff should have an ID');
        staffId = enrollData.data.id;
        console.log(`✓ Staff enrolled successfully. ID: ${staffId}`);

        // 9. Get staff details and verify location data object
        console.log('\nTesting 9: Get Staff Details and Verify Location Data');
        const staffListRes = await fetch(`${API_URL}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const staffListData = await staffListRes.json();
        const enrolledStaff = staffListData.data.find(u => u.id === staffId);
        assert.ok(enrolledStaff, 'Enrolled staff should be in the users list');
        assert.ok(enrolledStaff.location, 'Staff location property should be defined');
        assert.strictEqual(enrolledStaff.location.id, locationId, 'Location ID should match');
        assert.strictEqual(enrolledStaff.location.name, 'Corporate HQ Noida Updated', 'Location name should match');
        console.log('✓ Staff location object validated successfully:');
        console.log(JSON.stringify(enrolledStaff.location, null, 2));

        // 10. Clean up / Delete Staff
        console.log('\nCleaning up: Delete Staff');
        const deleteStaffRes = await fetch(`${API_URL}/staff/${staffId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        assert.strictEqual(deleteStaffRes.status, 200, 'Delete staff should succeed');
        console.log('✓ Staff deleted.');

        // 11. Delete Location
        console.log('\nCleaning up: Delete Location');
        const deleteLocRes = await fetch(`${API_URL}/locations/${locationId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        assert.strictEqual(deleteLocRes.status, 200, 'Delete location should succeed');
        console.log('✓ Location deleted.');

        console.log('\n✓ All integration tests passed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('\n✗ Integration test failed:', err);
        process.exit(1);
    }
}

runTests();
