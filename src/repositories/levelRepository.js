const { sql, pool, poolConnect } = require('../config/database');

class LevelRepository {
    async create({ name, description, sla_window, cycle_count, response_logic, color, admin_id }) {
        await poolConnect;
        const result = await pool.request()
            .input('name', sql.NVarChar, name.trim())
            .input('description', sql.NVarChar, description ? description.trim() : null)
            .input('sla_window', sql.NVarChar, sla_window ? sla_window.trim() : null)
            .input('cycle_count', sql.NVarChar, cycle_count ? cycle_count.trim() : null)
            .input('response_logic', sql.NVarChar, response_logic ? response_logic.trim() : null)
            .input('color', sql.NVarChar, color ? color.trim() : null)
            .input('admin_id', sql.Int, admin_id)
            .query(`
                INSERT INTO levels (name, description, sla_window, cycle_count, response_logic, color, admin_id)
                OUTPUT INSERTED.id, INSERTED.name, INSERTED.description, INSERTED.sla_window, INSERTED.cycle_count, INSERTED.response_logic, INSERTED.color, INSERTED.admin_id, INSERTED.created_at
                VALUES (@name, @description, @sla_window, @cycle_count, @response_logic, @color, @admin_id)
            `);
        return result.recordset[0];
    }

    async getAll(adminId, isSuperAdmin = false) {
        await poolConnect;
        let query = `
            SELECT l.id, l.name, l.description, l.sla_window, l.cycle_count, l.response_logic, l.color, l.admin_id, l.created_at,
                   u.name AS owner_name, u.email AS owner_email
            FROM levels l
            LEFT JOIN users u ON l.admin_id = u.id
        `;
        const request = pool.request();
        if (!isSuperAdmin) {
            query += ' WHERE l.admin_id = @adminId';
            request.input('adminId', sql.Int, adminId);
        }
        query += ' ORDER BY l.id DESC';
        const result = await request.query(query);
        return result.recordset;
    }

    async getById(id, adminId, isSuperAdmin = false) {
        await poolConnect;
        let query = `
            SELECT l.id, l.name, l.description, l.sla_window, l.cycle_count, l.response_logic, l.color, l.admin_id, l.created_at
            FROM levels l
            WHERE l.id = @id
        `;
        const request = pool.request().input('id', sql.Int, id);
        if (!isSuperAdmin) {
            query += ' AND l.admin_id = @adminId';
            request.input('adminId', sql.Int, adminId);
        }
        const result = await request.query(query);
        return result.recordset[0];
    }

    async search(adminId, queryStr, isSuperAdmin = false) {
        await poolConnect;
        let query = `
            SELECT l.id, l.name, l.description, l.sla_window, l.cycle_count, l.response_logic, l.color, l.admin_id, l.created_at,
                   u.name AS owner_name, u.email AS owner_email
            FROM levels l
            LEFT JOIN users u ON l.admin_id = u.id
            WHERE (l.name LIKE @searchQuery OR l.description LIKE @searchQuery)
        `;
        const request = pool.request().input('searchQuery', sql.NVarChar, `%${queryStr.trim()}%`);
        if (!isSuperAdmin) {
            query += ' AND l.admin_id = @adminId';
            request.input('adminId', sql.Int, adminId);
        }
        query += ' ORDER BY l.id DESC';
        const result = await request.query(query);
        return result.recordset;
    }

    async update(id, { name, description, sla_window, cycle_count, response_logic, color }) {
        await poolConnect;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name.trim())
            .input('description', sql.NVarChar, description ? description.trim() : null)
            .input('sla_window', sql.NVarChar, sla_window ? sla_window.trim() : null)
            .input('cycle_count', sql.NVarChar, cycle_count ? cycle_count.trim() : null)
            .input('response_logic', sql.NVarChar, response_logic ? response_logic.trim() : null)
            .input('color', sql.NVarChar, color ? color.trim() : null)
            .query(`
                UPDATE levels
                SET name = @name, description = @description, sla_window = @sla_window,
                    cycle_count = @cycle_count, response_logic = @response_logic, color = @color
                OUTPUT INSERTED.id, INSERTED.name, INSERTED.description, INSERTED.sla_window, INSERTED.cycle_count, INSERTED.response_logic, INSERTED.color, INSERTED.admin_id, INSERTED.created_at
                WHERE id = @id
            `);
        return result.recordset[0];
    }

    async delete(id) {
        await poolConnect;
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM levels WHERE id = @id');
    }

    async findByName(adminId, name, isSuperAdmin = false) {
        await poolConnect;
        const request = pool.request()
            .input('name', sql.NVarChar, name.trim());
        let query = 'SELECT TOP 1 id FROM levels WHERE name = @name';
        if (!isSuperAdmin) {
            query += ' AND admin_id = @admin_id';
            request.input('admin_id', sql.Int, adminId);
        }
        const result = await request.query(query);
        return result.recordset[0];
    }

    async findByNameExcludingId(adminId, name, id, isSuperAdmin = false) {
        await poolConnect;
        const request = pool.request()
            .input('name', sql.NVarChar, name.trim())
            .input('id', sql.Int, id);
        let query = 'SELECT TOP 1 id FROM levels WHERE name = @name AND id != @id';
        if (!isSuperAdmin) {
            query += ' AND admin_id = @admin_id';
            request.input('admin_id', sql.Int, adminId);
        }
        const result = await request.query(query);
        return result.recordset[0];
    }
}

module.exports = new LevelRepository();
