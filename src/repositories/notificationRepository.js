const { sql, pool, poolConnect } = require('../config/database');

class NotificationRepository {
    async create({ title, message, is_active }) {
        await poolConnect;
        const result = await pool.request()
            .input('title', sql.NVarChar, title.trim())
            .input('message', sql.NVarChar, message.trim())
            .input('is_active', sql.Bit, is_active !== undefined ? is_active : 1)
            .query(`
                INSERT INTO system_notifications (title, message, is_active, created_at, updated_at)
                OUTPUT INSERTED.id, INSERTED.title, INSERTED.message, INSERTED.is_active, INSERTED.created_at, INSERTED.updated_at
                VALUES (@title, @message, @is_active, GETDATE(), GETDATE())
            `);
        return result.recordset[0];
    }

    async getAll() {
        await poolConnect;
        const result = await pool.request().query(`
            SELECT id, title, message, is_active, created_at, updated_at
            FROM system_notifications
            ORDER BY id DESC
        `);
        return result.recordset;
    }

    async getById(id) {
        await poolConnect;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT id, title, message, is_active, created_at, updated_at
                FROM system_notifications
                WHERE id = @id
            `);
        return result.recordset[0];
    }

    async update(id, { title, message, is_active }) {
        await poolConnect;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('title', sql.NVarChar, title.trim())
            .input('message', sql.NVarChar, message.trim())
            .input('is_active', sql.Bit, is_active !== undefined ? is_active : 1)
            .query(`
                UPDATE system_notifications
                SET title = @title, message = @message, is_active = @is_active, updated_at = GETDATE()
                OUTPUT INSERTED.id, INSERTED.title, INSERTED.message, INSERTED.is_active, INSERTED.created_at, INSERTED.updated_at
                WHERE id = @id
            `);
        return result.recordset[0];
    }

    async toggleStatus(id, isActive) {
        await poolConnect;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('is_active', sql.Bit, isActive)
            .query(`
                UPDATE system_notifications
                SET is_active = @is_active, updated_at = GETDATE()
                OUTPUT INSERTED.id, INSERTED.title, INSERTED.message, INSERTED.is_active, INSERTED.created_at, INSERTED.updated_at
                WHERE id = @id
            `);
        return result.recordset[0];
    }

    async delete(id) {
        await poolConnect;
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM system_notifications WHERE id = @id');
    }

    // --- User Read status tracking ---
    async getUserNotifications(userId) {
        await poolConnect;
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT n.id, n.title, n.message, n.is_active, n.created_at, n.updated_at,
                       COALESCE(uns.is_read, 0) as is_read
                FROM system_notifications n
                LEFT JOIN user_notification_status uns ON (n.id = uns.notification_id AND uns.user_id = @userId)
                WHERE n.is_active = 1
                ORDER BY n.created_at DESC, n.id DESC
            `);
        return result.recordset;
    }

    async markAsRead(userId, notificationId) {
        await poolConnect;
        await pool.request()
            .input('userId', sql.Int, userId)
            .input('notificationId', sql.Int, notificationId)
            .query(`
                MERGE user_notification_status AS target
                USING (SELECT @userId AS user_id, @notificationId AS notification_id) AS source
                ON (target.user_id = source.user_id AND target.notification_id = source.notification_id)
                WHEN MATCHED THEN
                    UPDATE SET is_read = 1, read_at = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (user_id, notification_id, is_read, read_at)
                    VALUES (source.user_id, source.notification_id, 1, GETDATE());
            `);
    }

    async markAllAsRead(userId) {
        await poolConnect;
        const request = pool.request().input('userId', sql.Int, userId);
        
        // 1. Insert read entries for active notifications that don't have entry yet
        await request.query(`
            INSERT INTO user_notification_status (user_id, notification_id, is_read, read_at)
            SELECT @userId, id, 1, GETDATE()
            FROM system_notifications n
            WHERE n.is_active = 1
              AND NOT EXISTS (
                  SELECT 1 FROM user_notification_status uns 
                  WHERE uns.user_id = @userId AND uns.notification_id = n.id
              )
        `);

        // 2. Mark any existing entries for this user as read
        await request.query(`
            UPDATE user_notification_status
            SET is_read = 1, read_at = GETDATE()
            WHERE user_id = @userId AND is_read = 0
        `);
    }

    // Retrieve all active FCM tokens for broadcast
    async getAllFcmTokens() {
        await poolConnect;
        const result = await pool.request().query(`
            SELECT DISTINCT fcm_token 
            FROM user_fcm_tokens 
            WHERE fcm_token IS NOT NULL AND fcm_token != ''
        `);
        return result.recordset.map(row => row.fcm_token);
    }
}

module.exports = new NotificationRepository();
