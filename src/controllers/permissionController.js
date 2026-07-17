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
        return res.status(403).json({
            status: false,
            error: 'Forbidden: Adding new permissions is disabled'
        });
    }

    async update(req, res) {
        return res.status(403).json({
            status: false,
            error: 'Forbidden: Updating permissions is disabled'
        });
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
        return res.status(403).json({
            status: false,
            error: 'Forbidden: Deleting permissions is disabled'
        });
    }
}

module.exports = new PermissionController();
