const comityService = require('../services/comityService');

class ComityController {
    // 1. GET /api/comity/members
    async getMembersAndStats(req, res) {
        try {
            if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Admin access required'
                });
            }

            const adminId = req.user.id;
            const isSuperAdmin = req.user.role === 'Super Admin';

            const result = await comityService.getMembersAndStats(adminId, isSuperAdmin);
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

    // 2. POST /api/comity/members/:userId/toggle
    async toggleMemberStatus(req, res) {
        try {
            if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Admin access required'
                });
            }

            const userId = parseInt(req.params.userId, 10);
            if (isNaN(userId)) {
                return res.status(400).json({
                    status: false,
                    error: 'Invalid user ID'
                });
            }

            const adminId = req.user.id;
            const isSuperAdmin = req.user.role === 'Super Admin';

            const result = await comityService.toggleMemberStatus(userId, adminId, isSuperAdmin);
            res.status(200).json({
                status: true,
                message: 'Comity member status updated successfully',
                is_active: result.is_active
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    // 3. DELETE /api/comity/members/:userId
    async removeMember(req, res) {
        try {
            if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Admin access required'
                });
            }

            const userId = parseInt(req.params.userId, 10);
            if (isNaN(userId)) {
                return res.status(400).json({
                    status: false,
                    error: 'Invalid user ID'
                });
            }

            const adminId = req.user.id;
            const isSuperAdmin = req.user.role === 'Super Admin';

            await comityService.removeMember(userId, adminId, isSuperAdmin);
            res.status(200).json({
                status: true,
                message: 'Member removed from comity successfully'
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    // 4. GET /api/comity/staff
    async getStaffWithComityStatus(req, res) {
        try {
            if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Admin access required'
                });
            }

            const adminId = req.user.id;
            const isSuperAdmin = req.user.role === 'Super Admin';
            const searchQuery = req.query.query || '';

            const data = await comityService.getStaffWithComityStatus(adminId, searchQuery, isSuperAdmin);
            res.status(200).json({
                status: true,
                data: data
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    // 5. POST /api/comity/members
    async addMembers(req, res) {
        try {
            if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Admin access required'
                });
            }

            const userIds = req.body.normalizedUserIds || [];
            const adminId = req.user.id;
            const isSuperAdmin = req.user.role === 'Super Admin';

            const addedCount = await comityService.addMembers(userIds, adminId, isSuperAdmin);
            res.status(201).json({
                status: true,
                message: `${addedCount} members added to comity successfully`,
                addedCount: addedCount
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }
}

module.exports = new ComityController();
