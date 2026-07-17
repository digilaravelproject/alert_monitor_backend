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
            const isSuperAdmin = req.user.role === 'Super Admin';
            const isAdmin = req.user.role === 'Admin';
            const isStaff = !!req.user.admin_id;

            if (!isSuperAdmin && !isAdmin && !isStaff) {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Access denied'
                });
            }

            const adminId = isSuperAdmin ? null : (isAdmin ? req.user.id : req.user.admin_id);
            const roles = await roleRepository.getAll(adminId, isSuperAdmin);
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
            const isSuperAdmin = req.user.role === 'Super Admin';
            const isAdmin = req.user.role === 'Admin';
            const isStaff = !!req.user.admin_id;

            if (!isSuperAdmin && !isAdmin && !isStaff) {
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

            const adminId = isSuperAdmin ? null : (isAdmin ? req.user.id : req.user.admin_id);
            const roles = await roleRepository.search(adminId, query, isSuperAdmin);
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
            const isSuperAdmin = req.user.role === 'Super Admin';
            const isAdmin = req.user.role === 'Admin';
            const isStaff = !!req.user.admin_id;

            if (!isSuperAdmin && !isAdmin && !isStaff) {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Access denied'
                });
            }

            const { id } = req.params;
            const adminId = isSuperAdmin ? null : (isAdmin ? req.user.id : req.user.admin_id);
            const role = await roleRepository.getById(id, adminId, isSuperAdmin);
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
            const isSuperAdmin = req.user.role === 'Super Admin';
            const isAdmin = req.user.role === 'Admin';

            if (!isSuperAdmin && !isAdmin) {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Access denied'
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

            const adminId = isSuperAdmin ? null : req.user.id;
            const existing = await roleRepository.getById(id, adminId, isSuperAdmin);
            if (!existing) {
                return res.status(404).json({
                    status: false,
                    error: 'Role not found or access denied'
                });
            }

            // Enforce that system roles (admin_id is null) can only be updated by Super Admin
            if (existing.admin_id === null && !isSuperAdmin) {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Default system roles can only be updated by Super Admin'
                });
            }

            const duplicate = await roleRepository.findByNameExcludingId(adminId, name, id);
            if (duplicate) {
                return res.status(400).json({
                    status: false,
                    error: 'Role name already exists'
                });
            }

            // Update role details
            await roleRepository.update(id, adminId, { name, description }, isSuperAdmin);

            // Update permissions
            if (Array.isArray(permissions)) {
                await roleRepository.assignPermissions(id, permissions);
            }

            // Fetch final updated role
            const updatedRole = await roleRepository.getById(id, adminId, isSuperAdmin);

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
            const existing = await roleRepository.getById(id, adminId, isSuperAdmin);
            if (!existing) {
                return res.status(404).json({
                    status: false,
                    error: 'Role not found or access denied'
                });
            }

            // Enforce that system roles (admin_id is null) can only be deleted by Super Admin
            if (existing.admin_id === null && !isSuperAdmin) {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Default system roles can only be deleted by Super Admin'
                });
            }

            await roleRepository.delete(id, adminId, isSuperAdmin);
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
