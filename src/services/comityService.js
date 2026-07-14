const comityRepository = require('../repositories/comityRepository');

class ComityService {
    async getMembersAndStats(adminId, isSuperAdmin) {
        const result = await comityRepository.getMembersAndStats(adminId, isSuperAdmin);
        
        // Ensure counts fields exist and are default-valued
        const total = result.counts.total || 0;
        const active = result.counts.active || 0;
        const inactive = result.counts.inactive || 0;

        return {
            counts: { total, active, inactive },
            data: result.data.map(row => ({
                id: row.id,
                user_id: row.user_id,
                is_active: row.is_active === true || row.is_active === 1,
                admin_id: row.admin_id,
                created_at: row.created_at,
                name: row.name,
                phone_number: row.phone_number,
                role: row.role,
                role_id: row.role_id,
                access_level: row.access_level,
                level_id: row.level_id,
                location: row.location_id ? {
                    id: row.location_id,
                    name: row.loc_name
                } : (row.location ? { name: row.location } : null)
            }))
        };
    }

    async toggleMemberStatus(userId, adminId, isSuperAdmin) {
        const result = await comityRepository.toggleMemberStatus(userId, adminId, isSuperAdmin);
        if (!result) {
            throw new Error('Comity member not found or access denied');
        }
        return {
            is_active: result.is_active === true || result.is_active === 1
        };
    }

    async removeMember(userId, adminId, isSuperAdmin) {
        await comityRepository.removeMember(userId, adminId, isSuperAdmin);
    }

    async getStaffWithComityStatus(adminId, searchQuery, isSuperAdmin) {
        const data = await comityRepository.getStaffWithComityStatus(adminId, searchQuery, isSuperAdmin);
        return data.map(row => ({
            id: row.id,
            name: row.name,
            phone_number: row.phone_number,
            role: row.role,
            role_id: row.role_id,
            access_level: row.access_level,
            level_id: row.level_id,
            location: row.location_id ? {
                id: row.location_id,
                name: row.loc_name,
                address: row.loc_address,
                city: row.loc_city,
                zip_code: row.loc_zip_code,
                is_active: row.loc_is_active
            } : (row.location ? { name: row.location } : null),
            is_commity_member: row.is_commity_member === 1 || row.is_commity_member === true,
            comity_member_is_active: row.comity_member_is_active === 1 || row.comity_member_is_active === true
        }));
    }

    async addMembers(userIds, adminId, isSuperAdmin) {
        return await comityRepository.addMembers(userIds, adminId, isSuperAdmin);
    }
}

module.exports = new ComityService();
