const { sql, pool, poolConnect } = require('../config/database');
const fcmRepository = require('../repositories/fcmRepository');
const { sendPushNotification } = require('../services/fcmService');

async function runPushNotificationJob() {
    try {
        await poolConnect;

        // 1. Get or initialize the last_id from notification_tracker
        let trackerResult = await pool.request()
            .input('key_name', sql.NVarChar, 'last_feed_id')
            .query('SELECT TOP 1 last_id FROM notification_tracker WHERE key_name = @key_name');

        let lastId;
        if (trackerResult.recordset.length === 0) {
            // First time run: get current max ID from tbl_DeviceFeedData so we only process future feeds
            const maxIdResult = await pool.request().query('SELECT MAX(Id) as max_id FROM tbl_DeviceFeedData');
            lastId = maxIdResult.recordset[0].max_id || 0;

            await pool.request()
                .input('key_name', sql.NVarChar, 'last_feed_id')
                .input('last_id', sql.BigInt, lastId)
                .query('INSERT INTO notification_tracker (key_name, last_id) VALUES (@key_name, @last_id)');
            
            console.log(`[PushNotificationJob] Initialized tracker with last_feed_id = ${lastId}`);
            return;
        } else {
            lastId = trackerResult.recordset[0].last_id;
        }

        // 2. Query for new feeds (ev <> 'hb') since lastId
        // Also fetch the corresponding device and location details to know who to notify
        const newAlertsResult = await pool.request()
            .input('last_id', sql.BigInt, lastId)
            .query(`
                SELECT f.Id as feed_id, f.ev, f.msg, f.Ts_date, f.node, f.ts, f.bat_pct,
                       d.id as device_id, d.name as device_name, d.type as device_type,
                       l.id as location_id, l.name as location_name, l.admin_id as location_admin_id
                FROM tbl_DeviceFeedData f
                LEFT JOIN devices d ON (f.node = d.serial_number OR CAST(f.ts AS NVARCHAR(100)) = d.serial_number)
                LEFT JOIN locations l ON d.location_id = l.id
                WHERE f.Id > @last_id 
                  AND f.ev <> 'hb'
                ORDER BY f.Id ASC
            `);

        const alerts = newAlertsResult.recordset;
        if (alerts.length === 0) {
            // No new alerts, but let's update the tracker anyway to the max current ID (in case there are hb feeds that we skipped, so we don't scan them again)
            const maxIdResult = await pool.request().query('SELECT MAX(Id) as max_id FROM tbl_DeviceFeedData');
            const currentMaxId = maxIdResult.recordset[0].max_id || 0;
            if (currentMaxId > lastId) {
                await pool.request()
                    .input('key_name', sql.NVarChar, 'last_feed_id')
                    .input('last_id', sql.BigInt, currentMaxId)
                    .query('UPDATE notification_tracker SET last_id = @last_id WHERE key_name = @key_name');
            }
            return;
        }

        console.log(`[PushNotificationJob] Found ${alerts.length} new alert(s) to process.`);

        for (const alert of alerts) {
            const {
                feed_id, ev, msg, Ts_date, node, bat_pct, device_id, device_name, device_type, location_id, location_name, location_admin_id
            } = alert;

            // Get all tokens registered in the system to send notification to all devices
            const tokens = await fcmRepository.getAllTokens();

            if (tokens.length > 0) {
                const title = `${ev ? ev.charAt(0).toUpperCase() + ev.slice(1) : 'Sensor'} Alert`;
                const body = device_name || `Sensor node: ${node}`;

                const alertDataObj = {
                    id: String(feed_id),
                    ev: ev || "",
                    msg: msg || "",
                    insert_date: Ts_date ? Ts_date.toISOString() : new Date().toISOString(),
                    battery_percentage: bat_pct !== null ? Number(bat_pct) : 100,
                    status: "ACTIVE",
                    device: device_id ? {
                        id: Number(device_id),
                        name: device_name || null,
                        serial_number: node || null,
                        type: device_type || null,
                        location: location_id ? {
                            id: Number(location_id),
                            name: location_name || null
                        } : null
                    } : null
                };

                const payload = {
                    title,
                    body,
                    data: {
                        type: "panic_alert",
                        alert: JSON.stringify(alertDataObj)
                    }
                };

                console.log(`[PushNotificationJob] Sending alert ${feed_id} to ${tokens.length} token(s).`);
                const sendResult = await sendPushNotification(tokens, payload);

                // Clean up any unregistered tokens reported by FCM
                if (sendResult.tokensToRemove && sendResult.tokensToRemove.length > 0) {
                    console.log(`[PushNotificationJob] Cleaning up ${sendResult.tokensToRemove.length} expired FCM tokens.`);
                    await fcmRepository.deleteTokens(sendResult.tokensToRemove);
                }
            } else {
                console.log(`[PushNotificationJob] No active FCM tokens found for alert ${feed_id}.`);
            }

            // Update tracker after each alert processed successfully
            await pool.request()
                .input('key_name', sql.NVarChar, 'last_feed_id')
                .input('last_id', sql.BigInt, feed_id)
                .query('UPDATE notification_tracker SET last_id = @last_id WHERE key_name = @key_name');
        }

    } catch (error) {
        console.error('[PushNotificationJob] Error in background job:', error);
    }
}

// Start the scheduler
function startScheduler(intervalMs = 5000) {
    console.log(`[PushNotificationJob] Scheduler started. Checking for alerts every ${intervalMs}ms.`);
    
    // Run immediately on boot to handle any missed alerts
    setTimeout(() => {
        runPushNotificationJob().catch(err => {
            console.error('[PushNotificationJob] Initial immediate execution failed:', err);
        });
    }, 1000);

    setInterval(runPushNotificationJob, intervalMs);
}

module.exports = {
    runPushNotificationJob,
    startScheduler
};
