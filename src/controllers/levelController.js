const levelRepository = require('../repositories/levelRepository');

class LevelController {
    async create(req, res) {
        try {
            if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Admin privileges required to manage levels'
                });
            }

            const { name, description, sla_window, cycle_count, response_logic, color } = req.body;
            if (!name || typeof name !== 'string' || name.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Level name is required'
                });
            }

            const adminId = req.user.id;
            const existing = await levelRepository.findByName(adminId, name);
            if (existing) {
                return res.status(400).json({
                    status: false,
                    error: 'Level name already exists'
                });
            }

            const newLevel = await levelRepository.create({
                name,
                description,
                slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                sla_window,
                cycle_count,
                response_logic,
                color,
                admin_id: adminId
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
            if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Access denied'
                });
            }

            const adminId = req.user.id;
            const levels = await levelRepository.getAll(adminId);

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
            if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
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

            const adminId = req.user.id;
            const levels = await levelRepository.search(adminId, query);

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
            if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Access denied'
                });
            }

            const { id } = req.params;
            const adminId = req.user.id;
            const level = await levelRepository.getById(parseInt(id, 10), adminId);

            if (!level) {
                return res.status(404).json({
                    status: false,
                    error: 'Level not found or access denied'
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
            if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
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

            const adminId = req.user.id;

            const existingLevel = await levelRepository.getById(parseInt(id, 10), adminId);
            if (!existingLevel) {
                return res.status(404).json({
                    status: false,
                    error: 'Level not found or access denied'
                });
            }

            const duplicate = await levelRepository.findByNameExcludingId(adminId, name, parseInt(id, 10));
            if (duplicate) {
                return res.status(400).json({
                    status: false,
                    error: 'Level name already exists'
                });
            }

            const updated = await levelRepository.update(parseInt(id, 10), { name, description, sla_window, cycle_count, response_logic, color });

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
            if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Access denied'
                });
            }

            const { id } = req.params;
            const adminId = req.user.id;

            const existingLevel = await levelRepository.getById(parseInt(id, 10), adminId);
            if (!existingLevel) {
                return res.status(404).json({
                    status: false,
                    error: 'Level not found or access denied'
                });
            }

            await levelRepository.delete(parseInt(id, 10));

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
