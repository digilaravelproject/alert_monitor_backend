const assert = require('assert');
const helper = require('../src/utils/helper');

console.log('Starting Alert Monitor Test Suite...');

try {
    // 1. Test phone number normalization
    console.log('Test 1: Normalizing 10 digit number');
    const normalized1 = helper.normalizePhoneNumber('9876543210');
    assert.strictEqual(normalized1, '+919876543210', 'Should prepend +91 to 10 digits');

    console.log('Test 2: Normalizing formatted phone number');
    const normalized2 = helper.normalizePhoneNumber('+91 98765-43210');
    assert.strictEqual(normalized2, '+919876543210', 'Should normalize formatted numbers to +91 followed by last 10 digits');

    // 2. Test ten digit extraction
    console.log('Test 3: Extracting 10 digits from raw format');
    const extracted = helper.extractTenDigits('+91 98765-43210');
    assert.strictEqual(extracted, '9876543210', 'Should extract only the numeric 10 digits');

    console.log('✓ All unit tests passed successfully!');
} catch (error) {
    console.error('✗ Unit test suite failed:', error.message);
    process.exit(1);
}
