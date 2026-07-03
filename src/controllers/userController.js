const { UserService } = require('../services/userService');

class UserController {
    // 1. POST: temp-users
    async createTempUser(req, res) {
        try {
            const { email, phone_number } = req.body;
            await UserService.createTempUser(email, phone_number);
            res.status(201).json({
                success: true,
                message: 'User added successfully'
            });
        } catch (error) {
            res.status(error.status || 500).json({
                success: false,
                error: error.message
            });
        }
    }

    // 2. GET: temp-users
    async getTempUsers(req, res) {
        try {
            const tempUsers = await UserService.getTempUsers();
            res.status(200).json({
                success: true,
                data: tempUsers
            });
        } catch (error) {
            res.status(error.status || 500).json({
                success: false,
                error: error.message
            });
        }
    }

    // 3. POST: Add User (Staff Enrollment)
    async addStaff(req, res) {
        try {
            const { name, phone_number, role, access_level, location_id } = req.body;
            const newUser = await UserService.addStaff(name, phone_number, role, access_level, location_id, req.user);
            res.status(201).json({
                status: true,
                data: newUser
            });
        } catch (error) {
            res.status(error.status || 500).json({
                status: false,
                error: error.message
            });
        }
    }

    // 4. POST: Login User (Generate OTP)
    async login(req, res) {
        try {
            const { phone_number } = req.body;
            if (!phone_number || typeof phone_number !== 'string' || phone_number.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Mobile number is required'
                });
            }

            const phone = await UserService.generateOtp(phone_number);
            res.status(200).json({
                status: true,
                data: {
                    message: 'OTP generated successfully',
                    phone_number: phone
                }
            });
        } catch (error) {
            res.status(error.status || 500).json({
                status: false,
                error: error.message
            });
        }
    }

    // 5. POST: Resend OTP
    async resendOtp(req, res) {
        try {
            const { phone_number } = req.body;
            if (!phone_number || typeof phone_number !== 'string' || phone_number.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Mobile number is required'
                });
            }

            const phone = await UserService.generateOtp(phone_number); // Re-uses the OTP generation logic
            res.status(200).json({
                status: true,
                data: {
                    message: 'OTP resent successfully',
                    phone_number: phone
                }
            });
        } catch (error) {
            res.status(error.status || 500).json({
                status: false,
                error: error.message
            });
        }
    }

    // 6. POST: Verify OTP
    async verifyOtp(req, res) {
        try {
            const { phone_number, otp } = req.body;
            const result = await UserService.verifyOtp(phone_number, otp);
            res.status(200).json({
                status: true,
                data: {
                    message: 'OTP verified successfully',
                    user: result.user,
                    accessToken: result.accessToken
                }
            });
        } catch (error) {
            res.status(error.status || 500).json({
                status: false,
                error: error.message
            });
        }
    }

    // 7. POST: Super Admin Login
    async superAdminLogin(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || typeof email !== 'string' || email.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Email is required'
                });
            }
            if (!password || typeof password !== 'string' || password.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Password is required'
                });
            }

            const result = await UserService.superAdminLogin(email, password);
            res.status(200).json({
                status: true,
                data: {
                    message: 'Super admin logged in successfully',
                    user: result.user,
                    accessToken: result.accessToken
                }
            });
        } catch (error) {
            res.status(error.status || 500).json({
                status: false,
                error: error.message
            });
        }
    }

    // 8. GET: List Users (For Dashboard)
    async getUsers(req, res) {
        try {
            const users = await UserService.getAllUsers();
            res.status(200).json({
                status: true,
                data: users
            });
        } catch (error) {
            res.status(error.status || 500).json({
                status: false,
                error: error.message
            });
        }
    }

    // 9. GET: Staff Listing
    async getStaff(req, res) {
        try {
            const levelQuery = req.query.level || 'all';
            const { counts, data } = await UserService.getStaffAndStats(req.user, levelQuery);
            res.status(200).json({
                status: true,
                counts: counts,
                data: data
            });
        } catch (error) {
            res.status(error.status || 500).json({
                status: false,
                error: error.message
            });
        }
    }

    // 10. GET: Search Staff Members
    async searchStaff(req, res) {
        try {
            const { query } = req.query;
            if (!query || typeof query !== 'string' || query.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Search query is required'
                });
            }

            const staff = await UserService.searchStaff(req.user, query);
            res.status(200).json({
                status: true,
                data: staff
            });
        } catch (error) {
            res.status(error.status || 500).json({
                status: false,
                error: error.message
            });
        }
    }

    // 11. GET: Staff Member by ID
    async getStaffById(req, res) {
        try {
            const staffId = req.params.id;
            const staffMember = await UserService.getStaffById(staffId, req.user);
            res.status(200).json({
                status: true,
                data: staffMember
            });
        } catch (error) {
            res.status(error.status || 500).json({
                status: false,
                error: error.message
            });
        }
    }

    // 12. PUT: Update Staff Details
    async updateStaff(req, res) {
        try {
            const staffId = req.params.id;
            const { name, phone_number, role, access_level, location_id } = req.body;
            const updatedStaff = await UserService.updateStaff(staffId, req.user, name, phone_number, role, access_level, location_id);
            res.status(200).json({
                status: true,
                message: 'Staff member updated successfully',
                data: updatedStaff
            });
        } catch (error) {
            res.status(error.status || 500).json({
                status: false,
                error: error.message
            });
        }
    }

    // 13. POST: Toggle Block/Unblock Staff
    async toggleBlockStaff(req, res) {
        try {
            const staffId = req.params.id;
            const result = await UserService.toggleBlockStaff(staffId, req.user);
            res.status(200).json({
                status: true,
                is_blocked: result.is_blocked,
                message: result.message
            });
        } catch (error) {
            res.status(error.status || 500).json({
                status: false,
                error: error.message
            });
        }
    }

    // 14. DELETE: Delete Staff
    async deleteStaff(req, res) {
        try {
            const staffId = req.params.id;
            await UserService.deleteStaff(staffId, req.user);
            res.status(200).json({
                status: true,
                message: 'Staff member deleted successfully'
            });
        } catch (error) {
            res.status(error.status || 500).json({
                status: false,
                error: error.message
            });
        }
    }

    // 15. POST: Save FCM Token
    async saveFcmToken(req, res) {
        try {
            const { fcm_token, device_type } = req.body;
            const userId = req.user.id;
            await UserService.saveFcmToken(userId, fcm_token, device_type);
            res.status(200).json({
                status: true,
                message: 'FCM token saved successfully'
            });
        } catch (error) {
            res.status(error.status || 500).json({
                status: false,
                error: error.message
            });
        }
    }

    // 16. DELETE: Remove FCM Token
    async deleteFcmToken(req, res) {
        try {
            const { fcm_token } = req.body;
            const userId = req.user.id;
            await UserService.deleteFcmToken(userId, fcm_token);
            res.status(200).json({
                status: true,
                message: 'FCM token deleted successfully'
            });
        } catch (error) {
            res.status(error.status || 500).json({
                status: false,
                error: error.message
            });
        }
    }

    // 17. POST: Test Push Notification
    async testPushNotification(req, res) {
        try {
            const { token, feed_id } = req.body;
            if (!token) {
                return res.status(400).json({
                    status: false,
                    error: 'FCM token (token) is required in body'
                });
            }

            let alertDataObj;
            let title = 'Danger Alert';
            let body = 'Bedroom Entrance Sensor';

            if (feed_id) {
                // Fetch alert from database
                const { pool, sql } = require('../config/database');
                const result = await pool.request()
                    .input('feed_id', sql.BigInt, feed_id)
                    .query(`
                        SELECT TOP 1 f.Id as feed_id, f.ev, f.msg, f.Ts_date, f.node, f.ts, f.bat_pct,
                               d.id as device_id, d.name as device_name, d.type as device_type,
                               l.id as location_id, l.name as location_name
                        FROM tbl_DeviceFeedData f
                        LEFT JOIN devices d ON (f.node = d.serial_number OR CAST(f.ts AS NVARCHAR(100)) = d.serial_number)
                        LEFT JOIN locations l ON d.location_id = l.id
                        WHERE f.Id = @feed_id
                    `);

                if (result.recordset.length > 0) {
                    const alert = result.recordset[0];
                    alertDataObj = {
                        id: String(alert.feed_id),
                        ev: alert.ev || "",
                        msg: alert.msg || "",
                        insert_date: alert.Ts_date ? alert.Ts_date.toISOString() : new Date().toISOString(),
                        battery_percentage: alert.bat_pct !== null ? Number(alert.bat_pct) : 100,
                        status: "ACTIVE",
                        device: alert.device_id ? {
                            id: Number(alert.device_id),
                            name: alert.device_name || null,
                            serial_number: alert.node || null,
                            type: alert.device_type || null,
                            location: alert.location_id ? {
                                id: Number(alert.location_id),
                                name: alert.location_name || null
                            } : null
                        } : null
                    };
                    title = `${alert.ev ? alert.ev.charAt(0).toUpperCase() + alert.ev.slice(1) : 'Sensor'} Alert`;
                    body = alert.device_name || `Sensor node: ${alert.node}`;
                }
            }

            // Fallback to sample/mock data if no database alert matched or if feed_id wasn't provided
            if (!alertDataObj) {
                alertDataObj = {
                    id: String(feed_id || "10316"),
                    ev: "danger",
                    msg: "string",
                    insert_date: "2026-07-02T18:33:55.547Z",
                    battery_percentage: 0,
                    status: "DISMISSED",
                    device: {
                        id: 9,
                        name: "Bedroom Entrance Sensor",
                        serial_number: "190711020",
                        type: "Panic Button",
                        location: {
                            id: 8,
                            name: "216, Lucknow"
                        }
                    }
                };
            }

            const payload = {
                title,
                body,
                data: {
                    type: "panic_alert",
                    alert: JSON.stringify(alertDataObj)
                }
            };

            const { sendPushNotification } = require('../services/fcmService');
            const sendResult = await sendPushNotification([token], payload);

            res.status(200).json({
                status: true,
                message: 'Test push notification triggered',
                sendResult,
                payload
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }
}

module.exports = new UserController();
