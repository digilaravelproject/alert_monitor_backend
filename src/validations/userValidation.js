const validateAddOrUpdateUser = (req, res, next) => {
    const { name, phone_number, role, access_level, location } = req.body;
    const errors = [];

    if (!name || typeof name !== 'string' || name.trim() === '') {
        errors.push('Full name is required');
    }
    if (!phone_number || typeof phone_number !== 'string' || phone_number.trim() === '') {
        errors.push('Mobile number is required');
    } else {
        const digits = phone_number.replace(/\D/g, '');
        if (digits.length < 10) {
            errors.push('Mobile number must be a valid 10-digit number');
        }
    }
    if (role === undefined || role === null || (typeof role !== 'string' && typeof role !== 'number') || (typeof role === 'string' && role.trim() === '')) {
        errors.push('Role is required');
    }
    if (!access_level || typeof access_level !== 'string' || access_level.trim() === '') {
        errors.push('Access level is required');
    }
    if (!location || typeof location !== 'string' || location.trim() === '') {
        errors.push('Location is required');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            status: false,
            error: errors.join(', ')
        });
    }
    next();
};

const validateVerifyOtp = (req, res, next) => {
    const { phone_number, otp } = req.body;
    const errors = [];

    if (!phone_number || typeof phone_number !== 'string' || phone_number.trim() === '') {
        errors.push('Mobile number is required');
    }
    if (!otp || typeof otp !== 'string' || otp.trim() === '') {
        errors.push('OTP is required');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            status: false,
            error: errors.join(', ')
        });
    }
    next();
};

module.exports = {
    validateAddOrUpdateUser,
    validateVerifyOtp
};
