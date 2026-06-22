const jwt = require('jsonwebtoken');
const env = require('../config/env');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({
            status: false,
            error: 'Access token is required'
        });
    }

    jwt.verify(token, env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                status: false,
                error: 'Invalid or expired access token'
            });
        }
        req.user = user;
        next();
    });
};

module.exports = {
    authenticateToken
};
