const locationRepository = require('../repositories/locationRepository');

class LocationController {
    async create(req, res) {
        try {
            // if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
            //     return res.status(403).json({
            //         status: false,
            //         error: 'Forbidden: Admin privileges required to manage locations'
            //     });
            // }

            const { name, address, city, zip_code, latitude, longitude } = req.body;
            if (!name || typeof name !== 'string' || name.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Location name is required'
                });
            }
            if (!address || typeof address !== 'string' || address.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Address is required'
                });
            }
            if (!city || typeof city !== 'string' || city.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'City is required'
                });
            }
            if (!zip_code || typeof zip_code !== 'string' || zip_code.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Zip code is required'
                });
            }

            const adminId = req.user.id;
            const existing = await locationRepository.findByName(adminId, name);
            if (existing) {
                return res.status(400).json({
                    status: false,
                    error: 'Location name already exists'
                });
            }

            const newLocation = await locationRepository.create({
                name,
                address,
                city,
                zip_code,
                latitude,
                longitude,
                admin_id: adminId
            });

            res.status(201).json({
                status: true,
                data: newLocation
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async getAll(req, res) {
        try {
            // if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
            //     return res.status(403).json({
            //         status: false,
            //         error: 'Forbidden: Access denied'
            //     });
            // }

            const adminId = req.user.id;
            const locations = await locationRepository.getAll(adminId);

            const totalLocations = locations.length;
            const totalNodes = locations.reduce((sum, loc) => sum + (loc.nodes || 0), 0);
            const liveCount = locations.filter(loc => loc.is_active).length;

            res.status(200).json({
                status: true,
                counts: {
                    sites: totalLocations,
                    nodes: totalNodes,
                    live: liveCount
                },
                data: locations
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
            const adminId = req.user.id;
            const location = await locationRepository.getById(parseInt(id, 10), adminId);

            if (!location) {
                return res.status(404).json({
                    status: false,
                    error: 'Location not found or access denied'
                });
            }

            res.status(200).json({
                status: true,
                data: location
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

            const adminId = req.user.id;
            const locations = await locationRepository.search(adminId, query);

            res.status(200).json({
                status: true,
                data: locations
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
            const { name, address, city, zip_code, latitude, longitude } = req.body;

            if (!name || typeof name !== 'string' || name.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Location name is required'
                });
            }
            if (!address || typeof address !== 'string' || address.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Address is required'
                });
            }
            if (!city || typeof city !== 'string' || city.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'City is required'
                });
            }
            if (!zip_code || typeof zip_code !== 'string' || zip_code.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Zip code is required'
                });
            }

            const adminId = req.user.id;

            const location = await locationRepository.getById(parseInt(id, 10), adminId);
            if (!location) {
                return res.status(404).json({
                    status: false,
                    error: 'Location not found or access denied'
                });
            }

            const existing = await locationRepository.findByName(adminId, name);
            if (existing && existing.id !== parseInt(id, 10)) {
                return res.status(400).json({
                    status: false,
                    error: 'Location name already exists'
                });
            }

            const updated = await locationRepository.update(parseInt(id, 10), { name, address, city, zip_code, latitude, longitude });

            res.status(200).json({
                status: true,
                message: 'Location updated successfully',
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
            // if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
            //     return res.status(403).json({
            //         status: false,
            //         error: 'Forbidden: Access denied'
            //     });
            // }

            const { id } = req.params;
            const adminId = req.user.id;

            const location = await locationRepository.getById(parseInt(id, 10), adminId);
            if (!location) {
                return res.status(404).json({
                    status: false,
                    error: 'Location not found or access denied'
                });
            }

            const newStatus = location.is_active ? 0 : 1;
            const updated = await locationRepository.toggleStatus(parseInt(id, 10), newStatus);

            res.status(200).json({
                status: true,
                is_active: updated.is_active,
                message: `Location status updated to ${updated.is_active ? 'Active' : 'Inactive'}`
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
            const adminId = req.user.id;

            const location = await locationRepository.getById(parseInt(id, 10), adminId);
            if (!location) {
                return res.status(404).json({
                    status: false,
                    error: 'Location not found or access denied'
                });
            }

            await locationRepository.delete(parseInt(id, 10));

            res.status(200).json({
                status: true,
                message: 'Location deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }
}

module.exports = new LocationController();
