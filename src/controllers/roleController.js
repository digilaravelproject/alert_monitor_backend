const roleRepository = require('../repositories/roleRepository');

class RoleController {
    async create(req, res) {
        try {
            if (req.user.role !== 'Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Admin privileges required'
                });
            }

            const { name, description, permissions } = req.body;
            if (!name || typeof name !== 'string' || name.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Role name is required'
                });
            }

            const existing = await roleRepository.findByName(req.user.id, name);
            if (existing) {
                return res.status(400).json({
                    status: false,
                    error: 'Role name already exists'
                });
            }

            // Create role
            const newRole = await roleRepository.create({
                name,
                description,
                admin_id: req.user.id
            });

            // Assign permissions
            if (Array.isArray(permissions)) {
                await roleRepository.assignPermissions(newRole.id, permissions);
            }

            // Fetch final role with permissions
            const roleWithPerms = await roleRepository.getById(newRole.id, req.user.id);

            res.status(201).json({
                status: true,
                data: roleWithPerms
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
            if (req.user.role !== 'Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Admin privileges required'
                });
            }

            const roles = await roleRepository.getAll(req.user.id);
            res.status(200).json({
                status: true,
                data: roles
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
            if (req.user.role !== 'Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Admin privileges required'
                });
            }

            const { query } = req.query;
            if (!query || typeof query !== 'string' || query.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Search query is required'
                });
            }

            const roles = await roleRepository.search(req.user.id, query);
            res.status(200).json({
                status: true,
                data: roles
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
            if (req.user.role !== 'Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Admin privileges required'
                });
            }

            const { id } = req.params;
            const role = await roleRepository.getById(id, req.user.id);
            if (!role) {
                return res.status(404).json({
                    status: false,
                    error: 'Role not found'
                });
            }

            res.status(200).json({
                status: true,
                data: role
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
            if (req.user.role !== 'Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Admin privileges required'
                });
            }

            const { id } = req.params;
            const { name, description, permissions } = req.body;

            if (!name || typeof name !== 'string' || name.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Role name is required'
                });
            }

            const existing = await roleRepository.getById(id, req.user.id);
            if (!existing) {
                return res.status(404).json({
                    status: false,
                    error: 'Role not found or access denied'
                });
            }

            const duplicate = await roleRepository.findByNameExcludingId(req.user.id, name, id);
            if (duplicate) {
                return res.status(400).json({
                    status: false,
                    error: 'Role name already exists'
                });
            }

            // Update role details
            await roleRepository.update(id, req.user.id, { name, description });

            // Update permissions
            if (Array.isArray(permissions)) {
                await roleRepository.assignPermissions(id, permissions);
            }

            // Fetch final updated role
            const updatedRole = await roleRepository.getById(id, req.user.id);

            res.status(200).json({
                status: true,
                message: 'Role updated successfully',
                data: updatedRole
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
            if (req.user.role !== 'Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Admin privileges required'
                });
            }

            const { id } = req.params;
            const existing = await roleRepository.getById(id, req.user.id);
            if (!existing) {
                return res.status(404).json({
                    status: false,
                    error: 'Role not found or access denied'
                });
            }

            await roleRepository.delete(id, req.user.id);
            res.status(200).json({
                status: true,
                message: 'Role deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }
}

module.exports = new RoleController();
