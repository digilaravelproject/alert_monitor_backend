const { sql, pool, poolConnect } = require('../config/database');

class HomepageRepository {
    async getHomepageData(adminId = null, isSuperAdmin = false) {
        await poolConnect;

        let whereClauseDevice = '';
        let whereClauseAlert = '';
        let whereClauseUser = '';
        let whereClauseLocation = '';

        if (!isSuperAdmin && adminId !== null) {
            whereClauseDevice = 'WHERE l.admin_id = @adminId';
            whereClauseAlert = 'AND l.admin_id = @adminId';
            whereClauseUser = 'WHERE admin_id = @adminId';
            whereClauseLocation = 'WHERE admin_id = @adminId';
        }

        // Queries
        const devicesQuery = `
            SELECT COUNT(d.id) as count 
            FROM devices d
            INNER JOIN locations l ON d.location_id = l.id
            ${whereClauseDevice}
        `;

        const alertsQuery = `
            SELECT COUNT(f.Id) as count
            FROM tbl_DeviceFeedData f
            INNER JOIN devices d ON (f.node = d.serial_number OR CAST(f.ts AS NVARCHAR(100)) = d.serial_number)
            INNER JOIN locations l ON d.location_id = l.id
            WHERE f.ev <> 'hb'
              AND f.Id NOT IN (SELECT feed_id FROM dismissed_alerts)
              ${whereClauseAlert}
        `;

        const usersQuery = `
            SELECT COUNT(id) as count 
            FROM users
            ${whereClauseUser}
        `;

        const locationsQuery = `
            SELECT COUNT(id) as count 
            FROM locations
            ${whereClauseLocation}
        `;

        const recentAlertsQuery = `
            SELECT TOP 10 f.Id AS alert_id, f.ev AS alert_event, f.msg AS alert_message, f.Insertdate AS alert_date, 
                   f.bat_pct AS battery_percentage, f.ts, f.node,
                   d.id AS device_id, d.name AS device_name, d.serial_number AS device_serial_number, d.type AS device_type, d.is_active AS device_is_active,
                   l.id AS location_id, l.name AS location_name,
                   CASE 
                       WHEN ack.feed_id IS NOT NULL THEN 'ACKNOWLEDGED'
                       ELSE 'ACTIVE'
                   END AS alert_status,
                   ack.acknowledged_by, ack.acknowledged_at
            FROM tbl_DeviceFeedData f
            INNER JOIN devices d ON (f.node = d.serial_number OR CAST(f.ts AS NVARCHAR(100)) = d.serial_number)
            INNER JOIN locations l ON d.location_id = l.id
            LEFT JOIN acknowledged_alerts ack ON f.Id = ack.feed_id
            WHERE f.ev <> 'hb'
              AND f.Id NOT IN (SELECT feed_id FROM dismissed_alerts)
              ${whereClauseAlert}
            ORDER BY f.Id DESC
        `;

        const [devicesRes, alertsRes, usersRes, locationsRes, recentAlertsRes] = await Promise.all([
            pool.request().input('adminId', sql.Int, adminId).query(devicesQuery),
            pool.request().input('adminId', sql.Int, adminId).query(alertsQuery),
            pool.request().input('adminId', sql.Int, adminId).query(usersQuery),
            pool.request().input('adminId', sql.Int, adminId).query(locationsQuery),
            pool.request().input('adminId', sql.Int, adminId).query(recentAlertsQuery)
        ]);

        const counts = {
            total_devices: devicesRes.recordset[0].count || 0,
            active_alerts: alertsRes.recordset[0].count || 0,
            total_users: usersRes.recordset[0].count || 0,
            locations: locationsRes.recordset[0].count || 0
        };

        const recent_alerts = recentAlertsRes.recordset.map(row => ({
            id: row.alert_id,
            ev: row.alert_event,
            msg: row.alert_message,
            insert_date: row.alert_date,
            battery_percentage: row.battery_percentage !== null ? Number(row.battery_percentage) : 100,
            status: row.alert_status,
            acknowledged_by: row.acknowledged_by || null,
            acknowledged_at: row.acknowledged_at || null,
            device: {
                id: row.device_id,
                name: row.device_name,
                serial_number: row.device_serial_number,
                type: row.device_type,
                is_active: row.device_is_active,
                location: {
                    id: row.location_id,
                    name: row.location_name
                }
            }
        }));

        return {
            counts,
            recent_alerts
        };
    }

    async getNonAdminHomepageData(userId) {
        await poolConnect;

        // 1. Get the user's location_id from the database
        const userRes = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT location_id FROM users WHERE id = @userId');
        
        const locationId = userRes.recordset[0]?.location_id || null;

        // If user has no location_id, return empty counts and alerts
        if (locationId === null) {
            return {
                counts: {
                    active_alerts: 0,
                    assigned: 0
                },
                recent_alerts: []
            };
        }

        // 2. Query for assigned count: devices assigned to this location_id
        const assignedQuery = `
            SELECT COUNT(id) as count 
            FROM devices 
            WHERE location_id = @locationId
        `;

        // 3. Query for active_alerts count: alerts count of logged in user (devices on user's location id)
        const alertsQuery = `
            SELECT COUNT(f.Id) as count
            FROM tbl_DeviceFeedData f
            INNER JOIN devices d ON (f.node = d.serial_number OR CAST(f.ts AS NVARCHAR(100)) = d.serial_number)
            WHERE f.ev <> 'hb'
              AND f.Id NOT IN (SELECT feed_id FROM dismissed_alerts)
              AND d.location_id = @locationId
        `;

        // 4. Query for recent_alerts: top 10 alerts for devices on this location_id
        const recentAlertsQuery = `
            SELECT TOP 10 f.Id AS alert_id, f.ev AS alert_event, f.msg AS alert_message, f.Insertdate AS alert_date, 
                   f.bat_pct AS battery_percentage, f.ts, f.node,
                   d.id AS device_id, d.name AS device_name, d.serial_number AS device_serial_number, d.type AS device_type, d.is_active AS device_is_active,
                   l.id AS location_id, l.name AS location_name,
                   CASE 
                       WHEN ack.feed_id IS NOT NULL THEN 'ACKNOWLEDGED'
                       ELSE 'ACTIVE'
                   END AS alert_status,
                   ack.acknowledged_by, ack.acknowledged_at
            FROM tbl_DeviceFeedData f
            INNER JOIN devices d ON (f.node = d.serial_number OR CAST(f.ts AS NVARCHAR(100)) = d.serial_number)
            INNER JOIN locations l ON d.location_id = l.id
            LEFT JOIN acknowledged_alerts ack ON f.Id = ack.feed_id
            WHERE f.ev <> 'hb'
              AND f.Id NOT IN (SELECT feed_id FROM dismissed_alerts)
              AND d.location_id = @locationId
            ORDER BY f.Id DESC
        `;

        const [assignedRes, alertsRes, recentAlertsRes] = await Promise.all([
            pool.request().input('locationId', sql.Int, locationId).query(assignedQuery),
            pool.request().input('locationId', sql.Int, locationId).query(alertsQuery),
            pool.request().input('locationId', sql.Int, locationId).query(recentAlertsQuery)
        ]);

        const counts = {
            active_alerts: alertsRes.recordset[0].count || 0,
            assigned: assignedRes.recordset[0].count || 0
        };

        const recent_alerts = recentAlertsRes.recordset.map(row => ({
            id: row.alert_id,
            ev: row.alert_event,
            msg: row.alert_message,
            insert_date: row.alert_date,
            battery_percentage: row.battery_percentage !== null ? Number(row.battery_percentage) : 100,
            status: row.alert_status,
            acknowledged_by: row.acknowledged_by || null,
            acknowledged_at: row.acknowledged_at || null,
            device: {
                id: row.device_id,
                name: row.device_name,
                serial_number: row.device_serial_number,
                type: row.device_type,
                is_active: row.device_is_active,
                location: {
                    id: row.location_id,
                    name: row.location_name
                }
            }
        }));

        return {
            counts,
            recent_alerts
        };
    }
}

module.exports = new HomepageRepository();
