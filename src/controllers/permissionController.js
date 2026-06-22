const permissionRepository = require('../repositories/permissionRepository');

class PermissionController {
    async getAll(req, res) {
        try {
            // Note: both Super Admins and regular Admins can read permissions
            if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Access denied'
                });
            }

            const permissions = await permissionRepository.getAll();
            res.status(200).json({
                status: true,
                data: permissions
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async create(req, res) {
        try {
            if (req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Super admin privileges required'
                });
            }

            const { name, description, is_active } = req.body;
            if (!name || typeof name !== 'string' || name.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Permission name is required'
                });
            }

            const existing = await permissionRepository.findByName(name);
            if (existing) {
                return res.status(400).json({
                    status: false,
                    error: 'Permission name already exists'
                });
            }

            const newPerm = await permissionRepository.create({ name, description, is_active });
            res.status(201).json({
                status: true,
                data: newPerm
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
                    error: 'Forbidden: Super admin privileges required'
                });
            }

            const { id } = req.params;
            const { name, description, is_active } = req.body;

            if (!name || typeof name !== 'string' || name.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Permission name is required'
                });
            }

            const existing = await permissionRepository.getById(id);
            if (!existing) {
                return res.status(404).json({
                    status: false,
                    error: 'Permission not found'
                });
            }

            const duplicate = await permissionRepository.findByNameExcludingId(name, id);
            if (duplicate) {
                return res.status(400).json({
                    status: false,
                    error: 'Permission name already exists'
                });
            }

            const updated = await permissionRepository.update(id, { name, description, is_active });
            res.status(200).json({
                status: true,
                data: updated
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async toggle(req, res) {
        try {
            if (req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Super admin privileges required'
                });
            }

            const { id } = req.params;
            const existing = await permissionRepository.getById(id);
            if (!existing) {
                return res.status(404).json({
                    status: false,
                    error: 'Permission not found'
                });
            }

            const result = await permissionRepository.toggleActive(id);
            res.status(200).json({
                status: true,
                message: `Permission has been successfully ${result.is_active ? 'activated' : 'deactivated'}`,
                data: result
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
                    error: 'Forbidden: Super admin privileges required'
                });
            }

            const { id } = req.params;
            const existing = await permissionRepository.getById(id);
            if (!existing) {
                return res.status(404).json({
                    status: false,
                    error: 'Permission not found'
                });
            }

            await permissionRepository.delete(id);
            res.status(200).json({
                status: true,
                message: 'Permission deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }
}

module.exports = new PermissionController();
