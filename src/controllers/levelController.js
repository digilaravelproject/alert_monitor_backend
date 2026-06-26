const levelRepository = require('../repositories/levelRepository');

class LevelController {
    async create(req, res) {
        try {
            if (req.user.role !== 'Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Admin privileges required to create levels'
                });
            }

            const { name, description, sla_window, cycle_count, response_logic, color } = req.body;
            if (!name || typeof name !== 'string' || name.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Level name is required'
                });
            }

            const existing = await levelRepository.findByName(req.user.id, name);
            if (existing) {
                return res.status(400).json({
                    status: false,
                    error: 'Level name already exists'
                });
            }

            const newLevel = await levelRepository.create({
                name,
                description,
                sla_window,
                cycle_count,
                response_logic,
                color,
                admin_id: req.user.id
            });

            res.status(201).json({
                status: true,
                data: newLevel
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
            const isSuperAdmin = req.user.role === 'Super Admin';
            const isAdmin = req.user.role === 'Admin';

            if (!isSuperAdmin && !isAdmin) {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Access denied'
                });
            }

            const adminId = isSuperAdmin ? null : req.user.id;
            const levels = await levelRepository.getAll(adminId, isSuperAdmin);

            res.status(200).json({
                status: true,
                counts: {
                    levels: levels.length,
                    alerts: 1, // static count as requested
                    sla: '100%' // static SLA as requested
                },
                data: levels
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
            const isSuperAdmin = req.user.role === 'Super Admin';
            const isAdmin = req.user.role === 'Admin';

            if (!isSuperAdmin && !isAdmin) {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Access denied'
                });
            }

            const { query } = req.query;
            if (!query || typeof query !== 'string' || query.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Search query is required'
                });
            }

            const adminId = isSuperAdmin ? null : req.user.id;
            const levels = await levelRepository.search(adminId, query, isSuperAdmin);

            res.status(200).json({
                status: true,
                data: levels
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
            const isSuperAdmin = req.user.role === 'Super Admin';
            const isAdmin = req.user.role === 'Admin';

            if (!isSuperAdmin && !isAdmin) {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Access denied'
                });
            }

            const { id } = req.params;
            const adminId = isSuperAdmin ? null : req.user.id;
            const level = await levelRepository.getById(id, adminId, isSuperAdmin);

            if (!level) {
                return res.status(404).json({
                    status: false,
                    error: 'Level not found'
                });
            }

            res.status(200).json({
                status: true,
                data: level
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
            const isSuperAdmin = req.user.role === 'Super Admin';
            const isAdmin = req.user.role === 'Admin';

            if (!isSuperAdmin && !isAdmin) {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Access denied'
                });
            }

            const { id } = req.params;
            const { name, description, sla_window, cycle_count, response_logic, color } = req.body;

            if (!name || typeof name !== 'string' || name.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Level name is required'
                });
            }

            const adminId = isSuperAdmin ? null : req.user.id;
            const existing = await levelRepository.getById(id, adminId, isSuperAdmin);

            if (!existing) {
                return res.status(404).json({
                    status: false,
                    error: 'Level not found or access denied'
                });
            }

            // Enforce that system roles (admin_id is null) can only be updated by Super Admin
            if (existing.admin_id === null && !isSuperAdmin) {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Default system levels can only be updated by Super Admin'
                });
            }

            const duplicate = await levelRepository.findByNameExcludingId(adminId, name, id);
            if (duplicate) {
                return res.status(400).json({
                    status: false,
                    error: 'Level name already exists'
                });
            }

            const updated = await levelRepository.update(id, {
                name,
                description,
                sla_window,
                cycle_count,
                response_logic,
                color
            });

            res.status(200).json({
                status: true,
                message: 'Level updated successfully',
                data: updated
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
            const isSuperAdmin = req.user.role === 'Super Admin';
            const isAdmin = req.user.role === 'Admin';

            if (!isSuperAdmin && !isAdmin) {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Access denied'
                });
            }

            const { id } = req.params;
            const adminId = isSuperAdmin ? null : req.user.id;
            const existing = await levelRepository.getById(id, adminId, isSuperAdmin);

            if (!existing) {
                return res.status(404).json({
                    status: false,
                    error: 'Level not found or access denied'
                });
            }

            // Enforce that system roles (admin_id is null) can only be deleted by Super Admin
            if (existing.admin_id === null && !isSuperAdmin) {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Default system levels can only be deleted by Super Admin'
                });
            }

            await levelRepository.delete(id);

            res.status(200).json({
                status: true,
                message: 'Level deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }
}

module.exports = new LevelController();
