const validateCreateDevice = (req, res, next) => {
    const { name, serial_number, type, location_id } = req.body;
    const errors = [];

    if (!name || typeof name !== 'string' || name.trim() === '') {
        errors.push('Device name is required');
    }
    if (!serial_number || typeof serial_number !== 'string' || serial_number.trim() === '') {
        errors.push('Device serial number/ID is required');
    }
    if (!type || typeof type !== 'string' || type.trim() === '') {
        errors.push('Device type is required');
    }
    if (location_id === undefined || location_id === null || (typeof location_id !== 'string' && typeof location_id !== 'number') || (typeof location_id === 'string' && location_id.trim() === '') || isNaN(parseInt(location_id, 10))) {
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

const validateUpdateDevice = (req, res, next) => {
    const { name, serial_number, type, location_id } = req.body;
    const errors = [];

    if (!name || typeof name !== 'string' || name.trim() === '') {
        errors.push('Device name is required');
    }
    if (!serial_number || typeof serial_number !== 'string' || serial_number.trim() === '') {
        errors.push('Device serial number/ID is required');
    }
    if (!type || typeof type !== 'string' || type.trim() === '') {
        errors.push('Device type is required');
    }
    if (location_id === undefined || location_id === null || (typeof location_id !== 'string' && typeof location_id !== 'number') || (typeof location_id === 'string' && location_id.trim() === '') || isNaN(parseInt(location_id, 10))) {
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

module.exports = {
    validateCreateDevice,
    validateUpdateDevice
};
