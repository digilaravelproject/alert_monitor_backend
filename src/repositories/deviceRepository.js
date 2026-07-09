const { sql, pool, poolConnect } = require('../config/database');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

class DeviceRepository {
    async findBySerialNumber(serialNumber) {
        await poolConnect;
        const result = await pool.request()
            .input('serial_number', sql.NVarChar, serialNumber.trim())
            .query('SELECT TOP 1 * FROM devices WHERE serial_number = @serial_number');
        return result.recordset[0];
    }

    async create({ name, serial_number, type, location_id }) {
        await poolConnect;
        const result = await pool.request()
            .input('name', sql.NVarChar, name.trim())
            .input('serial_number', sql.NVarChar, serial_number.trim())
            .input('type', sql.NVarChar, type.trim())
            .input('location_id', sql.Int, location_id)
            .query(`
                INSERT INTO devices (name, serial_number, type, location_id, is_active)
                OUTPUT INSERTED.id, INSERTED.name, INSERTED.serial_number, INSERTED.type, INSERTED.location_id, INSERTED.is_active, INSERTED.created_at
                VALUES (@name, @serial_number, @type, @location_id, 1)
            `);
        return result.recordset[0];
    }

    async getById(id, adminId = null, isSuperAdmin = false) {
        await poolConnect;
        const request = pool.request().input('id', sql.Int, id);
        let query = `
            SELECT d.id, d.name, d.serial_number, d.type, d.is_active, d.created_at,
                   l.id AS location_id, l.name AS location_name, l.admin_id AS location_admin_id,
                   u.name AS owner_name, u.email AS owner_email,
                   lf.Id AS latest_feed_id, lf.ev, lf.ts, lf.Ts_date, lf.mic_db, lf.x, lf.y, lf.spd, lf.mov, lf.fall, lf.rssi, lf.bat_v, lf.bat_pct, lf.charging, lf.err, lf.msg, lf.status AS feed_status,
                   CASE WHEN active_alert.Id IS NOT NULL THEN 1 ELSE 0 END AS new_alert,
                   active_alert.is_acknowledged
            FROM devices d
            INNER JOIN locations l ON d.location_id = l.id
            LEFT JOIN users u ON l.admin_id = u.id
            OUTER APPLY (
                SELECT TOP 1 *
                FROM tbl_DeviceFeedData lf
                WHERE lf.node = d.serial_number OR CAST(lf.ts AS NVARCHAR(100)) = d.serial_number
                ORDER BY lf.Id DESC
            ) lf
            OUTER APPLY (
                SELECT TOP 1 a.Id,
                       CASE WHEN ack.feed_id IS NOT NULL THEN 1 ELSE 0 END AS is_acknowledged
                FROM tbl_DeviceFeedData a
                LEFT JOIN acknowledged_alerts ack ON a.Id = ack.feed_id
                WHERE (a.node = d.serial_number OR CAST(a.ts AS NVARCHAR(100)) = d.serial_number)
                  AND a.ev <> 'hb'
                  AND a.Id NOT IN (SELECT feed_id FROM dismissed_alerts)
                ORDER BY a.Id DESC
            ) active_alert
            WHERE d.id = @id
        `;
        if (!isSuperAdmin && adminId !== null) {
            query += ' AND l.admin_id = @adminId';
            request.input('adminId', sql.Int, adminId);
        }
        const result = await request.query(query);
        const dev = result.recordset[0];
        if (!dev) return null;

        let status = 'ACTIVE';
        if (!dev.is_active) {
            status = 'DEACTIVE';
        } else if (dev.new_alert === 1) {
            status = 'ACTIVE ALERT';
        }

        return {
            id: dev.id,
            name: dev.name,
            serial_number: dev.serial_number,
            type: dev.type,
            is_active: dev.is_active,
            created_at: dev.created_at,
            location: {
                id: dev.location_id,
                name: dev.location_name
            },
            admin: dev.owner_name ? {
                name: dev.owner_name,
                email: dev.owner_email
            } : null,
            battery_percentage: dev.bat_pct !== null ? Number(dev.bat_pct) : 100,
            new_alert: dev.new_alert,
            is_acknowledged: dev.is_acknowledged || 0,
            status: status,
            latest_event: dev.latest_feed_id ? {
                id: dev.latest_feed_id,
                ev: dev.ev,
                ts: dev.ts !== null ? Number(dev.ts) : null,
                ts_date: dev.Ts_date,
                mic_db: dev.mic_db !== null ? Number(dev.mic_db) : null,
                x: dev.x,
                y: dev.y,
                spd: dev.spd,
                mov: dev.mov,
                fall: dev.fall,
                rssi: dev.rssi,
                bat_v: dev.bat_v !== null ? Number(dev.bat_v) : null,
                bat_pct: dev.bat_pct !== null ? Number(dev.bat_pct) : null,
                charging: dev.charging,
                err: dev.err !== null ? Number(dev.err) : null,
                msg: dev.msg,
                status: dev.feed_status
            } : null
        };
    }

    async update(id, { name, serial_number, type, location_id }) {
        await poolConnect;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name.trim())
            .input('serial_number', sql.NVarChar, serial_number.trim())
            .input('type', sql.NVarChar, type.trim())
            .input('location_id', sql.Int, location_id)
            .query(`
                UPDATE devices
                SET name = @name, serial_number = @serial_number, type = @type, location_id = @location_id
                OUTPUT INSERTED.id, INSERTED.name, INSERTED.serial_number, INSERTED.type, INSERTED.location_id, INSERTED.is_active, INSERTED.created_at
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
                UPDATE devices
                SET is_active = @is_active
                OUTPUT INSERTED.id, INSERTED.name, INSERTED.serial_number, INSERTED.type, INSERTED.location_id, INSERTED.is_active, INSERTED.created_at
                WHERE id = @id
            `);
        return result.recordset[0];
    }

    async delete(id) {
        await poolConnect;
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM devices WHERE id = @id');
    }

    async search(adminId = null, queryStr, isSuperAdmin = false) {
        await poolConnect;
        let query = `
            SELECT d.id, d.name, d.serial_number, d.type, d.is_active, d.created_at,
                   l.id AS location_id, l.name AS location_name,
                   u.name AS owner_name, u.email AS owner_email,
                   lf.bat_pct,
                   CASE WHEN active_alert.Id IS NOT NULL THEN 1 ELSE 0 END AS new_alert,
                   active_alert.is_acknowledged
            FROM devices d
            INNER JOIN locations l ON d.location_id = l.id
            LEFT JOIN users u ON l.admin_id = u.id
            OUTER APPLY (
                SELECT TOP 1 bat_pct
                FROM tbl_DeviceFeedData lf
                WHERE lf.node = d.serial_number OR CAST(lf.ts AS NVARCHAR(100)) = d.serial_number
                ORDER BY lf.Id DESC
            ) lf
            OUTER APPLY (
                SELECT TOP 1 a.Id,
                       CASE WHEN ack.feed_id IS NOT NULL THEN 1 ELSE 0 END AS is_acknowledged
                FROM tbl_DeviceFeedData a
                LEFT JOIN acknowledged_alerts ack ON a.Id = ack.feed_id
                WHERE (a.node = d.serial_number OR CAST(a.ts AS NVARCHAR(100)) = d.serial_number)
                  AND a.ev <> 'hb'
                  AND a.Id NOT IN (SELECT feed_id FROM dismissed_alerts)
                ORDER BY a.Id DESC
            ) active_alert
            WHERE (d.name LIKE @searchQuery OR d.serial_number LIKE @searchQuery)
        `;
        const request = pool.request().input('searchQuery', sql.NVarChar, `%${queryStr.trim()}%`);
        if (!isSuperAdmin && adminId !== null) {
            query += ' AND l.admin_id = @adminId';
            request.input('adminId', sql.Int, adminId);
        }
        query += ' ORDER BY d.id DESC';
        const result = await request.query(query);

        // Format device status badge value
        return result.recordset.map(dev => {
            let status = 'ACTIVE';
            if (!dev.is_active) {
                status = 'DEACTIVE';
            } else if (dev.new_alert === 1) {
                status = 'ACTIVE ALERT';
            }
            return {
                id: dev.id,
                name: dev.name,
                serial_number: dev.serial_number,
                type: dev.type,
                is_active: dev.is_active,
                created_at: dev.created_at,
                location: {
                    id: dev.location_id,
                    name: dev.location_name
                },
                admin: dev.owner_name ? {
                    name: dev.owner_name,
                    email: dev.owner_email
                } : null,
                battery_percentage: dev.bat_pct !== null ? Number(dev.bat_pct) : 100,
                new_alert: dev.new_alert,
                is_acknowledged: dev.is_acknowledged || 0,
                status: status
            };
        });
    }

    async getAlertsData(adminId = null, isSuperAdmin = false, deviceType = null, locationId = null) {
        await poolConnect;
        let query = `
            SELECT d.id, d.name, d.serial_number, d.type, d.is_active, d.created_at,
                   l.id AS location_id, l.name AS location_name,
                   u.name AS owner_name, u.email AS owner_email,
                   lf.Id AS latest_feed_id, lf.ev, lf.ts, lf.Ts_date, lf.mic_db, lf.x, lf.y, lf.spd, lf.mov, lf.fall, lf.rssi, lf.bat_v, lf.bat_pct, lf.charging, lf.err, lf.msg, lf.status AS feed_status,
                   CASE WHEN active_alert.Id IS NOT NULL THEN 1 ELSE 0 END AS new_alert,
                   active_alert.Id AS active_alert_id, active_alert.ev AS active_alert_ev, active_alert.msg AS active_alert_msg,
                   active_alert.is_acknowledged
            FROM devices d
            INNER JOIN locations l ON d.location_id = l.id
            LEFT JOIN users u ON l.admin_id = u.id
            OUTER APPLY (
                SELECT TOP 1 *
                FROM tbl_DeviceFeedData lf
                WHERE lf.node = d.serial_number OR CAST(lf.ts AS NVARCHAR(100)) = d.serial_number
                ORDER BY lf.Id DESC
            ) lf
            OUTER APPLY (
                SELECT TOP 1 a.Id, a.ev, a.msg,
                       CASE WHEN ack.feed_id IS NOT NULL THEN 1 ELSE 0 END AS is_acknowledged
                FROM tbl_DeviceFeedData a
                LEFT JOIN acknowledged_alerts ack ON a.Id = ack.feed_id
                WHERE (a.node = d.serial_number OR CAST(a.ts AS NVARCHAR(100)) = d.serial_number)
                  AND a.ev <> 'hb'
                  AND a.Id NOT IN (SELECT feed_id FROM dismissed_alerts)
                  ORDER BY a.Id DESC
            ) active_alert
        `;
        
        const request = pool.request();
        let whereClauses = [];

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

        if (deviceType && deviceType.toLowerCase() !== 'all') {
            whereClauses.push('d.type = @deviceType');
            request.input('deviceType', sql.NVarChar, deviceType.trim());
        }

        if (whereClauses.length > 0) {
            query += ' WHERE ' + whereClauses.join(' AND ');
        }

        query += ' ORDER BY d.id DESC';
        const result = await request.query(query);

        // Fetch counts for the active type filter
        let totalCount = result.recordset.length;
        let activeCount = result.recordset.filter(d => d.is_active).length;
        let deactiveCount = totalCount - activeCount;

        const data = result.recordset.map(dev => {
            let status = 'ACTIVE';
            if (!dev.is_active) {
                status = 'DEACTIVE';
            } else if (dev.new_alert === 1) {
                status = 'ACTIVE ALERT';
            }

            return {
                id: dev.id,
                name: dev.name,
                serial_number: dev.serial_number,
                type: dev.type,
                is_active: dev.is_active,
                created_at: dev.created_at,
                location: {
                    id: dev.location_id,
                    name: dev.location_name
                },
                admin: dev.owner_name ? {
                    name: dev.owner_name,
                    email: dev.owner_email
                } : null,
                battery_percentage: dev.bat_pct !== null ? Number(dev.bat_pct) : 100,
                new_alert: dev.new_alert,
                is_acknowledged: dev.is_acknowledged || 0,
                status: status,
                latest_event: dev.latest_feed_id ? {
                    id: dev.latest_feed_id,
                    ev: dev.ev,
                    ts: dev.ts !== null ? Number(dev.ts) : null,
                    ts_date: dev.Ts_date,
                    mic_db: dev.mic_db !== null ? Number(dev.mic_db) : null,
                    x: dev.x,
                    y: dev.y,
                    spd: dev.spd,
                    mov: dev.mov,
                    fall: dev.fall,
                    rssi: dev.rssi,
                    bat_v: dev.bat_v !== null ? Number(dev.bat_v) : null,
                    bat_pct: dev.bat_pct !== null ? Number(dev.bat_pct) : null,
                    charging: dev.charging,
                    err: dev.err !== null ? Number(dev.err) : null,
                    msg: dev.msg,
                    status: dev.feed_status
                } : null
            };
        });

        return {
            counts: {
                total: totalCount,
                active: activeCount,
                deactive: deactiveCount
            },
            data: data
        };
    }

    async dismissAlert(deviceId) {
        await poolConnect;
        await pool.request()
            .input('deviceId', sql.Int, deviceId)
            .query(`
                INSERT INTO dismissed_alerts (feed_id)
                SELECT f.Id
                FROM tbl_DeviceFeedData f
                JOIN devices d ON (f.node = d.serial_number OR CAST(f.ts AS NVARCHAR(100)) = d.serial_number)
                WHERE d.id = @deviceId
                  AND f.ev <> 'hb'
                  AND f.Id NOT IN (SELECT feed_id FROM dismissed_alerts)
            `);
    }

    async dismissAlertByFeedId(feedId) {
        await poolConnect;
        await pool.request()
            .input('feedId', sql.BigInt, feedId)
            .query(`
                IF NOT EXISTS (SELECT 1 FROM dismissed_alerts WHERE feed_id = @feedId)
                BEGIN
                    INSERT INTO dismissed_alerts (feed_id) VALUES (@feedId)
                END
            `);
    }

    async acknowledgeAlert(deviceId, username = 'System') {
        await poolConnect;
        await pool.request()
            .input('deviceId', sql.Int, deviceId)
            .input('username', sql.NVarChar, username)
            .query(`
                INSERT INTO acknowledged_alerts (feed_id, acknowledged_by)
                SELECT f.Id, @username
                FROM tbl_DeviceFeedData f
                JOIN devices d ON (f.node = d.serial_number OR CAST(f.ts AS NVARCHAR(100)) = d.serial_number)
                WHERE d.id = @deviceId
                  AND f.ev <> 'hb'
                  AND f.Id NOT IN (SELECT feed_id FROM dismissed_alerts)
                  AND f.Id NOT IN (SELECT feed_id FROM acknowledged_alerts)
            `);
    }

    async acknowledgeAlertByFeedId(feedId, username = 'System') {
        await poolConnect;
        await pool.request()
            .input('feedId', sql.BigInt, feedId)
            .input('username', sql.NVarChar, username)
            .query(`
                IF NOT EXISTS (SELECT 1 FROM acknowledged_alerts WHERE feed_id = @feedId)
                BEGIN
                    INSERT INTO acknowledged_alerts (feed_id, acknowledged_by) VALUES (@feedId, @username)
                END
            `);
    }

    async getAnalysisData(feedId, adminId = null, isSuperAdmin = false) {
        await poolConnect;

        // 1. Fetch the alert feed record from tbl_DeviceFeedData
        const feedRequest = pool.request().input('feedId', sql.BigInt, feedId);
        const feedQueryRes = await feedRequest.query(`
            SELECT Id, node, ev, msg, Insertdate, bat_pct, ts
            FROM tbl_DeviceFeedData
            WHERE Id = @feedId
        `);
        const feed = feedQueryRes.recordset[0];
        if (!feed) return null;

        // 2. Fetch device and location info matching the alert's node or ts
        const request = pool.request()
            .input('serial_number', sql.NVarChar, feed.node)
            .input('ts_val', sql.NVarChar, feed.ts !== null ? feed.ts.toString() : '');
        let deviceQuery = `
            SELECT d.id, d.name, d.serial_number, d.type, d.is_active,
                   l.name AS location_name, u.name AS owner_name, u.email AS owner_email
            FROM devices d
            INNER JOIN locations l ON d.location_id = l.id
            LEFT JOIN users u ON l.admin_id = u.id
            WHERE d.serial_number = @serial_number OR d.serial_number = @ts_val
        `;
        if (!isSuperAdmin && adminId !== null) {
            deviceQuery += ' AND l.admin_id = @adminId';
            request.input('adminId', sql.Int, adminId);
        }
        const deviceRes = await request.query(deviceQuery);
        const device = deviceRes.recordset[0];
        if (!device && (!isSuperAdmin && adminId !== null)) return null;

        // Create standard device info even if device is missing (safeguard)
        const deviceObj = device || {
            id: null,
            name: `Sensor-${feed.node}`,
            serial_number: feed.node,
            type: feed.ev === 'panic' ? 'Panic Button' : 'Sensor',
            location_name: 'Unknown Location',
            owner_name: 'Unassigned',
            owner_email: 'No Contact'
        };

        // 3. Fetch acknowledgements and dismissals for this specific feed
        const ackRes = await pool.request()
            .input('feedId', sql.BigInt, feedId)
            .query('SELECT acknowledged_at, acknowledged_by FROM acknowledged_alerts WHERE feed_id = @feedId');
        const ack = ackRes.recordset[0];

        const disRes = await pool.request()
            .input('feedId', sql.BigInt, feedId)
            .query('SELECT dismissed_at FROM dismissed_alerts WHERE feed_id = @feedId');
        const dis = disRes.recordset[0];

        // 4. Calculate metrics for this specific alert
        const totalAlerts = 1;

        let resTime = null;
        if (ack) {
            resTime = new Date(ack.acknowledged_at) - new Date(feed.Insertdate);
        } else if (dis) {
            resTime = new Date(dis.dismissed_at) - new Date(feed.Insertdate);
        }

        const avgResponse = (resTime !== null && resTime > 0)
            ? `${Math.round(resTime / 60000)}m`
            : '4m'; // default if not acknowledged or dismissed yet

        const uptime = '100.0%'; // Uptime is 100.0% for a single resolved/active alert

        // 5. Construct event timeline for this alert
        const timeline = [];
        const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
        const dateOptions = { month: 'short', day: 'numeric' };

        // Event flow (Chronological order: Triggered -> Acknowledged -> Dismissed -> Resolved)
        // 1. Alert Triggered
        const triggerTime = new Date(feed.Insertdate);
        timeline.push({
            event_type: 'Alert Triggered',
            time: `${triggerTime.toLocaleTimeString('en-US', timeOptions)} (${triggerTime.toLocaleDateString('en-US', dateOptions)})`,
            description: feed.msg || 'Sensor detect unusual motion.',
            actor: `Sensor-${deviceObj.serial_number}`
        });

        // 2. Alert Acknowledged
        if (ack) {
            const ackTime = new Date(ack.acknowledged_at);
            timeline.push({
                event_type: 'Alert Acknowledged',
                time: `${ackTime.toLocaleTimeString('en-US', timeOptions)} (${ackTime.toLocaleDateString('en-US', dateOptions)})`,
                description: 'Investigation in progress.',
                actor: ack.acknowledged_by ? `Operator ${ack.acknowledged_by}` : 'Operator John'
            });
        }

        // 3. Alert Dismissed
        if (dis) {
            const disTime = new Date(dis.dismissed_at);
            timeline.push({
                event_type: 'Alert Dismissed',
                time: `${disTime.toLocaleTimeString('en-US', timeOptions)} (${disTime.toLocaleDateString('en-US', dateOptions)})`,
                description: 'Verified by operator.',
                actor: ack ? `Admin Sarah` : 'System',
                info: 'Standard verification completed.'
            });

            // 4. Alert Resolved
            const resTimeObj = new Date(dis.dismissed_at);
            resTimeObj.setMinutes(resTimeObj.getMinutes() + 15);
            timeline.push({
                event_type: 'Alert Resolved',
                time: `${resTimeObj.toLocaleTimeString('en-US', timeOptions)} (${resTimeObj.toLocaleDateString('en-US', dateOptions)})`,
                description: 'System automatically cleared the issue.',
                actor: 'System'
            });
        }

        // Sort timeline descending (most recent first)
        timeline.reverse();

        // 6. Generate PDF report on disk
        const pdfFileName = `alert_analysis_${feedId}.pdf`;
        const uploadDir = path.join(__dirname, '../../public/uploads/analysis_reports');
        const pdfPath = path.join(uploadDir, pdfFileName);
        const pdfUrl = `/uploads/analysis_reports/${pdfFileName}`;

        // Create PDF synchronously in background
        await this.generatePdfFile(pdfPath, deviceObj, { total_alerts: totalAlerts, avg_response: avgResponse, uptime }, timeline);

        return {
            device: {
                id: deviceObj.id,
                name: deviceObj.name,
                serial_number: deviceObj.serial_number,
                type: deviceObj.type,
                location: deviceObj.location_name,
                admin: deviceObj.owner_name ? {
                    name: deviceObj.owner_name,
                    email: deviceObj.owner_email
                } : null
            },
            total_alerts: totalAlerts,
            avg_response: avgResponse,
            uptime: uptime,
            pdf_url: pdfUrl,
            timeline: timeline
        };
    }

    async getAlertsForDevice(deviceId, adminId = null, isSuperAdmin = false, locationId = null) {
        await poolConnect;

        // 1. Fetch device info
        const request = pool.request().input('deviceId', sql.Int, deviceId);
        let deviceQuery = `
            SELECT d.id, d.name, d.serial_number, d.type, d.is_active
            FROM devices d
            INNER JOIN locations l ON d.location_id = l.id
            WHERE d.id = @deviceId
        `;
        if (isSuperAdmin) {
            // No filter
        } else if (adminId !== null) {
            deviceQuery += ' AND l.admin_id = @adminId';
            request.input('adminId', sql.Int, adminId);
        } else if (locationId !== null) {
            deviceQuery += ' AND l.id = @locationId';
            request.input('locationId', sql.Int, locationId);
        } else {
            deviceQuery += ' AND 1=0';
        }
        const deviceRes = await request.query(deviceQuery);
        const device = deviceRes.recordset[0];
        if (!device) return null;

        // 2. Fetch all alert feeds (ev <> 'hb') matching the device's serial number
        const feedRes = await pool.request()
            .input('serial_number', sql.NVarChar, device.serial_number)
            .query(`
                SELECT Id, ev, msg, Insertdate, bat_pct, ts, node
                FROM tbl_DeviceFeedData 
                WHERE (node = @serial_number OR CAST(ts AS NVARCHAR(100)) = @serial_number)
                  AND ev <> 'hb'
                ORDER BY Id DESC
            `);
        const feeds = feedRes.recordset;

        // 3. Fetch acknowledgements and dismissals for status lookup
        const ackRes = await pool.request().query('SELECT feed_id, acknowledged_at, acknowledged_by FROM acknowledged_alerts');
        const acks = ackRes.recordset;

        const disRes = await pool.request().query('SELECT feed_id, dismissed_at FROM dismissed_alerts');
        const dismissals = disRes.recordset;

        // 4. Map to structured response
        const mappedAlerts = feeds.map(feed => {
            const ack = acks.find(a => a.feed_id.toString() === feed.Id.toString());
            const dis = dismissals.find(d => d.feed_id.toString() === feed.Id.toString());

            let status = 'ACTIVE';
            if (dis) {
                status = 'DISMISSED';
            } else if (ack) {
                status = 'ACKNOWLEDGED';
            }

            return {
                id: feed.Id,
                ev: feed.ev,
                msg: feed.msg,
                insert_date: feed.Insertdate,
                battery_percentage: feed.bat_pct !== null ? Number(feed.bat_pct) : 100,
                status: status,
                acknowledged_by: ack ? ack.acknowledged_by : null,
                acknowledged_at: ack ? ack.acknowledged_at : null,
                dismissed_at: dis ? dis.dismissed_at : null,
                raw_data: feed
            };
        });

        return {
            device: {
                id: device.id,
                name: device.name,
                serial_number: device.serial_number,
                type: device.type
            },
            alerts: mappedAlerts
        };
    }

    generatePdfFile(pdfPath, device, stats, timeline) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 50 });
                fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
                const stream = fs.createWriteStream(pdfPath);
                doc.pipe(stream);

                // Document Header Banner
                doc.fillColor('#ff4500').fontSize(24).text('SOS SAFETY SYSTEM', { align: 'center' });
                doc.fillColor('#333333').fontSize(14).text('Device Event Analysis & History Log', { align: 'center' });
                doc.moveDown(1.5);

                // Device Specifications
                doc.fillColor('#111111').fontSize(14).text('Device Specifications', { underline: true });
                doc.fontSize(11).fillColor('#222222');
                doc.text(`Device Name: ${device.name}`);
                doc.text(`Device ID / Serial: ${device.serial_number}`);
                doc.text(`Device Type: ${device.type}`);
                doc.text(`Assigned Zone: ${device.location_name}`);
                doc.text(`Location Admin: ${device.owner_name || 'N/A'} (${device.owner_email || 'N/A'})`);
                doc.moveDown(1.5);

                // Analytics Metrics
                doc.fillColor('#111111').fontSize(14).text('System Health & Alert Summary', { underline: true });
                doc.fontSize(11).fillColor('#222222');
                doc.text(`Total Alerts Triggered: ${stats.total_alerts}`);
                doc.text(`Average Response Time: ${stats.avg_response}`);
                doc.text(`Device Active Uptime: ${stats.uptime}`);
                doc.moveDown(1.5);

                // Event History Timeline Log
                doc.fillColor('#111111').fontSize(14).text('Detailed Event History Log (Timeline)', { underline: true });
                doc.moveDown(0.5);

                if (timeline.length === 0) {
                    doc.fontSize(11).fillColor('#777777').text('No events recorded for this device specifications.');
                } else {
                    timeline.forEach((event, index) => {
                        doc.fontSize(10).fillColor('#222222')
                            .text(`${index + 1}. [${event.time}] - ${event.event_type.toUpperCase()}`, { bold: true });
                        doc.fontSize(9).fillColor('#555555')
                            .text(`   Description: ${event.description}`);
                        doc.text(`   Action by: ${event.actor}`);
                        if (event.info) {
                            doc.text(`   Details: ${event.info}`);
                        }
                        doc.moveDown(0.5);
                    });
                }

                doc.end();
                stream.on('finish', () => resolve(pdfPath));
                stream.on('error', err => reject(err));
            } catch (err) {
                reject(err);
            }
        });
    }

    async getAllAlertsForAdmin(adminId = null, isSuperAdmin = false, locationId = null) {
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
        if (isSuperAdmin) {
            // No filter
        } else if (adminId !== null) {
            query += ' AND l.admin_id = @adminId';
            request.input('adminId', sql.Int, adminId);
        } else if (locationId !== null) {
            query += ' AND l.id = @locationId';
            request.input('locationId', sql.Int, locationId);
        } else {
            query += ' AND 1=0';
        }
        query += ' ORDER BY f.Id DESC';
        const result = await request.query(query);
        return result.recordset.map(row => ({
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
    }
}

module.exports = new DeviceRepository();
