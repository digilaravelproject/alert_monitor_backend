/**
 * Normalize phone number to format '+91' + last 10 digits
 * @param {string} phone 
 * @returns {string}
 */
const normalizePhoneNumber = (phone) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    return '+91' + digits.slice(-10);
};

/**
 * Extract last 10 digits of a phone number
 * @param {string} phone 
 * @returns {string}
 */
const extractTenDigits = (phone) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    return digits.slice(-10);
};

module.exports = {
    normalizePhoneNumber,
    extractTenDigits
};
