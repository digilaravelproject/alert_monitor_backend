const { sql, pool, poolConnect } = require('../config/database');

class ReportRepository {
    async getAlertsForCounts(adminId = null, isSuperAdmin = false, locationId = null) {
        await poolConnect;
        
        let query = `
            SELECT f.Id, f.ev, d.type,
                   CASE WHEN ack.feed_id IS NOT NULL THEN 1 ELSE 0 END as is_acknowledged
            FROM tbl_DeviceFeedData f
            INNER JOIN devices d ON (f.node = d.serial_number OR CAST(f.ts AS NVARCHAR(100)) = d.serial_number)
            INNER JOIN locations l ON d.location_id = l.id
            LEFT JOIN acknowledged_alerts ack ON f.Id = ack.feed_id
            WHERE f.ev <> 'hb'
              AND f.Id NOT IN (SELECT feed_id FROM dismissed_alerts)
        `;

        const request = pool.request();
        let whereClauses = [];

        if (isSuperAdmin) {
            // No admin filters
        } else if (adminId !== null) {
            whereClauses.push('l.admin_id = @adminId');
            request.input('adminId', sql.Int, adminId);
        } else if (locationId !== null) {
            whereClauses.push('l.id = @locationId');
            request.input('locationId', sql.Int, locationId);
        } else {
            whereClauses.push('1=0');
        }

        if (whereClauses.length > 0) {
            query += ' AND ' + whereClauses.join(' AND ');
        }

        const result = await request.query(query);
        return result.recordset;
    }

    async getAlertsForTrends(adminId = null, isSuperAdmin = false, locationId = null) {
        await poolConnect;

        let query = `
            SELECT f.Id, f.Insertdate
            FROM tbl_DeviceFeedData f
            INNER JOIN devices d ON (f.node = d.serial_number OR CAST(f.ts AS NVARCHAR(100)) = d.serial_number)
            INNER JOIN locations l ON d.location_id = l.id
            WHERE f.ev <> 'hb'
              AND f.Id NOT IN (SELECT feed_id FROM dismissed_alerts)
              AND f.Insertdate >= DATEADD(day, -14, GETDATE())
        `;

        const request = pool.request();
        let whereClauses = [];

        if (isSuperAdmin) {
            // No admin filters
        } else if (adminId !== null) {
            whereClauses.push('l.admin_id = @adminId');
            request.input('adminId', sql.Int, adminId);
        } else if (locationId !== null) {
            whereClauses.push('l.id = @locationId');
            request.input('locationId', sql.Int, locationId);
        } else {
            whereClauses.push('1=0');
        }

        if (whereClauses.length > 0) {
            query += ' AND ' + whereClauses.join(' AND ');
        }

        const result = await request.query(query);
        return result.recordset;
    }

    async getFilteredAlerts(adminId = null, isSuperAdmin = false, locationId = null, filters = {}) {
        await poolConnect;

        let query = `
            SELECT f.Id AS alert_id, f.ev AS alert_event, f.msg AS alert_message, f.Insertdate AS alert_date, 
                   f.bat_pct AS battery_percentage, f.ts, f.node,
                   d.id AS device_id, d.name AS device_name, d.serial_number AS device_serial_number, d.type AS device_type, d.is_active AS device_is_active,
                   l.id AS location_id, l.name AS location_name,
                   CASE 
                        WHEN dis.feed_id IS NOT NULL THEN 'DISMISSED'
                        WHEN ack.feed_id IS NOT NULL THEN 'ACKNOWLEDGED'
                        ELSE 'ACTIVE'
                   END AS alert_status,
                   ack.acknowledged_by, ack.acknowledged_at, dis.dismissed_at
            FROM tbl_DeviceFeedData f
            INNER JOIN devices d ON (f.node = d.serial_number OR CAST(f.ts AS NVARCHAR(100)) = d.serial_number)
            INNER JOIN locations l ON d.location_id = l.id
            LEFT JOIN acknowledged_alerts ack ON f.Id = ack.feed_id
            LEFT JOIN dismissed_alerts dis ON f.Id = dis.feed_id
            WHERE f.ev <> 'hb'
        `;

        const request = pool.request();
        let whereClauses = [];

        // Role-based filtering
        if (isSuperAdmin) {
            // No filters
        } else if (adminId !== null) {
            whereClauses.push('l.admin_id = @adminId');
            request.input('adminId', sql.Int, adminId);
        } else if (locationId !== null) {
            whereClauses.push('l.id = @locationId');
            request.input('locationId', sql.Int, locationId);
        } else {
            whereClauses.push('1=0');
        }

        // Apply filters parameter
        if (filters.type) {
            whereClauses.push('f.ev LIKE @typeLike');
            request.input('typeLike', sql.NVarChar, `%${filters.type}%`);
        }

        if (filters.location_id) {
            whereClauses.push('l.id = @filterLocationId');
            request.input('filterLocationId', sql.Int, parseInt(filters.location_id, 10));
        }

        if (filters.start_date) {
            whereClauses.push('f.Insertdate >= @startDate');
            request.input('startDate', sql.DateTime, new Date(filters.start_date + 'T00:00:00Z'));
        }

        if (filters.end_date) {
            whereClauses.push('f.Insertdate <= @endDate');
            request.input('endDate', sql.DateTime, new Date(filters.end_date + 'T23:59:59Z'));
        }

        if (whereClauses.length > 0) {
            query += ' AND ' + whereClauses.join(' AND ');
        }

        query += ' ORDER BY f.Id DESC';

        const result = await request.query(query);
        let data = result.recordset.map(row => ({
            id: row.alert_id,
            ev: row.alert_event,
            msg: row.alert_message,
            insert_date: row.alert_date,
            battery_percentage: row.battery_percentage !== null ? Number(row.battery_percentage) : 100,
            status: row.alert_status,
            acknowledged_by: row.acknowledged_by || null,
            acknowledged_at: row.acknowledged_at || null,
            dismissed_at: row.dismissed_at || null,
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

        // Filter status in JavaScript if set
        if (filters.status && filters.status.toLowerCase() !== 'all') {
            const targetStatus = filters.status.toUpperCase();
            data = data.filter(item => item.status === targetStatus);
        }

        return data;
    }
}

module.exports = new ReportRepository();
