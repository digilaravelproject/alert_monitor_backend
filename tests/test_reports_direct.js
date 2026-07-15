const reportRepository = require('../src/repositories/reportRepository');
const comityRepository = require('../src/repositories/comityRepository');

async function testReports() {
    try {
        console.log('--- Testing comity active check ---');
        const isComityActive = await comityRepository.isUserActiveComityMember(1);
        console.log('Is user 1 active comity member:', isComityActive);

        console.log('--- Testing counts action ---');
        const counts = await reportRepository.getAlertsForCounts(null, true);
        console.log(`Retrieved ${counts.length} raw alerts for counts`);

        console.log('--- Testing trends action ---');
        const trends = await reportRepository.getAlertsForTrends(null, true);
        console.log(`Retrieved ${trends.length} raw alerts for weekly trends`);

        console.log('--- Testing filter action ---');
        const filtered = await reportRepository.getFilteredAlerts(null, true, null, {
            type: 'Fire Detector',
            status: 'ACTIVE'
        });
        console.log(`Retrieved ${filtered.length} filtered alerts (Fire Detector, ACTIVE)`);
        
        console.log('All database repository tests passed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    }
}

testReports();
