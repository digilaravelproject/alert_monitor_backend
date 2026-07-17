const jwt = require('jsonwebtoken');
const env = require('../config/env');

const { pool, poolConnect } = require('../config/database');
const sql = require('mssql');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({
            status: false,
            error: 'Access token is required'
        });
    }

    try {
        await poolConnect;
        const result = await pool.request()
            .input('token', sql.NVarChar, token)
            .query('SELECT TOP 1 id FROM blacklisted_tokens WHERE token = @token');

        if (result.recordset.length > 0) {
            return res.status(401).json({
                status: false,
                error: 'Token is logged out or expired'
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
    } catch (error) {
        console.error('Authentication middleware error:', error);
        return res.status(500).json({
            status: false,
            error: 'Internal server error during authentication'
        });
    }
};

module.exports = {
    authenticateToken
};
