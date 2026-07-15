const assert = require('assert');

const API_URL = 'http://localhost:3000/api';

async function runTests() {
    console.log('Starting Revised Report API HTTP Tests...');
    let token = '';

    try {
        // 1. Super Admin Login
        console.log('Logging in as Super Admin...');
        const loginRes = await fetch(`${API_URL}/super-admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@alertmonitor.com', password: 'Admin@123' })
        });
        const loginData = await loginRes.json();
        assert.strictEqual(loginRes.status, 200, 'Login response should be 200');
        token = loginData.data.accessToken;
        console.log('✓ Login successful.');

        // 2. Test Get Overview (API 1)
        console.log('\nTesting GET /reports (Overview dashboard)...');
        const overviewRes = await fetch(`${API_URL}/reports`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const overviewData = await overviewRes.json();
        console.log('Overview response:', JSON.stringify(overviewData, null, 2));
        assert.strictEqual(overviewRes.status, 200);
        assert.strictEqual(overviewData.status, true);
        assert.ok(overviewData.counts !== undefined);
        assert.ok(overviewData.weekly_trends !== undefined);
        assert.ok(Array.isArray(overviewData.reports));
        assert.ok(overviewData.reports.length > 0);
        
        // Check report link structure
        const firstReport = overviewData.reports[0];
        console.log('First report example:', firstReport);
        assert.ok(firstReport.pdf_link.includes('pdf=true'));

        // 3. Test Filter Reports (API 2)
        console.log('\nTesting GET /reports/filter...');
        const filterRes = await fetch(`${API_URL}/reports/filter?limit=2`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const filterData = await filterRes.json();
        console.log('Filter response:', JSON.stringify(filterData, null, 2));
        assert.strictEqual(filterRes.status, 200);
        assert.strictEqual(filterData.status, true);
        assert.ok(filterData.total !== undefined);
        assert.ok(Array.isArray(filterData.data));

        // 4. Test Download PDF Report (via overview link)
        const targetPdfLink = `${API_URL}${firstReport.pdf_link.replace('/api', '')}`;
        console.log(`\nTesting PDF serving via overview link: ${targetPdfLink}...`);
        const pdfRes = await fetch(targetPdfLink, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('PDF response status:', pdfRes.status);
        console.log('PDF response Content-Type:', pdfRes.headers.get('content-type'));
        assert.strictEqual(pdfRes.status, 200);
        assert.strictEqual(pdfRes.headers.get('content-type'), 'application/pdf');

        console.log('\n✓ All HTTP Report API tests passed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('API Test failed:', err);
        process.exit(1);
    }
}

runTests();
