const { sql, pool, poolConnect } = require('../config/database');

class ComityRepository {
    async getMembersAndStats(adminId, isSuperAdmin) {
        await poolConnect;
        
        // 1. Stats query
        let statsQuery = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN cm.is_active = 1 THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN cm.is_active = 0 THEN 1 ELSE 0 END) as inactive
            FROM comity_members cm
            JOIN users u ON cm.user_id = u.id
        `;
        
        // 2. Members query
        let membersQuery = `
            SELECT cm.id, cm.user_id, cm.is_active, cm.admin_id, cm.created_at,
                   u.name, u.phone_number, COALESCE(r.name, u.role) as role, u.role_id,
                   COALESCE(l.name, u.access_level) as access_level, u.level_id, 
                   u.location, u.location_id, loc.name as loc_name
            FROM comity_members cm
            JOIN users u ON cm.user_id = u.id
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN levels l ON u.level_id = l.id
            LEFT JOIN locations loc ON u.location_id = loc.id
        `;

        const request = pool.request();
        if (!isSuperAdmin) {
            statsQuery += ' WHERE cm.admin_id = @adminId';
            membersQuery += ' WHERE cm.admin_id = @adminId';
            request.input('adminId', sql.Int, adminId);
        }

        membersQuery += ' ORDER BY cm.id DESC';

        const statsResult = await request.query(statsQuery);
        
        const membersRequest = pool.request();
        if (!isSuperAdmin) {
            membersRequest.input('adminId', sql.Int, adminId);
        }
        const membersResult = await membersRequest.query(membersQuery);

        return {
            counts: statsResult.recordset[0] || { total: 0, active: 0, inactive: 0 },
            data: membersResult.recordset
        };
    }

    async toggleMemberStatus(userId, adminId, isSuperAdmin) {
        await poolConnect;
        const request = pool.request()
            .input('userId', sql.Int, userId);

        let query = `
            UPDATE comity_members
            SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END
            OUTPUT INSERTED.is_active
            WHERE user_id = @userId
        `;

        if (!isSuperAdmin) {
            query += ' AND admin_id = @adminId';
            request.input('adminId', sql.Int, adminId);
        }

        const result = await request.query(query);
        return result.recordset[0];
    }

    async removeMember(userId, adminId, isSuperAdmin) {
        await poolConnect;
        const request = pool.request()
            .input('userId', sql.Int, userId);

        let query = 'DELETE FROM comity_members WHERE user_id = @userId';

        if (!isSuperAdmin) {
            query += ' AND admin_id = @adminId';
            request.input('adminId', sql.Int, adminId);
        }

        await request.query(query);
    }

    async getStaffWithComityStatus(adminId, searchQuery, isSuperAdmin) {
        await poolConnect;
        let queryStr = `
            SELECT u.id, u.name, u.email, u.phone_number, COALESCE(r.name, u.role) as role, u.role_id, 
                   COALESCE(l.name, u.access_level) as access_level, u.level_id, u.location, u.location_id,
                   loc.name as loc_name, loc.address as loc_address, loc.city as loc_city, loc.zip_code as loc_zip_code, loc.is_active as loc_is_active,
                   u.created_at, u.admin_id, u.is_blocked,
                   CASE WHEN cm.user_id IS NOT NULL THEN 1 ELSE 0 END as is_commity_member,
                   cm.is_active as comity_member_is_active
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN levels l ON u.level_id = l.id
            LEFT JOIN locations loc ON u.location_id = loc.id
            LEFT JOIN comity_members cm ON u.id = cm.user_id
            WHERE u.role != 'Admin'
        `;

        const request = pool.request();
        if (!isSuperAdmin) {
            queryStr += ' AND u.admin_id = @adminId';
            request.input('adminId', sql.Int, adminId);
        }

        if (searchQuery && searchQuery.trim() !== '') {
            queryStr += ' AND (u.name LIKE @searchQuery OR u.phone_number LIKE @searchQuery)';
            request.input('searchQuery', sql.NVarChar, `%${searchQuery.trim()}%`);
        }

        queryStr += ' ORDER BY u.id DESC';

        const result = await request.query(queryStr);
        return result.recordset;
    }

    async addMembers(userIds, adminId, isSuperAdmin) {
        await poolConnect;
        let addedCount = 0;

        for (const userId of userIds) {
            const request = pool.request()
                .input('userId', sql.Int, userId)
                .input('adminId', sql.Int, adminId);

            let query = '';
            if (isSuperAdmin) {
                query = `
                    INSERT INTO comity_members (user_id, admin_id, is_active)
                    SELECT u.id, COALESCE(u.admin_id, @adminId), 1
                    FROM users u
                    WHERE u.id = @userId
                      AND NOT EXISTS (SELECT 1 FROM comity_members WHERE user_id = u.id)
                `;
            } else {
                query = `
                    INSERT INTO comity_members (user_id, admin_id, is_active)
                    SELECT u.id, @adminId, 1
                    FROM users u
                    WHERE u.id = @userId AND u.admin_id = @adminId
                      AND NOT EXISTS (SELECT 1 FROM comity_members WHERE user_id = u.id)
                `;
            }

            const result = await request.query(query);
            if (result.rowsAffected[0] > 0) {
                addedCount++;
            }
        }

        return addedCount;
    }

    async isUserActiveComityMember(userId) {
        await poolConnect;
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT TOP 1 is_active FROM comity_members WHERE user_id = @userId');
        
        if (result.recordset.length === 0) {
            return false;
        }
        return result.recordset[0].is_active === true || result.recordset[0].is_active === 1;
    }
}

module.exports = new ComityRepository();
