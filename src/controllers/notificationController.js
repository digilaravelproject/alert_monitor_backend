const notificationRepository = require('../repositories/notificationRepository');
const { sendPushNotification } = require('../services/fcmService');

class NotificationController {
    // --- Super Admin CRUD methods ---
    async create(req, res) {
        try {
            if (req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Super Admin privileges required'
                });
            }

            const { title, message, is_active } = req.body;
            if (!title || typeof title !== 'string' || title.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Notification title is required'
                });
            }
            if (!message || typeof message !== 'string' || message.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Notification message is required'
                });
            }

            const newNotification = await notificationRepository.create({
                title,
                message,
                is_active
            });

            // Trigger push notifications if active
            if (newNotification.is_active) {
                try {
                    const tokens = await notificationRepository.getAllFcmTokens();
                    if (tokens && tokens.length > 0) {
                        const payload = {
                            title: newNotification.title,
                            body: newNotification.message,
                            data: {
                                type: "system_notification",
                                notification_id: String(newNotification.id)
                            }
                        };
                        await sendPushNotification(tokens, payload);
                    }
                } catch (fcmError) {
                    console.error('[Notification Broadcast] Failed to send push notification:', fcmError);
                }
            }

            res.status(201).json({
                status: true,
                data: newNotification
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async getAllAdmin(req, res) {
        try {
            if (req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Super Admin privileges required'
                });
            }

            const notifications = await notificationRepository.getAll();
            res.status(200).json({
                status: true,
                data: notifications
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async getById(req, res) {
        try {
            if (req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Super Admin privileges required'
                });
            }

            const { id } = req.params;
            const notification = await notificationRepository.getById(parseInt(id, 10));
            if (!notification) {
                return res.status(404).json({
                    status: false,
                    error: 'Notification not found'
                });
            }

            res.status(200).json({
                status: true,
                data: notification
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async update(req, res) {
        try {
            if (req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Super Admin privileges required'
                });
            }

            const { id } = req.params;
            const { title, message, is_active } = req.body;

            if (!title || typeof title !== 'string' || title.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Notification title is required'
                });
            }
            if (!message || typeof message !== 'string' || message.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Notification message is required'
                });
            }

            const notification = await notificationRepository.getById(parseInt(id, 10));
            if (!notification) {
                return res.status(404).json({
                    status: false,
                    error: 'Notification not found'
                });
            }

            const updated = await notificationRepository.update(parseInt(id, 10), {
                title,
                message,
                is_active
            });

            res.status(200).json({
                status: true,
                message: 'Notification updated successfully',
                data: updated
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async toggleStatus(req, res) {
        try {
            if (req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Super Admin privileges required'
                });
            }

            const { id } = req.params;
            const notification = await notificationRepository.getById(parseInt(id, 10));
            if (!notification) {
                return res.status(404).json({
                    status: false,
                    error: 'Notification not found'
                });
            }

            const newStatus = notification.is_active ? 0 : 1;
            const updated = await notificationRepository.toggleStatus(parseInt(id, 10), newStatus);

            res.status(200).json({
                status: true,
                is_active: updated.is_active,
                message: `Notification status updated to ${updated.is_active ? 'Active' : 'Inactive'}`
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async delete(req, res) {
        try {
            if (req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Super Admin privileges required'
                });
            }

            const { id } = req.params;
            const notification = await notificationRepository.getById(parseInt(id, 10));
            if (!notification) {
                return res.status(404).json({
                    status: false,
                    error: 'Notification not found'
                });
            }

            await notificationRepository.delete(parseInt(id, 10));

            res.status(200).json({
                status: true,
                message: 'Notification deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    // --- User notification endpoints (requires auth) ---
    async getUserNotifications(req, res) {
        try {
            const notifications = await notificationRepository.getUserNotifications(req.user.id);
            res.status(200).json({
                status: true,
                data: notifications
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async markAsRead(req, res) {
        try {
            const { id } = req.params;
            await notificationRepository.markAsRead(req.user.id, parseInt(id, 10));
            res.status(200).json({
                status: true,
                message: 'Notification marked as read successfully'
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async markAllAsRead(req, res) {
        try {
            await notificationRepository.markAllAsRead(req.user.id);
            res.status(200).json({
                status: true,
                message: 'All notifications marked as read successfully'
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }
}

module.exports = new NotificationController();
