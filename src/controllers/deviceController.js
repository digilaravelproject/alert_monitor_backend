const deviceRepository = require('../repositories/deviceRepository');
const locationRepository = require('../repositories/locationRepository');

class DeviceController {
    async create(req, res) {
        try {
            if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Admin privileges required to manage devices'
                });
            }

            const { name, serial_number, type, location_id } = req.body;
            const isSuperAdmin = req.user.role === 'Super Admin';
            const adminId = isSuperAdmin ? null : req.user.id;

            // 1. Verify location exists and is accessible
            const location = await locationRepository.getById(parseInt(location_id, 10), adminId, isSuperAdmin);
            if (!location) {
                return res.status(404).json({
                    status: false,
                    error: 'Location not found or access denied'
                });
            }

            // 2. Check if serial number already exists
            const existing = await deviceRepository.findBySerialNumber(serial_number);
            if (existing) {
                return res.status(400).json({
                    status: false,
                    error: 'Device with this serial number/ID already registered'
                });
            }

            // 3. Create device
            const newDevice = await deviceRepository.create({
                name,
                serial_number,
                type,
                location_id: parseInt(location_id, 10)
            });

            res.status(201).json({
                status: true,
                message: 'Device registered successfully',
                data: newDevice
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async getTypes(req, res) {
        try {
            const types = [
                'Panic Button',
                'Gunshot Sensor',
                'Fire Detector',
                'Crowd Monitor',
                'High Noise Sensor',
                'Presence Radar',
                'Vibration Tamper',
                'Hardware Diagnostics'
            ];
            res.status(200).json({
                status: true,
                data: types
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async getAlertsData(req, res) {
        try {
            const { type } = req.query;
            const isSuperAdmin = req.user.role === 'Super Admin';
            const isAdmin = req.user.role === 'Admin';
            let adminId = null;
            let locationId = null;

            if (isSuperAdmin) {
                // No filters
            } else if (isAdmin) {
                adminId = req.user.id;
            } else {
                const userRepository = require('../repositories/userRepository');
                const userProfile = await userRepository.getProfile(req.user.id, req.user.role);
                if (userProfile && userProfile.location_id) {
                    locationId = userProfile.location_id;
                }
            }

            const result = await deviceRepository.getAlertsData(adminId, isSuperAdmin, type, locationId);
            
            res.status(200).json({
                status: true,
                counts: result.counts,
                data: result.data
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async search(req, res) {
        try {
            // if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
            //     return res.status(403).json({
            //         status: false,
            //         error: 'Forbidden: Access denied'
            //     });
            // }

            const { query } = req.query;
            if (!query || typeof query !== 'string' || query.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Search query is required'
                });
            }

            const isSuperAdmin = req.user.role === 'Super Admin';
            const adminId = isSuperAdmin ? null : req.user.id;

            const devices = await deviceRepository.search(adminId, query, isSuperAdmin);

            res.status(200).json({
                status: true,
                data: devices
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
            // if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
            //     return res.status(403).json({
            //         status: false,
            //         error: 'Forbidden: Access denied'
            //     });
            // }

            const { id } = req.params;
            const isSuperAdmin = req.user.role === 'Super Admin';
            const adminId = isSuperAdmin ? null : req.user.id;

            const device = await deviceRepository.getById(parseInt(id, 10), adminId, isSuperAdmin);
            if (!device) {
                return res.status(404).json({
                    status: false,
                    error: 'Device not found or access denied'
                });
            }

            const newStatus = device.is_active ? 0 : 1;
            const updated = await deviceRepository.toggleStatus(parseInt(id, 10), newStatus);

            res.status(200).json({
                status: true,
                is_active: updated.is_active,
                message: `Device status updated to ${updated.is_active ? 'Active' : 'Inactive'}`
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
            // if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
            //     return res.status(403).json({
            //         status: false,
            //         error: 'Forbidden: Access denied'
            //     });
            // }

            const { id } = req.params;
            const isSuperAdmin = req.user.role === 'Super Admin';
            const adminId = isSuperAdmin ? null : req.user.id;

            const device = await deviceRepository.getById(parseInt(id, 10), adminId, isSuperAdmin);
            if (!device) {
                return res.status(404).json({
                    status: false,
                    error: 'Device not found or access denied'
                });
            }

            res.status(200).json({
                status: true,
                data: device
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
            // if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
            //     return res.status(403).json({
            //         status: false,
            //         error: 'Forbidden: Access denied'
            //     });
            // }

            const { id } = req.params;
            const { name, serial_number, type, location_id } = req.body;
            const isSuperAdmin = req.user.role === 'Super Admin';
            const adminId = isSuperAdmin ? null : req.user.id;

            // 1. Verify device exists and is accessible
            const device = await deviceRepository.getById(parseInt(id, 10), adminId, isSuperAdmin);
            if (!device) {
                return res.status(404).json({
                    status: false,
                    error: 'Device not found or access denied'
                });
            }

            // 2. Verify location exists and is accessible
            const location = await locationRepository.getById(parseInt(location_id, 10), adminId, isSuperAdmin);
            if (!location) {
                return res.status(404).json({
                    status: false,
                    error: 'Location not found or access denied'
                });
            }

            // 3. Verify serial number is unique if updated
            const existing = await deviceRepository.findBySerialNumber(serial_number);
            if (existing && existing.id !== parseInt(id, 10)) {
                return res.status(400).json({
                    status: false,
                    error: 'Device with this serial number/ID already registered'
                });
            }

            // 4. Update device
            const updated = await deviceRepository.update(parseInt(id, 10), { name, serial_number, type, location_id: parseInt(location_id, 10) });

            res.status(200).json({
                status: true,
                message: 'Device updated successfully',
                data: updated
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async removeAlert(req, res) {
        try {
            // if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
            //     return res.status(403).json({
            //         status: false,
            //         error: 'Forbidden: Access denied'
            //     });
            // }

            const { id } = req.params;
            const isSuperAdmin = req.user.role === 'Super Admin';
            const adminId = isSuperAdmin ? null : req.user.id;

            // Verify device exists and is accessible
            const device = await deviceRepository.getById(parseInt(id, 10), adminId, isSuperAdmin);
            if (!device) {
                return res.status(404).json({
                    status: false,
                    error: 'Device not found or access denied'
                });
            }

            await deviceRepository.dismissAlert(parseInt(id, 10));

            res.status(200).json({
                status: true,
                message: 'Alerts dismissed for this device successfully'
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async removeAlertByFeedId(req, res) {
        try {
            // if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
            //     return res.status(403).json({
            //         status: false,
            //         error: 'Forbidden: Access denied'
            //     });
            // }

            const { feedId } = req.params;

            await deviceRepository.dismissAlertByFeedId(parseInt(feedId, 10));

            res.status(200).json({
                status: true,
                message: 'Alert dismissed successfully'
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
            // if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
            //     return res.status(403).json({
            //         status: false,
            //         error: 'Forbidden: Access denied'
            //     });
            // }

            const { id } = req.params;
            const isSuperAdmin = req.user.role === 'Super Admin';
            const adminId = isSuperAdmin ? null : req.user.id;

            // Verify device exists and is accessible
            const device = await deviceRepository.getById(parseInt(id, 10), adminId, isSuperAdmin);
            if (!device) {
                return res.status(404).json({
                    status: false,
                    error: 'Device not found or access denied'
                });
            }

            await deviceRepository.delete(parseInt(id, 10));

            res.status(200).json({
                status: true,
                message: 'Device deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async acknowledgeAlert(req, res) {
        try {
            // if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
            //     return res.status(403).json({
            //         status: false,
            //         error: 'Forbidden: Access denied'
            //     });
            // }

            const { id } = req.params;
            const isSuperAdmin = req.user.role === 'Super Admin';
            const adminId = isSuperAdmin ? null : req.user.id;

            // Verify device exists and is accessible
            const device = await deviceRepository.getById(parseInt(id, 10), adminId, isSuperAdmin);
            if (!device) {
                return res.status(404).json({
                    status: false,
                    error: 'Device not found or access denied'
                });
            }

            const username = req.user.name || req.user.email || 'Operator';
            await deviceRepository.acknowledgeAlert(parseInt(id, 10), username);

            res.status(200).json({
                status: true,
                message: 'Alerts acknowledged successfully'
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async acknowledgeAlertByFeedId(req, res) {
        try {
            // if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
            //     return res.status(403).json({
            //         status: false,
            //         error: 'Forbidden: Access denied'
            //     });
            // }

            const { feedId } = req.params;
            const username = req.user.name || req.user.email || 'Operator';

            await deviceRepository.acknowledgeAlertByFeedId(parseInt(feedId, 10), username);

            res.status(200).json({
                status: true,
                message: 'Alert acknowledged successfully'
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async getAnalysis(req, res) {
        try {
            // if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
            //     return res.status(403).json({
            //         status: false,
            //         error: 'Forbidden: Access denied'
            //     });
            // }

            const { id } = req.params;
            const isSuperAdmin = req.user.role === 'Super Admin';
            const adminId = isSuperAdmin ? null : req.user.id;

            const analysisData = await deviceRepository.getAnalysisData(parseInt(id, 10), adminId, isSuperAdmin);
            if (!analysisData) {
                return res.status(404).json({
                    status: false,
                    error: 'Alert not found or access denied'
                });
            }

            res.status(200).json({
                status: true,
                data: analysisData
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async getAlertsForDevice(req, res) {
        try {
            const { id } = req.params;
            const isSuperAdmin = req.user.role === 'Super Admin';
            const isAdmin = req.user.role === 'Admin';
            let adminId = null;
            let locationId = null;

            if (isSuperAdmin) {
                // No filters
            } else if (isAdmin) {
                adminId = req.user.id;
            } else {
                const userRepository = require('../repositories/userRepository');
                const userProfile = await userRepository.getProfile(req.user.id, req.user.role);
                if (userProfile && userProfile.location_id) {
                    locationId = userProfile.location_id;
                }
            }

            const alertsData = await deviceRepository.getAlertsForDevice(parseInt(id, 10), adminId, isSuperAdmin, locationId);
            if (!alertsData) {
                return res.status(404).json({
                    status: false,
                    error: 'Device not found or access denied'
                });
            }

            res.status(200).json({
                status: true,
                data: alertsData
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async getAllAlertsForAdmin(req, res) {
        try {
            const isSuperAdmin = req.user.role === 'Super Admin';
            const isAdmin = req.user.role === 'Admin';
            let adminId = null;
            let locationId = null;

            if (isSuperAdmin) {
                // No filters for super admins
            } else if (isAdmin) {
                adminId = req.user.id;
            } else {
                const userRepository = require('../repositories/userRepository');
                const userProfile = await userRepository.getProfile(req.user.id, req.user.role);
                if (userProfile && userProfile.location_id) {
                    locationId = userProfile.location_id;
                }
            }

            const alerts = await deviceRepository.getAllAlertsForAdmin(adminId, isSuperAdmin, locationId);

            res.status(200).json({
                status: true,
                data: alerts
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }
}

module.exports = new DeviceController();
