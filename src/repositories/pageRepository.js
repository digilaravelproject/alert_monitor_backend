const { sql, pool, poolConnect } = require('../config/database');

class PageRepository {
    async create({ title, slug, description, is_active }) {
        await poolConnect;
        const result = await pool.request()
            .input('title', sql.NVarChar, title.trim())
            .input('slug', sql.NVarChar, slug.trim())
            .input('description', sql.NVarChar, description ? description.trim() : null)
            .input('is_active', sql.Bit, is_active !== undefined ? is_active : 1)
            .query(`
                INSERT INTO pages (title, slug, description, is_active, created_at, updated_at)
                OUTPUT INSERTED.id, INSERTED.title, INSERTED.slug, INSERTED.description, INSERTED.is_active, INSERTED.created_at, INSERTED.updated_at
                VALUES (@title, @slug, @description, @is_active, GETDATE(), GETDATE())
            `);
        return result.recordset[0];
    }

    async getAll() {
        await poolConnect;
        const result = await pool.request().query(`
            SELECT id, title, slug, description, is_active, created_at, updated_at
            FROM pages
            ORDER BY id DESC
        `);
        return result.recordset;
    }

    async getById(id) {
        await poolConnect;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT id, title, slug, description, is_active, created_at, updated_at
                FROM pages
                WHERE id = @id
            `);
        return result.recordset[0];
    }

    async getBySlug(slug) {
        await poolConnect;
        const result = await pool.request()
            .input('slug', sql.NVarChar, slug.trim())
            .query(`
                SELECT id, title, slug, description, is_active, created_at, updated_at
                FROM pages
                WHERE slug = @slug
            `);
        return result.recordset[0];
    }

    async update(id, { title, slug, description, is_active }) {
        await poolConnect;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('title', sql.NVarChar, title.trim())
            .input('slug', sql.NVarChar, slug.trim())
            .input('description', sql.NVarChar, description ? description.trim() : null)
            .input('is_active', sql.Bit, is_active !== undefined ? is_active : 1)
            .query(`
                UPDATE pages
                SET title = @title, slug = @slug, description = @description, is_active = @is_active, updated_at = GETDATE()
                OUTPUT INSERTED.id, INSERTED.title, INSERTED.slug, INSERTED.description, INSERTED.is_active, INSERTED.created_at, INSERTED.updated_at
                WHERE id = @id
            `);
        return result.recordset[0];
    }

    async toggleStatus(id, isActive) {
        await poolConnect;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('is_active', sql.Bit, isActive)
            .query(`
                UPDATE pages
                SET is_active = @is_active, updated_at = GETDATE()
                OUTPUT INSERTED.id, INSERTED.title, INSERTED.slug, INSERTED.description, INSERTED.is_active, INSERTED.created_at, INSERTED.updated_at
                WHERE id = @id
            `);
        return result.recordset[0];
    }

    async delete(id) {
        await poolConnect;
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM pages WHERE id = @id');
    }
}

module.exports = new PageRepository();
