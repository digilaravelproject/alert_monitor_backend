const { sql, pool, poolConnect } = require('../config/database');

class FcmRepository {
    async saveToken(userId, fcmToken, deviceType = null) {
        await poolConnect;
        
        // 1. Check if token already exists for this user
        const existing = await pool.request()
            .input('userId', sql.Int, userId)
            .input('fcmToken', sql.NVarChar, fcmToken.trim())
            .query('SELECT TOP 1 id FROM user_fcm_tokens WHERE user_id = @userId AND fcm_token = @fcmToken');
        
        if (existing.recordset.length > 0) {
            // Update updated_at
            await pool.request()
                .input('id', sql.Int, existing.recordset[0].id)
                .query('UPDATE user_fcm_tokens SET updated_at = GETDATE() WHERE id = @id');
            return;
        }

        // 2. If this token is registered to any other user, remove it first (device changed users)
        await pool.request()
            .input('fcmToken', sql.NVarChar, fcmToken.trim())
            .query('DELETE FROM user_fcm_tokens WHERE fcm_token = @fcmToken');

        // 3. Insert new token
        await pool.request()
            .input('userId', sql.Int, userId)
            .input('fcmToken', sql.NVarChar, fcmToken.trim())
            .input('deviceType', sql.NVarChar, deviceType)
            .query(`
                INSERT INTO user_fcm_tokens (user_id, fcm_token, device_type, created_at, updated_at)
                VALUES (@userId, @fcmToken, @deviceType, GETDATE(), GETDATE())
            `);
    }

    async deleteToken(userId, fcmToken) {
        await poolConnect;
        await pool.request()
            .input('userId', sql.Int, userId)
            .input('fcmToken', sql.NVarChar, fcmToken.trim())
            .query('DELETE FROM user_fcm_tokens WHERE user_id = @userId AND fcm_token = @fcmToken');
    }

    async deleteTokens(fcmTokens) {
        if (!fcmTokens || fcmTokens.length === 0) return;
        await poolConnect;
        
        // Delete stale/invalid tokens one by one
        for (const token of fcmTokens) {
            await pool.request()
                .input('token', sql.NVarChar, token.trim())
                .query('DELETE FROM user_fcm_tokens WHERE fcm_token = @token');
        }
    }

    async getTokensForLocation(locationId, adminId = null) {
        await poolConnect;
        const request = pool.request()
            .input('locationId', sql.Int, locationId);
        
        let query = `
            SELECT DISTINCT t.fcm_token
            FROM user_fcm_tokens t
            INNER JOIN users u ON t.user_id = u.id
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN comity_members cm ON u.id = cm.user_id
            WHERE u.is_blocked = 0 
              AND (r.name = 'Admin' OR (cm.user_id IS NOT NULL AND cm.is_active = 1))
              AND (u.location_id = @locationId
        `;

        if (adminId) {
            query += ' OR u.id = @adminId';
            request.input('adminId', sql.Int, adminId);
        }

        query += ')';
        const result = await request.query(query);
        return result.recordset.map(row => row.fcm_token);
    }

    async getTokensForUsers(userIds) {
        if (!userIds || userIds.length === 0) return [];
        await poolConnect;
        
        const request = pool.request();
        let query = `
            SELECT DISTINCT fcm_token
            FROM user_fcm_tokens
            WHERE user_id IN (${userIds.map((id, i) => {
                request.input(`id_${i}`, sql.Int, id);
                return `@id_${i}`;
            }).join(', ')})
        `;
        const result = await request.query(query);
        return result.recordset.map(row => row.fcm_token);
    }

    async getTokensForAllAdmins() {
        await poolConnect;
        
        // Query non-blocked admin users' tokens
        const result = await pool.request().query(`
            SELECT DISTINCT t.fcm_token
            FROM user_fcm_tokens t
            INNER JOIN users u ON t.user_id = u.id
            INNER JOIN roles r ON u.role_id = r.id
            WHERE u.is_blocked = 0 AND r.name = 'Admin'
        `);
        return result.recordset.map(row => row.fcm_token);
    }

    async getAllTokens() {
        await poolConnect;
        const result = await pool.request().query(`
            SELECT DISTINCT t.fcm_token
            FROM user_fcm_tokens t
            INNER JOIN users u ON t.user_id = u.id
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN comity_members cm ON u.id = cm.user_id
            WHERE u.is_blocked = 0
              AND (r.name = 'Admin' OR (cm.user_id IS NOT NULL AND cm.is_active = 1))
        `);
        return result.recordset.map(row => row.fcm_token);
    }
}

module.exports = new FcmRepository();
