const { sql, pool, poolConnect } = require('../config/database');

class RoleRepository {
    async create({ name, description, admin_id }) {
        await poolConnect;
        const result = await pool.request()
            .input('name', sql.NVarChar, name.trim())
            .input('description', sql.NVarChar, description ? description.trim() : null)
            .input('admin_id', sql.Int, admin_id)
            .query(`
                INSERT INTO roles (name, description, admin_id)
                OUTPUT INSERTED.id, INSERTED.name, INSERTED.description, INSERTED.admin_id, INSERTED.created_at
                VALUES (@name, @description, @admin_id)
            `);
        return result.recordset[0];
    }

    async assignPermissions(roleId, permissionIds) {
        await poolConnect;
        // 1. Delete existing associations
        await pool.request()
            .input('role_id', sql.Int, roleId)
            .query('DELETE FROM role_permissions WHERE role_id = @role_id');

        // 2. Insert new associations
        if (permissionIds && permissionIds.length > 0) {
            for (const permId of permissionIds) {
                await pool.request()
                    .input('role_id', sql.Int, roleId)
                    .input('permission_id', sql.Int, permId)
                    .query(`
                        INSERT INTO role_permissions (role_id, permission_id)
                        VALUES (@role_id, @permission_id)
                    `);
            }
        }
    }

    async getAll(adminId = null, isSuperAdmin = false) {
        await poolConnect;
        let query = `
            SELECT r.id, r.name, r.description, r.admin_id, r.created_at,
                   u.name AS owner_name, u.email AS owner_email
            FROM roles r
            LEFT JOIN users u ON r.admin_id = u.id
            WHERE r.admin_id IS NOT NULL
        `;
        const request = pool.request();
        if (!isSuperAdmin && adminId !== null) {
            query += ' AND r.admin_id = @adminId';
            request.input('adminId', sql.Int, adminId);
        }
        query += ' ORDER BY r.id DESC';

        const rolesResult = await request.query(query);
        const roles = rolesResult.recordset;
        for (const role of roles) {
            role.permissions = await this.getPermissionsByRoleId(role.id);
        }
        return roles;
    }

    async getPermissionsByRoleId(roleId) {
        await poolConnect;
        const result = await pool.request()
            .input('role_id', sql.Int, roleId)
            .query(`
                SELECT p.id, p.name, p.description, p.is_active
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                WHERE rp.role_id = @role_id
            `);
        return result.recordset;
    }

    async getById(id, adminId = null, isSuperAdmin = false) {
        await poolConnect;
        let query = `
            SELECT r.id, r.name, r.description, r.admin_id, r.created_at,
                   u.name AS owner_name, u.email AS owner_email
            FROM roles r
            LEFT JOIN users u ON r.admin_id = u.id
            WHERE r.id = @id AND r.admin_id IS NOT NULL
        `;
        const request = pool.request().input('id', sql.Int, id);
        if (!isSuperAdmin && adminId !== null) {
            query += ' AND r.admin_id = @adminId';
            request.input('adminId', sql.Int, adminId);
        }
        
        const result = await request.query(query);
        const role = result.recordset[0];
        if (role) {
            role.permissions = await this.getPermissionsByRoleId(role.id);
        }
        return role;
    }

    async search(adminId = null, query, isSuperAdmin = false) {
        await poolConnect;
        let queryStr = `
            SELECT r.id, r.name, r.description, r.admin_id, r.created_at,
                   u.name AS owner_name, u.email AS owner_email
            FROM roles r
            LEFT JOIN users u ON r.admin_id = u.id
            WHERE (r.name LIKE @searchQuery OR r.description LIKE @searchQuery) AND r.admin_id IS NOT NULL
        `;
        const request = pool.request().input('searchQuery', sql.NVarChar, `%${query.trim()}%`);
        if (!isSuperAdmin && adminId !== null) {
            queryStr += ' AND r.admin_id = @adminId';
            request.input('adminId', sql.Int, adminId);
        }
        queryStr += ' ORDER BY r.id DESC';

        const rolesResult = await request.query(queryStr);
        const roles = rolesResult.recordset;
        for (const role of roles) {
            role.permissions = await this.getPermissionsByRoleId(role.id);
        }
        return roles;
    }

    async update(id, adminId, { name, description }, isSuperAdmin = false) {
        await poolConnect;
        const request = pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name.trim())
            .input('description', sql.NVarChar, description ? description.trim() : null);

        let query = `
            UPDATE roles
            SET name = @name, description = @description
            OUTPUT INSERTED.id, INSERTED.name, INSERTED.description, INSERTED.admin_id, INSERTED.created_at
            WHERE id = @id
        `;
        if (!isSuperAdmin && adminId !== null) {
            query += ' AND admin_id = @admin_id';
            request.input('admin_id', sql.Int, adminId);
        }

        const result = await request.query(query);
        return result.recordset[0];
    }

    async delete(id, adminId, isSuperAdmin = false) {
        await poolConnect;
        const request = pool.request().input('id', sql.Int, id);
        let query = 'DELETE FROM roles WHERE id = @id';
        if (!isSuperAdmin && adminId !== null) {
            query += ' AND admin_id = @admin_id';
            request.input('admin_id', sql.Int, adminId);
        }
        await request.query(query);
    }

    async findByName(adminId, name) {
        await poolConnect;
        const result = await pool.request()
            .input('admin_id', sql.Int, adminId)
            .input('name', sql.NVarChar, name.trim())
            .query('SELECT TOP 1 id FROM roles WHERE name = @name AND admin_id = @admin_id AND admin_id IS NOT NULL');
        return result.recordset[0];
    }

    async findByNameExcludingId(adminId, name, id) {
        await poolConnect;
        const result = await pool.request()
            .input('admin_id', sql.Int, adminId)
            .input('name', sql.NVarChar, name.trim())
            .input('id', sql.Int, id)
            .query('SELECT TOP 1 id FROM roles WHERE name = @name AND id != @id AND admin_id = @admin_id AND admin_id IS NOT NULL');
        return result.recordset[0];
    }
}

module.exports = new RoleRepository();
