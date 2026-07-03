const homepageRepository = require('../src/repositories/homepageRepository');

async function runTest() {
    try {
        console.log('Testing homepageRepository.getHomepageData for Super Admin...');
        const superAdminData = await homepageRepository.getHomepageData(null, true);
        console.log('Super Admin Result:');
        console.log(JSON.stringify(superAdminData, null, 2));

        console.log('\nTesting homepageRepository.getHomepageData for Admin with ID 1...');
        const adminData = await homepageRepository.getHomepageData(1, false);
        console.log('Admin Result:');
        console.log(JSON.stringify(adminData, null, 2));

        console.log('\n✓ Homepage queries tested successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    }
}

runTest();
