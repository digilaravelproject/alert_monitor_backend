const { sql, pool, poolConnect } = require('../config/database');

class PermissionRepository {
    async getAll() {
        await poolConnect;
        const result = await pool.request()
            .query('SELECT id, name, description, is_active, created_at FROM permissions ORDER BY id DESC');
        return result.recordset;
    }

    async getById(id) {
        await poolConnect;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT TOP 1 id, name, description, is_active, created_at FROM permissions WHERE id = @id');
        return result.recordset[0];
    }

    async create({ name, description, is_active }) {
        await poolConnect;
        const result = await pool.request()
            .input('name', sql.NVarChar, name.trim())
            .input('description', sql.NVarChar, description ? description.trim() : null)
            .input('is_active', sql.Bit, is_active !== undefined ? is_active : 1)
            .query(`
                INSERT INTO permissions (name, description, is_active)
                OUTPUT INSERTED.id, INSERTED.name, INSERTED.description, INSERTED.is_active, INSERTED.created_at
                VALUES (@name, @description, @is_active)
            `);
        return result.recordset[0];
    }

    async update(id, { name, description, is_active }) {
        await poolConnect;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name.trim())
            .input('description', sql.NVarChar, description ? description.trim() : null)
            .input('is_active', sql.Bit, is_active !== undefined ? is_active : 1)
            .query(`
                UPDATE permissions
                SET name = @name, description = @description, is_active = @is_active
                OUTPUT INSERTED.id, INSERTED.name, INSERTED.description, INSERTED.is_active, INSERTED.created_at
                WHERE id = @id
            `);
        return result.recordset[0];
    }

    async toggleActive(id) {
        await poolConnect;
        const current = await this.getById(id);
        if (!current) throw new Error('Permission not found');
        const newStatus = current.is_active ? 0 : 1;

        await pool.request()
            .input('id', sql.Int, id)
            .input('is_active', sql.Bit, newStatus)
            .query('UPDATE permissions SET is_active = @is_active WHERE id = @id');

        return { id, is_active: newStatus };
    }

    async delete(id) {
        await poolConnect;
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM permissions WHERE id = @id');
    }

    async findByName(name) {
        await poolConnect;
        const result = await pool.request()
            .input('name', sql.NVarChar, name.trim())
            .query('SELECT TOP 1 id FROM permissions WHERE name = @name');
        return result.recordset[0];
    }

    async findByNameExcludingId(name, id) {
        await poolConnect;
        const result = await pool.request()
            .input('name', sql.NVarChar, name.trim())
            .input('id', sql.Int, id)
            .query('SELECT TOP 1 id FROM permissions WHERE name = @name AND id != @id');
        return result.recordset[0];
    }
}

module.exports = new PermissionRepository();
