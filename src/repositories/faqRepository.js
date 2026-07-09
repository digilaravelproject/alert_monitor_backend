const { sql, pool, poolConnect } = require('../config/database');

class FaqRepository {
    async create({ question, answer, is_active }) {
        await poolConnect;
        const result = await pool.request()
            .input('question', sql.NVarChar, question.trim())
            .input('answer', sql.NVarChar, answer.trim())
            .input('is_active', sql.Bit, is_active !== undefined ? is_active : 1)
            .query(`
                INSERT INTO faqs (question, answer, is_active, created_at, updated_at)
                OUTPUT INSERTED.id, INSERTED.question, INSERTED.answer, INSERTED.is_active, INSERTED.created_at, INSERTED.updated_at
                VALUES (@question, @answer, @is_active, GETDATE(), GETDATE())
            `);
        return result.recordset[0];
    }

    async getAll() {
        await poolConnect;
        const result = await pool.request().query(`
            SELECT id, question, answer, is_active, created_at, updated_at
            FROM faqs
            ORDER BY id DESC
        `);
        return result.recordset;
    }

    async getActive() {
        await poolConnect;
        const result = await pool.request().query(`
            SELECT id, question, answer, is_active, created_at, updated_at
            FROM faqs
            WHERE is_active = 1
            ORDER BY id DESC
        `);
        return result.recordset;
    }

    async getById(id) {
        await poolConnect;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT id, question, answer, is_active, created_at, updated_at
                FROM faqs
                WHERE id = @id
            `);
        return result.recordset[0];
    }

    async update(id, { question, answer, is_active }) {
        await poolConnect;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('question', sql.NVarChar, question.trim())
            .input('answer', sql.NVarChar, answer.trim())
            .input('is_active', sql.Bit, is_active !== undefined ? is_active : 1)
            .query(`
                UPDATE faqs
                SET question = @question, answer = @answer, is_active = @is_active, updated_at = GETDATE()
                OUTPUT INSERTED.id, INSERTED.question, INSERTED.answer, INSERTED.is_active, INSERTED.created_at, INSERTED.updated_at
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
                UPDATE faqs
                SET is_active = @is_active, updated_at = GETDATE()
                OUTPUT INSERTED.id, INSERTED.question, INSERTED.answer, INSERTED.is_active, INSERTED.created_at, INSERTED.updated_at
                WHERE id = @id
            `);
        return result.recordset[0];
    }

    async delete(id) {
        await poolConnect;
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM faqs WHERE id = @id');
    }
}

module.exports = new FaqRepository();
