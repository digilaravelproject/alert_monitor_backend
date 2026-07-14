const validateAddComityMembers = (req, res, next) => {
    const { user_ids } = req.body;
    const errors = [];

    if (user_ids === undefined || user_ids === null) {
        errors.push('user_ids is required');
    } else {
        // If it's a single value, normalize to array
        let ids = user_ids;
        if (!Array.isArray(user_ids)) {
            ids = [user_ids];
        }

        if (ids.length === 0) {
            errors.push('At least one user ID must be provided');
        } else {
            const invalidIds = ids.filter(id => isNaN(parseInt(id, 10)));
            if (invalidIds.length > 0) {
                errors.push('All user IDs must be valid integers');
            } else {
                // Attach normalized IDs to req.body.normalizedUserIds for controller convenience
                req.body.normalizedUserIds = ids.map(id => parseInt(id, 10));
            }
        }
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
    validateAddComityMembers
};
